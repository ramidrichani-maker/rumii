import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Upload, Home, Camera } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PropertyMap from "@/components/PropertyMap";
const propertyTypes = ["Apartment", "Villa", "Beach House", "Chalet", "Duplex", "Triplex", "Penthouse", "Commercial Rental", "Farm House", "Building", "Venue", "Studio", "Rooftop", "Land"];
const amenities = ["Swimming Pool", "Gym", "Parking", "Balcony", "Garden", "Air Conditioning", "Heating", "Internet", "Security", "Elevator", "Furnished", "Pet Friendly", "Laundry", "Storage", "Terrace", "Sea View", "Mountain View"];
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
  municipality: z.string().min(1, "District is required"),
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
  amenities: z.array(z.string()).default([]),
  brokerAgreement: z.boolean().refine((val) => val === true, {
    message: "You must agree to the broker terms to list your property"
  })
});
type FormData = z.infer<typeof formSchema>;
const ListProperty = () => {
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [coordinates, setCoordinates] = useState({
    lat: 33.8938,
    lng: 35.5018
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const auth = useAuth();
  const { user, profile } = auth;
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amenities: [],
      priceNegotiable: false,
      unfurnished: false,
      brokerAgreement: false
    }
  });

  // Guard against auth context not being ready - AFTER all hooks
  if (!auth || auth.loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>;
  }

  // Redirect agents to agent portal (not admin dashboard)
  if (profile?.role === 'agent') {
    return (
      <div className="min-h-screen bg-transparent">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="h-4 w-4" />
              Back to Home
            </Link>
          </div>
          <Card className="max-w-lg mx-auto">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Home className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Agent Portal Access</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground">
                As an agent, you can list properties through the Agent Portal where your listings will be automatically associated with your agency.
              </p>
              <Link to="/agent-portal">
                <Button className="w-full">
                  Go to Agent Portal
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }
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
    const updatedAmenities = selectedAmenities.includes(amenity) ? selectedAmenities.filter(a => a !== amenity) : [...selectedAmenities, amenity];
    setSelectedAmenities(updatedAmenities);
    form.setValue("amenities", updatedAmenities);
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

      // Upload images to Supabase storage if there are any
      if (uploadedImages.length > 0) {
        const uploadPromises = uploadedImages.map(async (uploadedImage, index) => {
          const file = uploadedImage.file;
          const roomType = uploadedImage.roomType.toLowerCase().replace(/['\s]/g, '-');
          const fileExt = file.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}_${roomType}_${index}.${fileExt}`;
          
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('property-images')
            .upload(fileName, file);

          if (uploadError) {
            console.error('Error uploading image:', uploadError);
            throw uploadError;
          }

          // Get public URL for the uploaded image
          const { data: { publicUrl } } = supabase.storage
            .from('property-images')
            .getPublicUrl(fileName);

          return publicUrl;
        });

        imageUrls = await Promise.all(uploadPromises);
      }

      // Insert property data with image URLs
      const { data: propertyData, error } = await supabase.from('properties').insert({
        user_id: user.id,
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
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        status: 'pending'
      }).select('id').single();

      if (error) throw error;

      // Record broker agreement for legal purposes
      const agreementText = "By listing this property, I agree that Summit will act as my exclusive real estate broker. This includes providing professional agents, marketing services, property viewings, and facilitating the rental or sale process on my behalf. I have read and agree to the full Terms of Service.";
      
      const { error: agreementError } = await supabase.from('broker_agreements').insert({
        user_id: user.id,
        property_id: propertyData?.id || null,
        full_name: profile?.full_name || user.email || '',
        email: user.email || '',
        terms_version: '1.0',
        agreement_text: agreementText,
        ip_address: null, // Could be captured via API if needed
        user_agent: navigator.userAgent
      });

      if (agreementError) {
        console.error('Error recording agreement:', agreementError);
        // Don't fail the whole submission if agreement logging fails
      }

      toast({
        title: "Property Listed Successfully!",
        description: `Your property has been submitted for admin approval${imageUrls.length > 0 ? ` with ${imageUrls.length} image${imageUrls.length > 1 ? 's' : ''}` : ''}.`
      });

      // Reset form
      form.reset();
      setSelectedAmenities([]);
      setUploadedImages([]);
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
  const handleLocationSelect = (lat: number, lng: number, address?: string) => {
    setCoordinates({
      lat,
      lng
    });
    if (address) {
      // Extract city from the address if possible
      const addressParts = address.split(',');
      const city = addressParts[addressParts.length - 2]?.trim() || addressParts[0]?.trim();
      if (city && !form.getValues('city')) {
        form.setValue('city', city);
      }
    }
  };
  return <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <Home className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">List Your Property</h1>
          </div>
          <p className="text-muted-foreground mt-2">Fill out the details below to list your property</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Basic Information */}
              <Card className="relative z-10">
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="municipality" render={({
                  field
                }) => <FormItem>
                        <FormLabel>District</FormLabel>
                        <FormControl>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select district" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Beirut">Beirut</SelectItem>
                              <SelectItem value="Jbeil">Jbeil</SelectItem>
                              <SelectItem value="Batroun">Batroun</SelectItem>
                              <SelectItem value="Faqra">Faqra</SelectItem>
                              <SelectItem value="Faraya">Faraya</SelectItem>
                              <SelectItem value="Broumana">Broumana</SelectItem>
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="city" render={({
                  field
                }) => <FormItem>
                        <FormLabel>City</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter city" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="address" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Full Address</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Enter complete address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="propertyType" render={({
                  field
                }) => <FormItem>
                        <FormLabel></FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select property type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {propertyTypes.map(type => <SelectItem key={type} value={type.toLowerCase()}>
                                {type}
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>} />
                </CardContent>
              </Card>

              {/* Location Map */}
              <Card className="relative z-0">
                <CardHeader>
                  <CardTitle>Property Location</CardTitle>
                  <p className="text-sm text-muted-foreground">Click on the map to pinpoint exact location</p>
                </CardHeader>
                <CardContent>
                  <PropertyMap latitude={coordinates.lat} longitude={coordinates.lng} onLocationSelect={handleLocationSelect} height="250px" />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-8">
              {/* Property Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="price" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Price ($)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Enter price" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="priceNegotiable" render={({
                  field
                }) => <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="cursor-pointer">
                            Price is negotiable
                          </FormLabel>
                        </div>
                      </FormItem>} />

                  <FormField control={form.control} name="unfurnished" render={({
                  field
                }) => <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="cursor-pointer">
                            Property is unfurnished
                          </FormLabel>
                          <p className="text-xs text-muted-foreground">
                            Check this if the property does not include furniture
                          </p>
                        </div>
                      </FormItem>} />

                  <FormField control={form.control} name="metersSquared" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Meters Squared (m²)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="Enter size in m²" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="bedrooms" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Bedrooms</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Select bedrooms" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {[1, 2, 3, 4, 5, 6, 7, 8].map(num => <SelectItem key={num} value={num.toString()}>
                                {num} {num === 1 ? 'Bedroom' : 'Bedrooms'}
                              </SelectItem>)}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="bathrooms" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Bathrooms</FormLabel>
                        <FormControl>
                          <Input 
                            type="number" 
                            step="0.5" 
                            min="0.5"
                            placeholder="e.g. 2 or 1.5" 
                            {...field} 
                          />
                        </FormControl>
                        <p className="text-xs text-muted-foreground mt-1">
                          Use .5 for half baths (toilet only, no shower)
                        </p>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="yearBuilt" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Year of Construction (Optional)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g. 2010" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  <FormField control={form.control} name="lastRenovated" render={({
                  field
                }) => <FormItem>
                        <FormLabel>Last Renovation (Optional)</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="e.g. 2020" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>} />

                  {['building', 'villa'].includes(form.watch('propertyType')) && (
                    <FormField control={form.control} name="floors" render={({
                      field
                    }) => <FormItem>
                            <FormLabel>Number of Floors</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" placeholder="e.g. 5" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                  )}

                  {form.watch('propertyType') === 'building' && (
                    <FormField control={form.control} name="apartmentsCount" render={({
                      field
                    }) => <FormItem>
                            <FormLabel>Number of Apartments</FormLabel>
                            <FormControl>
                              <Input type="number" min="1" placeholder="e.g. 20" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>} />
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Listing Type */}
            <Card>
              <CardHeader>
                <CardTitle>Listing Type</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField control={form.control} name="listingType" render={({
                field
              }) => <FormItem className="space-y-3">
                      <FormControl>
                        <RadioGroup onValueChange={field.onChange} defaultValue={field.value} className="flex gap-8">
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="rent" id="rent" />
                            <Label htmlFor="rent">For Rent</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <RadioGroupItem value="sale" id="sale" />
                            <Label htmlFor="sale">For Sale</Label>
                          </div>
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>} />
              </CardContent>
            </Card>

            {/* Media Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Images & Videos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <div className="space-y-2">
                    <Label htmlFor="file-upload" className="cursor-pointer">
                      <span className="text-primary hover:text-primary/80">Click to upload</span> or drag and drop
                    </Label>
                    <Input id="file-upload" type="file" multiple accept="image/*,video/*" onChange={handleFileUpload} className="hidden" />
                    <p className="text-sm text-muted-foreground">PNG, JPG, MP4 up to 10MB each</p>
                  </div>
                </div>
                
                {uploadedImages.length > 0 && (
                  <div className="mt-4 space-y-3">
                    <h4 className="text-sm font-medium">Selected Files ({uploadedImages.length}):</h4>
                    <p className="text-xs text-muted-foreground">Please select a room type for each image</p>
                    {uploadedImages.map((uploadedImage, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-muted rounded-lg">
                        <div className="flex items-center gap-3 flex-1">
                          <div className="w-16 h-16 bg-background rounded flex-shrink-0 flex items-center justify-center overflow-hidden">
                            {uploadedImage.file.type.startsWith('image/') ? (
                              <img 
                                src={URL.createObjectURL(uploadedImage.file)} 
                                alt="Preview" 
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              <Upload className="w-6 h-6 text-muted-foreground" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium truncate block">{uploadedImage.file.name}</span>
                            <p className="text-xs text-muted-foreground">
                              {(uploadedImage.file.size / 1024 / 1024).toFixed(2)} MB
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                          <Select
                            value={uploadedImage.roomType}
                            onValueChange={(value) => updateImageRoomType(index, value)}
                          >
                            <SelectTrigger className={`w-[160px] ${!uploadedImage.roomType ? 'border-destructive' : ''}`}>
                              <SelectValue placeholder="Select room type" />
                            </SelectTrigger>
                            <SelectContent>
                              {roomTypes.map(roomType => (
                                <SelectItem key={roomType} value={roomType}>
                                  {roomType}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button 
                            type="button" 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => removeFile(index)}
                            className="text-destructive hover:text-destructive flex-shrink-0"
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Photography Service CTA */}
                <div className="mt-6 p-4 border rounded-lg bg-primary/5 border-primary/20">
                  <div className="flex items-start gap-3">
                    <Camera className="h-5 w-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">Don't have photos?</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        Our professional photography team can come to your property and capture stunning images for your listing.
                      </p>
                      <Link to="/request-photography">
                        <Button variant="outline" size="sm" className="mt-3">
                          <Camera className="w-4 h-4 mr-2" />
                          Request Photography Service
                        </Button>
                      </Link>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Amenities */}
            <Card>
              <CardHeader>
                <CardTitle>Amenities</CardTitle>
                <p className="text-sm text-muted-foreground">Select all amenities included with the property</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {amenities.map(amenity => <div key={amenity} className="flex items-center space-x-2">
                      <Checkbox id={amenity} checked={selectedAmenities.includes(amenity)} onCheckedChange={() => handleAmenityToggle(amenity)} />
                      <Label htmlFor={amenity} className="text-sm">
                        {amenity}
                      </Label>
                    </div>)}
                </div>
              </CardContent>
            </Card>

            {/* Broker Agreement */}
            <Card className="border-primary/20">
              <CardHeader>
                <CardTitle>Broker Agreement</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="brokerAgreement"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 bg-muted/30">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer font-medium">
                          I agree to the broker terms
                        </FormLabel>
                        <p className="text-sm text-muted-foreground">
                          By listing this property, I agree that Summit will act as my exclusive real estate broker. 
                          This includes providing professional agents, marketing services, property viewings, 
                          and facilitating the rental or sale process on my behalf.{" "}
                          <Link to="/terms-of-service" className="text-primary hover:underline" target="_blank">
                            Read full Terms of Service
                          </Link>
                        </p>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-end">
              <Button type="submit" size="lg" className="px-8" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "List Property"}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>;
};
export default ListProperty;