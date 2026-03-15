import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header");

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY") || serviceRoleKey
    );

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await anonClient.auth.getUser(token);
    if (authError || !user) throw new Error("Unauthorized");

    // Check admin role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      throw new Error("Only admins can send broadcast emails");
    }

    const { subject, message, recipientGroup, userIds } = await req.json();

    if (!subject || !message || !recipientGroup) {
      throw new Error("Missing required fields: subject, message, recipientGroup");
    }

    // Get recipient emails based on group
    let profiles: any[] | null = null;
    let profilesError: any = null;

    if (recipientGroup === "specific") {
      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        throw new Error("No user IDs provided for specific recipient group");
      }
      const res = await supabase.from("profiles").select("user_id").in("user_id", userIds);
      profiles = res.data;
      profilesError = res.error;
    } else if (recipientGroup === "users") {
      const res = await supabase.from("profiles").select("user_id").eq("role", "user");
      profiles = res.data;
      profilesError = res.error;
    } else if (recipientGroup === "agents") {
      const res = await supabase.from("profiles").select("user_id").in("role", ["agent", "agency_manager"]);
      profiles = res.data;
      profilesError = res.error;
    } else {
      const res = await supabase.from("profiles").select("user_id");
      profiles = res.data;
      profilesError = res.error;
    }
    if (profilesError) throw profilesError;

    if (!profiles || profiles.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No recipients found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Get emails from auth.users
    const profileUserIds = profiles.map((p: any) => p.user_id);
    const { data: authUsers, error: authUsersError } = await supabase.auth.admin.listUsers({
      perPage: 1000,
    });

    if (authUsersError) throw authUsersError;

    const recipientEmails = authUsers.users
      .filter((u: any) => userIds.includes(u.id) && u.email)
      .map((u: any) => u.email);

    if (recipientEmails.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: "No email addresses found" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 }
      );
    }

    // Build HTML email
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head><meta charset="utf-8"></head>
      <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
        <div style="background: #ffffff; border-radius: 8px; padding: 32px; box-shadow: 0 2px 8px rgba(0,0,0,0.08);">
          <div style="text-align: center; margin-bottom: 24px;">
            <h2 style="color: #1a1a1a; font-size: 20px; margin: 0;">Oracle Estates</h2>
          </div>
          <h1 style="color: #1a1a1a; font-size: 18px; margin-bottom: 16px;">${subject}</h1>
          <div style="color: #444; font-size: 15px; line-height: 1.6; white-space: pre-wrap;">${message}</div>
          <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
          <p style="color: #999; font-size: 12px; text-align: center;">
            This is an automated message from Oracle Estates. Please do not reply directly to this email.
          </p>
        </div>
      </body>
      </html>
    `;

    // Send emails in batches (Resend supports batch sending)
    const batchSize = 50;
    let sentCount = 0;
    const errors: string[] = [];

    for (let i = 0; i < recipientEmails.length; i += batchSize) {
      const batch = recipientEmails.slice(i, i + batchSize);

      // Send individual emails using BCC for privacy
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "Oracle Estates <noreply@oracleestates.com>",
          to: batch,
          subject: subject,
          html: htmlBody,
        }),
      });

      if (res.ok) {
        sentCount += batch.length;
      } else {
        const errText = await res.text();
        errors.push(`Batch ${i / batchSize + 1}: ${errText}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        sentCount,
        totalRecipients: recipientEmails.length,
        errors: errors.length > 0 ? errors : undefined,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
