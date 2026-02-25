import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Castle, Coins, Heart, Crosshair, Zap, Shield } from "lucide-react";

const MAP_WIDTH = 800;
const MAP_HEIGHT = 600;
const TILE_SIZE = 40;
const COLS = MAP_WIDTH / TILE_SIZE;
const ROWS = MAP_HEIGHT / TILE_SIZE;

interface Enemy {
  id: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  speed: number;
  pathIndex: number;
  reward: number;
  type: "normal" | "fast" | "tank";
}

interface Tower {
  id: string;
  x: number;
  y: number;
  type: "arrow" | "cannon" | "magic";
  damage: number;
  range: number;
  fireRate: number;
  lastFire: number;
  level: number;
}

interface Projectile {
  id: string;
  x: number;
  y: number;
  targetId: string;
  damage: number;
  speed: number;
  type: "arrow" | "cannonball" | "magic";
}

const PATH: Array<{ x: number; y: number }> = [
  { x: 0, y: 7 },
  { x: 3, y: 7 },
  { x: 3, y: 3 },
  { x: 7, y: 3 },
  { x: 7, y: 10 },
  { x: 12, y: 10 },
  { x: 12, y: 5 },
  { x: 17, y: 5 },
  { x: 17, y: 12 },
  { x: 20, y: 12 },
];

const TOWER_CONFIGS = {
  arrow: { damage: 15, range: 120, fireRate: 400, cost: 50, color: "#22c55e" },
  cannon: { damage: 40, range: 100, fireRate: 1000, cost: 100, color: "#f59e0b" },
  magic: { damage: 25, range: 150, fireRate: 600, cost: 150, color: "#8b5cf6" },
};

interface TowerDefenseProps {
  onClose?: () => void;
}

export function TowerDefense({ onClose }: TowerDefenseProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"menu" | "playing" | "won" | "lost">("menu");
  const [gold, setGold] = useState(200);
  const [lives, setLives] = useState(20);
  const [wave, setWave] = useState(1);
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [towers, setTowers] = useState<Tower[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [selectedTower, setSelectedTower] = useState<"arrow" | "cannon" | "magic" | null>(null);
  const [isPaused, setIsPaused] = useState(false);
  const [waveInProgress, setWaveInProgress] = useState(false);

  const animationRef = useRef<number>();

  const startGame = () => {
    setGameState("playing");
    setGold(200);
    setLives(20);
    setWave(1);
    setEnemies([]);
    setTowers([]);
    setProjectiles([]);
    setWaveInProgress(false);
  };

  const spawnWave = useCallback(() => {
    if (waveInProgress) return;
    setWaveInProgress(true);
    const newEnemies: Enemy[] = [];
    const enemyCount = 5 + wave * 2;
    
    for (let i = 0; i < enemyCount; i++) {
      const type = Math.random() > 0.7 ? (Math.random() > 0.5 ? "fast" : "tank") : "normal";
      const baseHealth = 50 + wave * 10;
      const health = type === "tank" ? baseHealth * 2 : baseHealth;
      const speed = type === "fast" ? 2.5 : type === "tank" ? 0.8 : 1.5;
      
      setTimeout(() => {
        setEnemies((prev) => [
          ...prev,
          {
            id: `enemy-${wave}-${i}`,
            x: PATH[0].x * TILE_SIZE + TILE_SIZE / 2,
            y: PATH[0].y * TILE_SIZE + TILE_SIZE / 2,
            health,
            maxHealth: health,
            speed,
            pathIndex: 0,
            reward: type === "tank" ? 30 : type === "fast" ? 15 : 20,
            type,
          },
        ]);
      }, i * 500);
    }
  }, [wave, waveInProgress]);

  const placeTower = useCallback(
    (gridX: number, gridY: number) => {
      if (!selectedTower) return;
      const config = TOWER_CONFIGS[selectedTower];
      if (gold < config.cost) return;
      
      const isOnPath = PATH.some((p) => p.x === gridX && p.y === gridY);
      const hasTower = towers.some((t) => t.x === gridX && t.y === gridY);
      if (isOnPath || hasTower) return;

      setGold((g) => g - config.cost);
      setTowers((prev) => [
        ...prev,
        {
          id: `tower-${Date.now()}`,
          x: gridX,
          y: gridY,
          type: selectedTower,
          damage: config.damage,
          range: config.range,
          fireRate: config.fireRate,
          lastFire: 0,
          level: 1,
        },
      ]);
      setSelectedTower(null);
    },
    [selectedTower, gold, towers]
  );

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const gridX = Math.floor(x / TILE_SIZE);
    const gridY = Math.floor(y / TILE_SIZE);
    placeTower(gridX, gridY);
  };

  const gameLoop = useCallback(() => {
    if (gameState !== "playing" || isPaused) return;
    const now = Date.now();

    setEnemies((prevEnemies) => {
      const updated = prevEnemies.map((enemy) => {
        if (enemy.pathIndex >= PATH.length - 1) {
          setLives((l) => l - 1);
          return null;
        }

        const target = PATH[enemy.pathIndex + 1];
        const targetX = target.x * TILE_SIZE + TILE_SIZE / 2;
        const targetY = target.y * TILE_SIZE + TILE_SIZE / 2;
        const dx = targetX - enemy.x;
        const dy = targetY - enemy.y;
        const dist = Math.hypot(dx, dy);

        if (dist < enemy.speed) {
          return { ...enemy, pathIndex: enemy.pathIndex + 1, x: targetX, y: targetY };
        }

        return {
          ...enemy,
          x: enemy.x + (dx / dist) * enemy.speed,
          y: enemy.y + (dy / dist) * enemy.speed,
        };
      });

      return updated.filter((e): e is Enemy => e !== null);
    });

    setTowers((prevTowers) =>
      prevTowers.map((tower) => {
        const towerX = tower.x * TILE_SIZE + TILE_SIZE / 2;
        const towerY = tower.y * TILE_SIZE + TILE_SIZE / 2;

        if (now - tower.lastFire < tower.fireRate) return tower;

        const target = enemies.find(
          (e) => Math.hypot(e.x - towerX, e.y - towerY) <= tower.range
        );

        if (target) {
          setProjectiles((p) => [
            ...p,
            {
              id: `proj-${Date.now()}-${Math.random()}`,
              x: towerX,
              y: towerY,
              targetId: target.id,
              damage: tower.damage,
              speed: 8,
              type: tower.type === "arrow" ? "arrow" : tower.type === "cannon" ? "cannonball" : "magic",
            },
          ]);
          return { ...tower, lastFire: now };
        }

        return tower;
      })
    );

    setProjectiles((prevProjectiles) => {
      return prevProjectiles
        .map((proj) => {
          const target = enemies.find((e) => e.id === proj.targetId);
          if (!target) return null;

          const dx = target.x - proj.x;
          const dy = target.y - proj.y;
          const dist = Math.hypot(dx, dy);

          if (dist < 10) {
            setEnemies((prevEnemies) =>
              prevEnemies.map((e) => {
                if (e.id === target.id) {
                  const newHealth = e.health - proj.damage;
                  if (newHealth <= 0) {
                    setGold((g) => g + e.reward);
                  }
                  return { ...e, health: newHealth };
                }
                return e;
              })
            );
            return null;
          }

          return {
            ...proj,
            x: proj.x + (dx / dist) * proj.speed,
            y: proj.y + (dy / dist) * proj.speed,
          };
        })
        .filter((p): p is Projectile => p !== null);
    });

    setEnemies((prev) => prev.filter((e) => e.health > 0));

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, isPaused, enemies]);

  useEffect(() => {
    if (gameState === "playing" && !isPaused) {
      animationRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [gameState, isPaused, gameLoop]);

  useEffect(() => {
    if (gameState === "playing") {
      if (lives <= 0) {
        setGameState("lost");
      } else if (waveInProgress && enemies.length === 0) {
        setWaveInProgress(false);
        if (wave >= 10) {
          setGameState("won");
        } else {
          setWave((w) => w + 1);
          setGold((g) => g + 50);
        }
      }
    }
  }, [lives, enemies.length, gameState, wave, waveInProgress]);

  useEffect(() => {
    if (!canvasRef.current || gameState !== "playing") return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#2d3748";
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    for (let i = 1; i < PATH.length; i++) {
      const prev = PATH[i - 1];
      const curr = PATH[i];
      ctx.fillStyle = "#5c4f3d";
      const x1 = Math.min(prev.x, curr.x) * TILE_SIZE;
      const y1 = Math.min(prev.y, curr.y) * TILE_SIZE;
      const w = (Math.abs(curr.x - prev.x) + 1) * TILE_SIZE;
      const h = (Math.abs(curr.y - prev.y) + 1) * TILE_SIZE;
      ctx.fillRect(x1, y1, w, h);
    }

    towers.forEach((tower) => {
      const x = tower.x * TILE_SIZE + TILE_SIZE / 2;
      const y = tower.y * TILE_SIZE + TILE_SIZE / 2;
      ctx.fillStyle = TOWER_CONFIGS[tower.type].color;
      ctx.beginPath();
      ctx.arc(x, y, TILE_SIZE / 2 - 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    enemies.forEach((enemy) => {
      const color = enemy.type === "fast" ? "#3b82f6" : enemy.type === "tank" ? "#6b7280" : "#ef4444";
      const size = enemy.type === "tank" ? 16 : 12;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, size, 0, Math.PI * 2);
      ctx.fill();
      
      const hpPct = enemy.health / enemy.maxHealth;
      ctx.fillStyle = "#333";
      ctx.fillRect(enemy.x - 15, enemy.y - 20, 30, 4);
      ctx.fillStyle = hpPct > 0.5 ? "#22c55e" : hpPct > 0.25 ? "#eab308" : "#ef4444";
      ctx.fillRect(enemy.x - 15, enemy.y - 20, 30 * hpPct, 4);
    });

    projectiles.forEach((proj) => {
      ctx.fillStyle = proj.type === "magic" ? "#c084fc" : proj.type === "cannonball" ? "#1f2937" : "#fbbf24";
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.type === "cannonball" ? 6 : 4, 0, Math.PI * 2);
      ctx.fill();
    });

    if (selectedTower) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = TOWER_CONFIGS[selectedTower].color;
      ctx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
      ctx.globalAlpha = 1;
    }
  });

  if (gameState === "menu") {
    return (
      <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Castle className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Tower Defense</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Build towers to defend against waves of enemies! Survive 10 waves to win.
            </p>
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="bg-green-500/20 p-2 rounded">
                <Crosshair className="w-5 h-5 mx-auto mb-1 text-green-500" />
                <p>Arrow</p>
                <p className="text-xs text-muted-foreground">Fast, Low DMG</p>
              </div>
              <div className="bg-amber-500/20 p-2 rounded">
                <Zap className="w-5 h-5 mx-auto mb-1 text-amber-500" />
                <p>Cannon</p>
                <p className="text-xs text-muted-foreground">Slow, High DMG</p>
              </div>
              <div className="bg-purple-500/20 p-2 rounded">
                <Shield className="w-5 h-5 mx-auto mb-1 text-purple-500" />
                <p>Magic</p>
                <p className="text-xs text-muted-foreground">Long Range</p>
              </div>
            </div>
            <Button onClick={startGame} size="lg" className="w-full" data-testid="button-start-td">
              Start Defense
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
              {gameState === "won" ? "Victory!" : "Defeat!"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p>Waves Survived: {wave}</p>
            <p>Towers Built: {towers.length}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={startGame} data-testid="button-restart-td">Play Again</Button>
              <Button variant="outline" onClick={() => { setGameState("menu"); onClose?.(); }} data-testid="button-menu-td">
                Menu
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center gap-4">
      <div className="flex gap-4 items-center">
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Coins className="w-4 h-4 mr-2" />
          {gold}
        </Badge>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Heart className="w-4 h-4 mr-2" />
          {lives}
        </Badge>
        <Badge variant="default" className="text-lg px-4 py-2">
          Wave: {wave}/10
        </Badge>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => { setGameState("menu"); onClose?.(); }}
          data-testid="button-quit-td"
        >
          <X className="w-4 h-4 mr-1" /> Quit
        </Button>
      </div>
      
      <div className="flex gap-2">
        {(["arrow", "cannon", "magic"] as const).map((type) => (
          <Button
            key={type}
            variant={selectedTower === type ? "default" : "outline"}
            onClick={() => setSelectedTower(type)}
            disabled={gold < TOWER_CONFIGS[type].cost}
            style={{ borderColor: TOWER_CONFIGS[type].color }}
            data-testid={`button-tower-${type}`}
          >
            {type.charAt(0).toUpperCase() + type.slice(1)} ({TOWER_CONFIGS[type].cost}g)
          </Button>
        ))}
        <Button
          onClick={spawnWave}
          disabled={waveInProgress}
          variant="secondary"
          data-testid="button-spawn-wave"
        >
          {waveInProgress ? "Wave in Progress..." : "Start Wave"}
        </Button>
      </div>
      
      <canvas
        ref={canvasRef}
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        onClick={handleCanvasClick}
        className="border-2 border-primary/50 rounded-lg cursor-crosshair"
      />
    </div>
  );
}
