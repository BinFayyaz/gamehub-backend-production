import { useState, useEffect, useRef } from "react";
import { useWebSocket } from "@/lib/websocket";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Crown,
  Users,
  Send,
  Trophy,
  Clock,
  X,
  Link2,
  ArrowRight,
} from "lucide-react";
import { GameChat } from "@/components/game-chat";
import { useSoundSettings } from "@/hooks/use-sound-settings";

export function WordAssociation() {
  const {
    wordAssociationLobby,
    wordAssociationGame,
    wordAssociationChatMessages,
    currentPlayerId,
    startWordAssociationGame,
    leaveWordAssociationLobby,
    submitWordAssociationWord,
    sendWordAssociationChat,
    clearWordAssociationChat,
  } = useWebSocket();
  const { playWinSound, playLoseSound } = useSoundSettings();

  const [word, setWord] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(10);
  const [wordError, setWordError] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chainEndRef = useRef<HTMLDivElement>(null);
  const soundPlayedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!wordAssociationGame || !currentPlayerId) return;
    if (!wordAssociationGame.winner) {
      soundPlayedRef.current = null;
      return;
    }
    const soundKey = `${wordAssociationGame.id}-${wordAssociationGame.winner}`;
    if (soundPlayedRef.current === soundKey) return;
    soundPlayedRef.current = soundKey;

    if (wordAssociationGame.winner === currentPlayerId) {
      playWinSound();
    } else {
      playLoseSound();
    }
  }, [wordAssociationGame, currentPlayerId, playWinSound, playLoseSound]);

  const isHost = wordAssociationLobby?.hostId === currentPlayerId;
  const canStart =
    wordAssociationLobby &&
    wordAssociationLobby.players.length >= wordAssociationLobby.minPlayers;
  const isMyTurn = wordAssociationGame?.currentTurn === currentPlayerId;

  // Handles automatic scrolling for chat messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [wordAssociationChatMessages]);

  // Handles automatic scrolling for the word chain
  useEffect(() => {
    chainEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [wordAssociationGame?.wordChain.length]);

  useEffect(() => {
    if (wordAssociationGame && wordAssociationGame.status === "playing") {
      const elapsed = Math.floor(
        (Date.now() - wordAssociationGame.turnStartTime) / 1000,
      );
      setTimeLeft(Math.max(0, 10 - elapsed));
      const interval = setInterval(() => {
        const newElapsed = Math.floor(
          (Date.now() - wordAssociationGame.turnStartTime) / 1000,
        );
        setTimeLeft(Math.max(0, 10 - newElapsed));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [wordAssociationGame?.turnStartTime, wordAssociationGame?.status]);

  const handleSubmitWord = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedWord = word.trim();
    if (trimmedWord.includes(" ")) {
      setWordError("Only single words allowed!");
      return;
    }
    if (trimmedWord && isMyTurn) {
      setWordError("");
      submitWordAssociationWord(trimmedWord);
      setWord("");
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      sendWordAssociationChat(chatMessage.trim());
      setChatMessage("");
    }
  };

  const handleClose = () => {
    leaveWordAssociationLobby();
    clearWordAssociationChat();
  };

  const currentTurnPlayer = wordAssociationGame?.players.find(
    (p) => p.id === wordAssociationGame.currentTurn,
  );
  const myPlayer = wordAssociationGame?.players.find(
    (p) => p.id === currentPlayerId,
  );
  const isEliminated = myPlayer?.isEliminated || false;

  if (!wordAssociationLobby && !wordAssociationGame) return null;

  return (
    <>
      <GameChat />
      <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
        {/* max-h-[90vh] ensures dialog doesn't exceed screen height */}
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Link2 className="w-5 h-5" />
              Word Association
              {wordAssociationGame && (
                <Badge variant="secondary">
                  Round {wordAssociationGame.roundNumber}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Say a word related to the current word. Don't repeat or take too
              long!
            </DialogDescription>
          </DialogHeader>

          {/* Main content area: Game + Chat, designed to fill vertical space */}
          <div className="flex-1 overflow-hidden flex gap-4 min-h-0">
            {/* Left Panel: Game Logic and Scores */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="flex flex-col gap-4 pr-4">
                {!wordAssociationGame ? (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="w-4 h-4" />
                        <span className="font-medium">
                          Players ({wordAssociationLobby?.players.length || 0}/
                          {wordAssociationLobby?.maxPlayers || 5})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {wordAssociationLobby?.players.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center justify-between p-2 rounded bg-muted/50"
                            data-testid={`player-${player.id}`}
                          >
                            <div className="flex items-center gap-2">
                              {player.id === wordAssociationLobby.hostId && (
                                <Crown className="w-4 h-4 text-yellow-500" />
                              )}
                              <span>{player.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {isHost && (
                        <Button
                          className="w-full mt-4"
                          onClick={startWordAssociationGame}
                          disabled={!canStart}
                          data-testid="button-start-wordassociation"
                        >
                          {canStart
                            ? "Start Game"
                            : `Need ${wordAssociationLobby?.minPlayers} players to start`}
                        </Button>
                      )}
                      {!isHost && (
                        <p className="text-center text-muted-foreground mt-4">
                          Waiting for host to start...
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span
                              className={
                                timeLeft <= 5
                                  ? "text-destructive font-bold"
                                  : ""
                              }
                            >
                              {timeLeft}s
                            </span>
                          </div>
                          <Badge variant={isMyTurn ? "default" : "secondary"}>
                            {currentTurnPlayer?.name}'s turn
                          </Badge>
                        </div>

                        <div className="text-center py-4">
                          <div
                            className="text-3xl font-bold mb-4"
                            data-testid="current-word"
                          >
                            {wordAssociationGame.currentWord}
                          </div>

                          {wordAssociationGame.winner && (
                            <div
                              className="text-lg text-primary font-bold mb-4"
                              data-testid="winner-display"
                            >
                              Winner:{" "}
                              {
                                wordAssociationGame.players.find(
                                  (p) => p.id === wordAssociationGame.winner,
                                )?.name
                              }
                              !
                            </div>
                          )}
                        </div>

                        {/* Word Chain Display with scrolling */}
                        <ScrollArea className="h-32 mb-4 border rounded p-2">
                          <div className="flex flex-wrap gap-2 items-center">
                            {wordAssociationGame.wordChain.map(
                              (entry, index) => (
                                <div
                                  key={index}
                                  className="flex items-center gap-1"
                                >
                                  <Badge variant="outline" className="text-xs">
                                    {entry.word}
                                    <span className="ml-1 text-muted-foreground">
                                      ({entry.playerName})
                                    </span>
                                  </Badge>
                                  {index <
                                    wordAssociationGame.wordChain.length -
                                      1 && (
                                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                                  )}
                                </div>
                              ),
                            )}
                            <div ref={chainEndRef} />
                          </div>
                        </ScrollArea>

                        {wordAssociationGame.status === "playing" &&
                          !isEliminated &&
                          isMyTurn && (
                            <form
                              onSubmit={handleSubmitWord}
                              className="flex flex-col gap-2"
                            >
                              <div className="flex gap-2">
                                <Input
                                  value={word}
                                  onChange={(e) => {
                                    setWord(e.target.value);
                                    setWordError("");
                                  }}
                                  placeholder="Type a single related word..."
                                  autoFocus
                                  data-testid="input-wordassociation-word"
                                />
                                <Button
                                  type="submit"
                                  data-testid="button-submit-word"
                                >
                                  Submit
                                </Button>
                              </div>
                              {wordError && (
                                <span className="text-destructive text-sm">
                                  {wordError}
                                </span>
                              )}
                            </form>
                          )}
                        {isEliminated && (
                          <div className="text-center text-destructive">
                            You've been eliminated! Watch the game continue.
                          </div>
                        )}
                        {!isMyTurn &&
                          !isEliminated &&
                          wordAssociationGame.status === "playing" && (
                            <div className="text-center text-muted-foreground">
                              Waiting for {currentTurnPlayer?.name}...
                            </div>
                          )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="w-4 h-4" />
                          <span className="font-medium">Players</span>
                        </div>
                        <div className="space-y-1">
                          {wordAssociationGame.players.map((player) => (
                            <div
                              key={player.id}
                              className={`flex items-center justify-between text-sm ${
                                player.isEliminated
                                  ? "opacity-50 line-through"
                                  : ""
                              }`}
                              data-testid={`player-status-${player.id}`}
                            >
                              <span
                                className={
                                  player.id === currentPlayerId
                                    ? "font-bold"
                                    : ""
                                }
                              >
                                {player.name}
                                {player.id ===
                                  wordAssociationGame.currentTurn &&
                                  " (current)"}
                              </span>
                              <Badge
                                variant={
                                  player.isEliminated
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {player.isEliminated
                                  ? "Out"
                                  : `${player.score} pts`}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Right Panel: Chat Container - FIXED HEIGHT IMPLEMENTATION */}
            {/* Added h-[400px] to enforce a maximum height on the chat box */}
            <Card className="w-64 flex flex-col h-[400px]">
              <CardContent className="p-3 flex-1 flex flex-col min-h-0">
                <div className="text-sm font-medium mb-2">Chat</div>

                {/* This inner div and ScrollArea use flex-1 and h-full to occupy the remaining space */}
                <div className="flex-1 min-h-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-2 pr-2">
                      {wordAssociationChatMessages.map((msg) => (
                        <div key={msg.id} className="text-sm">
                          <span className="font-medium">{msg.sender}:</span>{" "}
                          <span className="text-muted-foreground">
                            {msg.message}
                          </span>
                        </div>
                      ))}
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>
                </div>

                {/* Chat Input Form */}
                <form onSubmit={handleSendChat} className="flex gap-2 mt-2">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Chat..."
                    className="text-sm"
                    data-testid="input-wordassociation-chat"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    variant="ghost"
                    data-testid="button-send-chat"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Leave Button */}
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              data-testid="button-leave-wordassociation"
            >
              <X className="w-4 h-4 mr-2" />
              Leave
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
