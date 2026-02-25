import { useState, useEffect, useRef } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trophy, Users, Play, LogOut, Lightbulb, Send, Check, X, Crown, UserX } from "lucide-react";
import { GameChat } from "@/components/game-chat";
import { EmojiReaction } from "@/components/emoji-reaction";
import { useSoundSettings } from "@/hooks/use-sound-settings";

const REACTION_EMOJIS = ["😂", "😍", "🤩", "😥", "🙄", "😒", "😔", "🥶", "😱", "❤"];

export function RiddleLobby() {
  const { 
    riddleLobby, 
    currentPlayerId, 
    startRiddleGame, 
    leaveRiddleLobby,
    isAdmin,
    adminForceKick
  } = useWebSocket();

  if (!riddleLobby) return null;

  const isHost = currentPlayerId === riddleLobby.hostId;
  const canStart = riddleLobby.players.length >= riddleLobby.minPlayers && isHost;
  const waitingCount = riddleLobby.minPlayers - riddleLobby.players.length;

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
      <GameChat />
      <Card className="w-full max-w-md border-border/50 shadow-2xl animate-bounce-in" data-testid="riddle-lobby">
        <CardHeader className="text-center border-b border-border/50">
          <div className="flex items-center justify-between gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={leaveRiddleLobby}
              data-testid="button-leave-riddle-lobby"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Leave
            </Button>
            <div className="flex-1" />
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <Lightbulb className="w-8 h-8 text-warning" />
            <CardTitle className="text-2xl font-bold">Riddles</CardTitle>
          </div>
          <CardDescription>
            Waiting for players to join...
          </CardDescription>
          <Badge variant="secondary" className="mt-2">
            <Users className="w-3 h-3 mr-1" />
            {riddleLobby.players.length} / {riddleLobby.minPlayers}+ players
          </Badge>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">Players in lobby:</p>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {riddleLobby.players.map((player, index) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 animate-slide-up"
                    style={{ animationDelay: `${index * 0.1}s` }}
                    data-testid={`lobby-player-${player.id}`}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-primary/20 text-primary font-medium">
                        {player.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-foreground">{player.name}</span>
                        {player.id === riddleLobby.hostId && (
                          <Crown className="w-4 h-4 text-warning" />
                        )}
                        {player.id === currentPlayerId && (
                          <Badge variant="outline" className="text-xs">You</Badge>
                        )}
                      </div>
                    </div>
                    {isAdmin && player.id !== currentPlayerId && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:bg-destructive/10"
                        onClick={() => adminForceKick(player.id)}
                        data-testid={`button-kick-riddle-${player.id}`}
                      >
                        <UserX className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          {waitingCount > 0 && (
            <div className="text-center text-sm text-muted-foreground animate-pulse">
              Waiting for {waitingCount} more player{waitingCount > 1 ? "s" : ""}...
            </div>
          )}

          {isHost ? (
            <Button
              onClick={startRiddleGame}
              disabled={!canStart}
              className="w-full"
              data-testid="button-start-riddle-game"
            >
              <Play className="w-4 h-4 mr-2" />
              {canStart ? "Start Game" : `Need ${waitingCount} more player${waitingCount > 1 ? "s" : ""}`}
            </Button>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              Waiting for host to start the game...
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function RiddleGame() {
  const { 
    riddleGame, 
    currentPlayerId, 
    submitRiddleAnswer, 
    leaveRiddleLobby,
    activeEmojis,
    sendEmojiReaction,
    clearEmojiReaction
  } = useWebSocket();
  const [answer, setAnswer] = useState("");
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const { playWinSound, playLoseSound } = useSoundSettings();
  const soundPlayedRef = useRef<string | null>(null);

  const gameEmojis = activeEmojis.filter(
    (e) => e.gameType === "riddles" && e.gameId === riddleGame?.id
  );

  useEffect(() => {
    setAnswer("");
    setHasSubmitted(false);
  }, [riddleGame?.riddleIndex]);

  useEffect(() => {
    if (!riddleGame || !currentPlayerId) return;
    if (riddleGame.status !== "finished") {
      soundPlayedRef.current = null;
      return;
    }
    const sortedPlayers = [...riddleGame.players].sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      return a.totalTime - b.totalTime;
    });
    const winner = sortedPlayers[0];
    const soundKey = `${riddleGame.id}-finished`;
    if (soundPlayedRef.current === soundKey) return;
    soundPlayedRef.current = soundKey;
    
    if (winner?.id === currentPlayerId) {
      playWinSound();
    } else {
      playLoseSound();
    }
  }, [riddleGame, currentPlayerId, playWinSound, playLoseSound]);

  const handleEmojiReaction = (emoji: string) => {
    if (riddleGame) {
      sendEmojiReaction("riddles", riddleGame.id, emoji);
    }
  };

  const handleEmojiComplete = (id: string) => {
    clearEmojiReaction(id);
  };

  if (!riddleGame) return null;

  const currentPlayer = riddleGame.players.find(p => p.id === currentPlayerId);
  const sortedPlayers = [...riddleGame.players].sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.totalTime - b.totalTime;
  });
  const isFinished = riddleGame.status === "finished";
  const isRevealing = riddleGame.status === "reveal";
  const winner = isFinished ? sortedPlayers[0] : null;
  const isWinner = winner?.id === currentPlayerId;

  const formatTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return minutes > 0 ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answer.trim() && !hasSubmitted && !isRevealing && !isFinished) {
      submitRiddleAnswer(answer.trim());
      setHasSubmitted(true);
    }
  };

  const wasCorrect = riddleGame.correctAnswers.includes(currentPlayerId || "");

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
      <GameChat />
      <div className="w-full max-w-4xl flex flex-col md:flex-row gap-4">
        <Card className="flex-1 border-border/50 shadow-2xl relative" data-testid="riddle-game-container">
          <CardHeader className="border-b border-border/50">
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={leaveRiddleLobby}
                data-testid="button-leave-riddle-game"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Leave
              </Button>
              <div className="flex items-center gap-2">
                <Lightbulb className="w-5 h-5 text-warning" />
                <CardTitle>Riddles</CardTitle>
              </div>
              <Badge variant="outline">
                {riddleGame.riddleIndex + 1} / {riddleGame.totalRiddles}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {isFinished ? (
              <div className="flex flex-col items-center justify-center py-8 space-y-4 animate-bounce-in">
                <Trophy className={`w-16 h-16 ${isWinner ? "text-warning" : "text-muted-foreground"}`} />
                <h2 className="text-2xl font-bold text-foreground">
                  {isWinner ? "You Won!" : `${winner?.name} Won!`}
                </h2>
                <p className="text-muted-foreground">
                  Final Score: {winner?.score} points
                </p>
                {sortedPlayers.length > 1 && sortedPlayers[0].score === sortedPlayers[1].score && (
                  <p className="text-sm text-success">
                    Won by faster time! ({formatTime(winner?.totalTime || 0)})
                  </p>
                )}
                <Button onClick={leaveRiddleLobby} data-testid="button-finish-riddle">
                  Back to Games
                </Button>
              </div>
            ) : (
              <>
                <div className="p-6 rounded-xl bg-card border-2 border-warning/30 animate-fade-in">
                  <p className="text-sm text-warning font-medium mb-2">Riddle:</p>
                  <p className="text-lg text-foreground leading-relaxed">
                    {riddleGame.currentRiddle?.question}
                  </p>
                  {riddleGame.currentRiddle?.hint && (
                    <p className="mt-3 text-sm text-muted-foreground italic">
                      Hint: {riddleGame.currentRiddle.hint}
                    </p>
                  )}
                </div>

                {isRevealing ? (
                  <div className="space-y-4 animate-slide-up">
                    <div className={`p-4 rounded-lg text-center ${wasCorrect ? "bg-success/20 border border-success/50" : "bg-destructive/20 border border-destructive/50"}`}>
                      <div className="flex items-center justify-center gap-2 mb-2">
                        {wasCorrect ? (
                          <Check className="w-6 h-6 text-success" />
                        ) : (
                          <X className="w-6 h-6 text-destructive" />
                        )}
                        <span className={`font-bold ${wasCorrect ? "text-success" : "text-destructive"}`}>
                          {wasCorrect ? "Correct!" : "Wrong!"}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        The answer was: <span className="font-bold text-foreground">{riddleGame.currentRiddle?.answer}</span>
                      </p>
                    </div>
                    <p className="text-center text-sm text-muted-foreground">
                      Next riddle coming up...
                    </p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="flex gap-2">
                      <Input
                        value={answer}
                        onChange={(e) => setAnswer(e.target.value)}
                        placeholder="Type your answer..."
                        disabled={hasSubmitted}
                        className="flex-1"
                        data-testid="input-riddle-answer"
                      />
                      <Button type="submit" disabled={!answer.trim() || hasSubmitted} data-testid="button-submit-answer">
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                    {hasSubmitted && (
                      <p className="text-center text-sm text-muted-foreground animate-fade-in">
                        Answer submitted! Waiting for others...
                      </p>
                    )}
                  </form>
                )}
              </>
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

        <Card className="w-full md:w-64 border-border/50 shadow-xl" data-testid="riddle-leaderboard">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-warning" />
              Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3">
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {sortedPlayers.map((player, index) => (
                  <div
                    key={player.id}
                    className={`flex items-center gap-2 p-2 rounded-lg ${player.id === currentPlayerId ? "bg-primary/10" : "bg-muted/30"}`}
                    data-testid={`leaderboard-player-${player.id}`}
                  >
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${index === 0 ? "bg-warning text-warning-foreground" : index === 1 ? "bg-muted text-muted-foreground" : index === 2 ? "bg-orange-700 text-white" : "bg-muted/50"}`}>
                      {index + 1}
                    </span>
                    <Avatar className="h-7 w-7 shrink-0">
                      <AvatarFallback className="text-xs bg-primary/20 text-primary">
                        {player.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">
                        {player.id === currentPlayerId ? "You" : player.name}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatTime(player.totalTime)}
                      </p>
                    </div>
                    <Badge variant="secondary" className="text-xs shrink-0">
                      {player.score}
                    </Badge>
                    {player.hasAnswered && !isRevealing && !isFinished && (
                      <Check className="w-4 h-4 text-success shrink-0" />
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
