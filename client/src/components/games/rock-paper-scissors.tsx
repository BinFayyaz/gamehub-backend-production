import { useState, useEffect, useRef } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, RotateCcw, LogOut, Hand, FileText, Scissors } from "lucide-react";
import { GameChat } from "@/components/game-chat";
import { EmojiReaction } from "@/components/emoji-reaction";
import { useSoundSettings } from "@/hooks/use-sound-settings";
import type { RPSChoice } from "@shared/schema";

const choices: { value: RPSChoice; icon: typeof Hand; label: string }[] = [
  { value: "rock", icon: Hand, label: "Rock" },
  { value: "paper", icon: FileText, label: "Paper" },
  { value: "scissors", icon: Scissors, label: "Scissors" },
];

const REACTION_EMOJIS = ["😂", "😍", "🤩", "😥", "🙄", "😒", "😔", "🥶", "😱", "❤"];

export function RockPaperScissors() {
  const {
    rpsGame,
    currentPlayerId,
    makeRPSChoice,
    requestRPSNextRound,
    leaveRPSGame,
    activeEmojis,
    sendEmojiReaction,
    clearEmojiReaction
  } = useWebSocket();
  const [selectedChoice, setSelectedChoice] = useState<RPSChoice | null>(null);
  const { playWinSound, playLoseSound, playDrawSound } = useSoundSettings();
  const soundPlayedRef = useRef<string | null>(null);

  const gameEmojis = activeEmojis.filter(e => e.gameType === "rps" && e.gameId === rpsGame?.id);

  useEffect(() => {
    if (!rpsGame) return;
    if (rpsGame.status !== "finished") {
      soundPlayedRef.current = null;
      return;
    }
    const isPlayer1 = currentPlayerId === rpsGame.player1Id;
    const myScore = isPlayer1 ? rpsGame.player1Score : rpsGame.player2Score;
    const opponentScore = isPlayer1 ? rpsGame.player2Score : rpsGame.player1Score;
    const soundKey = `${rpsGame.id}-${rpsGame.player1Score}-${rpsGame.player2Score}`;
    if (soundPlayedRef.current === soundKey) return;
    soundPlayedRef.current = soundKey;
    
    if (myScore > opponentScore) {
      playWinSound();
    } else if (myScore < opponentScore) {
      playLoseSound();
    } else {
      playDrawSound();
    }
  }, [rpsGame, currentPlayerId, playWinSound, playLoseSound, playDrawSound]);

  const handleEmojiReaction = (emoji: string) => {
    if (rpsGame) {
      sendEmojiReaction("rps", rpsGame.id, emoji);
    }
  };

  const handleEmojiComplete = (id: string) => {
    clearEmojiReaction(id);
  };

  if (!rpsGame) return null;

  const isPlayer1 = currentPlayerId === rpsGame.player1Id;
  const myChoice = isPlayer1 ? rpsGame.player1Choice : rpsGame.player2Choice;
  const opponentChoice = isPlayer1 ? rpsGame.player2Choice : rpsGame.player1Choice;
  const opponentName = isPlayer1 ? rpsGame.player2Name : rpsGame.player1Name;
  const myName = isPlayer1 ? rpsGame.player1Name : rpsGame.player2Name;
  const myScore = isPlayer1 ? rpsGame.player1Score : rpsGame.player2Score;
  const opponentScore = isPlayer1 ? rpsGame.player2Score : rpsGame.player1Score;

  const isRevealing = rpsGame.status === "revealing";
  const isFinished = rpsGame.status === "finished";
  const hasChosen = myChoice !== null;
  const opponentHasChosen = opponentChoice !== null;

  const isRoundWinner = rpsGame.roundWinner === currentPlayerId;
  const isRoundLoser = rpsGame.roundWinner && rpsGame.roundWinner !== currentPlayerId;
  const isRoundDraw = isRevealing && !rpsGame.roundWinner;

  const handleChoice = (choice: RPSChoice) => {
    if (!hasChosen && rpsGame.status === "choosing") {
      setSelectedChoice(choice);
      makeRPSChoice(choice);
    }
  };

  const handleNextRound = () => {
    setSelectedChoice(null);
    requestRPSNextRound();
  };

  const getStatusMessage = () => {
    if (isFinished) {
      return myScore > opponentScore ? "You won the match!" : `${opponentName} won the match!`;
    }
    if (isRevealing) {
      if (isRoundDraw) return "Draw!";
      if (isRoundWinner) return "You won this round!";
      return `${opponentName} won this round!`;
    }
    if (hasChosen) return "Waiting for opponent...";
    return "Make your choice!";
  };

  const getChoiceIcon = (choice: RPSChoice | null) => {
    if (!choice) return null;
    const found = choices.find(c => c.value === choice);
    return found ? found.icon : null;
  };

  const isSpectator = currentPlayerId !== rpsGame.player1Id && currentPlayerId !== rpsGame.player2Id;

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
      <GameChat />
      <Card className="w-full max-w-lg border-border/50 shadow-2xl animate-bounce-in relative" data-testid="rps-game-container">
        <CardHeader className="text-center border-b border-border/50 pb-4">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={leaveRPSGame}
              data-testid="button-leave-rps"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Leave
            </Button>
            <div className="flex flex-col items-center">
              <CardTitle className="text-xl font-bold">Rock Paper Scissors</CardTitle>
              <Badge variant="outline" className="mt-1">Round {rpsGame.round}</Badge>
            </div>
            <div className="w-20" />
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <PlayerCard
              name={opponentName}
              score={opponentScore}
              choice={isRevealing || isFinished ? opponentChoice : null}
              hasChosen={opponentHasChosen}
              isWinner={isRoundLoser}
            />

            <div className="flex flex-col items-center gap-2">
              <span className="text-2xl font-bold text-muted-foreground">VS</span>
              <Badge
                variant={isRevealing || isFinished ? (isRoundWinner ? "default" : "secondary") : "outline"}
                className={`text-sm px-3 py-1 text-center ${isRoundWinner ? "bg-success text-success-foreground" : ""} ${isRoundLoser ? "bg-destructive/20 text-destructive" : ""}`}
              >
                {getStatusMessage()}
              </Badge>
            </div>

            <PlayerCard
              name={myName}
              score={myScore}
              choice={isRevealing || isFinished ? myChoice : selectedChoice}
              hasChosen={hasChosen}
              isWinner={isRoundWinner}
              isYou
            />
          </div>

          {rpsGame.status === "choosing" && !hasChosen && (
            <div className="space-y-3">
              <p className="text-center text-sm text-muted-foreground">Choose your weapon:</p>
              <div className="flex justify-center gap-4" data-testid="rps-choices">
                {choices.map(({ value, icon: Icon, label }) => (
                  <Button
                    key={value}
                    variant="outline"
                    size="lg"
                    onClick={() => handleChoice(value)}
                    className="flex flex-col items-center gap-2 h-24 w-24 hover:border-primary hover:bg-primary/10 transition-all"
                    data-testid={`button-rps-${value}`}
                  >
                    <Icon className="w-8 h-8" />
                    <span className="text-xs">{label}</span>
                  </Button>
                ))}
              </div>
            </div>
          )}

          {hasChosen && rpsGame.status === "choosing" && (
            <div className="flex flex-col items-center gap-3 animate-fade-in">
              <div className="flex items-center gap-2 text-muted-foreground">
                <div className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                <span>Waiting for {opponentName}...</span>
              </div>
            </div>
          )}

          {(isRevealing || isFinished) && (
            <div className="flex items-center justify-center gap-4 animate-slide-up">
              {isRoundWinner && !isFinished && (
                <div className="flex items-center gap-2 text-success">
                  <Trophy className="w-5 h-5" />
                  <span className="font-bold">+1 Point!</span>
                </div>
              )}
              {!isFinished && (
                <Button onClick={handleNextRound} data-testid="button-next-round-rps">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Next Round
                </Button>
              )}
              {isFinished && (
                <>
                  {myScore > opponentScore && (
                    <div className="flex items-center gap-2 text-success">
                      <Trophy className="w-6 h-6" />
                      <span className="font-bold text-lg">Victory!</span>
                    </div>
                  )}
                  <Button onClick={handleNextRound} data-testid="button-rematch-rps">
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Play Again
                  </Button>
                </>
              )}
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

      {/* Emoji reaction bar - only for spectators */}
      {!isFinished && isSpectator && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 bg-background/90 backdrop-blur-sm rounded-full px-3 py-2 shadow-lg border border-border/50 pointer-events-auto z-50">
          {REACTION_EMOJIS.map(emoji => (
            <button
              key={emoji}
              onClick={() => handleEmojiReaction(emoji)}
              className="text-2xl hover:scale-125 transition-transform duration-200 active:scale-95"
              aria-label={`React with ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

interface PlayerCardProps {
  name: string;
  score: number;
  choice: RPSChoice | null;
  hasChosen: boolean;
  isWinner?: boolean;
  isYou?: boolean;
}

function PlayerCard({ name, score, choice, hasChosen, isWinner, isYou }: PlayerCardProps) {
  const initials = name.slice(0, 2).toUpperCase();
  const ChoiceIcon = choice ? choices.find(c => c.value === choice)?.icon : null;

  return (
    <div className={`flex flex-col items-center gap-3 p-4 rounded-xl transition-all ${isWinner ? "bg-success/10 ring-2 ring-success" : ""}`}>
      <Avatar className="h-14 w-14 border-2 border-border">
        <AvatarFallback className="bg-primary/20 text-primary font-bold">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">
          {isYou ? "You" : name}
        </p>
        <p className="text-xs text-muted-foreground">Score: {score}</p>
      </div>

      <div className={`w-20 h-20 rounded-xl flex items-center justify-center border-2 transition-all ${choice ? "border-primary bg-primary/10" : hasChosen ? "border-muted bg-muted/50" : "border-dashed border-muted"}`}>
        {choice && ChoiceIcon ? (
          <ChoiceIcon className="w-10 h-10 text-primary animate-bounce-in" />
        ) : hasChosen ? (
          <span className="text-2xl">?</span>
        ) : (
          <span className="text-muted-foreground text-xs">Choosing...</span>
        )}
      </div>
    </div>
  );
}