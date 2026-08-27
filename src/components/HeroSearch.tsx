import { useState, useCallback, lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import TypewriterSearch from './TypewriterSearch';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import searchIconAsset from '@/assets/search_icon.png.asset.json';

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

  const handlePolygonChange = useCallback(
    (polygon: { latitude: number; longitude: number }[] | null) => {
      setDrawnPolygon(polygon);
    },
    []
  );

  return (
    <div className="w-[95%] mx-auto md:w-auto md:mx-[4.5rem] relative z-[60]">
      {/* Search bar */}
      <div className="relative" onKeyDown={handleKeyDown}>
        <div className="flex-1 relative">
          <TypewriterSearch
            value={searchQuery}
            onChange={(v) => {
              setSearchQuery(v);
              if (showDrawMap) setShowDrawMap(false);
            }}
            onFocus={() => setInputFocused(true)}
            onBlur={() => {
              // Small delay so tap on dropdown registers before it hides
              setTimeout(() => setInputFocused(false), 200);
            }}
          />

          {/* Dropdown with "Draw your search area" when input is focused */}
          {inputFocused && !showDrawMap && (
            <div className="absolute left-0 right-0 top-full mt-1 z-[100] bg-card border border-border rounded-xl shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              <button
                onClick={() => {
                  setShowDrawMap(true);
                  setInputFocused(false);
                }}
                className="w-full py-3 px-3 text-xs font-medium text-primary hover:bg-accent transition-colors flex items-center gap-2 whitespace-nowrap"
              >
                <span className="inline-block w-4 h-4 rounded-full border-2 border-primary/50 relative flex-shrink-0">
                  <span className="absolute inset-0.5 rounded-full bg-primary/30" />
                </span>
                Draw your search area
              </button>
            </div>
          )}
        </div>
        <button
          onClick={searchQuery ? () => setSearchQuery('') : handleSearch}
          aria-label={searchQuery ? 'Clear search' : 'Search'}
          className="absolute bottom-0 right-0 h-20 w-20 md:h-24 md:w-24 flex items-center justify-center hover:opacity-60 transition-opacity duration-200"
        >
          <SearchToXIcon active={!!searchQuery} />
        </button>
      </div>

      {/* Buy / Rent Toggle */}
      <div className="relative flex mt-6 max-w-xs mx-auto">
        <button
          onClick={() => setListingMode('buy')}
          className={cn(
            'flex-1 py-2.5 px-6 text-sm font-semibold transition-colors duration-300',
            listingMode === 'buy' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Buy
        </button>
        <button
          onClick={() => setListingMode('rent')}
          className={cn(
            'flex-1 py-2.5 px-6 text-sm font-semibold transition-colors duration-300',
            listingMode === 'rent' ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
        >
          Rent
        </button>
        <span
          className="absolute bottom-0 h-[1.5px] bg-foreground transition-transform duration-300 ease-out"
          style={{ left: 0, width: '50%', transform: listingMode === 'buy' ? 'translateX(0%)' : 'translateX(100%)' }}
        />
      </div>

      {/* Draw map */}
      {showDrawMap && (
        <div className="mt-4 relative">
          <button
            type="button"
            onClick={() => setShowDrawMap(false)}
            aria-label="Close draw search area"
            className="absolute top-2 right-2 z-[110] h-8 w-8 rounded-full bg-background/90 backdrop-blur-sm border border-border shadow-md flex items-center justify-center hover:bg-background transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <Suspense fallback={<div className="h-[340px] rounded-xl bg-muted animate-pulse" />}>
            <DrawSearchArea onDrawComplete={handleDrawComplete} onPolygonChange={handlePolygonChange} />
          </Suspense>
        </div>
      )}
    </div>
  );
};

export default HeroSearch;
