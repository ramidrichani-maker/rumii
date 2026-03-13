import React, { useState, useEffect } from 'react';
import { useSwipeCarousel } from "@/hooks/useSwipeCarousel";
import { useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bed, Bath, Square, Heart, Phone, Mail, ChevronLeft, ChevronRight, CalendarCheck } from "lucide-react";
import ViewingBookingModal from "@/components/ViewingBookingModal";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

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
  listing_type: 'rent' | 'sale';
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
  const [showPhone, setShowPhone] = useState(false);
  const [agentPhone, setAgentPhone] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [showViewingModal, setShowViewingModal] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) checkFavoriteStatus();
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

  const formatPrice = (price: number, listingType: string) => {
    const formatted = `$${price.toLocaleString()}`;
    return listingType === 'rent' ? `${formatted}/mo` : formatted;
  };

  const handlePrevImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isImageTransitioning) return;
    setIsImageTransitioning(true);
    setTimeout(() => {
      setCurrentImageIndex(prev => prev === 0 ? property.images.length - 1 : prev - 1);
      setIsImageTransitioning(false);
    }, 250);
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isImageTransitioning) return;
    setIsImageTransitioning(true);
    setTimeout(() => {
      setCurrentImageIndex(prev => prev === property.images.length - 1 ? 0 : prev + 1);
      setIsImageTransitioning(false);
    }, 250);
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    const phone = agentPhone || '+96170612686';
    if (showPhone) {
      window.location.href = `tel:${phone}`;
    } else {
      setShowPhone(true);
    }
  };

  const handleEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/property/${property.id}/enquiry`, {
      state: { agentId, agencyId: property.agency_id },
    });
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

  const hasMultipleImages = property.images && property.images.length > 1;
  const currentImage = property.images?.[currentImageIndex] || null;

  return (
    <Card
      className="animate-fade-in hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-row overflow-hidden"
      onClick={() => navigate(`/property/${property.id}`)}
    >
      {/* Left: Image */}
      <div className="relative w-64 min-w-[16rem] md:w-96 md:min-w-[24rem] h-auto min-h-[14rem] flex-shrink-0 group bg-muted">
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
                  className={`w-1.5 h-1.5 rounded-full transition-all ${i === currentImageIndex ? 'bg-white w-4' : 'bg-white/50'}`}
                />
              ))}
            </div>
          </>
        )}
        {currentImage ? (
          <img
            src={currentImage}
            alt={`${property.property_type} in ${property.city}`}
            className={`w-full h-full object-cover transition-opacity duration-250 ${isImageTransitioning ? 'opacity-0' : 'opacity-100'}`}
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

      {/* Right: Details */}
      <div className="flex flex-col flex-1 p-4 relative min-w-0">
        {/* Top-right: Favorite */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 h-8 w-8"
          onClick={toggleFavorite}
          disabled={isTogglingFavorite}
        >
          <Heart className={`w-5 h-5 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`} />
        </Button>

        {/* Price */}
        <h3 className="text-xl md:text-2xl font-bold text-primary pr-10">
          {formatPrice(property.price, property.listing_type)}
        </h3>

        {/* Beds, Baths, Size */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
          <span className="flex items-center gap-1">
            <Bed className="w-4 h-4" />
            {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <Bath className="w-4 h-4" />
            {property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            <Square className="w-4 h-4" />
            {property.square_meters}m²
          </span>
        </div>

        {/* Location */}
        <p className="text-sm text-foreground mt-2 truncate">
          {property.city}, {property.address}
        </p>

        {/* Description (max 2 lines) */}
        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
          {truncateDescription((property as any).description)}
        </p>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Bottom-right: Request Viewing, Call & Email */}
        <div className="flex items-center gap-2 justify-end mt-3">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={(e) => {
              e.stopPropagation();
              setShowViewingModal(true);
            }}
          >
            <CalendarCheck className="w-4 h-4" />
            Request Viewing
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={handleCall}
          >
            <Phone className="w-4 h-4" />
            {showPhone ? (agentPhone || '+96170612686') : 'Call'}
          </Button>
          <Button
            size="sm"
            className="gap-1.5"
            onClick={handleEmail}
          >
            <Mail className="w-4 h-4" />
            Email
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
        />
      )}
    </Card>
  );
};

export default PropertyCard;
