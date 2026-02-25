import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Clock, Pause, FastForward, Rewind, Shield } from "lucide-react";

const MAP_WIDTH = 800;
const MAP_HEIGHT = 600;
const PLAYER_SIZE = 20;
const BULLET_SPEED = 8;

type TimeState = "normal" | "frozen" | "slow" | "rewind";

interface Player {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  timeEnergy: number;
  maxTimeEnergy: number;
}

interface Enemy {
  id: string;
  x: number;
  y: number;
  health: number;
  speed: number;
  type: "melee" | "ranged";
  lastShot: number;
  history: Array<{ x: number; y: number; health: number }>;
}

interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: "player" | "enemy";
  frozenTime: number;
}

interface TimeRiftProps {
  onClose?: () => void;
}

export function TimeRift({ onClose }: TimeRiftProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"menu" | "playing" | "won" | "lost">("menu");
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [timeState, setTimeState] = useState<TimeState>("normal");
  const [player, setPlayer] = useState<Player>({
    x: MAP_WIDTH / 2,
    y: MAP_HEIGHT - 80,
    health: 100,
    maxHealth: 100,
    timeEnergy: 100,
    maxTimeEnergy: 100,
  });
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const animationRef = useRef<number>();
  const lastTimeRef = useRef<number>(0);

  const spawnEnemies = useCallback((waveNum: number) => {
    const newEnemies: Enemy[] = [];
    const count = 3 + waveNum * 2;
    for (let i = 0; i < count; i++) {
      newEnemies.push({
        id: Math.random().toString(),
        x: Math.random() * (MAP_WIDTH - 100) + 50,
        y: Math.random() * 150 + 50,
        health: 30 + waveNum * 10,
        speed: 1 + waveNum * 0.2,
        type: Math.random() > 0.6 ? "ranged" : "melee",
        lastShot: 0,
        history: [],
      });
    }
    return newEnemies;
  }, []);

  const startGame = () => {
    setGameState("playing");
    setScore(0);
    setWave(1);
    setTimeState("normal");
    setPlayer({
      x: MAP_WIDTH / 2,
      y: MAP_HEIGHT - 80,
      health: 100,
      maxHealth: 100,
      timeEnergy: 100,
      maxTimeEnergy: 100,
    });
    setEnemies(spawnEnemies(1));
    setBullets([]);
  };

  const activateTimeAbility = useCallback((ability: TimeState) => {
    if (player.timeEnergy < 10 && ability !== "normal") return;
    setTimeState(ability);
  }, [player.timeEnergy]);

  const shoot = useCallback(() => {
    const angle = Math.atan2(mousePos.y - player.y, mousePos.x - player.x);
    setBullets(prev => [...prev, {
      id: Math.random().toString(),
      x: player.x,
      y: player.y,
      vx: Math.cos(angle) * BULLET_SPEED,
      vy: Math.sin(angle) * BULLET_SPEED,
      owner: "player",
      frozenTime: 0,
    }]);
  }, [player, mousePos]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeysPressed(prev => new Set(prev).add(e.key.toLowerCase()));
      
      if (e.key === "q") activateTimeAbility("frozen");
      if (e.key === "e") activateTimeAbility("slow");
      if (e.key === "r") activateTimeAbility("rewind");
      if (e.key === " " && gameState === "playing") {
        e.preventDefault();
        shoot();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      setKeysPressed(prev => {
        const next = new Set(prev);
        next.delete(e.key.toLowerCase());
        return next;
      });
      if (["q", "e", "r"].includes(e.key.toLowerCase())) {
        setTimeState("normal");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [activateTimeAbility, gameState, shoot]);

  const handleClick = useCallback(() => {
    if (gameState === "playing") shoot();
  }, [gameState, shoot]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const gameLoop = useCallback(() => {
    if (gameState !== "playing") return;
    const now = Date.now();
    const delta = now - lastTimeRef.current;
    lastTimeRef.current = now;

    const timeMultiplier = timeState === "frozen" ? 0 : timeState === "slow" ? 0.2 : 1;

    // Drain time energy when using abilities
    if (timeState !== "normal") {
      setPlayer(prev => {
        const newEnergy = prev.timeEnergy - 0.5;
        if (newEnergy <= 0) {
          setTimeState("normal");
          return { ...prev, timeEnergy: 0 };
        }
        return { ...prev, timeEnergy: newEnergy };
      });
    } else {
      // Regenerate time energy
      setPlayer(prev => ({
        ...prev,
        timeEnergy: Math.min(prev.timeEnergy + 0.2, prev.maxTimeEnergy),
      }));
    }

    // Move player (always at normal speed)
    setPlayer(prev => {
      let newX = prev.x;
      let newY = prev.y;
      const speed = 5;
      if (keysPressed.has("a") || keysPressed.has("arrowleft")) newX -= speed;
      if (keysPressed.has("d") || keysPressed.has("arrowright")) newX += speed;
      if (keysPressed.has("w") || keysPressed.has("arrowup")) newY -= speed;
      if (keysPressed.has("s") || keysPressed.has("arrowdown")) newY += speed;
      newX = Math.max(PLAYER_SIZE, Math.min(MAP_WIDTH - PLAYER_SIZE, newX));
      newY = Math.max(PLAYER_SIZE, Math.min(MAP_HEIGHT - PLAYER_SIZE, newY));
      return { ...prev, x: newX, y: newY };
    });

    // Rewind enemies
    if (timeState === "rewind") {
      setEnemies(prev => prev.map(enemy => {
        if (enemy.history.length > 0) {
          const pastState = enemy.history.pop()!;
          return { ...enemy, x: pastState.x, y: pastState.y, health: pastState.health, history: enemy.history };
        }
        return enemy;
      }));
    } else {
      // Move enemies
      setEnemies(prev => prev.map(enemy => {
        // Save history for rewind
        const newHistory = [...enemy.history, { x: enemy.x, y: enemy.y, health: enemy.health }];
        if (newHistory.length > 60) newHistory.shift();

        const dx = player.x - enemy.x;
        const dy = player.y - enemy.y;
        const dist = Math.hypot(dx, dy);
        const moveSpeed = enemy.speed * timeMultiplier;

        let newX = enemy.x;
        let newY = enemy.y;

        if (enemy.type === "melee") {
          newX += (dx / dist) * moveSpeed;
          newY += (dy / dist) * moveSpeed;
        } else {
          // Ranged enemies keep distance
          if (dist < 200) {
            newX -= (dx / dist) * moveSpeed;
            newY -= (dy / dist) * moveSpeed;
          } else if (dist > 300) {
            newX += (dx / dist) * moveSpeed * 0.5;
            newY += (dy / dist) * moveSpeed * 0.5;
          }

          // Ranged enemies shoot
          if (now - enemy.lastShot > 2000 / timeMultiplier && timeMultiplier > 0) {
            const angle = Math.atan2(dy, dx);
            setBullets(b => [...b, {
              id: Math.random().toString(),
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(angle) * 4,
              vy: Math.sin(angle) * 4,
              owner: "enemy",
              frozenTime: 0,
            }]);
            return { ...enemy, x: newX, y: newY, lastShot: now, history: newHistory };
          }
        }

        // Melee damage
        if (enemy.type === "melee" && dist < PLAYER_SIZE + 15 && timeMultiplier > 0) {
          setPlayer(p => ({ ...p, health: p.health - 0.3 * timeMultiplier }));
        }

        return { ...enemy, x: newX, y: newY, history: newHistory };
      }));
    }

    // Move bullets
    setBullets(prev => {
      const newBullets = prev.map(b => {
        if (timeState === "frozen" && b.owner === "enemy") {
          return { ...b, frozenTime: b.frozenTime + 1 };
        }
        const mult = b.owner === "player" ? 1 : timeMultiplier;
        return {
          ...b,
          x: b.x + b.vx * mult,
          y: b.y + b.vy * mult,
        };
      }).filter(b => b.x > 0 && b.x < MAP_WIDTH && b.y > 0 && b.y < MAP_HEIGHT);

      // Check bullet collisions
      newBullets.forEach(bullet => {
        if (bullet.owner === "player") {
          setEnemies(enemies => enemies.map(e => {
            if (Math.hypot(e.x - bullet.x, e.y - bullet.y) < 20) {
              bullet.x = -100;
              const newHealth = e.health - 20;
              if (newHealth <= 0) setScore(s => s + 50);
              return { ...e, health: newHealth };
            }
            return e;
          }));
        } else {
          setPlayer(p => {
            if (Math.hypot(p.x - bullet.x, p.y - bullet.y) < PLAYER_SIZE) {
              bullet.x = -100;
              return { ...p, health: p.health - 15 };
            }
            return p;
          });
        }
      });

      return newBullets.filter(b => b.x > 0);
    });

    // Remove dead enemies
    setEnemies(prev => prev.filter(e => e.health > 0));

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, keysPressed, player, timeState]);

  useEffect(() => {
    if (gameState === "playing") {
      lastTimeRef.current = Date.now();
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameState, gameLoop]);

  useEffect(() => {
    if (gameState === "playing") {
      if (player.health <= 0) {
        setGameState("lost");
      } else if (enemies.length === 0) {
        setWave(w => w + 1);
        setEnemies(spawnEnemies(wave + 1));
        setPlayer(p => ({ ...p, health: Math.min(p.health + 30, p.maxHealth) }));
        setScore(s => s + wave * 100);
      }
    }
  }, [player.health, enemies.length, gameState, wave, spawnEnemies]);

  // Render
  useEffect(() => {
    if (!canvasRef.current || gameState !== "playing") return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Background with time effect
    let bgColor = "#0f0f23";
    if (timeState === "frozen") bgColor = "#1a1a4a";
    if (timeState === "slow") bgColor = "#2a1a2a";
    if (timeState === "rewind") bgColor = "#1a2a1a";
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Time effect overlay
    if (timeState !== "normal") {
      ctx.fillStyle = timeState === "frozen" ? "rgba(100, 150, 255, 0.1)" :
                      timeState === "slow" ? "rgba(255, 150, 100, 0.1)" :
                      "rgba(100, 255, 150, 0.1)";
      ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);
    }

    // Grid pattern
    ctx.strokeStyle = "rgba(100, 100, 150, 0.2)";
    ctx.lineWidth = 1;
    for (let x = 0; x < MAP_WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, MAP_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < MAP_HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(MAP_WIDTH, y);
      ctx.stroke();
    }

    // Draw player
    ctx.fillStyle = "#22c55e";
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_SIZE, 0, Math.PI * 2);
    ctx.fill();
    
    // Player direction indicator
    const angle = Math.atan2(mousePos.y - player.y, mousePos.x - player.x);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(player.x + Math.cos(angle) * 30, player.y + Math.sin(angle) * 30);
    ctx.stroke();

    // Draw enemies
    enemies.forEach(enemy => {
      ctx.fillStyle = enemy.type === "melee" ? "#ef4444" : "#a855f7";
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, 15, 0, Math.PI * 2);
      ctx.fill();

      // Health bar
      const hpPct = enemy.health / (30 + wave * 10);
      ctx.fillStyle = "#333";
      ctx.fillRect(enemy.x - 15, enemy.y - 25, 30, 5);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(enemy.x - 15, enemy.y - 25, 30 * hpPct, 5);

      // Frozen effect
      if (timeState === "frozen") {
        ctx.strokeStyle = "rgba(100, 200, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, 20, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // Draw bullets
    bullets.forEach(bullet => {
      ctx.fillStyle = bullet.owner === "player" ? "#fbbf24" : "#f87171";
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
      ctx.fill();

      // Frozen bullet effect
      if (timeState === "frozen" && bullet.owner === "enemy") {
        ctx.strokeStyle = "rgba(100, 200, 255, 0.8)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, 10, 0, Math.PI * 2);
        ctx.stroke();
      }
    });

    // Crosshair
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(mousePos.x, mousePos.y, 10, 0, Math.PI * 2);
    ctx.moveTo(mousePos.x - 15, mousePos.y);
    ctx.lineTo(mousePos.x + 15, mousePos.y);
    ctx.moveTo(mousePos.x, mousePos.y - 15);
    ctx.lineTo(mousePos.x, mousePos.y + 15);
    ctx.stroke();
  });

  if (gameState === "menu") {
    return (
      <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Clock className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Time Rift Tactics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Manipulate time to defeat enemies! Freeze bullets, slow motion, or rewind enemy movements.
            </p>
            <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
              <p><strong>WASD</strong> - Move</p>
              <p><strong>Click/Space</strong> - Shoot</p>
              <p><strong>Q (hold)</strong> - Freeze Time</p>
              <p><strong>E (hold)</strong> - Slow Motion</p>
              <p><strong>R (hold)</strong> - Rewind Enemies</p>
            </div>
            <Button onClick={startGame} size="lg" className="w-full" data-testid="button-start-timerift">
              Enter the Rift
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
              {gameState === "won" ? "Time Mastered!" : "Time Collapsed!"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xl">Score: {score}</p>
            <p>Waves Cleared: {wave - 1}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={startGame} data-testid="button-restart-timerift">Play Again</Button>
              <Button variant="outline" onClick={() => { setGameState("menu"); onClose?.(); }} data-testid="button-menu-timerift">
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
          HP: {Math.round(player.health)}
        </Badge>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Clock className="w-4 h-4 mr-2" />
          Time Energy: {Math.round(player.timeEnergy)}%
        </Badge>
        <Badge variant="default" className="text-lg px-4 py-2">
          Wave: {wave} | Score: {score}
        </Badge>
        {timeState !== "normal" && (
          <Badge variant="outline" className="text-lg px-4 py-2 animate-pulse">
            {timeState === "frozen" && <><Pause className="w-4 h-4 mr-2" /> TIME FROZEN</>}
            {timeState === "slow" && <><FastForward className="w-4 h-4 mr-2" /> SLOW MOTION</>}
            {timeState === "rewind" && <><Rewind className="w-4 h-4 mr-2" /> REWINDING</>}
          </Badge>
        )}
      </div>
      <Button
        variant="destructive"
        size="sm"
        className="absolute top-4 right-4 z-10"
        onClick={() => { setGameState("menu"); onClose?.(); }}
        data-testid="button-quit-timerift"
      >
        <X className="w-4 h-4 mr-1" /> Quit
      </Button>
      <canvas
        ref={canvasRef}
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        className="border-2 border-primary/50 rounded-lg cursor-crosshair"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
      />
    </div>
  );
}
