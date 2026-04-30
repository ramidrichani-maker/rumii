import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Clock,
  Eye,
  Trash2,
  Sparkles,
  Image as ImageIcon,
  Phone,
  Mail,
  Share2
} from "lucide-react";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import ViewingBookingModal from "@/components/ViewingBookingModal";
import { PropertyDeleteDialog } from "@/components/PropertyDeleteDialog";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface ApprovedDesign {
  id: string;
  media_url: string | null;
  style: string | null;
  palette: string | null;
  room_type: string | null;
}

const ROOM_TYPE_LABELS: Record<string, string> = {
  bedroom: "Bedroom",
  living_room: "Living Room",
  salon: "Salon",
  kitchen: "Kitchen",
  bathroom: "Bathroom",
  toilet: "Toilet",
  terrace: "Terrace",
  balcony: "Balcony",
  glass_curtain_balcony: "Closed Glass Curtain Balcony",
  garden: "Garden",
};

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
  listing_type: 'rent' | 'sale' | 'both';
  year_built?: number;
  last_renovated?: number;
  amenities: string[];
  images: string[];
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  user_id: string;
  unfurnished?: boolean;
  agency_id?: string | null;
}

interface PropertyDetailModalProps {
  property: Property | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove?: (propertyId: string) => void;
  onReject?: (propertyId: string) => void;
  onDelete?: () => void;
  isAdmin?: boolean;
  allowDelete?: boolean;
}

const PropertyDetailModal: React.FC<PropertyDetailModalProps> = ({
  property,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onDelete,
  isAdmin = false,
  allowDelete = true
}) => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isViewingModalOpen, setIsViewingModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [agentPhone, setAgentPhone] = useState<string | null>(null);
  const [showPhone, setShowPhone] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [approvedDesigns, setApprovedDesigns] = useState<ApprovedDesign[]>([]);
  const [selectedStyle, setSelectedStyle] = useState<string>("modern");
  const [selectedPalette, setSelectedPalette] = useState<string>("neutral");
  const [matchingDesign, setMatchingDesign] = useState<ApprovedDesign | null>(null);
  const [showDesignViewer, setShowDesignViewer] = useState(false);
  const [agencyName, setAgencyName] = useState<string | null>(null);
  const [agencyLogo, setAgencyLogo] = useState<string | null>(null);

  // Fetch assigned agent info
  useEffect(() => {
    if (!property?.id || !isOpen) return;
    setShowPhone(false);
    const fetchAgent = async () => {
      const { data: assignment } = await supabase
        .from('property_agents')
        .select('agent_id')
        .eq('property_id', property.id)
        .limit(1)
        .single();
      if (assignment) {
        setAgentId(assignment.agent_id);
        const { data: prof } = await supabase
          .from('profiles')
          .select('phone_number')
          .eq('user_id', assignment.agent_id)
          .single();
        setAgentPhone(prof?.phone_number || null);
      } else {
        setAgentId(null);
        setAgentPhone(null);
      }
    };
    fetchAgent();
  }, [property?.id, isOpen]);

  // Fetch agency info
  useEffect(() => {
    if (!property?.agency_id || !isOpen) return;
    const fetchAgency = async () => {
      const { data: agency } = await supabase
        .from('agencies')
        .select('name, logo_url')
        .eq('id', property.agency_id!)
        .single();
      if (agency) {
        setAgencyName(agency.name);
        setAgencyLogo(agency.logo_url);
      }
    };
    fetchAgency();
  }, [property?.agency_id, isOpen]);

  // Load approved AI designs for this property
  useEffect(() => {
    if (!property?.id || !isOpen) return;

    const loadApprovedDesigns = async () => {
      const { data, error } = await supabase
        .from("property_generated_images")
        .select("id, media_url, style, palette, room_type")
        .eq("property_id", property.id)
        .eq("approved", true);

      if (!error && data) {
        setApprovedDesigns(data);
        // Find matching design for default style/palette
        const matching = data.find(d => d.style === selectedStyle && d.palette === selectedPalette);
        setMatchingDesign(matching || null);
      }
    };

    loadApprovedDesigns();
  }, [property?.id, isOpen]);

  // Update matching design when style/palette changes
  useEffect(() => {
    const matching = approvedDesigns.find(d => d.style === selectedStyle && d.palette === selectedPalette);
    setMatchingDesign(matching || null);
  }, [selectedStyle, selectedPalette, approvedDesigns]);
  
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

  const handleDeleteProperty = async (reason: string) => {
    if (!property) return;

    // Close parent modal early to avoid overlay stacking/freeze
    try { onClose(); } catch {}

    console.log('Starting delete for property:', property.id);
    console.log('User role:', profile?.role);
    console.log('Delete reason:', reason);

    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', property.id);

      if (error) throw error;

      toast({
        title: "Property Deleted",
        description: `Property has been deleted. Reason: ${reason}`
      });
    } catch (error) {
      console.error('Error deleting property:', error);
      toast({
        title: "Error",
        description: "Failed to delete property. Please try again.",
        variant: "destructive"
      });
    } finally {
      setDeleteDialogOpen(false);
      onDelete?.();
    }
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

        {/* Contact & Viewing Actions - Prominent placement */}
        {!isAdmin && property.status === 'approved' && (
          <div className="space-y-3 pb-2">
            {agencyName && (
              <div className="flex items-center gap-2">
                {agencyLogo ? (
                  <img src={agencyLogo} alt={agencyName} className="w-8 h-8 rounded-full object-cover border border-border" />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                    <Home className="w-4 h-4 text-muted-foreground" />
                  </div>
                )}
                <span className="text-sm font-semibold text-foreground">{agencyName}</span>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
            {user && (
              <Button 
                onClick={() => setIsViewingModalOpen(true)}
                className="flex-1"
                size="default"
              >
                <Eye className="w-4 h-4 mr-2" />
                Request Viewing
              </Button>
            )}
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => {
                const phone = agentPhone || '+96170612686';
                if (showPhone) {
                  window.location.href = `tel:${phone}`;
                } else {
                  setShowPhone(true);
                }
              }}
            >
              <Phone className="w-4 h-4 mr-2" />
              {showPhone ? (agentPhone || '+96170612686') : 'Call Agent'}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate(`/property/${property.id}/enquiry`, {
                state: { agentId, agencyId: undefined }
              })}
            >
              <Mail className="w-4 h-4 mr-2" />
              Email Agent
            </Button>
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

        {/* AI Room Staging Section - Shows approved designs to customers for unfurnished properties */}
        {!isAdmin && property.unfurnished && approvedDesigns.length > 0 && (
          <div className="pt-4 border-t">
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Room Staging
                </h3>
                <p className="text-sm text-muted-foreground">
                  See how this unfurnished property could look with different furniture styles and colors
                </p>
              </div>
              
              {/* Get unique style/palette combinations (max 3) */}
              {(() => {
                const uniqueCombos = Array.from(
                  new Set(approvedDesigns.map(d => `${d.style}|${d.palette}`))
                ).slice(0, 3).map(combo => {
                  const [style, palette] = combo.split("|");
                  return { style, palette };
                });

                const availableStyles = Array.from(new Set(uniqueCombos.map(c => c.style)));
                const availablePalettes = Array.from(new Set(uniqueCombos.map(c => c.palette)));

                // Get designs matching current selection
                const matchingDesigns = approvedDesigns.filter(
                  d => d.style === selectedStyle && d.palette === selectedPalette
                );

                // Group matching designs by room type with numbering
                const getRoomTypeLabel = (roomType: string | null, index: number, allOfType: ApprovedDesign[]) => {
                  const label = roomType ? (ROOM_TYPE_LABELS[roomType] || roomType) : "Room";
                  if (allOfType.length > 1) {
                    return `${label} ${index + 1}`;
                  }
                  return label;
                };

                return (
                  <>
                    {/* Style and Palette Selection - Limited to 3 options each */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-sm">Design Style ({availableStyles.length} options)</Label>
                        <Select 
                          value={availableStyles.includes(selectedStyle) ? selectedStyle : availableStyles[0] || "modern"} 
                          onValueChange={setSelectedStyle}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableStyles.map(style => (
                              <SelectItem key={style} value={style}>
                                {style.charAt(0).toUpperCase() + style.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-sm">Color Palette ({availablePalettes.length} options)</Label>
                        <Select 
                          value={availablePalettes.includes(selectedPalette) ? selectedPalette : availablePalettes[0] || "neutral"} 
                          onValueChange={setSelectedPalette}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availablePalettes.map(palette => (
                              <SelectItem key={palette} value={palette}>
                                {palette.charAt(0).toUpperCase() + palette.slice(1)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Display matching designs by room type */}
                    {matchingDesigns.length > 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          Showing {matchingDesigns.length} room(s) in {selectedStyle} style with {selectedPalette} palette:
                        </p>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {matchingDesigns.map((design, index) => {
                            const sameTypeDesigns = matchingDesigns.filter(d => d.room_type === design.room_type);
                            const typeIndex = sameTypeDesigns.findIndex(d => d.id === design.id);
                            
                            return (
                              <div key={design.id} className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                                <img
                                  src={design.media_url || ""}
                                  alt={`AI Generated ${design.room_type} design`}
                                  className="w-full h-full object-cover"
                                />
                                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                                  <p className="text-white text-xs font-medium">
                                    {getRoomTypeLabel(design.room_type, typeIndex, sameTypeDesigns)}
                                  </p>
                                </div>
                                <div className="absolute top-2 left-2 bg-primary/90 text-primary-foreground px-1.5 py-0.5 rounded text-xs font-medium flex items-center gap-1">
                                  <Sparkles className="h-2.5 w-2.5" />
                                  AI
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : (
                      <div className="aspect-video rounded-lg bg-muted flex items-center justify-center">
                        <div className="text-center text-muted-foreground">
                          <ImageIcon className="h-8 w-8 mx-auto mb-2" />
                          <p className="text-sm">No designs available for this combination</p>
                          <p className="text-xs mt-1">Try a different style or color palette</p>
                        </div>
                      </div>
                    )}

                    {/* Show available combinations */}
                    <div className="flex flex-wrap gap-1 items-center">
                      <span className="text-xs text-muted-foreground">Quick select:</span>
                      {uniqueCombos.map((combo, idx) => (
                        <Badge 
                          key={idx}
                          variant={combo.style === selectedStyle && combo.palette === selectedPalette ? "default" : "outline"}
                          className="text-xs cursor-pointer hover:bg-primary/10"
                          onClick={() => {
                            setSelectedStyle(combo.style);
                            setSelectedPalette(combo.palette);
                          }}
                        >
                          {combo.style}/{combo.palette}
                        </Badge>
                      ))}
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}




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

        {/* Admin Delete Button */}
        {allowDelete && profile?.role === 'admin' && property.status === 'approved' && (
          <div className="pt-4 border-t">
            <Button 
              onClick={() => {
                console.log('Delete button clicked', { profile, property });
                setDeleteDialogOpen(true);
              }}
              variant="destructive"
              className="w-full"
              size="lg"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Listing
            </Button>
          </div>
        )}

        {/* Listing Info */}
        <div className="pt-4 border-t text-xs text-muted-foreground">
          Listed on {new Date(property.created_at).toLocaleDateString()} • 
          For {property.listing_type === 'rent' ? 'Rent' : property.listing_type === 'both' ? 'Rent & Sale' : 'Sale'}
        </div>
      </DialogContent>

      {/* Viewing Booking Modal */}
      {property && (
        <ViewingBookingModal
          isOpen={isViewingModalOpen}
          onClose={() => setIsViewingModalOpen(false)}
          property={{
            id: property.id,
            address: property.address,
            property_type: property.property_type,
            price: property.price,
            listing_type: property.listing_type
          }}
          agencyId={property.agency_id}
        />
      )}

      {/* Property Delete Dialog */}
      {property && (
        <PropertyDeleteDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          onConfirm={handleDeleteProperty}
          propertyAddress={property.address}
        />
      )}
    </Dialog>
  );
};

export default PropertyDetailModal;