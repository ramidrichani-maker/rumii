import { useEffect, useState } from "react";
import loadingMark from "@/assets/rumi-loading-mark.png.asset.json";

const REVEAL_MS = 900;
const HOLD_MS = 250;
const FADE_MS = 400;
// Fallback: never hold the loader longer than this, even if the image is slow.
const MAX_MS = 2500;

export const PageLoader = () => {
  const [loaded, setLoaded] = useState(false);
  const [phase, setPhase] = useState<"reveal" | "fade" | "done">("reveal");

  useEffect(() => {
    if (!loaded) return;
    const fadeTimer = setTimeout(() => setPhase("fade"), REVEAL_MS + HOLD_MS);
    const doneTimer = setTimeout(
      () => setPhase("done"),
      REVEAL_MS + HOLD_MS + FADE_MS,
    );
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
  }, [loaded]);

  useEffect(() => {
    const cap = setTimeout(() => setLoaded(true), MAX_MS);
    return () => clearTimeout(cap);
  }, []);

  if (phase === "done") return null;

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[10000] flex items-center justify-center bg-background transition-opacity ${
        phase === "fade" ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}
      style={{ transitionDuration: `${FADE_MS}ms` }}
    >
      <img
        src={loadingMark.url}
        alt=""
        onLoad={() => setLoaded(true)}
        className={`w-28 h-auto sm:w-36 ${loaded ? "animate-loader-reveal" : "opacity-0"}`}
        style={{ animationDuration: `${REVEAL_MS}ms` }}
      />
    </div>
  );
};
