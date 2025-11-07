import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bed, Bath, Square, MapPin, Calendar, Heart, ChevronLeft, ChevronRight } from "lucide-react";
import ViewingBookingModal from "./ViewingBookingModal";
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
}

interface PropertyCardProps {
  property: Property;
  onClick: (property: Property) => void;
}

const PropertyCard: React.FC<PropertyCardProps> = ({ property, onClick }) => {
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [isFavorited, setIsFavorited] = useState(false);
  const [isTogglingFavorite, setIsTogglingFavorite] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      checkFavoriteStatus();
    }
  }, [user, property.id]);

  const checkFavoriteStatus = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('favorites')
      .select('id')
      .eq('user_id', user.id)
      .eq('property_id', property.id)
      .maybeSingle();
    
    if (!error && data) {
      setIsFavorited(true);
    }
  };

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to favorite properties",
        variant: "destructive"
      });
      return;
    }

    setIsTogglingFavorite(true);

    try {
      if (isFavorited) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('property_id', property.id);
        
        if (error) throw error;
        
        setIsFavorited(false);
        toast({
          title: "Removed from favorites",
          description: "Property removed from your favorites"
        });
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({
            user_id: user.id,
            property_id: property.id
          });
        
        if (error) throw error;
        
        setIsFavorited(true);
        toast({
          title: "Added to favorites",
          description: "Property added to your favorites"
        });
      }
    } catch (error) {
      console.error('Error toggling favorite:', error);
      toast({
        title: "Error",
        description: "Failed to update favorite status",
        variant: "destructive"
      });
    } finally {
      setIsTogglingFavorite(false);
    }
  };
  const formatPrice = (price: number, listingType: string) => {
    const formattedPrice = `$${price.toLocaleString()}`;
    return listingType === 'rent' ? `${formattedPrice}/mo` : formattedPrice;
  };

  const handlePreviousImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => 
      prev === 0 ? property.images.length - 1 : prev - 1
    );
  };

  const handleNextImage = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => 
      prev === property.images.length - 1 ? 0 : prev + 1
    );
  };

  const hasMultipleImages = property.images && property.images.length > 1;
  const currentImage = property.images && property.images.length > 0 
    ? property.images[currentImageIndex] 
    : null;

  return (
    <Card 
      className="hover:shadow-lg transition-shadow duration-300 cursor-pointer"
      onClick={(e) => {
        // Only trigger property details if not clicking on buttons or interactive elements
        const target = e.target as HTMLElement;
        if (!target.closest('button') && !target.closest('[role="button"]')) {
          onClick(property);
        }
      }}
    >
      <div className="h-48 bg-muted rounded-t-lg overflow-hidden relative group">
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-2 right-2 z-10 bg-background/80 backdrop-blur-sm hover:bg-background/90"
          onClick={toggleFavorite}
          disabled={isTogglingFavorite}
        >
          <Heart 
            className={`w-5 h-5 ${isFavorited ? 'fill-red-500 text-red-500' : 'text-muted-foreground'}`}
          />
        </Button>
        
        {/* Image navigation arrows */}
        {hasMultipleImages && (
          <>
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm hover:bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handlePreviousImage}
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-2 top-1/2 -translate-y-1/2 z-10 bg-background/80 backdrop-blur-sm hover:bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleNextImage}
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
            
            {/* Image indicator dots */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex gap-1">
              {property.images.map((_, index) => (
                <div
                  key={index}
                  className={`w-1.5 h-1.5 rounded-full transition-all ${
                    index === currentImageIndex 
                      ? 'bg-white w-4' 
                      : 'bg-white/50'
                  }`}
                />
              ))}
            </div>
          </>
        )}
        
        {currentImage ? (
          <img 
            src={currentImage} 
            alt={`${property.property_type} in ${property.city}`}
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNzUgMTEwSDE4NVYxMjBIMTc1VjExMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTE2NSAxMzBIMjM1VjIwMEgxNjVWMTMwWiIgc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz4KPHA+PHRleHQgeD0iMjAwIiB5PSIxNzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5Q0EzQUYiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0Ij5Qcm9wZXJ0eSBJbWFnZTwvdGV4dD48L3A+Cjwvc3ZnPgo=';
            }}
          />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Square className="w-8 h-8 mx-auto mb-2" />
              <span className="text-sm">No Image</span>
            </div>
          </div>
        )}
      </div>
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start mb-2">
          <Badge variant={property.listing_type === 'rent' ? 'secondary' : 'default'}>
            For {property.listing_type === 'rent' ? 'Rent' : 'Sale'}
          </Badge>
          <span className="text-2xl font-bold text-primary">
            {formatPrice(property.price, property.listing_type)}
          </span>
        </div>
        <CardTitle className="text-lg capitalize">
          {property.property_type}
        </CardTitle>
        <CardDescription className="flex items-start gap-1">
          <MapPin className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            {property.address}, {property.city}
            {property.municipality && `, ${property.municipality}`}
          </span>
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center space-x-4 text-sm text-muted-foreground mb-4">
          <div className="flex items-center">
            <Bed className="w-4 h-4 mr-1" />
            <span>{property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center">
            <Bath className="w-4 h-4 mr-1" />
            <span>{property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}</span>
          </div>
          <div className="flex items-center">
            <Square className="w-4 h-4 mr-1" />
            <span>{property.square_meters}m²</span>
          </div>
        </div>
        
        <Button 
          variant="outline" 
          size="sm"
          className="w-full flex items-center gap-2"
          onClick={(e) => {
            e.stopPropagation();
            setShowBookingModal(true);
          }}
        >
          <Calendar className="w-4 h-4" />
          Request Viewing
        </Button>
      </CardContent>
      
      <ViewingBookingModal
        isOpen={showBookingModal}
        onClose={() => setShowBookingModal(false)}
        property={{
          id: property.id,
          address: property.address,
          property_type: property.property_type,
          price: property.price,
          listing_type: property.listing_type
        }}
      />
    </Card>
  );
};

export default PropertyCard;