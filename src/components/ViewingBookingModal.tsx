import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Calendar as CalendarIcon } from "lucide-react";
import { format, addDays, isSameDay, isBefore, startOfToday } from "date-fns";
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

  // Generate time slots from 10 AM to 4 PM (1-hour intervals)
  const timeSlots = [
    "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"
  ];

  const formatTimeSlot = (time: string) => {
    const [hours] = time.split(':');
    const hour = parseInt(hours);
    if (hour === 12) return `${hour}:00 PM`;
    return hour > 12 ? `${hour - 12}:00 PM` : `${hour}:00 AM`;
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

    setLoading(true);

    try {
      // Check if the time slot is already booked
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

      // Create the viewing request
      const { error: insertError } = await supabase
        .from('property_viewings')
        .insert({
          property_id: property.id,
          user_id: user.id,
          viewing_date: format(selectedDate, 'yyyy-MM-dd'),
          viewing_time: selectedTime,
          status: 'pending'
        });

      if (insertError) throw insertError;

      toast({
        title: "Viewing Requested!",
        description: "Your viewing request has been submitted. You'll receive a notification once it's confirmed.",
      });

      onClose();
      setSelectedDate(undefined);
      setSelectedTime("");

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

  // Disable past dates and dates more than 30 days in the future
  const isDateDisabled = (date: Date) => {
    const today = startOfToday();
    const maxDate = addDays(today, 30);
    return isBefore(date, today) || isBefore(maxDate, date);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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
                  <Card 
                    key={time} 
                    className={`cursor-pointer transition-colors ${
                      selectedTime === time 
                        ? 'border-primary bg-primary/10' 
                        : 'hover:border-primary/50'
                    }`}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setSelectedTime(time);
                    }}
                  >
                    <CardContent className="p-3 text-center">
                      <span className="font-medium">{formatTimeSlot(time)}</span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                Please select a date first to see available time slots
              </p>
            )}
          </div>
        </div>

        {/* Summary and Action */}
        {selectedDate && selectedTime && (
          <div className="border-t pt-4">
            <div className="bg-muted p-4 rounded-lg mb-4">
              <h4 className="font-semibold mb-2">Viewing Summary</h4>
              <p><strong>Property:</strong> {property.address}</p>
              <p><strong>Date:</strong> {format(selectedDate, 'EEEE, MMMM do, yyyy')}</p>
              <p><strong>Time:</strong> {formatTimeSlot(selectedTime)}</p>
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t pt-4">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleBookViewing}
            disabled={!selectedDate || !selectedTime || loading}
            className="min-w-[120px]"
          >
            {loading ? "Booking..." : "Request Viewing"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewingBookingModal;