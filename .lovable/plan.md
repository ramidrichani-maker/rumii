# Fit property comparisons on mobile

## Goal
Show every selected property and all comparison details within the mobile screen width, without sideways scrolling.

## Changes
- Keep the current desktop comparison table unchanged.
- On mobile, divide the available width evenly across the detail-label column and up to three property columns.
- Shrink comparison images into stable, responsive thumbnails that fit their property columns.
- Tighten mobile spacing and type sizes while preserving readable labels, values, and amenity status.
- Allow long property names and values to wrap within their columns instead of widening the table.
- Remove the mobile minimum table width and horizontal overflow behavior.

## Verification
- Check the comparison page at the current 393 × 756 mobile viewport with two and three properties.
- Confirm the entire table fits within the viewport and no horizontal scrolling is possible.
- Confirm images, labels, prices, specifications, and amenities remain readable and aligned.
