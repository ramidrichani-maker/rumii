import { useState, useRef, useCallback, TouchEvent, WheelEvent } from "react";

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
    didSwipe.current = false;
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
    if (Math.abs(diff) > 10) {
      didSwipe.current = true;
    }
    if (diff < -threshold) {
      goTo("right");
    } else if (diff > threshold) {
      goTo("left");
    }
    setSwipeOffset(0);
  }, [goTo]);

  const wasSwipe = useCallback(() => didSwipe.current, []);

  // Desktop trackpad: two-finger horizontal swipe emits wheel events with
  // a dominant deltaX. Accumulate and flip one image per gesture.
  const wheelAccum = useRef(0);
  const wheelTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onWheel = useCallback(
    (e: WheelEvent) => {
      if (totalImages <= 1) return;
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      wheelAccum.current += e.deltaX;
      if (wheelTimeout.current) clearTimeout(wheelTimeout.current);
      wheelTimeout.current = setTimeout(() => {
        wheelAccum.current = 0;
      }, 200);
      if (Math.abs(wheelAccum.current) > 40) {
        didSwipe.current = true;
        goTo(wheelAccum.current > 0 ? "right" : "left");
        wheelAccum.current = 0;
      }
    },
    [goTo, totalImages]
  );

  return {
    onWheel,
    currentIndex,
    setCurrentIndex,
    swipeOffset,
    isAnimating,
    goTo,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    wasSwipe,
  };
}
