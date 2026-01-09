import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { DollarSign, Save, Loader2 } from "lucide-react";

interface ServiceSetting {
  id: string;
  key: string;
  value: number;
  description: string | null;
}

export const ServicePricingManager = () => {
  const [settings, setSettings] = useState<ServiceSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [salePrice, setSalePrice] = useState<string>("");
  const [rentPrice, setRentPrice] = useState<string>("");

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("service_settings")
        .select("*")
        .in("key", ["featured_listing_sale_price", "featured_listing_rent_price"]);

      if (error) throw error;

      setSettings(data || []);
      
      const saleSetting = data?.find(s => s.key === "featured_listing_sale_price");
      const rentSetting = data?.find(s => s.key === "featured_listing_rent_price");
      
      setSalePrice(saleSetting?.value?.toString() || "0");
      setRentPrice(rentSetting?.value?.toString() || "0");
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
      const updates = [
        {
          key: "featured_listing_sale_price",
          value: parseFloat(salePrice) || 0,
        },
        {
          key: "featured_listing_rent_price",
          value: parseFloat(rentPrice) || 0,
        },
      ];

      for (const update of updates) {
        const { error } = await supabase
          .from("service_settings")
          .update({ value: update.value })
          .eq("key", update.key);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <DollarSign className="h-5 w-5" />
          Featured Listing Pricing
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="sale-price">Featured Listing Price (For Sale)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="sale-price"
                type="number"
                min="0"
                step="0.01"
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
                className="pl-9"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Price charged to feature a property for sale
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="rent-price">Featured Listing Price (For Rent)</Label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="rent-price"
                type="number"
                min="0"
                step="0.01"
                value={rentPrice}
                onChange={(e) => setRentPrice(e.target.value)}
                className="pl-9"
                placeholder="0.00"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Price charged to feature a rental property
            </p>
          </div>
        </div>

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
