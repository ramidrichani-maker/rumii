import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Building2, TrendingUp } from "lucide-react";

const BUDGETS = [
  { key: "200k", label: "Less than $200k", max: 200000 },
  { key: "500k", label: "Less than $500k", max: 500000 },
  { key: "900k", label: "Less than $900k", max: 900000 },
  { key: "1m", label: "$1 million +", max: Number.POSITIVE_INFINITY },
];

interface Prop {
  id: string;
  address: string;
  city: string;
  property_type: string;
  listing_type: string;
  price: number | null;
  rental_price: number | null;
  bedrooms: number;
  bathrooms: number;
  square_meters: number;
  images: string[] | null;
}

interface Project {
  id: string;
  title: string;
  project_type: string;
  description: string | null;
  city: string;
  address: string;
  total_price: number | null;
  invested_amount: number;
  expected_roi: number | null;
  units_count: number | null;
  floors: number | null;
  images: string[] | null;
  currency: string;
}

const money = (n: number) => `$${Math.round(n).toLocaleString()}`;

const InvestmentConsulting = () => {
  const [budget, setBudget] = useState<typeof BUDGETS[number] | null>(null);
  const [mode, setMode] = useState<"income" | "construction" | null>(null);
  const [properties, setProperties] = useState<Prop[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [equity, setEquity] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!budget || !mode) return;
    const load = async () => {
      setLoading(true);
      if (mode === "income") {
        const { data } = await supabase
          .from("properties")
          .select("id, address, city, property_type, listing_type, price, rental_price, bedrooms, bathrooms, square_meters, images")
          .eq("status", "approved")
          .eq("investment_worthy", true)
          .is("parent_property_id", null);
        const list = ((data || []) as unknown as Prop[]).filter((p) => {
          const price = p.price ?? 0;
          return budget.max === Number.POSITIVE_INFINITY ? price >= 1000000 : price > 0 && price <= budget.max;
        });
        setProperties(list);
      } else {
        const { data } = await supabase
          .from("investment_projects")
          .select("id, title, project_type, description, city, address, total_price, invested_amount, expected_roi, units_count, floors, images, currency")
          .eq("published", true);
        setProjects((data || []) as unknown as Project[]);
      }
      setLoading(false);
    };
    load();
  }, [budget, mode]);

  const grossYield = (p: Prop) => {
    if (!p.price || !p.rental_price) return null;
    return ((Number(p.rental_price) * 12) / Number(p.price)) * 100;
  };

  const avgYield = useMemo(() => {
    const ys = properties.map(grossYield).filter((y): y is number => y !== null);
    if (!ys.length) return null;
    return ys.reduce((a, b) => a + b, 0) / ys.length;
  }, [properties]);

  const reset = () => {
    setMode(null);
    setProperties([]);
    setProjects([]);
  };

  return (
    <div className="min-h-screen">
      <div className="container mx-auto px-4 py-10 max-w-5xl">
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight mb-2">Investment consulting</h1>
        <p className="text-muted-foreground mb-8">A few quick questions and we'll match you with the right opportunities.</p>

        {/* Step 1 */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">How much are you willing to invest?</CardTitle>
            <CardDescription>Select a budget range to continue.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {BUDGETS.map((b) => (
              <Button
                key={b.key}
                variant={budget?.key === b.key ? "default" : "outline"}
                className="h-16 whitespace-normal"
                onClick={() => { setBudget(b); reset(); }}
              >
                {b.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Step 2 */}
        {budget && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">What kind of return are you after?</CardTitle>
              <CardDescription>Choose the strategy that fits you best.</CardDescription>
            </CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <button
                onClick={() => setMode("income")}
                className={`text-left rounded-lg border p-5 transition-colors hover:bg-accent ${mode === "income" ? "border-primary bg-accent" : "border-border"}`}
              >
                <TrendingUp className="h-5 w-5 mb-2 text-primary" />
                <p className="font-medium mb-1">Immediate income</p>
                <p className="text-sm text-muted-foreground">Ready properties that generate rental income from day one, at an average market yield.</p>
              </button>
              <button
                onClick={() => setMode("construction")}
                className={`text-left rounded-lg border p-5 transition-colors hover:bg-accent ${mode === "construction" ? "border-primary bg-accent" : "border-border"}`}
              >
                <Building2 className="h-5 w-5 mb-2 text-primary" />
                <p className="font-medium mb-1">Construction projects</p>
                <p className="text-sm text-muted-foreground">Invest equity into development projects for a higher potential return at completion.</p>
              </button>
            </CardContent>
          </Card>
        )}

        {/* Step 3 */}
        {budget && mode && (
          <div>
            <div className="flex items-center gap-3 mb-4">
              <Button variant="ghost" size="sm" onClick={reset}>
                <ArrowLeft className="h-4 w-4 mr-1" /> Change strategy
              </Button>
              <Badge variant="secondary">{budget.label}</Badge>
              {mode === "income" && avgYield !== null && (
                <Badge variant="outline">Average yield {avgYield.toFixed(1)}%</Badge>
              )}
            </div>

            {loading ? (
              <p className="text-muted-foreground py-8 text-center">Loading opportunities...</p>
            ) : mode === "income" ? (
              properties.length === 0 ? (
                <p className="text-muted-foreground py-8 text-center">No investment properties match this budget yet.</p>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {properties.map((p) => {
                    const y = grossYield(p);
                    return (
                      <Link key={p.id} to={`/property/${p.id}`} className="group rounded-lg border border-border overflow-hidden bg-card hover:shadow-md transition-shadow">
                        {p.images?.[0] && (
                          <img src={p.images[0]} alt={`${p.property_type} in ${p.city}`} loading="lazy" decoding="async" className="w-full h-40 object-cover" />
                        )}
                        <div className="p-4">
                          <p className="font-medium">{p.city}</p>
                          <p className="text-sm text-muted-foreground capitalize mb-2">{p.property_type}</p>
                          <p className="font-semibold">{p.price ? money(Number(p.price)) : "Price on request"}</p>
                          <p className="text-sm text-muted-foreground">
                            {p.bedrooms} bd · {p.bathrooms} ba · {p.square_meters} m²
                          </p>
                          {y !== null && <Badge className="mt-3" variant="secondary">Est. yield {y.toFixed(1)}%</Badge>}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )
            ) : projects.length === 0 ? (
              <p className="text-muted-foreground py-8 text-center">No construction projects are open for investment right now.</p>
            ) : (
              <div className="space-y-5">
                {projects.map((pr) => {
                  const total = Number(pr.total_price || 0);
                  const invested = Number(pr.invested_amount || 0);
                  const remaining = Math.max(total - invested, 0);
                  const soldPct = total > 0 ? (invested / total) * 100 : 0;
                  const pct = Number(equity[pr.id] ?? "");
                  const cost = total > 0 && pct > 0 ? (total * pct) / 100 : null;
                  const maxPct = total > 0 ? (remaining / total) * 100 : 0;
                  return (
                    <Card key={pr.id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{pr.title}</CardTitle>
                        <CardDescription className="capitalize">
                          {pr.project_type} · {pr.city}
                          {pr.expected_roi ? ` · Expected ROI ${pr.expected_roi}%` : ""}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {pr.images?.[0] && (
                          <img src={pr.images[0]} alt={pr.title} loading="lazy" decoding="async" className="w-full h-48 object-cover rounded-md" />
                        )}
                        {pr.description && <p className="text-sm text-muted-foreground">{pr.description}</p>}
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Equity sold: {money(invested)} ({soldPct.toFixed(0)}%)</span>
                            <span>Available: {money(remaining)} ({Math.max(100 - soldPct, 0).toFixed(0)}%)</span>
                          </div>
                          <Progress value={Math.min(soldPct, 100)} />
                          <p className="text-xs text-muted-foreground mt-1">Total project value {money(total)}</p>
                        </div>
                        <div className="flex flex-wrap items-end gap-3">
                          <div>
                            <label className="text-sm text-muted-foreground block mb-1" htmlFor={`eq-${pr.id}`}>Equity you want (%)</label>
                            <Input
                              id={`eq-${pr.id}`}
                              type="number"
                              min={0}
                              max={100}
                              value={equity[pr.id] ?? ""}
                              onChange={(e) => setEquity((prev) => ({ ...prev, [pr.id]: e.target.value }))}
                              className="w-32"
                              placeholder="10"
                            />
                          </div>
                          <div className="text-sm">
                            <p className="text-muted-foreground">Your investment</p>
                            <p className="font-semibold text-base">{cost !== null ? money(cost) : "—"}</p>
                            {pct > maxPct && <p className="text-xs text-destructive">Only {maxPct.toFixed(0)}% is still available.</p>}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InvestmentConsulting;