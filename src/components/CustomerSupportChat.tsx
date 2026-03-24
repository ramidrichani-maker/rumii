import { useState, useEffect, useRef } from "react";
import { Send, Star, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface Message {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

const RATING_REASONS = [
  "The support agent did not help resolve my issue",
  "The support agent was rude",
  "The support agent was unprofessional",
  "Long wait time before getting a response",
  "The agent lacked knowledge about the platform",
  "The issue was not resolved at all",
];

export const CustomerSupportChat = () => {
  const { user } = useAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [agentId, setAgentId] = useState<string | null>(null);
  const [agentName, setAgentName] = useState<string>("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [status, setStatus] = useState<string>("idle"); // idle, waiting, active, ended, rating
  const [isSending, setIsSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Rating state
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [selectedReasons, setSelectedReasons] = useState<string[]>([]);
  const [ratingReview, setRatingReview] = useState("");
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Subscribe to new messages in conversation
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`support-msgs-${conversationId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "support_messages",
        filter: `conversation_id=eq.${conversationId}`,
      }, (payload) => {
        const newMsg = payload.new as Message;
        setMessages((prev) => {
          if (prev.find(m => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId]);

  // Subscribe to conversation status changes
  useEffect(() => {
    if (!conversationId) return;

    const channel = supabase
      .channel(`support-conv-${conversationId}`)
      .on("postgres_changes", {
        event: "UPDATE",
        schema: "public",
        table: "support_conversations",
        filter: `id=eq.${conversationId}`,
      }, async (payload) => {
        const updated = payload.new as any;
        setStatus(updated.status);
        if (updated.agent_id && !agentId) {
          setAgentId(updated.agent_id);
          const { data } = await supabase
            .from("profiles")
            .select("full_name")
            .eq("user_id", updated.agent_id)
            .single();
          if (data) setAgentName(data.full_name);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [conversationId, agentId]);

  const startConversation = async () => {
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be signed in to chat with support.", variant: "destructive" });
      return;
    }

    const { data, error } = await supabase
      .from("support_conversations")
      .insert({ user_id: user.id, status: "waiting" })
      .select()
      .single();

    if (error) {
      toast({ title: "Error", description: "Failed to start conversation.", variant: "destructive" });
      return;
    }

    setConversationId(data.id);

    // If agent was auto-assigned by the trigger, set active state immediately
    if (data.agent_id && data.status === "active") {
      setAgentId(data.agent_id);
      setStatus("active");
      // Fetch agent name
      const { data: agentProfile } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("user_id", data.agent_id)
        .single();
      if (agentProfile) setAgentName(agentProfile.full_name);
    } else {
      setStatus("waiting");
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || !conversationId || !user) return;
    setIsSending(true);
    const content = input.trim();
    setInput("");

    const { error } = await supabase.from("support_messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
    });

    if (error) {
      toast({ title: "Error", description: "Failed to send message.", variant: "destructive" });
      setInput(content);
    }
    setIsSending(false);
  };

  const endConversation = async () => {
    if (!conversationId) return;
    await supabase
      .from("support_conversations")
      .update({ status: "ended", ended_at: new Date().toISOString() })
      .eq("id", conversationId);
    setStatus("rating");
  };

  const submitRating = async () => {
    if (!conversationId || !user || !agentId || rating === 0) return;
    setIsSubmittingRating(true);

    const { error } = await supabase.from("support_ratings").insert({
      conversation_id: conversationId,
      user_id: user.id,
      agent_id: agentId,
      rating,
      rating_reasons: rating <= 3 ? selectedReasons : [],
      review_text: ratingReview.trim() || null,
    });

    setIsSubmittingRating(false);
    if (error) {
      toast({ title: "Error", description: "Failed to submit rating.", variant: "destructive" });
    } else {
      toast({ title: "Thank you!", description: "Your feedback has been submitted." });
      resetChat();
    }
  };

  const skipRating = () => {
    resetChat();
  };

  const resetChat = () => {
    setConversationId(null);
    setAgentId(null);
    setAgentName("");
    setMessages([]);
    setStatus("idle");
    setRating(0);
    setHoveredStar(0);
    setSelectedReasons([]);
    setRatingReview("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">Please sign in to chat with customer support.</p>
          <Button asChild><a href="/auth">Sign In</a></Button>
        </div>
      </div>
    );
  }

  // Rating screen
  if (status === "rating") {
    return (
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="text-center space-y-2 pt-4">
          <h3 className="text-lg font-semibold">Rate your support experience</h3>
          <p className="text-sm text-muted-foreground">How would you rate your conversation with {agentName || "the support agent"}?</p>
        </div>

        <div className="flex justify-center gap-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-125 active:scale-95"
            >
              <Star
                className={`w-10 h-10 transition-colors ${
                  star <= (hoveredStar || rating) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"
                }`}
              />
            </button>
          ))}
        </div>

        {rating > 0 && rating <= 3 && (
          <div className="space-y-3">
            <p className="text-sm font-medium">What led to this rating?</p>
            <div className="space-y-2">
              {RATING_REASONS.map((reason) => (
                <label key={reason} className="flex items-start gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={selectedReasons.includes(reason)}
                    onCheckedChange={(checked) => {
                      setSelectedReasons(prev =>
                        checked ? [...prev, reason] : prev.filter(r => r !== reason)
                      );
                    }}
                  />
                  <span>{reason}</span>
                </label>
              ))}
            </div>
          </div>
        )}

        {rating > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium">Additional comments (optional)</label>
            <Textarea
              placeholder="Tell us more about your experience..."
              value={ratingReview}
              onChange={(e) => setRatingReview(e.target.value)}
              className="min-h-[80px] resize-none"
              maxLength={500}
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button variant="outline" onClick={skipRating} className="flex-1">
            Skip
          </Button>
          <Button onClick={submitRating} disabled={rating === 0 || isSubmittingRating} className="flex-1">
            {isSubmittingRating ? "Submitting..." : "Submit Rating"}
          </Button>
        </div>
      </div>
    );
  }

  // Idle - start conversation
  if (status === "idle") {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <Send className="w-7 h-7 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">Customer Support</h3>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Have a question or need help? Our support team is here to assist you.
          </p>
          <Button onClick={startConversation}>Start Conversation</Button>
        </div>
      </div>
    );
  }

  // Waiting for agent
  if (status === "waiting") {
    return (
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
              <Send className="w-7 h-7 text-primary" />
            </div>
            <h3 className="text-lg font-semibold">Waiting for an agent...</h3>
            <p className="text-sm text-muted-foreground">A support agent will be with you shortly.</p>
            <Badge variant="secondary">In queue</Badge>
          </div>
        </div>
        {/* Allow user to send initial message while waiting */}
        <div className="p-3 border-t">
          <div className="flex gap-2">
            <Textarea
              placeholder="Describe your issue while you wait..."
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
      </div>
    );
  }

  // Active chat
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Agent info bar */}
      {agentName && (
        <div className="px-4 py-2 border-b bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-xs">{agentName.split(" ").map(n => n[0]).join("").slice(0, 2)}</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{agentName}</span>
            <Badge variant="default" className="text-xs">Support Agent</Badge>
          </div>
          <Button variant="destructive" size="sm" onClick={endConversation} className="text-xs h-7">
            End Conversation
          </Button>
        </div>
      )}

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-3">
          {messages.map((msg) => {
            const isUser = msg.sender_id === user.id;
            return (
              <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                  isUser ? "bg-primary text-primary-foreground" : "bg-muted"
                }`}>
                  {msg.content}
                </div>
              </div>
            );
          })}
          <div ref={scrollRef} />
        </div>
      </ScrollArea>

      <div className="p-3 border-t">
        <div className="flex gap-2">
          <Textarea
            placeholder="Type your message..."
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
    </div>
  );
};
