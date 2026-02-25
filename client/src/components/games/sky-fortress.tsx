import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Crosshair, Shield, Zap, Rocket } from "lucide-react";

const MAP_WIDTH = 900;
const MAP_HEIGHT = 600;
const FORTRESS_SIZE = 60;
const MISSILE_SPEED = 6;
const DRONE_SPEED = 2;

interface Fortress {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  shield: number;
  missiles: number;
  drones: number;
  color: string;
  isPlayer: boolean;
}

interface Missile {
  id: string;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  owner: "player" | "enemy";
  angle: number;
}

interface Drone {
  id: string;
  x: number;
  y: number;
  health: number;
  owner: "player" | "enemy";
  targetId: string | null;
}

interface Cloud {
  x: number;
  y: number;
  size: number;
  speed: number;
}

interface SkyFortressProps {
  onClose?: () => void;
}

export function SkyFortress({ onClose }: SkyFortressProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"menu" | "playing" | "won" | "lost">("menu");
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [playerFortress, setPlayerFortress] = useState<Fortress>({
    x: MAP_WIDTH / 4,
    y: MAP_HEIGHT / 2,
    health: 100,
    maxHealth: 100,
    shield: 50,
    missiles: 10,
    drones: 3,
    color: "#22c55e",
    isPlayer: true,
  });
  const [enemyFortresses, setEnemyFortresses] = useState<Fortress[]>([]);
  const [missiles, setMissiles] = useState<Missile[]>([]);
  const [drones, setDrones] = useState<Drone[]>([]);
  const [clouds, setClouds] = useState<Cloud[]>([]);
  const [selectedWeapon, setSelectedWeapon] = useState<"missile" | "drone">("missile");
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });

  const animationRef = useRef<number>();

  const spawnEnemies = useCallback((waveNum: number) => {
    const enemies: Fortress[] = [];
    const count = Math.min(1 + Math.floor(waveNum / 2), 4);
    for (let i = 0; i < count; i++) {
      enemies.push({
        x: MAP_WIDTH - 150 - (i * 100),
        y: 100 + (i * 120),
        health: 60 + waveNum * 15,
        maxHealth: 60 + waveNum * 15,
        shield: 20 + waveNum * 5,
        missiles: 5 + waveNum,
        drones: 2,
        color: "#ef4444",
        isPlayer: false,
      });
    }
    return enemies;
  }, []);

  const generateClouds = useCallback(() => {
    const newClouds: Cloud[] = [];
    for (let i = 0; i < 8; i++) {
      newClouds.push({
        x: Math.random() * MAP_WIDTH,
        y: Math.random() * MAP_HEIGHT,
        size: 30 + Math.random() * 50,
        speed: 0.2 + Math.random() * 0.5,
      });
    }
    return newClouds;
  }, []);

  const startGame = () => {
    setGameState("playing");
    setScore(0);
    setWave(1);
    setPlayerFortress({
      x: MAP_WIDTH / 4,
      y: MAP_HEIGHT / 2,
      health: 100,
      maxHealth: 100,
      shield: 50,
      missiles: 10,
      drones: 3,
      color: "#22c55e",
      isPlayer: true,
    });
    setEnemyFortresses(spawnEnemies(1));
    setMissiles([]);
    setDrones([]);
    setClouds(generateClouds());
  };

  const fireMissile = useCallback((targetX: number, targetY: number) => {
    if (playerFortress.missiles <= 0) return;
    
    const angle = Math.atan2(targetY - playerFortress.y, targetX - playerFortress.x);
    setMissiles(prev => [...prev, {
      id: Math.random().toString(),
      x: playerFortress.x,
      y: playerFortress.y,
      targetX,
      targetY,
      owner: "player",
      angle,
    }]);
    setPlayerFortress(prev => ({ ...prev, missiles: prev.missiles - 1 }));
  }, [playerFortress]);

  const launchDrone = useCallback((targetX: number, targetY: number) => {
    if (playerFortress.drones <= 0) return;
    
    const nearestEnemy = enemyFortresses.reduce((nearest, enemy) => {
      const dist = Math.hypot(enemy.x - targetX, enemy.y - targetY);
      const nearestDist = nearest ? Math.hypot(nearest.x - targetX, nearest.y - targetY) : Infinity;
      return dist < nearestDist ? enemy : nearest;
    }, null as Fortress | null);

    setDrones(prev => [...prev, {
      id: Math.random().toString(),
      x: playerFortress.x,
      y: playerFortress.y,
      health: 30,
      owner: "player",
      targetId: nearestEnemy ? `enemy-${enemyFortresses.indexOf(nearestEnemy)}` : null,
    }]);
    setPlayerFortress(prev => ({ ...prev, drones: prev.drones - 1 }));
  }, [playerFortress, enemyFortresses]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (gameState !== "playing") return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    if (selectedWeapon === "missile") {
      fireMissile(x, y);
    } else {
      launchDrone(x, y);
    }
  }, [gameState, selectedWeapon, fireMissile, launchDrone]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "1") setSelectedWeapon("missile");
      if (e.key === "2") setSelectedWeapon("drone");
      
      if (gameState !== "playing") return;
      
      setPlayerFortress(prev => {
        let newY = prev.y;
        if (e.key === "w" || e.key === "ArrowUp") newY -= 15;
        if (e.key === "s" || e.key === "ArrowDown") newY += 15;
        newY = Math.max(FORTRESS_SIZE, Math.min(MAP_HEIGHT - FORTRESS_SIZE, newY));
        return { ...prev, y: newY };
      });
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [gameState]);

  const gameLoop = useCallback(() => {
    if (gameState !== "playing") return;
    const now = Date.now();

    // Move clouds
    setClouds(prev => prev.map(cloud => ({
      ...cloud,
      x: (cloud.x + cloud.speed) % (MAP_WIDTH + 100),
    })));

    // Enemy AI - fire missiles
    setEnemyFortresses(prev => prev.map((enemy, idx) => {
      if (Math.random() < 0.01 && enemy.missiles > 0) {
        const angle = Math.atan2(playerFortress.y - enemy.y, playerFortress.x - enemy.x);
        setMissiles(m => [...m, {
          id: Math.random().toString(),
          x: enemy.x,
          y: enemy.y,
          targetX: playerFortress.x,
          targetY: playerFortress.y,
          owner: "enemy",
          angle,
        }]);
        return { ...enemy, missiles: enemy.missiles - 1 };
      }
      return enemy;
    }));

    // Move missiles
    setMissiles(prev => {
      const newMissiles = prev.map(m => ({
        ...m,
        x: m.x + Math.cos(m.angle) * MISSILE_SPEED,
        y: m.y + Math.sin(m.angle) * MISSILE_SPEED,
      })).filter(m => m.x > -50 && m.x < MAP_WIDTH + 50 && m.y > -50 && m.y < MAP_HEIGHT + 50);

      // Check missile collisions
      newMissiles.forEach(missile => {
        if (missile.owner === "player") {
          setEnemyFortresses(enemies => enemies.map(enemy => {
            if (Math.hypot(enemy.x - missile.x, enemy.y - missile.y) < FORTRESS_SIZE) {
              missile.x = -100;
              const damage = 20;
              if (enemy.shield > 0) {
                const shieldDamage = Math.min(damage, enemy.shield);
                return { ...enemy, shield: enemy.shield - shieldDamage, health: enemy.health - (damage - shieldDamage) };
              }
              if (enemy.health - damage <= 0) {
                setScore(s => s + 200);
              }
              return { ...enemy, health: enemy.health - damage };
            }
            return enemy;
          }));
        } else {
          setPlayerFortress(p => {
            if (Math.hypot(p.x - missile.x, p.y - missile.y) < FORTRESS_SIZE) {
              missile.x = -100;
              const damage = 15;
              if (p.shield > 0) {
                const shieldDamage = Math.min(damage, p.shield);
                return { ...p, shield: p.shield - shieldDamage, health: p.health - (damage - shieldDamage) };
              }
              return { ...p, health: p.health - damage };
            }
            return p;
          });
        }
      });

      return newMissiles.filter(m => m.x > 0);
    });

    // Move drones
    setDrones(prev => prev.map(drone => {
      let targetX = mousePos.x;
      let targetY = mousePos.y;
      
      if (drone.owner === "player" && drone.targetId) {
        const idx = parseInt(drone.targetId.split("-")[1]);
        const target = enemyFortresses[idx];
        if (target) {
          targetX = target.x;
          targetY = target.y;
        }
      } else if (drone.owner === "enemy") {
        targetX = playerFortress.x;
        targetY = playerFortress.y;
      }

      const angle = Math.atan2(targetY - drone.y, targetX - drone.x);
      return {
        ...drone,
        x: drone.x + Math.cos(angle) * DRONE_SPEED,
        y: drone.y + Math.sin(angle) * DRONE_SPEED,
      };
    }));

    // Check drone attacks
    setDrones(prev => {
      const newDrones = [...prev];
      newDrones.forEach(drone => {
        if (drone.owner === "player") {
          setEnemyFortresses(enemies => enemies.map(enemy => {
            if (Math.hypot(enemy.x - drone.x, enemy.y - drone.y) < FORTRESS_SIZE + 20) {
              const damage = 2;
              return { ...enemy, health: enemy.health - damage };
            }
            return enemy;
          }));
        } else {
          setPlayerFortress(p => {
            if (Math.hypot(p.x - drone.x, p.y - drone.y) < FORTRESS_SIZE + 20) {
              return { ...p, health: p.health - 1 };
            }
            return p;
          });
        }
      });
      return newDrones.filter(d => d.health > 0);
    });

    // Remove dead enemies
    setEnemyFortresses(prev => prev.filter(e => e.health > 0));

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, playerFortress, enemyFortresses, mousePos]);

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
      if (playerFortress.health <= 0) {
        setGameState("lost");
      } else if (enemyFortresses.length === 0) {
        setWave(w => w + 1);
        setEnemyFortresses(spawnEnemies(wave + 1));
        setPlayerFortress(p => ({
          ...p,
          health: Math.min(p.health + 25, p.maxHealth),
          shield: Math.min(p.shield + 15, 50),
          missiles: p.missiles + 5,
          drones: p.drones + 1,
        }));
        setScore(s => s + wave * 100);
      }
    }
  }, [playerFortress.health, enemyFortresses.length, gameState, wave, spawnEnemies]);

  // Render
  useEffect(() => {
    if (!canvasRef.current || gameState !== "playing") return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Sky gradient background
    const gradient = ctx.createLinearGradient(0, 0, 0, MAP_HEIGHT);
    gradient.addColorStop(0, "#1e3a5f");
    gradient.addColorStop(1, "#4a7c9b");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Draw clouds
    clouds.forEach(cloud => {
      ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
      ctx.beginPath();
      ctx.arc(cloud.x, cloud.y, cloud.size, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.size * 0.5, cloud.y - cloud.size * 0.3, cloud.size * 0.7, 0, Math.PI * 2);
      ctx.arc(cloud.x + cloud.size, cloud.y, cloud.size * 0.8, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw fortress function
    const drawFortress = (fortress: Fortress) => {
      ctx.save();
      ctx.translate(fortress.x, fortress.y);

      // Shield glow
      if (fortress.shield > 0) {
        ctx.strokeStyle = `rgba(100, 200, 255, ${fortress.shield / 100})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, FORTRESS_SIZE + 10, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Fortress body
      ctx.fillStyle = fortress.color;
      ctx.fillRect(-FORTRESS_SIZE / 2, -FORTRESS_SIZE / 3, FORTRESS_SIZE, FORTRESS_SIZE * 2 / 3);
      
      // Towers
      ctx.fillStyle = fortress.isPlayer ? "#16a34a" : "#dc2626";
      ctx.fillRect(-FORTRESS_SIZE / 2 - 10, -FORTRESS_SIZE / 2, 15, FORTRESS_SIZE / 2);
      ctx.fillRect(FORTRESS_SIZE / 2 - 5, -FORTRESS_SIZE / 2, 15, FORTRESS_SIZE / 2);
      
      // Windows
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(-15, -10, 8, 8);
      ctx.fillRect(7, -10, 8, 8);

      ctx.restore();

      // Health bar
      const hpPct = fortress.health / fortress.maxHealth;
      ctx.fillStyle = "#333";
      ctx.fillRect(fortress.x - 30, fortress.y - FORTRESS_SIZE - 15, 60, 8);
      ctx.fillStyle = hpPct > 0.5 ? "#22c55e" : hpPct > 0.25 ? "#eab308" : "#ef4444";
      ctx.fillRect(fortress.x - 30, fortress.y - FORTRESS_SIZE - 15, 60 * hpPct, 8);
    };

    // Draw fortresses
    drawFortress(playerFortress);
    enemyFortresses.forEach(drawFortress);

    // Draw missiles
    missiles.forEach(missile => {
      ctx.save();
      ctx.translate(missile.x, missile.y);
      ctx.rotate(missile.angle);
      ctx.fillStyle = missile.owner === "player" ? "#fbbf24" : "#f87171";
      ctx.beginPath();
      ctx.moveTo(15, 0);
      ctx.lineTo(-8, -5);
      ctx.lineTo(-8, 5);
      ctx.closePath();
      ctx.fill();
      
      // Trail
      ctx.fillStyle = missile.owner === "player" ? "rgba(251, 191, 36, 0.5)" : "rgba(248, 113, 113, 0.5)";
      ctx.beginPath();
      ctx.moveTo(-8, -3);
      ctx.lineTo(-25, 0);
      ctx.lineTo(-8, 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    });

    // Draw drones
    drones.forEach(drone => {
      ctx.fillStyle = drone.owner === "player" ? "#3b82f6" : "#a855f7";
      ctx.beginPath();
      ctx.arc(drone.x, drone.y, 8, 0, Math.PI * 2);
      ctx.fill();
      
      // Propellers
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(drone.x - 12, drone.y);
      ctx.lineTo(drone.x + 12, drone.y);
      ctx.moveTo(drone.x, drone.y - 12);
      ctx.lineTo(drone.x, drone.y + 12);
      ctx.stroke();
    });

    // Crosshair
    ctx.strokeStyle = "rgba(255, 255, 255, 0.7)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mousePos.x, mousePos.y, 15, 0, Math.PI * 2);
    ctx.moveTo(mousePos.x - 20, mousePos.y);
    ctx.lineTo(mousePos.x + 20, mousePos.y);
    ctx.moveTo(mousePos.x, mousePos.y - 20);
    ctx.lineTo(mousePos.x, mousePos.y + 20);
    ctx.stroke();
  });

  if (gameState === "menu") {
    return (
      <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Rocket className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Sky Fortress Siege</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Command your floating fortress! Fire missiles and deploy drones to destroy enemy fortresses while defending your own.
            </p>
            <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
              <p><strong>W/S</strong> - Move fortress up/down</p>
              <p><strong>Click</strong> - Fire weapon</p>
              <p><strong>1</strong> - Select Missiles</p>
              <p><strong>2</strong> - Select Drones</p>
            </div>
            <Button onClick={startGame} size="lg" className="w-full" data-testid="button-start-skyfortress">
              Launch Battle
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
              {gameState === "won" ? "Victory!" : "Fortress Destroyed!"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xl">Score: {score}</p>
            <p>Waves Survived: {wave}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={startGame} data-testid="button-restart-skyfortress">Play Again</Button>
              <Button variant="outline" onClick={() => { setGameState("menu"); onClose?.(); }} data-testid="button-menu-skyfortress">
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
          HP: {playerFortress.health} | Shield: {playerFortress.shield}
        </Badge>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Rocket className="w-4 h-4 mr-2" />
          Missiles: {playerFortress.missiles}
        </Badge>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Zap className="w-4 h-4 mr-2" />
          Drones: {playerFortress.drones}
        </Badge>
        <Badge variant="default" className="text-lg px-4 py-2">
          Wave: {wave} | Score: {score}
        </Badge>
      </div>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        <Button 
          variant={selectedWeapon === "missile" ? "default" : "outline"} 
          onClick={() => setSelectedWeapon("missile")}
          data-testid="button-select-missile"
        >
          <Rocket className="w-4 h-4 mr-1" /> Missile (1)
        </Button>
        <Button 
          variant={selectedWeapon === "drone" ? "default" : "outline"} 
          onClick={() => setSelectedWeapon("drone")}
          data-testid="button-select-drone"
        >
          <Zap className="w-4 h-4 mr-1" /> Drone (2)
        </Button>
      </div>
      <Button
        variant="destructive"
        size="sm"
        className="absolute top-4 right-4 z-10"
        onClick={() => { setGameState("menu"); onClose?.(); }}
        data-testid="button-quit-skyfortress"
      >
        <X className="w-4 h-4 mr-1" /> Quit
      </Button>
      <canvas
        ref={canvasRef}
        width={MAP_WIDTH}
        height={MAP_HEIGHT}
        className="border-2 border-primary/50 rounded-lg cursor-crosshair"
        onClick={handleCanvasClick}
        onMouseMove={handleMouseMove}
      />
    </div>
  );
}
