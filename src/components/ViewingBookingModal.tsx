import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Clock, Calendar as CalendarIcon, Mail, Phone } from "lucide-react";
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
  agencyId?: string | null;
}

const ViewingBookingModal = ({ isOpen, onClose, property, agencyId }: ViewingBookingModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>();
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [confirmByEmail, setConfirmByEmail] = useState(false);
  const [confirmByPhone, setConfirmByPhone] = useState(false);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [busySlots, setBusySlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [existingBooking, setExistingBooking] = useState(false);
  const [checkingExisting, setCheckingExisting] = useState(false);
  const [isOracleEstates, setIsOracleEstates] = useState<boolean | null>(null);
  const [checkingAgency, setCheckingAgency] = useState(true);

  const timeSlots = [
    "08:30", "09:30", "10:30", "11:30", "12:30", "13:30", "14:30", "15:30", "16:30", "17:30", "18:30", "19:30"
  ];

  // Check if agency is Oracle Estates
  useEffect(() => {
    if (!isOpen) return;
    const checkAgency = async () => {
      setCheckingAgency(true);
      if (!agencyId) {
        setIsOracleEstates(false);
        setCheckingAgency(false);
        return;
      }
      const { data } = await supabase
        .from('agencies')
        .select('name')
        .eq('id', agencyId)
        .single();
      setIsOracleEstates(data?.name?.toLowerCase() === 'oracle estates');
      setCheckingAgency(false);
    };
    checkAgency();
  }, [isOpen, agencyId]);

  // Fetch assigned agent and check for existing booking
  useEffect(() => {
    if (!isOpen || !property.id) return;
    const fetchAgent = async () => {
      const { data } = await supabase
        .from('property_agents')
        .select('agent_id')
        .eq('property_id', property.id)
        .limit(1)
        .maybeSingle();
      setAgentId(data?.agent_id || null);
    };
    const checkExistingBooking = async () => {
      if (!user) return;
      setCheckingExisting(true);
      const { data } = await supabase
        .from('property_viewings')
        .select('id')
        .eq('property_id', property.id)
        .eq('user_id', user.id)
        .in('status', ['pending', 'confirmed'])
        .limit(1)
        .maybeSingle();
      setExistingBooking(!!data);
      setCheckingExisting(false);
    };
    fetchAgent();
    checkExistingBooking();
  }, [isOpen, property.id, user]);

  // Fetch agent's busy slots for selected date
  useEffect(() => {
    if (!selectedDate || !agentId) {
      setBusySlots([]);
      return;
    }
    setSelectedTime("");
    const fetchBusySlots = async () => {
      setLoadingSlots(true);
      try {
        const dateStr = format(selectedDate, 'yyyy-MM-dd');
        const { data } = await supabase
          .from('property_viewings')
          .select('viewing_time')
          .eq('agent_id', agentId)
          .eq('viewing_date', dateStr)
          .in('status', ['confirmed', 'pending']);
        setBusySlots((data || []).map(v => v.viewing_time?.substring(0, 5)));
      } catch {
        setBusySlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchBusySlots();
  }, [selectedDate, agentId]);

  const formatTimeSlot = (time: string) => {
    const [hours, mins] = time.split(':');
    const hour = parseInt(hours);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${mins} ${suffix}`;
  };

  // Simple viewing request for non-Oracle properties
  const handleSimpleRequest = async () => {
    if (!user) {
      toast({ title: "Sign in required", description: "Please sign in to request a viewing", variant: "destructive" });
      return;
    }
    if (!confirmByEmail && !confirmByPhone) {
      toast({ title: "Missing Contact Method", description: "Please select how you'd like to be contacted", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const confirmMethods = [];
      if (confirmByEmail) confirmMethods.push('email');
      if (confirmByPhone) confirmMethods.push('phone');

      const { error } = await supabase
        .from('property_viewings')
        .insert({
          property_id: property.id,
          user_id: user.id,
          viewing_date: format(new Date(), 'yyyy-MM-dd'),
          viewing_time: '00:00',
          status: 'pending',
          notes: `Contact preference: ${confirmMethods.join(', ')} (no date/time selected - external agency)`
        });

      if (error) throw error;

      toast({ title: "Viewing Requested!", description: "Your viewing request has been submitted. The agent will contact you to arrange a date and time." });
      onClose();
      setConfirmByEmail(false);
      setConfirmByPhone(false);
    } catch (error) {
      console.error('Error requesting viewing:', error);
      toast({ title: "Request Failed", description: "There was an error submitting your request. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleBookViewing = async () => {
    if (!selectedDate || !selectedTime || !user) {
      toast({ title: "Missing Information", description: "Please select both date and time for your viewing", variant: "destructive" });
      return;
    }
    if (!confirmByEmail && !confirmByPhone) {
      toast({ title: "Missing Confirmation Method", description: "Please select at least one confirmation method", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const { data: existingSlot, error: checkError } = await supabase
        .from('property_viewings')
        .select('id')
        .eq('property_id', property.id)
        .eq('viewing_date', format(selectedDate, 'yyyy-MM-dd'))
        .eq('viewing_time', selectedTime)
        .eq('status', 'confirmed')
        .maybeSingle();

      if (checkError) throw checkError;
      if (existingSlot) {
        toast({ title: "Time Slot Unavailable", description: "This time slot is already booked. Please select another time.", variant: "destructive" });
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

      toast({ title: "Viewing Requested!", description: "Your viewing request has been submitted. You'll receive a notification once it's confirmed." });
      onClose();
      setSelectedDate(undefined);
      setSelectedTime("");
      setConfirmByEmail(false);
      setConfirmByPhone(false);
    } catch (error) {
      console.error('Error booking viewing:', error);
      toast({ title: "Booking Failed", description: "There was an error submitting your viewing request. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price: number, listingType: string) => {
    const formatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });
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
          <DialogTitle>{isOracleEstates ? 'Book a Property Viewing' : 'Request a Viewing'}</DialogTitle>
          <DialogDescription>
            {isOracleEstates
              ? `Schedule a viewing for ${property.address} • ${formatPrice(property.price, property.listing_type)}`
              : `Request a viewing for ${property.address} • ${formatPrice(property.price, property.listing_type)}`
            }
          </DialogDescription>
        </DialogHeader>

        {(checkingExisting || checkingAgency) ? (
          <p className="text-muted-foreground text-center py-8">Checking availability...</p>
        ) : existingBooking ? (
          <div className="bg-muted p-6 rounded-lg text-center space-y-2 my-4">
            <p className="font-semibold text-foreground">You already have a pending or confirmed viewing for this property.</p>
            <p className="text-sm text-muted-foreground">You can request a new viewing if your current one is declined or cancelled.</p>
            <div className="flex justify-center pt-4">
              <Button variant="outline" onClick={onClose}>Close</Button>
            </div>
          </div>
        ) : !isOracleEstates ? (
          /* Non-Oracle Estates: Simple request with contact preference only */
          <div className="space-y-6 py-4">
            <div className="bg-muted p-4 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                This property is managed by an external agency. Submit a viewing request and the agent will contact you to arrange a suitable date and time.
              </p>
            </div>

            <div className="space-y-3">
              <p className="text-sm font-medium text-foreground">How would you like to be contacted? <span className="text-destructive">*</span></p>
              <div className="flex flex-col gap-2">
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={confirmByEmail}
                    onCheckedChange={(checked) => setConfirmByEmail(checked === true)}
                  />
                  <Mail className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Contact me by email</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors">
                  <Checkbox
                    checked={confirmByPhone}
                    onCheckedChange={(checked) => setConfirmByPhone(checked === true)}
                  />
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">Contact me by phone</span>
                </label>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t pt-4">
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={handleSimpleRequest}
                disabled={!hasConfirmation || loading}
                className="min-w-[120px]"
              >
                {loading ? "Submitting..." : "Request Viewing"}
              </Button>
            </div>
          </div>
        ) : (
          /* Oracle Estates: Full date/time booking */
          <>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-4">
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

              <div className="space-y-4">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Clock className="w-5 h-5" />
                  Select Time
                </h3>
                {selectedDate ? (
                  loadingSlots ? (
                    <p className="text-muted-foreground text-center py-8">Loading available slots...</p>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      {timeSlots.map((time) => {
                        const isBusy = busySlots.includes(time);
                        return (
                          <button
                            key={time}
                            type="button"
                            disabled={isBusy}
                            className={`p-3 text-center font-medium rounded-lg border transition-colors ${
                              isBusy
                                ? 'border-border bg-muted text-muted-foreground opacity-50 cursor-not-allowed line-through'
                                : selectedTime === time
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
                        );
                      })}
                    </div>
                  )
                ) : (
                  <p className="text-muted-foreground text-center py-8">
                    Please select a date first to see available time slots
                  </p>
                )}
              </div>
            </div>

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
              <Button variant="outline" onClick={onClose}>Cancel</Button>
              <Button
                onClick={handleBookViewing}
                disabled={!selectedDate || !selectedTime || !hasConfirmation || loading}
                className="min-w-[120px]"
              >
                {loading ? "Requesting..." : "Request Viewing"}
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ViewingBookingModal;
