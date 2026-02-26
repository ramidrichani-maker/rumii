import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, Home, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PropertyMap from "@/components/PropertyMap";

const propertyTypes = ["Apartment", "Villa", "Beach House", "Chalet", "Duplex", "Triplex", "Penthouse", "Commercial Rental", "Farm House", "Building", "Venue", "Studio", "Rooftop", "Land"];
const amenities = ["Garden", "Parking/Garage", "Balcony/Terrace", "Swimming Pool", "Gym", "Elevator", "Storage Room", "Security", "Concierge", "EV Charging", "Patio", "Basement", "Sea View", "Mountain View", "Fireplace", "Smart-home"];
const roomTypes = [
  "Entrance",
  "Bedroom", 
  "Salon",
  "Living Room",
  "Dining Room",
  "Kitchen",
  "Bathroom",
  "Toilet",
  "Terrace",
  "Balcony",
  "Roof",
  "Maid's Room",
  "Maid's Bathroom",
  "Storage Room",
  "Corridor"
];

interface UploadedImage {
  file: File;
  roomType: string;
}
const formSchema = z.object({
  municipality: z.string().min(1, "Governorate is required"),
  description: z.string().optional(),
  city: z.string().min(1, "City is required"),
  address: z.string().min(1, "Full address is required"),
  propertyType: z.string().min(1, "Property type is required"),
  metersSquared: z.string().min(1, "Meters squared is required"),
  bedrooms: z.string().min(1, "Number of bedrooms is required"),
  bathrooms: z.string().min(1, "Number of bathrooms is required"),
  listingType: z.enum(["rent", "sale"], {
    required_error: "Please select if this is for rent or sale"
  }),
  price: z.string().min(1, "Price is required"),
  priceNegotiable: z.boolean().default(false),
  unfurnished: z.boolean().default(false),
  yearBuilt: z.string().optional(),
  lastRenovated: z.string().optional(),
  floors: z.string().optional(),
  apartmentsCount: z.string().optional(),
  amenities: z.array(z.string()).default([])
});

type FormData = z.infer<typeof formSchema>;

interface Agency {
  id: string;
  name: string;
}

const AgentPropertyForm = () => {
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [floorPlanFile, setFloorPlanFile] = useState<File | null>(null);
  const [coordinates, setCoordinates] = useState({
    lat: 33.8938,
    lng: 35.5018
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agentAgency, setAgentAgency] = useState<Agency | null>(null);
  const { user, profile } = useAuth();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amenities: [],
      priceNegotiable: false,
      unfurnished: false
    }
  });

  useEffect(() => {
    const fetchAgentAgency = async () => {
      if (!profile?.agency_id) return;
      
      const { data } = await supabase
        .from('agencies')
        .select('id, name')
        .eq('id', profile.agency_id)
        .single();
      
      if (data) setAgentAgency(data);
    };

    fetchAgentAgency();
  }, [profile?.agency_id]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newImages: UploadedImage[] = files.map(file => ({
      file,
      roomType: '' // Initially no room type selected
    }));
    setUploadedImages(prev => [...prev, ...newImages]);
  };

  const updateImageRoomType = (index: number, roomType: string) => {
    setUploadedImages(prev => prev.map((img, i) => 
      i === index ? { ...img, roomType } : img
    ));
  };

  const removeFile = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleAmenityToggle = (amenity: string) => {
    const updatedAmenities = selectedAmenities.includes(amenity) 
      ? selectedAmenities.filter(a => a !== amenity) 
      : [...selectedAmenities, amenity];
    setSelectedAmenities(updatedAmenities);
    form.setValue("amenities", updatedAmenities);
  };

  const handleLocationSelect = (lat: number, lng: number, address?: string) => {
    setCoordinates({ lat, lng });
    if (address) {
      const addressParts = address.split(',');
      const city = addressParts[addressParts.length - 2]?.trim() || addressParts[0]?.trim();
      if (city && !form.getValues('city')) {
        form.setValue('city', city);
      }
    }
  };

  const onSubmit = async (data: FormData) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to list a property.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Check if all images have room types assigned
      const unassignedImages = uploadedImages.filter(img => !img.roomType);
      if (unassignedImages.length > 0) {
        toast({
          title: "Room Types Required",
          description: "Please select a room type for all uploaded images.",
          variant: "destructive"
        });
        setIsSubmitting(false);
        return;
      }

      let imageUrls: string[] = [];
      let floorPlanUrl: string | null = null;

      // Upload floor plan
      if (floorPlanFile) {
        const fileExt = floorPlanFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_floor-plan.${fileExt}`;
        const { error: fpError } = await supabase.storage
          .from('property-images')
          .upload(fileName, floorPlanFile);
        if (fpError) throw fpError;
        const { data: { publicUrl } } = supabase.storage
          .from('property-images')
          .getPublicUrl(fileName);
        floorPlanUrl = publicUrl;
      }

      if (uploadedImages.length > 0) {
        const uploadPromises = uploadedImages.map(async (uploadedImage, index) => {
          const file = uploadedImage.file;
          const roomType = uploadedImage.roomType.toLowerCase().replace(/['\s]/g, '-');
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}_${roomType}_${index}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('property-images')
            .upload(fileName, file);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('property-images')
            .getPublicUrl(fileName);

          return publicUrl;
        });

        imageUrls = await Promise.all(uploadPromises);
      }

      // Insert property - agent listings are auto-approved
      const { data: propertyData, error } = await supabase.from('properties').insert({
        user_id: user.id,
        agency_id: profile?.agency_id || null,
        municipality: data.municipality,
        city: data.city,
        address: data.address,
        property_type: data.propertyType.toLowerCase() as any,
        square_meters: parseInt(data.metersSquared),
        bedrooms: parseInt(data.bedrooms),
        bathrooms: parseFloat(data.bathrooms),
        listing_type: data.listingType as any,
        price: parseFloat(data.price),
        price_negotiable: data.priceNegotiable,
        unfurnished: data.unfurnished,
        year_built: data.yearBuilt ? parseInt(data.yearBuilt) : null,
        last_renovated: data.lastRenovated ? parseInt(data.lastRenovated) : null,
        floors: data.floors ? parseInt(data.floors) : null,
        apartments_count: data.apartmentsCount ? parseInt(data.apartmentsCount) : null,
        amenities: selectedAmenities,
        images: imageUrls,
        floor_plan_url: floorPlanUrl,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        description: data.description || null,
        status: 'approved' // Agent listings are pre-approved
      }).select('id').single();

      if (error) throw error;

      // Auto-assign the agent to this property
      if (propertyData) {
        await supabase.from('property_agents').insert({
          property_id: propertyData.id,
          agent_id: user.id
        });
      }

      toast({
        title: "Property Listed Successfully!",
        description: `Property has been listed${agentAgency ? ` under ${agentAgency.name}` : ''}.`
      });

      // Reset form
      form.reset();
      setSelectedAmenities([]);
      setUploadedImages([]);
      setFloorPlanFile(null);
    } catch (error) {
      console.error('Error listing property:', error);
      toast({
        title: "Error",
        description: "Failed to list property. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Agency Badge */}
      {agentAgency && (
        <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
          <Home className="w-5 h-5 text-primary" />
          <span className="text-sm font-medium">Listing as:</span>
          <Badge variant="default">{agentAgency.name}</Badge>
        </div>
      )}

      {!agentAgency && profile?.role === 'agent' && (
        <div className="flex items-center gap-2 p-3 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
          <Home className="w-5 h-5 text-yellow-600" />
          <span className="text-sm text-yellow-700 dark:text-yellow-400">
            You are not assigned to an agency. Contact an admin to be assigned.
          </span>
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="municipality" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Governorate</FormLabel>
                    <FormControl>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select governorate" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Beirut">Beirut</SelectItem>
                          <SelectItem value="Mount Lebanon">Mount Lebanon</SelectItem>
                          <SelectItem value="North Lebanon">North Lebanon</SelectItem>
                          <SelectItem value="South Lebanon">South Lebanon</SelectItem>
                          <SelectItem value="Bekaa">Bekaa</SelectItem>
                          <SelectItem value="Nabatiyeh">Nabatiyeh</SelectItem>
                          <SelectItem value="Baalbek-Hermel">Baalbek-Hermel</SelectItem>
                          <SelectItem value="Akkar">Akkar</SelectItem>
                        </SelectContent>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="city" render={({ field }) => (
                  <FormItem>
                    <FormLabel>City</FormLabel>
                    <FormControl>
                      <Input placeholder="Enter city" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              <FormField control={form.control} name="address" render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Address</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Enter complete address" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                  <FormLabel>Description (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Describe the property and its ambience..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <FormField control={form.control} name="propertyType" render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select property type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {propertyTypes.map(type => (
                        <SelectItem key={type} value={type.toLowerCase()}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Location Map */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Property Location</CardTitle>
              <CardDescription>Click on the map to pinpoint exact location</CardDescription>
            </CardHeader>
            <CardContent>
              <PropertyMap 
                latitude={coordinates.lat} 
                longitude={coordinates.lng} 
                onLocationSelect={handleLocationSelect} 
                height="200px" 
              />
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Property Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="price" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price ($)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Enter price" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="metersSquared" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Size (m²)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="Enter size" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="bedrooms" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bedrooms</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                          <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="bathrooms" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bathrooms</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.5" min="0.5" placeholder="e.g. 2" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="yearBuilt" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year Built (Optional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g. 2010" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="lastRenovated" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Last Renovated (Optional)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="e.g. 2020" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>

              {['building', 'villa'].includes(form.watch('propertyType')) && (
                <FormField control={form.control} name="floors" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Floors</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="e.g. 5" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              {form.watch('propertyType') === 'building' && (
                <FormField control={form.control} name="apartmentsCount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Number of Apartments</FormLabel>
                    <FormControl>
                      <Input type="number" min="1" placeholder="e.g. 20" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}

              <FormField control={form.control} name="priceNegotiable" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="cursor-pointer">Price is negotiable</FormLabel>
                </FormItem>
              )} />

              <FormField control={form.control} name="unfurnished" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="cursor-pointer">Property is unfurnished</FormLabel>
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Listing Type */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Listing Type</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField control={form.control} name="listingType" render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-8">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="rent" id="agent-rent" />
                        <Label htmlFor="agent-rent">For Rent</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sale" id="agent-sale" />
                        <Label htmlFor="agent-sale">For Sale</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Media Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Images & Videos</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <Label htmlFor="agent-file-upload" className="cursor-pointer">
                  <span className="text-primary hover:text-primary/80">Click to upload</span>
                </Label>
                <p className="text-xs text-muted-foreground mt-1">You must select a room type for each image</p>
                <Input 
                  id="agent-file-upload" 
                  type="file" 
                  multiple 
                  accept="image/*,video/*" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
              </div>
              
              {uploadedImages.length > 0 && (
                <div className="mt-3 space-y-3">
                  {uploadedImages.map((uploadedImage, index) => (
                    <div key={index} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-muted rounded gap-2">
                      <span className="text-sm truncate flex-shrink-0">{uploadedImage.file.name}</span>
                      <div className="flex items-center gap-2 flex-1 sm:justify-end">
                        <Select 
                          value={uploadedImage.roomType} 
                          onValueChange={(value) => updateImageRoomType(index, value)}
                        >
                          <SelectTrigger className={`w-[160px] ${!uploadedImage.roomType ? 'border-destructive' : ''}`}>
                            <SelectValue placeholder="Select room type" />
                          </SelectTrigger>
                          <SelectContent>
                            {roomTypes.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button type="button" variant="ghost" size="sm" onClick={() => removeFile(index)}>
                          Remove
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Floor Plan Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Floor Plan (Optional)</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <Label htmlFor="agent-floor-plan-upload" className="cursor-pointer">
                  <span className="text-primary hover:text-primary/80">Click to upload floor plan</span>
                </Label>
                <Input
                  id="agent-floor-plan-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) setFloorPlanFile(file);
                  }}
                  className="hidden"
                />
              </div>
              {floorPlanFile && (
                <div className="mt-3 flex items-center justify-between p-3 bg-muted rounded">
                  <span className="text-sm truncate">{floorPlanFile.name}</span>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setFloorPlanFile(null)}>
                    Remove
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Amenities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Amenities</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {amenities.map(amenity => (
                  <div key={amenity} className="flex items-center space-x-2">
                    <Checkbox 
                      id={`agent-${amenity}`} 
                      checked={selectedAmenities.includes(amenity)} 
                      onCheckedChange={() => handleAmenityToggle(amenity)} 
                    />
                    <Label htmlFor={`agent-${amenity}`} className="text-sm">{amenity}</Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            <Plus className="w-4 h-4 mr-2" />
            {isSubmitting ? "Submitting..." : "Add Property Listing"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default AgentPropertyForm;
