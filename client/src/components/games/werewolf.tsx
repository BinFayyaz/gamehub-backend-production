import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Users,
  Play,
  LogOut,
  Moon,
  Sun,
  Vote,
  Eye,
  Shield,
  Skull,
  Crown,
  Check,
  X,
  UserX,
} from "lucide-react";
import { GameChat } from "@/components/game-chat";
import { useState, useEffect } from "react";

export function Werewolf() {
  const {
    werewolfLobby,
    werewolfGame,
    werewolfRole,
    werewolfTeammates,
    currentPlayerId,
    joinWerewolfLobby,
    updateWerewolfSettings,
    startWerewolfGame,
    leaveWerewolfLobby,
    werewolfAction,
    werewolfVote,
    isAdmin,
    adminForceKick,
  } = useWebSocket();

  const [selectedTarget, setSelectedTarget] = useState<string | null>(null);
  const [actionSubmitted, setActionSubmitted] = useState(false);
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  // Determine host status (persists even during game if lobby data is available)
  const isHost = werewolfLobby?.hostId === currentPlayerId;

  useEffect(() => {
    if (werewolfGame && werewolfGame.phaseEndTime) {
      const interval = setInterval(() => {
        const remaining = Math.max(
          0,
          Math.ceil((werewolfGame.phaseEndTime - Date.now()) / 1000),
        );
        setTimeLeft(remaining);

        // Auto-advance discussion phase if time runs out and I am the host
        if (remaining === 0 && werewolfGame.phase === "discussion" && isHost) {
          werewolfAction("end_discussion" as any, "timer");
          clearInterval(interval);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [werewolfGame?.phaseEndTime, werewolfGame?.phase, isHost, werewolfAction]);

  useEffect(() => {
    if (werewolfGame?.phase === "night") {
      setActionSubmitted(false);
    }
    if (werewolfGame?.phase === "voting") {
      setVoteSubmitted(false);
    }
  }, [werewolfGame?.phase, werewolfGame?.day]);

  if (!werewolfLobby && !werewolfGame) {
    return (
      <Card
        className="w-full max-w-md mx-auto"
        data-testid="werewolf-join-card"
      >
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Moon className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Werewolf</CardTitle>
          <p className="text-muted-foreground">
            A social deduction game. Villagers must find the werewolves before
            it's too late!
          </p>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Badge variant="outline" className="text-sm">
            5-20 Players
          </Badge>
          <Button
            onClick={joinWerewolfLobby}
            size="lg"
            data-testid="button-join-werewolf"
          >
            <Users className="w-5 h-5 mr-2" />
            Join Game
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (werewolfLobby && !werewolfGame) {
    const canStart = werewolfLobby.players.length >= werewolfLobby.minPlayers;

    return (
      <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
        <Card className="w-full max-w-lg" data-testid="werewolf-lobby-card">
          <CardHeader className="text-center border-b">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={leaveWerewolfLobby}
                data-testid="button-leave-werewolf-lobby"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Leave
              </Button>
              <CardTitle>Werewolf Lobby</CardTitle>
              <div className="w-16" />
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-6">
            <div className="text-center">
              <Badge variant="outline" className="text-lg px-4 py-2">
                {werewolfLobby.players.length} / {werewolfLobby.maxPlayers}{" "}
                Players
              </Badge>
              <p className="text-sm text-muted-foreground mt-2">
                Minimum {werewolfLobby.minPlayers} players required
              </p>
            </div>

            {isHost && (
              <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                <h3 className="font-semibold text-sm">Game Settings</h3>
                <div className="flex items-center justify-between">
                  <Label htmlFor="seer" className="flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Enable Seer
                  </Label>
                  <Switch
                    id="seer"
                    checked={werewolfLobby.enableSeer}
                    onCheckedChange={(checked) =>
                      updateWerewolfSettings(
                        checked,
                        werewolfLobby.enableDoctor,
                      )
                    }
                    data-testid="switch-enable-seer"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="doctor" className="flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Enable Doctor
                  </Label>
                  <Switch
                    id="doctor"
                    checked={werewolfLobby.enableDoctor}
                    onCheckedChange={(checked) =>
                      updateWerewolfSettings(werewolfLobby.enableSeer, checked)
                    }
                    data-testid="switch-enable-doctor"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {werewolfLobby.players.map((player, idx) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    player.id === currentPlayerId
                      ? "bg-primary/10 ring-1 ring-primary"
                      : "bg-muted/50"
                  }`}
                  data-testid={`werewolf-lobby-player-${idx}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="text-xs">
                      {player.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium flex-1">{player.name}</span>
                  {player.id === werewolfLobby.hostId && (
                    <Badge variant="secondary">Host</Badge>
                  )}
                  {player.id === currentPlayerId && <Badge>You</Badge>}
                  {isAdmin && player.id !== currentPlayerId && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:bg-destructive/10"
                      onClick={() => adminForceKick(player.id)}
                      data-testid={`button-kick-werewolf-${player.id}`}
                    >
                      <UserX className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>

            {isHost ? (
              <Button
                onClick={startWerewolfGame}
                className="w-full"
                size="lg"
                disabled={!canStart}
                data-testid="button-start-werewolf"
              >
                <Play className="w-5 h-5 mr-2" />
                {canStart
                  ? "Start Game"
                  : `Need ${werewolfLobby.minPlayers - werewolfLobby.players.length} more`}
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

  if (!werewolfGame) return null;

  const myPlayer = werewolfGame.players.find((p) => p.id === currentPlayerId);
  const isAlive = myPlayer?.isAlive ?? false;
  const alivePlayers = werewolfGame.players.filter((p) => p.isAlive);
  const aliveWerewolves = werewolfGame.players.filter(
    (p) => p.isAlive && p.role === "werewolf",
  );
  const gameFinished = werewolfGame.status === "finished";

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "werewolf":
        return <Skull className="w-5 h-5 text-destructive" />;
      case "seer":
        return <Eye className="w-5 h-5 text-blue-500" />;
      case "doctor":
        return <Shield className="w-5 h-5 text-green-500" />;
      default:
        return <Users className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case "werewolf":
        return "Werewolf";
      case "seer":
        return "Seer";
      case "doctor":
        return "Doctor";
      default:
        return "Villager";
    }
  };

  const handleAction = () => {
    if (!selectedTarget || !werewolfRole) return;

    let action: "kill" | "protect" | "inspect";
    if (werewolfRole === "werewolf") action = "kill";
    else if (werewolfRole === "doctor") action = "protect";
    else if (werewolfRole === "seer") action = "inspect";
    else return;

    werewolfAction(action, selectedTarget);
    setActionSubmitted(true);
    setSelectedTarget(null);
  };

  const handleVote = () => {
    if (!selectedTarget) return;
    werewolfVote(selectedTarget);
    setVoteSubmitted(true);
    setSelectedTarget(null);
  };

  const getPhaseColor = () => {
    switch (werewolfGame.phase) {
      case "night":
        return "bg-slate-900 text-white";
      case "morning":
        return "bg-orange-100 text-orange-900";
      case "discussion":
        return "bg-blue-100 text-blue-900";
      case "voting":
        return "bg-red-100 text-red-900";
      default:
        return "bg-muted";
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
      <Card
        className="w-full max-w-2xl max-h-[90vh] overflow-hidden"
        data-testid="werewolf-game-card"
      >
        <CardHeader className="text-center border-b pb-4 sticky top-0 bg-background z-10">
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={leaveWerewolfLobby}
              data-testid="button-leave-werewolf-game"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Leave
            </Button>
            <div className="flex flex-col items-center gap-1">
              <CardTitle className="flex items-center gap-2">
                {werewolfGame.phase === "night" ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
                Day {werewolfGame.day}
              </CardTitle>
              <Badge className={getPhaseColor()}>
                {werewolfGame.phase.charAt(0).toUpperCase() +
                  werewolfGame.phase.slice(1)}{" "}
                Phase
                {timeLeft > 0 && !gameFinished && ` (${timeLeft}s)`}
              </Badge>
            </div>
            <div className="flex flex-col items-end gap-1">
              {werewolfRole && (
                <div className="flex items-center gap-1">
                  {getRoleIcon(werewolfRole)}
                  <span className="text-sm font-medium">
                    {getRoleLabel(werewolfRole)}
                  </span>
                </div>
              )}
              {!isAlive && <Badge variant="destructive">Dead</Badge>}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {gameFinished && (
            <div className="text-center p-6 bg-muted/50 rounded-lg animate-slide-up">
              <Crown className="w-12 h-12 mx-auto mb-4 text-yellow-500" />
              <h2 className="text-2xl font-bold mb-2">
                {werewolfGame.winner === "villagers"
                  ? "Villagers Win!"
                  : "Werewolves Win!"}
              </h2>
              <p className="text-muted-foreground mb-4">
                {werewolfGame.winner === "villagers"
                  ? "All werewolves have been eliminated!"
                  : "The werewolves have taken over the village!"}
              </p>
              <Button
                onClick={leaveWerewolfLobby}
                data-testid="button-finish-werewolf"
              >
                Back to Games
              </Button>
            </div>
          )}

          {werewolfRole === "werewolf" && werewolfTeammates.length > 0 && (
            <div className="p-3 bg-destructive/10 rounded-lg">
              <p className="text-sm text-destructive">
                <Skull className="w-4 h-4 inline mr-1" />
                Fellow werewolves: {werewolfTeammates.join(", ")}
              </p>
            </div>
          )}

          {werewolfGame.phase === "morning" && werewolfGame.lastNightVictim && (
            <div className="text-center p-4 bg-destructive/10 rounded-lg">
              <Skull className="w-8 h-8 mx-auto mb-2 text-destructive" />
              <p className="font-medium">
                {
                  werewolfGame.players.find(
                    (p) => p.id === werewolfGame.lastNightVictim,
                  )?.name
                }{" "}
                was eliminated last night!
              </p>
            </div>
          )}

          {werewolfGame.phase === "morning" &&
            !werewolfGame.lastNightVictim && (
              <div className="text-center p-4 bg-green-100 dark:bg-green-900/20 rounded-lg">
                <Shield className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p className="font-medium">No one was eliminated last night!</p>
              </div>
            )}

          {werewolfGame.seerResult &&
            werewolfRole === "seer" &&
            werewolfGame.phase === "night" && (
              <div className="text-center p-4 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                <Eye className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                <p className="font-medium">
                  Your inspection reveals: {werewolfGame.seerResult}
                </p>
              </div>
            )}

          {werewolfGame.phase === "night" && werewolfGame.lastVoteResult && (
            <div
              className={`text-center p-4 rounded-lg ${
                werewolfGame.lastVoteResult === "werewolf_eliminated"
                  ? "bg-green-100 dark:bg-green-900/20"
                  : werewolfGame.lastVoteResult === "villager_safe"
                    ? "bg-yellow-100 dark:bg-yellow-900/20"
                    : "bg-muted/50"
              }`}
            >
              {werewolfGame.lastVoteResult === "werewolf_eliminated" && (
                <>
                  <Skull className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="font-medium">
                    {
                      werewolfGame.players.find(
                        (p) => p.id === werewolfGame.lastVoteSuspect,
                      )?.name
                    }{" "}
                    was a werewolf and has been eliminated!
                  </p>
                </>
              )}
              {werewolfGame.lastVoteResult === "villager_safe" && (
                <>
                  <Shield className="w-8 h-8 mx-auto mb-2 text-yellow-500" />
                  <p className="font-medium">
                    {
                      werewolfGame.players.find(
                        (p) => p.id === werewolfGame.lastVoteSuspect,
                      )?.name
                    }{" "}
                    was not a werewolf. They remain in the village.
                  </p>
                </>
              )}
              {werewolfGame.lastVoteResult === "tie" && (
                <>
                  <Vote className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="font-medium">
                    The vote was a tie. No one was accused.
                  </p>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {werewolfGame.players.map((player, idx) => {
              const isMe = player.id === currentPlayerId;
              const canSelect =
                !isMe &&
                player.isAlive &&
                ((werewolfGame.phase === "night" &&
                  isAlive &&
                  !actionSubmitted &&
                  (werewolfRole === "werewolf" ||
                    werewolfRole === "seer" ||
                    werewolfRole === "doctor")) ||
                  (werewolfGame.phase === "voting" &&
                    isAlive &&
                    !voteSubmitted));

              return (
                <button
                  key={player.id}
                  onClick={() => canSelect && setSelectedTarget(player.id)}
                  disabled={!canSelect}
                  className={`p-3 rounded-lg text-left transition-all ${
                    !player.isAlive
                      ? "opacity-50 bg-muted/30"
                      : selectedTarget === player.id
                        ? "ring-2 ring-primary bg-primary/20"
                        : canSelect
                          ? "bg-muted/50 hover:bg-muted"
                          : "bg-muted/50"
                  } ${isMe ? "ring-1 ring-primary/50" : ""}`}
                  data-testid={`werewolf-player-${idx}`}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {player.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {isMe ? "You" : player.name}
                      </p>
                      {!player.isAlive && (
                        <p className="text-xs text-destructive">Dead</p>
                      )}
                      {gameFinished && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          {getRoleIcon(player.role)}
                          {getRoleLabel(player.role)}
                        </p>
                      )}
                    </div>
                    {selectedTarget === player.id && (
                      <Check className="w-5 h-5 text-primary" />
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {!gameFinished && isAlive && (
            <div className="flex flex-col items-center gap-4">
              {werewolfGame.phase === "night" && !actionSubmitted && (
                <>
                  {werewolfRole === "werewolf" && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        Choose a villager to eliminate
                      </p>
                      <Button
                        onClick={handleAction}
                        disabled={!selectedTarget}
                        variant="destructive"
                        data-testid="button-werewolf-kill"
                      >
                        <Skull className="w-4 h-4 mr-2" />
                        Eliminate
                      </Button>
                    </div>
                  )}
                  {werewolfRole === "doctor" && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        Choose a player to protect
                      </p>
                      <Button
                        onClick={handleAction}
                        disabled={!selectedTarget}
                        variant="default"
                        data-testid="button-doctor-protect"
                      >
                        <Shield className="w-4 h-4 mr-2" />
                        Protect
                      </Button>
                    </div>
                  )}
                  {werewolfRole === "seer" && (
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground mb-2">
                        Choose a player to inspect
                      </p>
                      <Button
                        onClick={handleAction}
                        disabled={!selectedTarget}
                        variant="default"
                        data-testid="button-seer-inspect"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        Inspect
                      </Button>
                    </div>
                  )}
                  {werewolfRole === "villager" && (
                    <p className="text-center text-muted-foreground">
                      The village sleeps... waiting for dawn.
                    </p>
                  )}
                </>
              )}

              {werewolfGame.phase === "night" && actionSubmitted && (
                <p className="text-center text-muted-foreground">
                  Action submitted. Waiting for others...
                </p>
              )}

              {werewolfGame.phase === "discussion" && (
                <div className="flex flex-col items-center gap-2 w-full">
                  <p className="text-center text-muted-foreground">
                    Discuss who might be the werewolf!
                  </p>
                  {isHost && (
                    <Button
                      onClick={() =>
                        werewolfAction("end_discussion" as any, "skip")
                      }
                      variant="secondary"
                      size="sm"
                      className="mt-2"
                    >
                      Start Voting Now
                    </Button>
                  )}
                </div>
              )}

              {werewolfGame.phase === "voting" && !voteSubmitted && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    Vote to eliminate a player
                  </p>
                  <Button
                    onClick={handleVote}
                    disabled={!selectedTarget}
                    data-testid="button-werewolf-vote"
                  >
                    <Vote className="w-4 h-4 mr-2" />
                    Vote
                  </Button>
                </div>
              )}

              {werewolfGame.phase === "voting" && voteSubmitted && (
                <p className="text-center text-muted-foreground">
                  Vote submitted. Waiting for others...
                </p>
              )}
            </div>
          )}

          {!isAlive && !gameFinished && (
            <p className="text-center text-muted-foreground">
              You have been eliminated. Watch the game unfold...
            </p>
          )}

          <div className="flex justify-center gap-4 text-sm text-muted-foreground">
            <span>Alive: {alivePlayers.length}</span>
            <span>Werewolves: {aliveWerewolves.length}</span>
          </div>

          <GameChat />
        </CardContent>
      </Card>
    </div>
  );
}
