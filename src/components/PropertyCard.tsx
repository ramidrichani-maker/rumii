import React, { useState, useEffect } from 'react';
import { useSwipeCarousel } from "@/hooks/useSwipeCarousel";
import { useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bed, Bath, Square, Heart, Phone, Mail, ChevronLeft, ChevronRight, CalendarCheck, Building2, Share2, MessageCircle } from "lucide-react";
import ViewingBookingModal from "@/components/ViewingBookingModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
interface Property {
  id: string;
  address: string;
  city: string;
  municipality?: string;
  price: number;
  rental_price?: number | null;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  square_meters: number;
  listing_type: 'rent' | 'sale' | 'both';
  images: string[];
  amenities: string[];
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user_id: string;
  unfurnished?: boolean;
  description?: string;
  agency_id?: string | null;
}

interface PropertyCardProps {
  property: Property;
  onClick: (property: Property) => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, onClick }) => {
  const navigate = useNavigate();
  const [isFavorited, setIsFavorited] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const imageCarousel = useSwipeCarousel(property.images?.length || 0);
  const [agentPhone, setAgentPhone] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [showViewingModal, setShowViewingModal] = useState(false);
  const [agencyName, setAgencyName] = useState<string | null>(null);
  const [agencyLogo, setAgencyLogo] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isAssignedAgent, setIsAssignedAgent] = useState(false);
  const [stackedRange, setStackedRange] = useState<{
    minPrice: number | null; maxPrice: number | null;
    minRent: number | null; maxRent: number | null;
    minSqm: number | null; maxSqm: number | null;
    unitCount: number;
  } | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) checkFavoriteStatus();
  }, [user, property.id]);

  useEffect(() => {
    const fetchRole = async () => {
      if (!user) { setUserRole(null); return; }
      const { data } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();
      setUserRole(data?.role ?? null);
    };
    fetchRole();
  }, [user]);

  useEffect(() => {
    const checkAssignment = async () => {
      if (!user) { setIsAssignedAgent(false); return; }
      const { data } = await supabase
        .from('property_agents')
        .select('id')
        .eq('property_id', property.id)
        .eq('agent_id', user.id)
        .maybeSingle();
      setIsAssignedAgent(!!data);
    };
    checkAssignment();
  }, [user, property.id]);

  useEffect(() => {
    const fetchAgent = async () => {
      const { data: assignment } = await supabase
        .from('property_agents')
        .select('agent_id')
        .eq('property_id', property.id)
        .limit(1)
        .single();
      if (assignment) {
        setAgentId(assignment.agent_id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('phone_number')
          .eq('user_id', assignment.agent_id)
          .single();
        if (profile) setAgentPhone(profile.phone_number);
      }
    };
    fetchAgent();
  }, [property.id]);

  useEffect(() => {
    const fetchAgency = async () => {
      if (property.agency_id) {
        const { data: agency } = await supabase
          .from('agencies')
          .select('name, logo_url')
          .eq('id', property.agency_id)
          .single();
        if (agency) {
          setAgencyName(agency.name);
          setAgencyLogo(agency.logo_url);
        }
      }
    };
    fetchAgency();
  }, [property.agency_id]);

  useEffect(() => {
    const fetchStackedUnits = async () => {
      if (property.property_type !== 'stacked_unit') { setStackedRange(null); return; }
      const { data } = await supabase
        .from('properties_public' as any)
        .select('price, rental_price, square_meters')
        .eq('parent_property_id', property.id);
      if (!data || data.length === 0) { setStackedRange(null); return; }
      const prices = data.map((d: any) => d.price).filter((v: any) => v != null) as number[];
      const rents = data.map((d: any) => d.rental_price).filter((v: any) => v != null) as number[];
      const sqms = data.map((d: any) => d.square_meters).filter((v: any) => v != null && v > 0) as number[];
      setStackedRange({
        minPrice: prices.length ? Math.min(...prices) : null,
        maxPrice: prices.length ? Math.max(...prices) : null,
        minRent: rents.length ? Math.min(...rents) : null,
        maxRent: rents.length ? Math.max(...rents) : null,
        minSqm: sqms.length ? Math.min(...sqms) : null,
        maxSqm: sqms.length ? Math.max(...sqms) : null,
        unitCount: data.length,
      });
    };
    fetchStackedUnits();
  }, [property.id, property.property_type]);

  const checkFavoriteStatus = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('property_id', property.id)
      .maybeSingle();
    if (data) setIsFavorited(true);
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to favorite properties", variant: "destructive" });
      return;
    }
    setIsTogglingFavorite(true);
    try {
      if (isFavorited) {
        await supabase.from('favorites').delete().eq('user_id', user.id).eq('property_id', property.id);
        setIsFavorited(false);
        toast({ title: "Removed from favorites" });
      } else {
        await supabase.from('favorites').insert({ user_id: user.id, property_id: property.id });
        setIsFavorited(true);
        toast({ title: "Added to favorites" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to update favorite", variant: "destructive" });
    } finally {
      setIsTogglingFavorite(false);
    }
  };

  const formatPrice = (price: number | null, listingType: string, rentalPrice?: number | null) => {
    if (property.property_type === 'stacked_unit' && stackedRange) {
      const fmtRange = (lo: number | null, hi: number | null, suffix = '') => {
        if (lo == null && hi == null) return null;
        if (lo == null) return `$${hi!.toLocaleString()}${suffix}`;
        if (hi == null || lo === hi) return `$${lo.toLocaleString()}${suffix}`;
        return `$${lo.toLocaleString()} - $${hi.toLocaleString()}${suffix}`;
      };
      if (listingType === 'rent') {
        return fmtRange(stackedRange.minRent, stackedRange.maxRent, '/mo') ?? 'Price on request';
      }
      return fmtRange(stackedRange.minPrice, stackedRange.maxPrice) ?? 'Price on request';
    }
    if (listingType === 'both' && rentalPrice != null && price != null) {
      return `$${price.toLocaleString()} / $${rentalPrice.toLocaleString()}/mo`;
    }
    if (listingType === 'rent') {
      const rp = rentalPrice ?? price;
      return rp != null ? `$${rp.toLocaleString()}/mo` : 'Price on request';
    }
    return price != null ? `$${price.toLocaleString()}` : 'Price on request';
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    imageCarousel.goTo("left");
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    imageCarousel.goTo("right");
  };

  const handleEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/property/${property.id}/enquiry`, {
      state: { agentId, agencyId: property.agency_id },
    });
  };

  const handleShare = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}/property/${property.id}`;
    const title = `${property.property_type} in ${property.city}`;
    const text = `${title} — ${formatPrice(property.price, property.listing_type, property.rental_price)}`;
    const imageUrl = property.images?.[0];

    // Try sharing with the property photo attached as a file (supported on most modern mobile browsers)
    if (imageUrl && typeof navigator !== 'undefined' && (navigator as any).share && (navigator as any).canShare) {
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
      } catch {
        // fall through to text-only share
      }
    }

    try {
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share({ title, text, url });
        return;
      }
    } catch {
      // user cancelled or share failed — fall through to copy
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ title: "Link copied", description: "Property link copied to clipboard." });
    } catch {
      toast({ title: "Couldn't copy link", description: url, variant: "destructive" });
    }
  };

  const truncateDescription = (desc?: string | null) => {
    if (!desc) return '';
    const sentences = desc.match(/[^.!?]+[.!?]+/g);
    if (sentences && sentences.length > 2) {
      return sentences.slice(0, 2).join('').trim() + '...';
    }
    // If no sentence boundaries, just clamp by character length
    if (desc.length > 150) return desc.slice(0, 150).trim() + '...';
    return desc;
  };

  const isJustListed = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffMs = now.getTime() - created.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    return diffDays <= 7;
  };

  const hasMultipleImages = property.images && property.images.length > 1;

  return (
    <Card
      className="animate-fade-in hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-row overflow-hidden"
      onClick={() => {
        if (imageCarousel.wasSwipe()) return;
        navigate(`/property/${property.id}`);
      }}
    >
      {/* Left: Image */}
      <div
        className="relative w-32 min-w-[8rem] md:w-96 md:min-w-[24rem] h-auto min-h-[10rem] md:min-h-[14rem] flex-shrink-0 group bg-muted overflow-hidden touch-pan-y"
        onTouchStart={imageCarousel.onTouchStart}
        onTouchMove={imageCarousel.onTouchMove}
        onTouchEnd={imageCarousel.onTouchEnd}
        onClick={() => {
          if (imageCarousel.wasSwipe()) return;
          navigate(`/property/${property.id}`);
        }}
      >
        {isJustListed(property.created_at) && (
          <Badge className="absolute top-2 left-2 z-20 bg-primary text-primary-foreground hover:bg-primary/90">
            Just Listed
          </Badge>
        )}
        {hasMultipleImages && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-1 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm hover:bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
              onClick={handlePrevImage}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm hover:bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity h-7 w-7"
              onClick={handleNextImage}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1">
              {property.images.map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === imageCarousel.currentIndex ? 'bg-white w-4' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}
        <div
          className="flex h-full"
          style={{
            width: `${(property.images?.length || 1) * 100}%`,
            transform: `translateX(calc(-${imageCarousel.currentIndex * (100 / (property.images?.length || 1))}% + ${imageCarousel.swipeOffset}px))`,
            transition: imageCarousel.swipeOffset ? 'none' : 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        >
          {(property.images?.length ? property.images : [null]).map((img, i) => (
            <div key={i} className="h-full flex-shrink-0" style={{ width: `${100 / (property.images?.length || 1)}%` }}>
              {img ? (
                <img
                  src={img}
                  alt={`${property.property_type} in ${property.city}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+Cjwvc3ZnPgo=';
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Square className="w-8 h-8 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Right: Details */}
      <div className="flex flex-col flex-1 p-2 md:p-4 relative min-w-0">
        {/* Top-right: Agency + Favorite */}
        <div className="absolute top-1 right-1 md:top-2 md:right-2 flex items-center gap-1">
          {agencyName && (
            <div className="hidden md:flex items-center gap-1.5 bg-muted/60 rounded-full px-2.5 py-1">
              {agencyLogo ? (
                <img src={agencyLogo} alt={agencyName} className="w-5 h-5 rounded-full object-cover" />
              ) : (
                <Building2 className="w-4 h-4 text-muted-foreground" />
              )}
              <span className="text-xs font-medium text-muted-foreground">{agencyName}</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 md:h-8 md:w-8"
            onClick={handleShare}
            aria-label="Share property"
            title="Share link"
          >
            <Share2 className="w-4 h-4 md:w-5 md:h-5 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 md:h-8 md:w-8"
            onClick={toggleFavorite}
            disabled={isTogglingFavorite}
          >
            <Heart className={`w-4 h-4 md:w-5 md:h-5 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
          </Button>
        </div>

        {/* Price */}
        <h3 className="text-sm md:text-2xl font-bold text-primary pr-8 md:pr-10">
          {formatPrice(property.price, property.listing_type, property.rental_price)}
        </h3>

        {/* Beds, Baths, Size */}
        <div className="flex items-center gap-2 md:gap-4 text-xs md:text-sm text-muted-foreground mt-1 flex-wrap">
          <span className="flex items-center gap-1">
            <Bed className="w-3 h-3 md:w-4 md:h-4" />
            {property.bedrooms}
          </span>
          <span className="flex items-center gap-1">
            <Bath className="w-3 h-3 md:w-4 md:h-4" />
            {property.bathrooms}
          </span>
          <span className="flex items-center gap-1">
            <Square className="w-3 h-3 md:w-4 md:h-4" />
            {property.property_type === 'stacked_unit' && stackedRange && stackedRange.minSqm != null && stackedRange.maxSqm != null && stackedRange.minSqm !== stackedRange.maxSqm
              ? `${stackedRange.minSqm} - ${stackedRange.maxSqm}m²`
              : `${property.square_meters}m²`}
          </span>
        </div>

        {/* Location */}
        <p className="text-xs md:text-sm text-foreground mt-1 md:mt-2 truncate">
          {userRole === 'admin' || isAssignedAgent
            ? `${property.city}, ${property.address}`
            : property.city}
        </p>

        {/* Description (max 2 lines) */}
        <p className="hidden md:block text-sm text-muted-foreground mt-1 line-clamp-2">
          {truncateDescription((property as any).description)}
        </p>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom-right: Request Viewing, Call & Email */}
        <div className="flex items-center gap-1 md:gap-2 justify-end mt-2 md:mt-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            className="gap-1 text-xs md:text-sm h-7 md:h-9 px-2 md:px-3"
            onClick={(e) => {
              e.stopPropagation();
              setShowViewingModal(true);
            }}
          >
            <CalendarCheck className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden md:inline">Request Viewing</span>
            <span className="md:hidden">View</span>
          </Button>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="gap-1 text-xs md:text-sm h-7 md:h-9 px-2 md:px-3"
                onClick={(e) => e.stopPropagation()}
              >
                <Phone className="w-3 h-3 md:w-4 md:h-4" />
                <span className="hidden md:inline">Call</span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-56 p-2 space-y-1" onClick={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  window.location.href = `tel:${(agentPhone || '+96170612686').replace(/[^+\d]/g, '')}`;
                }}
              >
                <Phone className="w-4 h-4" />
                {agentPhone || '+96170612686'}
              </Button>
              <Button
                variant="ghost"
                className="w-full justify-start gap-2 text-green-600 hover:text-green-700"
                onClick={(e) => {
                  e.stopPropagation();
                  const clean = (agentPhone || '+96170612686').replace(/[^+\d]/g, '').replace('+', '');
                  window.open(`https://wa.me/${clean}`, '_blank');
                }}
              >
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </Button>
            </PopoverContent>
          </Popover>
          <Button
            size="sm"
            className="gap-1 text-xs md:text-sm h-7 md:h-9 px-2 md:px-3"
            onClick={handleEmail}
          >
            <Mail className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden md:inline">Email</span>
          </Button>
        </div>
      </div>

      {showViewingModal && (
        <ViewingBookingModal
          isOpen={showViewingModal}
          onClose={() => setShowViewingModal(false)}
          property={{
            id: property.id,
            address: property.address,
            property_type: property.property_type,
            price: property.price,
            listing_type: property.listing_type,
          }}
          agencyId={property.agency_id}
        />
      )}

    </Card>
  );
};

export default PropertyCard;
