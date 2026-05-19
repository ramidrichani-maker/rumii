# Stacked Units (Multi-Listing Buildings)

A "stacked unit" is a building parent that contains many independent sub-listings (apartments, duplexes, triplexes, penthouses, studios, rooftops). The parent holds the address/city/listing-type only; every sub-unit is itself a full listing with its own price, floor, size, bedrooms, bathrooms, property type, description, and images.

## Data model

Use a self-referential parent on `properties` so sub-units reuse all existing infrastructure (RLS, viewings, enquiries, favorites, featured, messaging, agent assignment).

Migration:
1. `ALTER TYPE property_type ADD VALUE 'stacked_unit'`.
2. `ALTER TABLE properties ADD COLUMN parent_property_id uuid REFERENCES properties(id) ON DELETE CASCADE`.
3. `CREATE INDEX idx_properties_parent ON properties(parent_property_id)`.
4. Validation trigger: a row with `property_type = 'stacked_unit'` cannot have a `parent_property_id`; a row with a `parent_property_id` must have `property_type IN (apartment, duplex, triplex, penthouse, studio, rooftop)` and the parent must be a stacked_unit. Sub-units inherit `listing_type`, `address`, `city`, `municipality`, `agency_id`, `status` from the parent on insert.
5. Cascade approvals: when an admin updates the parent's status, the same status applies to every child via trigger.

Sub-units intentionally live in `properties` so the parent card aggregates `min(price)` / unit count / bedroom range via a simple sub-query.

## Forms (List Property, Agent Portal, Admin Dashboard)

Add `Stacked Unit` to the property-type dropdown. When selected:
- Hide the per-property fields that no longer apply at building level (price, bedrooms, bathrooms, sqm, floor, property-specific fields).
- Show a "Units" section with an `Add unit` button. Each unit row is a collapsible card with: property type (apartment/duplex/triplex/penthouse/studio/rooftop), price (or rental_price if listing_type=rent), floor, bedrooms, bathrooms, square meters, description, images uploader, unfurnished toggle, price_negotiable toggle.
- Validate at least one unit before submit.
- On submit: insert the parent first, then bulk-insert sub-units with `parent_property_id` set. Images upload per unit to the existing `property-images` bucket.

Edit forms support adding/removing/updating units after creation.

## Display

- Search queries (Index featured, Purchase, Rent, NewHomes, FindAgents, map, etc.) add `parent_property_id is null` so sub-units don't duplicate in results. Stacked-unit parents still appear.
- `PropertyCard` for a stacked_unit shows a "Building · N units" badge and a "from €X" price (lowest sub-unit price/rent).
- `PropertyDetail` page: when parent is stacked_unit, render a "Units in this building" section listing each sub-unit as its own mini-card. Clicking a sub-unit opens that sub-unit's own detail page (which works as a normal property page).
- `MyListings` and admin listings tables show the parent with a child-count badge; expanding shows the children.

## Out of scope for this pass

- Bulk import CSV for stacked units (existing BulkPropertyImport stays single-listing).
- Per-unit viewing slot calendars (sub-units already work as normal properties so viewings continue to function).

## Technical notes

- Files touched: new migration; `AdminPropertyForm.tsx`, `AdminPropertyEditForm.tsx`, `AgentPropertyForm.tsx`, `ListProperty.tsx`, new `StackedUnitsEditor.tsx` shared component, `PropertyCard.tsx`, `PropertyDetail.tsx`, `PropertyDetailModal.tsx`, list-page query filters (`Index.tsx`, `Purchase.tsx`, `Rent.tsx`, `NewHomes.tsx`, `FindAgents.tsx`, `PropertySearchMap.tsx`, `FeaturedListingsManager.tsx`, `FeaturedPropertyCard.tsx`, `MyListings.tsx`, `AdminPropertyListingsManager.tsx`).
- TS types regenerate after migration; the new enum value and column will appear automatically.
- I'll build the shared `StackedUnitsEditor` once and reuse it across all three forms so they stay identical.
