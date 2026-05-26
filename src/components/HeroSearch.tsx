import { useState, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Search } from 'lucide-react';
import TypewriterSearch from './TypewriterSearch';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';

const DrawSearchArea = lazy(() => import('./DrawSearchArea'));

const HeroSearch = () => {
  const [listingMode, setListingMode] = useState<'buy' | 'rent'>('buy');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDrawMap, setShowDrawMap] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const [drawnPolygon, setDrawnPolygon] = useState<{ latitude: number; longitude: number }[] | null>(null);
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleSearch = () => {
    const route = listingMode === 'buy' ? '/purchase' : '/rent';
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    if (drawnPolygon) params.set('polygon', JSON.stringify(drawnPolygon));
    const qs = params.toString();
    navigate(`${route}${qs ? `?${qs}` : ''}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleDrawComplete = (polygon: { latitude: number; longitude: number }[]) => {
    setDrawnPolygon(polygon);
    // Navigate immediately when area is drawn
    const route = listingMode === 'buy' ? '/purchase' : '/rent';
    const params = new URLSearchParams();
    if (searchQuery) params.set('search', searchQuery);
    params.set('polygon', JSON.stringify(polygon));
    const qs = params.toString();
    navigate(`${route}${qs ? `?${qs}` : ''}`);
  };

  return (
    <div className="w-full max-w-2xl mx-auto relative z-[60]">
      {/* Buy / Rent Toggle */}
      <div className="flex mb-6 bg-muted/60 backdrop-blur-sm rounded-xl p-1.5 max-w-xs mx-auto">
        <button
          onClick={() => setListingMode('buy')}
          className={cn(
            'flex-1 py-2.5 px-6 rounded-lg text-sm font-semibold transition-all duration-300',
            listingMode === 'buy'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Buy
        </button>
        <button
          onClick={() => setListingMode('rent')}
          className={cn(
            'flex-1 py-2.5 px-6 rounded-lg text-sm font-semibold transition-all duration-300',
            listingMode === 'rent'
              ? 'bg-primary text-primary-foreground shadow-md'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Rent
        </button>
      </div>

      {/* Location label */}
      <p className="text-sm text-muted-foreground mb-2 ml-1 font-medium">Enter location</p>

      {/* Search bar */}
      <div className="flex gap-3" onKeyDown={handleKeyDown}>
        <div className="flex-1 relative">
          <TypewriterSearch
            value={searchQuery}
            onChange={setSearchQuery}
            onFocus={() => setInputFocused(true)}
            onBlur={() => {
              // Small delay so tap on dropdown registers before it hides
              setTimeout(() => setInputFocused(false), 200);
            }}
          />

          {/* Dropdown with "Draw your search area" when input is focused on mobile */}
          {isMobile && inputFocused && !showDrawMap && (
            <div className="absolute left-0 right-0 top-full mt-1 z-[100] bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                onClick={() => {
                  setShowDrawMap(true);
                  setInputFocused(false);
                }}
                className="w-full py-3.5 px-4 text-sm font-medium text-primary hover:bg-accent transition-colors flex items-center gap-3"
              >
                <span className="inline-block w-5 h-5 rounded-full border-2 border-primary/50 relative flex-shrink-0">
                  <span className="absolute inset-1 rounded-full bg-primary/30" />
                </span>
                Draw your search area
              </button>
            </div>
          )}
        </div>
        <Button
          onClick={handleSearch}
          size="lg"
          className="h-14 px-6 rounded-xl text-base font-semibold"
        >
          <Search className="w-5 h-5 mr-2" />
          Search
        </Button>
      </div>

      {/* Mobile draw map */}
      {isMobile && showDrawMap && (
        <div className="mt-4">
          <Suspense fallback={<div className="h-[340px] rounded-xl bg-muted animate-pulse mt-4" />}>
            <DrawSearchArea onDrawComplete={handleDrawComplete} />
          </Suspense>
        </div>
      )}
    </div>
  );
};

export default HeroSearch;
