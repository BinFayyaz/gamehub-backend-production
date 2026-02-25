import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Skull, Heart, Zap, Target, Shield, RotateCcw } from "lucide-react";

const MAP_WIDTH = 800;
const MAP_HEIGHT = 600;
const PLAYER_SIZE = 20;
const PLAYER_SPEED = 5;
const BULLET_SPEED = 12;
const RELOAD_TIME = 150;

interface Player {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  ammo: number;
  maxAmmo: number;
  lastShot: number;
  weapon: "pistol" | "shotgun" | "rifle";
}

interface Zombie {
  id: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  damage: number;
  type: "walker" | "runner" | "brute";
  lastAttack: number;
}

interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
}

interface Pickup {
  id: string;
  x: number;
  y: number;
  type: "health" | "ammo" | "weapon";
  weapon?: "shotgun" | "rifle";
}

interface ZombieSurvivalProps {
  onClose?: () => void;
}

export function ZombieSurvival({ onClose }: ZombieSurvivalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"menu" | "playing" | "paused" | "dead">("menu");
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [killCount, setKillCount] = useState(0);
  const [player, setPlayer] = useState<Player>({
    x: MAP_WIDTH / 2,
    y: MAP_HEIGHT / 2,
    health: 100,
    maxHealth: 100,
    ammo: 30,
    maxAmmo: 30,
    lastShot: 0,
    weapon: "pistol",
  });
  const [zombies, setZombies] = useState<Zombie[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [pickups, setPickups] = useState<Pickup[]>([]);
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isShooting, setIsShooting] = useState(false);
  const [waveComplete, setWaveComplete] = useState(false);

  const animationRef = useRef<number>();

  const spawnZombies = useCallback((waveNum: number) => {
    const newZombies: Zombie[] = [];
    const count = 5 + waveNum * 3;

    for (let i = 0; i < count; i++) {
      const side = Math.floor(Math.random() * 4);
      let x, y;
      switch (side) {
        case 0: x = -30; y = Math.random() * MAP_HEIGHT; break;
        case 1: x = MAP_WIDTH + 30; y = Math.random() * MAP_HEIGHT; break;
        case 2: x = Math.random() * MAP_WIDTH; y = -30; break;
        default: x = Math.random() * MAP_WIDTH; y = MAP_HEIGHT + 30;
      }

      const typeRoll = Math.random();
      const type = typeRoll > 0.85 ? "brute" : typeRoll > 0.6 ? "runner" : "walker";
      const baseHealth = 30 + waveNum * 5;

      newZombies.push({
        id: `zombie-${waveNum}-${i}`,
        x,
        y,
        health: type === "brute" ? baseHealth * 3 : baseHealth,
        maxHealth: type === "brute" ? baseHealth * 3 : baseHealth,
        speed: type === "runner" ? 3 : type === "brute" ? 1 : 1.5,
        damage: type === "brute" ? 20 : 10,
        type,
        lastAttack: 0,
      });
    }

    return newZombies;
  }, []);

  const startGame = () => {
    setGameState("playing");
    setScore(0);
    setWave(1);
    setKillCount(0);
    setPlayer({
      x: MAP_WIDTH / 2,
      y: MAP_HEIGHT / 2,
      health: 100,
      maxHealth: 100,
      ammo: 30,
      maxAmmo: 30,
      lastShot: 0,
      weapon: "pistol",
    });
    setZombies(spawnZombies(1));
    setBullets([]);
    setPickups([]);
    setWaveComplete(false);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeysPressed((prev) => new Set(prev).add(e.key.toLowerCase()));
      if (e.key.toLowerCase() === "r") {
        setPlayer((p) => ({ ...p, ammo: p.maxAmmo }));
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      setKeysPressed((prev) => {
        const next = new Set(prev);
        next.delete(e.key.toLowerCase());
        return next;
      });
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    const handleMouseDown = () => setIsShooting(true);
    const handleMouseUp = () => setIsShooting(false);

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mousedown", handleMouseDown);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mousedown", handleMouseDown);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  const gameLoop = useCallback(() => {
    if (gameState !== "playing") return;
    const now = Date.now();

    setPlayer((prev) => {
      let newX = prev.x;
      let newY = prev.y;

      if (keysPressed.has("w") || keysPressed.has("arrowup")) newY -= PLAYER_SPEED;
      if (keysPressed.has("s") || keysPressed.has("arrowdown")) newY += PLAYER_SPEED;
      if (keysPressed.has("a") || keysPressed.has("arrowleft")) newX -= PLAYER_SPEED;
      if (keysPressed.has("d") || keysPressed.has("arrowright")) newX += PLAYER_SPEED;

      newX = Math.max(PLAYER_SIZE, Math.min(MAP_WIDTH - PLAYER_SIZE, newX));
      newY = Math.max(PLAYER_SIZE, Math.min(MAP_HEIGHT - PLAYER_SIZE, newY));

      const reloadTime = prev.weapon === "rifle" ? 100 : prev.weapon === "shotgun" ? 400 : RELOAD_TIME;
      if (isShooting && prev.ammo > 0 && now - prev.lastShot > reloadTime) {
        const dx = mousePos.x - prev.x;
        const dy = mousePos.y - prev.y;
        const dist = Math.hypot(dx, dy);
        const damage = prev.weapon === "shotgun" ? 20 : prev.weapon === "rifle" ? 30 : 15;

        if (prev.weapon === "shotgun") {
          for (let i = -2; i <= 2; i++) {
            const angle = Math.atan2(dy, dx) + i * 0.15;
            setBullets((b) => [
              ...b,
              {
                id: `bullet-${now}-${i}`,
                x: prev.x,
                y: prev.y,
                vx: Math.cos(angle) * BULLET_SPEED,
                vy: Math.sin(angle) * BULLET_SPEED,
                damage: damage / 2,
              },
            ]);
          }
        } else {
          setBullets((b) => [
            ...b,
            {
              id: `bullet-${now}`,
              x: prev.x,
              y: prev.y,
              vx: (dx / dist) * BULLET_SPEED,
              vy: (dy / dist) * BULLET_SPEED,
              damage,
            },
          ]);
        }

        return { ...prev, x: newX, y: newY, ammo: prev.ammo - 1, lastShot: now };
      }

      return { ...prev, x: newX, y: newY };
    });

    setZombies((prevZombies) =>
      prevZombies.map((zombie) => {
        const dx = player.x - zombie.x;
        const dy = player.y - zombie.y;
        const dist = Math.hypot(dx, dy);

        if (dist < PLAYER_SIZE + 15) {
          if (now - zombie.lastAttack > 1000) {
            setPlayer((p) => ({ ...p, health: p.health - zombie.damage }));
            return { ...zombie, lastAttack: now };
          }
          return zombie;
        }

        return {
          ...zombie,
          x: zombie.x + (dx / dist) * zombie.speed,
          y: zombie.y + (dy / dist) * zombie.speed,
        };
      })
    );

    setBullets((prevBullets) => {
      return prevBullets
        .map((bullet) => {
          const newX = bullet.x + bullet.vx;
          const newY = bullet.y + bullet.vy;

          if (newX < 0 || newX > MAP_WIDTH || newY < 0 || newY > MAP_HEIGHT) {
            return null;
          }

          let hit = false;
          setZombies((prevZombies) =>
            prevZombies.map((z) => {
              if (Math.hypot(z.x - newX, z.y - newY) < 20) {
                hit = true;
                const newHealth = z.health - bullet.damage;
                if (newHealth <= 0) {
                  setScore((s) => s + (z.type === "brute" ? 50 : z.type === "runner" ? 30 : 10));
                  setKillCount((k) => k + 1);
                  if (Math.random() > 0.7) {
                    const pickupType = Math.random() > 0.6 ? "ammo" : Math.random() > 0.3 ? "health" : "weapon";
                    setPickups((p) => [
                      ...p,
                      {
                        id: `pickup-${Date.now()}`,
                        x: z.x,
                        y: z.y,
                        type: pickupType,
                        weapon: pickupType === "weapon" ? (Math.random() > 0.5 ? "shotgun" : "rifle") : undefined,
                      },
                    ]);
                  }
                }
                return { ...z, health: newHealth };
              }
              return z;
            })
          );

          return hit ? null : { ...bullet, x: newX, y: newY };
        })
        .filter((b): b is Bullet => b !== null);
    });

    setZombies((prev) => prev.filter((z) => z.health > 0));

    setPickups((prevPickups) => {
      return prevPickups.filter((pickup) => {
        if (Math.hypot(player.x - pickup.x, player.y - pickup.y) < 30) {
          if (pickup.type === "health") {
            setPlayer((p) => ({ ...p, health: Math.min(p.health + 25, p.maxHealth) }));
          } else if (pickup.type === "ammo") {
            setPlayer((p) => ({ ...p, ammo: p.maxAmmo }));
          } else if (pickup.type === "weapon" && pickup.weapon) {
            setPlayer((p) => ({ ...p, weapon: pickup.weapon!, ammo: p.maxAmmo }));
          }
          return false;
        }
        return true;
      });
    });

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, keysPressed, mousePos, isShooting, player]);

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
      if (player.health <= 0) {
        setGameState("dead");
      } else if (zombies.length === 0 && !waveComplete) {
        setWaveComplete(true);
        setTimeout(() => {
          setWave((w) => w + 1);
          setZombies(spawnZombies(wave + 1));
          setPlayer((p) => ({ ...p, health: Math.min(p.health + 20, p.maxHealth) }));
          setWaveComplete(false);
        }, 2000);
      }
    }
  }, [player.health, zombies.length, gameState, wave, waveComplete, spawnZombies]);

  useEffect(() => {
    if (!canvasRef.current || gameState !== "playing") return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    ctx.strokeStyle = "#333";
    for (let i = 0; i < MAP_WIDTH; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, MAP_HEIGHT);
      ctx.stroke();
    }
    for (let i = 0; i < MAP_HEIGHT; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(MAP_WIDTH, i);
      ctx.stroke();
    }

    pickups.forEach((pickup) => {
      ctx.fillStyle = pickup.type === "health" ? "#22c55e" : pickup.type === "ammo" ? "#eab308" : "#8b5cf6";
      ctx.beginPath();
      ctx.arc(pickup.x, pickup.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.font = "10px Arial";
      ctx.textAlign = "center";
      ctx.fillText(pickup.type === "health" ? "+" : pickup.type === "ammo" ? "A" : "W", pickup.x, pickup.y + 3);
    });

    zombies.forEach((zombie) => {
      const color = zombie.type === "runner" ? "#3b82f6" : zombie.type === "brute" ? "#7c3aed" : "#16a34a";
      const size = zombie.type === "brute" ? 18 : 12;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(zombie.x, zombie.y, size, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#333";
      ctx.fillRect(zombie.x - 12, zombie.y - 22, 24, 4);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(zombie.x - 12, zombie.y - 22, 24 * (zombie.health / zombie.maxHealth), 4);
    });

    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_SIZE, 0, Math.PI * 2);
    ctx.fill();

    const angle = Math.atan2(mousePos.y - player.y, mousePos.x - player.x);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + Math.cos(angle) * 30, player.y + Math.sin(angle) * 30);
    ctx.stroke();

    bullets.forEach((bullet) => {
      ctx.fillStyle = "#fbbf24";
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
      ctx.fill();
    });

    if (waveComplete) {
      ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
      ctx.fillStyle = "#22c55e";
      ctx.font = "bold 40px Arial";
      ctx.textAlign = "center";
      ctx.fillText(`Wave ${wave} Complete!`, MAP_WIDTH / 2, MAP_HEIGHT / 2);
    }
  });

  if (gameState === "menu") {
    return (
      <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
              <Skull className="w-8 h-8 text-red-500" />
            </div>
            <CardTitle className="text-2xl">Zombie Survival</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Survive endless waves of zombies! Move, shoot, and collect upgrades!
            </p>
            <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
              <p><strong>WASD</strong> - Move</p>
              <p><strong>Mouse</strong> - Aim</p>
              <p><strong>Left Click</strong> - Shoot</p>
              <p><strong>R</strong> - Reload</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="bg-green-500/20 p-2 rounded text-green-500">Walker</div>
              <div className="bg-blue-500/20 p-2 rounded text-blue-500">Runner (Fast)</div>
              <div className="bg-purple-500/20 p-2 rounded text-purple-500">Brute (Tank)</div>
            </div>
            <Button onClick={startGame} size="lg" className="w-full" data-testid="button-start-zombie">
              Start Survival
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === "dead") {
    return (
      <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-red-500">You Died!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-2xl font-bold">Score: {score}</p>
            <p>Waves Survived: {wave}</p>
            <p>Zombies Killed: {killCount}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={startGame} data-testid="button-restart-zombie">
                <RotateCcw className="w-4 h-4 mr-1" /> Try Again
              </Button>
              <Button variant="outline" onClick={() => { setGameState("menu"); onClose?.(); }} data-testid="button-menu-zombie">
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
          <Heart className="w-4 h-4 mr-2 text-red-500" />
          {player.health}/{player.maxHealth}
        </Badge>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Target className="w-4 h-4 mr-2" />
          {player.ammo}/{player.maxAmmo}
        </Badge>
        <Badge variant="secondary" className="text-lg px-4 py-2 capitalize">
          <Shield className="w-4 h-4 mr-2" />
          {player.weapon}
        </Badge>
        <Badge variant="default" className="text-lg px-4 py-2">
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
        data-testid="button-quit-zombie"
      >
        <X className="w-4 h-4 mr-1" /> Quit
      </Button>
      <canvas
        ref={canvasRef}
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        className="border-2 border-red-500/50 rounded-lg cursor-crosshair"
      />
      <p className="text-muted-foreground text-sm mt-2">
        Zombies remaining: {zombies.length}
      </p>
    </div>
  );
}
