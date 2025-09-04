import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  MapPin, 
  Home, 
  Bed, 
  Bath, 
  Calendar, 
  Ruler,
  DollarSign,
  CheckCircle,
  XCircle,
  Clock
} from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";

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
  year_built?: number;
  last_renovated?: number;
  amenities: string[];
  images: string[];
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user_id: string;
}

interface PropertyDetailModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (propertyId: string) => void;
  onReject?: (propertyId: string) => void;
  isAdmin?: boolean;
}

const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  isOpen,
  onClose,
  onApprove,
  onReject,
  isAdmin = false
}) => {
  if (!property) return null;

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="w-3 h-3 mr-1" />Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="w-3 h-3 mr-1" />Rejected</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200"><Clock className="w-3 h-3 mr-1" />Pending Review</Badge>;
      default:
        return null;
    }
  };

  const isVideoUrl = (url: string) => {
    return url.match(/\.(mp4|webm|ogg|mov|avi|wmv)$/i) || 
           url.includes('youtube.com') || 
           url.includes('youtu.be') || 
           url.includes('vimeo.com');
  };

  const getEmbedUrl = (url: string) => {
    if (url.includes('youtube.com/watch?v=')) {
      const videoId = url.split('v=')[1].split('&')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('youtu.be/')) {
      const videoId = url.split('youtu.be/')[1].split('?')[0];
      return `https://www.youtube.com/embed/${videoId}`;
    }
    if (url.includes('vimeo.com/')) {
      const videoId = url.split('vimeo.com/')[1];
      return `https://player.vimeo.com/video/${videoId}`;
    }
    return url;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-start mb-2">
            <div>
              <DialogTitle className="text-2xl font-bold capitalize">
                {property.property_type} in {property.city}
              </DialogTitle>
              <DialogDescription className="text-base mt-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                {property.address}
                {property.municipality && `, ${property.municipality}`}
              </DialogDescription>
            </div>
            {getStatusBadge(property.status)}
          </div>
        </DialogHeader>

        {/* Images and Videos Carousel */}
        {property.images && property.images.length > 0 && (
          <div className="mb-6">
            <div className="relative px-12">
              <Carousel className="w-full">
                <CarouselContent>
                  {property.images.map((media, index) => (
                    <CarouselItem key={index}>
                      <div className="aspect-video bg-muted rounded-lg overflow-hidden border">
                        {isVideoUrl(media) ? (
                          media.match(/\.(mp4|webm|ogg|mov|avi|wmv)$/i) ? (
                            <video 
                              controls 
                              className="w-full h-full object-cover"
                              poster=""
                            >
                              <source src={media} type="video/mp4" />
                              Your browser does not support the video tag.
                            </video>
                          ) : (
                            <iframe
                              src={getEmbedUrl(media)}
                              className="w-full h-full"
                              frameBorder="0"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          )
                        ) : (
                          <img 
                            src={media} 
                            alt={`Property image ${index + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              console.error('Failed to load image:', media);
                              (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0xNzUgMTEwSDE4NVYxMjBIMTc1VjExMFoiIGZpbGw9IiM5Q0EzQUYiLz4KPHBhdGggZD0iTTE2NSAxMzBIMjM1VjIwMEgxNjVWMTMwWiIgc3Ryb2tlPSIjOUNBM0FGIiBzdHJva2Utd2lkdGg9IjIiIGZpbGw9Im5vbmUiLz4KPHA+PHRleHQgeD0iMjAwIiB5PSIxNzAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiM5Q0EzQUYiIGZvbnQtZmFtaWx5PSJzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0Ij5JbWFnZSBub3QgZm91bmQ8L3RleHQ+PC9wPgo8L3N2Zz4K';
                            }}
                            onLoad={() => {
                              console.log('Image loaded successfully:', media);
                            }}
                          />
                        )}
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {property.images.length > 1 && (
                  <>
                    <CarouselPrevious className="left-2" />
                    <CarouselNext className="right-2" />
                  </>
                )}
              </Carousel>
            </div>
            <div className="text-center text-sm text-muted-foreground mt-2">
              {property.images.length > 1 && (
                <span>{property.images.length} images</span>
              )}
            </div>
          </div>
        )}

        {/* Property Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-3">Property Details</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-muted-foreground" />
                  <span className="font-semibold text-lg">
                    ${property.price.toLocaleString()}
                    {property.listing_type === 'rent' && '/month'}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Bed className="w-4 h-4" />
                    {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center gap-1">
                    <Bath className="w-4 h-4" />
                    {property.bathrooms} bath{property.bathrooms !== 1 ? 's' : ''}
                  </div>
                  <div className="flex items-center gap-1">
                    <Ruler className="w-4 h-4" />
                    {property.square_meters}m²
                  </div>
                </div>
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Home className="w-4 h-4" />
                  <span className="capitalize">{property.property_type}</span>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            {(property.year_built || property.last_renovated) && (
              <div>
                <h4 className="font-medium mb-2">Building Information</h4>
                <div className="space-y-1 text-sm text-muted-foreground">
                  {property.year_built && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Built in {property.year_built}
                    </div>
                  )}
                  {property.last_renovated && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Last renovated in {property.last_renovated}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Amenities */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Amenities</h3>
            {property.amenities && property.amenities.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {property.amenities.map((amenity, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {amenity}
                  </Badge>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No amenities listed</p>
            )}
          </div>
        </div>

        {/* Admin Actions */}
        {isAdmin && property.status === 'pending' && (
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={() => onApprove?.(property.id)}
              className="flex-1"
              variant="default"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Approve Listing
            </Button>
            <Button 
              onClick={() => onReject?.(property.id)}
              className="flex-1"
              variant="destructive"
            >
              <XCircle className="w-4 h-4 mr-2" />
              Reject Listing
            </Button>
          </div>
        )}

        {/* Listing Info */}
        <div className="pt-4 border-t text-xs text-muted-foreground">
          Listed on {new Date(property.created_at).toLocaleDateString()} • 
          For {property.listing_type === 'rent' ? 'Rent' : 'Sale'}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PropertyDetailModal;