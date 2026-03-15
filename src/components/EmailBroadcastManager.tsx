import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Mail, Send, Loader2, Users, UserCog, Globe, Search, X, User } from "lucide-react";

interface UserEntry {
  user_id: string;
  full_name: string;
  role: string;
  email?: string;
}

export default function EmailBroadcastManager() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [recipientGroup, setRecipientGroup] = useState("everyone");
  const [sending, setSending] = useState(false);
  const [tab, setTab] = useState("broadcast");

  // Specific users state
  const [allUsers, setAllUsers] = useState<UserEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<UserEntry[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [specificSubject, setSpecificSubject] = useState("");
  const [specificMessage, setSpecificMessage] = useState("");
  const [sendingSpecific, setSendingSpecific] = useState(false);

  useEffect(() => {
    if (tab === "specific") {
      loadUsers();
    }
  }, [tab]);

  const loadUsers = async () => {
    setLoadingUsers(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, role")
        .order("full_name");
      if (error) throw error;
      setAllUsers(data || []);
    } catch (err: any) {
      toast({ title: "Error loading users", description: err.message, variant: "destructive" });
    } finally {
      setLoadingUsers(false);
    }
  };

  const filteredUsers = allUsers.filter((u) => {
    const q = searchQuery.toLowerCase();
    return u.full_name.toLowerCase().includes(q) || u.role.toLowerCase().includes(q);
  });

  const toggleUser = (user: UserEntry) => {
    setSelectedUsers((prev) =>
      prev.some((u) => u.user_id === user.user_id)
        ? prev.filter((u) => u.user_id !== user.user_id)
        : [...prev, user]
    );
  };

  const removeSelected = (userId: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.user_id !== userId));
  };

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

  const handleSendSpecific = async () => {
    if (!specificSubject.trim() || !specificMessage.trim()) {
      toast({ title: "Missing fields", description: "Please fill in both subject and message.", variant: "destructive" });
      return;
    }
    if (selectedUsers.length === 0) {
      toast({ title: "No recipients", description: "Please select at least one user.", variant: "destructive" });
      return;
    }

    setSendingSpecific(true);
    try {
      const userIds = selectedUsers.map((u) => u.user_id);
      const { data, error } = await supabase.functions.invoke("send-broadcast-email", {
        body: {
          subject: specificSubject.trim(),
          message: specificMessage.trim(),
          recipientGroup: "specific",
          userIds,
        },
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Emails sent!",
          description: `Successfully sent to ${data.sentCount} of ${data.totalRecipients} recipients.`,
        });
        setSpecificSubject("");
        setSpecificMessage("");
        setSelectedUsers([]);
      } else {
        throw new Error(data?.error || "Failed to send emails");
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSendingSpecific(false);
    }
  };

  const groupLabels: Record<string, { label: string; description: string; icon: React.ReactNode }> = {
    users: { label: "All Users", description: "Regular users only", icon: <Users className="w-4 h-4" /> },
    agents: { label: "All Agents", description: "Agents & agency managers", icon: <UserCog className="w-4 h-4" /> },
    everyone: { label: "Everyone", description: "All registered users", icon: <Globe className="w-4 h-4" /> },
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case "admin": return <Badge variant="destructive" className="text-xs">Admin</Badge>;
      case "agent": return <Badge className="text-xs bg-blue-600">Agent</Badge>;
      case "agency_manager": return <Badge className="text-xs bg-purple-600">Manager</Badge>;
      default: return <Badge variant="secondary" className="text-xs">User</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mail className="w-5 h-5" />
          Email Broadcast
        </CardTitle>
        <CardDescription>Send emails to groups or specific users</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="broadcast">Group Broadcast</TabsTrigger>
            <TabsTrigger value="specific">Specific Users</TabsTrigger>
          </TabsList>

          <TabsContent value="broadcast" className="space-y-5">
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
              <Input id="broadcast-subject" placeholder="Email subject line..." value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="broadcast-message">Message</Label>
              <Textarea id="broadcast-message" placeholder="Type your message here..." value={message} onChange={(e) => setMessage(e.target.value)} rows={6} />
            </div>

            <Button onClick={handleSend} disabled={sending || !subject.trim() || !message.trim()} className="w-full">
              {sending ? <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</> : <><Send className="w-4 h-4 mr-2" /> Send Email</>}
            </Button>
          </TabsContent>

          <TabsContent value="specific" className="space-y-5">
            {/* Selected users chips */}
            {selectedUsers.length > 0 && (
              <div className="space-y-2">
                <Label className="font-medium">Selected ({selectedUsers.length})</Label>
                <div className="flex flex-wrap gap-2">
                  {selectedUsers.map((u) => (
                    <Badge key={u.user_id} variant="secondary" className="flex items-center gap-1 py-1 px-2">
                      {u.full_name || "Unnamed"}
                      <button onClick={() => removeSelected(u.user_id)} className="ml-1 hover:text-destructive">
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Search and user list */}
            <div className="space-y-2">
              <Label className="font-medium">Search Users</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or role..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <ScrollArea className="h-48 border rounded-md">
                {loadingUsers ? (
                  <div className="flex items-center justify-center h-full p-4">
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <p className="text-sm text-muted-foreground p-4 text-center">No users found</p>
                ) : (
                  <div className="p-2 space-y-1">
                    {filteredUsers.map((u) => {
                      const isSelected = selectedUsers.some((s) => s.user_id === u.user_id);
                      return (
                        <label
                          key={u.user_id}
                          className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                            isSelected ? "bg-primary/10" : "hover:bg-muted"
                          }`}
                        >
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleUser(u)} />
                          <User className="w-4 h-4 text-muted-foreground shrink-0" />
                          <span className="text-sm flex-1 truncate">{u.full_name || "Unnamed"}</span>
                          {getRoleBadge(u.role)}
                        </label>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>

            <div className="space-y-2">
              <Label htmlFor="specific-subject">Subject</Label>
              <Input id="specific-subject" placeholder="Email subject line..." value={specificSubject} onChange={(e) => setSpecificSubject(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="specific-message">Message</Label>
              <Textarea id="specific-message" placeholder="Type your message here..." value={specificMessage} onChange={(e) => setSpecificMessage(e.target.value)} rows={6} />
            </div>

            <Button
              onClick={handleSendSpecific}
              disabled={sendingSpecific || !specificSubject.trim() || !specificMessage.trim() || selectedUsers.length === 0}
              className="w-full"
            >
              {sendingSpecific ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Sending...</>
              ) : (
                <><Send className="w-4 h-4 mr-2" /> Send to {selectedUsers.length} User{selectedUsers.length !== 1 ? "s" : ""}</>
              )}
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
