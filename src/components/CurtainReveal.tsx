import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface CurtainRevealProps {
  children: React.ReactNode;
  /** classes for the wrapper — keep it the same grid child the card used to be */
  className?: string;
  /** extra delay per column position, so cards uncover one by one from the left */
  step?: number;
  /** how long the grey takes to slide down and off the card */
  duration?: number;
  /** delay applied to every card before the column stagger */
  baseDelay?: number;
  /** render the card directly, with no curtain */
  disabled?: boolean;
}

/**
 * Keeps a medium-grey panel over a card until the card is actually reached while
 * scrolling, then slides that panel down and out of the card (see `.rumi-curtain`
 * in index.css), uncovering the card from the top like a curtain being drawn.
 *
 * Cards uncover one by one from the left: the delay comes from the card's column
 * position inside its grid row, measured from its siblings.
 */
const CurtainReveal: React.FC<CurtainRevealProps> = ({
  children,
  className,
  step = 110,
  duration = 700,
  baseDelay = 0,
  disabled = false,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [colIndex, setColIndex] = useState(0);
  const [inView, setInView] = useState(false);
  const [settled, setSettled] = useState(false);

  // Column index inside the card's own grid row drives the left-to-right stagger.
  useEffect(() => {
    if (disabled) return;
    const measure = () => {
      const el = ref.current;
      const parent = el?.parentElement;
      if (!el || !parent) {
        setColIndex(0);
        return;
      }
      const row = (Array.from(parent.children) as HTMLElement[]).filter(
        (sibling) => Math.abs(sibling.offsetTop - el.offsetTop) < 8
      );
      row.sort((a, b) => a.offsetLeft - b.offsetLeft);
      const index = row.indexOf(el);
      setColIndex(index > 0 ? index : 0);
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [disabled]);

  // Uncover only once the card has been scrolled into view.
  useEffect(() => {
    if (disabled) {
      setInView(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [disabled]);

  // ...and once its photos have actually decoded, so no empty image box flashes.
  useEffect(() => {
    if (disabled) {
      setSettled(true);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const pending = Array.from(el.querySelectorAll('img')).filter((img) => !img.complete);
    if (!pending.length) {
      setSettled(true);
      return;
    }
    let remaining = pending.length;
    const onDone = () => {
      remaining -= 1;
      if (remaining <= 0) setSettled(true);
    };
    pending.forEach((img) => {
      img.addEventListener('load', onDone, { once: true });
      img.addEventListener('error', onDone, { once: true });
    });
    const timeout = window.setTimeout(() => setSettled(true), 1500);
    return () => window.clearTimeout(timeout);
  }, [disabled]);

  if (disabled) return <>{children}</>;

  const revealed = inView && settled;

  return (
    <div ref={ref} className={cn('relative', className)}>
      {children}
      <div
        aria-hidden
        className="rumi-curtain"
        data-revealed={revealed ? 'true' : 'false'}
        style={{
          transitionDuration: `${duration}ms`,
          transitionDelay: `${baseDelay + colIndex * step}ms`,
        }}
      />
    </div>
  );
};

export default CurtainReveal;
