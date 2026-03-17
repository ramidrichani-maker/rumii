import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Building2, Plus, Trash2, Loader2, Upload, X, ImageIcon } from "lucide-react";

interface Agency {
  id: string;
  name: string;
  logo_url: string | null;
  created_at: string;
}

export const AgencyManager = () => {
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [newAgencyName, setNewAgencyName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadAgencies();
  }, []);

  const loadAgencies = async () => {
    try {
      const { data, error } = await supabase
        .from('agencies')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setAgencies(data || []);
    } catch (error) {
      console.error('Error loading agencies:', error);
      toast({
        title: "Error",
        description: "Failed to load agencies",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({ title: "Error", description: "Please select an image file", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be under 5MB", variant: "destructive" });
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const clearLogo = () => {
    setLogoFile(null);
    if (logoPreview) URL.revokeObjectURL(logoPreview);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const uploadLogo = async (agencyId: string): Promise<string | null> => {
    if (!logoFile) return null;

    const ext = logoFile.name.split('.').pop();
    const path = `agency-logos/${agencyId}.${ext}`;

    const { error } = await supabase.storage
      .from('property-images')
      .upload(path, logoFile, { upsert: true });

    if (error) throw error;

    const { data: urlData } = supabase.storage
      .from('property-images')
      .getPublicUrl(path);

    return urlData.publicUrl;
  };

  const handleAddAgency = async () => {
    if (!newAgencyName.trim()) {
      toast({ title: "Error", description: "Please enter an agency name", variant: "destructive" });
      return;
    }

    setAdding(true);
    try {
      const { data: inserted, error } = await supabase
        .from('agencies')
        .insert({ name: newAgencyName.trim() })
        .select('id')
        .single();

      if (error) {
        if (error.code === '23505') {
          toast({ title: "Error", description: "An agency with this name already exists", variant: "destructive" });
        } else {
          throw error;
        }
        return;
      }

      // Upload logo if provided
      if (logoFile && inserted) {
        const logoUrl = await uploadLogo(inserted.id);
        if (logoUrl) {
          await supabase
            .from('agencies')
            .update({ logo_url: logoUrl } as any)
            .eq('id', inserted.id);
        }
      }

      toast({ title: "Success", description: `Agency "${newAgencyName}" added successfully` });
      setNewAgencyName("");
      clearLogo();
      loadAgencies();
    } catch (error) {
      console.error('Error adding agency:', error);
      toast({ title: "Error", description: "Failed to add agency", variant: "destructive" });
    } finally {
      setAdding(false);
    }
  };

  const handleDeleteAgency = async (agency: Agency) => {
    try {
      const { error } = await supabase
        .from('agencies')
        .delete()
        .eq('id', agency.id);

      if (error) throw error;

      toast({ title: "Success", description: `Agency "${agency.name}" deleted` });
      loadAgencies();
    } catch (error) {
      console.error('Error deleting agency:', error);
      toast({ title: "Error", description: "Failed to delete agency", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building2 className="w-5 h-5" />
          Real Estate Agencies
        </CardTitle>
        <CardDescription>
          Add and manage real estate agencies in the system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add New Agency */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Enter agency name..."
              value={newAgencyName}
              onChange={(e) => setNewAgencyName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddAgency()}
              disabled={adding}
            />
            <Button onClick={handleAddAgency} disabled={adding}>
              {adding ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 mr-1" />
              )}
              Add
            </Button>
          </div>

          {/* Logo Upload */}
          <div className="flex items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            {logoPreview ? (
              <div className="relative">
                <img
                  src={logoPreview}
                  alt="Logo preview"
                  className="w-16 h-16 rounded-lg object-contain border bg-muted/30"
                />
                <button
                  onClick={clearLogo}
                  className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={adding}
                className="gap-1.5"
              >
                <Upload className="w-4 h-4" />
                Upload Logo
              </Button>
            )}
            {!logoPreview && (
              <span className="text-xs text-muted-foreground">Optional – PNG, JPG up to 5MB</span>
            )}
          </div>
        </div>

        {/* Agency List */}
        {agencies.length === 0 ? (
          <p className="text-muted-foreground text-center py-4">
            No agencies added yet. Add your first agency above.
          </p>
        ) : (
          <div className="space-y-2">
            {agencies.map((agency) => (
              <div
                key={agency.id}
                className="flex items-center justify-between p-3 border rounded-lg bg-muted/30"
              >
                <div className="flex items-center gap-3">
                  {agency.logo_url ? (
                    <img
                      src={agency.logo_url}
                      alt={`${agency.name} logo`}
                      className="w-9 h-9 rounded object-contain border bg-background"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded border bg-background flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                  <span className="font-medium">{agency.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteAgency(agency)}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 border-t">
          <Badge variant="secondary">
            {agencies.length} {agencies.length === 1 ? 'agency' : 'agencies'} registered
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
};
