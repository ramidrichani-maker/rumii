import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, ArrowLeft, BedDouble, Bath, Maximize2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

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
  latitude?: number;
  longitude?: number;
}

interface NearbySchool {
  name: string;
  distance: number; // km
}

const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [satelliteView, setSatelliteView] = useState(false);
  const [nearbySchools, setNearbySchools] = useState<NearbySchool[]>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);

  const miniMapRef = useRef<HTMLDivElement>(null);
  const miniMapInstance = useRef<L.Map | null>(null);
  const expandedMapRef = useRef<HTMLDivElement>(null);
  const expandedMapInstance = useRef<L.Map | null>(null);
  const descriptionRef = useRef<HTMLParagraphElement>(null);
  const [descriptionClamped, setDescriptionClamped] = useState(false);

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

  // Check if description is clamped
  useEffect(() => {
    if (descriptionRef.current) {
      setDescriptionClamped(
        descriptionRef.current.scrollHeight > descriptionRef.current.clientHeight
      );
    }
  }, [property?.description]);

  // Fetch nearby schools using Overpass API
  useEffect(() => {
    if (!property?.latitude || !property?.longitude) return;
    const fetchSchools = async () => {
      setSchoolsLoading(true);
      try {
        const radius = 5000; // 5km
        const query = `[out:json];node["amenity"="school"](around:${radius},${property.latitude},${property.longitude});out body 4;`;
        const res = await fetch(
          `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
        );
        const data = await res.json();
        const schools: NearbySchool[] = (data.elements || [])
          .filter((el: any) => el.tags?.name)
          .map((el: any) => {
            const dist = getDistanceKm(
              property.latitude!,
              property.longitude!,
              el.lat,
              el.lon
            );
            return { name: el.tags.name, distance: dist };
          })
          .sort((a: NearbySchool, b: NearbySchool) => a.distance - b.distance)
          .slice(0, 4);
        setNearbySchools(schools);
      } catch {
        setNearbySchools([]);
      } finally {
        setSchoolsLoading(false);
      }
    };
    fetchSchools();
  }, [property?.latitude, property?.longitude]);

  // Mini map
  useEffect(() => {
    if (!miniMapRef.current || !property?.latitude || !property?.longitude) return;
    if (miniMapInstance.current) {
      miniMapInstance.current.remove();
      miniMapInstance.current = null;
    }

    const map = L.map(miniMapRef.current, {
      zoomControl: false,
      dragging: false,
      scrollWheelZoom: false,
      doubleClickZoom: false,
      touchZoom: false,
      attributionControl: false,
    }).setView([property.latitude, property.longitude], 15);

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      { maxZoom: 20 }
    ).addTo(map);

    const icon = L.icon({
      iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });

    L.marker([property.latitude, property.longitude], { icon }).addTo(map);
    miniMapInstance.current = map;

    return () => {
      if (miniMapInstance.current) {
        miniMapInstance.current.remove();
        miniMapInstance.current = null;
      }
    };
  }, [property?.latitude, property?.longitude]);

  // Expanded map
  useEffect(() => {
    if (!mapExpanded || !expandedMapRef.current || !property?.latitude || !property?.longitude) return;

    // Small delay so the DOM is ready
    const timer = setTimeout(() => {
      if (expandedMapInstance.current) {
        expandedMapInstance.current.remove();
        expandedMapInstance.current = null;
      }

      const map = L.map(expandedMapRef.current!, { attributionControl: false }).setView(
        [property.latitude!, property.longitude!],
        15
      );

      const streetLayer = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        { maxZoom: 20 }
      );
      const satelliteLayer = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { maxZoom: 19 }
      );

      if (satelliteView) {
        satelliteLayer.addTo(map);
      } else {
        streetLayer.addTo(map);
      }

      const icon = L.icon({
        iconUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        iconRetinaUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        shadowUrl:
          "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      L.marker([property.latitude!, property.longitude!], { icon }).addTo(map);
      expandedMapInstance.current = map;

      // Store layers for toggle
      (map as any)._streetLayer = streetLayer;
      (map as any)._satelliteLayer = satelliteLayer;
    }, 50);

    return () => {
      clearTimeout(timer);
      if (expandedMapInstance.current) {
        expandedMapInstance.current.remove();
        expandedMapInstance.current = null;
      }
    };
  }, [mapExpanded, property?.latitude, property?.longitude, satelliteView]);

  const goToImage = useCallback(
    (direction: "left" | "right") => {
      if (!property || isTransitioning) return;
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
                (e.target as HTMLImageElement).src = "/placeholder.svg";
              }}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">
              No Image
            </div>
          )}

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

          {/* Bed & Bath icons */}
          <div className="flex items-center gap-5 pt-1">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <BedDouble className="w-5 h-5" />
              <span className="text-sm font-medium">{property.bedrooms}</span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Bath className="w-5 h-5" />
              <span className="text-sm font-medium">{property.bathrooms}</span>
            </div>
          </div>
        </div>

        {/* About this property */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-foreground mb-4">About this property</h2>

          {/* Amenities 2-column dash list */}
          {property.amenities && property.amenities.length > 0 && (
            <ul className="grid grid-cols-2 gap-x-6 gap-y-1.5 mb-5">
              {property.amenities.map((amenity, i) => (
                <li key={i} className="text-sm text-foreground flex items-start gap-2">
                  <span className="text-muted-foreground mt-0.5">–</span>
                  <span>{amenity}</span>
                </li>
              ))}
            </ul>
          )}

          {/* Description */}
          {property.description && (
            <div className="mt-4">
              <p
                ref={descriptionRef}
                className={`text-sm text-muted-foreground leading-relaxed ${
                  descriptionExpanded ? "" : "line-clamp-2"
                }`}
              >
                {property.description}
              </p>
              {(descriptionClamped || descriptionExpanded) && (
                <button
                  onClick={() => setDescriptionExpanded(!descriptionExpanded)}
                  className="text-sm font-medium text-primary hover:underline mt-1"
                >
                  {descriptionExpanded ? "Show less" : "Read full description"}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Local area information */}
        {property.latitude && property.longitude && (
          <div className="mt-10">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Local area information
            </h2>

            {/* Mini map */}
            <div className="relative rounded-xl overflow-hidden border border-border">
              <div ref={miniMapRef} className="w-full h-[200px]" />
              <Button
                variant="outline"
                size="sm"
                className="absolute top-3 right-3 z-[1000] gap-1.5 bg-background/80 backdrop-blur-sm"
                onClick={() => setMapExpanded(true)}
              >
                <Maximize2 className="w-4 h-4" />
                Expand
              </Button>
            </div>

            {/* Expanded map modal */}
            {mapExpanded && (
              <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-foreground">Map View</h3>
                    <Button
                      variant={satelliteView ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSatelliteView(!satelliteView)}
                    >
                      Satellite
                    </Button>
                  </div>
                  <button
                    onClick={() => setMapExpanded(false)}
                    className="p-2 rounded-full hover:bg-muted transition-colors"
                    aria-label="Close map"
                  >
                    <X className="w-5 h-5 text-foreground" />
                  </button>
                </div>
                <div ref={expandedMapRef} className="flex-1" />
              </div>
            )}

            {/* Nearby schools */}
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-foreground mb-3">Nearby schools</h3>
              {schoolsLoading ? (
                <p className="text-sm text-muted-foreground">Searching for nearby schools…</p>
              ) : nearbySchools.length > 0 ? (
                <>
                  <ul className="space-y-2.5">
                    {nearbySchools.map((school, i) => (
                      <li key={i} className="flex items-center justify-between">
                        <span className="text-sm text-foreground">{school.name}</span>
                        <span className="text-sm text-muted-foreground">
                          {school.distance.toFixed(1)} km
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-muted-foreground mt-3">
                    These distances are calculated in a straight line. The actual route and distance may vary.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">No schools found nearby.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

function getDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default PropertyDetail;
