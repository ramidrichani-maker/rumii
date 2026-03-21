import { useState } from "react";
import { HeadphonesIcon, Star, X, Send, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CustomerSupportChat } from "./CustomerSupportChat";

export const SupportReviewWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [reviewText, setReviewText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmitReview = async () => {
    if (!user) {
      toast({ title: "Please sign in", description: "You need to be signed in to leave a review.", variant: "destructive" });
      return;
    }
    if (rating === 0) {
      toast({ title: "Rating required", description: "Please select a star rating.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const { error } = await supabase.from("platform_reviews").insert({
      user_id: user.id,
      rating,
      review_text: reviewText.trim() || null,
    });
    setIsSubmitting(false);
    if (error) {
      toast({ title: "Error", description: "Failed to submit review. Please try again.", variant: "destructive" });
    } else {
      toast({ title: "Thank you!", description: "Your review has been submitted successfully." });
      setSubmitted(true);
      setRating(0);
      setReviewText("");
    }
  };

  return (
    <>
      <div className="w-full border-t bg-muted/20 mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col items-end gap-3">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className="w-4 h-4 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
              <Button
                onClick={() => setIsOpen(true)}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <Star className="h-4 w-4" />
                Leave a Review
              </Button>
              <Button
                onClick={() => { setIsOpen(true); setDefaultTab("support"); }}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <HeadphonesIcon className="h-4 w-4" />
                Customer Support
              </Button>
            </div>
            <p className="text-xs text-muted-foreground text-right max-w-md">
              We highly appreciate any review or remarks — your feedback helps us make this a more enjoyable experience.
            </p>
          </div>
        </div>
      </div>

      <Sheet open={isOpen} onOpenChange={(open) => { setIsOpen(open); if (!open) { setSubmitted(false); setDefaultTab("review"); } }}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col h-full">
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle>Help & Feedback</SheetTitle>
              <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>

          <Tabs value={defaultTab} onValueChange={(v) => setDefaultTab(v)} className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="mx-4 mt-2 grid grid-cols-2">
              <TabsTrigger value="review" className="flex items-center gap-1.5">
                <Star className="w-4 h-4" />
                Leave a Review
              </TabsTrigger>
              <TabsTrigger value="support" className="flex items-center gap-1.5">
                <MessageCircle className="w-4 h-4" />
                Customer Support
              </TabsTrigger>
            </TabsList>

            <TabsContent value="review" className="flex-1 overflow-y-auto p-4 space-y-6 mt-0">
              <div className="text-center space-y-2 pt-2">
                <h3 className="text-lg font-semibold">We value your feedback</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  We would highly appreciate any review or remarks you may have. Your feedback helps us create a more enjoyable and better overall experience for everyone.
                </p>
              </div>

              {submitted ? (
                <div className="text-center py-8 space-y-2">
                  <div className="text-4xl">🎉</div>
                  <h3 className="text-lg font-semibold">Thank you for your feedback!</h3>
                  <p className="text-sm text-muted-foreground">Your review helps us improve.</p>
                  <Button variant="outline" onClick={() => setSubmitted(false)} className="mt-4">
                    Leave another review
                  </Button>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-center">How would you rate your experience?</p>
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
                              star <= (hoveredStar || rating)
                                ? "fill-amber-400 text-amber-400"
                                : "text-muted-foreground/30"
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    {rating > 0 && (
                      <p className="text-xs text-center text-muted-foreground">
                        {rating <= 2 ? "We're sorry to hear that. Please tell us more." :
                         rating === 3 ? "Thanks! How can we improve?" :
                         rating === 4 ? "Great! Any suggestions?" :
                         "Wonderful! We're glad you enjoyed it!"}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Your review (optional)</label>
                    <Textarea
                      placeholder="Tell us about your experience, what you liked, or what we can improve..."
                      value={reviewText}
                      onChange={(e) => setReviewText(e.target.value)}
                      className="min-h-[120px] resize-none"
                      maxLength={1000}
                    />
                    <p className="text-xs text-muted-foreground text-right">{reviewText.length}/1000</p>
                  </div>

                  <Button
                    onClick={handleSubmitReview}
                    disabled={rating === 0 || isSubmitting}
                    className="w-full"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    {isSubmitting ? "Submitting..." : "Submit Review"}
                  </Button>
                </>
              )}
            </TabsContent>

            <TabsContent value="support" className="flex-1 overflow-hidden mt-0">
              <CustomerSupportChat />
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </>
  );
};
