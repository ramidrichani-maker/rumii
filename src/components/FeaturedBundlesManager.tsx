import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Package, Save, Loader2, DollarSign } from "lucide-react";

const LISTING_COUNTS = [2, 3, 5, 7] as const;
const DURATIONS = [7, 14, 21, 30] as const;
type ListingCount = (typeof LISTING_COUNTS)[number];
type Duration = (typeof DURATIONS)[number];

const bundleKey = (listings: ListingCount, days: Duration) =>
  `featured_bundle_${listings}l_${days}d_price`;

type PriceMap = Record<string, string>;

export const FeaturedBundlesManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [prices, setPrices] = useState<PriceMap>({});

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const allKeys = LISTING_COUNTS.flatMap((l) =>
        DURATIONS.map((d) => bundleKey(l, d))
      );
      const { data, error } = await supabase
        .from("service_settings")
        .select("key, value")
        .in("key", allKeys);
      if (error) throw error;
      const map: PriceMap = {};
      const found = new Map((data || []).map((d: any) => [d.key, d.value]));
      LISTING_COUNTS.forEach((l) =>
        DURATIONS.forEach((d) => {
          const k = bundleKey(l, d);
          map[k] = (found.get(k) ?? 0).toString();
        })
      );
      setPrices(map);
    } catch (e) {
      console.error(e);
      toast.error("Failed to load bundle pricing");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      for (const l of LISTING_COUNTS) {
        for (const d of DURATIONS) {
          const k = bundleKey(l, d);
          const { error } = await supabase
            .from("service_settings")
            .upsert(
              { key: k, value: parseFloat(prices[k]) || 0, description: `Featured bundle: ${l} listings for ${d} days` },
              { onConflict: "key" }
            );
          if (error) throw error;
        }
      }
      toast.success("Bundle pricing saved");
      loadSettings();
    } catch (e) {
      console.error(e);
      toast.error("Failed to save bundle pricing");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="h-5 w-5" />
          Featured Listing Bundles
        </CardTitle>
        <CardDescription>
          Set pricing for bundles combining a number of listings with a duration.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {LISTING_COUNTS.map((l) => (
          <div key={l} className="space-y-2">
            <Label>{l} listings — price per duration</Label>
            <div className="grid gap-3 sm:grid-cols-4">
              {DURATIONS.map((d) => {
                const k = bundleKey(l, d);
                return (
                  <div key={d} className="space-y-1">
                    <p className="text-xs text-muted-foreground">{d} days</p>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={prices[k] ?? ""}
                        onChange={(e) =>
                          setPrices({ ...prices, [k]: e.target.value })
                        }
                        className="pl-9"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Bundles
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};

export default FeaturedBundlesManager;