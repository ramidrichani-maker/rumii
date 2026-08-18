import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchProperties from "./tools/search_properties";
import getProperty from "./tools/get_property";
import listAgencies from "./tools/list_agencies";

export default defineMcp({
  name: "rumi-mcp",
  title: "Rumi Real Estate",
  version: "0.1.0",
  auth: auth.oauth.issuer({
    issuer: "https://kubhguqlihooofnyvdpq.supabase.co/auth/v1",
    acceptedAudiences: ["authenticated"],
    resourceName: "Rumi Real Estate MCP",
  }),
  instructions:
    "Tools for browsing Rumi real estate listings. Use `search_properties` to filter listings by city, price, and type, `get_property` to fetch full details for a listing UUID, and `list_agencies` to look up agencies.",
  tools: [searchProperties, getProperty, listAgencies],
});