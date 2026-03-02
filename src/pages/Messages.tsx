import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mail, MailOpen, ArrowLeft, MapPin, Calendar, Clock, Phone } from "lucide-react";
import { format } from "date-fns";

interface Message {
  id: string;
  sender_user_id: string;
  recipient_user_id: string;
  subject: string;
  body: string;
  read: boolean;
  related_property_id: string | null;
  related_viewing_id: string | null;
  created_at: string;
}

const Messages = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchMessages();

    const channel = supabase
      .channel("messages-realtime")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `recipient_user_id=eq.${user.id}`,
        },
        (payload) => {
          setMessages((prev) => [payload.new as Message, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, navigate]);

  const fetchMessages = async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("recipient_user_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMessages(data);
    }
    setLoading(false);
  };

  const markAsRead = async (messageId: string) => {
    await supabase
      .from("messages")
      .update({ read: true })
      .eq("id", messageId);

    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, read: true } : m))
    );
  };

  const handleSelectMessage = async (message: Message) => {
    setSelectedMessage(message);
    if (!message.read) {
      await markAsRead(message.id);
    }
  };

  const unreadCount = messages.filter((m) => !m.read).length;

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-20 bg-muted rounded" />
          <div className="h-20 bg-muted rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Messages</h1>
          {unreadCount > 0 && (
            <Badge variant="destructive">{unreadCount} unread</Badge>
          )}
        </div>
      </div>

      {selectedMessage ? (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedMessage(null)}
              >
                <ArrowLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
            </div>
            <CardTitle className="text-lg">{selectedMessage.subject}</CardTitle>
            <p className="text-sm text-muted-foreground">
              {format(new Date(selectedMessage.created_at), "EEEE, MMMM do, yyyy 'at' h:mm a")}
            </p>
          </CardHeader>
          <CardContent>
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {selectedMessage.body}
            </div>
            {selectedMessage.related_property_id && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() =>
                  navigate(`/property/${selectedMessage.related_property_id}`)
                }
              >
                <MapPin className="w-4 h-4 mr-1" />
                View Property
              </Button>
            )}
          </CardContent>
        </Card>
      ) : messages.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Mail className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-1">No messages yet</h3>
            <p className="text-sm text-muted-foreground">
              You'll receive messages here when users request phone confirmations for viewings.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {messages.map((message) => (
            <Card
              key={message.id}
              className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                !message.read ? "border-primary/30 bg-primary/5" : ""
              }`}
              onClick={() => handleSelectMessage(message)}
            >
              <CardContent className="py-4">
                <div className="flex items-start gap-3">
                  <div className="mt-1">
                    {message.read ? (
                      <MailOpen className="w-5 h-5 text-muted-foreground" />
                    ) : (
                      <Mail className="w-5 h-5 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3
                        className={`text-sm truncate ${
                          !message.read ? "font-semibold" : "font-medium"
                        }`}
                      >
                        {message.subject}
                      </h3>
                      {!message.read && (
                        <div className="w-2 h-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {message.body.split("\n")[0]}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {format(new Date(message.created_at), "MMM d, yyyy 'at' h:mm a")}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Messages;
