import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ScrollReveal from "@/components/ScrollReveal";

const bedroomOptions = [
  { label: "No min", value: "" },
  { label: "Studio", value: "Studio" },
  { label: "1", value: "1" },
  { label: "2", value: "2" },
  { label: "3", value: "3" },
  { label: "4", value: "4" },
  { label: "5", value: "5" },
  { label: "6", value: "6" },
  { label: "7", value: "7" },
  { label: "8", value: "8" },
  { label: "9", value: "9" },
  { label: "10+", value: "10" },
];

const generatePriceOptions = (): { label: string; value: string }[] => {
  const options: { label: string; value: string }[] = [
    { label: "No max", value: "" },
  ];
  const prices: number[] = [];
  for (let p = 10000; p < 250000; p += 10000) prices.push(p);
  for (let p = 250000; p < 500000; p += 25000) prices.push(p);
  for (let p = 500000; p < 1000000; p += 50000) prices.push(p);
  for (let p = 1000000; p < 3000000; p += 100000) prices.push(p);
  for (let p = 3000000; p < 5000000; p += 250000) prices.push(p);
  for (let p = 5000000; p <= 10000000; p += 500000) prices.push(p);
  prices.forEach((v) => {
    let label: string;
    if (v >= 1000000) label = `$${(v / 1000000).toFixed(v % 1000000 === 0 ? 0 : 1)}M`;
    else if (v >= 1000) label = `$${(v / 1000).toFixed(0)}K`;
    else label = `$${v}`;
    options.push({ label, value: String(v) });
  });
  return options;
};

const priceOptions = generatePriceOptions();

const NewHomes = () => {
  const navigate = useNavigate();
  const [searchArea, setSearchArea] = useState("");
  const [minBeds, setMinBeds] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const handleSearch = () => {
    const currentYear = new Date().getFullYear();
    const minYearBuilt = currentYear - 5;

    const params = new URLSearchParams();
    if (searchArea) params.set("search", searchArea);
    if (minBeds) params.set("minBeds", minBeds);
    if (maxPrice) params.set("maxPrice", maxPrice);
    params.set("minYearBuilt", String(minYearBuilt));

    navigate(`/purchase?${params.toString()}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-16">
        <ScrollReveal animation="fade-up">
          <div className="max-w-2xl mx-auto text-center mb-10">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              New homes for sale
            </h1>
            <p className="text-lg text-muted-foreground">
              Search new-build houses, flats, and developments across Lebanon
            </p>
          </div>
        </ScrollReveal>

        <ScrollReveal animation="fade-up" delay={150}>
          <div className="max-w-2xl mx-auto bg-card border border-border rounded-xl p-6 shadow-sm space-y-5">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1.5">
                Search area
              </label>
              <Input
                placeholder="e.g. Beirut, Jounieh, Byblos..."
                value={searchArea}
                onChange={(e) => setSearchArea(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Min beds
                </label>
                <Select value={minBeds} onValueChange={setMinBeds}>
                  <SelectTrigger>
                    <SelectValue placeholder="No min" />
                  </SelectTrigger>
                  <SelectContent>
                    {bedroomOptions.map((opt) => (
                      <SelectItem key={opt.value || "nomin"} value={opt.value || "none"}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1.5">
                  Max price
                </label>
                <Select value={maxPrice} onValueChange={setMaxPrice}>
                  <SelectTrigger>
                    <SelectValue placeholder="No max" />
                  </SelectTrigger>
                  <SelectContent>
                    {priceOptions.map((opt) => (
                      <SelectItem key={opt.value || "nomax"} value={opt.value || "none"}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleSearch} className="w-full" size="lg">
              Search
            </Button>
          </div>
        </ScrollReveal>
      </div>
    </div>
  );
};

export default NewHomes;
