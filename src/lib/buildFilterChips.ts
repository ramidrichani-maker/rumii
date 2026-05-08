import type { FilterChip } from "@/components/ActiveFilterChips";

interface BuildArgs {
  selectedPropertyTypes: string[];
  setSelectedPropertyTypes: (v: string[]) => void;
  squareMetersRange: [number, number];
  setSquareMetersRange: (v: [number, number]) => void;
  sqmDefault: [number, number];
  priceRange: [number, number];
  setPriceRange: (v: [number, number]) => void;
  priceDefault: [number, number];
  minBedrooms: number;
  setMinBedrooms: (v: number) => void;
  minBathrooms: number;
  setMinBathrooms: (v: number) => void;
  barMinBedrooms: string;
  setBarMinBedrooms: (v: string) => void;
  barMaxBedrooms: string;
  setBarMaxBedrooms: (v: string) => void;
  barMinPrice: string;
  setBarMinPrice: (v: string) => void;
  barMaxPrice: string;
  setBarMaxPrice: (v: string) => void;
  selectedAmenities: string[];
  setSelectedAmenities: (v: string[]) => void;
  selectedMustHaves: string[];
  setSelectedMustHaves: (v: string[]) => void;
  selectedFeatures: string[];
  setSelectedFeatures: (v: string[]) => void;
  addedToOracle: string;
  setAddedToOracle: (v: string) => void;
  keywords: string;
  setKeywords: (v: string) => void;
  unfurnishedOnly: boolean;
  setUnfurnishedOnly: (v: boolean) => void;
  newHomesOnly: boolean;
  setNewHomesOnly: (v: boolean) => void;
  currency?: string;
}

const ADDED_LABELS: Record<string, string> = {
  '24h': 'Last 24 hours',
  '3d': 'Last 3 days',
  '7d': 'Last 7 days',
  '14d': 'Last 14 days',
  '30d': 'Last 30 days',
  anytime: 'Anytime',
};

const fmtMoney = (n: number, currency = '$') =>
  `${currency}${n.toLocaleString()}`;

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function buildFilterChips(a: BuildArgs): FilterChip[] {
  const chips: FilterChip[] = [];
  const cur = a.currency || '$';

  a.selectedPropertyTypes.forEach((t) => {
    chips.push({
      key: `type-${t}`,
      label: cap(t),
      onRemove: () =>
        a.setSelectedPropertyTypes(a.selectedPropertyTypes.filter((x) => x !== t)),
    });
  });

  if (
    a.squareMetersRange[0] !== a.sqmDefault[0] ||
    a.squareMetersRange[1] !== a.sqmDefault[1]
  ) {
    chips.push({
      key: 'sqm',
      label: `${a.squareMetersRange[0]}–${a.squareMetersRange[1]} m²`,
      onRemove: () => a.setSquareMetersRange(a.sqmDefault),
    });
  }

  if (
    a.priceRange[0] !== a.priceDefault[0] ||
    a.priceRange[1] !== a.priceDefault[1]
  ) {
    chips.push({
      key: 'price-slider',
      label: `${fmtMoney(a.priceRange[0], cur)} – ${fmtMoney(a.priceRange[1], cur)}`,
      onRemove: () => a.setPriceRange(a.priceDefault),
    });
  }

  if (a.minBedrooms > 1) {
    chips.push({
      key: 'min-beds-slider',
      label: `${a.minBedrooms}+ beds`,
      onRemove: () => a.setMinBedrooms(1),
    });
  }

  if (a.minBathrooms > 1) {
    chips.push({
      key: 'min-baths-slider',
      label: `${a.minBathrooms}+ baths`,
      onRemove: () => a.setMinBathrooms(1),
    });
  }

  if (a.barMinBedrooms || a.barMaxBedrooms) {
    const min = a.barMinBedrooms || 'any';
    const max = a.barMaxBedrooms || 'any';
    chips.push({
      key: 'bar-beds',
      label: `Beds: ${min}–${max}`,
      onRemove: () => {
        a.setBarMinBedrooms('');
        a.setBarMaxBedrooms('');
      },
    });
  }

  if (a.barMinPrice || a.barMaxPrice) {
    const fmt = (s: string) => {
      const n = parseInt(s.replace(/[^0-9]/g, ''));
      return isNaN(n) ? 'any' : fmtMoney(n, cur);
    };
    chips.push({
      key: 'bar-price',
      label: `Price: ${a.barMinPrice ? fmt(a.barMinPrice) : 'any'} – ${a.barMaxPrice ? fmt(a.barMaxPrice) : 'any'}`,
      onRemove: () => {
        a.setBarMinPrice('');
        a.setBarMaxPrice('');
      },
    });
  }

  a.selectedMustHaves.forEach((m) => {
    chips.push({
      key: `must-${m}`,
      label: m,
      onRemove: () =>
        a.setSelectedMustHaves(a.selectedMustHaves.filter((x) => x !== m)),
    });
  });

  a.selectedFeatures.forEach((f) => {
    chips.push({
      key: `feat-${f}`,
      label: f,
      onRemove: () =>
        a.setSelectedFeatures(a.selectedFeatures.filter((x) => x !== f)),
    });
  });

  a.selectedAmenities.forEach((am) => {
    chips.push({
      key: `amen-${am}`,
      label: am,
      onRemove: () =>
        a.setSelectedAmenities(a.selectedAmenities.filter((x) => x !== am)),
    });
  });

  if (a.addedToOracle) {
    chips.push({
      key: 'added',
      label: `Added: ${ADDED_LABELS[a.addedToOracle] || a.addedToOracle}`,
      onRemove: () => a.setAddedToOracle(''),
    });
  }

  if (a.keywords.trim()) {
    chips.push({
      key: 'keywords',
      label: `“${a.keywords.trim()}”`,
      onRemove: () => a.setKeywords(''),
    });
  }

  if (a.unfurnishedOnly) {
    chips.push({
      key: 'unfurnished',
      label: 'Unfurnished only',
      onRemove: () => a.setUnfurnishedOnly(false),
    });
  }

  if (a.newHomesOnly) {
    chips.push({
      key: 'new-homes',
      label: 'New homes only',
      onRemove: () => a.setNewHomesOnly(false),
    });
  }

  return chips;
}