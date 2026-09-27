import { useEffect, useLayoutEffect, useState, type CSSProperties } from "react";
import loadingMark from "@/assets/rumi-loading-mark.png.asset.json";

const REVEAL_MS = 900;
const HOLD_MS = 250;
const FLIGHT_MS = 850;
const TITLE_MS = 750;
const FADE_MS = 650;
const MAX_MS = 2500;

export const PageLoader = () => {
  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState<"reveal" | "flight" | "title" | "fade" | "done">("reveal");
  const [destination, setDestination] = useState({ x: 0, y: 0, scale: 1 });

  useLayoutEffect(() => {
    document.documentElement.classList.add("rumi-loader-active");
    return () => {
      document.documentElement.classList.remove("rumi-loader-active", "rumi-loader-landed", "rumi-loader-page-visible");
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    let retry: ReturnType<typeof setTimeout>;
    const start = Date.now();
    const fly = () => {
      const target = Array.from(document.querySelectorAll<HTMLImageElement>("[data-loader-title]"))
        .find((image) => image.offsetParent !== null && image.complete && image.naturalWidth > 0);
      if (!target && Date.now() - start < MAX_MS) {
        retry = setTimeout(fly, 80);
        return;
      }
      if (target) {
        const rect = target.getBoundingClientRect();
        setDestination({
          // The first half of the wordmark artwork is the same mark as the loader.
          x: rect.left + rect.width / 4 - window.innerWidth / 2,
          y: rect.top + rect.height / 2 - window.innerHeight / 2,
          scale: (rect.width / 2) / 144,
        });
        setPhase("flight");
      } else {
        setPhase("fade");
      }
    };
    const flightTimer = setTimeout(fly, REVEAL_MS + HOLD_MS);
    return () => {
      clearTimeout(flightTimer);
      clearTimeout(retry);
    };
  }, [loaded]);

  useEffect(() => {
    const cap = setTimeout(() => setLoaded(true), MAX_MS);
    return () => clearTimeout(cap);
  }, []);

  useEffect(() => {
    if (phase !== "flight") return;
    const timer = setTimeout(() => {
      document.documentElement.classList.add("rumi-loader-landed");
      setPhase("title");
    }, FLIGHT_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "title") return;
    const timer = setTimeout(() => setPhase("fade"), TITLE_MS + 120);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (phase !== "fade") return;
    document.documentElement.classList.add("rumi-loader-page-visible");
    const timer = setTimeout(() => {
      document.documentElement.classList.remove("rumi-loader-active", "rumi-loader-landed", "rumi-loader-page-visible");
      setPhase("done");
    }, FADE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  if (phase === "done") return null;

  return (
    <>
      <div aria-hidden="true" className={`fixed inset-0 z-[9989] pointer-events-none bg-background transition-opacity ${phase === "fade" ? "opacity-0" : "opacity-100"}`} style={{ transitionDuration: `${FADE_MS}ms` }} />
      <div aria-hidden="true" className="fixed inset-0 z-[10000] flex items-center justify-center pointer-events-none">
      <img
        src={loadingMark.url}
        alt=""
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(true)}
        className={`w-36 h-36 object-contain ${loaded ? "animate-loader-reveal" : "opacity-0"} ${phase === "flight" || phase === "title" || phase === "fade" ? "rumi-loader-flying" : ""} ${phase === "title" || phase === "fade" ? "opacity-0" : ""}`}
        style={{ animationDuration: `${REVEAL_MS}ms`, "--loader-x": `${destination.x}px`, "--loader-y": `${destination.y}px`, "--loader-scale": destination.scale, "--flight-ms": `${FLIGHT_MS}ms` } as CSSProperties}
      />
      </div>
    </>
  );
};
