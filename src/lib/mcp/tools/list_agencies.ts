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
  name: "list_agencies",
  title: "List agencies",
  description: "List real estate agencies on Rumi, optionally filtered by name.",
  inputSchema: {
    name: z.string().optional().describe("Case-insensitive name filter."),
    limit: z.number().int().min(1).max(100).optional(),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ name, limit }) => {
    let q = sb().from("agencies").select("id, name").limit(limit ?? 50);
    if (name) q = q.ilike("name", `%${name}%`);
    const { data, error } = await q;
    if (error) {
      return { content: [{ type: "text", text: `Error: ${error.message}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data ?? [], null, 2) }],
      structuredContent: { agencies: data ?? [] },
    };
  },
});