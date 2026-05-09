import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const AgentEnquiry = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const agentId = (location.state as any)?.agentId ?? null;
  const agencyId = (location.state as any)?.agencyId ?? null;

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [wantsViewing, setWantsViewing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [propertyAddress, setPropertyAddress] = useState("");

  // Ensure page opens scrolled to top
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Pre-fill user data
  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name);
    if (user?.email) setEmail(user.email);
    if (profile?.phone_number) setPhone(profile.phone_number);
  }, [user, profile]);

  // Fetch property address for context
  useEffect(() => {
    if (!id) return;
    supabase
      .from("properties")
      .select("address, city")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) setPropertyAddress(`${data.address}, ${data.city}`);
      });
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !fullName.trim() || !email.trim() || !phone.trim()) {
      toast({ title: "Please fill in all required fields", variant: "destructive" });
      return;
    }

    setSubmitting(true);
    const { error } = await supabase.from("property_enquiries").insert({
      property_id: id,
      agent_id: agentId,
      agency_id: agencyId,
      sender_user_id: user?.id ?? null,
      full_name: fullName.trim(),
      email: email.trim(),
      phone_number: phone.trim(),
      message: message.trim() || null,
      wants_viewing: wantsViewing,
    });

    if (error) {
      setSubmitting(false);
      toast({ title: "Failed to send enquiry", description: error.message, variant: "destructive" });
      return;
    }

    // Send a message to the assigned agent and all admins (only if user is authenticated;
    // RLS requires sender_user_id = auth.uid()).
    if (user?.id) {
      try {
        const recipientIds = new Set<string>();
        if (agentId) recipientIds.add(agentId);

        // Fallback: also include any agents assigned to this property (in case agentId wasn't passed)
        const { data: assignments } = await supabase
          .from("property_agents")
          .select("agent_id")
          .eq("property_id", id);
        assignments?.forEach((a: any) => a?.agent_id && recipientIds.add(a.agent_id));

        // Fallback: include the property lister (e.g. admin who created it) so it's never lost
        const { data: prop } = await supabase
          .from("properties")
          .select("user_id")
          .eq("id", id)
          .single();
        if (prop?.user_id) recipientIds.add(prop.user_id);

        const { data: admins } = await (supabase as any).rpc("get_admin_user_ids");
        (admins as any[] | null)?.forEach((uid: any) => {
          if (typeof uid === "string") recipientIds.add(uid);
          else if (uid?.get_admin_user_ids) recipientIds.add(uid.get_admin_user_ids);
        });

        // Don't message yourself
        recipientIds.delete(user.id);

        if (recipientIds.size > 0) {
          const subject = `New property enquiry${propertyAddress ? ` - ${propertyAddress}` : ""}`;
          const body =
            `New enquiry from ${fullName.trim()}\n\n` +
            (propertyAddress ? `Property: ${propertyAddress}\n` : "") +
            `Email: ${email.trim()}\n` +
            `Phone: ${phone.trim()}\n` +
            `Wants viewing: ${wantsViewing ? "Yes" : "No"}\n\n` +
            `Message:\n${message.trim() || "(no message provided)"}`;

          const rows = Array.from(recipientIds).map((rid) => ({
            sender_user_id: user.id,
            recipient_user_id: rid,
            subject,
            body,
            related_property_id: id,
          }));

          await supabase.from("messages").insert(rows);
        }
      } catch (err) {
        console.error("Failed to send enquiry messages", err);
      }
    }

    setSubmitting(false);
      toast({ title: "Enquiry sent!", description: "The agent will get back to you soon." });
      navigate(`/property/${id}`);
  };

  return (
    <div className="min-h-screen bg-background pt-4 pb-16">
      <div className="max-w-lg mx-auto px-4">
        <Button
          variant="ghost"
          size="sm"
          className="mb-4 gap-1"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <h1 className="text-2xl font-bold text-foreground mb-1">
          Email agent
        </h1>
        {propertyAddress && (
          <p className="text-sm text-muted-foreground mb-6">
            Regarding: {propertyAddress}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              maxLength={100}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email address *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone number *</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Your message (optional)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write your message here..."
              maxLength={1000}
              rows={4}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="viewing"
              checked={wantsViewing}
              onCheckedChange={(checked) => setWantsViewing(checked === true)}
            />
            <Label htmlFor="viewing" className="cursor-pointer">
              I would like to view this property
            </Label>
          </div>

          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? "Sending…" : "Send enquiry"}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default AgentEnquiry;
