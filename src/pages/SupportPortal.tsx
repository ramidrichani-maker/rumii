import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Send, Star, MessageSquare, Home } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useNavigate, Link } from "react-router-dom";

interface Conversation {
  id: string;
  user_id: string;
  agent_id: string | null;
  status: string;
  created_at: string;
  user_name?: string;
}

interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

const SupportPortal = () => {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [ratings, setRatings] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && (!user || profile?.role !== "customer_support")) {
      navigate("/");
    }
  }, [user, profile, loading, navigate]);

  useEffect(() => {
    if (!user) return;
    loadConversations();

    // Load own ratings
    supabase
      .from("support_ratings")
      .select("*")
      .eq("agent_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setRatings(data || []));

    // Subscribe to new conversations
    const channel = supabase
      .channel("support-new-convs")
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "support_conversations",
      }, () => loadConversations())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Subscribe to messages in active conversation
  useEffect(() => {
    if (!activeConvId) return;

    const channel = supabase
      .channel(`support-agent-msgs-${activeConvId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
        filter: `conversation_id=eq.${activeConvId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages(prev => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [activeConvId]);

  const loadConversations = async () => {
    const { data } = await supabase
      .from("support_conversations")
      .select("*")
      .or(`status.eq.waiting,agent_id.eq.${user!.id}`)
      .order("created_at", { ascending: false });

    if (!data) return;

    const userIds = [...new Set(data.map(c => c.user_id))];
    const nameMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      profiles?.forEach(p => { nameMap[p.user_id] = p.full_name; });
    }

    setConversations(data.map(c => ({
      ...c,
      user_name: nameMap[c.user_id] || "Unknown User",
    })));
  };

  const acceptConversation = async (convId: string) => {
    if (!user) return;
    await supabase
      .from("support_conversations")
      .update({ agent_id: user.id, status: "active" })
      .eq("id", convId);
    
    setActiveConvId(convId);
    loadMessages(convId);
    loadConversations();
  };

  const loadMessages = async (convId: string) => {
    setActiveConvId(convId);
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setMessages(data || []);
  };

  const sendMessage = async () => {
    if (!input.trim() || !activeConvId || !user) return;
    setIsSending(true);
    const content = input.trim();
    setInput("");

    const { error } = await supabase.from("support_messages").insert({
      conversation_id: activeConvId,
      sender_id: user.id,
      content,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to send.", variant: "destructive" });
      setInput(content);
    }
    setIsSending(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const activeConv = conversations.find(c => c.id === activeConvId);
  const waitingConvs = conversations.filter(c => c.status === "waiting");
  const myActiveConvs = conversations.filter(c => c.agent_id === user?.id && c.status === "active");
  const myEndedConvs = conversations.filter(c => c.agent_id === user?.id && c.status === "ended");

  const avgRating = ratings.length > 0
    ? (ratings.reduce((sum: number, r: any) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : "N/A";

  if (loading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="min-h-screen bg-transparent">
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Support Portal</h1>
          <p className="text-muted-foreground">Manage customer support conversations</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Waiting</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{waitingConvs.length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Active Chats</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{myActiveConvs.length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Completed</CardTitle></CardHeader>
            <CardContent><div className="text-2xl font-bold">{myEndedConvs.length}</div></CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">Avg Rating</CardTitle></CardHeader>
            <CardContent>
              <div className="text-2xl font-bold flex items-center gap-1">
                {avgRating} <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="chats" className="space-y-4">
          <TabsList>
            <TabsTrigger value="chats" className="flex items-center gap-1.5">
              <MessageSquare className="w-4 h-4" />
              Chats
              {waitingConvs.length > 0 && (
                <Badge variant="destructive" className="ml-1 text-xs">{waitingConvs.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="properties" className="flex items-center gap-1.5">
              <Home className="w-4 h-4" />
              Properties
            </TabsTrigger>
            <TabsTrigger value="my-ratings" className="flex items-center gap-1.5">
              <Star className="w-4 h-4" />
              My Ratings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="chats">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ minHeight: 500 }}>
              {/* Conversation list */}
              <Card className="md:col-span-1">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Conversations</CardTitle>
                </CardHeader>
                <CardContent className="p-2">
                  <ScrollArea className="max-h-[500px]">
                    <div className="space-y-1">
                      {waitingConvs.length > 0 && (
                        <p className="text-xs font-semibold text-muted-foreground px-2 py-1">Waiting</p>
                      )}
                      {waitingConvs.map(c => (
                        <button
                          key={c.id}
                          onClick={() => acceptConversation(c.id)}
                          className="w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 border border-amber-200 bg-amber-50/50"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">{c.user_name}</span>
                            <Badge variant="outline" className="text-xs">New</Badge>
                          </div>
                        </button>
                      ))}

                      {myActiveConvs.length > 0 && (
                        <p className="text-xs font-semibold text-muted-foreground px-2 py-1 mt-2">Active</p>
                      )}
                      {myActiveConvs.map(c => (
                        <button
                          key={c.id}
                          onClick={() => loadMessages(c.id)}
                          className={`w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 ${
                            activeConvId === c.id ? "bg-muted border border-primary" : ""
                          }`}
                        >
                          <span className="text-sm font-medium">{c.user_name}</span>
                        </button>
                      ))}

                      {myEndedConvs.length > 0 && (
                        <p className="text-xs font-semibold text-muted-foreground px-2 py-1 mt-2">Ended</p>
                      )}
                      {myEndedConvs.map(c => (
                        <button
                          key={c.id}
                          onClick={() => loadMessages(c.id)}
                          className={`w-full text-left px-3 py-2 rounded-md hover:bg-muted/50 opacity-60 ${
                            activeConvId === c.id ? "bg-muted border" : ""
                          }`}
                        >
                          <span className="text-sm">{c.user_name}</span>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Chat area */}
              <Card className="md:col-span-2 flex flex-col">
                {activeConvId ? (
                  <>
                    <CardHeader className="pb-2 border-b">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {activeConv?.user_name?.split(" ").map(n => n[0]).join("").slice(0, 2) || "?"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{activeConv?.user_name}</p>
                            <Badge variant={activeConv?.status === "active" ? "default" : "secondary"} className="text-xs">
                              {activeConv?.status}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
                      <ScrollArea className="flex-1 p-4">
                        <div className="space-y-3">
                          {messages.map(msg => {
                            const isAgent = msg.sender_id === user?.id;
                            return (
                              <div key={msg.id} className={`flex ${isAgent ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                                  isAgent ? "bg-primary text-primary-foreground" : "bg-muted"
                                }`}>
                                  {msg.content}
                                </div>
                              </div>
                            );
                          })}
                          <div ref={scrollRef} />
                        </div>
                      </ScrollArea>
                      {activeConv?.status === "active" && (
                        <div className="p-3 border-t">
                          <div className="flex gap-2">
                            <Textarea
                              placeholder="Type your response..."
                              value={input}
                              onChange={(e) => setInput(e.target.value)}
                              onKeyDown={handleKeyDown}
                              className="min-h-[44px] max-h-[100px] resize-none"
                              maxLength={2000}
                            />
                            <Button size="icon" onClick={sendMessage} disabled={!input.trim() || isSending}>
                              <Send className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </>
                ) : (
                  <div className="flex-1 flex items-center justify-center text-muted-foreground min-h-[400px]">
                    <div className="text-center">
                      <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>Select a conversation to start chatting</p>
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="properties">
            <SupportPropertyBrowser />
          </TabsContent>

          <TabsContent value="my-ratings">
            <Card>
              <CardHeader>
                <CardTitle>My Ratings</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="max-h-[400px]">
                  {ratings.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">No ratings yet</p>
                  ) : (
                    <div className="space-y-3">
                      {ratings.map((r: any) => (
                        <div key={r.id} className="border rounded-lg p-3 space-y-1">
                          <div className="flex items-center gap-2">
                            <div className="flex gap-0.5">
                              {[1, 2, 3, 4, 5].map(s => (
                                <Star key={s} className={`w-4 h-4 ${s <= r.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                              ))}
                            </div>
                            <span className="text-sm">{r.rating}/5</span>
                          </div>
                          {r.rating_reasons?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {r.rating_reasons.map((reason: string, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs">{reason}</Badge>
                              ))}
                            </div>
                          )}
                          {r.review_text && <p className="text-sm text-muted-foreground">{r.review_text}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

// Simple property browser for support agents
const SupportPropertyBrowser = () => {
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    supabase
      .from("properties")
      .select("id, property_code, property_type, listing_type, price, rental_price, address, city, bedrooms, bathrooms, square_meters")
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }) => setProperties(data || []));
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Listed Properties</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="max-h-[500px]">
          {properties.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">No properties</p>
          ) : (
            <div className="space-y-2">
              {properties.map(p => (
                <Link
                  key={p.id}
                  to={`/property/${p.id}`}
                  className="block border rounded-lg p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">#{p.property_code} - {p.address}, {p.city}</p>
                      <p className="text-xs text-muted-foreground">
                        {p.property_type} · {p.bedrooms} bed · {p.bathrooms} bath · {p.square_meters}m²
                      </p>
                    </div>
                    <div className="text-right">
                      {p.listing_type !== "rent" && p.price && (
                        <p className="text-sm font-bold">€{p.price.toLocaleString()}</p>
                      )}
                      {p.listing_type !== "sale" && p.rental_price && (
                        <p className="text-xs text-muted-foreground">€{p.rental_price.toLocaleString()}/mo</p>
                      )}
                      <Badge variant="outline" className="text-xs">{p.listing_type}</Badge>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default SupportPortal;
