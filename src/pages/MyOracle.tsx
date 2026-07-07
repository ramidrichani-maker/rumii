import { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Loader2, Mail, Heart, Home, PlusCircle, MapPin, ChevronRight, Map, Trash2, HandCoins } from 'lucide-react';
import PropertyDetailModal from '@/components/PropertyDetailModal';
import { useToast } from '@/hooks/use-toast';
import { getViewedProperties } from '@/lib/viewedProperties';
import { ChevronDown } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

interface Enquiry {
  id: string;
  full_name: string;
  email: string;
  message: string | null;
  wants_viewing: boolean;
  created_at: string;
  property_id: string;
  properties: {
    address: string;
    city: string;
    property_type: string;
    images: string[] | null;
    price: number | null;
    rental_price: number | null;
    listing_type: string;
  };
}

interface Property {
  id: string;
  address: string;
  city: string;
  property_type: string;
  images: string[];
  price: number;
  rental_price: number | null;
  listing_type: 'rent' | 'sale' | 'both';
  status: 'pending' | 'approved' | 'rejected';
  bedrooms: number;
  bathrooms: number;
  square_meters: number;
  description?: string | null;
  amenities: string[];
  latitude?: number | null;
  longitude?: number | null;
  municipality?: string;
  year_built?: number;
  floors?: number | null;
  unfurnished?: boolean;
  created_at: string;
  user_id: string;
  agency_id?: string | null;
}

interface SavedArea {
  id: string;
  name: string;
  coordinates: string;
  page: string;
  created_at: string;
}

export default function MyOracle() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const activeSection = searchParams.get('section');
  const { toast } = useToast();
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [favorites, setFavorites] = useState<Property[]>([]);
  const [myPlaces, setMyPlaces] = useState<Property[]>([]);
  const [savedAreas, setSavedAreas] = useState<SavedArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [viewedProps, setViewedProps] = useState<Property[]>([]);
  const [viewedOpen, setViewedOpen] = useState(false);
  const [offersOpen, setOffersOpen] = useState(false);
  const [acceptedOpen, setAcceptedOpen] = useState(false);
  const [offers, setOffers] = useState<any[]>([]);
  const [stcOpen, setStcOpen] = useState(false);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [stcOffer, setStcOffer] = useState<any | null>(null);
  const [stcDate, setStcDate] = useState<string>('');
  const [stcTime, setStcTime] = useState<'morning' | 'afternoon' | 'all_day'>('morning');
  const [submittingStc, setSubmittingStc] = useState(false);
  const [movedInOpen, setMovedInOpen] = useState(false);
  const [moveIns, setMoveIns] = useState<any[]>([]);
  const [confirmingMoveIn, setConfirmingMoveIn] = useState<string | null>(null);
  const [offerProperty, setOfferProperty] = useState<Property | null>(null);
  const [offerType, setOfferType] = useState<'buy' | 'rent'>('buy');
  const [offerAmount, setOfferAmount] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [submittingOffer, setSubmittingOffer] = useState(false);
  const [showAllEnquiries, setShowAllEnquiries] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<'initial' | 'viewed' | 'offers' | 'accepted' | 'stc' | 'movedin'>('initial');
  const initialRef = useRef<HTMLDivElement>(null);
  const viewedRef = useRef<HTMLDivElement>(null);
  const offersRef = useRef<HTMLDivElement>(null);
  const acceptedRef = useRef<HTMLDivElement>(null);
  const stcRef = useRef<HTMLDivElement>(null);
  const movedInRef = useRef<HTMLDivElement>(null);
  
  const [showAllFavorites, setShowAllFavorites] = useState(false);
  const [showAllSavedAreas, setShowAllSavedAreas] = useState(false);
  const [showAllMyPlaces, setShowAllMyPlaces] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (user) {
      Promise.all([fetchEnquiries(), fetchFavorites(), fetchMyPlaces(), fetchSavedAreas(), fetchViewed(), fetchOffers(), fetchMeetings(), fetchMoveIns()]).finally(() => setLoading(false));
    }
  }, [user]);

  const fetchEnquiries = async () => {
    const { data } = await supabase
      .from('property_enquiries')
      .select(`
        id, full_name, email, message, wants_viewing, created_at, property_id,
        properties (address, city, property_type, images, price, rental_price, listing_type)
      `)
      .eq('sender_user_id', user?.id)
      .order('created_at', { ascending: false });
    setEnquiries((data as any) || []);
  };

  const fetchFavorites = async () => {
    const { data: favData } = await supabase
      .from('favorites')
      .select('property_id')
      .eq('user_id', user?.id);
    if (favData && favData.length > 0) {
      const ids = favData.map(f => f.property_id);
      const { data: props } = await supabase
        .from('properties')
        .select('*')
        .in('id', ids);
      setFavorites((props as any) || []);
    }
  };

  const fetchMyPlaces = async () => {
    const { data } = await supabase
      .from('properties')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    setMyPlaces((data as any) || []);
  };

  const fetchSavedAreas = async () => {
    const { data } = await supabase
      .from('saved_search_areas' as any)
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    setSavedAreas((data as any) || []);
  };

  const fetchViewed = async () => {
    const list = getViewedProperties(user?.id);
    if (list.length === 0) { setViewedProps([]); return; }
    const ids = list.map(v => v.id);
    const { data } = await supabase.from('properties').select('*').in('id', ids);
    const byId: Record<string, Property> = {};
    (data as any[] || []).forEach((p) => { byId[p.id] = p; });
    const ordered = ids.map(id => byId[id]).filter(Boolean) as Property[];
    setViewedProps(ordered);
  };

  const fetchOffers = async () => {
    const { data } = await supabase
      .from('property_offers' as any)
      .select('*, properties(address, city, images, listing_type)')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    setOffers((data as any) || []);
  };

  const fetchMeetings = async () => {
    const { data } = await supabase
      .from('contract_meetings' as any)
      .select('*, properties(address, city, images, listing_type)')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    setMeetings((data as any) || []);
  };

  const fetchMoveIns = async () => {
    const { data } = await supabase
      .from('property_move_ins' as any)
      .select('*, properties(address, city, images, listing_type)')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });
    setMoveIns((data as any) || []);
  };

  const confirmMoveIn = async (meeting: any) => {
    if (!user) return;
    setConfirmingMoveIn(meeting.id);
    const { error } = await supabase.from('property_move_ins' as any).insert({
      user_id: user.id,
      property_id: meeting.property_id,
      meeting_id: meeting.id,
    });
    setConfirmingMoveIn(null);
    if (error) {
      toast({ title: 'Failed to confirm', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Move-in confirmed' });
    fetchMoveIns();
  };

  const openStcDialog = (offer: any) => {
    setStcOffer(offer);
    setStcDate('');
    setStcTime('morning');
  };

  const submitStc = async () => {
    if (!stcOffer || !user || !stcDate) {
      toast({ title: 'Pick a day', variant: 'destructive' });
      return;
    }
    setSubmittingStc(true);
    const { error } = await supabase.from('contract_meetings' as any).insert({
      user_id: user.id,
      property_id: stcOffer.property_id,
      offer_id: stcOffer.id,
      meeting_date: stcDate,
      time_preference: stcTime,
    });
    setSubmittingStc(false);
    if (error) {
      toast({ title: 'Failed to request meeting', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Meeting request sent' });
    setStcOffer(null);
    fetchMeetings();
  };

  const next7Days = (() => {
    const days: { iso: string; label: string }[] = [];
    const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const today = new Date();
    for (let i = 0; i < 8; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const label = `${dayNames[d.getDay()]}, ${d.toLocaleDateString(undefined,{month:'short',day:'numeric'})}`;
      days.push({ iso, label });
    }
    return days;
  })();

  const timeLabel = (t: string) => t === 'morning' ? 'Morning' : t === 'afternoon' ? 'Afternoon' : 'All day';

  const enquiryNav = [
    { key: 'initial', label: 'Initial enquiry', ref: initialRef, onOpen: () => {} },
    { key: 'viewed', label: 'Viewed', ref: viewedRef, onOpen: () => viewedProps.length > 0 && setViewedOpen(true), disabled: () => viewedProps.length === 0 },
    { key: 'offers', label: 'Made an offer', ref: offersRef, onOpen: () => offers.length > 0 && setOffersOpen(true), disabled: () => offers.length === 0 },
    { key: 'accepted', label: 'Offer accepted', ref: acceptedRef, onOpen: () => offers.filter(o => o.status === 'accepted').length > 0 && setAcceptedOpen(true), disabled: () => offers.filter(o => o.status === 'accepted').length === 0 },
    { key: 'stc', label: 'Purchased STC', ref: stcRef, onOpen: () => (offers.filter(o => o.status === 'accepted').length > 0 || meetings.length > 0) && setStcOpen(true), disabled: () => offers.filter(o => o.status === 'accepted').length === 0 && meetings.length === 0 },
    { key: 'movedin', label: 'Moved in', ref: movedInRef, onOpen: () => {
        const todayIso = new Date().toISOString().slice(0,10);
        const canOpen = meetings.filter(m => m.meeting_date <= todayIso).length > 0 || moveIns.length > 0;
        if (canOpen) setMovedInOpen(true);
      }, disabled: () => {
        const todayIso = new Date().toISOString().slice(0,10);
        return meetings.filter(m => m.meeting_date <= todayIso).length === 0 && moveIns.length === 0;
      } },
    
  ] as const;

  const handleEnquiryNav = (item: typeof enquiryNav[number]) => {
    if ((item as any).disabled?.()) return;
    setSelectedEnquiry(item.key as any);
    (item as any).onOpen?.();
    setTimeout(() => item.ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const openOfferDialog = (property: Property) => {
    setOfferProperty(property);
    const defaultType: 'buy' | 'rent' = property.listing_type === 'rent' ? 'rent' : 'buy';
    setOfferType(defaultType);
    setOfferAmount('');
    setOfferMessage('');
  };

  const submitOffer = async () => {
    if (!offerProperty || !user) return;
    const amount = parseFloat(offerAmount);
    if (!amount || amount <= 0) {
      toast({ title: 'Enter a valid amount', variant: 'destructive' });
      return;
    }
    setSubmittingOffer(true);
    const { error } = await supabase.from('property_offers' as any).insert({
      user_id: user.id,
      property_id: offerProperty.id,
      offer_type: offerType,
      amount,
      message: offerMessage || null,
    });
    setSubmittingOffer(false);
    if (error) {
      toast({ title: 'Failed to submit offer', description: error.message, variant: 'destructive' });
      return;
    }
    toast({ title: 'Offer submitted' });
    setOfferProperty(null);
    fetchOffers();
  };

  const respondToCounter = async (offer: any, accept: boolean) => {
    if (accept) {
      const { error } = await supabase
        .from('property_offers' as any)
        .update({ status: 'accepted', amount: offer.counter_amount })
        .eq('id', offer.id);
      if (error) {
        toast({ title: 'Failed', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Counter accepted' });
    } else {
      const { error } = await supabase
        .from('property_offers' as any)
        .update({ status: 'rejected' })
        .eq('id', offer.id);
      if (error) {
        toast({ title: 'Failed', description: error.message, variant: 'destructive' });
        return;
      }
      toast({ title: 'Counter rejected' });
    }
    fetchOffers();
  };

  const handleDeleteArea = async (id: string) => {
    await supabase.from('saved_search_areas' as any).delete().eq('id', id);
    setSavedAreas(prev => prev.filter(a => a.id !== id));
    toast({ title: "Area deleted" });
  };

  const formatPrice = (property: { price: number | null; rental_price: number | null; listing_type: string }) => {
    if (property.listing_type === 'rent' && property.rental_price) {
      return `$${property.rental_price.toLocaleString()}/mo`;
    }
    if (property.price) {
      return `$${property.price.toLocaleString()}`;
    }
    return 'Price on request';
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "secondary",
      approved: "default",
      rejected: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className={`py-8 space-y-10 ${activeSection === 'enquiries' || activeSection === 'drawn-areas' ? 'px-4 max-w-none w-full' : 'container mx-auto px-4 max-w-5xl'}`}>
      <h1 className={`text-3xl font-bold text-foreground ${activeSection === 'enquiries' || activeSection === 'drawn-areas' ? 'max-w-none' : ''}`}>
        {activeSection === 'enquiries' ? 'Enquiries' : activeSection === 'drawn-areas' ? 'Drawn areas' : 'My rumi'}
      </h1>

      {/* Enquiries Section */}
      <div className={activeSection === 'enquiries' ? 'grid md:grid-cols-[336px_1fr] gap-6 items-start w-full' : ''}>
        {activeSection === 'enquiries' && (
          <aside className="md:sticky md:top-24 rounded-xl border bg-muted/30 shadow-md overflow-hidden">
            <nav className="flex flex-col">
              {enquiryNav.map((item) => {
                const isDisabled = (item as any).disabled?.() ?? false;
                const isActive = selectedEnquiry === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => handleEnquiryNav(item)}
                    className={`text-left px-5 py-4 text-sm font-medium border-b last:border-b-0 transition-colors ${
                      isActive
                        ? 'bg-primary/10 text-foreground border-l-4 border-l-primary'
                        : 'text-muted-foreground hover:bg-[hsl(30_20%_92%)] hover:text-foreground'
                    } disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
          </aside>
        )}
        <section>
        {activeSection !== 'enquiries' && (
        <div className="flex items-center gap-2 mb-4">
          <Mail className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Enquiries</h2>
        </div>
        )}
        {(activeSection !== 'enquiries' || selectedEnquiry === 'initial') && (
        <div ref={initialRef}>
        <h3 className="text-base font-medium text-foreground mb-3">Initial Enquiry</h3>
        {enquiries.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center space-y-4">
              <div className="space-y-1">
                <p className="text-foreground font-medium">You haven't sent any enquiries yet.</p>
                <p className="text-sm text-muted-foreground">If you send an enquiry to an agent it will appear here</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <Button variant="outline" onClick={() => navigate('/rent')}>
                  Search property to rent
                </Button>
                <Button variant="outline" onClick={() => navigate('/purchase')}>
                  Search property for sale
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {(showAllEnquiries ? enquiries : enquiries.slice(0, 2)).map((enquiry) => (
                <Card
                  key={enquiry.id}
                  className="cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => navigate(`/property/${enquiry.property_id}`)}
                >
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      {enquiry.properties?.images?.[0] && (
                        <img
                          src={enquiry.properties.images[0]}
                          alt={enquiry.properties.address}
                          className="w-20 h-20 rounded-md object-cover shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {enquiry.properties?.address}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {enquiry.properties?.city} • {enquiry.properties?.property_type}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(enquiry.created_at).toLocaleDateString()}
                        </p>
                        {enquiry.wants_viewing && (
                          <Badge variant="secondary" className="text-xs mt-1">Viewing requested</Badge>
                        )}
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 self-center" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
            {enquiries.length > 2 && (
              <Button
                variant="outline"
                className="mt-3 w-full md:w-auto"
                onClick={() => setShowAllEnquiries(v => !v)}
              >
                {showAllEnquiries ? 'Show less' : `Show more (${enquiries.length - 2})`}
              </Button>
            )}
          </>
        )}
        </div>
        )}

        {/* Viewed subsection */}
        {(activeSection !== 'enquiries' || selectedEnquiry === 'viewed') && (
        <div ref={viewedRef} className="mt-6">
          {activeSection !== 'enquiries' && (
            <button
              type="button"
              disabled={viewedProps.length === 0}
              onClick={() => viewedProps.length > 0 && setViewedOpen(v => !v)}
              className="w-full flex items-center justify-between text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <h3 className="text-base font-medium text-foreground">
                Viewed {viewedProps.length > 0 && `(${viewedProps.length})`}
              </h3>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${viewedOpen ? 'rotate-180' : ''}`}
              />
            </button>
          )}
          {(activeSection === 'enquiries' || viewedOpen) && viewedProps.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-3">
              {viewedProps.map((property) => (
                <Card
                  key={property.id}
                  className="hover:shadow-md transition-shadow overflow-hidden"
                >
                  {property.images?.[0] && (
                    <img
                      src={property.images[0]}
                      alt={property.address}
                      className="w-full h-36 object-cover cursor-pointer"
                      onClick={() => setSelectedProperty(property)}
                    />
                  )}
                  <CardContent className="p-3">
                    <div className="cursor-pointer" onClick={() => setSelectedProperty(property)}>
                      <p className="font-semibold text-sm text-foreground">{formatPrice(property)}</p>
                      <p className="text-xs text-muted-foreground truncate">{property.address}</p>
                      <p className="text-xs text-muted-foreground">{property.city}</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2 gap-1.5"
                      onClick={(e) => { e.stopPropagation(); openOfferDialog(property); }}
                    >
                      <HandCoins className="h-3.5 w-3.5" />
                      Make an Offer
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Made an Offer subsection */}
        {(activeSection !== 'enquiries' || selectedEnquiry === 'offers') && (
        <div ref={offersRef} className="mt-6">
          {activeSection !== 'enquiries' && (
            <button
              type="button"
              disabled={offers.length === 0}
              onClick={() => offers.length > 0 && setOffersOpen(v => !v)}
              className="w-full flex items-center justify-between text-left disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <h3 className="text-base font-medium text-foreground">
                Made an Offer {offers.length > 0 && `(${offers.length})`}
              </h3>
              <ChevronDown
                className={`h-4 w-4 text-muted-foreground transition-transform ${offersOpen ? 'rotate-180' : ''}`}
              />
            </button>
          )}
          {(activeSection === 'enquiries' || offersOpen) && offers.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 mt-3">
              {offers.map((offer) => (
                <Card key={offer.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex gap-3">
                      {offer.properties?.images?.[0] && (
                        <img
                          src={offer.properties.images[0]}
                          alt={offer.properties.address}
                          className="w-20 h-20 rounded-md object-cover shrink-0"
                        />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-foreground truncate">
                          {offer.properties?.address}
                        </p>
                        <p className="text-xs text-muted-foreground">{offer.properties?.city}</p>
                        <p className="text-sm font-semibold text-foreground mt-1">
                          ${Number(offer.amount).toLocaleString()}{offer.offer_type === 'rent' ? '/mo' : ''}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs capitalize">{offer.offer_type}</Badge>
                          <Badge variant="outline" className="text-xs capitalize">{offer.status}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
        )}

        {/* Offer Accepted subsection */}
        {(activeSection !== 'enquiries' || selectedEnquiry === 'accepted') && (
        <div ref={acceptedRef} className="mt-6">
          {(() => {
            const acceptedOffers = offers.filter(o => o.status === 'accepted');
            return (
              <>
                {activeSection !== 'enquiries' && (
                  <button
                    type="button"
                    disabled={acceptedOffers.length === 0}
                    onClick={() => acceptedOffers.length > 0 && setAcceptedOpen(v => !v)}
                    className="w-full flex items-center justify-between text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <h3 className="text-base font-medium text-foreground">
                      Offer accepted {acceptedOffers.length > 0 && `(${acceptedOffers.length})`}
                    </h3>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${acceptedOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                )}
                {(activeSection === 'enquiries' || acceptedOpen) && acceptedOffers.length > 0 && (
                  <div className="grid gap-4 md:grid-cols-2 mt-3">
                    {acceptedOffers.map((offer) => (
                      <Card key={offer.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex gap-3">
                            {offer.properties?.images?.[0] && (
                              <img
                                src={offer.properties.images[0]}
                                alt={offer.properties.address}
                                className="w-20 h-20 rounded-md object-cover shrink-0"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-foreground truncate">
                                {offer.properties?.address}
                              </p>
                              <p className="text-xs text-muted-foreground">{offer.properties?.city}</p>
                              <p className="text-sm font-semibold text-foreground mt-1">
                                ${Number(offer.amount).toLocaleString()}{offer.offer_type === 'rent' ? '/mo' : ''}
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge variant="secondary" className="text-xs capitalize">{offer.offer_type}</Badge>
                                <Badge className="text-xs">Accepted</Badge>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2"
                                onClick={() => openStcDialog(offer)}
                              >
                                Schedule contract meeting
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
        </div>
        )}

        {/* Purchased STC subsection */}
        {(activeSection !== 'enquiries' || selectedEnquiry === 'stc') && (
        <div ref={stcRef} className="mt-6">
          {(() => {
            const acceptedOffers = offers.filter(o => o.status === 'accepted');
            const canOpen = acceptedOffers.length > 0 || meetings.length > 0;
            return (
              <>
                {activeSection !== 'enquiries' && (
                  <button
                    type="button"
                    disabled={!canOpen}
                    onClick={() => canOpen && setStcOpen(v => !v)}
                    className="w-full flex items-center justify-between text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <h3 className="text-base font-medium text-foreground">
                      Purchased STC {meetings.length > 0 && `(${meetings.length})`}
                    </h3>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${stcOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                )}
                {(activeSection === 'enquiries' || stcOpen) && (
                  <div className="mt-3 space-y-4">
                    {meetings.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No pending contract meetings yet. Schedule one from an accepted offer above.
                      </p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {meetings.map((m) => {
                          const d = new Date(m.meeting_date);
                          const dayNames = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
                          return (
                            <Card key={m.id} className="hover:shadow-md transition-shadow">
                              <CardContent className="p-4">
                                <div className="flex gap-3">
                                  {m.properties?.images?.[0] && (
                                    <img
                                      src={m.properties.images[0]}
                                      alt={m.properties.address}
                                      className="w-20 h-20 rounded-md object-cover shrink-0"
                                    />
                                  )}
                                  <div className="flex-1 min-w-0">
                                    <p className="font-medium text-sm text-foreground truncate">
                                      {m.properties?.address}
                                    </p>
                                    <p className="text-xs text-muted-foreground">{m.properties?.city}</p>
                                    <p className="text-sm text-foreground mt-1">
                                      {dayNames[d.getDay()]}, {d.toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                      <Badge variant="secondary" className="text-xs">{timeLabel(m.time_preference)}</Badge>
                                      <Badge variant="outline" className="text-xs capitalize">{m.status}</Badge>
                                    </div>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>
        )}

        {/* Moved In subsection */}
        {(activeSection !== 'enquiries' || selectedEnquiry === 'movedin') && (
        <div ref={movedInRef} className="mt-6">
          {(() => {
            const todayIso = new Date().toISOString().slice(0,10);
            const completedMeetings = meetings.filter(m => m.meeting_date <= todayIso);
            const movedInIds = new Set(moveIns.map(mi => mi.property_id));
            const pendingMoveIn = completedMeetings.filter(m => !movedInIds.has(m.property_id));
            const canOpen = completedMeetings.length > 0 || moveIns.length > 0;
            return (
              <>
                {activeSection !== 'enquiries' && (
                  <button
                    type="button"
                    disabled={!canOpen}
                    onClick={() => canOpen && setMovedInOpen(v => !v)}
                    className="w-full flex items-center justify-between text-left disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <h3 className="text-base font-medium text-foreground">
                      Moved in {moveIns.length > 0 && `(${moveIns.length})`}
                    </h3>
                    <ChevronDown
                      className={`h-4 w-4 text-muted-foreground transition-transform ${movedInOpen ? 'rotate-180' : ''}`}
                    />
                  </button>
                )}
                {(activeSection === 'enquiries' || movedInOpen) && (
                  <div className="mt-3 space-y-4">
                    {pendingMoveIn.length === 0 && moveIns.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No properties ready to confirm yet.
                      </p>
                    ) : (
                      <div className="grid gap-4 md:grid-cols-2">
                        {pendingMoveIn.map((m) => (
                          <Card key={`pending-${m.id}`} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex gap-3">
                                {m.properties?.images?.[0] && (
                                  <img
                                    src={m.properties.images[0]}
                                    alt={m.properties.address}
                                    className="w-20 h-20 rounded-md object-cover shrink-0"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-foreground truncate">
                                    {m.properties?.address}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{m.properties?.city}</p>
                                  <Button
                                    size="sm"
                                    className="mt-2"
                                    disabled={confirmingMoveIn === m.id}
                                    onClick={() => confirmMoveIn(m)}
                                  >
                                    {confirmingMoveIn === m.id ? 'Confirming...' : 'Confirm you moved in'}
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                        {moveIns.map((mi) => (
                          <Card key={mi.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <div className="flex gap-3">
                                {mi.properties?.images?.[0] && (
                                  <img
                                    src={mi.properties.images[0]}
                                    alt={mi.properties.address}
                                    className="w-20 h-20 rounded-md object-cover shrink-0"
                                  />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium text-sm text-foreground truncate">
                                    {mi.properties?.address}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{mi.properties?.city}</p>
                                  <Badge variant="secondary" className="text-xs mt-2">
                                    Moved in {new Date(mi.moved_in_at).toLocaleDateString()}
                                  </Badge>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            );
          })()}
        </div>
        )}

        </section>
      </div>

      {/* Drawn areas Section */}
      {(activeSection === 'drawn-areas' || activeSection !== 'enquiries') && (
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Map className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">Drawn areas</h2>
          </div>
          {savedAreas.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center space-y-4">
                <p className="text-foreground font-medium">You have not yet drawn any areas</p>
                <div className="flex justify-center">
                  <Button onClick={() => navigate('/purchase')}>Create an area</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {savedAreas.map((area) => {
                  const coords = typeof area.coordinates === 'string' ? JSON.parse(area.coordinates) : area.coordinates;
                  const pointCount = Array.isArray(coords) ? coords.length : 0;
                  return (
                    <Card key={area.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div
                          className="cursor-pointer flex-1"
                          onClick={() => {
                            const coordsStr = typeof area.coordinates === 'string'
                              ? area.coordinates
                              : JSON.stringify(area.coordinates);
                            navigate(`/${area.page}?polygon=${encodeURIComponent(coordsStr)}`);
                          }}
                        >
                          <p className="font-medium text-sm text-foreground">{area.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {pointCount} points • {area.page === 'purchase' ? 'Buy' : 'Rent'} • {new Date(area.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive h-8 w-8"
                          onClick={() => handleDeleteArea(area.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
              {savedAreas.length > 2 && (
                <Button
                  variant="outline"
                  className="mt-3 w-full md:w-auto"
                  onClick={() => setShowAllSavedAreas(v => !v)}
                >
                  {showAllSavedAreas ? 'Show less' : `Show more (${savedAreas.length - 2})`}
                </Button>
              )}
            </>
          )}
        </section>
      )}

      {activeSection !== 'enquiries' && activeSection !== 'drawn-areas' && (
      <>
      <Separator />

      {/* Saved Properties Section */}
      <section>
        <div className="flex items-center gap-2 mb-4">
          <Heart className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold text-foreground">Saved Properties</h2>
        </div>
        {favorites.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No saved properties yet
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {(showAllFavorites ? favorites : favorites.slice(0, 2)).map((property) => (
                <Card
                  key={property.id}
                  className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                  onClick={() => setSelectedProperty(property)}
                >
                  {property.images?.[0] && (
                    <img
                      src={property.images[0]}
                      alt={property.address}
                      className="w-full h-36 object-cover"
                    />
                  )}
                  <CardContent className="p-3">
                    <p className="font-semibold text-sm text-foreground">{formatPrice(property)}</p>
                    <p className="text-xs text-muted-foreground truncate">{property.address}</p>
                    <p className="text-xs text-muted-foreground">{property.city}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
            {favorites.length > 2 && (
              <Button
                variant="outline"
                className="mt-3 w-full md:w-auto"
                onClick={() => setShowAllFavorites(v => !v)}
              >
                {showAllFavorites ? 'Show less' : `Show more (${favorites.length - 2})`}
              </Button>
            )}
          </>
        )}
      </section>

      <Separator />

      {/* My Places Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Home className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold text-foreground">My Places</h2>
          </div>
          <Button size="sm" onClick={() => navigate('/list-property')} className="gap-1.5">
            <PlusCircle className="h-4 w-4" />
            Add Place
          </Button>
        </div>
        {myPlaces.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center space-y-3">
              <p className="text-muted-foreground">You haven't listed any properties yet</p>
              <Button variant="outline" onClick={() => navigate('/list-property')} className="gap-1.5">
                <PlusCircle className="h-4 w-4" />
                List your first property
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              {(showAllMyPlaces ? myPlaces : myPlaces.slice(0, 2)).map((property) => (
                <Card
                  key={property.id}
                  className="cursor-pointer hover:shadow-md transition-shadow overflow-hidden"
                  onClick={() => setSelectedProperty(property)}
                >
                  <div className="flex">
                    {property.images?.[0] && (
                      <img
                        src={property.images[0]}
                        alt={property.address}
                        className="w-28 h-full object-cover shrink-0"
                      />
                    )}
                    <CardContent className="p-3 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm text-foreground">{formatPrice(property)}</p>
                          <p className="text-xs text-muted-foreground truncate">{property.address}</p>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <MapPin className="h-3 w-3" />
                            {property.city}
                          </div>
                        </div>
                        {getStatusBadge(property.status)}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {property.bedrooms} bed • {property.bathrooms} bath • {property.square_meters}m²
                      </p>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
            {myPlaces.length > 2 && (
              <Button
                variant="outline"
                className="mt-3 w-full md:w-auto"
                onClick={() => setShowAllMyPlaces(v => !v)}
              >
                {showAllMyPlaces ? 'Show less' : `Show more (${myPlaces.length - 2})`}
              </Button>
            )}
          </>
        )}
      </section>
      </>
      )}

      <PropertyDetailModal
        property={selectedProperty}
        isOpen={!!selectedProperty}
        onClose={() => setSelectedProperty(null)}
      />

      <Dialog open={!!offerProperty} onOpenChange={(open) => !open && setOfferProperty(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Make an Offer</DialogTitle>
          </DialogHeader>
          {offerProperty && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {offerProperty.address}, {offerProperty.city}
              </div>
              {offerProperty.listing_type === 'both' && (
                <div className="space-y-2">
                  <Label>Offer type</Label>
                  <RadioGroup value={offerType} onValueChange={(v) => setOfferType(v as 'buy' | 'rent')} className="flex gap-4">
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="buy" id="offer-buy" />
                      <Label htmlFor="offer-buy" className="cursor-pointer">Buy</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="rent" id="offer-rent" />
                      <Label htmlFor="offer-rent" className="cursor-pointer">Rent</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="offer-amount">
                  Offer amount {offerType === 'rent' ? '(per month)' : ''}
                </Label>
                <Input
                  id="offer-amount"
                  type="number"
                  min="0"
                  placeholder="0"
                  value={offerAmount}
                  onChange={(e) => setOfferAmount(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="offer-message">Message (optional)</Label>
                <Textarea
                  id="offer-message"
                  placeholder="Add a note for the agent..."
                  value={offerMessage}
                  onChange={(e) => setOfferMessage(e.target.value)}
                  maxLength={1000}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferProperty(null)}>Cancel</Button>
            <Button onClick={submitOffer} disabled={submittingOffer}>
              {submittingOffer ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit offer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!stcOffer} onOpenChange={(open) => !open && setStcOffer(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Schedule contract meeting</DialogTitle>
          </DialogHeader>
          {stcOffer && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                {stcOffer.properties?.address}, {stcOffer.properties?.city}
              </div>
              <div className="space-y-2">
                <Label>Pick a day</Label>
                <RadioGroup value={stcDate} onValueChange={setStcDate} className="grid grid-cols-1 gap-1.5">
                  {next7Days.map((d) => (
                    <div key={d.iso} className="flex items-center gap-2">
                      <RadioGroupItem value={d.iso} id={`stc-day-${d.iso}`} />
                      <Label htmlFor={`stc-day-${d.iso}`} className="cursor-pointer">{d.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div className="space-y-2">
                <Label>Preferred time</Label>
                <RadioGroup value={stcTime} onValueChange={(v) => setStcTime(v as any)} className="flex gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="morning" id="stc-morning" />
                    <Label htmlFor="stc-morning" className="cursor-pointer">Morning</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="afternoon" id="stc-afternoon" />
                    <Label htmlFor="stc-afternoon" className="cursor-pointer">Afternoon</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="all_day" id="stc-all-day" />
                    <Label htmlFor="stc-all-day" className="cursor-pointer">All day</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStcOffer(null)}>Cancel</Button>
            <Button onClick={submitStc} disabled={submittingStc || !stcDate}>
              {submittingStc ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Submit'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
