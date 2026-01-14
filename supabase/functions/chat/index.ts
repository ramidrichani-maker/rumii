import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Input validation schemas
const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().min(1, "Message cannot be empty").max(4000, "Message too long (max 4000 chars)")
});

const RequestSchema = z.object({
  messages: z.array(MessageSchema).min(1, "At least one message required").max(50, "Too many messages (max 50)")
});

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // Verify user authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized - Authentication required' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Create client with user's auth context for validation
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });
    
    // Validate the user's JWT token
    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error('Auth validation failed:', claimsError);
      return new Response(JSON.stringify({ error: 'Invalid or expired token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const userId = claimsData.claims.sub;
    console.log(`Chat request from authenticated user: ${userId}`);

    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON in request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const validationResult = RequestSchema.safeParse(requestBody);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors.map(e => e.message).join(', ');
      console.error('Validation failed:', errorMessage);
      return new Response(JSON.stringify({ error: `Invalid request: ${errorMessage}` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { messages } = validationResult.data;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Initialize Supabase client with service role for database queries
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch approved properties from database
    const { data: properties, error: dbError } = await supabase
      .from("properties")
      .select(`
        id,
        property_code,
        property_type,
        listing_type,
        price,
        bedrooms,
        bathrooms,
        square_meters,
        address,
        city,
        municipality,
        amenities,
        year_built,
        price_negotiable
      `)
      .eq("status", "approved")
      .limit(50);

    if (dbError) {
      console.error("Database error:", dbError);
    }

    // Build property context for AI
    const propertyContext = properties && properties.length > 0
      ? `\n\nCurrent available properties in database:\n${properties.map(p => 
          `- Property #${p.property_code}: ${p.property_type} for ${p.listing_type} at ${p.address}, ${p.city}${p.municipality ? `, ${p.municipality}` : ''}. Price: €${p.price}${p.price_negotiable ? ' (negotiable)' : ''}. ${p.bedrooms} beds, ${p.bathrooms} baths, ${p.square_meters}m². ${p.amenities?.length ? `Amenities: ${p.amenities.join(', ')}` : ''}`
        ).join('\n')}`
      : "\n\nNo properties currently available in the database.";


    const systemPrompt = `You are a helpful AI assistant for a real estate property listing platform. Your role is to:

1. Answer questions about property listings available on the platform
2. Explain the process of listing a property through the application
3. Provide guidance on property search, viewing bookings, and favorites
4. Help users understand property details like pricing, location, amenities, and property types

Key information about the platform:
- Users can browse properties for sale or rent
- Properties must be approved by admins before appearing publicly
- Users can create listings by providing property details, images, and location
- The listing process includes: creating an account, filling property details, uploading images, waiting for admin approval
- Users can favorite properties, book viewings with agents
- Property types include: apartments, houses, villas, commercial properties
- Each listing shows: price, location, bedrooms, bathrooms, square meters, amenities, and images

When users ask about available properties, refer to the property database context provided below and give specific, accurate information about actual listings.
${propertyContext}

Be friendly, concise, and helpful. When discussing specific properties, reference them by their property code number.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limits exceeded, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Payment required, please add funds to your Lovable AI workspace." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI gateway error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(JSON.stringify({ error: "An error occurred processing your request" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
