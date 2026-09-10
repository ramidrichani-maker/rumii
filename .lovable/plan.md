# Align all homepage content to the search bar underline

## Goal
Every element on the homepage (search bar, featured listings sections, footer) starts and ends at the exact same horizontal position as the line under the search bar.

## Current state
- The underline spans the `HeroSearch` wrapper: mobile `w-[95%] mx-auto`, desktop `md:mx-[4.5rem]`, inside a `px-4` container in `Index.tsx`.
- Featured listings and footer use `container mx-auto px-4`, which produces different insets (and a max-width cap), so edges don't align.

## Changes

1. **Define one shared gutter** — add a `.home-gutter` utility in `src/index.css`:
   - Mobile: `padding-inline: calc(1rem + 2.5%)` (px-4 + half of the 5% the search wrapper trims).
   - Desktop (md+): `padding-inline: 5.5rem` (4.5rem margin + 1rem px-4), matching the line exactly.
   - No max-width cap, so it matches the search line at every viewport.

2. **`src/pages/Index.tsx`**
   - Remove the `px-4` from the hero `ScrollReveal` wrapper and `mx/margin` handling duplication; apply `home-gutter` to the hero wrapper, the featured-listings container, and the loading-skeleton container.
   - Remove `md:mx-[4.5rem]` / `w-[95%] mx-auto` from `HeroSearch`'s root div (it becomes `w-full`), since the gutter is now handled by the parent.

3. **`src/components/Footer.tsx`**
   - Replace `container mx-auto px-4` wrappers with `home-gutter` so footer content aligns to the same edges.

4. **Verify** with Playwright screenshots at desktop (1280px) and mobile (390px): measure the underline's left/right x-coordinates and confirm featured cards and footer content start/end at the same pixels.

## Technical details
- Files touched: `src/index.css`, `src/pages/Index.tsx`, `src/components/HeroSearch.tsx`, `src/components/Footer.tsx`.
- No behavior changes — purely horizontal alignment.
