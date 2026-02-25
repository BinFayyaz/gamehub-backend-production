import { useState, useEffect } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { GameChat } from "@/components/game-chat";
import {
  LogOut,
  Users,
  Play,
  Eye,
  EyeOff,
  Check,
  X,
  Crown,
  AlertTriangle,
  MessageCircle,
  Clock,
  Send,
} from "lucide-react";

export function SpotTheLiarLobby() {
  const { 
    spotTheLiarLobby, 
    currentPlayerId, 
    startSpotTheLiarGame, 
    leaveSpotTheLiarLobby,
    isAdmin,
    adminForceKick
  } = useWebSocket();

  if (!spotTheLiarLobby) return null;

  const isHost = currentPlayerId === spotTheLiarLobby.hostId;
  const canStart = spotTheLiarLobby.players.length >= spotTheLiarLobby.minPlayers && isHost;
  const waitingCount = spotTheLiarLobby.minPlayers - spotTheLiarLobby.players.length;

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
      <GameChat />
      <Card className="w-full max-w-md border-border/50 shadow-2xl animate-bounce-in" data-testid="spottheliar-lobby">
        <CardHeader className="text-center border-b border-border/50">
          <div className="flex items-center justify-between gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={leaveSpotTheLiarLobby}
              data-testid="button-leave-spottheliar-lobby"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Leave
            </Button>
            <div className="flex-1" />
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <Eye className="w-8 h-8 text-red-500" />
            <CardTitle className="text-2xl font-bold">Spot the Liar</CardTitle>
          </div>
          <CardDescription>
            One player has a different word - can you find them?
          </CardDescription>
          <Badge variant="secondary" className="mt-2">
            <Users className="w-3 h-3 mr-1" />
            {spotTheLiarLobby.players.length} / {spotTheLiarLobby.minPlayers}+ players
          </Badge>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {spotTheLiarLobby.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                  data-testid={`player-${player.id}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-red-500/20 text-red-500">
                      {player.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 font-medium">{player.name}</span>
                  {player.id === spotTheLiarLobby.hostId && (
                    <Badge variant="secondary" className="gap-1">
                      <Crown className="w-3 h-3" />
                      Host
                    </Badge>
                  )}
                  {isAdmin && player.id !== currentPlayerId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => adminForceKick(player.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="space-y-3">
            {waitingCount > 0 && (
              <p className="text-sm text-center text-muted-foreground">
                Waiting for {waitingCount} more player{waitingCount > 1 ? "s" : ""}...
              </p>
            )}

            {canStart && (
              <Button
                onClick={startSpotTheLiarGame}
                className="w-full bg-red-500 hover:bg-red-600"
                data-testid="button-start-spottheliar"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Game
              </Button>
            )}

            {!isHost && (
              <p className="text-sm text-center text-muted-foreground">
                Waiting for the host to start the game...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SpotTheLiarGame() {
  const { 
    spotTheLiarGame, 
    currentPlayerId,
    submitSpotTheLiarDescription,
    voteSpotTheLiar,
    leaveSpotTheLiarLobby
  } = useWebSocket();
  
  const [description, setDescription] = useState("");
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    if (spotTheLiarGame?.status === "describing") {
      setDescription("");
    }
    if (spotTheLiarGame?.status === "voting") {
      setHasVoted(false);
    }
  }, [spotTheLiarGame?.status, spotTheLiarGame?.roundNumber]);

  if (!spotTheLiarGame) return null;

  const isMyTurn = spotTheLiarGame.currentDescriber === currentPlayerId;
  const currentDescriber = spotTheLiarGame.players.find(p => p.id === spotTheLiarGame.currentDescriber);
  const hasVotedInGame = spotTheLiarGame.votes[currentPlayerId] !== undefined;
  const myDescription = spotTheLiarGame.descriptions.find(d => d.playerId === currentPlayerId);
  const isLiar = spotTheLiarGame.isLiar;
  const playerWord = spotTheLiarGame.playerWord;

  const handleSubmitDescription = () => {
    if (description.trim().length >= 3) {
      submitSpotTheLiarDescription(description.trim());
      setDescription("");
    }
  };

  const handleVote = (playerId: string) => {
    if (!hasVoted && !hasVotedInGame) {
      voteSpotTheLiar(playerId);
      setHasVoted(true);
    }
  };

  const renderContent = () => {
    switch (spotTheLiarGame.status) {
      case "describing":
        return (
          <div className="space-y-4">
            <div className="text-center p-4 rounded-lg bg-muted/50">
              <p className="text-sm text-muted-foreground">Category</p>
              <h3 className="text-xl font-bold">{spotTheLiarGame.category}</h3>
            </div>

            <div className={`text-center p-4 rounded-lg ${isLiar ? "bg-red-500/20 border-2 border-red-500" : "bg-primary/20 border-2 border-primary"}`}>
              <p className="text-sm text-muted-foreground">Your Word</p>
              <h3 className="text-2xl font-bold">{playerWord}</h3>
              {isLiar && (
                <Badge variant="destructive" className="mt-2">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  You are the LIAR!
                </Badge>
              )}
            </div>

            {isLiar && (
              <p className="text-sm text-center text-yellow-500">
                Blend in! Describe the word without revealing you have a different one.
              </p>
            )}

            <div className="space-y-2">
              <h4 className="font-medium">Descriptions:</h4>
              <ScrollArea className="h-32">
                <div className="space-y-2">
                  {spotTheLiarGame.descriptions.map((desc, i) => (
                    <div key={i} className="p-2 rounded bg-muted/50">
                      <span className="font-medium">{desc.playerName}:</span>{" "}
                      <span>{desc.description}</span>
                    </div>
                  ))}
                  {spotTheLiarGame.descriptions.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">
                      Waiting for descriptions...
                    </p>
                  )}
                </div>
              </ScrollArea>
            </div>

            {isMyTurn ? (
              <div className="space-y-2">
                <h4 className="font-medium text-center">Your turn to describe!</h4>
                <div className="flex gap-2">
                  <Input
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe your word..."
                    onKeyDown={(e) => e.key === "Enter" && handleSubmitDescription()}
                    data-testid="input-description"
                  />
                  <Button
                    onClick={handleSubmitDescription}
                    disabled={description.trim().length < 3}
                    data-testid="button-submit-description"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ) : myDescription ? (
              <div className="text-center p-3 rounded-lg bg-green-500/20">
                <Check className="w-5 h-5 text-green-500 mx-auto mb-1" />
                <p className="text-sm">You've submitted your description</p>
              </div>
            ) : (
              <div className="text-center p-3 rounded-lg bg-muted/50">
                <Clock className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
                <p className="text-sm text-muted-foreground">
                  Waiting for {currentDescriber?.name || "player"} to describe...
                </p>
              </div>
            )}
          </div>
        );

      case "voting":
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">Time to Vote!</h2>
              <p className="text-muted-foreground">Who do you think is the liar?</p>
            </div>

            <ScrollArea className="h-40">
              <div className="space-y-2">
                {spotTheLiarGame.descriptions.map((desc, i) => (
                  <div key={i} className="p-2 rounded bg-muted/50">
                    <span className="font-medium">{desc.playerName}:</span>{" "}
                    <span>{desc.description}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>

            <div className="grid grid-cols-2 gap-2">
              {spotTheLiarGame.players.map((player) => (
                <Button
                  key={player.id}
                  variant={hasVoted || hasVotedInGame ? "secondary" : "outline"}
                  className="h-auto py-3"
                  disabled={hasVoted || hasVotedInGame || player.id === currentPlayerId}
                  onClick={() => handleVote(player.id)}
                  data-testid={`vote-${player.id}`}
                >
                  <div className="flex flex-col items-center gap-1">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-red-500/20 text-red-500">
                        {player.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-sm">{player.name}</span>
                    {player.id === currentPlayerId && (
                      <Badge variant="outline" className="text-xs">You</Badge>
                    )}
                  </div>
                </Button>
              ))}
            </div>

            {(hasVoted || hasVotedInGame) && (
              <p className="text-sm text-center text-muted-foreground">
                Waiting for other players to vote...
                ({Object.keys(spotTheLiarGame.votes).length}/{spotTheLiarGame.players.length})
              </p>
            )}
          </div>
        );

      case "reveal":
        const liarPlayer = spotTheLiarGame.players.find(p => p.id === spotTheLiarGame.liarId);
        const liarCaught = (spotTheLiarGame as any).liarCaught;
        
        return (
          <div className="space-y-4">
            <div className={`text-center p-4 rounded-lg ${liarCaught ? "bg-green-500/20" : "bg-red-500/20"}`}>
              <h2 className="text-xl font-bold mb-2">
                {liarCaught ? "Liar Caught!" : "Liar Escaped!"}
              </h2>
              <p className="text-muted-foreground">
                The liar was <span className="font-bold">{liarPlayer?.name}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 rounded-lg bg-primary/20 text-center">
                <p className="text-sm text-muted-foreground">Real Word</p>
                <p className="font-bold">{spotTheLiarGame.realWord}</p>
              </div>
              <div className="p-3 rounded-lg bg-red-500/20 text-center">
                <p className="text-sm text-muted-foreground">Fake Word</p>
                <p className="font-bold">{spotTheLiarGame.fakeWord}</p>
              </div>
            </div>

            <div className="text-center">
              <Badge variant="secondary">Round {spotTheLiarGame.roundNumber} / {spotTheLiarGame.totalRounds}</Badge>
            </div>

            <p className="text-sm text-center text-muted-foreground">
              Next round starting soon...
            </p>
          </div>
        );

      case "finished":
        const winner = [...spotTheLiarGame.players].sort((a, b) => b.score - a.score)[0];
        
        return (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-2">Game Over!</h2>
              <p className="text-muted-foreground">Final Scores</p>
            </div>

            <div className="space-y-2">
              {[...spotTheLiarGame.players].sort((a, b) => b.score - a.score).map((player, i) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    i === 0 ? "bg-yellow-500/20 border border-yellow-500" : "bg-muted/50"
                  }`}
                >
                  <span className="font-bold text-lg">{i + 1}</span>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-red-500/20 text-red-500">
                      {player.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 font-medium">{player.name}</span>
                  <Badge variant="secondary">{player.score} pts</Badge>
                  {i === 0 && <Crown className="w-5 h-5 text-yellow-500" />}
                </div>
              ))}
            </div>

            <Button
              onClick={leaveSpotTheLiarLobby}
              className="w-full"
              data-testid="button-leave-game"
            >
              Back to Lobby
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 shadow-2xl" data-testid="spottheliar-game">
        <CardHeader className="text-center border-b border-border/50">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={leaveSpotTheLiarLobby}
              data-testid="button-leave-game"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Leave
            </Button>
            <div className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-red-500" />
              <CardTitle className="text-lg">Spot the Liar</CardTitle>
            </div>
            <Badge variant="secondary">
              R{spotTheLiarGame.roundNumber}/{spotTheLiarGame.totalRounds}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
