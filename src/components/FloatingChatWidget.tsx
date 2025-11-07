import { useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ChatBot } from "@/components/ChatBot";

export const FloatingChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Floating Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          size="icon"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg hover:scale-110 transition-transform z-50"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {/* Chat Sheet */}
      <Sheet open={isOpen} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col h-full">
          <SheetHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle>AI Property Assistant</SheetTitle>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </SheetHeader>
          <div className="flex-1 overflow-hidden p-4">
            <ChatBot />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
