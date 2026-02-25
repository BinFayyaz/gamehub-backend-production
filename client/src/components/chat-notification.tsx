import { useEffect, useState } from "react";
import { useWebSocket } from "@/lib/websocket";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ChatNotificationProps {
  isChatOpen: boolean;
  onOpenChat: () => void;
}

export function ChatNotification({ isChatOpen, onOpenChat }: ChatNotificationProps) {
  const { latestChatMessage, clearLatestChatMessage } = useWebSocket();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (latestChatMessage && !isChatOpen) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        clearLatestChatMessage();
      }, 5000);
      return () => clearTimeout(timer);
    } else {
      setVisible(false);
    }
  }, [latestChatMessage, isChatOpen, clearLatestChatMessage]);

  useEffect(() => {
    if (isChatOpen) {
      setVisible(false);
      clearLatestChatMessage();
    }
  }, [isChatOpen, clearLatestChatMessage]);

  if (!visible || !latestChatMessage || isChatOpen) return null;

  const handleClick = () => {
    setVisible(false);
    clearLatestChatMessage();
    onOpenChat();
  };

  const handleDismiss = (e: React.MouseEvent) => {
    e.stopPropagation();
    setVisible(false);
    clearLatestChatMessage();
  };

  return (
    <div 
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 animate-slide-down cursor-pointer"
      onClick={handleClick}
      data-testid="chat-notification"
    >
      <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border/50 rounded-lg shadow-xl max-w-sm">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary truncate">
            {latestChatMessage.playerName}
          </p>
          <p className="text-sm text-foreground truncate">
            {latestChatMessage.content}
          </p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="flex-shrink-0"
          onClick={handleDismiss}
          data-testid="button-dismiss-chat-notification"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
