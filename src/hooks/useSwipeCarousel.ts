import { useState, useRef, useCallback, TouchEvent } from "react";

export function useSwipeCarousel(totalImages: number) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const touchStartX = useRef(0);
  const touchCurrentX = useRef(0);
  const isSwiping = useRef(false);
  const didSwipe = useRef(false);

  const goTo = useCallback(
    (direction: "left" | "right") => {
      if (isAnimating || totalImages <= 1) return;
      setIsAnimating(true);
      const newIndex =
        direction === "right"
          ? currentIndex === totalImages - 1 ? 0 : currentIndex + 1
          : currentIndex === 0 ? totalImages - 1 : currentIndex - 1;
      setCurrentIndex(newIndex);
      setTimeout(() => setIsAnimating(false), 350);
    },
    [currentIndex, totalImages, isAnimating]
  );

  const onTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchCurrentX.current = e.touches[0].clientX;
    isSwiping.current = true;
  }, []);

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (!isSwiping.current) return;
    touchCurrentX.current = e.touches[0].clientX;
    const diff = touchCurrentX.current - touchStartX.current;
    setSwipeOffset(diff);
  }, []);

  const onTouchEnd = useCallback(() => {
    if (!isSwiping.current) return;
    isSwiping.current = false;
    const diff = touchCurrentX.current - touchStartX.current;
    const threshold = 50;
    if (diff < -threshold) {
      goTo("right");
    } else if (diff > threshold) {
      goTo("left");
    }
    setSwipeOffset(0);
  }, [goTo]);

  return {
    currentIndex,
    setCurrentIndex,
    swipeOffset,
    isAnimating,
    goTo,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
  };
}
