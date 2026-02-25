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
import { Crown, Users, Send, Lightbulb, Trophy, Clock, X } from "lucide-react";
import { GameChat } from "@/components/game-chat";
import { useSoundSettings } from "@/hooks/use-sound-settings";

export function EmojiChain() {
  const {
    emojiChainLobby,
    emojiChainGame,
    emojiChainChatMessages,
    currentPlayerId,
    startEmojiChainGame,
    leaveEmojiChainLobby,
    submitEmojiChainGuess,
    requestEmojiChainHint,
    sendEmojiChainChat,
    clearEmojiChainChat,
  } = useWebSocket();
  const { playWinSound, playLoseSound } = useSoundSettings();

  const [guess, setGuess] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const soundPlayedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!emojiChainGame || !currentPlayerId) return;
    if (emojiChainGame.status !== "finished") {
      soundPlayedRef.current = null;
      return;
    }
    const soundKey = `${emojiChainGame.id}-finished`;
    if (soundPlayedRef.current === soundKey) return;
    soundPlayedRef.current = soundKey;

    const activePlayers = emojiChainGame.players.filter((p) => !p.isEliminated);
    let winner;
    if (activePlayers.length === 1) {
      winner = activePlayers[0];
    } else {
      // If all eliminated, highest score wins
      winner = [...emojiChainGame.players].sort((a, b) => b.score - a.score)[0];
    }

    if (winner?.id === currentPlayerId) {
      playWinSound();
    } else {
      playLoseSound();
    }
  }, [emojiChainGame, currentPlayerId, playWinSound, playLoseSound]);

  const isHost = emojiChainLobby?.hostId === currentPlayerId;
  const canStart =
    emojiChainLobby &&
    emojiChainLobby.players.length >= emojiChainLobby.minPlayers;

  // This useEffect handles automatic scrolling to the latest chat message
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [emojiChainChatMessages]);

  useEffect(() => {
    if (emojiChainGame && emojiChainGame.status === "playing") {
      const elapsed = Math.floor(
        (Date.now() - emojiChainGame.roundStartTime) / 1000,
      );
      setTimeLeft(Math.max(0, 30 - elapsed));
      const interval = setInterval(() => {
        const newElapsed = Math.floor(
          (Date.now() - emojiChainGame.roundStartTime) / 1000,
        );
        setTimeLeft(Math.max(0, 30 - newElapsed));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [emojiChainGame?.roundStartTime, emojiChainGame?.status]);

  const handleSubmitGuess = (e: React.FormEvent) => {
    e.preventDefault();
    if (guess.trim()) {
      submitEmojiChainGuess(guess.trim());
      setGuess("");
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      sendEmojiChainChat(chatMessage.trim());
      setChatMessage("");
    }
  };

  const handleClose = () => {
    leaveEmojiChainLobby();
    clearEmojiChainChat();
  };

  const currentPlayer = emojiChainGame?.players.find(
    (p) => p.id === currentPlayerId,
  );
  const hasGuessed = currentPlayer?.hasGuessed || false;
  const isEliminated = currentPlayer?.isEliminated || false;

  // Get winner when game is finished
  const getWinner = () => {
    if (!emojiChainGame || emojiChainGame.status !== "finished") return null;
    const activePlayers = emojiChainGame.players.filter((p) => !p.isEliminated);
    if (activePlayers.length === 1) {
      return activePlayers[0];
    }
    // If all eliminated, highest score wins
    return [...emojiChainGame.players].sort((a, b) => b.score - a.score)[0];
  };
  const winner = getWinner();

  if (!emojiChainLobby && !emojiChainGame) return null;

  return (
    <>
      {/* GameChat component is still rendered, assuming it's a floating/separate chat, 
          but the in-dialog chat is for game-specific messages. */}
      <GameChat />

      <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
        {/* max-h-[90vh] ensures dialog doesn't exceed screen height */}
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Emoji Chain
              {emojiChainGame && (
                <Badge variant="secondary">
                  Round {emojiChainGame.roundIndex + 1}/
                  {emojiChainGame.totalRounds}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Guess the phrase from the emoji clues!
            </DialogDescription>
          </DialogHeader>

          {/* This main div contains the game content and the chat panel side-by-side */}
          <div className="flex-1 overflow-hidden flex gap-4 min-h-0">
            {/* Main Game Content Area */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="flex flex-col gap-4 pr-4">
                {!emojiChainGame ? (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="w-4 h-4" />
                        <span className="font-medium">
                          Players ({emojiChainLobby?.players.length || 0}/
                          {emojiChainLobby?.maxPlayers || 5})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {emojiChainLobby?.players.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center justify-between p-2 rounded bg-muted/50"
                            data-testid={`player-${player.id}`}
                          >
                            <div className="flex items-center gap-2">
                              {player.id === emojiChainLobby.hostId && (
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
                          onClick={startEmojiChainGame}
                          disabled={!canStart}
                          data-testid="button-start-emojichain"
                        >
                          {canStart
                            ? "Start Game"
                            : `Need ${emojiChainLobby?.minPlayers} players to start`}
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
                                timeLeft <= 10
                                  ? "text-destructive font-bold"
                                  : ""
                              }
                            >
                              {timeLeft}s
                            </span>
                          </div>
                          {emojiChainGame.currentHint && (
                            <Badge variant="outline">
                              Hint: {emojiChainGame.currentHint}
                            </Badge>
                          )}
                        </div>

                        <div className="text-center py-8">
                          <div
                            className="text-6xl mb-4"
                            data-testid="emoji-display"
                          >
                            {emojiChainGame.currentEmojis}
                          </div>
                          {emojiChainGame.status === "reveal" && (
                            <div
                              className="text-xl font-bold text-primary mt-4"
                              data-testid="answer-reveal"
                            >
                              Answer: {emojiChainGame.currentAnswer}
                            </div>
                          )}
                        </div>

                        {emojiChainGame.status === "playing" &&
                          !hasGuessed &&
                          !isEliminated && (
                            <form
                              onSubmit={handleSubmitGuess}
                              className="flex gap-2"
                            >
                              <Input
                                value={guess}
                                onChange={(e) => setGuess(e.target.value)}
                                placeholder="Type your guess..."
                                data-testid="input-emojichain-guess"
                              />
                              <Button
                                type="submit"
                                data-testid="button-submit-guess"
                              >
                                Guess
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={requestEmojiChainHint}
                                data-testid="button-request-hint"
                              >
                                <Lightbulb className="w-4 h-4" />
                              </Button>
                            </form>
                          )}
                        {hasGuessed &&
                          emojiChainGame.status === "playing" &&
                          !isEliminated && (
                            <div className="text-center text-muted-foreground">
                              Waiting for other players...
                            </div>
                          )}
                        {isEliminated &&
                          emojiChainGame.status === "playing" && (
                            <div className="text-center text-destructive font-medium">
                              You have been eliminated! Spectating...
                            </div>
                          )}
                        {emojiChainGame.status === "finished" && winner && (
                          <div className="text-center py-4">
                            <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                            <div className="text-xl font-bold text-primary">
                              {winner.id === currentPlayerId
                                ? "You win!"
                                : `${winner.name} wins!`}
                            </div>
                            <div className="text-muted-foreground mt-1">
                              Last one standing!
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="w-4 h-4" />
                          <span className="font-medium">Scores</span>
                        </div>
                        <div className="space-y-1">
                          {[...emojiChainGame.players]
                            .sort((a, b) => b.score - a.score)
                            .map((player, index) => (
                              <div
                                key={player.id}
                                className={`flex items-center justify-between text-sm ${player.isEliminated ? "opacity-50" : ""}`}
                                data-testid={`score-${player.id}`}
                              >
                                <span
                                  className={`${player.id === currentPlayerId ? "font-bold" : ""} ${player.isEliminated ? "line-through" : ""}`}
                                >
                                  {index + 1}. {player.name}
                                  {player.isEliminated && (
                                    <span className="ml-1 text-destructive text-xs">
                                      (out)
                                    </span>
                                  )}
                                </span>
                                <Badge
                                  variant={
                                    player.isEliminated
                                      ? "outline"
                                      : "secondary"
                                  }
                                >
                                  {player.score}
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

            {/* CHAT CONTAINER: Added h-[300px] to enforce a maximum height on the chat box */}
            <Card className="w-64 flex flex-col h-[400px]">
              <CardContent className="p-3 flex-1 flex flex-col min-h-0">
                <div className="text-sm font-medium mb-2">Chat</div>

                {/* Added flex-1 and h-full to ScrollArea and its container to ensure it fills the available space */}
                <div className="flex-1 min-h-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-2 pr-2">
                      {emojiChainChatMessages.map((msg) => (
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

                <form onSubmit={handleSendChat} className="flex gap-2 mt-2">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Chat..."
                    className="text-sm"
                    data-testid="input-emojichain-chat"
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

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              data-testid="button-leave-emojichain"
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
