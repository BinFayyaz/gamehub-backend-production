import { useEffect, useState } from "react";
import { useWebSocket } from "@/lib/websocket";
import { MessageCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export function DmNotification() {
  const {
    latestDmMessage,
    currentPlayerId,
    currentDmPartner,
    setCurrentDmPartner,
    clearLatestDmMessage,
  } = useWebSocket();
  const [visible, setVisible] = useState(false);

  const incomingFrom = latestDmMessage?.fromPlayerId;
  const isIncoming = !!latestDmMessage && latestDmMessage.toPlayerId === currentPlayerId;
  const alreadyOpen = !!incomingFrom && currentDmPartner === incomingFrom;

  useEffect(() => {
    if (latestDmMessage && isIncoming && !alreadyOpen) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
        clearLatestDmMessage();
      }, 6000);
      return () => clearTimeout(timer);
    }
    setVisible(false);
  }, [latestDmMessage, isIncoming, alreadyOpen, clearLatestDmMessage]);

  if (!visible || !latestDmMessage || !incomingFrom || alreadyOpen) {
    return null;
  }

  return (
    <div
      className="fixed top-4 right-4 z-50 animate-slide-down cursor-pointer"
      onClick={() => {
        setCurrentDmPartner(incomingFrom);
        clearLatestDmMessage();
        setVisible(false);
      }}
      data-testid="dm-notification"
    >
      <div className="flex items-center gap-3 px-4 py-3 bg-card border border-border/50 rounded-lg shadow-xl max-w-sm">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
          <MessageCircle className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary truncate">
            DM from {latestDmMessage.fromPlayerName}
          </p>
          <p className="text-sm text-foreground truncate">{latestDmMessage.content}</p>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="flex-shrink-0"
          onClick={(e) => {
            e.stopPropagation();
            setVisible(false);
            clearLatestDmMessage();
          }}
          data-testid="button-dismiss-dm-notification"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
