import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Eye, Target, Shield, Crosshair, AlertTriangle } from "lucide-react";

const MAP_WIDTH = 900;
const MAP_HEIGHT = 600;
const PLAYER_SIZE = 12;
const TILE_SIZE = 30;

interface Player {
  x: number;
  y: number;
  health: number;
  ammo: number;
  stealth: boolean;
  detectionLevel: number;
}

interface Enemy {
  id: string;
  x: number;
  y: number;
  angle: number;
  health: number;
  alertLevel: number;
  patrolPoints: Array<{ x: number; y: number }>;
  currentPatrolIndex: number;
  lastSeenPlayer: { x: number; y: number } | null;
  visionRange: number;
  visionAngle: number;
}

interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: "player" | "enemy";
}

interface Objective {
  x: number;
  y: number;
  completed: boolean;
  type: "intel" | "sabotage" | "extract";
}

interface Wall {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ShadowOpsProps {
  onClose?: () => void;
}

export function ShadowOps({ onClose }: ShadowOpsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"menu" | "playing" | "won" | "lost">("menu");
  const [score, setScore] = useState(0);
  const [level, setLevel] = useState(1);
  const [player, setPlayer] = useState<Player>({
    x: 50,
    y: MAP_HEIGHT - 50,
    health: 100,
    ammo: 12,
    stealth: true,
    detectionLevel: 0,
  });
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [objectives, setObjectives] = useState<Objective[]>([]);
  const [walls, setWalls] = useState<Wall[]>([]);
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [globalAlert, setGlobalAlert] = useState(false);

  const animationRef = useRef<number>();

  const generateLevel = useCallback((levelNum: number) => {
    // Generate walls
    const newWalls: Wall[] = [
      { x: 150, y: 100, width: 200, height: 20 },
      { x: 150, y: 100, width: 20, height: 150 },
      { x: 400, y: 200, width: 20, height: 200 },
      { x: 400, y: 200, width: 150, height: 20 },
      { x: 600, y: 100, width: 20, height: 300 },
      { x: 200, y: 400, width: 300, height: 20 },
      { x: 700, y: 350, width: 150, height: 20 },
    ];

    // Generate enemies
    const newEnemies: Enemy[] = [];
    const enemyCount = 3 + levelNum * 2;
    const positions = [
      { x: 300, y: 150, patrol: [{ x: 300, y: 150 }, { x: 500, y: 150 }] },
      { x: 500, y: 350, patrol: [{ x: 500, y: 350 }, { x: 500, y: 500 }] },
      { x: 750, y: 200, patrol: [{ x: 750, y: 200 }, { x: 750, y: 400 }] },
      { x: 200, y: 500, patrol: [{ x: 200, y: 500 }, { x: 400, y: 500 }] },
      { x: 650, y: 500, patrol: [{ x: 650, y: 500 }, { x: 850, y: 500 }] },
    ];

    for (let i = 0; i < Math.min(enemyCount, positions.length); i++) {
      newEnemies.push({
        id: Math.random().toString(),
        x: positions[i].x,
        y: positions[i].y,
        angle: Math.random() * Math.PI * 2,
        health: 50,
        alertLevel: 0,
        patrolPoints: positions[i].patrol,
        currentPatrolIndex: 0,
        lastSeenPlayer: null,
        visionRange: 150 + levelNum * 20,
        visionAngle: Math.PI / 3,
      });
    }

    // Generate objectives
    const newObjectives: Objective[] = [
      { x: 350, y: 150, completed: false, type: "intel" },
      { x: 550, y: 400, completed: false, type: "sabotage" },
      { x: MAP_WIDTH - 50, y: 50, completed: false, type: "extract" },
    ];

    return { walls: newWalls, enemies: newEnemies, objectives: newObjectives };
  }, []);

  const startGame = () => {
    setGameState("playing");
    setScore(0);
    setLevel(1);
    setGlobalAlert(false);
    setPlayer({
      x: 50,
      y: MAP_HEIGHT - 50,
      health: 100,
      ammo: 12,
      stealth: true,
      detectionLevel: 0,
    });
    const levelData = generateLevel(1);
    setWalls(levelData.walls);
    setEnemies(levelData.enemies);
    setObjectives(levelData.objectives);
    setBullets([]);
  };

  const checkLineOfSight = useCallback((x1: number, y1: number, x2: number, y2: number, walls: Wall[]): boolean => {
    for (const wall of walls) {
      const left = wall.x;
      const right = wall.x + wall.width;
      const top = wall.y;
      const bottom = wall.y + wall.height;

      // Simple line-rectangle intersection
      const dx = x2 - x1;
      const dy = y2 - y1;
      
      let tmin = 0;
      let tmax = 1;

      if (dx !== 0) {
        const t1 = (left - x1) / dx;
        const t2 = (right - x1) / dx;
        tmin = Math.max(tmin, Math.min(t1, t2));
        tmax = Math.min(tmax, Math.max(t1, t2));
      }

      if (dy !== 0) {
        const t1 = (top - y1) / dy;
        const t2 = (bottom - y1) / dy;
        tmin = Math.max(tmin, Math.min(t1, t2));
        tmax = Math.min(tmax, Math.max(t1, t2));
      }

      if (tmin < tmax && tmin < 1 && tmax > 0) {
        return false;
      }
    }
    return true;
  }, []);

  const shoot = useCallback(() => {
    if (player.ammo <= 0) return;
    
    const angle = Math.atan2(mousePos.y - player.y, mousePos.x - player.x);
    setBullets(prev => [...prev, {
      id: Math.random().toString(),
      x: player.x,
      y: player.y,
      vx: Math.cos(angle) * 12,
      vy: Math.sin(angle) * 12,
      owner: "player",
    }]);
    setPlayer(prev => ({ ...prev, ammo: prev.ammo - 1, stealth: false }));
    setGlobalAlert(true);
  }, [player, mousePos]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeysPressed(prev => new Set(prev).add(e.key.toLowerCase()));
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
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameState, shoot]);

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

    // Move player
    setPlayer(prev => {
      let newX = prev.x;
      let newY = prev.y;
      const speed = keysPressed.has("shift") ? 2 : 4;
      
      if (keysPressed.has("a") || keysPressed.has("arrowleft")) newX -= speed;
      if (keysPressed.has("d") || keysPressed.has("arrowright")) newX += speed;
      if (keysPressed.has("w") || keysPressed.has("arrowup")) newY -= speed;
      if (keysPressed.has("s") || keysPressed.has("arrowdown")) newY += speed;

      // Collision with walls
      for (const wall of walls) {
        if (newX + PLAYER_SIZE > wall.x && newX - PLAYER_SIZE < wall.x + wall.width &&
            newY + PLAYER_SIZE > wall.y && newY - PLAYER_SIZE < wall.y + wall.height) {
          newX = prev.x;
          newY = prev.y;
          break;
        }
      }

      newX = Math.max(PLAYER_SIZE, Math.min(MAP_WIDTH - PLAYER_SIZE, newX));
      newY = Math.max(PLAYER_SIZE, Math.min(MAP_HEIGHT - PLAYER_SIZE, newY));

      // Stealth recovery when moving slowly
      const stealth = keysPressed.has("shift") || (!keysPressed.has("a") && !keysPressed.has("d") && !keysPressed.has("w") && !keysPressed.has("s"));
      
      return { ...prev, x: newX, y: newY, stealth };
    });

    // Check objectives
    setObjectives(prev => prev.map(obj => {
      if (!obj.completed && Math.hypot(obj.x - player.x, obj.y - player.y) < 30) {
        if (obj.type === "extract" && prev.filter(o => o.completed).length >= 2) {
          setScore(s => s + 500);
          return { ...obj, completed: true };
        } else if (obj.type !== "extract") {
          setScore(s => s + 200);
          return { ...obj, completed: true };
        }
      }
      return obj;
    }));

    // Enemy AI
    setEnemies(prev => prev.map(enemy => {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.hypot(dx, dy);
      const angleToPlayer = Math.atan2(dy, dx);
      
      // Check if player is in vision cone
      let canSeePlayer = false;
      const angleDiff = Math.abs(((angleToPlayer - enemy.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      
      if (dist < enemy.visionRange && angleDiff < enemy.visionAngle / 2) {
        canSeePlayer = checkLineOfSight(enemy.x, enemy.y, player.x, player.y, walls);
      }

      // Stealth reduces detection
      const detectionMod = player.stealth ? 0.5 : 1;

      let newAlertLevel = enemy.alertLevel;
      let newAngle = enemy.angle;
      let newX = enemy.x;
      let newY = enemy.y;
      let lastSeen = enemy.lastSeenPlayer;

      if (canSeePlayer || globalAlert) {
        newAlertLevel = Math.min(100, enemy.alertLevel + 2 * detectionMod);
        lastSeen = { x: player.x, y: player.y };
        newAngle = angleToPlayer;

        if (newAlertLevel > 50) {
          // Chase player
          newX += Math.cos(angleToPlayer) * 2;
          newY += Math.sin(angleToPlayer) * 2;

          // Shoot at player
          if (Math.random() < 0.02 && dist < 200) {
            setBullets(b => [...b, {
              id: Math.random().toString(),
              x: enemy.x,
              y: enemy.y,
              vx: Math.cos(angleToPlayer) * 6,
              vy: Math.sin(angleToPlayer) * 6,
              owner: "enemy",
            }]);
          }
        }
      } else {
        newAlertLevel = Math.max(0, enemy.alertLevel - 0.3);

        if (lastSeen && newAlertLevel > 20) {
          // Move to last seen position
          const toLastSeen = Math.atan2(lastSeen.y - enemy.y, lastSeen.x - enemy.x);
          newX += Math.cos(toLastSeen) * 1.5;
          newY += Math.sin(toLastSeen) * 1.5;
          newAngle = toLastSeen;
        } else {
          // Patrol
          const target = enemy.patrolPoints[enemy.currentPatrolIndex];
          const toTarget = Math.atan2(target.y - enemy.y, target.x - enemy.x);
          const distToTarget = Math.hypot(target.x - enemy.x, target.y - enemy.y);

          if (distToTarget < 10) {
            return {
              ...enemy,
              currentPatrolIndex: (enemy.currentPatrolIndex + 1) % enemy.patrolPoints.length,
              alertLevel: newAlertLevel,
            };
          }

          newX += Math.cos(toTarget) * 1;
          newY += Math.sin(toTarget) * 1;
          newAngle = toTarget;
          lastSeen = null;
        }
      }

      return {
        ...enemy,
        x: newX,
        y: newY,
        angle: newAngle,
        alertLevel: newAlertLevel,
        lastSeenPlayer: lastSeen,
      };
    }));

    // Update player detection level
    setPlayer(prev => {
      const maxAlert = Math.max(...enemies.map(e => e.alertLevel), 0);
      return { ...prev, detectionLevel: maxAlert };
    });

    // Move bullets
    setBullets(prev => {
      const newBullets = prev.map(b => ({
        ...b,
        x: b.x + b.vx,
        y: b.y + b.vy,
      })).filter(b => {
        // Wall collision
        for (const wall of walls) {
          if (b.x > wall.x && b.x < wall.x + wall.width &&
              b.y > wall.y && b.y < wall.y + wall.height) {
            return false;
          }
        }
        return b.x > 0 && b.x < MAP_WIDTH && b.y > 0 && b.y < MAP_HEIGHT;
      });

      // Check bullet collisions
      newBullets.forEach(bullet => {
        if (bullet.owner === "player") {
          setEnemies(enemies => enemies.map(e => {
            if (Math.hypot(e.x - bullet.x, e.y - bullet.y) < 15) {
              bullet.x = -100;
              const newHealth = e.health - 25;
              if (newHealth <= 0) setScore(s => s + 100);
              return { ...e, health: newHealth };
            }
            return e;
          }));
        } else {
          setPlayer(p => {
            if (Math.hypot(p.x - bullet.x, p.y - bullet.y) < PLAYER_SIZE) {
              bullet.x = -100;
              return { ...p, health: p.health - 20 };
            }
            return p;
          });
        }
      });

      return newBullets.filter(b => b.x > 0);
    });

    // Remove dead enemies
    setEnemies(prev => prev.filter(e => e.health > 0));

    // Reduce global alert over time
    if (globalAlert && !enemies.some(e => e.alertLevel > 50)) {
      setGlobalAlert(false);
    }

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, keysPressed, player, enemies, walls, globalAlert, checkLineOfSight]);

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
        setGameState("lost");
      } else if (objectives.every(o => o.completed)) {
        setLevel(l => l + 1);
        const levelData = generateLevel(level + 1);
        setWalls(levelData.walls);
        setEnemies(levelData.enemies);
        setObjectives(levelData.objectives);
        setPlayer(p => ({
          ...p,
          x: 50,
          y: MAP_HEIGHT - 50,
          health: Math.min(p.health + 30, 100),
          ammo: 12,
        }));
        setGlobalAlert(false);
        setScore(s => s + level * 300);
      }
    }
  }, [player.health, objectives, gameState, level, generateLevel]);

  // Render
  useEffect(() => {
    if (!canvasRef.current || gameState !== "playing") return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Dark background
    ctx.fillStyle = "#0a0a0f";
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Draw walls
    ctx.fillStyle = "#2a2a3a";
    walls.forEach(wall => {
      ctx.fillRect(wall.x, wall.y, wall.width, wall.height);
    });

    // Draw enemy vision cones
    enemies.forEach(enemy => {
      const visionColor = enemy.alertLevel > 50 ? "rgba(255, 50, 50, 0.2)" :
                          enemy.alertLevel > 20 ? "rgba(255, 200, 50, 0.2)" :
                          "rgba(100, 100, 255, 0.1)";
      
      ctx.fillStyle = visionColor;
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.arc(enemy.x, enemy.y, enemy.visionRange,
              enemy.angle - enemy.visionAngle / 2,
              enemy.angle + enemy.visionAngle / 2);
      ctx.closePath();
      ctx.fill();
    });

    // Draw objectives
    objectives.forEach(obj => {
      if (obj.completed) {
        ctx.fillStyle = "rgba(34, 197, 94, 0.3)";
      } else {
        ctx.fillStyle = obj.type === "intel" ? "rgba(59, 130, 246, 0.5)" :
                        obj.type === "sabotage" ? "rgba(249, 115, 22, 0.5)" :
                        "rgba(168, 85, 247, 0.5)";
      }
      ctx.beginPath();
      ctx.arc(obj.x, obj.y, 20, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(obj.type.charAt(0).toUpperCase(), obj.x, obj.y + 4);
    });

    // Draw enemies
    enemies.forEach(enemy => {
      ctx.fillStyle = enemy.alertLevel > 50 ? "#ef4444" : enemy.alertLevel > 20 ? "#f59e0b" : "#6366f1";
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, 12, 0, Math.PI * 2);
      ctx.fill();

      // Direction indicator
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(enemy.x, enemy.y);
      ctx.lineTo(enemy.x + Math.cos(enemy.angle) * 20, enemy.y + Math.sin(enemy.angle) * 20);
      ctx.stroke();

      // Alert indicator
      if (enemy.alertLevel > 0) {
        ctx.fillStyle = "#fff";
        ctx.font = "12px sans-serif";
        ctx.fillText(enemy.alertLevel > 50 ? "!" : "?", enemy.x - 3, enemy.y - 20);
      }
    });

    // Draw bullets
    bullets.forEach(bullet => {
      ctx.fillStyle = bullet.owner === "player" ? "#fbbf24" : "#f87171";
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 3, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw player
    ctx.fillStyle = player.stealth ? "#22c55e" : "#86efac";
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_SIZE, 0, Math.PI * 2);
    ctx.fill();

    // Player aim line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.3)";
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(mousePos.x, mousePos.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Crosshair
    ctx.strokeStyle = "rgba(255, 255, 255, 0.5)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(mousePos.x, mousePos.y, 8, 0, Math.PI * 2);
    ctx.moveTo(mousePos.x - 12, mousePos.y);
    ctx.lineTo(mousePos.x + 12, mousePos.y);
    ctx.moveTo(mousePos.x, mousePos.y - 12);
    ctx.lineTo(mousePos.x, mousePos.y + 12);
    ctx.stroke();
  });

  if (gameState === "menu") {
    return (
      <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Eye className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Shadow Ops: Urban Warfare</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Infiltrate enemy territory! Complete objectives while avoiding detection. Stealth is your greatest weapon.
            </p>
            <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
              <p><strong>WASD</strong> - Move</p>
              <p><strong>Shift</strong> - Sneak (reduces detection)</p>
              <p><strong>Click/Space</strong> - Shoot (alerts enemies!)</p>
              <p><strong>Objectives</strong> - Intel & Sabotage, then Extract</p>
            </div>
            <Button onClick={startGame} size="lg" className="w-full" data-testid="button-start-shadowops">
              Begin Mission
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
              {gameState === "won" ? "Mission Complete!" : "Mission Failed!"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xl">Score: {score}</p>
            <p>Levels Completed: {level - 1}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={startGame} data-testid="button-restart-shadowops">New Mission</Button>
              <Button variant="outline" onClick={() => { setGameState("menu"); onClose?.(); }} data-testid="button-menu-shadowops">
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
          HP: {player.health}
        </Badge>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Crosshair className="w-4 h-4 mr-2" />
          Ammo: {player.ammo}
        </Badge>
        <Badge 
          variant={player.detectionLevel > 50 ? "destructive" : player.detectionLevel > 20 ? "outline" : "secondary"} 
          className="text-lg px-4 py-2"
        >
          <Eye className="w-4 h-4 mr-2" />
          Detection: {Math.round(player.detectionLevel)}%
        </Badge>
        {globalAlert && (
          <Badge variant="destructive" className="text-lg px-4 py-2 animate-pulse">
            <AlertTriangle className="w-4 h-4 mr-2" />
            ALERT!
          </Badge>
        )}
        <Badge variant="default" className="text-lg px-4 py-2">
          Level: {level} | Score: {score}
        </Badge>
      </div>
      <div className="absolute top-16 left-4 flex gap-2 z-10">
        {objectives.map((obj, i) => (
          <Badge 
            key={i} 
            variant={obj.completed ? "default" : "outline"}
            className={obj.completed ? "bg-green-600" : ""}
          >
            {obj.type}: {obj.completed ? "Done" : "Active"}
          </Badge>
        ))}
      </div>
      <Button
        variant="destructive"
        size="sm"
        className="absolute top-4 right-4 z-10"
        onClick={() => { setGameState("menu"); onClose?.(); }}
        data-testid="button-quit-shadowops"
      >
        <X className="w-4 h-4 mr-1" /> Abort
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
