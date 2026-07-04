import { createClient } from "@supabase/supabase-js";
import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";

function sb() {
  return createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}

export default defineTool({
  name: "search_properties",
  title: "Search properties",
  description:
    "Search Rumi property listings by city, listing type (sale/rent), property type, price range, and bedrooms. Returns a compact list.",
  inputSchema: {
    city: z.string().optional().describe("City or municipality name filter (case-insensitive contains)."),
    listing_type: z.enum(["sale", "rent"]).optional().describe("Filter by sale or rent."),
    property_type: z.string().optional().describe("Filter by property type (e.g. apartment, villa)."),
    min_price: z.number().optional(),
    max_price: z.number().optional(),
    min_bedrooms: z.number().int().optional(),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ city, listing_type, property_type, min_price, max_price, min_bedrooms, limit }) => {
    let q = sb()
      .from("properties_public")
      .select(
        "id, address, city, municipality, property_type, listing_type, bedrooms, bathrooms, square_meters, price, rental_price, status",
      )
      .eq("status", "active")
      .limit(limit ?? 20);
    if (city) q = q.or(`city.ilike.%${city}%,municipality.ilike.%${city}%`);
    if (listing_type) q = q.eq("listing_type", listing_type);
    if (property_type) q = q.eq("property_type", property_type);
    if (min_bedrooms != null) q = q.gte("bedrooms", min_bedrooms);
    if (listing_type === "rent") {
      if (min_price != null) q = q.gte("rental_price", min_price);
      if (max_price != null) q = q.lte("rental_price", max_price);
    } else {
      if (min_price != null) q = q.gte("price", min_price);
      if (max_price != null) q = q.lte("price", max_price);
    }
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { results: data ?? [] },
    };
  },
});