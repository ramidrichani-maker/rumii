import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    
    if (!lovableApiKey) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }
    
    // Validate user token
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Auth validation failed:", claimsError);
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub as string;
    console.log(`Room design request from user: ${userId}`);

    // Create service role client for admin check and operations
    const supabaseService = createClient(supabaseUrl, supabaseServiceKey);

    // Check if user is admin - ONLY admins can generate AI designs
    const { data: isAdmin, error: roleError } = await supabaseService
      .rpc("has_role", { _user_id: userId, _role: "admin" });

    if (roleError) {
      console.error("Error checking admin role:", roleError);
      return new Response(
        JSON.stringify({ error: "Failed to verify permissions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isAdmin) {
      console.error("Unauthorized: User", userId, "is not an admin");
      return new Response(
        JSON.stringify({ error: "Unauthorized: Only admins can generate AI room designs" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Admin role verified for user:", userId);

    const body = await req.json();
    const { imageUrl, propertyId, style, palette, roomType } = body;

    // Verify property exists
    if (propertyId) {
      const { data: property, error: propError } = await supabaseService
        .from("properties")
        .select("id")
        .eq("id", propertyId)
        .single();

      if (propError || !property) {
        console.error("Property not found:", propertyId, propError);
        return new Response(
          JSON.stringify({ error: "Property not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("Property verified:", propertyId);
    }

    // Use service role client for all operations
    const supabase = supabaseService;

    // Start new generation
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "imageUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build prompt based on style and palette
    const stylePrompts: Record<string, string> = {
      modern: "modern minimalist interior design with clean lines, neutral colors, and contemporary furniture",
      scandinavian: "Scandinavian interior design with light wood, white walls, cozy textiles, and hygge aesthetics",
      industrial: "industrial loft interior design with exposed brick, metal accents, and raw materials",
      bohemian: "bohemian eclectic interior design with colorful textiles, plants, and layered patterns",
      mediterranean: "Mediterranean interior design with terracotta, natural textures, arched doorways, and warm tones",
      luxury: "luxury high-end interior design with marble, gold accents, designer furniture, and opulent details",
      minimalist: "minimalist interior design with white space, essential furniture only, and zen-like atmosphere",
      traditional: "traditional classic interior design with elegant furniture, rich fabrics, and warm tones",
      coastal: "coastal beach house interior design with light blues, whites, natural textures, and ocean-inspired decor",
      japandi: "Japandi interior design blending Japanese minimalism with Scandinavian functionality and natural materials",
      artdeco: "Art Deco interior design with geometric patterns, bold colors, luxurious materials, and glamorous accents",
    };

    const palettePrompts: Record<string, string> = {
      neutral: "neutral color palette with beige, cream, taupe, and soft grays",
      warm: "warm color palette with terracotta, burnt orange, warm browns, and golden yellows",
      cool: "cool color palette with blues, greens, and soft purples",
      earth: "earthy color palette with olive green, rust, brown, and sand tones",
      monochrome: "monochromatic black, white, and gray color scheme",
      vibrant: "vibrant colorful palette with bold accent colors and striking contrasts",
      pastel: "soft pastel color palette with blush pink, mint green, and lavender",
      natural: "natural organic color palette inspired by wood, stone, and foliage",
    };

    const roomTypePrompts: Record<string, string> = {
      living: "living room with comfortable seating, coffee table, and entertainment area",
      bedroom: "bedroom with bed, nightstands, and cozy sleeping space",
      kitchen: "kitchen with modern appliances, countertops, and dining area",
      bathroom: "bathroom with elegant fixtures, vanity, and spa-like atmosphere",
      dining: "dining room with dining table, chairs, and ambient lighting",
      office: "home office with desk, chair, shelving, and productive workspace",
      outdoor: "outdoor patio or balcony with comfortable seating and plants",
    };

    const selectedStyle = stylePrompts[style] || stylePrompts.modern;
    const selectedPalette = palettePrompts[palette] || palettePrompts.neutral;
    const selectedRoom = roomTypePrompts[roomType || "living"] || roomTypePrompts.living;

    const prompt = `Transform this empty unfurnished room into a beautifully designed ${selectedRoom}. 
Apply ${selectedStyle} with a ${selectedPalette}. 

CRITICAL CONSTRAINTS - DO NOT MODIFY:
- Keep ALL windows in their EXACT original positions, sizes, and shapes
- Keep ALL doors in their EXACT original positions and sizes  
- Keep ALL walls, corners, and room dimensions EXACTLY as shown
- Keep the floor plan and ceiling structure unchanged
- Keep any architectural features (columns, beams, alcoves) in place

YOU MAY ONLY:
- Add furniture appropriate for the room type
- Add decor items (art, plants, rugs, curtains)
- Add lighting fixtures (lamps, ceiling lights)
- Enhance wall colors/textures within the style
- Add accessories that match the design aesthetic

The room should look professionally staged, warm, and inviting.
Make it photorealistic and suitable for a real estate listing.
Ultra high resolution, professional interior photography.`;

    console.log("Starting room design generation with prompt:", prompt);

    // Create job record with 'pending' status first
    const { data: jobData, error: jobError } = await supabase
      .from("property_ai_jobs")
      .insert({
        property_id: propertyId,
        original_media_url: imageUrl,
        style: style || "modern",
        palette: palette || "neutral",
        status: "pending",
        requestor_user_id: userId,
      })
      .select()
      .single();

    if (jobError) {
      console.error("Error creating job:", jobError);
    }

    try {
      // Call Lovable AI Gateway with image editing capability
      console.log("Calling Lovable AI Gateway...");
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${lovableApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash-image-preview",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: prompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: imageUrl,
                  },
                },
              ],
            },
          ],
          modalities: ["image", "text"],
        }),
      });

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          // Update job status to failed
          if (jobData) {
            await supabase
              .from("property_ai_jobs")
              .update({ 
                status: "failed",
                error_message: "Rate limit exceeded",
              })
              .eq("id", jobData.id);
          }
          return new Response(
            JSON.stringify({ error: "Rate limit exceeded. Please try again in a few moments." }),
            { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        if (aiResponse.status === 402) {
          // Update job status to failed
          if (jobData) {
            await supabase
              .from("property_ai_jobs")
              .update({ 
                status: "failed",
                error_message: "AI credits exhausted",
              })
              .eq("id", jobData.id);
          }
          return new Response(
            JSON.stringify({ error: "AI credits exhausted. Please add funds to your Lovable workspace." }),
            { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
        const errorText = await aiResponse.text();
        console.error("AI Gateway error:", aiResponse.status, errorText);
        throw new Error(`AI Gateway error: ${aiResponse.status} - ${errorText}`);
      }

      const aiData = await aiResponse.json();
      console.log("AI Response received");

      // Extract the generated image from the response
      const generatedImageBase64 = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
      
      if (!generatedImageBase64) {
        console.error("No image in AI response:", JSON.stringify(aiData).substring(0, 1000));
        throw new Error("No image generated by AI. The model may not have produced an image for this request.");
      }

      // Convert base64 to blob for storage
      const base64Data = generatedImageBase64.replace(/^data:image\/\w+;base64,/, "");
      const imageBytes = Uint8Array.from(atob(base64Data), (c) => c.charCodeAt(0));

      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${propertyId}/${style || 'modern'}_${palette || 'neutral'}_${roomType || 'living'}_${timestamp}.png`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from("ai-generated")
        .upload(fileName, imageBytes, {
          contentType: "image/png",
          upsert: false,
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        throw new Error(`Failed to upload image: ${uploadError.message}`);
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("ai-generated")
        .getPublicUrl(fileName);

      const publicUrl = urlData?.publicUrl;
      console.log("Image uploaded:", publicUrl);

      // Update job with results
      if (jobData) {
        await supabase
          .from("property_ai_jobs")
          .update({ 
            status: "completed",
            replicate_output_urls: [publicUrl],
          })
          .eq("id", jobData.id);
      }

      // Save to generated images table
      const { data: savedImage, error: saveError } = await supabase
        .from("property_generated_images")
        .insert({
          property_id: propertyId,
          storage_path: fileName,
          media_url: publicUrl,
          created_by: userId,
          job_id: jobData?.id,
          style: style || "modern",
          palette: palette || "neutral",
          room_type: roomType || "living",
          approved: false,
        })
        .select()
        .single();

      if (saveError) {
        console.error("Database save error:", saveError);
      }

      console.log("Image saved to database:", savedImage?.id);

      return new Response(
        JSON.stringify({
          status: "succeeded",
          output: [publicUrl],
          jobId: jobData?.id,
          imageId: savedImage?.id,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (aiError) {
      console.error("AI Generation error:", aiError);
      
      // Update job status to failed
      if (jobData) {
        await supabase
          .from("property_ai_jobs")
          .update({ 
            status: "failed",
            error_message: aiError instanceof Error ? aiError.message : "Unknown error",
          })
          .eq("id", jobData.id);
      }
      
      throw aiError;
    }
  } catch (error) {
    console.error("Error in generate-room-design:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
