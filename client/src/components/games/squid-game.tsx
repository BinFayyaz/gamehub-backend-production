import { useState, useEffect, useCallback, useRef } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  Play,
  LogOut,
  Crown,
  Skull,
  Trophy,
  AlertTriangle,
  Target,
  Circle,
  Square,
  Triangle,
  Star,
  UserX,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Timer,
  Zap,
} from "lucide-react";
import { GameChat } from "@/components/game-chat";

// --- Types & Constants ---

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
}

interface PlayerVisuals {
  x: number;
  y: number;
  targetX: number; // Server position
  animFrame: number;
  direction: "left" | "right" | "up" | "down";
  isMoving: boolean;
  lastInterpolation: number;
}

const PLAYER_COLORS = [
  "#ff6b6b",
  "#4ecdc4",
  "#45b7d1",
  "#96ceb4",
  "#ffeaa7",
  "#dfe6e9",
  "#fd79a8",
  "#a29bfe",
  "#6c5ce7",
  "#00b894",
  "#e17055",
  "#74b9ff",
];

// Made Arena Bigger
const ARENA_WIDTH = 1000;
const ARENA_HEIGHT = 600;
const PLAYER_SIZE = 30;
const FINISH_LINE_X = ARENA_WIDTH - 120;

// --- Helper Components ---

function GameTimer({
  duration,
  onComplete,
}: {
  duration: number;
  onComplete?: () => void;
}) {
  const [timeLeft, setTimeLeft] = useState(duration);

  useEffect(() => {
    if (timeLeft <= 0) {
      onComplete?.();
      return;
    }
    const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onComplete]);

  return (
    <div
      className={`flex items-center gap-2 font-mono text-xl font-bold ${timeLeft < 10 ? "text-red-500 animate-pulse" : "text-primary"}`}
    >
      <Timer className="w-5 h-5" />
      {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
    </div>
  );
}

// --- Main Components ---

export function SquidGameLobby() {
  const {
    squidGameLobby,
    currentPlayerId,
    startSquidGame,
    leaveSquidGameLobby,
    isAdmin,
    adminForceKick,
  } = useWebSocket();

  if (!squidGameLobby) return null;

  const isHost = currentPlayerId === squidGameLobby.hostId;
  const canStart =
    squidGameLobby.players.length >= squidGameLobby.minPlayers && isHost;
  const waitingCount =
    squidGameLobby.minPlayers - squidGameLobby.players.length;

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
      <GameChat />
      <Card className="w-full max-w-md border-border/50 shadow-2xl animate-bounce-in">
        <CardHeader className="text-center border-b border-border/50">
          <div className="flex items-center justify-between gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={leaveSquidGameLobby}>
              <LogOut className="w-4 h-4 mr-1" /> Leave
            </Button>
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
              <Circle className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-pink-500">
              Squid Game
            </CardTitle>
          </div>
          <CardDescription>
            Survive 3 rounds of deadly mini-games!
          </CardDescription>
          <Badge variant="secondary" className="mt-2">
            <Users className="w-3 h-3 mr-1" />
            {squidGameLobby.players.length} / {squidGameLobby.minPlayers}+
            players
          </Badge>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {squidGameLobby.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-pink-500/20 text-pink-500">
                      {player.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 font-medium">{player.name}</span>
                  {player.id === squidGameLobby.hostId && (
                    <Badge variant="outline" className="text-xs">
                      <Crown className="w-3 h-3 mr-1" /> Host
                    </Badge>
                  )}
                  {isAdmin && player.id !== currentPlayerId && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => adminForceKick(player.id)}
                    >
                      <UserX className="w-3 h-3 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="space-y-3">
            {isHost ? (
              <Button
                className="w-full bg-pink-500 hover:bg-pink-600"
                disabled={!canStart}
                onClick={startSquidGame}
              >
                <Play className="w-4 h-4 mr-2" /> Start Game
              </Button>
            ) : (
              <p className="text-sm text-center text-muted-foreground">
                Waiting for host...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function SquidGame() {
  const { squidGame, currentPlayerId, squidGameAction, leaveSquidGameLobby } =
    useWebSocket();

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Game State Refs (Mutable for 60fps loop)
  const playersRef = useRef<Map<string, PlayerVisuals>>(new Map());
  const particlesRef = useRef<Particle[]>([]);
  const keysPressed = useRef<Set<string>>(new Set());
  const animationFrameRef = useRef<number>();
  const lastActionTime = useRef(0);

  // React State for UI
  const [cookieProgress, setCookieProgress] = useState(0);
  const [cookieCrack, setCookieCrack] = useState(0);
  const [selectedGlass, setSelectedGlass] = useState<number | null>(null);

  // --- Input Handling ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        [
          "w",
          "a",
          "s",
          "d",
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
        ].includes(e.key)
      ) {
        // Prevent scrolling
        if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key))
          e.preventDefault();
        keysPressed.current.add(e.key.toLowerCase());
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      keysPressed.current.delete(e.key.toLowerCase());
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // --- Sync Players from Server ---
  useEffect(() => {
    if (!squidGame) return;

    // Update target positions for existing players or add new ones
    squidGame.players.forEach((player, index) => {
      if (!playersRef.current.has(player.id)) {
        // Initialize position
        playersRef.current.set(player.id, {
          x: 50 + index * 20,
          y: 100 + ((index * 40) % (ARENA_HEIGHT - 100)),
          targetX: (player.position / 100) * (FINISH_LINE_X - 50) + 50,
          animFrame: 0,
          direction: "right",
          isMoving: false,
          lastInterpolation: Date.now(),
        });
      } else {
        // Update target from server data
        const visual = playersRef.current.get(player.id)!;
        visual.targetX = (player.position / 100) * (FINISH_LINE_X - 50) + 50;

        // Triggers for death animation if status changed
        if (!player.isAlive) {
          // We handle blood spawning in the render loop or here
          spawnBlood(visual.x, visual.y);
        }
      }
    });
  }, [squidGame?.players, squidGame?.miniGameState]);

  const spawnBlood = (x: number, y: number) => {
    for (let i = 0; i < 20; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 5,
        vy: (Math.random() - 0.5) * 5,
        life: 1.0,
        color: "#8a0303",
      });
    }
  };

  // --- Game Loop (Canvas) ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !squidGame) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Movement Logic for Current Player
    const updateMovement = () => {
      if (squidGame.currentMiniGame !== "red_light_green_light") return;

      const currentPlayer = squidGame.players.find(
        (p) => p.id === currentPlayerId,
      );
      if (!currentPlayer?.isAlive) return;

      const keys = keysPressed.current;
      const hasInput =
        keys.has("w") ||
        keys.has("arrowup") ||
        keys.has("d") ||
        keys.has("arrowright") ||
        keys.has("s") ||
        keys.has("arrowdown") ||
        keys.has("a") ||
        keys.has("arrowleft");

      // Logic: Only send move if Alive
      if (hasInput) {
        // Difficulty Check: If Red Light, die immediately
        if (!squidGame.miniGameState.isGreenLight) {
          // Debounce death trigger to prevent spamming
          if (Date.now() - lastActionTime.current > 500) {
            squidGameAction("eliminated", {});
            lastActionTime.current = Date.now();
          }
        } else {
          // Send move command to server (Server calculates distance)
          // We limit send rate to avoid flooding, but visually update immediately
          if (Date.now() - lastActionTime.current > 50) {
            squidGameAction("move", { distance: 1.5 }); // Speed
            lastActionTime.current = Date.now();
          }
        }
      }
    };

    const render = () => {
      updateMovement();

      // Clear Canvas
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

      // --- Red Light Green Light Visuals ---
      if (squidGame.currentMiniGame === "red_light_green_light") {
        // Finish Line
        ctx.fillStyle = squidGame.miniGameState.isGreenLight
          ? "#22c55e"
          : "#ef4444";
        ctx.fillRect(FINISH_LINE_X, 0, 10, ARENA_HEIGHT);

        // Safe Zone
        ctx.fillStyle = "#ffffff10";
        ctx.fillRect(
          FINISH_LINE_X + 10,
          0,
          ARENA_WIDTH - FINISH_LINE_X,
          ARENA_HEIGHT,
        );

        // The Doll
        const dollX = ARENA_WIDTH - 60;
        const dollY = ARENA_HEIGHT / 2;

        ctx.save();
        ctx.translate(dollX, dollY);
        // Face direction based on light
        if (!squidGame.miniGameState.isGreenLight) ctx.scale(-1, 1);

        // Head
        ctx.beginPath();
        ctx.arc(0, -30, 25, 0, Math.PI * 2);
        ctx.fillStyle = "#ffdbac"; // Skin
        ctx.fill();
        // Dress
        ctx.fillStyle = "#ff9f43";
        ctx.fillRect(-20, 0, 40, 50);
        // Eyes (Glow red on Red Light)
        if (!squidGame.miniGameState.isGreenLight) {
          ctx.shadowBlur = 15;
          ctx.shadowColor = "red";
          ctx.fillStyle = "red";
          ctx.beginPath();
          ctx.arc(-8, -35, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(8, -35, 4, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = "black";
          ctx.beginPath();
          ctx.arc(-8, -35, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.beginPath();
          ctx.arc(8, -35, 3, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }

      // --- Draw Players ---
      squidGame.players.forEach((playerData, index) => {
        const visual = playersRef.current.get(playerData.id);
        if (!visual) return;

        // Visual Interpolation (Smooth movement)
        if (playerData.isAlive) {
          const dx = visual.targetX - visual.x;
          const dy = visual.y; // Y is currently static or set on init

          // Move visuals towards target
          if (Math.abs(dx) > 0.5) {
            visual.x += dx * 0.1; // Smoothness factor
            visual.isMoving = true;
            visual.animFrame += 0.2;
            visual.direction = dx > 0 ? "right" : "left";
          } else {
            visual.isMoving = false;
          }
        }

        // Draw Player
        if (playerData.isAlive) {
          const { x, y } = visual;

          // Body
          ctx.fillStyle = PLAYER_COLORS[index % PLAYER_COLORS.length];
          ctx.beginPath();
          ctx.arc(x, y - PLAYER_SIZE / 2, PLAYER_SIZE / 2, 0, Math.PI * 2);
          ctx.fill();

          // Highlight current player
          if (playerData.id === currentPlayerId) {
            ctx.strokeStyle = "#fff";
            ctx.lineWidth = 3;
            ctx.stroke();
            // Indicator Arrow
            ctx.fillStyle = "#fff";
            ctx.beginPath();
            ctx.moveTo(x, y - 45);
            ctx.lineTo(x - 5, y - 55);
            ctx.lineTo(x + 5, y - 55);
            ctx.fill();
          }

          // Name
          ctx.fillStyle = "#fff";
          ctx.font = "12px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText(playerData.name, x, y + 20);

          // Legs animation
          if (visual.isMoving) {
            const offset = Math.sin(visual.animFrame) * 8;
            ctx.strokeStyle = PLAYER_COLORS[index % PLAYER_COLORS.length];
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(x - 5, y);
            ctx.lineTo(x - 5 - offset, y + 15);
            ctx.moveTo(x + 5, y);
            ctx.lineTo(x + 5 + offset, y + 15);
            ctx.stroke();
          } else {
            ctx.strokeStyle = PLAYER_COLORS[index % PLAYER_COLORS.length];
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(x - 5, y);
            ctx.lineTo(x - 5, y + 15);
            ctx.moveTo(x + 5, y);
            ctx.lineTo(x + 5, y + 15);
            ctx.stroke();
          }
        } else {
          // Dead Player Body
          const { x, y } = visual;
          ctx.save();
          ctx.translate(x, y);
          ctx.rotate(Math.PI / 2); // Lying down
          ctx.fillStyle = "#555"; // Greyed out
          ctx.beginPath();
          ctx.rect(-15, -10, 30, 20); // Simple box for body
          ctx.fill();
          // Skull Icon
          ctx.fillStyle = "#fff";
          ctx.font = "20px serif";
          ctx.fillText("💀", 0, 5);
          ctx.restore();
        }
      });

      // --- Draw Particles (Blood) ---
      particlesRef.current.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2; // Gravity
        p.life -= 0.02;

        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        if (p.life <= 0) particlesRef.current.splice(i, 1);
      });

      animationFrameRef.current = requestAnimationFrame(render);
    };

    render();
    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, [squidGame, currentPlayerId]);

  // --- Logic: Cookie Cutter (Harder) ---
  const handleCookieClick = () => {
    if (cookieCrack >= 100) return; // Broken

    // Add randomness to difficulty
    const crackRisk = Math.random() * 10;

    setCookieProgress((prev) => {
      const next = prev + 3; // Slower progress
      if (next >= 100) squidGameAction("cut", { progress: 100 });
      return Math.min(100, next);
    });

    // Crack mechanic: Clicking too fast raises crack meter
    setCookieCrack((prev) => {
      const newCrack = prev + crackRisk;
      if (newCrack >= 100) {
        squidGameAction("eliminated", {}); // Self-elimination
      }
      return Math.min(100, newCrack);
    });
  };

  // Cooldown for cookie crack
  useEffect(() => {
    if (squidGame?.currentMiniGame !== "cookie_cutter") return;
    const interval = setInterval(() => {
      setCookieCrack((prev) => Math.max(0, prev - 5));
    }, 200);
    return () => clearInterval(interval);
  }, [squidGame?.currentMiniGame]);

  // --- Logic: Glass Bridge ---
  const handleGlassSelect = (index: number) => {
    // Prevent double clicking
    if (selectedGlass !== null && selectedGlass >= index) return;
    setSelectedGlass(index);
    squidGameAction("step", { index });
  };

  if (!squidGame) return null;
  const currentPlayer = squidGame.players.find((p) => p.id === currentPlayerId);
  const isAlive = currentPlayer?.isAlive ?? false;
  const isFinished = squidGame.status === "finished";

  // --- Render Sub-Games ---

  const renderMiniGame = () => {
    switch (squidGame.currentMiniGame) {
      case "red_light_green_light":
        return (
          <div className="space-y-4">
            <div className="flex justify-between items-center px-4">
              <GameTimer
                duration={60}
                onComplete={() => {
                  // Client side timer finish - server should actually handle this
                }}
              />
              <div
                className={`px-6 py-2 rounded-full text-2xl font-black transition-colors duration-200 border-4 ${
                  squidGame.miniGameState.isGreenLight
                    ? "bg-green-500 border-green-700 text-white shadow-[0_0_20px_rgba(34,197,94,0.6)]"
                    : "bg-red-500 border-red-700 text-white shadow-[0_0_20px_rgba(239,68,68,0.6)]"
                }`}
              >
                {squidGame.miniGameState.isGreenLight
                  ? "GREEN LIGHT"
                  : "RED LIGHT"}
              </div>
            </div>

            <div className="relative overflow-hidden rounded-lg border-4 border-slate-800 shadow-2xl bg-black">
              <canvas
                ref={canvasRef}
                width={ARENA_WIDTH}
                height={ARENA_HEIGHT}
                className="w-full h-auto block"
              />
            </div>

            <div className="flex gap-4 justify-center text-sm text-muted-foreground">
              <span>
                Mash <strong>W</strong> or <strong>Right Arrow</strong> to run!
              </span>
              <span className="text-red-500 font-bold">Don't move on RED!</span>
            </div>
          </div>
        );

      case "cookie_cutter":
        return (
          <div className="text-center space-y-8 max-w-md mx-auto py-8">
            <div className="text-3xl font-bold font-mono">
              EXTRACT THE SHAPE
            </div>

            <div
              className="relative w-64 h-64 mx-auto bg-amber-200 rounded-full flex items-center justify-center border-8 border-amber-300 shadow-inner cursor-pointer active:scale-95 transition-transform"
              onClick={isAlive ? handleCookieClick : undefined}
            >
              {cookieCrack >= 100 && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/50 rounded-full">
                  <Skull className="w-24 h-24 text-red-500 animate-bounce" />
                </div>
              )}
              {/* Shape Overlay */}
              <Star
                className={`w-32 h-32 text-amber-600 ${cookieCrack > 50 ? "animate-pulse" : ""}`}
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold uppercase">
                  <span>Success</span>
                  <span>{Math.round(cookieProgress)}%</span>
                </div>
                <Progress
                  value={cookieProgress}
                  className="h-4 bg-slate-800"
                  indicatorClassName="bg-green-500"
                />
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-xs font-bold uppercase text-red-500">
                  <span>Fragility (Don't let it break!)</span>
                  <span>{Math.round(cookieCrack)}%</span>
                </div>
                <Progress
                  value={cookieCrack}
                  className="h-4 bg-slate-800"
                  indicatorClassName="bg-red-600"
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground animate-pulse">
              Click repeatedly but NOT too fast! Let the needle cool down!
            </p>
          </div>
        );

      case "glass_bridge":
        const glassPath =
          squidGame.miniGameState.glassPath || Array(10).fill(0);
        const currentStep =
          squidGame.miniGameState.playerPositions?.[currentPlayerId] || 0;

        return (
          <div className="text-center space-y-6 max-w-2xl mx-auto">
            <div className="text-3xl font-bold font-mono mb-8">
              GLASS BRIDGE
            </div>

            <div className="perspective-[1000px]">
              <div className="grid grid-cols-2 gap-4 transform rotate-x-12">
                {glassPath.map((_, i) => {
                  // Only show next 3 steps relative to player to save space
                  if (i < currentStep || i > currentStep + 2) return null;

                  return (
                    <div key={i} className="contents">
                      <Button
                        variant="outline"
                        className="h-24 bg-blue-500/10 border-blue-400/30 hover:bg-blue-500/30 transition-all hover:scale-105"
                        onClick={() => handleGlassSelect(i * 2)}
                        disabled={!isAlive}
                      >
                        <span className="text-2xl font-bold text-blue-200/50">
                          {i + 1}L
                        </span>
                      </Button>
                      <Button
                        variant="outline"
                        className="h-24 bg-blue-500/10 border-blue-400/30 hover:bg-blue-500/30 transition-all hover:scale-105"
                        onClick={() => handleGlassSelect(i * 2 + 1)}
                        disabled={!isAlive}
                      >
                        <span className="text-2xl font-bold text-blue-200/50">
                          {i + 1}R
                        </span>
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="mt-8 p-4 bg-muted/20 rounded border border-dashed border-muted-foreground">
              <p>
                Step {currentStep + 1} of {glassPath.length}
              </p>
              <p className="text-xs text-muted-foreground">
                Pick a pane. One is tempered glass, the other breaks.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-zinc-950 flex items-center justify-center p-4 overflow-hidden">
      <GameChat />
      <Card className="w-full max-w-6xl h-[90vh] border-pink-500/50 shadow-2xl flex flex-col bg-zinc-900 text-white">
        <CardHeader className="border-b border-white/10 bg-pink-900/10 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="bg-pink-600 p-2 rounded-full">
                <Circle className="w-4 h-4 text-white" />
              </div>
              <div className="bg-pink-600 p-2 rounded-full">
                <Triangle className="w-4 h-4 text-white" />
              </div>
              <div className="bg-pink-600 p-2 rounded-full">
                <Square className="w-4 h-4 text-white" />
              </div>
              <span className="text-xl font-black tracking-widest ml-2 uppercase">
                Round {squidGame.currentRound}
              </span>
            </div>

            <div className="flex items-center gap-4">
              <Badge
                variant={isAlive ? "default" : "destructive"}
                className="text-lg px-4 py-1"
              >
                {isAlive ? "PLAYER 456" : "ELIMINATED"}
              </Badge>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 p-6 overflow-y-auto relative bg-[url('https://www.transparenttextures.com/patterns/dark-matter.png')]">
          {isFinished ? (
            <div className="h-full flex flex-col items-center justify-center space-y-8 animate-in zoom-in">
              <Trophy className="w-32 h-32 text-yellow-500 drop-shadow-[0_0_15px_rgba(234,179,8,0.5)]" />
              <h2 className="text-5xl font-black text-white">GAME OVER</h2>
              <div className="text-center">
                <p className="text-muted-foreground mb-4">Survivors</p>
                <div className="flex gap-2 justify-center flex-wrap">
                  {squidGame.winners.length > 0 ? (
                    squidGame.winners.map((id) => (
                      <Badge
                        key={id}
                        className="bg-yellow-500 text-black text-lg py-1 px-3"
                      >
                        {squidGame.players.find((p) => p.id === id)?.name ||
                          "Unknown"}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-red-500 font-mono">NONE</span>
                  )}
                </div>
              </div>
              <Button
                onClick={leaveSquidGameLobby}
                size="lg"
                variant="secondary"
              >
                Return to Lobby
              </Button>
            </div>
          ) : (
            <div className="h-full flex flex-col">
              {!isAlive && !isFinished && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center pointer-events-none">
                  <div className="text-center transform -rotate-12 border-4 border-red-600 p-8 rounded-xl bg-black">
                    <h1 className="text-6xl font-black text-red-600 uppercase tracking-tighter">
                      ELIMINATED
                    </h1>
                  </div>
                </div>
              )}
              {renderMiniGame()}
            </div>
          )}
        </CardContent>

        {/* Player List Footer */}
        <div className="h-16 border-t border-white/10 bg-black/40 flex items-center px-6 gap-2 overflow-x-auto shrink-0">
          {squidGame.players.map((p) => (
            <div
              key={p.id}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs border ${p.isAlive ? "border-green-500/30 bg-green-500/10" : "border-red-500/30 bg-red-500/10 opacity-50"}`}
            >
              <div
                className={`w-2 h-2 rounded-full ${p.isAlive ? "bg-green-500" : "bg-red-500"}`}
              />
              {p.name}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
