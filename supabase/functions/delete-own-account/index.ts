import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    // Get the calling user
    const callerClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await callerClient.auth.getUser();
    if (!user) throw new Error("Not authenticated");

    const { password } = await req.json();
    if (!password) throw new Error("Password is required");

    // Verify password by attempting sign-in
    const verifyClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { error: signInError } = await verifyClient.auth.signInWithPassword({
      email: user.email!,
      password,
    });
    if (signInError) {
      return new Response(
        JSON.stringify({ error: "Incorrect password" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent admins from self-deleting
    const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { data: profile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (profile?.role === "admin") {
      throw new Error("Admin accounts cannot be deleted this way");
    }

    const user_id = user.id;

    // Delete related data (same as delete-user function)
    await adminClient.from("favorites").delete().eq("user_id", user_id);
    await adminClient.from("property_viewings").delete().eq("user_id", user_id);
    await adminClient.from("support_messages").delete().eq("sender_id", user_id);
    await adminClient.from("support_conversations").delete().eq("user_id", user_id);
    await adminClient.from("notifications").delete().eq("user_id", user_id);
    await adminClient.from("messages").delete().eq("sender_user_id", user_id);
    await adminClient.from("messages").delete().eq("recipient_user_id", user_id);
    await adminClient.from("user_sessions").delete().eq("user_id", user_id);
    await adminClient.from("broker_agreements").delete().eq("user_id", user_id);
    await adminClient.from("platform_reviews").delete().eq("user_id", user_id);
    await adminClient.from("property_agents").delete().eq("agent_id", user_id);
    await adminClient.from("photography_requests").delete().eq("user_id", user_id);
    await adminClient.from("valuation_requests").delete().eq("user_id", user_id);
    await adminClient.from("support_ratings").delete().eq("user_id", user_id);

    const { data: userProperties } = await adminClient
      .from("properties")
      .select("id")
      .eq("user_id", user_id);

    if (userProperties && userProperties.length > 0) {
      const propIds = userProperties.map((p: any) => p.id);
      await adminClient.from("property_enquiries").delete().in("property_id", propIds);
      await adminClient.from("property_viewings").delete().in("property_id", propIds);
      await adminClient.from("property_media_pending").delete().in("property_id", propIds);
      await adminClient.from("property_generated_images").delete().in("property_id", propIds);
      await adminClient.from("property_ai_jobs").delete().in("property_id", propIds);
      await adminClient.from("property_agents").delete().in("property_id", propIds);
      await adminClient.from("featured_requests").delete().in("property_id", propIds);
      await adminClient.from("broker_agreements").delete().in("property_id", propIds);
      await adminClient.from("properties").delete().eq("user_id", user_id);
    }

    await adminClient.from("profiles").delete().eq("user_id", user_id);

    const { error: authDeleteError } = await adminClient.auth.admin.deleteUser(user_id);
    if (authDeleteError) {
      throw new Error("Failed to delete auth user: " + authDeleteError.message);
    }

    console.log("User self-deleted:", user_id);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    console.error("Error deleting account:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
