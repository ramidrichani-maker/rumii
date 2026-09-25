import { useEffect, useState } from "react";
import loadingMark from "@/assets/rumi-loading-mark.png.asset.json";

const REVEAL_MS = 900;
const HOLD_MS = 250;
const FADE_MS = 400;

export const PageLoader = () => {
  const [phase, setPhase] = useState<"reveal" | "fade" | "done">("reveal");

  useEffect(() => {
    const fadeTimer = setTimeout(() => setPhase("fade"), REVEAL_MS + HOLD_MS);
    const doneTimer = setTimeout(
      () => setPhase("done"),
      REVEAL_MS + HOLD_MS + FADE_MS,
    );
    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(doneTimer);
    };
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
        className="w-28 h-auto sm:w-36 animate-loader-reveal"
        style={{ animationDuration: `${REVEAL_MS}ms` }}
      />
    </div>
  );
};
