import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSwipeCarousel } from "@/hooks/useSwipeCarousel";
import { Badge } from "@/components/ui/badge";
import { Bed, Bath, Square, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "react-router-dom";

interface Property {
  id: string;
  address: string;
  city: string;
  price: number;
  listing_type: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  square_meters: number;
  images: string[];
}

interface FeaturedPropertyCardProps {
  property: Property;
  badgeLabel: string;
  badgeVariant?: "default" | "secondary";
}

const FeaturedPropertyCard = ({ property, badgeLabel, badgeVariant = "default" }: FeaturedPropertyCardProps) => {
  const images = property.images?.length ? property.images : [];
  const hasMultiple = images.length > 1;
  const { currentIndex: imgIndex, goTo, swipeOffset, onTouchStart, onTouchMove, onTouchEnd, wasSwipe } = useSwipeCarousel(images.length);

  const formatPrice = (price: number, listingType: string) => {
    return listingType === 'rent' ? `$${price?.toLocaleString()}/mo` : `$${price?.toLocaleString()}`;
  };

  const goLeft = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    goTo("left");
  };

  const goRight = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    goTo("right");
  };

  return (
    <Link to={`/property/${property.id}`} onClick={(e) => { if (wasSwipe()) e.preventDefault(); }}>
      <Card className="hover:shadow-lg transition-shadow duration-300 h-full cursor-pointer group touch-pan-y">
        <div
          className="relative h-48 bg-muted rounded-t-lg overflow-hidden touch-pan-y"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {images.length > 0 ? (
            <div
              className="flex h-full"
              style={{
                width: `${images.length * 100}%`,
                transform: `translateX(calc(-${imgIndex * (100 / images.length)}% + ${swipeOffset}px))`,
                transition: swipeOffset ? 'none' : 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`${property.address} - image ${i + 1}`}
                  className="h-full object-cover flex-shrink-0"
                  style={{ width: `${100 / images.length}%` }}
                  loading="lazy"
                  decoding="async"
                />
              ))}
            </div>
          ) : (
            <div className="w-full h-full bg-muted" />
          )}
          {hasMultiple && (
            <>
              <button
                onClick={goLeft}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={goRight}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground rounded-full w-7 h-7 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-sm"
                aria-label="Next image"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${i === imgIndex ? 'bg-background' : 'bg-background/50'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-start mb-2">
            <Badge variant={badgeVariant}>{badgeLabel}</Badge>
            <span className="text-2xl font-bold text-primary">
              {formatPrice(property.price, property.listing_type)}
            </span>
          </div>
          <CardTitle className="text-lg">{property.address}</CardTitle>
          <CardDescription>{property.city}</CardDescription>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Bed className="w-4 h-4 mr-1" />
              <span>{property.bedrooms} bed</span>
            </div>
            <div className="flex items-center">
              <Bath className="w-4 h-4 mr-1" />
              <span>{property.bathrooms} bath</span>
            </div>
            <div className="flex items-center">
              <Square className="w-4 h-4 mr-1" />
              <span>{property.square_meters}m²</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
};

export default FeaturedPropertyCard;
