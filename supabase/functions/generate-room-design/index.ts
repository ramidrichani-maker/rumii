import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import Replicate from "https://esm.sh/replicate@0.25.2";

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

    const REPLICATE_API_KEY = Deno.env.get("REPLICATE_API_KEY");
    if (!REPLICATE_API_KEY) {
      throw new Error("REPLICATE_API_KEY is not configured");
    }

    const body = await req.json();
    const { action, predictionId, imageUrl, propertyId, style, palette } = body;

    const replicate = new Replicate({ auth: REPLICATE_API_KEY });
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Check prediction status
    if (action === "status" && predictionId) {
      console.log("Checking status for prediction:", predictionId);
      const prediction = await replicate.predictions.get(predictionId);
      
      // If completed, save to database and storage
      if (prediction.status === "succeeded" && prediction.output) {
        const outputUrls = Array.isArray(prediction.output) ? prediction.output : [prediction.output];
        
        // Update job status
        await supabase
          .from("property_ai_jobs")
          .update({
            status: "completed",
            replicate_output_urls: outputUrls,
          })
          .eq("replicate_run_id", predictionId);

        // Download and save generated images to storage
        for (let i = 0; i < outputUrls.length; i++) {
          try {
            const imgResponse = await fetch(outputUrls[i]);
            const imgBlob = await imgResponse.blob();
            const fileName = `${propertyId}/${Date.now()}_${i}.png`;
            
            const { error: uploadError } = await supabase.storage
              .from("ai-generated")
              .upload(fileName, imgBlob, { contentType: "image/png" });
            
            if (!uploadError) {
              // Get public URL
              const { data: urlData } = supabase.storage
                .from("ai-generated")
                .getPublicUrl(fileName);
              
              // Save to generated images table
              await supabase.from("property_generated_images").insert({
                property_id: propertyId,
                storage_path: fileName,
                media_url: urlData?.publicUrl || outputUrls[i],
                created_by: userId,
                job_id: predictionId,
              });
            }
          } catch (saveErr) {
            console.error("Error saving generated image:", saveErr);
          }
        }
      } else if (prediction.status === "failed") {
        await supabase
          .from("property_ai_jobs")
          .update({
            status: "failed",
            error_message: prediction.error || "Generation failed",
          })
          .eq("replicate_run_id", predictionId);
      }
      
      return new Response(JSON.stringify(prediction), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Start new generation
    if (!imageUrl) {
      return new Response(
        JSON.stringify({ error: "imageUrl is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build prompt based on style and palette
    const stylePrompts: Record<string, string> = {
      modern: "modern minimalist interior design, clean lines, neutral colors, contemporary furniture",
      scandinavian: "scandinavian interior design, light wood, white walls, cozy textiles, hygge style",
      industrial: "industrial loft interior design, exposed brick, metal accents, raw materials",
      bohemian: "bohemian interior design, colorful patterns, plants, eclectic furniture, artistic",
      mediterranean: "mediterranean interior design, terracotta, arched doorways, warm earth tones",
      luxury: "luxury high-end interior design, marble, gold accents, designer furniture, opulent",
      minimalist: "minimalist interior design, white space, essential furniture only, zen-like",
      traditional: "traditional classic interior design, elegant furniture, rich fabrics, warm tones",
    };

    const palettePrompts: Record<string, string> = {
      neutral: "neutral color palette, beige, cream, gray, white tones",
      warm: "warm color palette, terracotta, rust, amber, golden tones",
      cool: "cool color palette, blues, greens, gray-blue tones",
      earth: "earthy color palette, browns, greens, natural tones",
      monochrome: "monochromatic color scheme, shades of gray and black",
      vibrant: "vibrant colorful palette, bold accent colors",
    };

    const selectedStyle = stylePrompts[style] || stylePrompts.modern;
    const selectedPalette = palettePrompts[palette] || palettePrompts.neutral;

    const prompt = `Transform this unfurnished room into a beautifully furnished living space. Apply ${selectedStyle}. Use ${selectedPalette}. High quality interior photography, realistic lighting, professional home staging. Keep the room structure and windows exactly as they are.`;

    console.log("Starting room design generation with prompt:", prompt);

    // Create job record
    const { data: jobData, error: jobError } = await supabase
      .from("property_ai_jobs")
      .insert({
        property_id: propertyId,
        original_media_url: imageUrl,
        style: style || "modern",
        palette: palette || "neutral",
        status: "processing",
        requestor_user_id: userId,
      })
      .select()
      .single();

    if (jobError) {
      console.error("Error creating job:", jobError);
    }

    // Use jagilley/controlnet-hough for interior design with image input
    const output = await replicate.run(
      "jagilley/controlnet-hough:854e8727697a057c525cdb45ab037f64ecca770a1769cc52287c2e56f33571d3",
      {
        input: {
          image: imageUrl,
          prompt: prompt,
          num_samples: "1",
          image_resolution: "768",
          ddim_steps: 30,
          scale: 9,
          a_prompt: "best quality, extremely detailed, realistic interior photography",
          n_prompt: "blurry, distorted, low quality, cartoon, anime, drawing, text, watermark, ugly, longbody, lowres, bad anatomy",
        },
      }
    );

    console.log("Generation completed:", output);

    const outputUrls = Array.isArray(output) ? output : [output];
    
    // Update job with results
    if (jobData) {
      await supabase
        .from("property_ai_jobs")
        .update({ 
          replicate_run_id: jobData.id,
          status: "completed",
          replicate_output_urls: outputUrls,
        })
        .eq("id", jobData.id);

      // Save generated images
      for (let i = 0; i < outputUrls.length; i++) {
        try {
          const imgResponse = await fetch(outputUrls[i]);
          const imgBlob = await imgResponse.blob();
          const fileName = `${propertyId}/${Date.now()}_${i}.png`;
          
          const { error: uploadError } = await supabase.storage
            .from("ai-generated")
            .upload(fileName, imgBlob, { contentType: "image/png" });
          
          if (!uploadError) {
            const { data: urlData } = supabase.storage
              .from("ai-generated")
              .getPublicUrl(fileName);
            
            await supabase.from("property_generated_images").insert({
              property_id: propertyId,
              storage_path: fileName,
              media_url: urlData?.publicUrl || outputUrls[i],
              created_by: userId,
              job_id: jobData.id,
            });
          }
        } catch (saveErr) {
          console.error("Error saving generated image:", saveErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        status: "succeeded",
        output: outputUrls,
        jobId: jobData?.id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in generate-room-design:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
