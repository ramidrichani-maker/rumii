import { useCallback } from "react";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";

export const UNIT_PROPERTY_TYPES = [
  { value: "apartment", label: "Apartment" },
  { value: "duplex", label: "Duplex" },
  { value: "triplex", label: "Triplex" },
  { value: "penthouse", label: "Penthouse" },
  { value: "studio", label: "Studio" },
  { value: "rooftop", label: "Rooftop" },
];

export interface UnitImage {
  file: File;
}

export interface UnitDraft {
  localId: string;
  property_type: string;
  price: string;
  rental_price: string;
  floor: string;
  bedrooms: string;
  bathrooms: string;
  square_meters: string;
  description: string;
  unfurnished: boolean;
  price_negotiable: boolean;
  images: UnitImage[];
}

export const makeEmptyUnit = (): UnitDraft => ({
  localId: crypto.randomUUID(),
  property_type: "apartment",
  price: "",
  rental_price: "",
  floor: "",
  bedrooms: "",
  bathrooms: "",
  square_meters: "",
  description: "",
  unfurnished: false,
  price_negotiable: false,
  images: [],
});

interface Props {
  units: UnitDraft[];
  onChange: (units: UnitDraft[]) => void;
  listingType: "rent" | "sale" | "both" | undefined;
}

export const StackedUnitsEditor = ({ units, onChange, listingType }: Props) => {
  const update = useCallback(
    (id: string, patch: Partial<UnitDraft>) => {
      onChange(units.map((u) => (u.localId === id ? { ...u, ...patch } : u)));
    },
    [units, onChange]
  );

  const addUnit = () => onChange([...units, makeEmptyUnit()]);
  const removeUnit = (id: string) => onChange(units.filter((u) => u.localId !== id));

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Units in this building</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Add each apartment, duplex, studio, etc. Each unit is its own listing with its own price, floor, and specs.
          </p>
        </div>
        <Button type="button" onClick={addUnit} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Unit
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {units.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-6">
            No units added yet. Click "Add Unit" to start.
          </p>
        )}

        {units.map((unit, idx) => (
          <Card key={unit.localId} className="bg-muted/30">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-base">Unit #{idx + 1}</CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => removeUnit(unit.localId)}
                className="text-destructive hover:text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label>Property Type</Label>
                  <Select
                    value={unit.property_type}
                    onValueChange={(v) => update(unit.localId, { property_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {UNIT_PROPERTY_TYPES.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Floor</Label>
                  <Input
                    type="number"
                    value={unit.floor}
                    onChange={(e) => update(unit.localId, { floor: e.target.value })}
                    placeholder="e.g. 3"
                  />
                </div>

                {(listingType === "sale" || listingType === "both") && (
                  <div>
                    <Label>Sale Price ($)</Label>
                    <Input
                      type="number"
                      value={unit.price}
                      onChange={(e) => update(unit.localId, { price: e.target.value })}
                      placeholder="Enter sale price"
                    />
                  </div>
                )}

                {(listingType === "rent" || listingType === "both") && (
                  <div>
                    <Label>Monthly Rent ($)</Label>
                    <Input
                      type="number"
                      value={unit.rental_price}
                      onChange={(e) => update(unit.localId, { rental_price: e.target.value })}
                      placeholder="Enter monthly rent"
                    />
                  </div>
                )}

                <div>
                  <Label>Size (m²)</Label>
                  <Input
                    type="number"
                    value={unit.square_meters}
                    onChange={(e) => update(unit.localId, { square_meters: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Bedrooms</Label>
                  <Input
                    type="number"
                    value={unit.bedrooms}
                    onChange={(e) => update(unit.localId, { bedrooms: e.target.value })}
                  />
                </div>

                <div>
                  <Label>Bathrooms</Label>
                  <Input
                    type="number"
                    step="0.5"
                    value={unit.bathrooms}
                    onChange={(e) => update(unit.localId, { bathrooms: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  value={unit.description}
                  onChange={(e) => update(unit.localId, { description: e.target.value })}
                  placeholder="Describe this unit..."
                  rows={2}
                />
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={unit.price_negotiable}
                    onCheckedChange={(c) => update(unit.localId, { price_negotiable: !!c })}
                  />
                  Price negotiable
                </label>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={unit.unfurnished}
                    onCheckedChange={(c) => update(unit.localId, { unfurnished: !!c })}
                  />
                  Unfurnished
                </label>
              </div>

              <div>
                <Label>Images</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-3 text-center">
                  <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-1" />
                  <Label htmlFor={`unit-files-${unit.localId}`} className="cursor-pointer text-sm">
                    <span className="text-primary hover:text-primary/80">Click to upload</span>
                  </Label>
                  <Input
                    id={`unit-files-${unit.localId}`}
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []).map((file) => ({ file }));
                      update(unit.localId, { images: [...unit.images, ...files] });
                      e.target.value = "";
                    }}
                  />
                </div>
                {unit.images.length > 0 && (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    {unit.images.map((img, i) => (
                      <div key={i} className="relative">
                        <img
                          src={URL.createObjectURL(img.file)}
                          alt={`unit-${idx}-${i}`}
                          className="w-full h-20 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            update(unit.localId, {
                              images: unit.images.filter((_, j) => j !== i),
                            })
                          }
                          className="absolute top-1 right-1 bg-background/80 rounded p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </CardContent>
    </Card>
  );
};

/**
 * Validate units before submit. Returns error message or null.
 */
export const validateUnits = (units: UnitDraft[], listingType: string | undefined): string | null => {
  if (units.length === 0) return "Add at least one unit to the building.";
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    const label = `Unit #${i + 1}`;
    if (!u.property_type) return `${label}: pick a property type.`;
    if (!u.square_meters) return `${label}: enter size.`;
    if (!u.bedrooms) return `${label}: enter bedrooms.`;
    if (!u.bathrooms) return `${label}: enter bathrooms.`;
    if ((listingType === "sale" || listingType === "both") && !u.price) return `${label}: enter sale price.`;
    if ((listingType === "rent" || listingType === "both") && !u.rental_price) return `${label}: enter monthly rent.`;
  }
  return null;
};

/**
 * Upload all unit images, then insert sub-unit rows under the given parent.
 */
export const insertUnitsForParent = async (
  parentId: string,
  userId: string,
  units: UnitDraft[]
): Promise<void> => {
  const rows: any[] = [];
  for (let i = 0; i < units.length; i++) {
    const u = units[i];
    const imageUrls: string[] = [];
    for (let j = 0; j < u.images.length; j++) {
      const file = u.images[j].file;
      const ext = file.name.split(".").pop() || "jpg";
      const fileName = `${userId}/${Date.now()}_unit${i}_${j}.${ext}`;
      const { error: upErr } = await supabase.storage.from("property-images").upload(fileName, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("property-images").getPublicUrl(fileName);
      imageUrls.push(publicUrl);
    }
    rows.push({
      user_id: userId,
      parent_property_id: parentId,
      property_type: u.property_type,
      // listing_type, address, city, municipality, agency_id, status inherited via trigger from parent
      // Pass placeholders to satisfy NOT NULL — trigger overwrites them
      listing_type: "sale",
      address: "(inherited)",
      city: "(inherited)",
      square_meters: parseInt(u.square_meters) || 0,
      bedrooms: parseInt(u.bedrooms) || 0,
      bathrooms: parseFloat(u.bathrooms) || 0,
      floors: u.floor ? parseInt(u.floor) : null,
      price: u.price ? parseFloat(u.price) : null,
      rental_price: u.rental_price ? parseFloat(u.rental_price) : null,
      description: u.description || null,
      unfurnished: u.unfurnished,
      price_negotiable: u.price_negotiable,
      images: imageUrls,
    });
  }

  if (rows.length === 0) return;
  const { error } = await supabase.from("properties").insert(rows);
  if (error) throw error;
};