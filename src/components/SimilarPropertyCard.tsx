import { Link } from "react-router-dom";
import { Bed, Bath, Square, ChevronLeft, ChevronRight } from "lucide-react";
import { useSwipeCarousel } from "@/hooks/useSwipeCarousel";

interface SimilarPropertyCardProps {
  property: {
    id: string;
    price: number | null;
    rental_price?: number | null;
    listing_type: string;
    bedrooms: number;
    bathrooms: number;
    square_meters: number;
    images: string[];
  };
}

const SimilarPropertyCard = ({ property }: SimilarPropertyCardProps) => {
  const images = property.images?.length ? property.images : [];
  const hasMultiple = images.length > 1;
  const { currentIndex, goTo, swipeOffset, onTouchStart, onTouchMove, onTouchEnd, wasSwipe } = useSwipeCarousel(images.length);

  const formatPrice = () => {
    if (property.listing_type === 'rent') {
      const rp = property.rental_price ?? property.price;
      return rp != null ? `$${rp.toLocaleString()}/mo` : 'Price on request';
    }
    return property.price != null ? `$${property.price.toLocaleString()}` : 'Price on request';
  };

  const goLeft = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); goTo("left"); };
  const goRight = (e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); goTo("right"); };

  return (
    <Link
      to={`/property/${property.id}`}
      onClick={(e) => { if (wasSwipe()) e.preventDefault(); }}
      className="block h-full"
    >
      <div className="group h-full flex flex-col rounded-lg overflow-hidden border bg-muted/30 hover:shadow-md transition-shadow">
        <div
          className="relative aspect-[4/3] bg-muted overflow-hidden touch-pan-y"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {images.length > 0 ? (
            <div
              className="flex h-full"
              style={{
                width: `${images.length * 100}%`,
                transform: `translateX(calc(-${currentIndex * (100 / images.length)}% + ${swipeOffset}px))`,
                transition: swipeOffset ? 'none' : 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
              }}
            >
              {images.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`image ${i + 1}`}
                  className="h-full object-cover flex-shrink-0"
                  style={{ width: `${100 / images.length}%` }}
                  loading="lazy"
                  decoding="async"
                />
              ))}
            </div>
          ) : (
            <div className="w-full h-full bg-muted" />
          )}
          {hasMultiple && (
            <>
              <button
                onClick={goLeft}
                className="absolute left-1.5 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={goRight}
                className="absolute right-1.5 top-1/2 -translate-y-1/2 bg-background/80 hover:bg-background text-foreground rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                aria-label="Next image"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, i) => (
                  <span
                    key={i}
                    className={`w-1 h-1 rounded-full transition-colors ${i === currentIndex ? 'bg-background' : 'bg-background/50'}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
        <div className="p-3 flex flex-col gap-2">
          <div className="text-base font-semibold text-primary truncate">{formatPrice()}</div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <div className="flex items-center"><Bed className="w-3.5 h-3.5 mr-1" />{property.bedrooms}</div>
            <div className="flex items-center"><Bath className="w-3.5 h-3.5 mr-1" />{property.bathrooms}</div>
            <div className="flex items-center"><Square className="w-3.5 h-3.5 mr-1" />{property.square_meters}m²</div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default SimilarPropertyCard;