import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  Play,
  LogOut,
  Search,
  MapPin,
  MessageCircle,
  AlertTriangle,
  Crown,
  Check,
  Send,
  HelpCircle,
} from "lucide-react";
import { GameChat } from "@/components/game-chat";
import { useState, useEffect } from "react";

const LOCATIONS = [
  "Airport",
  "Bank",
  "Beach",
  "Casino",
  "Church",
  "Circus",
  "Hospital",
  "Hotel",
  "Library",
  "Movie Theater",
  "Museum",
  "Police Station",
  "Restaurant",
  "School",
  "Space Station",
  "Submarine",
  "Supermarket",
  "Train Station",
  "University",
  "Zoo",
  "Bakery",
  "Gym",
  "Prison",
  "Theater",
  "Amusement Park",
  "Art Gallery",
  "Brewery",
  "Farm",
];

export function SpyHunt() {
  const {
    spyHuntLobby,
    spyHuntGame,
    isSpy,
    spyLocation,
    currentPlayerId,
    joinSpyHuntLobby,
    startSpyHuntGame,
    leaveSpyHuntLobby,
    spyHuntAsk,
    spyHuntAnswer,
    spyHuntAccuse,
    spyHuntVote,
    spyHuntGuessLocation,
  } = useWebSocket();

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [showLocations, setShowLocations] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (spyHuntGame && spyHuntGame.roundTimer) {
      const interval = setInterval(() => {
        const remaining = Math.max(
          0,
          Math.ceil((spyHuntGame.roundTimer - Date.now()) / 1000),
        );
        setTimeLeft(remaining);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [spyHuntGame?.roundTimer]);

  if (!spyHuntLobby && !spyHuntGame) {
    return (
      <Card className="w-full max-w-md mx-auto" data-testid="spyhunt-join-card">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Spy Hunt</CardTitle>
          <p className="text-muted-foreground">
            Find the spy before they discover the secret location!
          </p>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Badge variant="outline" className="text-sm">
            4-12 Players
          </Badge>
          <Button
            onClick={joinSpyHuntLobby}
            size="lg"
            data-testid="button-join-spyhunt"
          >
            <Users className="w-5 h-5 mr-2" />
            Join Game
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (spyHuntLobby && !spyHuntGame) {
    const isHost = spyHuntLobby.hostId === currentPlayerId;
    const canStart = spyHuntLobby.players.length >= spyHuntLobby.minPlayers;

    return (
      <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
        <Card className="w-full max-w-md" data-testid="spyhunt-lobby-card">
          <CardHeader className="text-center border-b">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={leaveSpyHuntLobby}
                data-testid="button-leave-spyhunt-lobby"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Leave
              </Button>
              <CardTitle>Spy Hunt Lobby</CardTitle>
              <div className="w-16" />
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <Badge variant="outline" className="text-lg px-4 py-2">
                {spyHuntLobby.players.length} / {spyHuntLobby.maxPlayers}{" "}
                Players
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Minimum {spyHuntLobby.minPlayers} players required
              </p>
            </div>

            <div className="space-y-2">
              {spyHuntLobby.players.map((player, idx) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    player.id === currentPlayerId
                      ? "bg-primary/10 ring-1 ring-primary"
                      : "bg-muted/50"
                  }`}
                  data-testid={`spyhunt-lobby-player-${idx}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {player.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium flex-1">{player.name}</span>
                  {player.id === spyHuntLobby.hostId && (
                    <Badge variant="secondary">Host</Badge>
                  )}
                  {player.id === currentPlayerId && <Badge>You</Badge>}
                </div>
              ))}
            </div>

            {isHost ? (
              <Button
                onClick={startSpyHuntGame}
                className="w-full"
                size="lg"
                disabled={!canStart}
                data-testid="button-start-spyhunt"
              >
                <Play className="w-5 h-5 mr-2" />
                {canStart
                  ? "Start Game"
                  : `Need ${spyHuntLobby.minPlayers - spyHuntLobby.players.length} more`}
              </Button>
            ) : (
              <div className="text-center text-muted-foreground">
                Waiting for host to start...
              </div>
            )}
          </CardContent>
        </Card>
        <GameChat />
      </div>
    );
  }

  if (!spyHuntGame) return null;

  const gameFinished = spyHuntGame.status === "finished";
  const isMyTurn = spyHuntGame.currentTurn === currentPlayerId;
  const lastQuestion =
    spyHuntGame.questionHistory[spyHuntGame.questionHistory.length - 1];
  const needToAnswer =
    lastQuestion &&
    lastQuestion.targetId === currentPlayerId &&
    lastQuestion.answer === null;
  const currentTurnPlayer = spyHuntGame.players.find(
    (p) => p.id === spyHuntGame.currentTurn,
  );

  const handleAsk = () => {
    if (!selectedPlayer || !question.trim()) return;
    spyHuntAsk(selectedPlayer, question.trim());
    setQuestion("");
    setSelectedPlayer(null);
  };

  const handleAnswer = () => {
    if (!answer.trim()) return;
    spyHuntAnswer(answer.trim());
    setAnswer("");
  };

  const handleAccuse = () => {
    if (!selectedPlayer) return;
    spyHuntAccuse(selectedPlayer);
    setSelectedPlayer(null);
  };

  const handleVote = (targetId: string) => {
    spyHuntVote(targetId);
  };

  const handleGuessLocation = () => {
    if (!selectedLocation) return;
    spyHuntGuessLocation(selectedLocation);
    setSelectedLocation(null);
    setShowLocations(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
      <Card
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col"
        data-testid="spyhunt-game-card"
      >
        <CardHeader className="text-center border-b pb-4 shrink-0">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={leaveSpyHuntLobby}
              data-testid="button-leave-spyhunt-game"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Leave
            </Button>
            <div className="flex flex-col items-center gap-1">
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Spy Hunt
              </CardTitle>
              {!gameFinished && (
                <Badge variant="outline">{formatTime(timeLeft)}</Badge>
              )}
            </div>
            <div className="flex flex-col items-end gap-1">
              {isSpy ? (
                <Badge
                  variant="destructive"
                  className="flex items-center gap-1"
                >
                  <Search className="w-3 h-3" />
                  You are the Spy
                </Badge>
              ) : (
                spyLocation && (
                  <Badge
                    variant="secondary"
                    className="flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3" />
                    {spyLocation}
                  </Badge>
                )
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-4 flex-1 overflow-hidden flex flex-col gap-4">
          {gameFinished && (
            <div className="text-center p-6 bg-muted/50 rounded-lg animate-slide-up shrink-0">
              <Crown className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
              <h2 className="text-2xl font-bold mb-2">
                {spyHuntGame.winner === "spy" ? "Spy Wins!" : "Players Win!"}
              </h2>
              <p className="text-muted-foreground mb-2">
                {spyHuntGame.winReason}
              </p>
              <p className="text-sm mb-4">
                Location:{" "}
                <span className="font-semibold">{spyHuntGame.location}</span>
              </p>
              <p className="text-sm mb-4">
                The spy was:{" "}
                <span className="font-semibold">
                  {
                    spyHuntGame.players.find((p) => p.id === spyHuntGame.spyId)
                      ?.name
                  }
                </span>
              </p>
              <Button
                onClick={leaveSpyHuntLobby}
                data-testid="button-finish-spyhunt"
              >
                Back to Games
              </Button>
            </div>
          )}

          {!gameFinished && spyHuntGame.status === "voting" && (
            <div className="p-4 bg-destructive/10 rounded-lg shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <span className="font-semibold">
                  {
                    spyHuntGame.players.find(
                      (p) => p.id === spyHuntGame.accuserId,
                    )?.name
                  }{" "}
                  accuses{" "}
                  {
                    spyHuntGame.players.find(
                      (p) => p.id === spyHuntGame.accusedId,
                    )?.name
                  }
                  !
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-3">
                Vote to eliminate this player:
              </p>
              <div className="flex gap-2">
                <Button
                  variant="destructive"
                  onClick={() => handleVote(spyHuntGame.accusedId!)}
                  disabled={
                    spyHuntGame.players.find((p) => p.id === currentPlayerId)
                      ?.hasVoted
                  }
                  data-testid="button-vote-yes"
                >
                  <Check className="w-4 h-4 mr-1" />
                  Eliminate
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleVote("skip")}
                  disabled={
                    spyHuntGame.players.find((p) => p.id === currentPlayerId)
                      ?.hasVoted
                  }
                  data-testid="button-vote-no"
                >
                  Skip
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 shrink-0">
            {spyHuntGame.players.map((player, idx) => {
              const isMe = player.id === currentPlayerId;
              const isTurn = player.id === spyHuntGame.currentTurn;
              const canSelect =
                !isMe && spyHuntGame.status === "questioning" && isMyTurn;

              return (
                <button
                  key={player.id}
                  onClick={() => canSelect && setSelectedPlayer(player.id)}
                  disabled={!canSelect}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all ${
                    selectedPlayer === player.id
                      ? "ring-2 ring-primary bg-primary/20"
                      : isTurn
                        ? "bg-primary/10 ring-1 ring-primary"
                        : canSelect
                          ? "bg-muted/50 hover:bg-muted"
                          : "bg-muted/50"
                  }`}
                  data-testid={`spyhunt-player-${idx}`}
                >
                  <Avatar className="h-6 w-6">
                    <AvatarFallback className="text-xs">
                      {player.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-sm font-medium">
                    {isMe ? "You" : player.name}
                  </span>
                  {player.hasVoted && spyHuntGame.status === "voting" && (
                    <Check className="w-4 h-4 text-green-500" />
                  )}
                </button>
              );
            })}
          </div>

          <ScrollArea className="flex-1 min-h-0 max-h-[300px] overflow-y-auto">
            <div className="space-y-3 pr-4">
              {spyHuntGame.questionHistory.map((qh, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-muted/30 rounded-lg"
                  data-testid={`question-${idx}`}
                >
                  <div className="flex items-start gap-2 mb-2">
                    <MessageCircle className="w-4 h-4 mt-1 text-primary" />
                    <div>
                      <p className="text-sm">
                        <span className="font-semibold">{qh.askerName}</span>{" "}
                        asks{" "}
                        <span className="font-semibold">{qh.targetName}</span>:
                      </p>
                      <p className="text-sm italic">"{qh.question}"</p>
                    </div>
                  </div>
                  {qh.answer && (
                    <div className="flex items-start gap-2 ml-6">
                      <div>
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">{qh.targetName}</span>:
                          "{qh.answer}"
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {!gameFinished && spyHuntGame.status === "questioning" && (
            <div className="space-y-3 shrink-0">
              {needToAnswer && (
                <div className="flex gap-2">
                  <Input
                    value={answer}
                    onChange={(e) => setAnswer(e.target.value)}
                    placeholder="Type your answer..."
                    onKeyDown={(e) => e.key === "Enter" && handleAnswer()}
                    data-testid="input-answer"
                  />
                  <Button
                    onClick={handleAnswer}
                    disabled={!answer.trim()}
                    data-testid="button-answer"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              )}

              {isMyTurn && !needToAnswer && (
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      value={question}
                      onChange={(e) => setQuestion(e.target.value)}
                      placeholder={
                        selectedPlayer
                          ? "Ask a question..."
                          : "Select a player first..."
                      }
                      disabled={!selectedPlayer}
                      onKeyDown={(e) => e.key === "Enter" && handleAsk()}
                      data-testid="input-question"
                    />
                    <Button
                      onClick={handleAsk}
                      disabled={!selectedPlayer || !question.trim()}
                      data-testid="button-ask"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAccuse}
                      disabled={!selectedPlayer}
                      data-testid="button-accuse"
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Accuse Selected
                    </Button>
                    {isSpy && (
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowLocations(!showLocations)}
                        data-testid="button-show-locations"
                      >
                        <HelpCircle className="w-4 h-4 mr-1" />
                        Guess Location
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {!isMyTurn && !needToAnswer && (
                <div className="text-center p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    Waiting for {currentTurnPlayer?.name}'s question...
                  </p>
                  {isSpy && (
                    <Button
                      variant="secondary"
                      size="sm"
                      className="mt-2"
                      onClick={() => setShowLocations(!showLocations)}
                      data-testid="button-show-locations-waiting"
                    >
                      <HelpCircle className="w-4 h-4 mr-1" />
                      Guess Location
                    </Button>
                  )}
                </div>
              )}

              {showLocations && isSpy && (
                <div className="p-3 bg-muted/50 rounded-lg">
                  <p className="text-sm font-medium mb-2">
                    Select a location to guess:
                  </p>
                  <div className="flex flex-wrap gap-1 max-h-32 overflow-y-auto">
                    {LOCATIONS.map((loc) => (
                      <button
                        key={loc}
                        onClick={() => setSelectedLocation(loc)}
                        className={`px-2 py-1 text-xs rounded ${
                          selectedLocation === loc
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-muted/80"
                        }`}
                        data-testid={`location-${loc.toLowerCase().replace(/\s+/g, "-")}`}
                      >
                        {loc}
                      </button>
                    ))}
                  </div>
                  <Button
                    className="w-full mt-2"
                    onClick={handleGuessLocation}
                    disabled={!selectedLocation}
                    data-testid="button-guess-location"
                  >
                    Guess: {selectedLocation || "Select a location"}
                  </Button>
                </div>
              )}
            </div>
          )}

          <GameChat />
        </CardContent>
      </Card>
    </div>
  );
}