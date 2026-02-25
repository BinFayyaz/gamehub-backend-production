import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Zap, Clock, Trophy, Heart, Shield, Skull } from "lucide-react";

const ARENA_WIDTH = 700;
const ARENA_HEIGHT = 500;
const PLAYER_SIZE = 15;
const PLAYER_SPEED = 6;

interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  type: "normal" | "homing" | "explosive";
}

interface PowerUp {
  id: string;
  x: number;
  y: number;
  type: "shield" | "slow" | "shrink";
  expiresAt: number;
}

interface DodgeArenaProps {
  onClose?: () => void;
}

export function DodgeArena({ onClose }: DodgeArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameover">("menu");
  const [player, setPlayer] = useState({ x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 });
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [powerUps, setPowerUps] = useState<PowerUp[]>([]);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [wave, setWave] = useState(1);
  const [activeEffects, setActiveEffects] = useState<Set<string>>(new Set());
  const [difficulty, setDifficulty] = useState<"easy" | "normal" | "hard">("normal");
  const keysPressed = useRef<Set<string>>(new Set());
  const lastSpawn = useRef(0);
  const lastPowerUp = useRef(0);
  const playerRef = useRef(player);
  playerRef.current = player;

  const startGame = () => {
    setGameState("playing");
    setPlayer({ x: ARENA_WIDTH / 2, y: ARENA_HEIGHT / 2 });
    setProjectiles([]);
    setPowerUps([]);
    setScore(0);
    setLives(difficulty === "easy" ? 5 : difficulty === "hard" ? 2 : 3);
    setWave(1);
    setActiveEffects(new Set());
    lastSpawn.current = Date.now();
    lastPowerUp.current = Date.now();
  };

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
      const now = Date.now();
      const speed = activeEffects.has("slow") ? PLAYER_SPEED * 1.5 : PLAYER_SPEED;
      const playerSize = activeEffects.has("shrink") ? PLAYER_SIZE * 0.6 : PLAYER_SIZE;

      let dx = 0;
      let dy = 0;
      if (keysPressed.current.has("w") || keysPressed.current.has("arrowup")) dy -= speed;
      if (keysPressed.current.has("s") || keysPressed.current.has("arrowdown")) dy += speed;
      if (keysPressed.current.has("a") || keysPressed.current.has("arrowleft")) dx -= speed;
      if (keysPressed.current.has("d") || keysPressed.current.has("arrowright")) dx += speed;

      setPlayer((prev) => ({
        x: Math.max(playerSize, Math.min(ARENA_WIDTH - playerSize, prev.x + dx)),
        y: Math.max(playerSize, Math.min(ARENA_HEIGHT - playerSize, prev.y + dy)),
      }));

      const spawnInterval = Math.max(300, 1000 - wave * 50);
      if (now - lastSpawn.current > spawnInterval) {
        lastSpawn.current = now;
        const side = Math.floor(Math.random() * 4);
        let x, y, vx, vy;
        const baseSpeed = 2 + wave * 0.3 * (difficulty === "hard" ? 1.5 : difficulty === "easy" ? 0.7 : 1);

        switch (side) {
          case 0:
            x = Math.random() * ARENA_WIDTH;
            y = -20;
            vx = (Math.random() - 0.5) * baseSpeed;
            vy = baseSpeed;
            break;
          case 1:
            x = ARENA_WIDTH + 20;
            y = Math.random() * ARENA_HEIGHT;
            vx = -baseSpeed;
            vy = (Math.random() - 0.5) * baseSpeed;
            break;
          case 2:
            x = Math.random() * ARENA_WIDTH;
            y = ARENA_HEIGHT + 20;
            vx = (Math.random() - 0.5) * baseSpeed;
            vy = -baseSpeed;
            break;
          default:
            x = -20;
            y = Math.random() * ARENA_HEIGHT;
            vx = baseSpeed;
            vy = (Math.random() - 0.5) * baseSpeed;
        }

        const types: ("normal" | "homing" | "explosive")[] = wave > 3 ? ["normal", "normal", "homing", "explosive"] : ["normal"];
        const type = types[Math.floor(Math.random() * types.length)];

        setProjectiles((prev) => [
          ...prev,
          {
            id: `proj-${now}-${Math.random()}`,
            x, y, vx, vy,
            size: type === "explosive" ? 20 : type === "homing" ? 12 : 10,
            color: type === "explosive" ? "#ef4444" : type === "homing" ? "#a855f7" : "#fbbf24",
            type,
          },
        ]);
      }

      if (now - lastPowerUp.current > 8000 && Math.random() < 0.02) {
        lastPowerUp.current = now;
        const types: ("shield" | "slow" | "shrink")[] = ["shield", "slow", "shrink"];
        setPowerUps((prev) => [
          ...prev,
          {
            id: `power-${now}`,
            x: 50 + Math.random() * (ARENA_WIDTH - 100),
            y: 50 + Math.random() * (ARENA_HEIGHT - 100),
            type: types[Math.floor(Math.random() * types.length)],
            expiresAt: now + 5000,
          },
        ]);
      }

      setProjectiles((prev) => {
        return prev
          .map((p) => {
            let { vx, vy } = p;
            if (p.type === "homing") {
              const dx = player.x - p.x;
              const dy = player.y - p.y;
              const dist = Math.hypot(dx, dy);
              if (dist > 0) {
                vx += (dx / dist) * 0.1;
                vy += (dy / dist) * 0.1;
              }
            }
            return { ...p, x: p.x + vx, y: p.y + vy, vx, vy };
          })
          .filter(
            (p) =>
              p.x > -50 &&
              p.x < ARENA_WIDTH + 50 &&
              p.y > -50 &&
              p.y < ARENA_HEIGHT + 50
          );
      });

      setPowerUps((prev) => prev.filter((p) => now < p.expiresAt));

      powerUps.forEach((pu) => {
        if (Math.hypot(pu.x - player.x, pu.y - player.y) < playerSize + 15) {
          setPowerUps((prev) => prev.filter((p) => p.id !== pu.id));
          setActiveEffects((prev) => new Set(prev).add(pu.type));
          setTimeout(() => {
            setActiveEffects((prev) => {
              const next = new Set(prev);
              next.delete(pu.type);
              return next;
            });
          }, 5000);
        }
      });

      const hasShield = activeEffects.has("shield");
      projectiles.forEach((proj) => {
        if (Math.hypot(proj.x - player.x, proj.y - player.y) < playerSize + proj.size) {
          setProjectiles((prev) => prev.filter((p) => p.id !== proj.id));
          if (!hasShield) {
            setLives((prev) => {
              if (prev <= 1) {
                setGameState("gameover");
                return 0;
              }
              return prev - 1;
            });
          }
        }
      });

      setScore((prev) => prev + 1);
      if (score > 0 && score % 500 === 0) {
        setWave((prev) => prev + 1);
      }

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, ARENA_WIDTH, ARENA_HEIGHT);

      ctx.strokeStyle = "#1e293b";
      ctx.lineWidth = 1;
      for (let x = 0; x < ARENA_WIDTH; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, ARENA_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < ARENA_HEIGHT; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(ARENA_WIDTH, y);
        ctx.stroke();
      }

      powerUps.forEach((pu) => {
        ctx.fillStyle = pu.type === "shield" ? "#22c55e" : pu.type === "slow" ? "#3b82f6" : "#f59e0b";
        ctx.beginPath();
        ctx.arc(pu.x, pu.y, 15, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = "white";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(pu.type === "shield" ? "S" : pu.type === "slow" ? "T" : "X", pu.x, pu.y + 4);
      });

      projectiles.forEach((p) => {
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      });

      if (activeEffects.has("shield")) {
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(player.x, player.y, playerSize + 8, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.fillStyle = "#60a5fa";
      ctx.beginPath();
      ctx.arc(player.x, player.y, playerSize, 0, Math.PI * 2);
      ctx.fill();
    };

    const interval = setInterval(gameLoop, 16);
    return () => clearInterval(interval);
  }, [gameState, player, projectiles, powerUps, wave, activeEffects, score, difficulty]);

  if (gameState === "menu") {
    return (
      <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Dodge Arena
            </CardTitle>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-center">
              Survive as long as possible by dodging incoming projectiles!
              Collect power-ups to help you survive.
            </p>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-amber-400" />
                <span>Normal</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-purple-500" />
                <span>Homing</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded-full bg-red-500" />
                <span>Explosive</span>
              </div>
            </div>
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-medium">Difficulty</span>
              <div className="flex gap-2">
                {(["easy", "normal", "hard"] as const).map((d) => (
                  <Button
                    key={d}
                    variant={difficulty === d ? "default" : "outline"}
                    size="sm"
                    onClick={() => setDifficulty(d)}
                  >
                    {d.charAt(0).toUpperCase() + d.slice(1)}
                  </Button>
                ))}
              </div>
            </div>
            <Button className="w-full" onClick={startGame} data-testid="button-start-dodge-arena">
              Start Survival
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
              <Skull className="w-6 h-6 text-red-500" />
              Game Over!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="text-4xl font-bold text-primary">{score} pts</div>
            <div className="text-muted-foreground">Survived to Wave {wave}</div>
            <div className="flex gap-4 justify-center">
              <Button onClick={startGame} data-testid="button-restart-dodge-arena">
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
              <Zap className="w-5 h-5" />
              Wave {wave}
            </CardTitle>
            <Badge className="flex items-center gap-1">
              <Trophy className="w-3 h-3" />
              {score}
            </Badge>
            <div className="flex gap-1">
              {Array.from({ length: lives }).map((_, i) => (
                <Heart key={i} className="w-4 h-4 text-red-500 fill-red-500" />
              ))}
            </div>
            {activeEffects.size > 0 && (
              <div className="flex gap-1">
                {activeEffects.has("shield") && <Shield className="w-4 h-4 text-green-500" />}
                {activeEffects.has("slow") && <Clock className="w-4 h-4 text-blue-500" />}
                {activeEffects.has("shrink") && <div className="w-3 h-3 rounded-full bg-amber-500" />}
              </div>
            )}
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
            width={ARENA_WIDTH}
            height={ARENA_HEIGHT}
            className="border rounded-lg"
          />
          <div className="mt-2 text-xs text-muted-foreground text-center">
            Use WASD or Arrow Keys to dodge. Collect power-ups for bonuses!
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
