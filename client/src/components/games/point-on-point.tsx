import { useState, useRef, useEffect } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ArrowLeft, Send, Users, Crown, MessageCircle, X, UserX } from "lucide-react";
import { GameChat } from "@/components/game-chat";

interface ChatMessage {
  id: string;
  sender: string;
  message: string;
}

function InGameChat({
  messages,
  onSend,
}: {
  messages: ChatMessage[];
  onSend: (message: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = () => {
    if (input.trim()) {
      onSend(input.trim());
      setInput("");
    }
  };

  if (!isOpen) {
    return (
      <Button
        className="fixed bottom-4 right-4 z-50"
        onClick={() => setIsOpen(true)}
        data-testid="button-open-pop-chat"
      >
        <MessageCircle className="w-4 h-4 mr-2" />
        Chat
        {messages.length > 0 && (
          <Badge variant="secondary" className="ml-2">
            {messages.length}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 z-50 w-80 h-80 flex flex-col">
      <CardHeader className="py-2 px-3 flex flex-row items-center gap-2 justify-between">
        <span className="text-sm font-medium">Chat</span>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={() => setIsOpen(false)}
          data-testid="button-close-pop-chat"
        >
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-2 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 pr-2" ref={scrollRef}>
          <div className="space-y-2">
            {messages.map((msg) => (
              <div key={msg.id} className="text-sm">
                <span className="font-medium">{msg.sender}: </span>
                <span className="text-muted-foreground">{msg.message}</span>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground text-xs">
                No messages yet
              </div>
            )}
          </div>
        </ScrollArea>
        <div className="flex gap-2 mt-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="h-8"
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            data-testid="input-pop-chat-message"
          />
          <Button size="sm" onClick={handleSend} data-testid="button-send-pop-chat">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function PointOnPointLobby() {
  const {
    pointOnPointLobby,
    pointOnPointChatMessages,
    currentPlayerId,
    leavePointOnPointLobby,
    startPointOnPointGame,
    sendPointOnPointChat,
    isAdmin,
    adminForceKick,
  } = useWebSocket();

  if (!pointOnPointLobby) return null;

  const isHost = pointOnPointLobby.hostId === currentPlayerId;
  const canStart = pointOnPointLobby.players.length >= pointOnPointLobby.minPlayers;

  return (
    <>
      <GameChat />
      <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-row items-center gap-2 justify-between pb-2">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Point on Point
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={leavePointOnPointLobby}
              data-testid="button-leave-pop-lobby"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center text-sm text-muted-foreground">
              A collaborative sentence game! Take turns adding to the story.
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                <span className="text-sm font-medium">
                  Players ({pointOnPointLobby.players.length}/{pointOnPointLobby.maxPlayers})
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {pointOnPointLobby.players.map((player) => (
                  <div key={player.id} className="flex items-center gap-1">
                    <Badge
                      variant={player.id === pointOnPointLobby.hostId ? "default" : "secondary"}
                      className="flex items-center gap-1"
                      data-testid={`badge-player-${player.id}`}
                    >
                      {player.id === pointOnPointLobby.hostId && <Crown className="h-3 w-3" />}
                      {player.name}
                    </Badge>
                    {isAdmin && player.id !== currentPlayerId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-destructive hover:bg-destructive/10"
                        onClick={() => adminForceKick(player.id)}
                        data-testid={`button-kick-pop-${player.id}`}
                      >
                        <UserX className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="text-sm text-muted-foreground text-center">
              Waiting for {pointOnPointLobby.minPlayers - pointOnPointLobby.players.length > 0 
                ? `${pointOnPointLobby.minPlayers - pointOnPointLobby.players.length} more player(s)`
                : "host to start..."}
            </div>

            {isHost && (
              <Button
                className="w-full"
                onClick={startPointOnPointGame}
                disabled={!canStart}
                data-testid="button-start-pop-game"
              >
                Start Game ({pointOnPointLobby.players.length}/{pointOnPointLobby.minPlayers} min)
              </Button>
            )}
          </CardContent>
        </Card>

        <InGameChat
          messages={pointOnPointChatMessages}
          onSend={sendPointOnPointChat}
        />
      </div>
    </>
  );
}

export function PointOnPointGame() {
  const {
    pointOnPointGame,
    pointOnPointChatMessages,
    currentPlayerId,
    submitPointOnPointSentence,
    endPointOnPointGame,
    leavePointOnPointLobby,
    sendPointOnPointChat,
  } = useWebSocket();
  const [sentence, setSentence] = useState("");

  if (!pointOnPointGame) return null;

  const isHost = pointOnPointGame.hostId === currentPlayerId;
  const isMyTurn = pointOnPointGame.currentTurn === currentPlayerId;
  const currentPlayer = pointOnPointGame.players.find(
    (p) => p.id === pointOnPointGame.currentTurn
  );
  const isFinished = pointOnPointGame.status === "finished";

  const handleSubmit = () => {
    if (sentence.trim() && isMyTurn) {
      submitPointOnPointSentence(sentence.trim());
      setSentence("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const fullStory = [
    pointOnPointGame.initialSentence,
    ...pointOnPointGame.sentences.map((s) => s.content),
  ].join(" ");

  return (
    <>
      <GameChat />
      <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col">
          <CardHeader className="flex flex-row items-center gap-2 justify-between pb-2">
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              Point on Point
              <Badge variant="outline">Round {pointOnPointGame.currentRound}</Badge>
            </CardTitle>
            <div className="flex items-center gap-2">
              {isHost && !isFinished && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={endPointOnPointGame}
                  data-testid="button-end-pop-game"
                >
                  End Game
                </Button>
              )}
              {isFinished && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={leavePointOnPointLobby}
                  data-testid="button-leave-pop-game"
                >
                  Leave
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <div className="flex flex-wrap gap-1">
              {pointOnPointGame.players.map((player) => (
                <Badge
                  key={player.id}
                  variant={
                    player.id === pointOnPointGame.currentTurn
                      ? "default"
                      : "secondary"
                  }
                  className="text-xs flex items-center gap-1"
                  data-testid={`badge-game-player-${player.id}`}
                >
                  {player.id === pointOnPointGame.hostId && <Crown className="h-3 w-3" />}
                  {player.name}
                  {player.id === pointOnPointGame.currentTurn && " (typing...)"}
                </Badge>
              ))}
            </div>
          </div>

          {isFinished ? (
            <div className="text-center py-4">
              <Badge variant="outline" className="text-lg px-4 py-2">
                Game Over!
              </Badge>
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              {isMyTurn ? (
                <span className="text-primary font-medium">Your turn! Add to the story.</span>
              ) : (
                <span>Waiting for {currentPlayer?.name} to continue...</span>
              )}
            </div>
          )}

          <ScrollArea className="flex-1 border rounded-md p-4 bg-muted/30">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <p className="leading-relaxed">
                <span className="italic text-muted-foreground">
                  {pointOnPointGame.initialSentence}
                </span>{" "}
                {pointOnPointGame.sentences.map((s, i) => (
                  <span
                    key={i}
                    className={
                      s.playerId === currentPlayerId
                        ? "font-medium text-primary"
                        : ""
                    }
                    data-testid={`text-sentence-${i}`}
                  >
                    {s.content}{" "}
                  </span>
                ))}
              </p>
            </div>
          </ScrollArea>

          {!isFinished && (
            <div className="flex gap-2">
              <Input
                placeholder={
                  isMyTurn
                    ? "Continue the story..."
                    : `Waiting for ${currentPlayer?.name}...`
                }
                value={sentence}
                onChange={(e) => setSentence(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={!isMyTurn}
                data-testid="input-sentence"
              />
              <Button
                onClick={handleSubmit}
                disabled={!isMyTurn || !sentence.trim()}
                data-testid="button-submit-sentence"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          )}

          {isFinished && (
            <div className="space-y-2">
              <div className="text-sm font-medium">Complete Story:</div>
              <div className="p-4 bg-muted rounded-md text-sm">
                {fullStory}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

        <InGameChat
          messages={pointOnPointChatMessages}
          onSend={sendPointOnPointChat}
        />
      </div>
    </>
  );
}
