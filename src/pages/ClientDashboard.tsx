import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Calendar as CalendarIcon, Clock, MapPin, Home, X, Upload, Trash2, Image as ImageIcon } from "lucide-react";
import { format } from "date-fns";

interface PropertyViewing {
  id: string;
  property_id: string;
  viewing_date: string;
  viewing_time: string;
  status: string;
  properties: {
    address: string;
    city: string;
    property_type: string;
    bedrooms: number;
    bathrooms: number;
    price: number;
    listing_type: string;
    images: string[];
  };
}

interface Property {
  id: string;
  address: string;
  city: string;
  property_type: string;
  bedrooms: number;
  bathrooms: number;
  price: number;
  listing_type: string;
  status: string;
  images: string[];
  created_at: string;
}

export default function ClientDashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [viewings, setViewings] = useState<PropertyViewing[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false);
  const [selectedViewing, setSelectedViewing] = useState<PropertyViewing | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newDate, setNewDate] = useState<Date>();
  const [newTime, setNewTime] = useState<string>("");

  const timeSlots = Array.from({ length: 10 }, (_, i) => {
    const hour = i + 9;
    return `${hour.toString().padStart(2, '0')}:00`;
  });

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user) {
      fetchViewings();
      fetchProperties();
    }
  }, [user]);

  const fetchViewings = async () => {
    try {
      const { data, error } = await supabase
        .from("property_viewings")
        .select(`
          *,
          properties (
            address,
            city,
            property_type,
            bedrooms,
            bathrooms,
            price,
            listing_type,
            images
          )
        `)
        .eq("user_id", user?.id)
        .eq("status", "confirmed")
        .order("viewing_date", { ascending: true });

      if (error) throw error;
      setViewings(data || []);
    } catch (error) {
      console.error("Error fetching viewings:", error);
      toast.error("Failed to load your viewings");
    } finally {
      setLoading(false);
    }
  };

  const fetchProperties = async () => {
    try {
      const { data, error } = await supabase
        .from("properties")
        .select("*")
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProperties(data || []);
    } catch (error) {
      console.error("Error fetching properties:", error);
      toast.error("Failed to load your properties");
    }
  };

  const cancelViewing = async (viewingId: string) => {
    try {
      const { error } = await supabase
        .from("property_viewings")
        .delete()
        .eq("id", viewingId);

      if (error) throw error;

      toast.success("Viewing cancelled successfully");
      fetchViewings();
    } catch (error) {
      console.error("Error cancelling viewing:", error);
      toast.error("Failed to cancel viewing");
    }
  };

  const rescheduleViewing = async () => {
    if (!selectedViewing || !newDate || !newTime) {
      toast.error("Please select both date and time");
      return;
    }

    try {
      const { error } = await supabase
        .from("property_viewings")
        .update({
          viewing_date: format(newDate, "yyyy-MM-dd"),
          viewing_time: newTime,
          status: "pending"
        })
        .eq("id", selectedViewing.id);

      if (error) throw error;

      toast.success("Viewing rescheduled successfully. Awaiting approval.");
      setRescheduleModalOpen(false);
      setSelectedViewing(null);
      setNewDate(undefined);
      setNewTime("");
      fetchViewings();
    } catch (error) {
      console.error("Error rescheduling viewing:", error);
      toast.error("Failed to reschedule viewing");
    }
  };

  const formatPrice = (price: number, listingType: string) => {
    return `$${price.toLocaleString()}${listingType === "rent" ? "/mo" : ""}`;
  };

  const deleteProperty = async (propertyId: string) => {
    try {
      const { error } = await supabase
        .from("properties")
        .delete()
        .eq("id", propertyId);

      if (error) throw error;

      toast.success("Property deleted successfully");
      fetchProperties();
    } catch (error) {
      console.error("Error deleting property:", error);
      toast.error("Failed to delete property");
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !selectedProperty) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const filePath = `${user?.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('property-images')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('property-images')
          .getPublicUrl(filePath);

        const mediaType = file.type.startsWith('video/') ? 'video' : 'image';

        const { error: insertError } = await supabase
          .from('property_media_pending')
          .insert({
            property_id: selectedProperty.id,
            user_id: user?.id,
            media_url: publicUrl,
            media_type: mediaType
          });

        if (insertError) throw insertError;
      }

      toast.success("Media uploaded and awaiting admin approval");
      setUploadModalOpen(false);
      setSelectedProperty(null);
    } catch (error) {
      console.error("Error uploading media:", error);
      toast.error("Failed to upload media");
    } finally {
      setUploading(false);
    }
  };

  const formatTimeSlot = (time: string) => {
    const [hours] = time.split(":");
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? "PM" : "AM";
    const displayHour = hour > 12 ? hour - 12 : hour;
    return `${displayHour}:00 ${ampm}`;
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { variant: "secondary" as const, label: "Pending Approval" },
      approved: { variant: "default" as const, label: "Approved" },
      rejected: { variant: "destructive" as const, label: "Rejected" }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const isDateDisabled = (date: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return date < today || date > maxDate;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pt-20 px-4">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-muted-foreground">Loading your viewings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent pt-20 px-4 pb-12">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">My Dashboard</h1>
          <p className="text-muted-foreground">Manage your property viewings and listings</p>
        </div>

        <Tabs defaultValue="viewings" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="viewings">My Viewings</TabsTrigger>
            <TabsTrigger value="listings">My Listings</TabsTrigger>
          </TabsList>

          <TabsContent value="viewings">

            {viewings.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">You don't have any confirmed viewings yet.</p>
              </Card>
            ) : (
          <div className="grid gap-6">
            {viewings.map((viewing) => (
              <Card key={viewing.id} className="p-6">
                <div className="flex flex-col md:flex-row gap-6">
                  {viewing.properties.images?.[0] && (
                    <img
                      src={viewing.properties.images[0]}
                      alt={viewing.properties.address}
                      className="w-full md:w-48 h-48 object-cover rounded-lg"
                    />
                  )}
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-foreground mb-2">
                          {viewing.properties.address}
                        </h3>
                        <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MapPin className="w-4 h-4" />
                            {viewing.properties.city}
                          </div>
                          <div className="flex items-center gap-1">
                            <Home className="w-4 h-4" />
                            {viewing.properties.property_type}
                          </div>
                          <span>{viewing.properties.bedrooms} beds • {viewing.properties.bathrooms} baths</span>
                        </div>
                      </div>
                      <Badge variant="secondary" className="ml-4">
                        {formatPrice(viewing.properties.price, viewing.properties.listing_type)}
                      </Badge>
                    </div>

                    <div className="bg-muted/50 p-4 rounded-lg mb-4">
                      <div className="flex flex-wrap gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <CalendarIcon className="w-4 h-4 text-primary" />
                          <span className="font-medium">
                            {format(new Date(viewing.viewing_date), "MMMM d, yyyy")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-primary" />
                          <span className="font-medium">{formatTimeSlot(viewing.viewing_time)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedViewing(viewing);
                          setRescheduleModalOpen(true);
                        }}
                      >
                        <CalendarIcon className="w-4 h-4 mr-2" />
                        Reschedule
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Are you sure you want to cancel this viewing?")) {
                            cancelViewing(viewing.id);
                          }
                        }}
                      >
                        <X className="w-4 h-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
            </div>
          )}
          </TabsContent>

          <TabsContent value="listings">
            {properties.length === 0 ? (
              <Card className="p-8 text-center">
                <p className="text-muted-foreground">You haven't listed any properties yet.</p>
              </Card>
            ) : (
              <div className="grid gap-6">
                {properties.map((property) => (
                  <Card key={property.id} className="p-6">
                    <div className="flex flex-col md:flex-row gap-6">
                      {property.images?.[0] && (
                        <img
                          src={property.images[0]}
                          alt={property.address}
                          className="w-full md:w-48 h-48 object-cover rounded-lg"
                        />
                      )}
                      
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-semibold text-foreground mb-2">
                              {property.address}
                            </h3>
                            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center gap-1">
                                <MapPin className="w-4 h-4" />
                                {property.city}
                              </div>
                              <div className="flex items-center gap-1">
                                <Home className="w-4 h-4" />
                                {property.property_type}
                              </div>
                              <span>{property.bedrooms} beds • {property.bathrooms} baths</span>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 items-end">
                            {getStatusBadge(property.status)}
                            <Badge variant="secondary">
                              {formatPrice(property.price, property.listing_type)}
                            </Badge>
                          </div>
                        </div>

                        <div className="bg-muted/50 p-4 rounded-lg mb-4">
                          <p className="text-sm text-muted-foreground">
                            Listed on {format(new Date(property.created_at), "MMMM d, yyyy")}
                          </p>
                          {property.images && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {property.images.length} photo{property.images.length !== 1 ? 's' : ''}
                            </p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {property.status === 'approved' && (
                            <>
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedProperty(property);
                                  setUploadModalOpen(true);
                                }}
                              >
                                <Upload className="w-4 h-4 mr-2" />
                                Add Media
                              </Button>
                              <Button
                                variant="destructive"
                                onClick={() => {
                                  if (confirm("Are you sure you want to delete this listing?")) {
                                    deleteProperty(property.id);
                                  }
                                }}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      <Dialog open={rescheduleModalOpen} onOpenChange={setRescheduleModalOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reschedule Viewing</DialogTitle>
          </DialogHeader>

          {selectedViewing && (
            <div className="space-y-6">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Property</p>
                <p className="font-medium">{selectedViewing.properties.address}</p>
              </div>

              <div>
                <h3 className="font-semibold mb-3">Select New Date</h3>
                <Calendar
                  mode="single"
                  selected={newDate}
                  onSelect={setNewDate}
                  disabled={isDateDisabled}
                  className="rounded-md border pointer-events-auto"
                />
              </div>

              {newDate && (
                <div>
                  <h3 className="font-semibold mb-3">Select New Time</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {timeSlots.map((time) => (
                      <Card
                        key={time}
                        className={`p-3 cursor-pointer transition-colors hover:border-primary ${
                          newTime === time ? "border-primary bg-primary/10" : ""
                        }`}
                        onClick={() => setNewTime(time)}
                      >
                        <p className="text-center font-medium">{formatTimeSlot(time)}</p>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {newDate && newTime && (
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">New Viewing Details</p>
                  <p className="font-medium">
                    {format(newDate, "MMMM d, yyyy")} at {formatTimeSlot(newTime)}
                  </p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Note: This will require approval from an agent
                  </p>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setRescheduleModalOpen(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={rescheduleViewing}
                  disabled={!newDate || !newTime}
                >
                  Confirm Reschedule
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={uploadModalOpen} onOpenChange={setUploadModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Photos or Videos</DialogTitle>
          </DialogHeader>

          {selectedProperty && (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg">
                <p className="text-sm text-muted-foreground mb-1">Property</p>
                <p className="font-medium">{selectedProperty.address}</p>
              </div>

              <div className="border-2 border-dashed border-muted rounded-lg p-8 text-center">
                <Input
                  type="file"
                  multiple
                  accept="image/*,video/*"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="hidden"
                  id="media-upload"
                />
                <label htmlFor="media-upload" className="cursor-pointer">
                  <ImageIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm font-medium mb-2">
                    {uploading ? "Uploading..." : "Click to upload photos or videos"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Media will be reviewed by an admin before being added to your listing
                  </p>
                </label>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
