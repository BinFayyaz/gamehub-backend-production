import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Gem, Clock, Map, Trophy, Heart, Eye } from "lucide-react";

const MAP_WIDTH = 800;
const MAP_HEIGHT = 600;
const PLAYER_SIZE = 20;
const PLAYER_SPEED = 5;
const TREASURE_SIZE = 15;
const TRAP_SIZE = 25;
const FOG_RADIUS = 120;

interface Treasure {
  id: string;
  x: number;
  y: number;
  collected: boolean;
  points: number;
  type: "gold" | "gem" | "diamond";
}

interface Trap {
  id: string;
  x: number;
  y: number;
  type: "spike" | "quicksand";
}

interface TreasureHuntProps {
  onClose?: () => void;
}

export function TreasureHunt({ onClose }: TreasureHuntProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameover">("menu");
  const [player, setPlayer] = useState({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2, health: 3 });
  const [treasures, setTreasures] = useState<Treasure[]>([]);
  const [traps, setTraps] = useState<Trap[]>([]);
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(60);
  const [level, setLevel] = useState(1);
  const [fogEnabled, setFogEnabled] = useState(true);
  const keysPressed = useRef<Set<string>>(new Set());
  const playerRef = useRef(player);
  playerRef.current = player;

  const generateLevel = useCallback((lvl: number) => {
    const newTreasures: Treasure[] = [];
    const newTraps: Trap[] = [];
    const treasureCount = 5 + lvl * 2;
    const trapCount = 3 + lvl;

    for (let i = 0; i < treasureCount; i++) {
      const types: ("gold" | "gem" | "diamond")[] = ["gold", "gem", "diamond"];
      const type = types[Math.floor(Math.random() * types.length)];
      newTreasures.push({
        id: `treasure-${i}`,
        x: 50 + Math.random() * (MAP_WIDTH - 100),
        y: 50 + Math.random() * (MAP_HEIGHT - 100),
        collected: false,
        points: type === "diamond" ? 50 : type === "gem" ? 25 : 10,
        type,
      });
    }

    for (let i = 0; i < trapCount; i++) {
      newTraps.push({
        id: `trap-${i}`,
        x: 50 + Math.random() * (MAP_WIDTH - 100),
        y: 50 + Math.random() * (MAP_HEIGHT - 100),
        type: Math.random() > 0.5 ? "spike" : "quicksand",
      });
    }

    setTreasures(newTreasures);
    setTraps(newTraps);
  }, []);

  const startGame = () => {
    setGameState("playing");
    setPlayer({ x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2, health: 3 });
    setScore(0);
    setTimeLeft(60);
    setLevel(1);
    generateLevel(1);
  };

  useEffect(() => {
    if (gameState !== "playing") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameState("gameover");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keysPressed.current.add(e.key.toLowerCase());
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

  useEffect(() => {
    if (gameState !== "playing") return;

    const gameLoop = () => {
      let dx = 0;
      let dy = 0;
      if (keysPressed.current.has("w") || keysPressed.current.has("arrowup")) dy -= PLAYER_SPEED;
      if (keysPressed.current.has("s") || keysPressed.current.has("arrowdown")) dy += PLAYER_SPEED;
      if (keysPressed.current.has("a") || keysPressed.current.has("arrowleft")) dx -= PLAYER_SPEED;
      if (keysPressed.current.has("d") || keysPressed.current.has("arrowright")) dx += PLAYER_SPEED;

      setPlayer((prev) => {
        const newX = Math.max(PLAYER_SIZE, Math.min(MAP_WIDTH - PLAYER_SIZE, prev.x + dx));
        const newY = Math.max(PLAYER_SIZE, Math.min(MAP_HEIGHT - PLAYER_SIZE, prev.y + dy));
        return { ...prev, x: newX, y: newY };
      });

      setTreasures((prev) => {
        const currentPlayer = playerRef.current;
        const updated = prev.map((t) => {
          if (!t.collected && Math.hypot(t.x - currentPlayer.x, t.y - currentPlayer.y) < PLAYER_SIZE + TREASURE_SIZE) {
            setScore((s) => s + t.points);
            return { ...t, collected: true };
          }
          return t;
        });

        if (updated.every((t) => t.collected)) {
          setLevel((l) => {
            const newLevel = l + 1;
            setTimeLeft((t) => t + 30);
            generateLevel(newLevel);
            return newLevel;
          });
        }

        return updated;
      });

      traps.forEach((trap) => {
        const currentPlayer = playerRef.current;
        if (Math.hypot(trap.x - currentPlayer.x, trap.y - currentPlayer.y) < PLAYER_SIZE + TRAP_SIZE / 2) {
          setPlayer((prev) => {
            if (prev.health <= 1) {
              setGameState("gameover");
              return { ...prev, health: 0 };
            }
            return { ...prev, health: prev.health - 1, x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
          });
        }
      });

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.clearRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

      ctx.fillStyle = "#2d5016";
      ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = "#1a3d0c";
        ctx.beginPath();
        ctx.arc((i * 47) % MAP_WIDTH, (i * 37) % MAP_HEIGHT, 30, 0, Math.PI * 2);
        ctx.fill();
      }

      const currentPlayer = playerRef.current;
      traps.forEach((trap) => {
        if (!fogEnabled || Math.hypot(trap.x - currentPlayer.x, trap.y - currentPlayer.y) < FOG_RADIUS) {
          ctx.fillStyle = trap.type === "spike" ? "#dc2626" : "#92400e";
          if (trap.type === "spike") {
            ctx.beginPath();
            ctx.moveTo(trap.x, trap.y - TRAP_SIZE / 2);
            ctx.lineTo(trap.x + TRAP_SIZE / 2, trap.y + TRAP_SIZE / 2);
            ctx.lineTo(trap.x - TRAP_SIZE / 2, trap.y + TRAP_SIZE / 2);
            ctx.closePath();
            ctx.fill();
          } else {
            ctx.beginPath();
            ctx.arc(trap.x, trap.y, TRAP_SIZE / 2, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      });

      treasures.forEach((t) => {
        if (t.collected) return;
        if (!fogEnabled || Math.hypot(t.x - currentPlayer.x, t.y - currentPlayer.y) < FOG_RADIUS) {
          ctx.fillStyle = t.type === "diamond" ? "#60a5fa" : t.type === "gem" ? "#a855f7" : "#fbbf24";
          ctx.beginPath();
          ctx.arc(t.x, t.y, TREASURE_SIZE, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "white";
          ctx.font = "10px Arial";
          ctx.textAlign = "center";
          ctx.fillText(`${t.points}`, t.x, t.y + 4);
        }
      });

      ctx.fillStyle = "#3b82f6";
      ctx.beginPath();
      ctx.arc(currentPlayer.x, currentPlayer.y, PLAYER_SIZE, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "white";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText("P", currentPlayer.x, currentPlayer.y + 4);

      if (fogEnabled) {
        ctx.save();
        ctx.globalCompositeOperation = "source-atop";
        const gradient = ctx.createRadialGradient(currentPlayer.x, currentPlayer.y, 0, currentPlayer.x, currentPlayer.y, FOG_RADIUS);
        gradient.addColorStop(0, "transparent");
        gradient.addColorStop(1, "rgba(0, 0, 0, 0.8)");

        ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
        ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
        ctx.globalCompositeOperation = "destination-out";
        ctx.beginPath();
        ctx.arc(currentPlayer.x, currentPlayer.y, FOG_RADIUS, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    const interval = setInterval(gameLoop, 16);
    return () => clearInterval(interval);
  }, [gameState, treasures, traps, fogEnabled, generateLevel]);

  if (gameState === "menu") {
    return (
      <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Gem className="w-5 h-5 text-amber-500" />
              Treasure Hunt
            </CardTitle>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-center">
              Explore the map and collect treasures before time runs out!
              Avoid traps and complete levels to earn bonus time.
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-400" />
                <span>Gold (10pts)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-500" />
                <span>Gem (25pts)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-blue-400" />
                <span>Diamond (50pts)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-0 h-0 border-l-[8px] border-r-[8px] border-b-[12px] border-l-transparent border-r-transparent border-b-red-500" />
                <span>Trap (avoid!)</span>
              </div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <input
                type="checkbox"
                id="fog"
                checked={fogEnabled}
                onChange={(e) => setFogEnabled(e.target.checked)}
              />
              <label htmlFor="fog" className="text-sm">Enable Fog of War (harder)</label>
            </div>
            <Button className="w-full" onClick={startGame} data-testid="button-start-treasure-hunt">
              Start Hunt
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === "gameover") {
    return (
      <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 justify-center">
              <Trophy className="w-6 h-6 text-amber-500" />
              Game Over!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="text-4xl font-bold text-primary">{score} pts</div>
            <div className="text-muted-foreground">Level {level} reached</div>
            <div className="flex gap-4 justify-center">
              <Button onClick={startGame} data-testid="button-restart-treasure-hunt">
                Play Again
              </Button>
              {onClose && (
                <Button variant="outline" onClick={onClose}>
                  Exit
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
      <Card className="shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <div className="flex items-center gap-4">
            <CardTitle className="flex items-center gap-2">
              <Map className="w-5 h-5" />
              Level {level}
            </CardTitle>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {timeLeft}s
            </Badge>
            <Badge className="flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              {score}
            </Badge>
            <div className="flex gap-1">
              {Array.from({ length: player.health }).map((_, i) => (
                <Heart key={i} className="w-4 h-4 text-red-500 fill-red-500" />
              ))}
            </div>
          </div>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </CardHeader>
        <CardContent>
          <canvas
            ref={canvasRef}
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            className="border rounded-lg"
          />
          <div className="mt-2 text-xs text-muted-foreground text-center">
            Use WASD or Arrow Keys to move. Collect all treasures to advance!
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
