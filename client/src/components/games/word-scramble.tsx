import { useState, useEffect, useRef } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, RotateCcw, LogOut, Shuffle, Send, Check, X, Eye } from "lucide-react";
import { GameChat } from "@/components/game-chat";
import { EmojiReaction } from "@/components/emoji-reaction";
import { useSoundSettings } from "@/hooks/use-sound-settings";

const REACTION_EMOJIS = ["😂", "😍", "🤩", "😥", "🙄", "😒", "😔", "🥶", "😱", "❤"];

export function WordScramble() {
  const {
    wsGame,
    currentPlayerId,
    submitWSAnswer,
    requestWSNextRound,
    leaveWSGame,
    isSpectating,
    stopSpectatingWS,
    activeEmojis,
    sendEmojiReaction,
    clearEmojiReaction
  } = useWebSocket();
  const [answer, setAnswer] = useState("");
  const { playWinSound, playLoseSound, playDrawSound } = useSoundSettings();
  const soundPlayedRef = useRef<string | null>(null);

  const gameEmojis = activeEmojis.filter(
    (e) => e.gameType === "wordscramble" && e.gameId === wsGame?.id
  );

  useEffect(() => {
    if (!wsGame || isSpectating) return;
    if (wsGame.status !== "finished") {
      soundPlayedRef.current = null;
      return;
    }
    const isPlayer1 = currentPlayerId === wsGame.player1Id;
    const myScore = isPlayer1 ? wsGame.player1Score : wsGame.player2Score;
    const opponentScore = isPlayer1 ? wsGame.player2Score : wsGame.player1Score;
    const soundKey = `${wsGame.id}-${wsGame.player1Score}-${wsGame.player2Score}`;
    if (soundPlayedRef.current === soundKey) return;
    soundPlayedRef.current = soundKey;
    
    if (myScore > opponentScore) {
      playWinSound();
    } else if (myScore < opponentScore) {
      playLoseSound();
    } else {
      playDrawSound();
    }
  }, [wsGame, currentPlayerId, isSpectating, playWinSound, playLoseSound, playDrawSound]);

  const handleEmojiReaction = (emoji: string) => {
    if (wsGame) {
      sendEmojiReaction("wordscramble", wsGame.id, emoji);
    }
  };

  const handleEmojiComplete = (id: string) => {
    clearEmojiReaction(id);
  };

  if (!wsGame) return null;

  const isPlayer1 = currentPlayerId === wsGame.player1Id;
  const myAnswer = isPlayer1 ? wsGame.player1Answer : wsGame.player2Answer;
  const opponentAnswer = isPlayer1 ? wsGame.player2Answer : wsGame.player1Answer;
  const opponentName = isPlayer1 ? wsGame.player2Name : wsGame.player1Name;
  const myName = isPlayer1 ? wsGame.player1Name : wsGame.player2Name;
  const myScore = isPlayer1 ? wsGame.player1Score : wsGame.player2Score;
  const opponentScore = isPlayer1 ? wsGame.player2Score : wsGame.player1Score;

  const isRevealing = wsGame.status === "revealing";
  const isFinished = wsGame.status === "finished";
  const hasAnswered = myAnswer !== null;

  const isRoundWinner = wsGame.roundWinner === currentPlayerId;
  const isRoundLoser = wsGame.roundWinner && wsGame.roundWinner !== currentPlayerId;

  const myCorrect = isPlayer1 ? wsGame.player1Correct : wsGame.player2Correct;
  const opponentCorrect = isPlayer1 ? wsGame.player2Correct : wsGame.player1Correct;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim() && !hasAnswered && wsGame.status === "playing") {
      submitWSAnswer(answer.trim());
      setAnswer("");
    }
  };

  const handleNextRound = () => {
    requestWSNextRound();
  };

  const handleLeave = () => {
    if (isSpectating) {
      stopSpectatingWS();
    } else {
      leaveWSGame();
    }
  };

  const getStatusMessage = () => {
    if (isSpectating) {
      if (isFinished) {
        const winnerScore = wsGame.player1Score > wsGame.player2Score ? wsGame.player1Name : wsGame.player2Name;
        return `${winnerScore} won the match!`;
      }
      if (isRevealing) {
        if (!wsGame.roundWinner) return "Both wrong!";
        const winnerName = wsGame.roundWinner === wsGame.player1Id ? wsGame.player1Name : wsGame.player2Name;
        return `${winnerName} won this round!`;
      }
      return "Players are answering...";
    }
    if (isFinished) {
      return myScore > opponentScore ? "You won the match!" : `${opponentName} won the match!`;
    }
    if (isRevealing) {
      if (!wsGame.roundWinner) return "Both wrong!";
      if (isRoundWinner) return "You won this round!";
      return `${opponentName} won this round!`;
    }
    if (hasAnswered) return "Waiting for opponent...";
    return "Unscramble the word!";
  };

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
      <GameChat />
      <Card className="w-full max-w-md border-border/50 shadow-2xl animate-bounce-in relative" data-testid="ws-game-container">
        <CardHeader className="text-center border-b border-border/50 pb-4">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLeave}
              data-testid="button-leave-ws"
            >
              <LogOut className="w-4 h-4 mr-1" />
              {isSpectating ? "Stop Watching" : "Leave"}
            </Button>
            <div className="flex flex-col items-center">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Shuffle className="w-5 h-5 text-primary" />
                Word Scramble
              </CardTitle>
              {isSpectating ? (
                <Badge variant="secondary" className="mt-1 text-xs">
                  <Eye className="w-3 h-3 mr-1" />
                  Spectating
                </Badge>
              ) : (
                <Badge variant="outline" className="mt-1">Round {wsGame.round}</Badge>
              )}
            </div>
            <div className="w-20">
              {wsGame.spectators && wsGame.spectators.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Eye className="w-3 h-3 mr-1" />
                  {wsGame.spectators.length}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            {isSpectating ? (
              <>
                <PlayerCard name={wsGame.player1Name} score={wsGame.player1Score} isWinner={wsGame.roundWinner === wsGame.player1Id} />
                <div className="text-center">
                  <Badge variant="outline" className="text-sm px-3 py-1">
                    {getStatusMessage()}
                  </Badge>
                </div>
                <PlayerCard name={wsGame.player2Name} score={wsGame.player2Score} isWinner={wsGame.roundWinner === wsGame.player2Id} />
              </>
            ) : (
              <>
                <PlayerCard name={opponentName} score={opponentScore} isWinner={isRoundLoser} />
                <div className="text-center">
                  <Badge
                    variant={isRevealing || isFinished ? (isRoundWinner ? "default" : "secondary") : "outline"}
                    className={`text-sm px-3 py-1 ${isRoundWinner ? "bg-success text-success-foreground" : ""} ${isRoundLoser ? "bg-destructive/20 text-destructive" : ""}`}
                  >
                    {getStatusMessage()}
                  </Badge>
                </div>
                <PlayerCard name={myName} score={myScore} isWinner={isRoundWinner} isYou />
              </>
            )}
          </div>

          <div className="p-6 rounded-xl bg-card border-2 border-primary/30 text-center">
            <p className="text-sm text-muted-foreground mb-2">Scrambled Word:</p>
            <p className="text-3xl font-bold tracking-widest text-primary animate-pulse">
              {wsGame.scrambledWord.toUpperCase()}
            </p>
          </div>

          {!isSpectating && !isRevealing && !isFinished && !hasAnswered && (
            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Your answer..."
                className="flex-1"
                data-testid="input-ws-answer"
              />
              <Button type="submit" disabled={!answer.trim()} data-testid="button-submit-ws">
                <Send className="w-4 h-4" />
              </Button>
            </form>
          )}

          {!isSpectating && hasAnswered && wsGame.status === "playing" && (
            <div className="flex flex-col items-center gap-3 animate-fade-in">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span>Waiting for {opponentName}...</span>
              </div>
            </div>
          )}

          {isSpectating && !isRevealing && !isFinished && (
            <div className="flex flex-col items-center gap-3 animate-fade-in">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span>Players are answering...</span>
              </div>
            </div>
          )}

          {(isRevealing || isFinished) && (
            <div className="space-y-4 animate-slide-up">
              <div className="p-4 rounded-lg bg-muted/50 text-center">
                <p className="text-sm text-muted-foreground mb-1">The answer was:</p>
                <p className="text-xl font-bold text-foreground">{wsGame.originalWord?.toUpperCase()}</p>
              </div>
              
              {isSpectating ? (
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-3 rounded-lg text-center ${wsGame.player1Correct ? "bg-success/20 border border-success/50" : "bg-destructive/20 border border-destructive/50"}`}>
                    <p className="text-xs text-muted-foreground">{wsGame.player1Name}</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      {wsGame.player1Correct ? <Check className="w-4 h-4 text-success" /> : <X className="w-4 h-4 text-destructive" />}
                      <span className="font-medium">{wsGame.player1Answer || "No answer"}</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg text-center ${wsGame.player2Correct ? "bg-success/20 border border-success/50" : "bg-destructive/20 border border-destructive/50"}`}>
                    <p className="text-xs text-muted-foreground">{wsGame.player2Name}</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      {wsGame.player2Correct ? <Check className="w-4 h-4 text-success" /> : <X className="w-4 h-4 text-destructive" />}
                      <span className="font-medium">{wsGame.player2Answer || "No answer"}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div className={`p-3 rounded-lg text-center ${myCorrect ? "bg-success/20 border border-success/50" : "bg-destructive/20 border border-destructive/50"}`}>
                    <p className="text-xs text-muted-foreground">You</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      {myCorrect ? <Check className="w-4 h-4 text-success" /> : <X className="w-4 h-4 text-destructive" />}
                      <span className="font-medium">{myAnswer || "No answer"}</span>
                    </div>
                  </div>
                  <div className={`p-3 rounded-lg text-center ${opponentCorrect ? "bg-success/20 border border-success/50" : "bg-destructive/20 border border-destructive/50"}`}>
                    <p className="text-xs text-muted-foreground">{opponentName}</p>
                    <div className="flex items-center justify-center gap-1 mt-1">
                      {opponentCorrect ? <Check className="w-4 h-4 text-success" /> : <X className="w-4 h-4 text-destructive" />}
                      <span className="font-medium">{opponentAnswer || "No answer"}</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-center gap-4">
                {!isSpectating && isRoundWinner && !isFinished && (
                  <div className="flex items-center gap-2 text-success">
                    <Trophy className="w-5 h-5" />
                    <span className="font-bold">+1 Point!</span>
                  </div>
                )}
                {!isSpectating && !isFinished && (
                  <Button onClick={handleNextRound} data-testid="button-next-round-ws">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Next Round
                  </Button>
                )}
                {!isSpectating && isFinished && (
                  <>
                    {myScore > opponentScore && (
                      <div className="flex items-center gap-2 text-success">
                        <Trophy className="w-6 h-6" />
                        <span className="font-bold text-lg">Victory!</span>
                      </div>
                    )}
                    <Button onClick={handleNextRound} data-testid="button-rematch-ws">
                      <RotateCcw className="w-4 h-4 mr-2" />
                      Play Again
                    </Button>
                  </>
                )}
                {isSpectating && isFinished && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Trophy className="w-5 h-5" />
                    <span className="text-sm">Waiting for players to rematch...</span>
                  </div>
                )}
              </div>
            </div>
          )}
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
        </CardContent>

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

function PlayerCard({ name, score, isWinner, isYou }: { name: string; score: number; isWinner?: boolean; isYou?: boolean }) {
  return (
    <div className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${isWinner ? "bg-success/10 ring-2 ring-success" : ""}`}>
      <Avatar className="h-12 w-12 border-2 border-border">
        <AvatarFallback className="bg-primary/20 text-primary font-bold">
          {name.slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{isYou ? "You" : name}</p>
        <p className="text-xs text-muted-foreground">Score: {score}</p>
      </div>
    </div>
  );
}
