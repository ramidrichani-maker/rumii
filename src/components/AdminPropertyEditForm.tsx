import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  municipality: z.string().optional(),
  property_type: z.string().min(1, "Property type is required"),
  listing_type: z.enum(["rent", "sale", "both"]),
  price: z.coerce.number().min(0).optional(),
  rental_price: z.coerce.number().min(0).optional(),
  square_meters: z.coerce.number().min(1, "Size is required"),
  bedrooms: z.coerce.number().min(0),
  bathrooms: z.coerce.number().min(0),
  year_built: z.coerce.number().optional(),
  last_renovated: z.coerce.number().optional(),
  price_negotiable: z.boolean().optional(),
  unfurnished: z.boolean(),
  status: z.enum(["pending", "approved", "rejected"]),
  amenities: z.array(z.string()).optional(),
  description: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface Agency {
  id: string;
  name: string;
}

interface Property {
  id: string;
  address: string;
  city: string;
  municipality: string | null;
  property_type: string;
  listing_type: "rent" | "sale" | "both";
  price: number | null;
  square_meters: number;
  bedrooms: number;
  bathrooms: number;
  status: "pending" | "approved" | "rejected";
  user_id: string;
  agency_id: string | null;
  amenities: string[] | null;
  year_built: number | null;
  last_renovated: number | null;
  price_negotiable: boolean | null;
  unfurnished: boolean;
  description?: string | null;
}

interface AdminPropertyEditFormProps {
  property: Property;
  onSuccess: () => void;
  onCancel: () => void;
}

const PROPERTY_TYPES = [
  "apartment", "house", "studio", "villa", "penthouse", "townhouse", "duplex", "loft"
];

const AMENITIES = [
  "Garden", "Parking/Garage", "Balcony/Terrace", "Swimming Pool", "Gym", "Elevator",
  "Storage Room", "Security", "Concierge", "EV Charging", "Patio", "Basement",
  "Sea View", "Mountain View", "Fireplace", "Smart-home"
];

export const AdminPropertyEditForm = ({ property, onSuccess, onCancel }: AdminPropertyEditFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [selectedAgency, setSelectedAgency] = useState<string | null>(property.agency_id);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>(property.amenities || []);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      address: property.address,
      city: property.city,
      municipality: property.municipality || "",
      property_type: property.property_type,
      listing_type: property.listing_type as "rent" | "sale" | "both",
      price: property.price || undefined,
      rental_price: (property as any).rental_price || undefined,
      square_meters: property.square_meters,
      bedrooms: property.bedrooms,
      bathrooms: property.bathrooms,
      year_built: property.year_built || undefined,
      last_renovated: property.last_renovated || undefined,
      price_negotiable: property.price_negotiable || false,
      unfurnished: property.unfurnished,
      status: property.status as "pending" | "approved" | "rejected",
      amenities: property.amenities || [],
      description: property.description || "",
    },
  });

  const editListingType = form.watch('listing_type');

  useEffect(() => {
    const fetchAgencies = async () => {
      const { data } = await supabase
        .from('agencies')
        .select('id, name')
        .order('name');
      if (data) setAgencies(data);
    };
    fetchAgencies();
  }, []);

  const handleAmenityToggle = (amenity: string) => {
    setSelectedAmenities(prev => {
      const updated = prev.includes(amenity)
        ? prev.filter(a => a !== amenity)
        : [...prev, amenity];
      form.setValue('amenities', updated);
      return updated;
    });
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const updateData: any = {
        address: data.address,
        city: data.city,
        municipality: data.municipality || null,
        property_type: data.property_type,
        listing_type: data.listing_type,
        price: data.price || null,
        rental_price: data.rental_price || null,
        square_meters: data.square_meters,
        bedrooms: data.bedrooms,
        bathrooms: data.bathrooms,
        year_built: data.year_built || null,
        last_renovated: data.last_renovated || null,
        price_negotiable: data.price_negotiable || false,
        unfurnished: data.unfurnished,
        status: data.status,
        amenities: selectedAmenities,
        description: data.description || null,
        agency_id: selectedAgency,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('properties')
        .update(updateData)
        .eq('id', property.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Property updated successfully",
      });

      onSuccess();
    } catch (error) {
      console.error('Error updating property:', error);
      toast({
        title: "Error",
        description: "Failed to update property",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Status and Agency */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-2">
            <Label>Agency</Label>
            <Select value={selectedAgency || "none"} onValueChange={(v) => setSelectedAgency(v === "none" ? null : v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select agency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Agency</SelectItem>
                {agencies.map((agency) => (
                  <SelectItem key={agency.id} value={agency.id}>
                    {agency.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Address</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>City</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="municipality"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Municipality</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="property_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Property Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PROPERTY_TYPES.map((type) => (
                      <SelectItem key={type} value={type} className="capitalize">
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Listing Type and Price */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="listing_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Listing Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="rent">For Rent</SelectItem>
                    <SelectItem value="sale">For Sale</SelectItem>
                    <SelectItem value="both">Both (Rent & Sale)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          {(editListingType === 'sale' || editListingType === 'both') && (
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Property Price ($)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          {(editListingType === 'rent' || editListingType === 'both') && (
            <FormField
              control={form.control}
              name="rental_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Monthly Rental Price ($)</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="price_negotiable"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 pt-8">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0">Price Negotiable</FormLabel>
              </FormItem>
            )}
          />
        </div>

        {/* Property Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <FormField
            control={form.control}
            name="square_meters"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Size (m²)</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bedrooms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bedrooms</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="bathrooms"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Bathrooms</FormLabel>
                <FormControl>
                  <Input type="number" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="unfurnished"
            render={({ field }) => (
              <FormItem className="flex items-center gap-2 pt-8">
                <FormControl>
                  <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
                <FormLabel className="!mt-0">Unfurnished</FormLabel>
              </FormItem>
            )}
          />
        </div>

        {/* Year Built and Renovated */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="year_built"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Year Built</FormLabel>
                <FormControl>
                  <Input type="number" {...field} placeholder="e.g., 2020" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="last_renovated"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Last Renovated</FormLabel>
                <FormControl>
                  <Input type="number" {...field} placeholder="e.g., 2023" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Amenities */}
        <div className="space-y-2">
          <Label>Amenities</Label>
          <div className="flex flex-wrap gap-2">
            {AMENITIES.map((amenity) => (
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
        </div>

        {/* Description */}
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  placeholder="Describe the property's ambience, features, and highlights..."
                  className="min-h-[140px] resize-y"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </div>
      </form>
    </Form>
  );
};
