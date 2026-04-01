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
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const handleSearch = () => {
    const route = listingMode === 'buy' ? '/purchase' : '/rent';
    const params = searchQuery ? `?search=${encodeURIComponent(searchQuery)}` : '';
    navigate(`${route}${params}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const handleDrawComplete = (polygon: { latitude: number; longitude: number }[]) => {
    const route = listingMode === 'buy' ? '/purchase' : '/rent';
    navigate(route, { state: { drawnPolygon: polygon } });
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
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
        <div className="flex-1">
          <TypewriterSearch
            value={searchQuery}
            onChange={setSearchQuery}
          />
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

      {/* Mobile draw area option */}
      {isMobile && (
        <div className="mt-4">
          {!showDrawMap ? (
            <button
              onClick={() => setShowDrawMap(true)}
              className="w-full py-3 text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center justify-center gap-2"
            >
              <span className="inline-block w-5 h-5 rounded-full border-2 border-primary/50 relative">
                <span className="absolute inset-1 rounded-full bg-primary/30" />
              </span>
              Draw your search area
            </button>
          ) : (
            <Suspense fallback={<div className="h-[340px] rounded-xl bg-muted animate-pulse mt-4" />}>
              <DrawSearchArea onDrawComplete={handleDrawComplete} />
            </Suspense>
          )}
        </div>
      )}
    </div>
  );
};

export default HeroSearch;
