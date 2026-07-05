import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Handshake, Loader2, Check, X, Home, User, Mail } from "lucide-react";
import { format } from "date-fns";

interface Offer {
  id: string;
  user_id: string;
  property_id: string;
  offer_type: string;
  amount: number;
  message: string | null;
  status: string;
  created_at: string;
  properties?: { address: string | null; city: string | null; listing_type: string | null } | null;
  senderName?: string;
  senderPhone?: string;
}

export default function PropertyOffersManager() {
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "accepted" | "rejected" | "all">("pending");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("property_offers" as any)
      .select("*, properties(address, city, listing_type)")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Failed to load offers", description: error.message, variant: "destructive" });
      setLoading(false);
      return;
    }
    const rows = (data as any[]) || [];
    const enriched = await Promise.all(
      rows.map(async (o) => {
        const { data: p } = await supabase
          .from("profiles")
          .select("full_name, phone_number")
          .eq("user_id", o.user_id)
          .maybeSingle();
        return { ...o, senderName: p?.full_name, senderPhone: p?.phone_number } as Offer;
      })
    );
    setOffers(enriched);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const decide = async (id: string, status: "accepted" | "rejected") => {
    setActing(id);
    const { error } = await supabase
      .from("property_offers" as any)
      .update({ status })
      .eq("id", id);
    setActing(null);
    if (error) {
      toast({ title: "Update failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: `Offer ${status}` });
    setOffers((prev) => prev.map((o) => (o.id === id ? { ...o, status } : o)));
  };

  const visible = filter === "all" ? offers : offers.filter((o) => o.status === filter);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Handshake className="w-5 h-5" />
          Property Offers
        </CardTitle>
        <CardDescription>Review and accept or reject buyer/renter offers</CardDescription>
        <div className="flex flex-wrap gap-2 pt-2">
          {(["pending", "accepted", "rejected", "all"] as const).map((f) => (
            <Button
              key={f}
              variant={filter === f ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(f)}
              className="capitalize"
            >
              {f} {f !== "all" && `(${offers.filter((o) => o.status === f).length})`}
            </Button>
          ))}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No {filter} offers</p>
        ) : (
          <div className="space-y-4">
            {visible.map((o) => (
              <div key={o.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-start justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Home className="w-4 h-4 text-muted-foreground" />
                    <h4 className="font-semibold">
                      {o.properties?.address || "Property"}{o.properties?.city ? `, ${o.properties.city}` : ""}
                    </h4>
                  </div>
                  <Badge
                    variant={
                      o.status === "accepted" ? "default" : o.status === "rejected" ? "destructive" : "secondary"
                    }
                    className="capitalize"
                  >
                    {o.status}
                  </Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{o.senderName || "Unknown"}</span>
                  </div>
                  {o.senderPhone && (
                    <div className="flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      <span>{o.senderPhone}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="capitalize">{o.offer_type}</Badge>
                    <span className="font-semibold">${Number(o.amount).toLocaleString()}</span>
                  </div>
                </div>
                {o.message && (
                  <p className="text-sm text-muted-foreground border-l-2 pl-3">{o.message}</p>
                )}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(o.created_at), "MMM dd, yyyy HH:mm")}
                  </span>
                  {o.status === "pending" && (
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="destructive"
                        disabled={acting === o.id}
                        onClick={() => decide(o.id, "rejected")}
                      >
                        <X className="w-4 h-4" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={acting === o.id}
                        onClick={() => decide(o.id, "accepted")}
                      >
                        <Check className="w-4 h-4" /> Accept
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}