import { useEffect, useState, useCallback, useRef } from "react";
import { useSwipeCarousel } from "@/hooks/useSwipeCarousel";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ChevronLeft, ChevronRight, ArrowLeft, BedDouble, Bath, Maximize2, X, Image, MapPin, Layers, Share2 } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import FullscreenImageViewer from "@/components/FullscreenImageViewer";
import { Button } from "@/components/ui/button";
import AgentContactBox from "@/components/AgentContactBox";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { getCityCenter } from "@/utils/cityCenter";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

interface Property {
  id: string;
  address: string;
  city: string;
  municipality?: string;
  agency_id?: string;
  price: number;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  square_meters: number;
  listing_type: "rent" | "sale" | "both";
  images: string[];
  amenities: string[];
  status: string;
  created_at: string;
  user_id: string;
  unfurnished?: boolean;
  description?: string;
  latitude?: number;
  longitude?: number;
  floor_plan_url?: string;
  floor_plan_urls?: string[];
}

const PropertyDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === 'admin';
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [descriptionExpanded, setDescriptionExpanded] = useState(false);
  const [mapExpanded, setMapExpanded] = useState(false);
  const [satelliteView, setSatelliteView] = useState(false);
  const [showGallery, setShowGallery] = useState(false);
  const [showFloorPlan, setShowFloorPlan] = useState(false);
  const [floorPlanIndex, setFloorPlanIndex] = useState(0);
  const [showMapOverlay, setShowMapOverlay] = useState(false);
  const [cityCoords, setCityCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [fullscreenOpen, setFullscreenOpen] = useState(false);
  const [fullscreenIndex, setFullscreenIndex] = useState(0);
  const isMobile = useIsMobile();

  const miniMapRef = useRef<HTMLDivElement>(null);
  const miniMapInstance = useRef<L.Map | null>(null);
  const expandedMapRef = useRef<HTMLDivElement>(null);
  const expandedMapInstance = useRef<L.Map | null>(null);
  const overlayMapRef = useRef<HTMLDivElement>(null);
  const overlayMapInstance = useRef<L.Map | null>(null);
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

  // Set Open Graph / Twitter meta tags so shared links unfurl with the property photo
  useEffect(() => {
    if (!property) return;

    const formatPrice = () => {
      if (property.listing_type === 'rent') return `$${property.price?.toLocaleString()}/mo`;
      return `$${property.price?.toLocaleString()}`;
    };

    const title = `${property.property_type} in ${property.city} — ${formatPrice()}`;
    const description = (property.description || `${property.bedrooms} bed · ${property.bathrooms} bath · ${property.square_meters}m² in ${property.city}`).slice(0, 200);
    const image = property.images?.[0] || '';
    const url = `${window.location.origin}/property/${property.id}`;

    const upsertMeta = (selector: string, attr: 'name' | 'property', key: string, content: string) => {
      let el = document.head.querySelector<HTMLMetaElement>(selector);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(attr, key);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
      return el;
    };

    const prevTitle = document.title;
    document.title = title;

    const created: HTMLMetaElement[] = [];
    created.push(upsertMeta('meta[name="description"]', 'name', 'description', description));
    created.push(upsertMeta('meta[property="og:title"]', 'property', 'og:title', title));
    created.push(upsertMeta('meta[property="og:description"]', 'property', 'og:description', description));
    created.push(upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'website'));
    created.push(upsertMeta('meta[property="og:url"]', 'property', 'og:url', url));
    if (image) {
      created.push(upsertMeta('meta[property="og:image"]', 'property', 'og:image', image));
      created.push(upsertMeta('meta[property="og:image:alt"]', 'property', 'og:image:alt', title));
      created.push(upsertMeta('meta[name="twitter:image"]', 'name', 'twitter:image', image));
    }
    created.push(upsertMeta('meta[name="twitter:card"]', 'name', 'twitter:card', image ? 'summary_large_image' : 'summary'));
    created.push(upsertMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title));
    created.push(upsertMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description));

    return () => {
      document.title = prevTitle;
    };
  }, [property]);

  useEffect(() => {
    if (descriptionRef.current) {
      setDescriptionClamped(
        descriptionRef.current.scrollHeight > descriptionRef.current.clientHeight
      );
    }
  }, [property?.description]);

  // Admins see exact location; regular users see city center for privacy
  useEffect(() => {
    if (isAdmin && property?.latitude && property?.longitude) {
      setCityCoords({ lat: property.latitude, lng: property.longitude });
      return;
    }
    if (!property?.city) return;
    getCityCenter(property.city).then((coords) => {
      if (coords) setCityCoords(coords);
    });
  }, [property?.city, property?.latitude, property?.longitude, isAdmin]);

  useEffect(() => {
    if (!miniMapRef.current || !cityCoords) return;
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
    }).setView([cityCoords.lat, cityCoords.lng], isAdmin ? 15 : 13);

    L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      { subdomains: 'abcd', maxZoom: 20 }
    ).addTo(map);

    const icon = L.icon({
      iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
      iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
      shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
      iconSize: [25, 41],
      iconAnchor: [12, 41],
    });

    L.marker([cityCoords.lat, cityCoords.lng], { icon }).addTo(map);
    miniMapInstance.current = map;

    return () => {
      if (miniMapInstance.current) {
        miniMapInstance.current.remove();
        miniMapInstance.current = null;
      }
    };
  }, [cityCoords]);

  useEffect(() => {
    if (!mapExpanded || !expandedMapRef.current || !cityCoords) return;

    const timer = setTimeout(() => {
      if (expandedMapInstance.current) {
        expandedMapInstance.current.remove();
        expandedMapInstance.current = null;
      }

      const map = L.map(expandedMapRef.current!, { attributionControl: false }).setView(
        [cityCoords.lat, cityCoords.lng],
        isAdmin ? 15 : 13
      );

      const streetLayer = L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        { subdomains: 'abcd', maxZoom: 20 }
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
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      L.marker([cityCoords.lat, cityCoords.lng], { icon }).addTo(map);
      expandedMapInstance.current = map;

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
  }, [mapExpanded, cityCoords, satelliteView]);

  useEffect(() => {
    if (!showMapOverlay || !overlayMapRef.current || !cityCoords) return;

    const timer = setTimeout(() => {
      if (overlayMapInstance.current) {
        overlayMapInstance.current.remove();
        overlayMapInstance.current = null;
      }

      const map = L.map(overlayMapRef.current!, { attributionControl: false }).setView(
        [cityCoords.lat, cityCoords.lng],
        isAdmin ? 15 : 13
      );

      L.tileLayer(
        "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
        { subdomains: 'abcd', maxZoom: 20 }
      ).addTo(map);

      const icon = L.icon({
        iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
        iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
        shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        iconSize: [25, 41],
        iconAnchor: [12, 41],
      });

      L.marker([cityCoords.lat, cityCoords.lng], { icon }).addTo(map);
      overlayMapInstance.current = map;
    }, 50);

    return () => {
      clearTimeout(timer);
      if (overlayMapInstance.current) {
        overlayMapInstance.current.remove();
        overlayMapInstance.current = null;
      }
    };
  }, [showMapOverlay, cityCoords]);

  const imageCount = property?.images?.length || 0;
  const carousel = useSwipeCarousel(imageCount);

  // Sync carousel index to local state for other usages
  useEffect(() => {
    setCurrentImageIndex(carousel.currentIndex);
  }, [carousel.currentIndex]);

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

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!property) return;
    const url = `${window.location.origin}/property/${property.id}`;
    const title = `${property.property_type} in ${property.city}`;
    const text = `${title} — $${property.price?.toLocaleString?.() ?? property.price}`;
    const imageUrl = property.images?.[0];
    if (imageUrl && (navigator as any).share && (navigator as any).canShare) {
      try {
        const res = await fetch(imageUrl, { mode: 'cors' });
        if (res.ok) {
          const blob = await res.blob();
          const ext = (blob.type.split('/')[1] || 'jpg').split('+')[0];
          const file = new File([blob], `property-${property.id}.${ext}`, { type: blob.type });
          const shareData: any = { title, text, url, files: [file] };
          if ((navigator as any).canShare(shareData)) {
            await (navigator as any).share(shareData);
            return;
          }
        }
      } catch {}
    }
    try {
      if ((navigator as any).share) {
        await (navigator as any).share({ title, text, url });
        return;
      }
    } catch {}
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Property link copied to clipboard." });
    } catch {
      toast({ title: "Couldn't copy link", description: url, variant: "destructive" });
    }
  };

  const photoCount = property.images?.length || 0;

  const formatPrice = (price: number, listingType: string) => {
    const formatted = `$${price.toLocaleString()}`;
    return listingType === "rent" ? `${formatted}/mo` : formatted;
  };

  return (
    <div className="min-h-screen bg-background pt-4 pb-16">
      <div className="max-w-5xl mx-auto px-4">
        <div className="flex flex-col lg:flex-row gap-8">
        {/* Left column - main content */}
        <div className="flex-1 min-w-0">
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

        {/* Image carousel / inline gallery */}
        <div
          className={`relative w-full rounded-xl overflow-hidden bg-muted group ${showGallery ? "" : "aspect-[16/10]"}`}
          onTouchStart={showGallery ? undefined : carousel.onTouchStart}
          onTouchMove={showGallery ? undefined : carousel.onTouchMove}
          onTouchEnd={showGallery ? undefined : () => {
            carousel.onTouchEnd();
            if (isMobile && !carousel.wasSwipe() && property.images?.length > 0) {
              setTimeout(() => {
                if (!carousel.wasSwipe()) setFullscreenOpen(true);
              }, 10);
            }
          }}
        >
          {/* Mobile share button: top-right over image */}
          <button
            type="button"
            onClick={handleShare}
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            aria-label="Share property"
            className="md:hidden absolute top-3 right-3 z-20 flex items-center justify-center w-9 h-9 rounded-full bg-background/85 backdrop-blur-sm shadow-md hover:bg-background transition-colors"
          >
            <Share2 className="w-4 h-4 text-foreground" />
          </button>
          {showGallery ? (
            <div className="p-3 pb-16 grid grid-cols-2 gap-2 bg-muted">
              {(property.images || []).map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setFullscreenIndex(i);
                    setFullscreenOpen(true);
                  }}
                  className="aspect-[4/3] rounded-md overflow-hidden bg-background block"
                  aria-label={`Open photo ${i + 1} fullscreen`}
                >
                  <img
                    src={img}
                    alt={`Photo ${i + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                </button>
              ))}
            </div>
          ) : (
          <>
          <div
            className="flex h-full"
            style={{
              width: `${(property.images?.length || 1) * 100}%`,
              transform: `translateX(calc(-${carousel.currentIndex * (100 / (property.images?.length || 1))}% + ${carousel.swipeOffset}px))`,
              transition: carousel.swipeOffset ? 'none' : 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {(property.images?.length ? property.images : [null]).map((img, i) => (
              <div key={i} className="h-full flex-shrink-0" style={{ width: `${100 / (property.images?.length || 1)}%` }}>
                {img ? (
                  <img
                    src={img}
                    alt={`${property.property_type} in ${property.city}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/placeholder.svg";
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    No Image
                  </div>
                )}
              </div>
            ))}
          </div>

          {hasMultipleImages && (
            <>
              <button
                onClick={() => carousel.goTo("left")}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-foreground/10 text-foreground/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/20"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={() => carousel.goTo("right")}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-foreground/10 text-foreground/60 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-foreground/20"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>

              <div className="absolute bottom-14 left-1/2 -translate-x-1/2 z-10 flex gap-1.5">
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
          </>
          )}

          {/* Bottom overlay bar */}
          <div
            className="absolute bottom-0 left-0 right-0 z-10 flex items-center gap-2 px-3 py-2 bg-black/60 backdrop-blur-sm"
            onTouchStart={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
            onTouchEnd={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Photos button */}
            {photoCount > 0 && (
              <button
                onClick={() => setShowGallery((v) => !v)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-colors text-white text-sm font-medium ${showGallery ? "bg-white/35" : "bg-white/15 hover:bg-white/25"}`}
              >
                <Image className="w-4 h-4" />
                {photoCount} photo{photoCount !== 1 ? "s" : ""}
              </button>
            )}

            {/* Floor plan button */}
            {(() => {
              const floorPlans = (property.floor_plan_urls && property.floor_plan_urls.length > 0)
                ? property.floor_plan_urls
                : (property.floor_plan_url ? [property.floor_plan_url] : []);
              if (floorPlans.length === 0) return null;
              return (
              <button
                onClick={() => { setFloorPlanIndex(0); setShowFloorPlan(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/15 hover:bg-white/25 transition-colors text-white text-sm font-medium"
              >
                <Layers className="w-4 h-4" />
                {floorPlans.length > 1 ? `Floor plans (${floorPlans.length})` : "Floor plan"}
              </button>
              );
            })()}

            {/* Map button */}
            {cityCoords && (
              <button
                onClick={() => setShowMapOverlay(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-white/15 hover:bg-white/25 transition-colors text-white text-sm font-medium"
              >
                <MapPin className="w-4 h-4" />
                Map
              </button>
            )}
          </div>
        </div>

        {/* Desktop share button: below image, left aligned */}
        <div className="hidden md:flex mt-3">
          <Button variant="outline" size="sm" onClick={handleShare}>
            <Share2 className="w-4 h-4 mr-2" />
            Share
          </Button>
        </div>

        {/* Property info */}
        <div className="mt-6 space-y-2">
          <p className="text-3xl font-bold text-foreground">
            {formatPrice(property.price, property.listing_type)}
          </p>

          <div className="flex items-baseline gap-3 flex-wrap">
            <p className="text-lg text-foreground">
              {property.bedrooms} bed {property.property_type} for{" "}
              {property.listing_type === "rent" ? "rent" : property.listing_type === "both" ? "rent & sale" : "sale"}
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
        {cityCoords && (
          <div className="mt-10">
            <h2 className="text-xl font-semibold text-foreground mb-4">
              Local area information
            </h2>

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

            {mapExpanded && (
              <div className="fixed inset-0 z-[9999] bg-background flex flex-col">
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

          </div>
        )}
        </div>

        {/* Right column - agent contact box */}
        <div className="lg:w-[300px] shrink-0">
          <div className="lg:sticky lg:top-20">
            <AgentContactBox
              propertyId={property.id}
              agencyId={property.agency_id}
              propertyAddress={property.address}
              propertyType={property.property_type}
              propertyPrice={property.price}
              listingType={property.listing_type}
            />
          </div>
        </div>
        </div>
      </div>

      {/* Floor plan overlay */}
      {showFloorPlan && property.floor_plan_url && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="w-full max-w-4xl mx-auto px-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-foreground">Floor Plan</h3>
              <button
                onClick={() => setShowFloorPlan(false)}
                className="p-2 rounded-full hover:bg-muted transition-colors"
                aria-label="Close floor plan"
              >
                <X className="w-5 h-5 text-foreground" />
              </button>
            </div>
            <div className="rounded-xl overflow-hidden bg-muted">
              <img
                src={property.floor_plan_url}
                alt="Floor plan"
                className="w-full h-auto object-contain max-h-[80vh]"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Map overlay (from image bar) */}
      {showMapOverlay && (
        <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex flex-col">
          <div className="flex items-center justify-between p-4">
            <h3 className="text-lg font-semibold text-foreground">Property Location</h3>
            <button
              onClick={() => setShowMapOverlay(false)}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="Close map"
            >
              <X className="w-5 h-5 text-foreground" />
            </button>
          </div>
          <div ref={overlayMapRef} className="flex-1" />
        </div>
      )}

      {fullscreenOpen && property.images?.length > 0 && (
        <FullscreenImageViewer
          images={property.images}
          initialIndex={showGallery ? fullscreenIndex : carousel.currentIndex}
          onClose={() => setFullscreenOpen(false)}
        />
      )}
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
