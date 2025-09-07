import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bed, Bath, Square, MapPin, Calendar } from "lucide-react";
import ViewingBookingModal from "./ViewingBookingModal";

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
  const formatPrice = (price: number, listingType: string) => {
    const formattedPrice = `$${price.toLocaleString()}`;
    return listingType === 'rent' ? `${formattedPrice}/mo` : formattedPrice;
  };

  const getPropertyImage = (images: string[]) => {
    if (images && images.length > 0) {
      return images[0];
    }
    return null;
  };

  const propertyImage = getPropertyImage(property.images);

  return (
    <Card 
      className="hover:shadow-lg transition-shadow duration-300 cursor-pointer"
      onClick={() => onClick(property)}
    >
      <div className="h-48 bg-muted rounded-t-lg overflow-hidden">
        {propertyImage ? (
          <img 
            src={propertyImage} 
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