import { useState } from 'react';
import { Search, MapPin, User, Briefcase } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const radiusOptions = [
  { value: '0.2', label: '+0.2 km' },
  { value: '0.5', label: '+0.5 km' },
  { value: '1', label: '+1 km' },
  { value: '2', label: '+2 km' },
  { value: '3', label: '+3 km' },
  { value: '5', label: '+5 km' },
  { value: '10', label: '+10 km' },
];

const FindAgents = () => {
  const [location, setLocation] = useState('');
  const [radius, setRadius] = useState('1');
  const [agentName, setAgentName] = useState('');
  const [agentType, setAgentType] = useState('');

  const handleSearch = () => {
    // Search logic placeholder
    console.log({ location, radius, agentName, agentType });
  };

  return (
    <main className="min-h-screen">
      {/* Hero Section */}
      <section className="py-16 md:py-24 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground leading-tight mb-10">
            Discover top local estate agents across the Middle East and choose the right one to sell your home with confidence.
          </h1>

          {/* Search Form */}
          <div className="bg-card border border-border rounded-xl p-6 md:p-8 shadow-sm space-y-5 text-left">
            {/* Location */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Location</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Enter a city, area, or governorate..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Search Radius */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Search Radius</Label>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="w-full justify-between font-normal">
                    {radiusOptions.find(r => r.value === radius)?.label || 'Select radius'}
                    <span className="text-muted-foreground text-xs">▼</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width]">
                  {radiusOptions.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => setRadius(option.value)}
                      className={radius === option.value ? 'bg-accent' : ''}
                    >
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Agent Name */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">
                Agent Name <span className="text-muted-foreground font-normal">(optional)</span>
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by agent name..."
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Agent Type */}
            <div className="space-y-2">
              <Label className="text-sm font-semibold text-foreground">Agent Type</Label>
              <Select value={agentType} onValueChange={setAgentType}>
                <SelectTrigger className="w-full">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                    <SelectValue placeholder="Select agent type" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="sales">Sales</SelectItem>
                  <SelectItem value="rent_out">Rent out</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Search Button */}
            <Button onClick={handleSearch} className="w-full mt-2" size="lg">
              <Search className="h-4 w-4 mr-2" />
              Search Agents
            </Button>
          </div>
        </div>
      </section>
    </main>
  );
};

export default FindAgents;
