import { useState, useRef, useEffect, useCallback } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Target, Shield, Crosshair, Loader2 } from "lucide-react";

const TANK_SIZE = 30;
const BULLET_SPEED = 8;
const TANK_SPEED = 4;
const ROTATION_SPEED = 0.08;
const MAP_WIDTH = 800;
const MAP_HEIGHT = 600;
const RELOAD_TIME = 500;

interface Tank {
  x: number;
  y: number;
  angle: number;
  health: number;
  maxHealth: number;
  color: string;
  lastShot: number;
}

interface Bullet {
  id: string;
  x: number;
  y: number;
  angle: number;
  owner: "player" | "enemy";
}

interface Obstacle {
  x: number;
  y: number;
  width: number;
  height: number;
  type: "wall" | "destructible";
  health: number;
}

interface TankBattleProps {
  onClose?: () => void;
}

export function TankBattle({ onClose }: TankBattleProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"menu" | "playing" | "won" | "lost">("menu");
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [playerTank, setPlayerTank] = useState<Tank>({
    x: MAP_WIDTH / 2,
    y: MAP_HEIGHT - 80,
    angle: -Math.PI / 2,
    health: 100,
    maxHealth: 100,
    color: "#22c55e",
    lastShot: 0,
  });
  const [enemyTanks, setEnemyTanks] = useState<Tank[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
  
  const animationRef = useRef<number>();

  const spawnEnemies = useCallback((waveNum: number) => {
    const enemies: Tank[] = [];
    const count = Math.min(3 + waveNum, 8);
    for (let i = 0; i < count; i++) {
      enemies.push({
        x: 100 + (i * (MAP_WIDTH - 200) / count),
        y: 80 + Math.random() * 100,
        angle: Math.PI / 2,
        health: 50 + waveNum * 10,
        maxHealth: 50 + waveNum * 10,
        color: "#ef4444",
        lastShot: 0,
      });
    }
    return enemies;
  }, []);

  const generateObstacles = useCallback(() => {
    const obs: Obstacle[] = [];
    for (let i = 0; i < 8; i++) {
      obs.push({
        x: 100 + Math.random() * (MAP_WIDTH - 200),
        y: 200 + Math.random() * (MAP_HEIGHT - 400),
        width: 40 + Math.random() * 60,
        height: 30 + Math.random() * 40,
        type: Math.random() > 0.5 ? "wall" : "destructible",
        health: 50,
      });
    }
    return obs;
  }, []);

  const startGame = () => {
    setGameState("playing");
    setScore(0);
    setWave(1);
    setPlayerTank({
      x: MAP_WIDTH / 2,
      y: MAP_HEIGHT - 80,
      angle: -Math.PI / 2,
      health: 100,
      maxHealth: 100,
      color: "#22c55e",
      lastShot: 0,
    });
    setEnemyTanks(spawnEnemies(1));
    setObstacles(generateObstacles());
    setBullets([]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeysPressed((prev) => new Set(prev).add(e.key.toLowerCase()));
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      setKeysPressed((prev) => {
        const next = new Set(prev);
        next.delete(e.key.toLowerCase());
        return next;
      });
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  const gameLoop = useCallback(() => {
    if (gameState !== "playing") return;
    const now = Date.now();

    setPlayerTank((prev) => {
      let newX = prev.x;
      let newY = prev.y;
      let newAngle = prev.angle;

      if (keysPressed.has("a") || keysPressed.has("arrowleft")) newAngle -= ROTATION_SPEED;
      if (keysPressed.has("d") || keysPressed.has("arrowright")) newAngle += ROTATION_SPEED;
      if (keysPressed.has("w") || keysPressed.has("arrowup")) {
        newX += Math.cos(newAngle) * TANK_SPEED;
        newY += Math.sin(newAngle) * TANK_SPEED;
      }
      if (keysPressed.has("s") || keysPressed.has("arrowdown")) {
        newX -= Math.cos(newAngle) * TANK_SPEED;
        newY -= Math.sin(newAngle) * TANK_SPEED;
      }

      newX = Math.max(TANK_SIZE, Math.min(MAP_WIDTH - TANK_SIZE, newX));
      newY = Math.max(TANK_SIZE, Math.min(MAP_HEIGHT - TANK_SIZE, newY));

      if (keysPressed.has(" ") && now - prev.lastShot > RELOAD_TIME) {
        setBullets((b) => [
          ...b,
          {
            id: Math.random().toString(),
            x: prev.x + Math.cos(prev.angle) * TANK_SIZE,
            y: prev.y + Math.sin(prev.angle) * TANK_SIZE,
            angle: prev.angle,
            owner: "player",
          },
        ]);
        return { ...prev, x: newX, y: newY, angle: newAngle, lastShot: now };
      }

      return { ...prev, x: newX, y: newY, angle: newAngle };
    });

    setEnemyTanks((enemies) =>
      enemies.map((enemy) => {
        const dx = playerTank.x - enemy.x;
        const dy = playerTank.y - enemy.y;
        const targetAngle = Math.atan2(dy, dx);
        let newAngle = enemy.angle;
        const angleDiff = targetAngle - enemy.angle;
        if (Math.abs(angleDiff) > 0.1) {
          newAngle += angleDiff > 0 ? 0.03 : -0.03;
        }

        let newX = enemy.x + Math.cos(newAngle) * 1.5;
        let newY = enemy.y + Math.sin(newAngle) * 1.5;
        newX = Math.max(TANK_SIZE, Math.min(MAP_WIDTH - TANK_SIZE, newX));
        newY = Math.max(TANK_SIZE, Math.min(MAP_HEIGHT - TANK_SIZE, newY));

        if (now - enemy.lastShot > 1500 + Math.random() * 500) {
          setBullets((b) => [
            ...b,
            {
              id: Math.random().toString(),
              x: enemy.x + Math.cos(newAngle) * TANK_SIZE,
              y: enemy.y + Math.sin(newAngle) * TANK_SIZE,
              angle: newAngle,
              owner: "enemy",
            },
          ]);
          return { ...enemy, x: newX, y: newY, angle: newAngle, lastShot: now };
        }

        return { ...enemy, x: newX, y: newY, angle: newAngle };
      })
    );

    setBullets((prevBullets) => {
      const newBullets = prevBullets
        .map((b) => ({
          ...b,
          x: b.x + Math.cos(b.angle) * BULLET_SPEED,
          y: b.y + Math.sin(b.angle) * BULLET_SPEED,
        }))
        .filter(
          (b) => b.x > 0 && b.x < MAP_WIDTH && b.y > 0 && b.y < MAP_HEIGHT
        );

      newBullets.forEach((bullet) => {
        if (bullet.owner === "player") {
          setEnemyTanks((enemies) =>
            enemies.map((e) => {
              if (Math.hypot(e.x - bullet.x, e.y - bullet.y) < TANK_SIZE) {
                bullet.x = -100;
                const newHealth = e.health - 25;
                if (newHealth <= 0) {
                  setScore((s) => s + 100);
                }
                return { ...e, health: newHealth };
              }
              return e;
            })
          );
        } else {
          setPlayerTank((p) => {
            if (Math.hypot(p.x - bullet.x, p.y - bullet.y) < TANK_SIZE) {
              bullet.x = -100;
              return { ...p, health: p.health - 15 };
            }
            return p;
          });
        }
      });

      return newBullets.filter((b) => b.x > 0);
    });

    setEnemyTanks((enemies) => enemies.filter((e) => e.health > 0));

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, keysPressed, playerTank, spawnEnemies]);

  useEffect(() => {
    if (gameState === "playing") {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameState, gameLoop]);

  useEffect(() => {
    if (gameState === "playing") {
      if (playerTank.health <= 0) {
        setGameState("lost");
      } else if (enemyTanks.length === 0) {
        setWave((w) => w + 1);
        setEnemyTanks(spawnEnemies(wave + 1));
        setPlayerTank((p) => ({ ...p, health: Math.min(p.health + 20, p.maxHealth) }));
      }
    }
  }, [playerTank.health, enemyTanks.length, gameState, wave, spawnEnemies]);

  useEffect(() => {
    if (!canvasRef.current || gameState !== "playing") return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    obstacles.forEach((obs) => {
      ctx.fillStyle = obs.type === "wall" ? "#4a5568" : "#8b5a2b";
      ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
    });

    const drawTank = (tank: Tank) => {
      ctx.save();
      ctx.translate(tank.x, tank.y);
      ctx.rotate(tank.angle);
      ctx.fillStyle = tank.color;
      ctx.fillRect(-TANK_SIZE / 2, -TANK_SIZE / 3, TANK_SIZE, (TANK_SIZE * 2) / 3);
      ctx.fillStyle = tank.color === "#22c55e" ? "#16a34a" : "#dc2626";
      ctx.fillRect(0, -4, TANK_SIZE / 2 + 10, 8);
      ctx.restore();

      const hpPct = tank.health / tank.maxHealth;
      ctx.fillStyle = "#333";
      ctx.fillRect(tank.x - 20, tank.y - TANK_SIZE - 5, 40, 6);
      ctx.fillStyle = hpPct > 0.5 ? "#22c55e" : hpPct > 0.25 ? "#eab308" : "#ef4444";
      ctx.fillRect(tank.x - 20, tank.y - TANK_SIZE - 5, 40 * hpPct, 6);
    };

    drawTank(playerTank);
    enemyTanks.forEach(drawTank);

    bullets.forEach((bullet) => {
      ctx.fillStyle = bullet.owner === "player" ? "#fbbf24" : "#f87171";
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });
  });

  if (gameState === "menu") {
    return (
      <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Target className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Tank Battle</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Destroy enemy tanks in wave-based combat! Use WASD to move, SPACE to shoot.
            </p>
            <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
              <p><strong>W/S</strong> - Move Forward/Backward</p>
              <p><strong>A/D</strong> - Rotate Left/Right</p>
              <p><strong>SPACE</strong> - Fire</p>
            </div>
            <Button onClick={startGame} size="lg" className="w-full" data-testid="button-start-tank">
              Start Battle
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === "won" || gameState === "lost") {
    return (
      <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className={gameState === "won" ? "text-green-500" : "text-red-500"}>
              {gameState === "won" ? "Victory!" : "Game Over"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xl">Score: {score}</p>
            <p>Wave Reached: {wave}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={startGame} data-testid="button-restart-tank">Play Again</Button>
              <Button variant="outline" onClick={() => { setGameState("menu"); onClose?.(); }} data-testid="button-menu-tank">
                Menu
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center">
      <div className="absolute top-4 left-4 flex gap-4 z-10">
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Shield className="w-4 h-4 mr-2" />
          HP: {playerTank.health}
        </Badge>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Crosshair className="w-4 h-4 mr-2" />
          Wave: {wave}
        </Badge>
        <Badge variant="default" className="text-lg px-4 py-2">
          Score: {score}
        </Badge>
      </div>
      <Button
        variant="destructive"
        size="sm"
        className="absolute top-4 right-4 z-10"
        onClick={() => { setGameState("menu"); onClose?.(); }}
        data-testid="button-quit-tank"
      >
        <X className="w-4 h-4 mr-1" /> Quit
      </Button>
      <canvas
        ref={canvasRef}
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        className="border-2 border-primary/50 rounded-lg"
      />
    </div>
  );
}
