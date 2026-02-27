import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Calendar as CalendarIcon } from "lucide-react";
import { format, addDays, isBefore, startOfToday } from "date-fns";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ViewingBookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  property: {
    id: string;
    address: string;
    property_type: string;
    price: number;
    listing_type: string;
  };
}

const ViewingBookingModal = ({ isOpen, onClose, property }: ViewingBookingModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [confirmByEmail, setConfirmByEmail] = useState(false);
  const [confirmByPhone, setConfirmByPhone] = useState(false);

  const timeSlots = [
    "08:30", "09:30", "10:30", "11:30", "12:30", "13:30", "14:30", "15:30", "16:30", "17:30", "18:30", "19:30"
  ];

  const formatTimeSlot = (time: string) => {
    const [hours, mins] = time.split(':');
    const hour = parseInt(hours);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${mins} ${suffix}`;
  };

  const handleBookViewing = async () => {
    if (!selectedDate || !selectedTime || !user) {
      toast({
        title: "Missing Information",
        description: "Please select both date and time for your viewing",
        variant: "destructive"
      });
      return;
    }

    if (!confirmByEmail && !confirmByPhone) {
      toast({
        title: "Missing Confirmation Method",
        description: "Please select at least one confirmation method",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);

    try {
      const { data: existingBooking, error: checkError } = await supabase
        .from('property_viewings')
        .select('id')
        .eq('property_id', property.id)
        .eq('viewing_date', format(selectedDate, 'yyyy-MM-dd'))
        .eq('viewing_time', selectedTime)
        .eq('status', 'confirmed')
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingBooking) {
        toast({
          title: "Time Slot Unavailable",
          description: "This time slot is already booked. Please select another time.",
          variant: "destructive"
        });
        return;
      }

      const confirmMethods = [];
      if (confirmByEmail) confirmMethods.push('email');
      if (confirmByPhone) confirmMethods.push('phone');

      const { error: insertError } = await supabase
        .from('property_viewings')
        .insert({
          property_id: property.id,
          user_id: user.id,
          viewing_date: format(selectedDate, 'yyyy-MM-dd'),
          viewing_time: selectedTime,
          status: 'pending',
          notes: `Confirmation preference: ${confirmMethods.join(', ')}`
        });

      if (insertError) throw insertError;

      toast({
        title: "Viewing Requested!",
        description: "Your viewing request has been submitted. You'll receive a notification once it's confirmed.",
      });

      onClose();
      setSelectedDate(undefined);
      setSelectedTime("");
      setConfirmByEmail(false);
      setConfirmByPhone(false);

    } catch (error) {
      console.error('Error booking viewing:', error);
      toast({
        title: "Booking Failed",
        description: "There was an error submitting your viewing request. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, listingType: string) => {
    const formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
    return `${formatter.format(price)}${listingType === 'rent' ? '/mo' : ''}`;
  };

  const isDateDisabled = (date: Date) => {
    const today = startOfToday();
    const maxDate = addDays(today, 30);
    return isBefore(date, today) || isBefore(maxDate, date);
  };

  const hasConfirmation = confirmByEmail || confirmByPhone;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>Book a Property Viewing</DialogTitle>
          <DialogDescription>
            Schedule a viewing for {property.address} • {formatPrice(property.price, property.listing_type)}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
          {/* Date Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Select Date
            </h3>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              disabled={isDateDisabled}
              className="rounded-md border"
            />
          </div>

          {/* Time Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Select Time
            </h3>
            {selectedDate ? (
              <div className="grid grid-cols-2 gap-2">
                {timeSlots.map((time) => (
                  <button
                    key={time}
                    type="button"
                    className={`p-3 text-center font-medium rounded-lg border transition-colors ${
                      selectedTime === time
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedTime(time);
                    }}
                  >
                    {formatTimeSlot(time)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Please select a date first to see available time slots
              </p>
            )}
          </div>
        </div>

        {/* Summary, Confirmation Options & Action */}
        {selectedDate && selectedTime && (
          <div className="border-t pt-4 space-y-4">
            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Viewing Summary</h4>
              <p><strong>Property:</strong> {property.address}</p>
              <p><strong>Date:</strong> {format(selectedDate, 'EEEE, MMMM do, yyyy')}</p>
              <p><strong>Time:</strong> {formatTimeSlot(selectedTime)}</p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">How would you like to receive confirmation? <span className="text-destructive">*</span></p>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={confirmByEmail}
                    onCheckedChange={(checked) => setConfirmByEmail(checked === true)}
                  />
                  <span className="text-sm">Receive confirmation by email</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={confirmByPhone}
                    onCheckedChange={(checked) => setConfirmByPhone(checked === true)}
                  />
                  <span className="text-sm">Receive confirmation by phone call</span>
                </label>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleBookViewing}
            disabled={!selectedDate || !selectedTime || !hasConfirmation || loading}
            className="min-w-[120px]"
          >
            {loading ? "Booking..." : "Confirm Viewing"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewingBookingModal;
