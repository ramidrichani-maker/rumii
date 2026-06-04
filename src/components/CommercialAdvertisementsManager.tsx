import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Building2, Phone, Mail, MapPin, Loader2, User, Trash2 } from "lucide-react";
import { format } from "date-fns";

interface Ad {
  id: string;
  user_id: string | null;
  full_name: string;
  email: string;
  phone_number: string;
  property_type: string;
  listing_type: string;
  address: string;
  city: string | null;
  municipality: string | null;
  size_sqm: number | null;
  price: number | null;
  description: string | null;
  status: string;
  created_at: string;
}

export default function CommercialAdvertisementsManager() {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("commercial_advertisements")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setAds((data as Ad[]) || []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("commercial_advertisements")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Updated", description: `Status set to ${status}` });
      load();
    }
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this request?")) return;
    const { error } = await supabase
      .from("commercial_advertisements")
      .delete()
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      load();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Commercial Advertisement Requests
        </CardTitle>
        <CardDescription>Requests from users to advertise commercial properties</CardDescription>
      </CardHeader>
      <CardContent>
        {ads.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No commercial advertisement requests yet</p>
        ) : (
          <div className="space-y-4">
            {ads.map((ad) => (
              <div key={ad.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <h4 className="font-semibold">{ad.full_name}</h4>
                    <Badge variant="outline">{ad.listing_type === "rent" ? "For Rent" : "For Sale"}</Badge>
                    <Badge variant="secondary">{ad.property_type}</Badge>
                  </div>
                  <Badge variant="secondary">
                    {format(new Date(ad.created_at), "MMM dd, yyyy HH:mm")}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{ad.phone_number}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{ad.email}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{ad.address}{ad.city ? `, ${ad.city}` : ""}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 text-sm">
                  {ad.size_sqm != null && <Badge variant="outline">Size: {ad.size_sqm} sqm</Badge>}
                  {ad.price != null && <Badge variant="outline">Price: €{ad.price.toLocaleString()}</Badge>}
                  {ad.municipality && <Badge variant="outline">{ad.municipality}</Badge>}
                </div>

                {ad.description && (
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap">{ad.description}</p>
                )}

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Select value={ad.status} onValueChange={(v) => updateStatus(ad.id, v)}>
                    <SelectTrigger className="w-40 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_review">In Review</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="sm" onClick={() => remove(ad.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}