import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Send, Loader2, Users, UserCog, Globe } from "lucide-react";

export default function EmailBroadcastManager() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [recipientGroup, setRecipientGroup] = useState("everyone");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!subject.trim() || !message.trim()) {
      toast({ title: "Missing fields", description: "Please fill in both subject and message.", variant: "destructive" });
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-broadcast-email", {
        body: { subject: subject.trim(), message: message.trim(), recipientGroup },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Emails sent!",
          description: `Successfully sent to ${data.sentCount} of ${data.totalRecipients} recipients.`,
        });
        setSubject("");
        setMessage("");
      } else {
        throw new Error(data?.error || "Failed to send emails");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const groupLabels: Record<string, { label: string; description: string; icon: React.ReactNode }> = {
    users: { label: "All Users", description: "Regular users only", icon: <Users className="w-4 h-4" /> },
    agents: { label: "All Agents", description: "Agents & agency managers", icon: <UserCog className="w-4 h-4" /> },
    everyone: { label: "Everyone", description: "All registered users", icon: <Globe className="w-4 h-4" /> },
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email Broadcast
        </CardTitle>
        <CardDescription>Send an email to a group of users</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label className="font-medium">Recipients</Label>
          <RadioGroup value={recipientGroup} onValueChange={setRecipientGroup} className="grid grid-cols-3 gap-3">
            {Object.entries(groupLabels).map(([value, { label, description, icon }]) => (
              <label
                key={value}
                className={`flex flex-col items-center gap-1 border rounded-lg p-3 cursor-pointer transition-colors ${
                  recipientGroup === value
                    ? "border-primary bg-primary/5"
                    : "border-input hover:border-muted-foreground/40"
                }`}
              >
                <RadioGroupItem value={value} className="sr-only" />
                {icon}
                <span className="text-sm font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{description}</span>
              </label>
            ))}
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="broadcast-subject">Subject</Label>
          <Input
            id="broadcast-subject"
            placeholder="Email subject line..."
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="broadcast-message">Message</Label>
          <Textarea
            id="broadcast-message"
            placeholder="Type your message here..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={6}
          />
        </div>

        <Button onClick={handleSend} disabled={sending || !subject.trim() || !message.trim()} className="w-full">
          {sending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...
            </>
          ) : (
            <>
              <Send className="w-4 h-4 mr-2" /> Send Email
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
