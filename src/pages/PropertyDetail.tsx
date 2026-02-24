import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Property {
  id: string;
  address: string;
  city: string;
  municipality?: string;
  price: number;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  square_meters: number;
  listing_type: "rent" | "sale";
  images: string[];
  amenities: string[];
  status: string;
  created_at: string;
  user_id: string;
  unfurnished?: boolean;
  description?: string;
}

const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<"left" | "right">("right");

  useEffect(() => {
    const fetchProperty = async () => {
      if (!id) return;
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        setProperty(data as unknown as Property);
      }
      setLoading(false);
    };
    fetchProperty();
  }, [id]);

  const goToImage = useCallback(
    (direction: "left" | "right") => {
      if (!property || isTransitioning) return;
      setSlideDirection(direction);
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentImageIndex((prev) =>
          direction === "right"
            ? prev === property.images.length - 1
              ? 0
              : prev + 1
            : prev === 0
            ? property.images.length - 1
            : prev - 1
        );
        setIsTransitioning(false);
      }, 300);
    },
    [property, isTransitioning]
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Loading…</p>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Property not found</p>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Go back
        </Button>
      </div>
    );
  }

  const hasMultipleImages = property.images && property.images.length > 1;
  const currentImage =
    property.images && property.images.length > 0
      ? property.images[currentImageIndex]
      : null;

  const formatPrice = (price: number, listingType: string) => {
    const formatted = `$${price.toLocaleString()}`;
    return listingType === "rent" ? `${formatted}/mo` : formatted;
  };

  return (
    <div className="min-h-screen bg-background pt-4 pb-16">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back button */}
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-1"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        {/* Image carousel */}
        <div className="relative w-full aspect-[16/10] rounded-xl overflow-hidden bg-muted group">
          {currentImage ? (
            <img
              src={currentImage}
              alt={`${property.property_type} in ${property.city}`}
              className={`w-full h-full object-cover transition-opacity duration-300 ${
                isTransitioning ? "opacity-0" : "opacity-100"
              }`}
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  "/placeholder.svg";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No Image
            </div>
          )}

          {/* Arrows – visible on hover */}
          {hasMultipleImages && (
            <>
              <button
                onClick={() => goToImage("left")}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-foreground/10 text-foreground/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/20"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => goToImage("right")}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-foreground/10 text-foreground/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/20"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              {/* Dots */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
                {property.images.map((_, i) => (
                  <span
                    key={i}
                    className={`block rounded-full transition-all ${
                      i === currentImageIndex
                        ? "w-5 h-2 bg-white"
                        : "w-2 h-2 bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Property info */}
        <div className="mt-6 space-y-2">
          <p className="text-3xl font-bold text-foreground">
            {formatPrice(property.price, property.listing_type)}
          </p>

          <div className="flex items-baseline gap-3 flex-wrap">
            <p className="text-lg text-foreground">
              {property.bedrooms} bed {property.property_type} for{" "}
              {property.listing_type === "rent" ? "rent" : "sale"}
            </p>
            <p className="text-muted-foreground">
              {property.address}, {property.city}
              {property.municipality && `, ${property.municipality}`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PropertyDetail;
