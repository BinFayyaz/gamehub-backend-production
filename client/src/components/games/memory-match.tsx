import { useState, useEffect, useRef } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Users, Play, LogOut, Trophy, Grid3X3, Star, Heart, Moon, Sun, Zap, Gem, Flame, Leaf, HelpCircle, UserX } from "lucide-react";
import { GameChat } from "@/components/game-chat";
import { EmojiReaction } from "@/components/emoji-reaction";
import { useSoundSettings } from "@/hooks/use-sound-settings";

const symbolIcons: Record<string, typeof Star> = {
  star: Star,
  heart: Heart,
  moon: Moon,
  sun: Sun,
  bolt: Zap,
  gem: Gem,
  flame: Flame,
  leaf: Leaf,
};

const REACTION_EMOJIS = ["😂", "😍", "🤩", "😥", "🙄", "😒", "😔", "🥶", "😱", "❤"];

export function MemoryMatch() {
  const { 
    memoryLobby, 
    memoryGame, 
    currentPlayerId, 
    joinMemoryLobby,
    startMemoryGame,
    leaveMemoryLobby,
    flipMemoryCard,
    activeEmojis,
    sendEmojiReaction,
    clearEmojiReaction,
    isAdmin,
    adminForceKick
  } = useWebSocket();
  const { playWinSound, playLoseSound } = useSoundSettings();
  const soundPlayedRef = useRef<string | null>(null);

  const gameEmojis = activeEmojis.filter(e => e.gameType === "memory" && e.gameId === memoryGame?.id);

  useEffect(() => {
    if (!memoryGame || !currentPlayerId) return;
    if (memoryGame.status !== "finished") {
      soundPlayedRef.current = null;
      return;
    }
    const sortedPlayers = [...memoryGame.players].sort((a, b) => b.pairs - a.pairs);
    const winner = sortedPlayers[0];
    const soundKey = `${memoryGame.id}-finished`;
    if (soundPlayedRef.current === soundKey) return;
    soundPlayedRef.current = soundKey;
    
    if (winner?.id === currentPlayerId) {
      playWinSound();
    } else {
      playLoseSound();
    }
  }, [memoryGame, currentPlayerId, playWinSound, playLoseSound]);

  const handleEmojiReaction = (emoji: string) => {
    if (memoryGame) {
      sendEmojiReaction("memory", memoryGame.id, emoji);
    }
  };

  const handleEmojiComplete = (id: string) => {
    clearEmojiReaction(id);
  };

  if (!memoryLobby && !memoryGame) {
    return (
      <Card className="w-full max-w-md mx-auto" data-testid="memory-join-card">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Grid3X3 className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Memory Match</CardTitle>
          <p className="text-muted-foreground">
            Find matching pairs before your opponents. Take turns flipping cards!
          </p>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button onClick={joinMemoryLobby} size="lg" data-testid="button-join-memory">
            <Users className="w-5 h-5 mr-2" />
            Join Game
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (memoryLobby && !memoryGame) {
    const isHost = memoryLobby.hostId === currentPlayerId;
    const canStart = memoryLobby.players.length >= memoryLobby.minPlayers;

    return (
      <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
        <GameChat />
        <Card className="w-full max-w-md" data-testid="memory-lobby-card">
          <CardHeader className="text-center border-b">
            <div className="flex items-center justify-between">
              <Button variant="ghost" size="sm" onClick={leaveMemoryLobby} data-testid="button-leave-memory-lobby">
                <LogOut className="w-4 h-4 mr-1" />
                Leave
              </Button>
              <CardTitle>Memory Match Lobby</CardTitle>
              <div className="w-16" />
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <Badge variant="outline" className="text-lg px-4 py-2">
                {memoryLobby.players.length} / 4 Players
              </Badge>
            </div>

            <div className="space-y-3">
              {memoryLobby.players.map((player, idx) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    player.id === currentPlayerId ? "bg-primary/10 ring-1 ring-primary" : "bg-muted/50"
                  }`}
                  data-testid={`memory-lobby-player-${idx}`}
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback>{player.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="font-medium flex-1">{player.name}</span>
                  {player.id === memoryLobby.hostId && (
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
                      data-testid={`button-kick-memory-${player.id}`}
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {isHost ? (
              <Button 
                onClick={startMemoryGame} 
                className="w-full" 
                size="lg"
                disabled={!canStart}
                data-testid="button-start-memory"
              >
                <Play className="w-5 h-5 mr-2" />
                {canStart ? "Start Game" : `Need ${memoryLobby.minPlayers - memoryLobby.players.length} more`}
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

  if (!memoryGame) return null;

  const isMyTurn = memoryGame.currentTurn === currentPlayerId;
  const gameFinished = memoryGame.status === "finished";
  const currentPlayer = memoryGame.players.find(p => p.id === currentPlayerId);
  const sortedPlayers = [...memoryGame.players].sort((a, b) => b.pairs - a.pairs);
  const winner = sortedPlayers[0];

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
      <GameChat />
      <Card className="w-full max-w-2xl relative" data-testid="memory-game-card">
        <CardHeader className="text-center border-b pb-4">
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={leaveMemoryLobby} data-testid="button-leave-memory-game">
              <LogOut className="w-4 h-4 mr-1" />
              Leave
            </Button>
            <CardTitle>Memory Match</CardTitle>
            <Badge variant="outline">
              {memoryGame.matchedPairs} / {memoryGame.totalPairs} Pairs
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="flex flex-wrap justify-center gap-2">
            {memoryGame.players.map((player, idx) => (
              <div
                key={player.id}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                  player.id === memoryGame.currentTurn && !gameFinished
                    ? "bg-primary/20 ring-2 ring-primary"
                    : "bg-muted/50"
                }`}
                data-testid={`memory-player-${idx}`}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-xs">
                    {player.name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium">
                    {player.id === currentPlayerId ? "You" : player.name}
                  </p>
                  <p className="text-xs text-muted-foreground">{player.pairs} pairs</p>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center">
            <Badge variant={gameFinished ? "default" : "outline"} className="text-sm px-4 py-1">
              {gameFinished 
                ? winner.id === currentPlayerId 
                  ? "You won!" 
                  : `${winner.name} won!`
                : isMyTurn 
                  ? "Your turn" 
                  : `${memoryGame.players.find(p => p.id === memoryGame.currentTurn)?.name}'s turn`
              }
            </Badge>
          </div>

          <div className="grid grid-cols-4 gap-2 max-w-sm mx-auto" data-testid="memory-board">
            {memoryGame.cards.map((card, idx) => (
              <button
                key={card.id}
                onClick={() => flipMemoryCard(card.id)}
                disabled={gameFinished || !isMyTurn || card.isFlipped || card.isMatched || memoryGame.status === "checking"}
                className={`
                  aspect-square rounded-lg text-2xl font-bold flex items-center justify-center
                  transition-all duration-300 transform
                  ${card.isFlipped || card.isMatched
                    ? "bg-primary text-primary-foreground rotate-0"
                    : "bg-muted hover:bg-muted/80 rotate-0"
                  }
                  ${card.isMatched ? "opacity-50" : ""}
                  ${!gameFinished && isMyTurn && !card.isFlipped && !card.isMatched && memoryGame.status !== "checking"
                    ? "hover:scale-105 cursor-pointer"
                    : ""
                  }
                  disabled:cursor-not-allowed
                `}
                data-testid={`memory-card-${idx}`}
              >
                {(card.isFlipped || card.isMatched) ? (
                  (() => {
                    const Icon = symbolIcons[card.symbol] || HelpCircle;
                    return <Icon className="w-8 h-8" />;
                  })()
                ) : (
                  <HelpCircle className="w-8 h-8 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>

          {gameFinished && (
            <div className="flex flex-col items-center gap-4 animate-slide-up">
              {winner.id === currentPlayerId && (
                <div className="flex items-center gap-2 text-success">
                  <Trophy className="w-6 h-6" />
                  <span className="font-bold">Victory!</span>
                </div>
              )}
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Final Scores</p>
                <div className="flex gap-4">
                  {sortedPlayers.map((p, idx) => (
                    <div key={p.id} className="text-center">
                      <p className="font-medium">{p.id === currentPlayerId ? "You" : p.name}</p>
                      <p className="text-lg font-bold">{p.pairs} pairs</p>
                    </div>
                  ))}
                </div>
              </div>
              <Button onClick={leaveMemoryLobby} data-testid="button-finish-memory">
                Back to Games
              </Button>
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
