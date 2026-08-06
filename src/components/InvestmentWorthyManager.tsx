import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Search, RefreshCw } from "lucide-react";

interface Row {
  id: string;
  address: string;
  city: string;
  property_type: string;
  listing_type: string;
  price: number | null;
  rental_price: number | null;
  status: string;
  property_code: number;
  investment_worthy: boolean;
}

export const InvestmentWorthyManager = () => {
  const [rows, setRows] = useState<Row[]>([]);
  const [query, setQuery] = useState("");
  const [onlyMarked, setOnlyMarked] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("properties")
      .select("id, address, city, property_type, listing_type, price, rental_price, status, property_code, investment_worthy")
      .is("parent_property_id", null)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Error", description: "Failed to load properties", variant: "destructive" });
    } else {
      setRows((data || []) as unknown as Row[]);
    }
    setIsLoading(false);
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (onlyMarked && !r.investment_worthy) return false;
      if (!q) return true;
      return (
        r.address.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        String(r.property_code).includes(q)
      );
    });
  }, [rows, query, onlyMarked]);

  const toggle = async (row: Row, value: boolean) => {
    setSavingId(row.id);
    const { error } = await supabase
      .from("properties")
      .update({ investment_worthy: value } as any)
      .eq("id", row.id);
    setSavingId(null);
    if (error) {
      toast({ title: "Error", description: "Could not update property", variant: "destructive" });
      return;
    }
    setRows((prev) => prev.map((r) => (r.id === row.id ? { ...r, investment_worthy: value } : r)));
    toast({ title: value ? "Marked as investment worthy" : "Removed from investment worthy" });
  };

  const markedCount = rows.filter((r) => r.investment_worthy).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Investment Worthy Properties</CardTitle>
        <CardDescription>
          Mark any listed property as investment worthy. {markedCount} currently marked.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by address, city or code..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Switch checked={onlyMarked} onCheckedChange={setOnlyMarked} id="only-marked" />
            <label htmlFor="only-marked">Only marked</label>
          </div>
          <Button variant="outline" size="icon" onClick={load} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading properties...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No properties found</div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Investment worthy</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-sm">{r.property_code}</TableCell>
                    <TableCell>
                      <p className="font-medium">{r.address}</p>
                      <p className="text-sm text-muted-foreground">{r.city}</p>
                    </TableCell>
                    <TableCell className="capitalize text-sm">
                      {r.property_type}
                      <p className="text-muted-foreground capitalize">{r.listing_type}</p>
                    </TableCell>
                    <TableCell>
                      {r.listing_type === "rent"
                        ? r.rental_price
                          ? `$${Number(r.rental_price).toLocaleString()}/mo`
                          : "N/A"
                        : r.price
                        ? `$${Number(r.price).toLocaleString()}`
                        : "N/A"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === "approved" ? "default" : "secondary"} className="capitalize">
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={r.investment_worthy}
                        disabled={savingId === r.id}
                        onCheckedChange={(v) => toggle(r, v)}
                        aria-label="Toggle investment worthy"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
