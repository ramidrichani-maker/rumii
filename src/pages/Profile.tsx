import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { Loader2, Calendar, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Viewing {
  id: string;
  property_id: string;
  viewing_date: string;
  viewing_time: string;
  status: string;
  notes: string | null;
  properties: {
    address: string;
    city: string;
    property_type: string;
  };
}

export default function Profile() {
  const { user, profile, updateProfile } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [isEditingEmail, setIsEditingEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewings, setViewings] = useState<Viewing[]>([]);
  const [loadingViewings, setLoadingViewings] = useState(true);

  useEffect(() => {
    if (profile) {
      setPhoneNumber(profile.phone_number);
    }
    if (user) {
      setEmail(user.email || '');
    }
  }, [profile, user]);

  useEffect(() => {
    fetchViewings();
  }, []);

  const fetchViewings = async () => {
    try {
      const { data, error } = await supabase
        .from('property_viewings')
        .select(`
          id,
          property_id,
          viewing_date,
          viewing_time,
          status,
          notes,
          properties (
            address,
            city,
            property_type
          )
        `)
        .eq('user_id', user?.id)
        .order('viewing_date', { ascending: true });

      if (error) throw error;
      setViewings(data || []);
    } catch (error) {
      console.error('Error fetching viewings:', error);
      toast.error('Failed to load viewings');
    } finally {
      setLoadingViewings(false);
    }
  };

  const handlePhoneUpdate = async () => {
    if (!phoneNumber.trim()) {
      toast.error('Phone number cannot be empty');
      return;
    }

    setLoading(true);
    const { error } = await updateProfile({ phone_number: phoneNumber });
    setLoading(false);

    if (error) {
      toast.error('Failed to update phone number');
    } else {
      toast.success('Phone number updated successfully');
      setIsEditingPhone(false);
    }
  };

  const handleEmailUpdate = async () => {
    if (!email.trim()) {
      toast.error('Email cannot be empty');
      return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ email });
    setLoading(false);

    if (error) {
      toast.error('Failed to update email');
    } else {
      toast.success('Verification email sent. Please check your inbox.');
      setIsEditingEmail(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive"> = {
      pending: "default",
      confirmed: "secondary",
      cancelled: "destructive",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
  };

  if (!profile || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 max-w-4xl">
      <h1 className="text-3xl font-bold mb-8">My Profile</h1>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>Manage your account details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              value={profile.full_name}
              disabled
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="phone"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                disabled={!isEditingPhone || loading}
              />
              {isEditingPhone ? (
                <>
                  <Button onClick={handlePhoneUpdate} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPhoneNumber(profile.phone_number);
                      setIsEditingPhone(false);
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditingPhone(true)}>Edit</Button>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="email">Email</Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={!isEditingEmail || loading}
              />
              {isEditingEmail ? (
                <>
                  <Button onClick={handleEmailUpdate} disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEmail(user.email || '');
                      setIsEditingEmail(false);
                    }}
                    disabled={loading}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button onClick={() => setIsEditingEmail(true)}>Edit</Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Changing your email requires verification
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>My Viewings</CardTitle>
          <CardDescription>Your scheduled property viewings</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingViewings ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : viewings.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              You don't have any scheduled viewings yet
            </p>
          ) : (
            <div className="space-y-4">
              {viewings.map((viewing) => (
                <Card key={viewing.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-semibold text-lg">
                          {viewing.properties.address}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {viewing.properties.city} • {viewing.properties.property_type}
                        </p>
                      </div>
                      {getStatusBadge(viewing.status)}
                    </div>
                    <Separator className="my-4" />
                    <div className="flex gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span>{new Date(viewing.viewing_date).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span>{viewing.viewing_time}</span>
                      </div>
                    </div>
                    {viewing.notes && (
                      <p className="text-sm text-muted-foreground mt-4">
                        Notes: {viewing.notes}
                      </p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
