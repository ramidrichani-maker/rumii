import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Upload, Home, Camera, AlertTriangle, RotateCw, X, CheckCircle2, Loader2 } from "lucide-react";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import PropertyMap from "@/components/PropertyMap";
const propertyTypes = ["Apartment", "Villa", "Beach House", "Chalet", "Duplex", "Triplex", "Penthouse", "Commercial", "Farm House", "Building", "Venue", "Studio", "Rooftop", "Land"];
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
  file: File | null;
  roomType: string;
  // For files already uploaded to storage (e.g. restored after refresh)
  persisted?: {
    url: string;
    path: string;
    name: string;
    type: string;
  };
}

interface PersistedFloorPlan {
  url: string;
  path: string;
  name: string;
  type: string;
}

interface PendingListingPayload {
  data: any; // FormData (looser typing for storage)
  images: Array<{ url: string; path: string; name: string; type: string; roomType: string }>;
  floorPlan: PersistedFloorPlan | null;
}

const PENDING_STORAGE_KEY = 'rumi:pendingListing';

const formSchema = z.object({
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
  unfurnished: z.boolean().default(false),
  yearBuilt: z.string().optional(),
  lastRenovated: z.string().optional(),
  floors: z.string().optional(),
  apartmentsCount: z.string().optional(),
  amenities: z.array(z.string()).default([]),
  brokerAgreement: z.boolean().refine((val) => val === true, {
    message: "You must agree to the broker terms to list your property"
  })
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
const ListProperty = () => {
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [uploadedImages, setUploadedImages] = useState<UploadedImage[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [floorPlanFile, setFloorPlanFile] = useState<File | null>(null);
  const [persistedFloorPlan, setPersistedFloorPlan] = useState<PersistedFloorPlan | null>(null);
  const [coordinates, setCoordinates] = useState({
    lat: 33.8938,
    lng: 35.5018
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showClientConfirm, setShowClientConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<FormData | null>(null);
  const [isPreparingConfirm, setIsPreparingConfirm] = useState(false);
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

  const listingType = form.watch('listingType');

  // Restore a pending listing (form values, uploaded media, dialog state) if
  // the user refreshed or navigated away while the confirmation dialog was open.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PENDING_STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as PendingListingPayload;
      if (!saved?.data) return;
      form.reset(saved.data);
      if (Array.isArray(saved.data.amenities)) setSelectedAmenities(saved.data.amenities);
      // Restore images as persisted-only entries (no File handle)
      if (Array.isArray(saved.images)) {
        setUploadedImages(saved.images.map((m) => ({
          file: null,
          roomType: m.roomType || '',
          persisted: { url: m.url, path: m.path, name: m.name, type: m.type },
        })));
      }
      if (saved.floorPlan) {
        setPersistedFloorPlan(saved.floorPlan);
      }
      setPendingData(saved.data as FormData);
      setShowClientConfirm(true);
    } catch (err) {
      console.error('Failed to restore pending listing', err);
      localStorage.removeItem(PENDING_STORAGE_KEY);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper: get a preview URL for either a freshly picked file or a persisted one
  const getPreviewUrl = (img: UploadedImage): string | null => {
    if (img.file) return URL.createObjectURL(img.file);
    if (img.persisted) return img.persisted.url;
    return null;
  };

  const getMediaType = (img: UploadedImage): string => {
    return img.file?.type || img.persisted?.type || '';
  };

  const getMediaName = (img: UploadedImage): string => {
    return img.file?.name || img.persisted?.name || 'file';
  };

  const getMediaSizeMB = (img: UploadedImage): string | null => {
    if (!img.file) return null;
    return (img.file.size / 1024 / 1024).toFixed(2);
  };

  // Delete previously persisted temp media from storage (used on cancel)
  const purgePersistedMedia = async (
    images: Array<{ path: string }>,
    floorPlan: PersistedFloorPlan | null
  ) => {
    const paths = [
      ...images.map((i) => i.path),
      ...(floorPlan ? [floorPlan.path] : []),
    ].filter(Boolean);
    if (paths.length === 0) return;
    try {
      await supabase.storage.from('property-images').remove(paths);
    } catch (err) {
      console.error('Failed to purge pending media', err);
    }
  };

  const clearPendingPersistence = () => {
    localStorage.removeItem(PENDING_STORAGE_KEY);
  };

  // Upload all current media to storage, then persist metadata + form data
  // to localStorage so the user can resume after a refresh.
  const persistPendingListing = async (data: FormData) => {
    if (!user) return false;
    setIsPreparingConfirm(true);
    try {
      // Upload only items that aren't already persisted
      const persistedImages: Array<{ url: string; path: string; name: string; type: string; roomType: string }> = [];
      for (let i = 0; i < uploadedImages.length; i++) {
        const img = uploadedImages[i];
        if (img.persisted) {
          persistedImages.push({ ...img.persisted, roomType: img.roomType });
          continue;
        }
        if (!img.file) continue;
        const ext = img.file.name.split('.').pop() || 'bin';
        const path = `${user.id}/pending/${Date.now()}_${i}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('property-images')
          .upload(path, img.file);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage
          .from('property-images')
          .getPublicUrl(path);
        persistedImages.push({
          url: publicUrl,
          path,
          name: img.file.name,
          type: img.file.type,
          roomType: img.roomType,
        });
      }

      // Floor plan
      let fp: PersistedFloorPlan | null = persistedFloorPlan;
      if (!fp && floorPlanFile) {
        const ext = floorPlanFile.name.split('.').pop() || 'bin';
        const path = `${user.id}/pending/${Date.now()}_floor-plan.${ext}`;
        const { error: upErr } = await supabase.storage
          .from('property-images')
          .upload(path, floorPlanFile);
        if (upErr) throw upErr;
        const { data: { publicUrl } } = supabase.storage
          .from('property-images')
          .getPublicUrl(path);
        fp = { url: publicUrl, path, name: floorPlanFile.name, type: floorPlanFile.type };
      }

      const payload: PendingListingPayload = {
        data,
        images: persistedImages,
        floorPlan: fp,
      };
      try {
        localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(payload));
      } catch (err) {
        console.error('Failed to persist pending listing metadata', err);
      }

      // Reflect the uploads back into state so previews keep working
      setUploadedImages(persistedImages.map((m) => ({
        file: null,
        roomType: m.roomType,
        persisted: { url: m.url, path: m.path, name: m.name, type: m.type },
      })));
      if (fp) {
        setPersistedFloorPlan(fp);
        setFloorPlanFile(null);
      }
      return true;
    } catch (err) {
      console.error('Error preparing pending listing:', err);
      toast({
        title: 'Upload failed',
        description: 'Could not save your media for confirmation. Please try again.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsPreparingConfirm(false);
    }
  };

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
    const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
    const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];
    const MAX_IMAGE_BYTES = 15 * 1024 * 1024; // 15 MB
    const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100 MB

    const accepted: UploadedImage[] = [];
    const rejected: string[] = [];

    for (const file of files) {
      const isImage = file.type.startsWith('image/');
      const isVideo = file.type.startsWith('video/');
      if (!isImage && !isVideo) {
        rejected.push(`${file.name}: unsupported format`);
        continue;
      }
      if (isImage && !ALLOWED_IMAGE_TYPES.includes(file.type)) {
        rejected.push(`${file.name}: image must be JPG, PNG, WEBP or HEIC`);
        continue;
      }
      if (isVideo && !ALLOWED_VIDEO_TYPES.includes(file.type)) {
        rejected.push(`${file.name}: video must be MP4, MOV or WEBM`);
        continue;
      }
      if (isImage && file.size > MAX_IMAGE_BYTES) {
        rejected.push(`${file.name}: image exceeds 15MB`);
        continue;
      }
      if (isVideo && file.size > MAX_VIDEO_BYTES) {
        rejected.push(`${file.name}: video exceeds 100MB`);
        continue;
      }
      accepted.push({ file, roomType: '' });
    }

    if (rejected.length) {
      toast({
        title: 'Some files were skipped',
        description: rejected.join('\n'),
        variant: 'destructive',
      });
    }
    if (accepted.length) {
      setUploadedImages(prev => [...prev, ...accepted]);
    }
    // Reset input so re-selecting same file works
    event.target.value = '';
  };

  const updateImageRoomType = (index: number, roomType: string) => {
    setUploadedImages(prev => prev.map((img, i) => 
      i === index ? { ...img, roomType } : img
    ));
  };

  const removeFile = (index: number) => {
    setUploadedImages(prev => {
      const target = prev[index];
      // If the file was already uploaded to the pending area, delete it from storage.
      if (target?.persisted?.path) {
        supabase.storage.from('property-images').remove([target.persisted.path]).catch((err) => {
          console.error('Failed to remove persisted media', err);
        });
      }
      const next = prev.filter((_, i) => i !== index);
      // Keep localStorage in sync if a pending listing is being held
      try {
        const raw = localStorage.getItem(PENDING_STORAGE_KEY);
        if (raw) {
          const saved = JSON.parse(raw) as PendingListingPayload;
          saved.images = next
            .filter((img) => img.persisted)
            .map((img) => ({ ...(img.persisted as PersistedFloorPlan), roomType: img.roomType }));
          localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(saved));
        }
      } catch (err) {
        console.error('Failed to update pending listing after removal', err);
      }
      return next;
    });
  };

  const removeFloorPlan = () => {
    if (persistedFloorPlan?.path) {
      supabase.storage.from('property-images').remove([persistedFloorPlan.path]).catch((err) => {
        console.error('Failed to remove persisted floor plan', err);
      });
    }
    setPersistedFloorPlan(null);
    setFloorPlanFile(null);
    try {
      const raw = localStorage.getItem(PENDING_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as PendingListingPayload;
        saved.floorPlan = null;
        localStorage.setItem(PENDING_STORAGE_KEY, JSON.stringify(saved));
      }
    } catch (err) {
      console.error('Failed to update pending listing after floor plan removal', err);
    }
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
      let floorPlanUrl: string | null = null;

      // Use already-uploaded floor plan (from pending persistence) if present
      if (persistedFloorPlan) {
        floorPlanUrl = persistedFloorPlan.url;
      } else if (floorPlanFile) {
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

      // Upload images to Supabase storage (skip ones already persisted to pending area)
      if (uploadedImages.length > 0) {
        const uploadPromises = uploadedImages.map(async (uploadedImage, index) => {
          if (uploadedImage.persisted) {
            return uploadedImage.persisted.url;
          }
          const file = uploadedImage.file;
          if (!file) return null;
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

          const { data: { publicUrl } } = supabase.storage
            .from('property-images')
            .getPublicUrl(fileName);

          return publicUrl;
        });

        const results = await Promise.all(uploadPromises);
        imageUrls = results.filter((u): u is string => !!u);
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
        price: data.price ? parseFloat(data.price) : null,
        rental_price: data.rentalPrice ? parseFloat(data.rentalPrice) : null,
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
        status: 'pending'
      }).select('id').single();

      if (error) throw error;

      // Record broker agreement for legal purposes
      const agreementText = "By listing this property, I agree that Rumi will act as my exclusive real estate broker, providing the full service of managing the property — including marketing, conducting viewings, and meeting with prospective buyers and renters on my behalf. I agree that upon a successful sale Rumi will receive a commission of 2.5% from the seller, and in the case of a rental agreement, a commission equal to one month's rent. I have read and agree to the full Terms of Service.";
      
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
      setFloorPlanFile(null);
      setPersistedFloorPlan(null);
      // Pending listing has been consumed — clear localStorage marker
      clearPendingPersistence();
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
          <form
            onSubmit={form.handleSubmit(async (data) => {
              const role = profile?.role;
              const isClient = !role || role === "user";
              if (isClient) {
                // Validate room types before uploading anything
                const unassigned = uploadedImages.filter(img => !img.roomType);
                if (unassigned.length > 0) {
                  toast({
                    title: "Room Types Required",
                    description: "Please select a room type for all uploaded images.",
                    variant: "destructive"
                  });
                  return;
                }
                const ok = await persistPendingListing(data);
                if (!ok) return;
                setPendingData(data);
                setShowClientConfirm(true);
                return;
              }
              onSubmit(data);
            })}
            className="space-y-8"
          >
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

                  <FormField control={form.control} name="description" render={({
                   field
                }) => <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Describe the property and its ambience..." {...field} />
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

            {/* Listing Type - shown before property details */}
            <Card>
              <CardHeader>
                <CardTitle>Listing Type</CardTitle>
              </CardHeader>
              <CardContent>
                <FormField control={form.control} name="listingType" render={({ field }) => (
                  <FormItem className="space-y-3">
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
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="both" id="both" />
                          <Label htmlFor="both">Both (Rent & Sale)</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <div className="space-y-8">
              {/* Property Details */}
              <Card>
                <CardHeader>
                  <CardTitle>Property Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
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

                  <FormField control={form.control} name="priceNegotiable" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer">Price is negotiable</FormLabel>
                      </div>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="unfurnished" render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                      <FormControl>
                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                      <div className="space-y-1 leading-none">
                        <FormLabel className="cursor-pointer">Property is unfurnished</FormLabel>
                        <p className="text-xs text-muted-foreground">
                          Check this if the property does not include furniture
                        </p>
                      </div>
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="metersSquared" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Meters Squared (m²)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="Enter size in m²" {...field} />
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
                            <SelectValue placeholder="Select bedrooms" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                            <SelectItem key={num} value={num.toString()}>
                              {num} {num === 1 ? 'Bedroom' : 'Bedrooms'}
                            </SelectItem>
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
                        <Input type="number" step="0.5" min="0.5" placeholder="e.g. 2 or 1.5" {...field} />
                      </FormControl>
                      <p className="text-xs text-muted-foreground mt-1">
                        Use .5 for half baths (toilet only, no shower)
                      </p>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="yearBuilt" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Year of Construction (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 2010" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="lastRenovated" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Last Renovation (Optional)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g. 2020" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

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
                </CardContent>
              </Card>
            </div>

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
                    <Input id="file-upload" type="file" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime,video/webm" onChange={handleFileUpload} className="hidden" />
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
                            {(() => {
                              const previewUrl = getPreviewUrl(uploadedImage);
                              const mediaType = getMediaType(uploadedImage);
                              if (previewUrl && mediaType.startsWith('image/')) {
                                return (
                                  <img
                                    src={previewUrl}
                                    alt="Preview"
                                    className="w-full h-full object-cover rounded"
                                  />
                                );
                              }
                              if (previewUrl && mediaType.startsWith('video/')) {
                                return (
                                  <video
                                    src={previewUrl}
                                    className="w-full h-full object-cover rounded"
                                    muted
                                  />
                                );
                              }
                              return <Upload className="w-6 h-6 text-muted-foreground" />;
                            })()}
                          </div>
                          <div className="min-w-0 flex-1">
                            <span className="text-sm font-medium truncate block">{getMediaName(uploadedImage)}</span>
                            {getMediaSizeMB(uploadedImage) ? (
                              <p className="text-xs text-muted-foreground">{getMediaSizeMB(uploadedImage)} MB</p>
                            ) : (
                              <p className="text-xs text-muted-foreground">Saved</p>
                            )}
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

            {/* Floor Plan Upload */}
            <Card>
              <CardHeader>
                <CardTitle>Floor Plan (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                  <Label htmlFor="floor-plan-upload" className="cursor-pointer">
                    <span className="text-primary hover:text-primary/80">Click to upload floor plan</span>
                  </Label>
                  <Input
                    id="floor-plan-upload"
                    type="file"
                     accept="image/jpeg,image/png,image/webp"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
                      const MAX_BYTES = 10 * 1024 * 1024; // 10 MB
                      if (!ALLOWED.includes(file.type)) {
                        toast({
                          title: 'Unsupported floor plan format',
                          description: 'Please upload a PNG, JPG or WEBP image.',
                          variant: 'destructive',
                        });
                        e.target.value = '';
                        return;
                      }
                      if (file.size > MAX_BYTES) {
                        toast({
                          title: 'Floor plan too large',
                          description: 'Maximum size is 10MB.',
                          variant: 'destructive',
                        });
                        e.target.value = '';
                        return;
                      }
                      setFloorPlanFile(file);
                    }}
                    className="hidden"
                  />
                  <p className="text-sm text-muted-foreground mt-1">PNG, JPG up to 10MB</p>
                </div>
                {(floorPlanFile || persistedFloorPlan) && (
                  <div className="mt-3 flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-16 h-16 bg-background rounded overflow-hidden">
                        <img
                          src={floorPlanFile ? URL.createObjectURL(floorPlanFile) : persistedFloorPlan!.url}
                          alt="Floor plan preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-sm font-medium truncate">
                        {floorPlanFile?.name || persistedFloorPlan?.name}
                      </span>
                    </div>
                    <Button type="button" variant="ghost" size="sm" onClick={removeFloorPlan} className="text-destructive">
                      Remove
                    </Button>
                  </div>
                )}
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
                          By listing this property, I agree that Rumi will act as my exclusive real estate broker
                          and provide the full service of managing the property — including marketing,
                          conducting viewings, and meeting with prospective buyers and renters on my behalf.
                          Upon a successful sale, Rumi receives a commission of <strong>2.5% from the seller</strong>;
                          in the case of a rental agreement, the commission is <strong>one month's rent</strong>.{" "}
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
              <Button type="submit" size="lg" className="px-8" disabled={isSubmitting || isPreparingConfirm}>
                {isPreparingConfirm ? "Preparing..." : isSubmitting ? "Submitting..." : "List Property"}
              </Button>
            </div>
          </form>
        </Form>

        <AlertDialog
          open={showClientConfirm}
          onOpenChange={(open) => {
            // Block closing while a submission is in flight
            if (!open && isSubmitting) return;
            setShowClientConfirm(open);
            if (!open) {
              // Treat any close as a cancellation: purge persisted media
              const imgs = uploadedImages
                .filter((i) => i.persisted)
                .map((i) => ({ path: i.persisted!.path }));
              purgePersistedMedia(imgs, persistedFloorPlan);
              setUploadedImages((prev) => prev.filter((i) => !i.persisted));
              setPersistedFloorPlan(null);
              setPendingData(null);
              clearPendingPersistence();
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Rumi Full-Service Listing</AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    By confirming this listing, you agree that <strong>Rumi</strong> will provide the
                    full service of managing your property. This includes marketing the listing,
                    <strong> conducting all viewings</strong>, and meeting with prospective buyers and renters
                    on your behalf.
                  </p>
                  <p>
                    Upon a successful transaction, Rumi will receive:
                  </p>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>2.5% commission</strong> from the seller in the event of a sale.</li>
                    <li><strong>One month's rent</strong> in the event of a rental agreement.</li>
                  </ul>
                  <p>Do you agree to these terms and wish to submit your listing?</p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSubmitting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={isSubmitting}
                onClick={(e) => {
                  e.preventDefault();
                  if (pendingData) {
                    const data = pendingData;
                    setPendingData(null);
                    // Note: we don't clear localStorage here — onSubmit will
                    // do it on success. This way a mid-submit refresh can
                    // still recover the pending listing.
                    setShowClientConfirm(false);
                    onSubmit(data);
                  }
                }}
              >
                Agree & Submit
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>;
};
export default ListProperty;