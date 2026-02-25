import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Play, LogOut, Trophy, Keyboard, Timer, UserX } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Progress } from "@/components/ui/progress";
import { GameChat } from "@/components/game-chat";
import { useSoundSettings } from "@/hooks/use-sound-settings";

export function TypingRace() {
  const { 
    typingLobby, 
    typingGame, 
    currentPlayerId, 
    joinTypingLobby,
    startTypingGame,
    leaveTypingLobby,
    updateTypingProgress,
    finishTypingRace,
    isAdmin,
    adminForceKick
  } = useWebSocket();
  const { playWinSound, playLoseSound } = useSoundSettings();

  const [input, setInput] = useState("");
  const [startTime, setStartTime] = useState<number | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const soundPlayedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!typingGame || !currentPlayerId) return;
    if (typingGame.status !== "finished") {
      soundPlayedRef.current = null;
      return;
    }
    const soundKey = `${typingGame.id}-finished`;
    if (soundPlayedRef.current === soundKey) return;
    soundPlayedRef.current = soundKey;
    
    if (typingGame.winner === currentPlayerId) {
      playWinSound();
    } else {
      playLoseSound();
    }
  }, [typingGame, currentPlayerId, playWinSound, playLoseSound]);

  useEffect(() => {
    if (typingGame?.status === "countdown") {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((typingGame.startTime - Date.now()) / 1000));
        setCountdown(remaining);
        if (remaining <= 0) {
          clearInterval(interval);
          setCountdown(null);
          inputRef.current?.focus();
        }
      }, 100);
      return () => clearInterval(interval);
    }
  }, [typingGame?.status, typingGame?.startTime]);

  useEffect(() => {
    if (typingGame?.status === "racing" && !startTime) {
      setStartTime(Date.now());
      inputRef.current?.focus();
    }
  }, [typingGame?.status, startTime]);

  useEffect(() => {
    if (!typingGame) {
      setInput("");
      setStartTime(null);
      setCountdown(null);
    }
  }, [typingGame]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (typingGame?.status !== "racing") return;
    
    const value = e.target.value;
    setInput(value);

    const target = typingGame.text;
    const correctPart = target.slice(0, value.length);
    const isCorrect = value === correctPart;
    
    if (!isCorrect) return;

    const progress = Math.round((value.length / target.length) * 100);
    const elapsed = (Date.now() - (startTime || Date.now())) / 1000 / 60;
    const words = value.split(" ").length;
    const wpm = elapsed > 0 ? Math.round(words / elapsed) : 0;

    updateTypingProgress(progress, wpm);

    if (value === target) {
      finishTypingRace();
    }
  };

  if (!typingLobby && !typingGame) {
    return (
      <Card className="w-full max-w-md mx-auto" data-testid="typing-join-card">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Keyboard className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Typing Race</CardTitle>
          <p className="text-muted-foreground">
            Race against other players to type the text fastest and most accurately!
          </p>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={joinTypingLobby} size="lg" data-testid="button-join-typing">
            <Users className="w-5 h-5 mr-2" />
            Join Race
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (typingLobby && !typingGame) {
    const isHost = typingLobby.hostId === currentPlayerId;
    const canStart = typingLobby.players.length >= typingLobby.minPlayers;

    return (
      <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
        <GameChat />
        <Card className="w-full max-w-md" data-testid="typing-lobby-card">
          <CardHeader className="text-center border-b">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={leaveTypingLobby} data-testid="button-leave-typing-lobby">
                <LogOut className="w-4 h-4 mr-1" />
                Leave
              </Button>
              <CardTitle>Typing Race Lobby</CardTitle>
              <div className="w-16" />
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <Badge variant="outline" className="text-lg px-4 py-2">
                {typingLobby.players.length} / 6 Racers
              </Badge>
            </div>

            <div className="space-y-3">
              {typingLobby.players.map((player, idx) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    player.id === currentPlayerId ? "bg-primary/10 ring-1 ring-primary" : "bg-muted/50"
                  }`}
                  data-testid={`typing-lobby-player-${idx}`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{player.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium flex-1">{player.name}</span>
                  {player.id === typingLobby.hostId && (
                    <Badge variant="secondary">Host</Badge>
                  )}
                  {player.id === currentPlayerId && (
                    <Badge>You</Badge>
                  )}
                  {isAdmin && player.id !== currentPlayerId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => adminForceKick(player.id)}
                      data-testid={`button-kick-typing-${player.id}`}
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {isHost ? (
              <Button 
                onClick={startTypingGame} 
                className="w-full" 
                size="lg"
                disabled={!canStart}
                data-testid="button-start-typing"
              >
                <Play className="w-5 h-5 mr-2" />
                {canStart ? "Start Race" : `Need ${typingLobby.minPlayers - typingLobby.players.length} more`}
              </Button>
            ) : (
              <div className="text-center text-muted-foreground">
                Waiting for host to start...
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!typingGame) return null;

  const gameFinished = typingGame.status === "finished";
  const currentPlayer = typingGame.players.find(p => p.id === currentPlayerId);
  const sortedPlayers = [...typingGame.players].sort((a, b) => {
    if (a.finished && !b.finished) return -1;
    if (!a.finished && b.finished) return 1;
    if (a.finished && b.finished) return (a.finishTime || 0) - (b.finishTime || 0);
    return b.progress - a.progress;
  });
  const winner = typingGame.winner ? typingGame.players.find(p => p.id === typingGame.winner) : null;

  const renderText = () => {
    const target = typingGame.text;
    const typed = input;
    
    return (
      <p className="text-xl leading-relaxed font-mono">
        {target.split("").map((char, idx) => {
          let className = "text-muted-foreground";
          if (idx < typed.length) {
            className = typed[idx] === char ? "text-success" : "text-destructive bg-destructive/20";
          }
          return (
            <span key={idx} className={className}>
              {char}
            </span>
          );
        })}
      </p>
    );
  };

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
      <GameChat />
      <Card className="w-full max-w-2xl" data-testid="typing-game-card">
        <CardHeader className="text-center border-b pb-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={leaveTypingLobby} data-testid="button-leave-typing-game">
              <LogOut className="w-4 h-4 mr-1" />
              Leave
            </Button>
            <CardTitle>Typing Race</CardTitle>
            <Badge variant="outline">
              {currentPlayer?.wpm || 0} WPM
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {countdown !== null && countdown > 0 && (
            <div className="text-center py-8">
              <div className="flex items-center justify-center gap-2 mb-4">
                <Timer className="w-8 h-8 text-primary animate-pulse" />
              </div>
              <p className="text-6xl font-bold text-primary animate-bounce">{countdown}</p>
              <p className="text-muted-foreground mt-2">Get ready to type!</p>
            </div>
          )}

          {(typingGame.status === "racing" || gameFinished) && (
            <>
              <div className="space-y-3">
                {sortedPlayers.map((player, idx) => (
                  <div key={player.id} className="space-y-1" data-testid={`typing-player-${idx}`}>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {player.name.slice(0, 2).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className={player.id === currentPlayerId ? "font-bold" : ""}>
                          {player.id === currentPlayerId ? "You" : player.name}
                        </span>
                        {player.finished && (
                          <Badge variant="secondary" className="text-xs">
                            {Math.round((player.finishTime || 0) / 1000)}s
                          </Badge>
                        )}
                        {player.id === typingGame.winner && (
                          <Trophy className="w-4 h-4 text-yellow-500" />
                        )}
                      </div>
                      <span className="text-muted-foreground">{player.wpm} WPM</span>
                    </div>
                    <Progress value={player.progress} className="h-2" />
                  </div>
                ))}
              </div>

              {!gameFinished && (
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    {renderText()}
                  </div>

                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={handleInputChange}
                    disabled={gameFinished || currentPlayer?.finished}
                    placeholder={currentPlayer?.finished ? "Waiting for others..." : "Start typing..."}
                    className="w-full px-4 py-3 text-lg border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary bg-background"
                    data-testid="typing-input"
                  />
                </div>
              )}

              {gameFinished && (
                <div className="flex flex-col items-center gap-4 animate-slide-up">
                  {winner?.id === currentPlayerId && (
                    <div className="flex items-center gap-2 text-success">
                      <Trophy className="w-6 h-6" />
                      <span className="font-bold">You won the race!</span>
                    </div>
                  )}
                  {winner && winner.id !== currentPlayerId && (
                    <div className="flex items-center gap-2">
                      <Trophy className="w-6 h-6 text-yellow-500" />
                      <span className="font-bold">{winner.name} won!</span>
                    </div>
                  )}
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground mb-2">Final Results</p>
                    <div className="space-y-1">
                      {sortedPlayers.filter(p => p.finished).map((p, idx) => (
                        <div key={p.id} className="flex items-center gap-2 justify-center">
                          <Badge variant={idx === 0 ? "default" : "outline"}>{idx + 1}</Badge>
                          <span>{p.id === currentPlayerId ? "You" : p.name}</span>
                          <span className="text-muted-foreground">
                            {p.wpm} WPM ({Math.round((p.finishTime || 0) / 1000)}s)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button onClick={leaveTypingLobby} data-testid="button-finish-typing">
                    Back to Games
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
