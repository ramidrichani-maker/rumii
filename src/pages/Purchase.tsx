import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { ArrowLeft, Home, Building, Trees, Waves, Mountain, Crown, Building2, Calendar, Tractor } from "lucide-react";
import { Link } from "react-router-dom";

const propertyTypes = [
  { id: "flat", name: "Flat", icon: Building },
  { id: "villa", name: "Villa", icon: Home },
  { id: "land", name: "Land", icon: Trees },
  { id: "beach-house", name: "Beach House", icon: Waves },
  { id: "chalet", name: "Chalet", icon: Mountain },
  { id: "penthouse", name: "Penthouse", icon: Crown },
  { id: "rooftop", name: "Rooftop", icon: Building2 },
  { id: "venue", name: "Venue", icon: Calendar },
  { id: "farm", name: "Farm", icon: Tractor },
];

const Purchase = () => {
  const [selectedPropertyTypes, setSelectedPropertyTypes] = useState<string[]>([]);
  const [minSquareMeters, setMinSquareMeters] = useState([50]);
  const [minBedrooms, setMinBedrooms] = useState(1);

  const togglePropertyType = (typeId: string) => {
    setSelectedPropertyTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(id => id !== typeId)
        : [...prev, typeId]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>
          <h1 className="text-4xl font-bold text-foreground mb-2">Properties for Purchase</h1>
          <p className="text-lg text-muted-foreground">Find and filter properties that match your buying criteria</p>
        </div>

        {/* Filters Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-2xl">Filter Properties</CardTitle>
          </CardHeader>
          <CardContent className="space-y-8">
            {/* Property Type Filter */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground">Property Type</h3>
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
                {propertyTypes.map((type) => {
                  const Icon = type.icon;
                  const isSelected = selectedPropertyTypes.includes(type.id);
                  return (
                    <button
                      key={type.id}
                      onClick={() => togglePropertyType(type.id)}
                      className={`p-4 rounded-lg border-2 transition-all duration-200 hover:scale-105 ${
                        isSelected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background hover:border-primary/50"
                      }`}
                    >
                      <Icon className="w-6 h-6 mx-auto mb-2" />
                      <span className="text-xs font-medium">{type.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Square Meters Filter */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground">
                Minimum Square Meters: {minSquareMeters[0]} m²
              </h3>
              <div className="px-4">
                <Slider
                  value={minSquareMeters}
                  onValueChange={setMinSquareMeters}
                  max={500}
                  min={50}
                  step={10}
                  className="w-full"
                />
                <div className="flex justify-between text-sm text-muted-foreground mt-2">
                  <span>50 m²</span>
                  <span>500 m²</span>
                </div>
              </div>
            </div>

            {/* Amenities Filter */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground">Amenities</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
                {['Pool', 'Gym', 'Parking', 'Garden', 'Balcony', 'AC'].map((amenity) => (
                  <label key={amenity} className="flex items-center space-x-2 cursor-pointer">
                    <input type="checkbox" className="rounded" />
                    <span className="text-sm">{amenity}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Bedrooms Filter */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-foreground">
                Minimum Bedrooms: {minBedrooms}
              </h3>
              <div className="flex gap-3">
                {[1, 2, 3, 4, 5].map((bedroom) => (
                  <button
                    key={bedroom}
                    onClick={() => setMinBedrooms(bedroom)}
                    className={`w-12 h-12 rounded-lg border-2 font-semibold transition-all duration-200 ${
                      minBedrooms === bedroom
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background hover:border-primary/50"
                    }`}
                  >
                    {bedroom}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
              <Button size="lg" className="flex-1">
                Apply Filters
              </Button>
              <Button
                variant="outline"
                size="lg"
                onClick={() => {
                  setSelectedPropertyTypes([]);
                  setMinSquareMeters([50]);
                  setMinBedrooms(1);
                }}
              >
                Clear All
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Active Filters Display */}
        {(selectedPropertyTypes.length > 0 || minSquareMeters[0] > 50 || minBedrooms > 1) && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 text-foreground">Active Filters:</h3>
            <div className="flex flex-wrap gap-2">
              {selectedPropertyTypes.map((typeId) => {
                const type = propertyTypes.find(t => t.id === typeId);
                return (
                  <Badge key={typeId} variant="secondary" className="px-3 py-1">
                    {type?.name}
                  </Badge>
                );
              })}
              {minSquareMeters[0] > 50 && (
                <Badge variant="secondary" className="px-3 py-1">
                  Min {minSquareMeters[0]} m²
                </Badge>
              )}
              {minBedrooms > 1 && (
                <Badge variant="secondary" className="px-3 py-1">
                  Min {minBedrooms} bedrooms
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Results Placeholder */}
        <div className="text-center py-12">
          <div className="text-6xl text-muted-foreground/30 mb-4">🏠</div>
          <h3 className="text-xl font-semibold text-foreground mb-2">Properties will appear here</h3>
          <p className="text-muted-foreground">Apply filters above to find properties that match your criteria</p>
        </div>
      </div>
    </div>
  );
};

export default Purchase;