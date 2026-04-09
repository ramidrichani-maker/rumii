import React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSwipeCarousel } from "@/hooks/useSwipeCarousel";

interface FullscreenImageViewerProps {
  images: string[];
  initialIndex: number;
  onClose: () => void;
}

const FullscreenImageViewer: React.FC<FullscreenImageViewerProps> = ({ images, initialIndex, onClose }) => {
  const carousel = useSwipeCarousel(images.length);

  React.useEffect(() => {
    if (initialIndex > 0) carousel.setCurrentIndex(initialIndex);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[9999] bg-black flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="flex items-center justify-between p-3 text-white">
        <span className="text-sm font-medium">
          {carousel.currentIndex + 1} / {images.length}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="text-white hover:bg-white/20 h-8 w-8"
          onClick={onClose}
        >
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Images */}
      <div
        className="flex-1 overflow-hidden touch-pan-y"
        onTouchStart={carousel.onTouchStart}
        onTouchMove={carousel.onTouchMove}
        onTouchEnd={carousel.onTouchEnd}
      >
        <div
          className="flex h-full"
          style={{
            width: `${images.length * 100}%`,
            transform: `translateX(calc(-${carousel.currentIndex * (100 / images.length)}% + ${carousel.swipeOffset}px))`,
            transition: carousel.swipeOffset ? "none" : "transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          {images.map((img, i) => (
            <div
              key={i}
              className="h-full flex items-center justify-center"
              style={{ width: `${100 / images.length}%` }}
            >
              <img
                src={img}
                alt={`Photo ${i + 1}`}
                className="max-w-full max-h-full object-contain"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Dots */}
      {images.length > 1 && (
        <div className="flex justify-center gap-1.5 py-3">
          {images.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === carousel.currentIndex ? "w-4 bg-white" : "w-1.5 bg-white/40"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default FullscreenImageViewer;
