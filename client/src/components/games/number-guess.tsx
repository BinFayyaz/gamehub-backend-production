import { useState, useEffect, useRef } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Trophy,
  RotateCcw,
  LogOut,
  Hash,
  ArrowUp,
  ArrowDown,
  Check,
  Target,
  Eye,
} from "lucide-react";
import { GameChat } from "@/components/game-chat";
import { EmojiReaction } from "@/components/emoji-reaction";
import { useSoundSettings } from "@/hooks/use-sound-settings";

const REACTION_EMOJIS = [
  "😂",
  "😍",
  "🤩",
  "😥",
  "🙄",
  "😒",
  "😔",
  "🥶",
  "😱",
  "❤",
];

export function NumberGuess() {
  const {
    ngGame,
    currentPlayerId,
    submitNGGuess,
    requestNGNextRound,
    leaveNGGame,
    isSpectating,
    stopSpectatingNG,
    activeEmojis,
    sendEmojiReaction,
    clearEmojiReaction,
  } = useWebSocket();
  const [guess, setGuess] = useState("");
  const { playWinSound, playLoseSound } = useSoundSettings();
  const soundPlayedRef = useRef<string | null>(null);

  const gameEmojis = activeEmojis.filter(e => e.gameType === "numberguess" && e.gameId === ngGame?.id);

  const myGuessesRef = useRef<HTMLDivElement>(null);
  const opponentGuessesRef = useRef<HTMLDivElement>(null);
  const player1GuessesRef = useRef<HTMLDivElement>(null);
  const player2GuessesRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ngGame || isSpectating) return;
    if (ngGame.status !== "finished") {
      soundPlayedRef.current = null;
      return;
    }
    const soundKey = `${ngGame.id}-${ngGame.round}`;
    if (soundPlayedRef.current === soundKey) return;
    soundPlayedRef.current = soundKey;
    
    if (ngGame.winner === currentPlayerId) {
      playWinSound();
    } else {
      playLoseSound();
    }
  }, [ngGame, currentPlayerId, isSpectating, playWinSound, playLoseSound]);

  // Scroll to bottom when guesses change
  useEffect(() => {
    if (ngGame) {
      // Use setTimeout to ensure DOM has updated before scrolling
      const timeoutId = setTimeout(() => {
        // For players
        if (myGuessesRef.current) {
          myGuessesRef.current.scrollTo({
            top: myGuessesRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
        if (opponentGuessesRef.current) {
          opponentGuessesRef.current.scrollTo({
            top: opponentGuessesRef.current.scrollHeight,
            behavior: "smooth",
          });
        }

        // For spectators
        if (player1GuessesRef.current) {
          player1GuessesRef.current.scrollTo({
            top: player1GuessesRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
        if (player2GuessesRef.current) {
          player2GuessesRef.current.scrollTo({
            top: player2GuessesRef.current.scrollHeight,
            behavior: "smooth",
          });
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [ngGame?.player1Guesses?.length, ngGame?.player2Guesses?.length]); // Scroll when guesses count changes

  const handleEmojiReaction = (emoji: string) => {
    if (ngGame) {
      sendEmojiReaction("numberguess", ngGame.id, emoji);
    }
  };

  const handleEmojiComplete = (id: string) => {
    clearEmojiReaction(id);
  };

  if (!ngGame) return null;

  const isPlayer1 = currentPlayerId === ngGame.player1Id;
  const myGuesses = isPlayer1 ? ngGame.player1Guesses : ngGame.player2Guesses;
  const opponentGuesses = isPlayer1
    ? ngGame.player2Guesses
    : ngGame.player1Guesses;
  const opponentName = isPlayer1 ? ngGame.player2Name : ngGame.player1Name;
  const myName = isPlayer1 ? ngGame.player1Name : ngGame.player2Name;
  const myScore = isPlayer1 ? ngGame.player1Score : ngGame.player2Score;
  const opponentScore = isPlayer1 ? ngGame.player2Score : ngGame.player1Score;

  const isFinished = ngGame.status === "finished";
  const iWon = ngGame.winner === currentPlayerId;
  const opponentWon = ngGame.winner && ngGame.winner !== currentPlayerId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const guessNum = parseInt(guess, 10);
    if (!isNaN(guessNum) && guessNum >= 1 && guessNum <= 100) {
      submitNGGuess(guessNum);
      setGuess("");
    }
  };

  const handleLeave = () => {
    if (isSpectating) {
      stopSpectatingNG();
    } else {
      leaveNGGame();
    }
  };

  const getStatusMessage = () => {
    if (isSpectating) {
      if (isFinished) {
        const winnerName =
          ngGame.winner === ngGame.player1Id
            ? ngGame.player1Name
            : ngGame.player2Name;
        return `${winnerName} found it!`;
      }
      return "Players are guessing...";
    }
    if (isFinished) {
      return iWon ? "You found it!" : `${opponentName} found it!`;
    }
    return "Guess the number (1-100)";
  };

  const getHintIcon = (hint: string) => {
    if (hint === "higher") return <ArrowUp className="w-4 h-4 text-warning" />;
    if (hint === "lower") return <ArrowDown className="w-4 h-4 text-warning" />;
    return <Check className="w-4 h-4 text-success" />;
  };

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
      <GameChat />
      <Card
        className="w-full max-w-lg border-border/50 shadow-2xl animate-bounce-in relative"
        data-testid="ng-game-container"
      >
        <CardHeader className="text-center border-b border-border/50 pb-4">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLeave}
              data-testid="button-leave-ng"
            >
              <LogOut className="w-4 h-4 mr-1" />
              {isSpectating ? "Stop Watching" : "Leave"}
            </Button>
            <div className="flex flex-col items-center">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Hash className="w-5 h-5 text-primary" />
                Number Guess
              </CardTitle>
              {isSpectating ? (
                <Badge variant="secondary" className="mt-1 text-xs">
                  <Eye className="w-3 h-3 mr-1" />
                  Spectating
                </Badge>
              ) : (
                <Badge variant="outline" className="mt-1">
                  Round {ngGame.round}
                </Badge>
              )}
            </div>
            <div className="w-20">
              {ngGame.spectators && ngGame.spectators.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Eye className="w-3 h-3 mr-1" />
                  {ngGame.spectators.length}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            {isSpectating ? (
              <>
                <PlayerCard
                  name={ngGame.player1Name}
                  score={ngGame.player1Score}
                  isWinner={ngGame.winner === ngGame.player1Id}
                />
                <div className="text-center">
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {getStatusMessage()}
                  </Badge>
                </div>
                <PlayerCard
                  name={ngGame.player2Name}
                  score={ngGame.player2Score}
                  isWinner={ngGame.winner === ngGame.player2Id}
                />
              </>
            ) : (
              <>
                <PlayerCard
                  name={opponentName}
                  score={opponentScore}
                  isWinner={opponentWon || false}
                />
                <div className="text-center">
                  <Badge
                    variant={
                      isFinished ? (iWon ? "default" : "secondary") : "outline"
                    }
                    className={`text-sm px-3 py-1 ${iWon ? "bg-success text-success-foreground" : ""} ${opponentWon ? "bg-destructive/20 text-destructive" : ""}`}
                  >
                    {getStatusMessage()}
                  </Badge>
                </div>
                <PlayerCard
                  name={myName}
                  score={myScore}
                  isWinner={iWon}
                  isYou
                />
              </>
            )}
          </div>

          {!isFinished && (
            <div className="p-6 rounded-xl bg-card border-2 border-primary/30 text-center">
              <Target className="w-12 h-12 mx-auto text-primary mb-2 animate-pulse" />
              <p className="text-lg font-medium text-foreground">
                Find the number!
              </p>
              <p className="text-sm text-muted-foreground">Between 1 and 100</p>
            </div>
          )}

          {isFinished && (
            <div className="p-6 rounded-xl bg-success/20 border-2 border-success/50 text-center">
              <Trophy
                className={`w-12 h-12 mx-auto ${iWon ? "text-success" : "text-muted-foreground"} mb-2`}
              />
              <p className="text-2xl font-bold text-foreground">
                {ngGame.targetNumber}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                was the number!
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {isSpectating ? (
              <>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-center text-muted-foreground">
                    {ngGame.player1Name}
                  </p>
                  <div
                    ref={player1GuessesRef}
                    className="h-40 overflow-y-auto bg-muted/30 rounded-lg p-2 space-y-1 scroll-smooth"
                  >
                    {ngGame.player1Guesses.length === 0 ? (
                      <p className="text-xs text-center text-muted-foreground py-4">
                        No guesses yet
                      </p>
                    ) : (
                      ngGame.player1Guesses.map((g, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between p-2 rounded-md ${g.hint === "correct" ? "bg-success/20" : "bg-card"}`}
                        >
                          <span className="font-mono font-bold">{g.guess}</span>
                          {getHintIcon(g.hint)}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-center text-muted-foreground">
                    {ngGame.player2Name}
                  </p>
                  <div
                    ref={player2GuessesRef}
                    className="h-40 overflow-y-auto bg-muted/30 rounded-lg p-2 space-y-1 scroll-smooth"
                  >
                    {ngGame.player2Guesses.length === 0 ? (
                      <p className="text-xs text-center text-muted-foreground py-4">
                        No guesses yet
                      </p>
                    ) : (
                      ngGame.player2Guesses.map((g, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between p-2 rounded-md ${g.hint === "correct" ? "bg-success/20" : "bg-card"}`}
                        >
                          <span className="font-mono font-bold">{g.guess}</span>
                          {getHintIcon(g.hint)}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-center text-muted-foreground">
                    You
                  </p>
                  <div
                    ref={myGuessesRef}
                    className="h-40 overflow-y-auto bg-muted/30 rounded-lg p-2 space-y-1 scroll-smooth"
                  >
                    {myGuesses.length === 0 ? (
                      <p className="text-xs text-center text-muted-foreground py-4">
                        No guesses yet
                      </p>
                    ) : (
                      myGuesses.map((g, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between p-2 rounded-md ${g.hint === "correct" ? "bg-success/20" : "bg-card"}`}
                        >
                          <span className="font-mono font-bold">{g.guess}</span>
                          {getHintIcon(g.hint)}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm font-medium text-center text-muted-foreground">
                    {opponentName}
                  </p>
                  <div
                    ref={opponentGuessesRef}
                    className="h-40 overflow-y-auto bg-muted/30 rounded-lg p-2 space-y-1 scroll-smooth"
                  >
                    {opponentGuesses.length === 0 ? (
                      <p className="text-xs text-center text-muted-foreground py-4">
                        No guesses yet
                      </p>
                    ) : (
                      opponentGuesses.map((g, i) => (
                        <div
                          key={i}
                          className={`flex items-center justify-between p-2 rounded-md ${g.hint === "correct" ? "bg-success/20" : "bg-card"}`}
                        >
                          <span className="font-mono font-bold">{g.guess}</span>
                          {getHintIcon(g.hint)}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {!isSpectating && !isFinished && (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                type="number"
                min={1}
                max={100}
                value={guess}
                onChange={(e) => setGuess(e.target.value)}
                placeholder="Enter 1-100..."
                className="flex-1"
                data-testid="input-ng-guess"
                autoFocus
              />
              <Button
                type="submit"
                disabled={!guess}
                data-testid="button-submit-ng"
              >
                Guess
              </Button>
            </form>
          )}

          {!isSpectating && isFinished && (
            <div className="flex items-center justify-center gap-4">
              {iWon && (
                <div className="flex items-center gap-2 text-success">
                  <Trophy className="w-5 h-5" />
                  <span className="font-bold">+1 Point!</span>
                </div>
              )}
              <Button
                onClick={requestNGNextRound}
                data-testid="button-next-round-ng"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Play Again
              </Button>
            </div>
          )}

          {isSpectating && isFinished && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Trophy className="w-5 h-5" />
              <span className="text-sm">Waiting for players to rematch...</span>
            </div>
          )}

          {isSpectating && (
            <div className="flex flex-wrap justify-center gap-2 pt-4 border-t border-border/50">
              {REACTION_EMOJIS.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEmojiReaction(emoji)}
                  className="text-xl p-2 h-auto"
                  data-testid={`button-emoji-${emoji}`}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          )}
        </CardContent>

        {/* Emoji reactions overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {gameEmojis.map(({ id, emoji, senderName }) => (
            <EmojiReaction
              key={id}
              emoji={emoji}
              senderName={senderName}
              onComplete={() => handleEmojiComplete(id)}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

function PlayerCard({
  name,
  score,
  isWinner,
  isYou,
}: {
  name: string;
  score: number;
  isWinner?: boolean;
  isYou?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${isWinner ? "bg-success/10 ring-2 ring-success" : ""}`}
    >
      <Avatar className="h-12 w-12 border-2 border-border">
        <AvatarFallback className="bg-primary/20 text-primary font-bold">
          {name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {isYou ? "You" : name}
        </p>
        <p className="text-xs text-muted-foreground">Score: {score}</p>
      </div>
    </div>
  );
}
