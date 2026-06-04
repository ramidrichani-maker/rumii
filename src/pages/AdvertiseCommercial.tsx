import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Building2, Loader2 } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  full_name: z.string().trim().min(1, "Name required").max(120),
  email: z.string().trim().email("Invalid email").max(255),
  phone_number: z.string().trim().min(4, "Phone required").max(40),
  property_type: z.string().min(1, "Required"),
  listing_type: z.string().min(1, "Required"),
  address: z.string().trim().min(1, "Address required").max(255),
  city: z.string().trim().max(120).optional().or(z.literal("")),
  municipality: z.string().trim().max(120).optional().or(z.literal("")),
  size_sqm: z.string().optional().or(z.literal("")),
  price: z.string().optional().or(z.literal("")),
  description: z.string().max(2000).optional().or(z.literal("")),
});

export default function AdvertiseCommercial() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    phone_number: "",
    property_type: "office",
    listing_type: "sale",
    address: "",
    city: "",
    municipality: "",
    size_sqm: "",
    price: "",
    description: "",
  });

  useEffect(() => {
    if (profile) {
      setForm((f) => ({
        ...f,
        full_name: f.full_name || profile.full_name || "",
        phone_number: f.phone_number || profile.phone_number || "",
      }));
    }
    if (user?.email && !form.email) {
      setForm((f) => ({ ...f, email: user.email || "" }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, user]);

  if (loading) return null;
  if (!user) {
    navigate("/auth");
    return null;
  }

  const update = (k: keyof typeof form, v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse(form);
    if (!parsed.success) {
      const first = Object.values(parsed.error.flatten().fieldErrors)[0]?.[0];
      toast({ title: "Please check the form", description: first || "Invalid input", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("commercial_advertisements").insert({
        user_id: user.id,
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone_number: form.phone_number.trim(),
        property_type: form.property_type,
        listing_type: form.listing_type,
        address: form.address.trim(),
        city: form.city.trim() || null,
        municipality: form.municipality.trim() || null,
        size_sqm: form.size_sqm ? Number(form.size_sqm) : null,
        price: form.price ? Number(form.price) : null,
        description: form.description.trim() || null,
      });
      if (error) throw error;
      toast({
        title: "Request submitted",
        description: "Your commercial advertisement request has been sent. We'll be in touch shortly.",
      });
      navigate("/");
    } catch (err: any) {
      console.error(err);
      toast({ title: "Error", description: err.message || "Failed to submit", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-8">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Advertise Commercial Property
          </CardTitle>
          <CardDescription>
            Tell us about your commercial property and we'll get it listed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input value={form.full_name} onChange={(e) => update("full_name", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => update("email", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input value={form.phone_number} onChange={(e) => update("phone_number", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Listing Type</Label>
                <Select value={form.listing_type} onValueChange={(v) => update("listing_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">For Sale</SelectItem>
                    <SelectItem value="rent">For Rent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Property Type</Label>
                <Select value={form.property_type} onValueChange={(v) => update("property_type", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="office">Office</SelectItem>
                    <SelectItem value="retail">Retail / Shop</SelectItem>
                    <SelectItem value="warehouse">Warehouse</SelectItem>
                    <SelectItem value="industrial">Industrial</SelectItem>
                    <SelectItem value="restaurant">Restaurant / Catering</SelectItem>
                    <SelectItem value="hotel">Hotel</SelectItem>
                    <SelectItem value="land">Commercial Land</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Address</Label>
                <Input value={form.address} onChange={(e) => update("address", e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input value={form.city} onChange={(e) => update("city", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Municipality</Label>
                <Input value={form.municipality} onChange={(e) => update("municipality", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Size (sqm)</Label>
                <Input type="number" min="0" value={form.size_sqm} onChange={(e) => update("size_sqm", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Asking Price (EUR)</Label>
                <Input type="number" min="0" value={form.price} onChange={(e) => update("price", e.target.value)} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Description / Additional Info</Label>
                <Textarea rows={4} value={form.description} onChange={(e) => update("description", e.target.value)} />
              </div>
            </div>
            <Button type="submit" disabled={submitting} className="w-full">
              {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Advertisement Request
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}