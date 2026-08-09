import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Pencil, Trash2, X, Loader2, ImagePlus, Users } from "lucide-react";

const PROJECT_TYPES = ["building", "compound", "villa", "venue"] as const;
const COMPLETION_STATUSES = ["planning", "under construction", "completed"] as const;

interface Project {
  id: string;
  title: string;
  project_type: string;
  description: string | null;
  address: string;
  city: string;
  municipality: string | null;
  total_price: number | null;
  currency: string;
  land_area_sqm: number | null;
  built_area_sqm: number | null;
  units_count: number | null;
  floors: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  year_built: number | null;
  completion_status: string | null;
  expected_roi: number | null;
  invested_amount: number;
  amenities: string[];
  images: string[];
  published: boolean;
  created_at: string;
}

interface InvestmentRequest {
  id: string;
  project_id: string;
  full_name: string;
  email: string;
  phone_number: string;
  amount: number | null;
  message: string | null;
  status: string;
  created_at: string;
}

const emptyForm = {
  title: "",
  project_type: "building",
  description: "",
  address: "",
  city: "",
  municipality: "",
  total_price: "",
  currency: "USD",
  land_area_sqm: "",
  built_area_sqm: "",
  units_count: "",
  floors: "",
  bedrooms: "",
  bathrooms: "",
  year_built: "",
  completion_status: "planning",
  expected_roi: "",
  invested_amount: "",
  amenities: "",
  published: true,
};

const num = (v: string) => (v.trim() === "" ? null : Number(v));

export const InvestmentProjectsManager = () => {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [images, setImages] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestsOpen, setRequestsOpen] = useState(false);
  const [activeProject, setActiveProject] = useState<Project | null>(null);
  const [requests, setRequests] = useState<InvestmentRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestCounts, setRequestCounts] = useState<Record<string, number>>({});

  const load = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("investment_projects")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: "Failed to load projects", variant: "destructive" });
    } else {
      setProjects((data || []) as unknown as Project[]);
      const { data: reqs } = await supabase.from("investment_requests").select("project_id");
      const counts: Record<string, number> = {};
      (reqs || []).forEach((r: any) => { counts[r.project_id] = (counts[r.project_id] || 0) + 1; });
      setRequestCounts(counts);
    }
    setIsLoading(false);
  };

  const openRequests = async (p: Project) => {
    setActiveProject(p);
    setRequestsOpen(true);
    setRequestsLoading(true);
    const { data, error } = await supabase
      .from("investment_requests")
      .select("*")
      .eq("project_id", p.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: "Failed to load requests", variant: "destructive" });
    }
    setRequests((data || []) as unknown as InvestmentRequest[]);
    setRequestsLoading(false);
  };

  const setRequestStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("investment_requests").update({ status }).eq("id", id);
    if (error) {
      toast({ title: "Error", description: "Could not update request", variant: "destructive" });
      return;
    }
    setRequests((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm });
    setImages([]);
    setOpen(true);
  };

  const openEdit = (p: Project) => {
    setEditingId(p.id);
    setForm({
      title: p.title,
      project_type: p.project_type,
      description: p.description || "",
      address: p.address,
      city: p.city,
      municipality: p.municipality || "",
      total_price: p.total_price?.toString() || "",
      currency: p.currency || "USD",
      land_area_sqm: p.land_area_sqm?.toString() || "",
      built_area_sqm: p.built_area_sqm?.toString() || "",
      units_count: p.units_count?.toString() || "",
      floors: p.floors?.toString() || "",
      bedrooms: p.bedrooms?.toString() || "",
      bathrooms: p.bathrooms?.toString() || "",
      year_built: p.year_built?.toString() || "",
      completion_status: p.completion_status || "planning",
      expected_roi: p.expected_roi?.toString() || "",
      invested_amount: p.invested_amount?.toString() || "",
      amenities: (p.amenities || []).join(", "),
      published: p.published,
    });
    setImages(p.images || []);
    setOpen(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `investment-projects/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from("property-images").upload(path, file, {
          cacheControl: "3600",
          upsert: false,
        });
        if (error) throw error;
        const { data } = supabase.storage.from("property-images").getPublicUrl(path);
        urls.push(data.publicUrl);
      }
      setImages((prev) => [...prev, ...urls]);
    } catch (err) {
      console.error(err);
      toast({ title: "Upload failed", description: "Could not upload images", variant: "destructive" });
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const save = async () => {
    if (!form.title.trim() || !form.address.trim() || !form.city.trim()) {
      toast({ title: "Missing details", description: "Title, address and city are required", variant: "destructive" });
      return;
    }
    setSaving(true);
    const payload: any = {
      title: form.title.trim(),
      project_type: form.project_type,
      description: form.description.trim() || null,
      address: form.address.trim(),
      city: form.city.trim(),
      municipality: form.municipality.trim() || null,
      total_price: num(form.total_price),
      currency: form.currency,
      land_area_sqm: num(form.land_area_sqm),
      built_area_sqm: num(form.built_area_sqm),
      units_count: num(form.units_count),
      floors: num(form.floors),
      bedrooms: num(form.bedrooms),
      bathrooms: num(form.bathrooms),
      year_built: num(form.year_built),
      completion_status: form.completion_status,
      expected_roi: num(form.expected_roi),
      invested_amount: num(form.invested_amount) ?? 0,
      amenities: form.amenities.split(",").map((a) => a.trim()).filter(Boolean),
      images,
      published: form.published,
    };

    const { error } = editingId
      ? await supabase.from("investment_projects").update(payload).eq("id", editingId)
      : await supabase.from("investment_projects").insert({ ...payload, created_by: user?.id });

    setSaving(false);
    if (error) {
      console.error(error);
      toast({ title: "Error", description: "Could not save project", variant: "destructive" });
      return;
    }
    toast({ title: editingId ? "Project updated" : "Project created" });
    setOpen(false);
    load();
  };

  const remove = async (p: Project) => {
    if (!confirm(`Delete "${p.title}"?`)) return;
    const { error } = await supabase.from("investment_projects").delete().eq("id", p.id);
    if (error) {
      toast({ title: "Error", description: "Could not delete project", variant: "destructive" });
      return;
    }
    toast({ title: "Project deleted" });
    load();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Investment Projects</CardTitle>
          <CardDescription>Upload building, compound, villa and venue projects with full price, details and pictures</CardDescription>
        </div>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> New project
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading projects...</div>
        ) : projects.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No investment projects yet</div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 max-h-[600px] overflow-y-auto">
            {projects.map((p) => (
              <div key={p.id} className="rounded-lg border bg-muted/30 overflow-hidden">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={`${p.title} investment project`} loading="lazy" decoding="async" className="h-36 w-full object-cover" />
                ) : (
                  <div className="h-36 w-full flex items-center justify-center text-muted-foreground text-sm">No image</div>
                )}
                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium leading-tight">{p.title}</p>
                    <Badge variant={p.published ? "default" : "secondary"} className="capitalize shrink-0">
                      {p.published ? "Live" : "Hidden"}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground capitalize">{p.project_type} · {p.city}</p>
                  <p className="text-sm font-semibold">
                    {p.total_price ? `${p.currency} ${Number(p.total_price).toLocaleString()}` : "Price on request"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {p.floors ? `${p.floors} floors` : "—"}{p.units_count ? ` · ${p.units_count} apartments` : ""}
                  </p>
                  {p.total_price ? (
                    <div className="space-y-1">
                      <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary"
                          style={{ width: `${Math.min(100, (Number(p.invested_amount || 0) / Number(p.total_price)) * 100)}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Invested {p.currency} {Number(p.invested_amount || 0).toLocaleString()} · Available {p.currency} {Math.max(0, Number(p.total_price) - Number(p.invested_amount || 0)).toLocaleString()}
                      </p>
                    </div>
                  ) : null}
                  <div className="flex gap-1 pt-1">
                    <Button size="sm" variant="ghost" onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => openRequests(p)}>
                      <Users className="h-4 w-4 mr-1" />
                      <span className="text-xs">{requestCounts[p.id] || 0}</span>
                    </Button>
                    <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => remove(p)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit investment project" : "New investment project"}</DialogTitle>
            <DialogDescription>Buildings, compounds, villas and venues sold as a whole.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label>Title *</Label>
              <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} maxLength={150} />
            </div>
            <div>
              <Label>Project type</Label>
              <Select value={form.project_type} onValueChange={(v) => setForm({ ...form, project_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROJECT_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Completion status</Label>
              <Select value={form.completion_status} onValueChange={(v) => setForm({ ...form, completion_status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COMPLETION_STATUSES.map((t) => (
                    <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:col-span-2">
              <Label>Address *</Label>
              <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} maxLength={200} />
            </div>
            <div>
              <Label>City *</Label>
              <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} maxLength={100} />
            </div>
            <div>
              <Label>Municipality</Label>
              <Input value={form.municipality} onChange={(e) => setForm({ ...form, municipality: e.target.value })} maxLength={100} />
            </div>
            <div>
              <Label>Total price (whole property)</Label>
              <Input type="number" value={form.total_price} onChange={(e) => setForm({ ...form, total_price: e.target.value })} />
            </div>
            <div>
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="LBP">LBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Land area (m²)</Label>
              <Input type="number" value={form.land_area_sqm} onChange={(e) => setForm({ ...form, land_area_sqm: e.target.value })} />
            </div>
            <div>
              <Label>Built area (m²)</Label>
              <Input type="number" value={form.built_area_sqm} onChange={(e) => setForm({ ...form, built_area_sqm: e.target.value })} />
            </div>
            <div>
              <Label>Units</Label>
              <Input type="number" value={form.units_count} onChange={(e) => setForm({ ...form, units_count: e.target.value })} />
            </div>
            <div>
              <Label>Floors</Label>
              <Input type="number" value={form.floors} onChange={(e) => setForm({ ...form, floors: e.target.value })} />
            </div>
            <div>
              <Label>Bedrooms</Label>
              <Input type="number" value={form.bedrooms} onChange={(e) => setForm({ ...form, bedrooms: e.target.value })} />
            </div>
            <div>
              <Label>Bathrooms</Label>
              <Input type="number" value={form.bathrooms} onChange={(e) => setForm({ ...form, bathrooms: e.target.value })} />
            </div>
            <div>
              <Label>Year built</Label>
              <Input type="number" value={form.year_built} onChange={(e) => setForm({ ...form, year_built: e.target.value })} />
            </div>
            <div>
              <Label>Expected ROI (%)</Label>
              <Input type="number" value={form.expected_roi} onChange={(e) => setForm({ ...form, expected_roi: e.target.value })} />
            </div>
            <div>
              <Label>Amount invested so far</Label>
              <Input type="number" value={form.invested_amount} onChange={(e) => setForm({ ...form, invested_amount: e.target.value })} />
            </div>
            {form.total_price.trim() !== "" && (
              <div className="sm:col-span-2 rounded-md border bg-muted/30 p-3 text-sm">
                <span className="font-medium">Still available: </span>
                {form.currency} {Math.max(0, Number(form.total_price || 0) - Number(form.invested_amount || 0)).toLocaleString()}
              </div>
            )}
            <div className="sm:col-span-2">
              <Label>Amenities (comma separated)</Label>
              <Input value={form.amenities} onChange={(e) => setForm({ ...form, amenities: e.target.value })} maxLength={500} />
            </div>
            <div className="sm:col-span-2">
              <Label>Description</Label>
              <Textarea rows={4} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={4000} />
            </div>

            <div className="sm:col-span-2 space-y-2">
              <Label>Pictures</Label>
              <div className="flex flex-wrap gap-2">
                {images.map((url) => (
                  <div key={url} className="relative">
                    <img src={url} alt="Investment project" loading="lazy" decoding="async" className="h-20 w-20 rounded object-cover" />
                    <button
                      type="button"
                      onClick={() => setImages((prev) => prev.filter((u) => u !== url))}
                      className="absolute -top-2 -right-2 rounded-full bg-destructive text-destructive-foreground p-1"
                      aria-label="Remove image"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                <label className="h-20 w-20 rounded border border-dashed flex items-center justify-center cursor-pointer text-muted-foreground">
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                  <input type="file" accept="image/*" multiple className="hidden" onChange={handleUpload} disabled={uploading} />
                </label>
              </div>
            </div>

            <div className="sm:col-span-2 flex items-center gap-2">
              <Switch id="published" checked={form.published} onCheckedChange={(v) => setForm({ ...form, published: v })} />
              <Label htmlFor="published">Published</Label>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving || uploading}>
              {saving ? "Saving..." : editingId ? "Save changes" : "Create project"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
