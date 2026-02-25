import { useState, useRef, useEffect, useCallback } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  MessageCircle,
  Send,
  Minus,
  X,
  ChevronDown,
  Shield,
  Crown,
  Trash2,
} from "lucide-react";

interface ChatContainerProps {
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  onClose?: () => void;
  className?: string;
}

export function ChatContainer({
  isMinimized = false,
  onToggleMinimize,
  onClose,
  className = "",
}: ChatContainerProps) {
  const {
    messages,
    sendChatMessage,
    currentPlayerId,
    currentPlayerName,
    isAdmin,
    isVip,
    deleteMessage,
  } = useWebSocket();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const [newMessageCount, setNewMessageCount] = useState(0);

  const prevMessagesLengthRef = useRef(messages.length);
  const lastReadIndexRef = useRef(messages.length - 1);

  // Each message element
  const messageRefs = useRef<(HTMLDivElement | null)[]>([]);

  // -------------------------------------------------------
  // Helpers
  // -------------------------------------------------------

  const checkIfAtBottom = useCallback(() => {
    if (!scrollRef.current) return;

    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    // Check if within 50 pixels of the bottom
    const isBottom = scrollHeight - scrollTop - clientHeight < 50;

    setIsAtBottom(isBottom);

    if (isBottom) {
      setNewMessageCount(0);
      lastReadIndexRef.current = messages.length - 1;
    }
  }, [messages.length]);

  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;

    setIsAtBottom(true);
    setNewMessageCount(0);
    lastReadIndexRef.current = messages.length - 1;
  }, [messages.length]);

  const scrollToLastRead = useCallback(() => {
    const el = messageRefs.current[lastReadIndexRef.current];
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // -------------------------------------------------------
  // Scroll listener
  // -------------------------------------------------------
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    checkIfAtBottom();
    container.addEventListener("scroll", checkIfAtBottom);

    return () => {
      container.removeEventListener("scroll", checkIfAtBottom);
    };
  }, [checkIfAtBottom]);

  // -------------------------------------------------------
  // When chat opens → scroll to last read message
  // -------------------------------------------------------
  useEffect(() => {
    if (!isMinimized) {
      setTimeout(() => {
        if (lastReadIndexRef.current >= 0) {
          scrollToLastRead();
        } else {
          scrollToBottom();
        }
      }, 80);
    }
  }, [isMinimized, scrollToLastRead, scrollToBottom]);

  // -------------------------------------------------------
  // When a new message arrives
  // -------------------------------------------------------
  useEffect(() => {
    if (messages.length === 0 || isMinimized) return;

    const lastMessage = messages[messages.length - 1];
    const isOwnMessage =
      lastMessage.playerId === currentPlayerId ||
      (!!currentPlayerName &&
        lastMessage.playerName.toLowerCase() === currentPlayerName.toLowerCase());

    if (isOwnMessage || isAtBottom) {
      // Use requestAnimationFrame for ensuring scroll happens after DOM update
      requestAnimationFrame(scrollToBottom);
    } else {
      setNewMessageCount((prev) => prev + 1);
    }

    prevMessagesLengthRef.current = messages.length;
  }, [messages, isAtBottom, isMinimized, currentPlayerId, currentPlayerName, scrollToBottom]);

  // -------------------------------------------------------
  // Input handling
  // -------------------------------------------------------
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed) return;

    sendChatMessage(trimmed);
    setInput("");
    inputRef.current?.focus();
  };

  // -------------------------------------------------------
  // Minimized button UI
  // -------------------------------------------------------
  const unreadCount = isMinimized
    ? messages.length - (lastReadIndexRef.current + 1)
    : 0;

  if (isMinimized) {
    return (
      <Button
        onClick={onToggleMinimize}
        className="flex items-center gap-2 shadow-lg"
        data-testid="button-chat-expand"
      >
        <MessageCircle className="w-5 h-5" />
        <span>Chat</span>
        {unreadCount > 0 && (
          <span className="ml-1 px-1.5 py-0.5 text-xs bg-destructive text-destructive-foreground rounded-full">
            {unreadCount}
          </span>
        )}
      </Button>
    );
  }

  // -------------------------------------------------------
  // Full chat container UI
  // -------------------------------------------------------
  return (
    <Card
      className={`flex flex-col border-border/50 shadow-xl ${className}`}
      data-testid="chat-container"
    >
      <CardHeader className="flex flex-row items-center justify-between gap-2 p-3 border-b border-border/50 space-y-0">
        <div className="flex items-center gap-2">
          <MessageCircle className="w-5 h-5 text-primary" />
          <CardTitle className="text-base font-semibold">Chat</CardTitle>
        </div>
        <div className="flex items-center gap-1">
          {onToggleMinimize && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={onToggleMinimize}
            >
              <Minus className="w-4 h-4" />
            </Button>
          )}
          {onClose && (
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 flex flex-col min-h-0 relative">
        <ScrollArea className="flex-1 p-3" ref={scrollRef}>
          {messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-8 text-center text-muted-foreground">
              <MessageCircle className="w-10 h-10 mb-3 opacity-30" />
              <p className="text-sm">No messages yet</p>
              <p className="text-xs mt-1 opacity-70">Start the conversation!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {messages.map((message, index) => {
                const isOwn =
                  message.playerId === currentPlayerId ||
                  (!!currentPlayerName &&
                    message.playerName.toLowerCase() === currentPlayerName.toLowerCase());
                const messageIsAdmin = message.isAdmin;
                const messageIsVip = message.isVip;

                const getMessageBubbleStyle = () => {
                  // NEW LOGIC: Prioritize role skin over generic 'isOwn' style
                  if (messageIsAdmin) {
                    return "bg-gradient-to-br from-blue-500 to-purple-600 text-white border border-blue-400/50";
                  }
                  if (messageIsVip) {
                    return "bg-gradient-to-br from-amber-400 to-yellow-500 text-amber-950 border border-amber-300/50";
                  }
                  // Fallback to generic 'isOwn' style if no role, or 'muted' if not own.
                  if (isOwn) {
                    return "bg-primary text-primary-foreground";
                  }
                  return "bg-muted text-foreground";
                };

                const getNameStyle = () => {
                  if (isOwn) {
                    // If isOwn and has a role, return the role color for the name
                    if (messageIsAdmin) return "text-blue-400";
                    if (messageIsVip) return "text-amber-500";
                    return "text-primary";
                  }
                  if (messageIsAdmin) return "text-blue-400";
                  if (messageIsVip) return "text-amber-500";
                  return "text-warning";
                };

                return (
                  <div
                    key={message.id}
                    ref={(el) => (messageRefs.current[index] = el)}
                    className={`flex flex-col ${isOwn ? "items-end" : "items-start"} animate-slide-up`}
                    data-message-index={index}
                    data-testid={`chat-message-${message.id}`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      {/* ROLE ICONS ABOVE NAME: Show for everyone, including self if applicable */}
                      {messageIsAdmin && <Shield className="w-3 h-3 text-blue-400" />}
                      {messageIsVip && !messageIsAdmin && (
                        <Crown className="w-3 h-3 text-amber-500" />
                      )}
                      <span className={`text-xs font-medium ${getNameStyle()}`}>
                        {isOwn ? "You" : message.playerName}
                      </span>
                      {/* ROLE TAGS ABOVE NAME: Show for everyone, including self if applicable */}
                      {messageIsAdmin && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-400 font-medium">
                          ADMIN
                        </span>
                      )}
                      {messageIsVip && !messageIsAdmin && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-500 font-medium">
                          VIP
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground/70">
                        {formatTime(message.timestamp)}
                      </span>
                    </div>

                    <div className="group/msg relative">
                      <div
                        // *** WIDER MESSAGE BUBBLE FIX: max-w-full ***
                        className={`relative px-3 py-2 rounded-lg max-w-full break-words ${getMessageBubbleStyle()}`}
                      >
                        {/* ROLE ICONS INSIDE BUBBLE: Show for everyone, including self if applicable */}
                        {message.isAdmin && (
                          <Shield className="absolute -top-1 -right-1 w-4 h-4 text-blue-300 drop-shadow-lg" />
                        )}
                        {message.isVip && !message.isAdmin && (
                          <Crown className="absolute -top-1 -right-1 w-4 h-4 text-amber-400 drop-shadow-lg" />
                        )}
                        <p className="text-sm">{message.content}</p>
                      </div>
                      {(isAdmin || (isVip && isOwn)) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="absolute -right-7 top-0 h-6 w-6 opacity-0 group-hover/msg:opacity-100 transition-opacity"
                          onClick={() => deleteMessage(message.id)}
                          data-testid={`button-delete-message-${message.id}`}
                        >
                          <Trash2 className="w-3 h-3 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* ↓↓↓ Down arrow button with new message counter ↓↓↓ */}
        {!isAtBottom && (
          <Button
            onClick={scrollToBottom}
            size="sm"
            className="absolute bottom-16 left-1/2 transform -translate-x-1/2 shadow-lg flex items-center gap-2 z-10"
          >
            <ChevronDown className="w-4 h-4" />
            {newMessageCount > 0
              ? `${newMessageCount} new ${newMessageCount === 1 ? "message" : "messages"}`
              : "Scroll to bottom"}
          </Button>
        )}

        <form onSubmit={handleSubmit} className="p-3 border-t border-border/50">
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="flex-1 bg-muted/50"
              maxLength={500}
            />
            <Button type="submit" size="icon" disabled={!input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
