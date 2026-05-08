import { X } from "lucide-react";
import { useState } from "react";

export interface FilterChip {
  key: string;
  label: string;
  onRemove: () => void;
}

interface ActiveFilterChipsProps {
  chips: FilterChip[];
  onClearAll?: () => void;
}

const ActiveFilterChips = ({ chips, onClearAll }: ActiveFilterChipsProps) => {
  const [removing, setRemoving] = useState<Set<string>>(new Set());

  if (chips.length === 0) return null;

  const handleRemove = (chip: FilterChip) => {
    setRemoving((prev) => new Set(prev).add(chip.key));
    // Wait for the exit animation before triggering state change
    setTimeout(() => {
      chip.onRemove();
      setRemoving((prev) => {
        const next = new Set(prev);
        next.delete(chip.key);
        return next;
      });
    }, 180);
  };

  return (
    <div className="flex flex-wrap items-center gap-2 mb-4">
      {chips.map((chip) => {
        const isRemoving = removing.has(chip.key);
        return (
          <button
            key={chip.key}
            type="button"
            onClick={() => !isRemoving && handleRemove(chip)}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-primary text-xs font-medium transition-all duration-200 ease-out ${
              isRemoving
                ? "opacity-0 scale-90 -translate-x-1 pointer-events-none"
                : "opacity-100 scale-100 hover:bg-primary/20 animate-scale-in"
            }`}
          >
            <span>{chip.label}</span>
            <X className="w-3 h-3" />
          </button>
        );
      })}
      {onClearAll && chips.length > 1 && (
        <button
          type="button"
          onClick={onClearAll}
          className="text-xs text-muted-foreground hover:text-foreground underline ml-1"
        >
          Clear all
        </button>
      )}
    </div>
  );
};

export default ActiveFilterChips;