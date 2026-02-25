import { useState, useRef, useEffect, useCallback } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Send, MessageCircle } from "lucide-react";

export function DmPanel() {
  const {
    players,
    currentPlayerId,
    currentDmPartner,
    setCurrentDmPartner,
    dmConversations,
    sendDirectMessage,
  } = useWebSocket();

  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const partner = players.find(p => p.id === currentDmPartner);
  const partnerName = partner?.username || "Unknown";

  const messages = currentDmPartner ? (dmConversations.get(currentDmPartner) || []) : [];

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  const handleSend = useCallback(() => {
    if (input.trim() && currentDmPartner) {
      sendDirectMessage(currentDmPartner, input.trim());
      setInput("");
    }
  }, [input, currentDmPartner, sendDirectMessage]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!currentDmPartner) {
    return null;
  }

  return (
    <Card className="fixed bottom-4 right-4 w-80 max-h-96 z-50 shadow-lg" data-testid="dm-panel">
      <CardHeader className="flex flex-row items-center justify-between py-2 px-3 border-b">
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageCircle className="w-4 h-4" />
          DM: {partnerName}
        </CardTitle>
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6"
          onClick={() => setCurrentDmPartner(null)}
          data-testid="button-close-dm"
        >
          <X className="w-4 h-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0 flex flex-col h-72">
        <ScrollArea className="flex-1 p-3" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm">
              <MessageCircle className="w-8 h-8 mb-2 opacity-30" />
              <p>No messages yet</p>
              <p className="text-xs">Start a conversation!</p>
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((msg, i) => {
                const isMe = msg.fromPlayerId === currentPlayerId;
                return (
                  <div
                    key={i}
                    className={`flex ${isMe ? "justify-end" : "justify-start"}`}
                    data-testid={`dm-message-${msg.fromPlayerId}-${i}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-2 text-sm ${
                        isMe
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                      data-testid={`dm-bubble-${i}`}
                    >
                      <p className="break-words" data-testid={`dm-text-${i}`}>{msg.content}</p>
                      <p className={`text-[10px] mt-1 ${isMe ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
        <div className="p-2 border-t flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 h-8 text-sm"
            data-testid="input-dm"
          />
          <Button
            size="icon"
            className="h-8 w-8"
            onClick={handleSend}
            disabled={!input.trim()}
            data-testid="button-send-dm"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
