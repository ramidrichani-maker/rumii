import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, ClipboardCheck, Loader2 } from "lucide-react";
import { format, isMonday, isTuesday, isWednesday, isThursday, isFriday, isSaturday } from "date-fns";

const propertyTypes = ["apartment", "house", "studio", "villa", "penthouse", "townhouse", "duplex", "loft"];

const timeSlots = [
  "09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"
];

const formatTime = (time: string) => {
  const hour = parseInt(time.split(":")[0]);
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour > 12 ? hour - 12 : hour;
  return `${display}:00 ${suffix}`;
};

const isWeekday = (date: Date) => {
  return isMonday(date) || isTuesday(date) || isWednesday(date) || isThursday(date) || isFriday(date) || isSaturday(date);
};

export default function AgentValuation() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [fullName, setFullName] = useState(profile?.full_name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [phoneNumber, setPhoneNumber] = useState(profile?.phone_number || "");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [city, setCity] = useState("");
  const [municipality, setMunicipality] = useState("");
  const [propertyType, setPropertyType] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [squareMeters, setSquareMeters] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <p className="mb-4">Please sign in to request an agent valuation.</p>
            <Button onClick={() => navigate("/auth")}>Sign In</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName || !email || !phoneNumber || !propertyAddress || !city || !propertyType || !selectedDate || !selectedTime) {
      toast({ title: "Missing fields", description: "Please fill in all required fields.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("valuation_requests" as any).insert({
        user_id: user.id,
        full_name: fullName,
        email,
        phone_number: phoneNumber,
        property_address: propertyAddress,
        city,
        municipality: municipality || null,
        property_type: propertyType,
        bedrooms: bedrooms ? parseInt(bedrooms) : null,
        bathrooms: bathrooms ? parseFloat(bathrooms) : null,
        square_meters: squareMeters ? parseInt(squareMeters) : null,
        preferred_date: format(selectedDate, "yyyy-MM-dd"),
        preferred_time: selectedTime,
        additional_notes: additionalNotes || null,
      } as any);

      if (error) throw error;

      toast({ title: "Request submitted!", description: "Your valuation request has been sent. We'll get back to you soon." });
      navigate("/");
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const today = new Date();
  const maxDate = new Date();
  maxDate.setDate(today.getDate() + 60);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back
        </Button>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <ClipboardCheck className="w-8 h-8 text-primary" />
              <div>
                <CardTitle className="text-2xl">Agent Valuation Request</CardTitle>
                <CardDescription>Enter your property details and pick a convenient time for a professional valuation.</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Contact Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Contact Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <Input value={fullName} onChange={e => setFullName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <Input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <Label>Phone Number *</Label>
                    <Input value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} required />
                  </div>
                </div>
              </div>

              {/* Property Info */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Property Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label>Property Address *</Label>
                    <Input value={propertyAddress} onChange={e => setPropertyAddress(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>City *</Label>
                    <Input value={city} onChange={e => setCity(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Municipality</Label>
                    <Input value={municipality} onChange={e => setMunicipality(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Property Type *</Label>
                    <Select value={propertyType} onValueChange={setPropertyType}>
                      <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
                      <SelectContent>
                        {propertyTypes.map(t => (
                          <SelectItem key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Square Meters</Label>
                    <Input type="number" value={squareMeters} onChange={e => setSquareMeters(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Bedrooms</Label>
                    <Input type="number" value={bedrooms} onChange={e => setBedrooms(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Bathrooms</Label>
                    <Input type="number" value={bathrooms} onChange={e => setBathrooms(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Date & Time */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Preferred Date & Time</h3>
                <p className="text-sm text-muted-foreground">Available Monday – Saturday, 9:00 AM – 6:00 PM</p>
                <div className="flex flex-col md:flex-row gap-6">
                  <div>
                    <Label className="mb-2 block">Select Date *</Label>
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      disabled={(date) => date < today || date > maxDate || !isWeekday(date)}
                      className="rounded-md border pointer-events-auto"
                    />
                  </div>
                  {selectedDate && (
                    <div className="flex-1">
                      <Label className="mb-2 block">Select Time *</Label>
                      <div className="grid grid-cols-2 gap-2">
                        {timeSlots.map(time => (
                          <Button
                            key={time}
                            type="button"
                            variant={selectedTime === time ? "default" : "outline"}
                            size="sm"
                            onClick={() => setSelectedTime(time)}
                          >
                            {formatTime(time)}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label>Additional Notes</Label>
                <Textarea
                  value={additionalNotes}
                  onChange={e => setAdditionalNotes(e.target.value)}
                  placeholder="Any specific requirements or details about the property..."
                  rows={3}
                />
              </div>

              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</> : "Submit Valuation Request"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
