import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ArrowLeft, Sofa, CalendarIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";

const propertyTypes = ["Apartment", "Villa", "Beach House", "Chalet", "Duplex", "Triplex", "Penthouse", "Commercial", "Farm House", "Building", "Venue", "Studio", "Rooftop"];

const timeSlots = [
  "09:00 AM", "10:00 AM", "11:00 AM", "12:00 PM",
  "01:00 PM", "02:00 PM", "03:00 PM", "04:00 PM", "05:00 PM",
];

const formSchema = z.object({
  fullName: z.string().min(2, "Full name is required"),
  phoneNumber: z.string().min(8, "Valid phone number is required"),
  email: z.string().email("Valid email is required"),
  propertyAddress: z.string().min(5, "Full address is required"),
  city: z.string().min(2, "City is required"),
  municipality: z.string().optional(),
  propertyType: z.string().min(1, "Property type is required"),
  propertySizeSqm: z.string().optional(),
  roomsCount: z.string().optional(),
  preferredDate: z.date({ required_error: "Please pick a date" }),
  preferredTime: z.string().min(1, "Please pick a time"),
  notes: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

export default function RequestInteriorDesign() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      fullName: profile?.full_name || "",
      phoneNumber: profile?.phone_number || "",
      email: user?.email || "",
      preferredTime: "",
    },
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Sign In Required</CardTitle>
            <CardDescription>Please sign in to request an interior design visit.</CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/auth"><Button className="w-full">Sign In</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("interior_design_requests").insert({
        user_id: user.id,
        full_name: data.fullName,
        phone_number: data.phoneNumber,
        email: data.email,
        property_address: data.propertyAddress,
        city: data.city,
        municipality: data.municipality || null,
        property_type: data.propertyType,
        property_size_sqm: data.propertySizeSqm ? parseInt(data.propertySizeSqm) : null,
        rooms_count: data.roomsCount ? parseInt(data.roomsCount) : null,
        preferred_date: format(data.preferredDate, "yyyy-MM-dd"),
        preferred_time: data.preferredTime,
        notes: data.notes || null,
        status: "pending",
      });
      if (error) throw error;

      toast({
        title: "Request submitted!",
        description: "Our interior design team will confirm or propose a new time shortly.",
      });
      navigate("/");
    } catch (error) {
      console.error("Error submitting interior design request:", error);
      toast({ title: "Error", description: "Failed to submit request. Please try again.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <Sofa className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Request Interior Design Visit</h1>
          </div>
          <p className="text-muted-foreground mt-2">
            Pick a date and time of day for our interior designer's first visit to see your property.
          </p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader><CardTitle>Contact Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="fullName" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl><Input placeholder="Enter your full name" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="phoneNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl><Input placeholder="+961 XX XXX XXX" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl><Input type="email" placeholder="your@email.com" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Property Information</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="propertyAddress" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Property Address</FormLabel>
                    <FormControl><Textarea placeholder="Enter the full address of the property" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem>
                      <FormLabel>City</FormLabel>
                      <FormControl><Input placeholder="City" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="municipality" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Governorate (Optional)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select governorate" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {["Beirut","Mount Lebanon","North Lebanon","South Lebanon","Bekaa","Nabatiyeh","Baalbek-Hermel","Akkar"].map((g) => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="propertyType" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Property Type</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {propertyTypes.map((t) => (
                            <SelectItem key={t} value={t.toLowerCase()}>{t}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="propertySizeSqm" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Size (m²) - Optional</FormLabel>
                      <FormControl><Input type="number" placeholder="e.g. 150" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="roomsCount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Rooms - Optional</FormLabel>
                      <FormControl><Input type="number" placeholder="e.g. 4" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>First Visit Schedule</CardTitle>
                <CardDescription>Choose the date and time of day for the designer's first visit</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="preferredDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Preferred Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button variant="outline" className={cn("w-full pl-3 text-left font-normal", !field.value && "text-muted-foreground")}>
                              {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date < new Date() || date > addDays(new Date(), 60)}
                            initialFocus
                            className={cn("p-3 pointer-events-auto")}
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="preferredTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Preferred Time</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select time" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {timeSlots.map((slot) => (<SelectItem key={slot} value={slot}>{slot}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (Optional)</FormLabel>
                    <FormControl><Textarea placeholder="Anything the designer should know before the visit" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Submitting..." : "Submit Request"}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  );
}
