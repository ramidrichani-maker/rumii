import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Upload, Home, Building2, X } from "lucide-react";
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
import { StackedUnitsEditor, UnitDraft, validateUnits, insertUnitsForParent, makeEmptyUnit } from "@/components/StackedUnitsEditor";

const propertyTypes = ["Apartment", "Villa", "Beach House", "Chalet", "Duplex", "Triplex", "Penthouse", "Commercial", "Farm House", "Building", "Venue", "Studio", "Rooftop", "Land", "Stacked Unit"];
const amenities = ["Garden", "Parking/Garage", "Balcony/Terrace", "Swimming Pool", "Gym", "Elevator", "Storage Room", "Security", "Concierge", "EV Charging", "Patio", "Basement", "Sea View", "Mountain View", "Fireplace", "Smart-home"];
const roomTypes = [
  "Entrance", "Bedroom", "Salon", "Living Room", "Dining Room", "Kitchen",
  "Bathroom", "Toilet", "Terrace", "Balcony", "Roof", "Maid's Room",
  "Maid's Bathroom", "Storage Room", "Corridor"
];

interface UploadedImage {
  file: File;
  roomType: string;
}

const formSchema = z.object({
  agencyId: z.string().optional(),
  municipality: z.string().min(1, "Governorate is required"),
  description: z.string().optional(),
  city: z.string().min(1, "City is required"),
  address: z.string().min(1, "Full address is required"),
  propertyType: z.string().min(1, "Property type is required"),
  metersSquared: z.string().min(1, "Meters squared is required"),
  bedrooms: z.string().min(1, "Number of bedrooms is required"),
  bathrooms: z.string().min(1, "Number of bathrooms is required"),
  listingType: z.enum(["rent", "sale", "both"], {
    required_error: "Please select a listing type"
  }),
  price: z.string().optional(),
  rentalPrice: z.string().optional(),
  priceNegotiable: z.boolean().default(false),
  yearBuilt: z.string().optional(),
  lastRenovated: z.string().optional(),
  amenities: z.array(z.string()).default([])
}).refine((data) => {
  if (data.listingType === 'sale' && (!data.price || data.price === '')) return false;
  if (data.listingType === 'rent' && (!data.rentalPrice || data.rentalPrice === '')) return false;
  if (data.listingType === 'both') {
    if (!data.price || data.price === '') return false;
    if (!data.rentalPrice || data.rentalPrice === '') return false;
  }
  return true;
}, { message: "Please fill in the required price fields", path: ["price"] });

type FormData = z.infer<typeof formSchema>;

interface Agency {
  id: string;
  name: string;
}

const convertToJpeg = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    const supportedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (supportedTypes.includes(file.type) || file.type.startsWith('video/')) {
      resolve(file);
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((blob) => {
        URL.revokeObjectURL(url);
        if (!blob) { reject(new Error('Conversion failed')); return; }
        const newName = file.name.replace(/\.[^.]+$/, '.jpg');
        resolve(new File([blob], newName, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.9);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Failed to load image')); };
    img.src = url;
  });
};

export const AdminPropertyForm = () => {
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [floorPlanFiles, setFloorPlanFiles] = useState<File[]>([]);
  const [units, setUnits] = useState<UnitDraft[]>([]);
  const [coordinates, setCoordinates] = useState({
    lat: 33.8938,
    lng: 35.5018
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<Agency | null>(null);
  const { user } = useAuth();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      amenities: [],
      priceNegotiable: false,
      agencyId: ""
    }
  });

  const listingType = form.watch('listingType');
  const propertyType = form.watch('propertyType');
  const isStacked = propertyType === 'stacked unit' || propertyType === 'stacked_unit';

  useEffect(() => {
    const fetchAgencies = async () => {
      const { data, error } = await supabase
        .from('agencies')
        .select('id, name')
        .order('name');
      
      if (error) {
        console.error('Error fetching agencies:', error);
        return;
      }
      
      setAgencies(data || []);
    };

    fetchAgencies();
  }, []);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const newImages = files.map(file => ({ file, roomType: "" }));
    setUploadedImages(prev => [...prev, ...newImages]);
  };

  const removeFile = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const updateImageRoomType = (index: number, roomType: string) => {
    setUploadedImages(prev => prev.map((img, i) => i === index ? { ...img, roomType } : img));
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

  const handleAgencyChange = (agencyId: string) => {
    const actualId = agencyId === "none" ? "" : agencyId;
    form.setValue("agencyId", actualId);
    const agency = agencies.find(a => a.id === actualId);
    setSelectedAgency(agency || null);
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

    const normalizedType = data.propertyType.toLowerCase().replace(/\s+/g, '_');
    const isStackedSubmit = normalizedType === 'stacked_unit';

    if (isStackedSubmit) {
      const unitErr = validateUnits(units, data.listingType);
      if (unitErr) {
        toast({ title: "Units required", description: unitErr, variant: "destructive" });
        return;
      }
    }

    setIsSubmitting(true);
    
    try {
      let imageUrls: string[] = [];
      let floorPlanUrls: string[] = [];

      // Upload floor plans (multiple)
      for (let i = 0; i < floorPlanFiles.length; i++) {
        const convertedFp = await convertToJpeg(floorPlanFiles[i]);
        const fileExt = convertedFp.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}_${i}_floor-plan.${fileExt}`;
        const { error: fpError } = await supabase.storage
          .from('property-images')
          .upload(fileName, convertedFp);
        if (fpError) throw fpError;
        const { data: { publicUrl } } = supabase.storage
          .from('property-images')
          .getPublicUrl(fileName);
        floorPlanUrls.push(publicUrl);
      }

      if (uploadedImages.length > 0) {
        const uploadPromises = uploadedImages.map(async (img, index) => {
          const convertedFile = await convertToJpeg(img.file);
          const fileExt = convertedFile.name.split('.').pop();
          const fileName = `${user.id}/${Date.now()}_${index}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('property-images')
            .upload(fileName, convertedFile);

          if (uploadError) throw uploadError;

          const { data: { publicUrl } } = supabase.storage
            .from('property-images')
            .getPublicUrl(fileName);

          return publicUrl;
        });

        imageUrls = await Promise.all(uploadPromises);
      }

      // Insert property - admin listings are auto-approved
      const parentInsert = {
        user_id: user.id,
        agency_id: data.agencyId || null,
        municipality: data.municipality,
        city: data.city,
        address: data.address,
        property_type: normalizedType as any,
        square_meters: isStackedSubmit ? 0 : parseInt(data.metersSquared),
        bedrooms: isStackedSubmit ? 0 : parseInt(data.bedrooms),
        bathrooms: isStackedSubmit ? 0 : parseFloat(data.bathrooms),
        listing_type: data.listingType as any,
        price: !isStackedSubmit && data.price ? parseFloat(data.price) : null,
        rental_price: !isStackedSubmit && data.rentalPrice ? parseFloat(data.rentalPrice) : null,
        price_negotiable: data.priceNegotiable,
        year_built: data.yearBuilt ? parseInt(data.yearBuilt) : null,
        last_renovated: data.lastRenovated ? parseInt(data.lastRenovated) : null,
        amenities: selectedAmenities,
        images: isStackedSubmit ? [] : imageUrls,
        floor_plan_url: floorPlanUrls[0] ?? null,
        floor_plan_urls: floorPlanUrls,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        description: data.description || null,
        status: 'approved' // Admin listings are pre-approved
      };

      const { data: parentRow, error } = await supabase
        .from('properties')
        .insert(parentInsert)
        .select('id')
        .single();

      if (error) throw error;

      if (isStackedSubmit && parentRow) {
        await insertUnitsForParent(parentRow.id, user.id, units);
      }

      toast({
        title: "Property Listed Successfully!",
        description: `Property has been listed${selectedAgency ? ` under ${selectedAgency.name}` : ''}${isStackedSubmit ? ` with ${units.length} unit${units.length === 1 ? '' : 's'}` : ''} and is now live.`
      });

      // Reset form
      form.reset();
      setSelectedAmenities([]);
      setUploadedImages([]);
      setFloorPlanFiles([]);
      setSelectedAgency(null);
      setUnits([]);
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
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Agency Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                Agency Assignment
              </CardTitle>
              <CardDescription>
                Optionally assign this property to an agency
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FormField 
                control={form.control} 
                name="agencyId" 
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Agency (Optional)</FormLabel>
                    <Select onValueChange={handleAgencyChange} value={field.value || "none"}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an agency (optional)" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">No Agency</SelectItem>
                        {agencies.map(agency => (
                          <SelectItem key={agency.id} value={agency.id}>
                            {agency.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} 
              />
              
              {selectedAgency && (
                <div className="mt-3 flex items-center gap-2 p-3 bg-primary/10 rounded-lg border border-primary/20">
                  <Home className="w-4 h-4 text-primary" />
                  <span className="text-sm">Listing under:</span>
                  <Badge variant="default">{selectedAgency.name}</Badge>
                </div>
              )}
            </CardContent>
          </Card>

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
                      <Select onValueChange={field.onChange} value={field.value}>
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
                  <Select onValueChange={field.onChange} value={field.value}>
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

          {/* Listing Type - shown before property details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Listing Type</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField control={form.control} name="listingType" render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormControl>
                    <RadioGroup onValueChange={field.onChange} value={field.value} className="flex gap-8">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="rent" id="admin-rent" />
                        <Label htmlFor="admin-rent">For Rent</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="sale" id="admin-sale" />
                        <Label htmlFor="admin-sale">For Sale</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="both" id="admin-both" />
                        <Label htmlFor="admin-both">Both (Rent & Sale)</Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Property Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(listingType === 'sale' || listingType === 'both') && (
                  <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Price ($)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Enter sale price" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

                {(listingType === 'rent' || listingType === 'both') && (
                  <FormField control={form.control} name="rentalPrice" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Monthly Rental Price ($)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Enter monthly rent" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                )}

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
                    <Select onValueChange={field.onChange} value={field.value}>
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

              <FormField control={form.control} name="priceNegotiable" render={({ field }) => (
                <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                  <FormControl>
                    <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                  <FormLabel className="cursor-pointer">Price is negotiable</FormLabel>
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
                <Label htmlFor="admin-file-upload" className="cursor-pointer">
                  <span className="text-primary hover:text-primary/80">Click to upload</span>
                </Label>
                <Input 
                  id="admin-file-upload" 
                  type="file" 
                  multiple 
                  accept="image/*,video/*" 
                  onChange={handleFileUpload} 
                  className="hidden" 
                />
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
                      <div className="flex items-center gap-2">
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
                          <X className="h-4 w-4" />
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
              <CardTitle className="text-lg">Floor Plans (Optional)</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload one or more floor plans (e.g. for villas, triplexes, or buildings).
              </p>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-4 text-center">
                <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <Label htmlFor="admin-floor-plan-upload" className="cursor-pointer">
                  <span className="text-primary hover:text-primary/80">Click to upload floor plans</span>
                </Label>
                <Input
                  id="admin-floor-plan-upload"
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) setFloorPlanFiles(prev => [...prev, ...files]);
                    e.target.value = '';
                  }}
                  className="hidden"
                />
              </div>
              {floorPlanFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {floorPlanFiles.map((file, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm truncate">{file.name}</span>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setFloorPlanFiles(prev => prev.filter((_, i) => i !== idx))}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
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
              <div className="flex flex-wrap gap-2">
                {amenities.map(amenity => (
                  <Badge 
                    key={amenity}
                    variant={selectedAmenities.includes(amenity) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => handleAmenityToggle(amenity)}
                  >
                    {amenity}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Listing Property..." : "List Property"}
          </Button>
        </form>
      </Form>
    </div>
  );
};

export default AdminPropertyForm;
