import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.56.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const FALLBACK_PHONE = "+96176942480";

interface EmailPayload {
  type: "viewing" | "photography";
  record_id: string;
}

async function getAgentContactCard(
  supabase: any,
  agentUserId: string | null
): Promise<{ name: string; phone: string; email: string }> {
  if (!agentUserId) {
    return { name: "Customer Support", phone: FALLBACK_PHONE, email: "" };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone_number")
    .eq("user_id", agentUserId)
    .single();

  const { data: authUser } = await supabase.auth.admin.getUserById(agentUserId);

  return {
    name: profile?.full_name || "Agent",
    phone: profile?.phone_number || FALLBACK_PHONE,
    email: authUser?.user?.email || "",
  };
}

function buildViewingEmailHtml(
  recipientName: string,
  propertyAddress: string,
  viewingDate: string,
  viewingTime: string,
  agent: { name: string; phone: string; email: string }
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1a1a2e;padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">Viewing Confirmed ✓</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 20px;">
                Hi <strong>${recipientName}</strong>,
              </p>
              <p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 24px;">
                Your property viewing has been confirmed! Here are the details:
              </p>
              
              <!-- Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;border-radius:8px;border:1px solid #e9ecef;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;color:#6c757d;font-size:14px;width:120px;">📍 Property</td>
                        <td style="padding:8px 0;color:#333;font-size:14px;font-weight:600;">${propertyAddress}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#6c757d;font-size:14px;">📅 Date</td>
                        <td style="padding:8px 0;color:#333;font-size:14px;font-weight:600;">${viewingDate}</td>
                      </tr>
                      <tr>
                        <td style="padding:8px 0;color:#6c757d;font-size:14px;">🕐 Time</td>
                        <td style="padding:8px 0;color:#333;font-size:14px;font-weight:600;">${viewingTime}</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Agent Contact Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a2e;border-radius:8px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="color:#a0a0b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Your Contact</p>
                    <p style="color:#ffffff;font-size:18px;font-weight:700;margin:0 0 8px;">🧑‍💼 ${agent.name}</p>
                    <p style="color:#d0d0e0;font-size:14px;margin:0 0 4px;">📞 <a href="tel:${agent.phone}" style="color:#7c8aff;text-decoration:none;">${agent.phone}</a></p>
                    ${agent.email ? `<p style="color:#d0d0e0;font-size:14px;margin:0;">✉️ <a href="mailto:${agent.email}" style="color:#7c8aff;text-decoration:none;">${agent.email}</a></p>` : ""}
                  </td>
                </tr>
              </table>

              <p style="color:#6c757d;font-size:14px;line-height:1.6;margin:0;">
                If you need to reschedule or cancel, please contact us as soon as possible.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f9fa;padding:20px 40px;text-align:center;border-top:1px solid #e9ecef;">
              <p style="color:#adb5bd;font-size:12px;margin:0;">This is an automated email. Please do not reply directly.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function buildPhotographyEmailHtml(
  recipientName: string,
  propertyAddress: string,
  city: string,
  preferredDate: string | null,
  preferredTime: string | null,
  agent: { name: string; phone: string; email: string }
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background-color:#1a1a2e;padding:32px 40px;text-align:center;">
              <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">📸 Photography Service Confirmed</h1>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 20px;">
                Hi <strong>${recipientName}</strong>,
              </p>
              <p style="color:#333;font-size:16px;line-height:1.6;margin:0 0 24px;">
                Your photography service request has been confirmed! Here are the details:
              </p>

              <!-- Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8f9fa;border-radius:8px;border:1px solid #e9ecef;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding:8px 0;color:#6c757d;font-size:14px;width:120px;">📍 Property</td>
                        <td style="padding:8px 0;color:#333;font-size:14px;font-weight:600;">${propertyAddress}, ${city}</td>
                      </tr>
                      ${preferredDate ? `<tr>
                        <td style="padding:8px 0;color:#6c757d;font-size:14px;">📅 Date</td>
                        <td style="padding:8px 0;color:#333;font-size:14px;font-weight:600;">${preferredDate}</td>
                      </tr>` : ""}
                      ${preferredTime ? `<tr>
                        <td style="padding:8px 0;color:#6c757d;font-size:14px;">🕐 Time</td>
                        <td style="padding:8px 0;color:#333;font-size:14px;font-weight:600;">${preferredTime}</td>
                      </tr>` : ""}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Agent Contact Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a2e;border-radius:8px;overflow:hidden;margin-bottom:24px;">
                <tr>
                  <td style="padding:24px;">
                    <p style="color:#a0a0b8;font-size:12px;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px;">Your Contact</p>
                    <p style="color:#ffffff;font-size:18px;font-weight:700;margin:0 0 8px;">🧑‍💼 ${agent.name}</p>
                    <p style="color:#d0d0e0;font-size:14px;margin:0 0 4px;">📞 <a href="tel:${agent.phone}" style="color:#7c8aff;text-decoration:none;">${agent.phone}</a></p>
                    ${agent.email ? `<p style="color:#d0d0e0;font-size:14px;margin:0;">✉️ <a href="mailto:${agent.email}" style="color:#7c8aff;text-decoration:none;">${agent.email}</a></p>` : ""}
                  </td>
                </tr>
              </table>

              <p style="color:#6c757d;font-size:14px;line-height:1.6;margin:0;">
                Our photographer will arrive at the scheduled time. Please ensure the property is ready for the shoot.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background-color:#f8f9fa;padding:20px 40px;text-align:center;border-top:1px solid #e9ecef;">
              <p style="color:#adb5bd;font-size:12px;margin:0;">This is an automated email. Please do not reply directly.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { type, record_id }: EmailPayload = await req.json();

    let toEmail: string;
    let subject: string;
    let html: string;

    if (type === "viewing") {
      // Fetch viewing with property info
      const { data: viewing, error: viewingError } = await supabase
        .from("property_viewings")
        .select("*")
        .eq("id", record_id)
        .single();

      if (viewingError || !viewing) throw new Error("Viewing not found");

      const { data: property } = await supabase
        .from("properties")
        .select("address, city, user_id")
        .eq("id", viewing.property_id)
        .single();

      // Get viewer's email and name
      const { data: viewerAuth } = await supabase.auth.admin.getUserById(viewing.user_id);
      const { data: viewerProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", viewing.user_id)
        .single();

      // Get agent contact - use assigned agent, or property lister agent, or fallback
      const agentId = viewing.agent_id || null;
      const agent = await getAgentContactCard(supabase, agentId);

      // If no agent assigned, try property owner
      if (!agentId && property?.user_id) {
        const ownerAgent = await getAgentContactCard(supabase, property.user_id);
        if (ownerAgent.phone !== FALLBACK_PHONE) {
          agent.name = ownerAgent.name;
          agent.phone = ownerAgent.phone;
          agent.email = ownerAgent.email;
        }
      }

      toEmail = viewerAuth?.user?.email || "";
      if (!toEmail) throw new Error("Viewer email not found");

      const formattedDate = new Date(viewing.viewing_date).toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });

      // Format time
      const timeParts = viewing.viewing_time.split(":");
      const hour = parseInt(timeParts[0]);
      const mins = timeParts[1];
      const suffix = hour >= 12 ? "PM" : "AM";
      const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
      const formattedTime = `${displayHour}:${mins} ${suffix}`;

      subject = `Viewing Confirmed - ${property?.address || "Property"}`;
      html = buildViewingEmailHtml(
        viewerProfile?.full_name || "Valued Customer",
        `${property?.address || "Property"}, ${property?.city || ""}`,
        formattedDate,
        formattedTime,
        agent
      );
    } else if (type === "photography") {
      // Fetch photography request
      const { data: photoReq, error: photoError } = await supabase
        .from("photography_requests")
        .select("*")
        .eq("id", record_id)
        .single();

      if (photoError || !photoReq) throw new Error("Photography request not found");

      // Get agent contact
      const agent = await getAgentContactCard(supabase, photoReq.assigned_agent_id);

      toEmail = photoReq.email;
      if (!toEmail) throw new Error("Requester email not found");

      const formattedDate = photoReq.preferred_date
        ? new Date(photoReq.preferred_date).toLocaleDateString("en-US", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
          })
        : null;

      subject = `Photography Service Confirmed - ${photoReq.property_address}`;
      html = buildPhotographyEmailHtml(
        photoReq.full_name,
        photoReq.property_address,
        photoReq.city,
        formattedDate,
        photoReq.preferred_time,
        agent
      );
    } else {
      throw new Error("Invalid type");
    }

    // Send email via Resend
    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "Property Notifications <onboarding@resend.dev>",
        to: [toEmail],
        subject,
        html,
      }),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      console.error("Resend error:", resendData);
      throw new Error(`Resend error: ${JSON.stringify(resendData)}`);
    }

    console.log("Email sent successfully:", resendData);

    return new Response(JSON.stringify({ success: true, id: resendData.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending confirmation email:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
