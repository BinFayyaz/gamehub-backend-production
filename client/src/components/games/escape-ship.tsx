import { useState, useEffect, useCallback, useRef } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { 
  Users, 
  Play, 
  LogOut, 
  Crown, 
  Trophy,
  AlertTriangle,
  Rocket,
  Key,
  Fuel,
  Lock,
  Zap,
  FlaskConical,
  Ship,
  Container,
  Compass,
  DoorOpen,
  UserX,
  Smartphone,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Timer,
} from "lucide-react";
import { GameChat } from "@/components/game-chat";
import type { EscapeShipRoomType } from "@shared/schema";

const ROOM_CONFIG: Record<EscapeShipRoomType, { 
  name: string; 
  icon: any; 
  color: string;
  adjacent: EscapeShipRoomType[];
  item?: string;
}> = {
  engine: { 
    name: "Engine Room", 
    icon: Zap, 
    color: "text-orange-500",
    adjacent: ["cargo", "lab"],
    item: "fuel"
  },
  bridge: { 
    name: "Bridge", 
    icon: Compass, 
    color: "text-blue-500",
    adjacent: ["airlock", "cargo"],
    item: "code"
  },
  cargo: { 
    name: "Cargo Bay", 
    icon: Container, 
    color: "text-yellow-500",
    adjacent: ["engine", "bridge", "lab"]
  },
  lab: { 
    name: "Science Lab", 
    icon: FlaskConical, 
    color: "text-purple-500",
    adjacent: ["engine", "cargo", "airlock"],
    item: "key"
  },
  airlock: { 
    name: "Airlock", 
    icon: DoorOpen, 
    color: "text-red-500",
    adjacent: ["bridge", "lab", "escape_pod"]
  },
  escape_pod: { 
    name: "Escape Pod", 
    icon: Rocket, 
    color: "text-green-500",
    adjacent: ["airlock"]
  }
};

const PUZZLES = [
  { type: "math", question: "7 x 8 = ?", answer: "56", hint: "Multiply" },
  { type: "math", question: "144 / 12 = ?", answer: "12", hint: "Divide" },
  { type: "word", question: "Unscramble: CPAES", answer: "SPACE", hint: "Where we are" },
  { type: "word", question: "Unscramble: IRHPS", answer: "SHIPS", hint: "Vessels" },
  { type: "riddle", question: "I have keys but no locks. What am I?", answer: "KEYBOARD", hint: "You type on it" },
  { type: "riddle", question: "What has a head and tail but no body?", answer: "COIN", hint: "Money" },
  { type: "sequence", question: "2, 4, 8, 16, ?", answer: "32", hint: "Double it" },
  { type: "sequence", question: "1, 1, 2, 3, 5, ?", answer: "8", hint: "Fibonacci" },
];

export function EscapeShipLobby() {
  const { 
    escapeShipLobby, 
    currentPlayerId, 
    startEscapeShipGame, 
    leaveEscapeShipLobby,
    isAdmin,
    adminForceKick
  } = useWebSocket();

  if (!escapeShipLobby) return null;

  const isHost = currentPlayerId === escapeShipLobby.hostId;
  const canStart = escapeShipLobby.players.length >= escapeShipLobby.minPlayers && isHost;
  const waitingCount = escapeShipLobby.minPlayers - escapeShipLobby.players.length;

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
      <GameChat />
      <Card className="w-full max-w-md border-border/50 shadow-2xl animate-bounce-in" data-testid="escapeship-lobby">
        <CardHeader className="text-center border-b border-border/50">
          <div className="flex items-center justify-between gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={leaveEscapeShipLobby}
              data-testid="button-leave-escapeship-lobby"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Leave
            </Button>
            <div className="flex-1" />
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-red-600 rounded-full flex items-center justify-center">
              <Rocket className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
              Escape from Ship
            </CardTitle>
          </div>
          <CardDescription>
            Race through rooms, solve puzzles, collect items, and escape!
          </CardDescription>
          <Badge variant="secondary" className="mt-2">
            <Users className="w-3 h-3 mr-1" />
            {escapeShipLobby.players.length} / {escapeShipLobby.minPlayers}+ players
          </Badge>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {escapeShipLobby.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                  data-testid={`player-${player.id}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-orange-500/20 text-orange-500">
                      {player.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 font-medium">{player.name}</span>
                  {player.id === escapeShipLobby.hostId && (
                    <Badge variant="outline" className="text-xs">
                      <Crown className="w-3 h-3 mr-1" />
                      Host
                    </Badge>
                  )}
                  {isAdmin && player.id !== currentPlayerId && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => adminForceKick(player.id)}
                      data-testid={`button-kick-${player.id}`}
                    >
                      <UserX className="w-3 h-3 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="space-y-3">
            <div className="text-sm text-center text-muted-foreground">
              Navigate rooms, solve puzzles, avoid traps, collect 3 items, then escape!
            </div>
            <div className="flex justify-center gap-4 text-xs text-muted-foreground">
              <div className="flex items-center gap-1"><Key className="w-3 h-3" /> Key</div>
              <div className="flex items-center gap-1"><Fuel className="w-3 h-3" /> Fuel</div>
              <div className="flex items-center gap-1"><Lock className="w-3 h-3" /> Code</div>
            </div>
            
            {waitingCount > 0 && (
              <p className="text-sm text-center text-muted-foreground">
                Waiting for {waitingCount} more player{waitingCount > 1 ? "s" : ""}...
              </p>
            )}

            {isHost && (
              <Button
                className="w-full bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-600 hover:to-red-700"
                disabled={!canStart}
                onClick={startEscapeShipGame}
                data-testid="button-start-escapeship"
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

export function EscapeShipGame() {
  const { 
    escapeShipGame, 
    currentPlayerId,
    escapeShipAction,
    leaveEscapeShipLobby
  } = useWebSocket();
  
  const [puzzleAnswer, setPuzzleAnswer] = useState("");
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const lastActionTime = useRef(0);
  const gameAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const handleMove = useCallback((direction: EscapeShipRoomType) => {
    const now = Date.now();
    if (now - lastActionTime.current < 300) return;
    lastActionTime.current = now;
    escapeShipAction("move", { toRoom: direction });
  }, [escapeShipAction]);

  const handleSolvePuzzle = useCallback(() => {
    if (!puzzleAnswer.trim()) return;
    escapeShipAction("solve", { answer: puzzleAnswer.trim().toUpperCase() });
    setPuzzleAnswer("");
  }, [escapeShipAction, puzzleAnswer]);

  const handleTriggerTrap = useCallback(() => {
    escapeShipAction("trap", {});
  }, [escapeShipAction]);

  const handleEscape = useCallback(() => {
    escapeShipAction("escape", {});
  }, [escapeShipAction]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!escapeShipGame || escapeShipGame.status === "finished") return;
      
      const currentPlayer = escapeShipGame.players.find(p => p.id === currentPlayerId);
      if (!currentPlayer || currentPlayer.isStunned || currentPlayer.escaped) return;

      const currentRoom = currentPlayer.currentRoom;
      const adjacent = ROOM_CONFIG[currentRoom].adjacent;

      switch (e.key.toLowerCase()) {
        case "w":
        case "arrowup":
          if (adjacent[0]) handleMove(adjacent[0]);
          break;
        case "s":
        case "arrowdown":
          if (adjacent[1]) handleMove(adjacent[1]);
          break;
        case "a":
        case "arrowleft":
          if (adjacent[2]) handleMove(adjacent[2] || adjacent[0]);
          break;
        case "d":
        case "arrowright":
          if (adjacent[adjacent.length - 1]) handleMove(adjacent[adjacent.length - 1]);
          break;
        case "enter":
          if (puzzleAnswer) handleSolvePuzzle();
          break;
        case " ":
          e.preventDefault();
          if (currentRoom === "escape_pod" && currentPlayer.hasKey && currentPlayer.hasFuel && currentPlayer.hasCode) {
            handleEscape();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [escapeShipGame, currentPlayerId, handleMove, handleSolvePuzzle, handleEscape, puzzleAnswer]);

  if (!escapeShipGame) return null;

  const currentPlayer = escapeShipGame.players.find(p => p.id === currentPlayerId);
  const isFinished = escapeShipGame.status === "finished";
  const hasEscaped = currentPlayer?.escaped ?? false;
  const isStunned = currentPlayer?.isStunned ?? false;
  
  const elapsedTime = Math.floor((Date.now() - escapeShipGame.startTime) / 1000);
  const remainingTime = Math.max(0, escapeShipGame.gameTimer - elapsedTime);

  const currentRoom = currentPlayer?.currentRoom || "cargo";
  const roomConfig = ROOM_CONFIG[currentRoom];
  const RoomIcon = roomConfig.icon;
  
  const currentPuzzle = escapeShipGame.roomPuzzles[currentRoom];

  if (isFinished) {
    return (
      <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 shadow-2xl">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="w-8 h-8 text-yellow-500" />
            </div>
            <CardTitle>Game Over!</CardTitle>
            <CardDescription>Final Rankings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {escapeShipGame.rankings.map((rank, index) => (
                <div
                  key={rank.playerId}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    index === 0 ? "bg-yellow-500/20 border border-yellow-500/50" :
                    index === 1 ? "bg-gray-400/20" :
                    index === 2 ? "bg-orange-600/20" : "bg-muted/50"
                  }`}
                >
                  <span className="text-2xl font-bold">#{rank.position}</span>
                  <div className="flex-1">
                    <div className="font-medium">{rank.playerName}</div>
                    <div className="text-xs text-muted-foreground">
                      Time: {Math.floor(rank.time / 1000)}s
                    </div>
                  </div>
                  {index === 0 && <Trophy className="w-5 h-5 text-yellow-500" />}
                </div>
              ))}
              {escapeShipGame.players.filter(p => !p.escaped).map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10"
                >
                  <XCircle className="w-5 h-5 text-destructive" />
                  <div className="flex-1">
                    <div className="font-medium">{player.name}</div>
                    <div className="text-xs text-muted-foreground">Did not escape</div>
                  </div>
                </div>
              ))}
            </div>
            <Button
              className="w-full"
              onClick={leaveEscapeShipLobby}
              data-testid="button-leave-escapeship"
            >
              Leave Game
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex flex-col p-4" ref={gameAreaRef}>
      <GameChat />
      
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={leaveEscapeShipLobby}
          data-testid="button-leave-game"
        >
          <LogOut className="w-4 h-4 mr-1" />
          Leave
        </Button>
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4" />
          <span className={`font-mono ${remainingTime < 30 ? "text-destructive" : ""}`}>
            {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, "0")}
          </span>
        </div>
        <Badge variant={hasEscaped ? "default" : isStunned ? "destructive" : "secondary"}>
          {hasEscaped ? "Escaped!" : isStunned ? "Stunned!" : "Playing"}
        </Badge>
      </div>

      {/* Player Items */}
      <div className="flex justify-center gap-4 mb-4">
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${currentPlayer?.hasKey ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"}`}>
          <Key className="w-4 h-4" />
          <span className="text-xs">Key</span>
          {currentPlayer?.hasKey && <CheckCircle2 className="w-3 h-3" />}
        </div>
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${currentPlayer?.hasFuel ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"}`}>
          <Fuel className="w-4 h-4" />
          <span className="text-xs">Fuel</span>
          {currentPlayer?.hasFuel && <CheckCircle2 className="w-3 h-3" />}
        </div>
        <div className={`flex items-center gap-1 px-3 py-1 rounded-full ${currentPlayer?.hasCode ? "bg-green-500/20 text-green-500" : "bg-muted text-muted-foreground"}`}>
          <Lock className="w-4 h-4" />
          <span className="text-xs">Code</span>
          {currentPlayer?.hasCode && <CheckCircle2 className="w-3 h-3" />}
        </div>
      </div>

      {/* Main Game Area */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4">
        {/* Current Room */}
        <Card className="w-full max-w-md">
          <CardHeader className="text-center py-3">
            <div className="flex items-center justify-center gap-2">
              <RoomIcon className={`w-6 h-6 ${roomConfig.color}`} />
              <CardTitle>{roomConfig.name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {isStunned && currentPlayer?.stunEndTime && (
              <div className="text-center p-4 bg-destructive/20 rounded-lg">
                <AlertTriangle className="w-8 h-8 mx-auto text-destructive mb-2" />
                <p className="text-sm font-medium">You triggered a trap!</p>
                <p className="text-xs text-muted-foreground">
                  Stunned for {Math.max(0, Math.ceil((currentPlayer.stunEndTime - Date.now()) / 1000))}s
                </p>
              </div>
            )}

            {!isStunned && currentPuzzle && !currentPuzzle.solved && currentRoom !== "escape_pod" && (
              <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                <p className="text-sm font-medium text-center">Solve to get: {roomConfig.item?.toUpperCase() || "Progress"}</p>
                <p className="text-center font-medium">{currentPuzzle.hint}</p>
                <div className="flex gap-2">
                  <Input
                    value={puzzleAnswer}
                    onChange={(e) => setPuzzleAnswer(e.target.value)}
                    placeholder="Your answer..."
                    className="flex-1"
                    onKeyDown={(e) => e.key === "Enter" && handleSolvePuzzle()}
                    data-testid="input-puzzle-answer"
                  />
                  <Button onClick={handleSolvePuzzle} data-testid="button-solve">
                    Solve
                  </Button>
                </div>
                {currentPuzzle.trapActive && (
                  <p className="text-xs text-destructive text-center">
                    Warning: This room has an active trap!
                  </p>
                )}
              </div>
            )}

            {currentPuzzle?.solved && (
              <div className="text-center p-4 bg-green-500/20 rounded-lg">
                <CheckCircle2 className="w-6 h-6 mx-auto text-green-500 mb-2" />
                <p className="text-sm">Puzzle solved by {currentPuzzle.solvedBy || "someone"}!</p>
              </div>
            )}

            {currentRoom === "escape_pod" && (
              <div className="text-center space-y-3">
                {currentPlayer?.hasKey && currentPlayer?.hasFuel && currentPlayer?.hasCode ? (
                  <>
                    <p className="text-green-500 font-medium">You have all items!</p>
                    <Button
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-600"
                      onClick={handleEscape}
                      data-testid="button-escape"
                    >
                      <Rocket className="w-4 h-4 mr-2" />
                      ESCAPE NOW! (Space)
                    </Button>
                  </>
                ) : (
                  <p className="text-muted-foreground">
                    You need all 3 items to escape!
                  </p>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="space-y-2">
              <p className="text-xs text-center text-muted-foreground">Navigate to:</p>
              <div className="grid grid-cols-2 gap-2">
                {roomConfig.adjacent.map((adjRoom) => {
                  const adjConfig = ROOM_CONFIG[adjRoom];
                  const AdjIcon = adjConfig.icon;
                  return (
                    <Button
                      key={adjRoom}
                      variant="outline"
                      className="flex items-center gap-2"
                      onClick={() => handleMove(adjRoom)}
                      disabled={isStunned}
                      data-testid={`button-move-${adjRoom}`}
                    >
                      <AdjIcon className={`w-4 h-4 ${adjConfig.color}`} />
                      {adjConfig.name}
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Touch Controls */}
            {isTouchDevice && (
              <div className="flex flex-col items-center gap-2 mt-4">
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Smartphone className="w-3 h-3" />
                  Touch controls - tap room buttons above
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Other Players */}
        <Card className="w-full max-w-md">
          <CardHeader className="py-2">
            <CardTitle className="text-sm">Other Players</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <div className="flex flex-wrap gap-2">
              {escapeShipGame.players.filter(p => p.id !== currentPlayerId).map((player) => {
                const playerRoom = ROOM_CONFIG[player.currentRoom];
                const PlayerRoomIcon = playerRoom.icon;
                return (
                  <Badge
                    key={player.id}
                    variant={player.escaped ? "default" : player.isStunned ? "destructive" : "secondary"}
                    className="flex items-center gap-1"
                  >
                    <PlayerRoomIcon className={`w-3 h-3 ${playerRoom.color}`} />
                    {player.name}
                    {player.escaped && <Trophy className="w-3 h-3" />}
                  </Badge>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Events Log */}
        <Card className="w-full max-w-md">
          <CardHeader className="py-2">
            <CardTitle className="text-sm">Recent Events</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            <ScrollArea className="h-20">
              <div className="space-y-1">
                {escapeShipGame.events.slice(-5).reverse().map((event, idx) => (
                  <p key={idx} className="text-xs text-muted-foreground">
                    <span className="font-medium">{event.playerName}</span> {event.message}
                  </p>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>

      {/* Keyboard hint */}
      {!isTouchDevice && (
        <div className="text-center text-xs text-muted-foreground mt-2">
          Use WASD or Arrow keys to navigate, Enter to submit answers, Space to escape
        </div>
      )}
    </div>
  );
}
