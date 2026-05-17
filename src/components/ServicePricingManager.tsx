import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DollarSign, Save, Loader2 } from "lucide-react";

const DURATIONS = [7, 14, 21, 30] as const;
type Duration = (typeof DURATIONS)[number];
const keyFor = (kind: "sale" | "rent", days: Duration) =>
  `featured_listing_${kind}_price_${days}d`;

export const ServicePricingManager = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sale, setSale] = useState<Record<Duration, string>>({ 7: "", 14: "", 21: "", 30: "" });
  const [rent, setRent] = useState<Record<Duration, string>>({ 7: "", 14: "", 21: "", 30: "" });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const allKeys = DURATIONS.flatMap((d) => [keyFor("sale", d), keyFor("rent", d)]);
      const { data, error } = await supabase
        .from("service_settings")
        .select("key, value")
        .in("key", allKeys);

      if (error) throw error;

      const map = new Map((data || []).map((d: any) => [d.key, d.value]));
      const nextSale = { ...sale };
      const nextRent = { ...rent };
      DURATIONS.forEach((d) => {
        nextSale[d] = (map.get(keyFor("sale", d)) ?? 0).toString();
        nextRent[d] = (map.get(keyFor("rent", d)) ?? 0).toString();
      });
      setSale(nextSale);
      setRent(nextRent);
    } catch (error) {
      console.error("Error loading settings:", error);
      toast.error("Failed to load pricing settings");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates = DURATIONS.flatMap((d) => [
        { key: keyFor("sale", d), value: parseFloat(sale[d]) || 0 },
        { key: keyFor("rent", d), value: parseFloat(rent[d]) || 0 },
      ]);

      for (const update of updates) {
        const { error } = await supabase
          .from("service_settings")
          .upsert(
            { key: update.key, value: update.value },
            { onConflict: "key" }
          );

        if (error) throw error;
      }

      toast.success("Pricing updated successfully");
      loadSettings();
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Failed to save pricing settings");
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

  const renderRow = (
    label: string,
    state: Record<Duration, string>,
    setState: (next: Record<Duration, string>) => void
  ) => (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="grid gap-3 sm:grid-cols-4">
        {DURATIONS.map((d) => (
          <div key={d} className="space-y-1">
            <p className="text-xs text-muted-foreground">{d} days</p>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="number"
                min="0"
                step="0.01"
                value={state[d]}
                onChange={(e) => setState({ ...state, [d]: e.target.value })}
                className="pl-9"
                placeholder="0.00"
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Featured Listing Pricing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {renderRow("For Sale — price per duration", sale, setSale)}
        {renderRow("For Rent — price per duration", rent, setRent)}

        <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Pricing
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};
