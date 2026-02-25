import { useState } from "react";
import { useWebSocket } from "@/lib/websocket";
import { ChatContainer } from "@/components/chat-container";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle } from "lucide-react";

export function GameChat() {
  const { unreadChatCount, clearUnreadChat } = useWebSocket();
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => {
    setIsOpen(true);
    clearUnreadChat();
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  if (isOpen) {
    return (
      <div className="fixed bottom-20 right-4 z-50 w-80 h-96 animate-slide-up">
        <ChatContainer
          className="h-full shadow-2xl overflow-y-auto"
          onClose={handleClose}
        />
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={handleOpen}
        size="lg"
        className="rounded-full shadow-xl relative"
        data-testid="button-game-chat"
      >
        <MessageCircle className="w-5 h-5 mr-2" />
        Chat
        {unreadChatCount > 0 && (
          <Badge
            variant="destructive"
            className="absolute -top-2 -right-2 h-5 min-w-5 px-1 text-xs"
          >
            {unreadChatCount > 99 ? "99+" : unreadChatCount}
          </Badge>
        )}
      </Button>
    </div>
  );
}
