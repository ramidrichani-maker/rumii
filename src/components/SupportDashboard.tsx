import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Star, Trash2, MessageSquare, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface SupportRating {
  id: string;
  conversation_id: string;
  user_id: string;
  agent_id: string;
  rating: number;
  rating_reasons: string[] | null;
  review_text: string | null;
  created_at: string;
  user_name?: string;
  agent_name?: string;
}

interface PlatformReview {
  id: string;
  user_id: string;
  rating: number;
  review_text: string | null;
  created_at: string;
  user_name?: string;
}

interface ConversationRecord {
  id: string;
  user_id: string;
  agent_id: string | null;
  status: string;
  created_at: string;
  ended_at: string | null;
  user_name?: string;
  agent_name?: string;
  messages_count?: number;
}

export const SupportDashboard = () => {
  const [ratings, setRatings] = useState<SupportRating[]>([]);
  const [reviews, setReviews] = useState<PlatformReview[]>([]);
  const [conversations, setConversations] = useState<ConversationRecord[]>([]);
  const [selectedConvMessages, setSelectedConvMessages] = useState<any[]>([]);
  const [selectedConvId, setSelectedConvId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    
    // Load support ratings
    const { data: ratingsData } = await supabase
      .from("support_ratings")
      .select("*")
      .order("created_at", { ascending: false });

    // Load platform reviews
    const { data: reviewsData } = await supabase
      .from("platform_reviews")
      .select("*")
      .order("created_at", { ascending: false });

    // Load conversations (only those within 1 week)
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const { data: convsData } = await supabase
      .from("support_conversations")
      .select("*")
      .gte("created_at", oneWeekAgo.toISOString())
      .order("created_at", { ascending: false });

    // Fetch user names for all user_ids
    const allUserIds = new Set<string>();
    ratingsData?.forEach(r => { allUserIds.add(r.user_id); allUserIds.add(r.agent_id); });
    reviewsData?.forEach(r => allUserIds.add(r.user_id));
    convsData?.forEach(c => { allUserIds.add(c.user_id); if (c.agent_id) allUserIds.add(c.agent_id); });

    const userIds = Array.from(allUserIds);
    const nameMap: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", userIds);
      profiles?.forEach(p => { nameMap[p.user_id] = p.full_name; });
    }

    setRatings((ratingsData || []).map(r => ({
      ...r,
      user_name: nameMap[r.user_id] || "Unknown",
      agent_name: nameMap[r.agent_id] || "Unknown",
    })));

    setReviews((reviewsData || []).map(r => ({
      ...r,
      user_name: nameMap[r.user_id] || "Unknown",
    })));

    setConversations((convsData || []).map(c => ({
      ...c,
      user_name: nameMap[c.user_id] || "Unknown",
      agent_name: c.agent_id ? nameMap[c.agent_id] || "Unknown" : "Unassigned",
    })));

    setIsLoading(false);
  };

  const loadConversationMessages = async (convId: string) => {
    setSelectedConvId(convId);
    const { data } = await supabase
      .from("support_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true });
    setSelectedConvMessages(data || []);
  };

  const deleteRating = async (id: string) => {
    await supabase.from("support_ratings").delete().eq("id", id);
    setRatings(prev => prev.filter(r => r.id !== id));
    toast({ title: "Rating deleted" });
  };

  const deleteReview = async (id: string) => {
    await supabase.from("platform_reviews").delete().eq("id", id);
    setReviews(prev => prev.filter(r => r.id !== id));
    toast({ title: "Review deleted" });
  };

  const cleanupOldConversations = async () => {
    const { data, error } = await supabase.rpc("cleanup_old_support_conversations");
    if (error) {
      toast({ title: "Error", description: "Failed to cleanup.", variant: "destructive" });
    } else {
      toast({ title: "Cleanup complete", description: `${data} old conversations deleted.` });
      loadData();
    }
  };

  const renderStars = (count: number) => (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map(s => (
        <Star key={s} className={`w-4 h-4 ${s <= count ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
      ))}
    </div>
  );

  const avgSupportRating = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
    : "N/A";

  const avgPlatformRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : "N/A";

  if (isLoading) return <div className="text-center py-8 text-muted-foreground">Loading support data...</div>;

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Support Ratings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgSupportRating}</div>
            <p className="text-xs text-muted-foreground">{ratings.length} total ratings</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Platform Reviews</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{avgPlatformRating}</div>
            <p className="text-xs text-muted-foreground">{reviews.length} total reviews</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent Conversations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversations.length}</div>
            <p className="text-xs text-muted-foreground">Last 7 days</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="support-ratings" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="support-ratings">Support Ratings</TabsTrigger>
          <TabsTrigger value="platform-reviews">Platform Reviews</TabsTrigger>
          <TabsTrigger value="conversations">Conversations</TabsTrigger>
        </TabsList>

        <TabsContent value="support-ratings">
          <Card>
            <CardHeader>
              <CardTitle>Support Agent Ratings</CardTitle>
              <CardDescription>All ratings from customer support interactions</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[400px]">
                {ratings.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No ratings yet</p>
                ) : (
                  <div className="space-y-3">
                    {ratings.map(r => (
                      <div key={r.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {renderStars(r.rating)}
                            <span className="text-sm font-medium">{r.rating}/5</span>
                            {r.rating <= 3 && <AlertTriangle className="w-4 h-4 text-amber-500" />}
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => deleteRating(r.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span>User: {r.user_name}</span> · <span>Agent: {r.agent_name}</span> · <span>{format(new Date(r.created_at), "MMM dd, yyyy HH:mm")}</span>
                        </div>
                        {r.rating_reasons && r.rating_reasons.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {r.rating_reasons.map((reason, i) => (
                              <Badge key={i} variant="destructive" className="text-xs">{reason}</Badge>
                            ))}
                          </div>
                        )}
                        {r.review_text && <p className="text-sm bg-muted/50 p-2 rounded">{r.review_text}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="platform-reviews">
          <Card>
            <CardHeader>
              <CardTitle>Platform Reviews</CardTitle>
              <CardDescription>User feedback about the platform experience</CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="max-h-[400px]">
                {reviews.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No reviews yet</p>
                ) : (
                  <div className="space-y-3">
                    {reviews.map(r => (
                      <div key={r.id} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {renderStars(r.rating)}
                            <span className="text-sm font-medium">{r.rating}/5</span>
                          </div>
                          <Button variant="ghost" size="icon" onClick={() => deleteReview(r.id)}>
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          <span>By: {r.user_name}</span> · <span>{format(new Date(r.created_at), "MMM dd, yyyy HH:mm")}</span>
                        </div>
                        {r.review_text && <p className="text-sm bg-muted/50 p-2 rounded">{r.review_text}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="conversations">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Recent Conversations</CardTitle>
                  <CardDescription>Support conversations from the last 7 days (auto-deleted after)</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={cleanupOldConversations}>
                  Cleanup Old
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <ScrollArea className="max-h-[400px]">
                  <div className="space-y-2">
                    {conversations.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">No recent conversations</p>
                    ) : conversations.map(c => (
                      <button
                        key={c.id}
                        onClick={() => loadConversationMessages(c.id)}
                        className={`w-full text-left border rounded-lg p-3 hover:bg-muted/50 transition-colors ${
                          selectedConvId === c.id ? "border-primary bg-muted/30" : ""
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">{c.user_name}</span>
                          <Badge variant={c.status === "active" ? "default" : c.status === "ended" ? "secondary" : "outline"} className="text-xs">
                            {c.status}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Agent: {c.agent_name} · {format(new Date(c.created_at), "MMM dd HH:mm")}
                        </div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>

                {/* Message viewer */}
                <div className="border rounded-lg">
                  {selectedConvId ? (
                    <ScrollArea className="max-h-[400px] p-3">
                      {selectedConvMessages.length === 0 ? (
                        <p className="text-center text-muted-foreground py-8">No messages</p>
                      ) : (
                        <div className="space-y-2">
                          {selectedConvMessages.map((msg: any) => {
                            const conv = conversations.find(c => c.id === selectedConvId);
                            const isUser = msg.sender_id === conv?.user_id;
                            return (
                              <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                                <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                                  isUser ? "bg-primary text-primary-foreground" : "bg-muted"
                                }`}>
                                  {msg.content}
                                  <div className={`text-xs mt-1 ${isUser ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                                    {format(new Date(msg.created_at), "HH:mm")}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  ) : (
                    <div className="flex items-center justify-center h-[400px] text-muted-foreground text-sm">
                      <div className="text-center">
                        <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                        Select a conversation to view messages
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
