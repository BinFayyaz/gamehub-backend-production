import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Crosshair, Shield, Zap, Box, Wrench } from "lucide-react";

const MAP_WIDTH = 900;
const MAP_HEIGHT = 600;
const MECH_SIZE = 25;

interface Mech {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  armor: number;
  energy: number;
  maxEnergy: number;
  speed: number;
  damage: number;
  resources: number;
}

interface Enemy {
  id: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  armor: number;
  speed: number;
  type: "scout" | "heavy" | "artillery";
  lastShot: number;
}

interface Bullet {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  owner: "player" | "enemy";
  damage: number;
}

interface ResourceNode {
  id: string;
  x: number;
  y: number;
  amount: number;
  maxAmount: number;
  type: "energy" | "metal" | "tech";
}

interface Upgrade {
  name: string;
  cost: number;
  stat: "health" | "armor" | "speed" | "damage";
  amount: number;
  level: number;
  maxLevel: number;
}

interface MechArenaProps {
  onClose?: () => void;
}

export function MechArena({ onClose }: MechArenaProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"menu" | "playing" | "upgrading" | "won" | "lost">("menu");
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [mech, setMech] = useState<Mech>({
    x: MAP_WIDTH / 2,
    y: MAP_HEIGHT - 80,
    health: 100,
    maxHealth: 100,
    armor: 10,
    energy: 100,
    maxEnergy: 100,
    speed: 4,
    damage: 20,
    resources: 0,
  });
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [bullets, setBullets] = useState<Bullet[]>([]);
  const [resourceNodes, setResourceNodes] = useState<ResourceNode[]>([]);
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [boosting, setBoosting] = useState(false);
  const [upgrades, setUpgrades] = useState<Upgrade[]>([
    { name: "Hull Plating", cost: 50, stat: "health", amount: 25, level: 0, maxLevel: 5 },
    { name: "Reactive Armor", cost: 40, stat: "armor", amount: 5, level: 0, maxLevel: 5 },
    { name: "Thruster System", cost: 60, stat: "speed", amount: 1, level: 0, maxLevel: 3 },
    { name: "Weapon Systems", cost: 75, stat: "damage", amount: 10, level: 0, maxLevel: 5 },
  ]);

  const animationRef = useRef<number>();

  const spawnEnemies = useCallback((waveNum: number) => {
    const newEnemies: Enemy[] = [];
    const count = 3 + waveNum * 2;

    for (let i = 0; i < count; i++) {
      const type = Math.random() < 0.5 ? "scout" : Math.random() < 0.7 ? "heavy" : "artillery";
      newEnemies.push({
        id: Math.random().toString(),
        x: Math.random() * (MAP_WIDTH - 100) + 50,
        y: Math.random() * 200 + 50,
        health: type === "scout" ? 30 + waveNum * 5 : type === "heavy" ? 80 + waveNum * 10 : 50 + waveNum * 7,
        maxHealth: type === "scout" ? 30 + waveNum * 5 : type === "heavy" ? 80 + waveNum * 10 : 50 + waveNum * 7,
        armor: type === "heavy" ? 15 : type === "artillery" ? 5 : 8,
        speed: type === "scout" ? 3 : type === "heavy" ? 1 : 0.5,
        type,
        lastShot: 0,
      });
    }
    return newEnemies;
  }, []);

  const spawnResources = useCallback(() => {
    const nodes: ResourceNode[] = [];
    const count = 4;
    const types: Array<"energy" | "metal" | "tech"> = ["energy", "metal", "tech"];

    for (let i = 0; i < count; i++) {
      nodes.push({
        id: Math.random().toString(),
        x: Math.random() * (MAP_WIDTH - 100) + 50,
        y: Math.random() * (MAP_HEIGHT - 200) + 100,
        amount: 100,
        maxAmount: 100,
        type: types[Math.floor(Math.random() * types.length)],
      });
    }
    return nodes;
  }, []);

  const startGame = () => {
    setGameState("playing");
    setScore(0);
    setWave(1);
    setBoosting(false);
    setMech({
      x: MAP_WIDTH / 2,
      y: MAP_HEIGHT - 80,
      health: 100,
      maxHealth: 100,
      armor: 10,
      energy: 100,
      maxEnergy: 100,
      speed: 4,
      damage: 20,
      resources: 0,
    });
    setEnemies(spawnEnemies(1));
    setResourceNodes(spawnResources());
    setBullets([]);
    setUpgrades([
      { name: "Hull Plating", cost: 50, stat: "health", amount: 25, level: 0, maxLevel: 5 },
      { name: "Reactive Armor", cost: 40, stat: "armor", amount: 5, level: 0, maxLevel: 5 },
      { name: "Thruster System", cost: 60, stat: "speed", amount: 1, level: 0, maxLevel: 3 },
      { name: "Weapon Systems", cost: 75, stat: "damage", amount: 10, level: 0, maxLevel: 5 },
    ]);
  };

  const shoot = useCallback(() => {
    if (mech.energy < 5) return;

    const angle = Math.atan2(mousePos.y - mech.y, mousePos.x - mech.x);
    setBullets(prev => [...prev, {
      id: Math.random().toString(),
      x: mech.x,
      y: mech.y,
      vx: Math.cos(angle) * 10,
      vy: Math.sin(angle) * 10,
      owner: "player",
      damage: mech.damage,
    }]);
    setMech(prev => ({ ...prev, energy: prev.energy - 5 }));
  }, [mech, mousePos]);

  const purchaseUpgrade = (index: number) => {
    const upgrade = upgrades[index];
    if (mech.resources >= upgrade.cost && upgrade.level < upgrade.maxLevel) {
      setMech(prev => ({
        ...prev,
        resources: prev.resources - upgrade.cost,
        [upgrade.stat]: upgrade.stat === "health" ? prev.maxHealth + upgrade.amount : prev[upgrade.stat] + upgrade.amount,
        maxHealth: upgrade.stat === "health" ? prev.maxHealth + upgrade.amount : prev.maxHealth,
      }));
      setUpgrades(prev => prev.map((u, i) => 
        i === index ? { ...u, level: u.level + 1, cost: Math.floor(u.cost * 1.5) } : u
      ));
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeysPressed(prev => new Set(prev).add(e.key.toLowerCase()));
      
      if (e.key === " " && gameState === "playing") {
        e.preventDefault();
        shoot();
      }
      if (e.key === "shift") {
        setBoosting(true);
      }
      if (e.key === "u" && gameState === "playing" && enemies.length === 0) {
        setGameState("upgrading");
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      setKeysPressed(prev => {
        const next = new Set(prev);
        next.delete(e.key.toLowerCase());
        return next;
      });
      if (e.key === "shift") {
        setBoosting(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [gameState, shoot, enemies.length]);

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

    // Regenerate energy
    setMech(prev => ({
      ...prev,
      energy: Math.min(prev.energy + 0.5, prev.maxEnergy),
    }));

    // Move mech
    setMech(prev => {
      let newX = prev.x;
      let newY = prev.y;
      const speedMod = boosting && prev.energy > 1 ? 2 : 1;
      const speed = prev.speed * speedMod;

      if (keysPressed.has("a") || keysPressed.has("arrowleft")) newX -= speed;
      if (keysPressed.has("d") || keysPressed.has("arrowright")) newX += speed;
      if (keysPressed.has("w") || keysPressed.has("arrowup")) newY -= speed;
      if (keysPressed.has("s") || keysPressed.has("arrowdown")) newY += speed;

      newX = Math.max(MECH_SIZE, Math.min(MAP_WIDTH - MECH_SIZE, newX));
      newY = Math.max(MECH_SIZE, Math.min(MAP_HEIGHT - MECH_SIZE, newY));

      // Drain energy when boosting
      const energyDrain = boosting ? 1 : 0;

      return { ...prev, x: newX, y: newY, energy: Math.max(0, prev.energy - energyDrain) };
    });

    // Collect resources
    setResourceNodes(prev => prev.map(node => {
      const dist = Math.hypot(node.x - mech.x, node.y - mech.y);
      if (dist < 40 && node.amount > 0) {
        const collect = Math.min(2, node.amount);
        setMech(m => ({ ...m, resources: m.resources + collect }));
        return { ...node, amount: node.amount - collect };
      }
      return node;
    }).filter(node => node.amount > 0));

    // Enemy AI
    setEnemies(prev => prev.map(enemy => {
      const dx = mech.x - enemy.x;
      const dy = mech.y - enemy.y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      let newX = enemy.x;
      let newY = enemy.y;

      if (enemy.type === "scout") {
        // Scouts chase aggressively
        newX += Math.cos(angle) * enemy.speed;
        newY += Math.sin(angle) * enemy.speed;
      } else if (enemy.type === "heavy") {
        // Heavy mechs advance slowly
        if (dist > 150) {
          newX += Math.cos(angle) * enemy.speed;
          newY += Math.sin(angle) * enemy.speed;
        }
      }
      // Artillery stays put

      // Enemy shooting
      const fireRate = enemy.type === "scout" ? 1500 : enemy.type === "heavy" ? 2000 : 3000;
      const range = enemy.type === "artillery" ? 500 : 250;

      if (now - enemy.lastShot > fireRate && dist < range) {
        const bulletSpeed = enemy.type === "artillery" ? 8 : 5;
        setBullets(b => [...b, {
          id: Math.random().toString(),
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle) * bulletSpeed,
          vy: Math.sin(angle) * bulletSpeed,
          owner: "enemy",
          damage: enemy.type === "artillery" ? 25 : enemy.type === "heavy" ? 15 : 10,
        }]);
        return { ...enemy, x: newX, y: newY, lastShot: now };
      }

      return { ...enemy, x: newX, y: newY };
    }));

    // Move bullets
    setBullets(prev => {
      const newBullets = prev.map(b => ({
        ...b,
        x: b.x + b.vx,
        y: b.y + b.vy,
      })).filter(b => b.x > 0 && b.x < MAP_WIDTH && b.y > 0 && b.y < MAP_HEIGHT);

      // Check collisions
      newBullets.forEach(bullet => {
        if (bullet.owner === "player") {
          setEnemies(enemies => enemies.map(e => {
            if (Math.hypot(e.x - bullet.x, e.y - bullet.y) < 20) {
              bullet.x = -100;
              const actualDamage = Math.max(bullet.damage - e.armor, 5);
              if (e.health - actualDamage <= 0) {
                const reward = e.type === "heavy" ? 30 : e.type === "artillery" ? 25 : 15;
                setMech(m => ({ ...m, resources: m.resources + reward }));
                setScore(s => s + reward * 2);
              }
              return { ...e, health: e.health - actualDamage };
            }
            return e;
          }));
        } else {
          setMech(m => {
            if (Math.hypot(m.x - bullet.x, m.y - bullet.y) < MECH_SIZE) {
              bullet.x = -100;
              const actualDamage = Math.max(bullet.damage - m.armor, 3);
              return { ...m, health: m.health - actualDamage };
            }
            return m;
          });
        }
      });

      return newBullets.filter(b => b.x > 0);
    });

    // Remove dead enemies
    setEnemies(prev => prev.filter(e => e.health > 0));

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, keysPressed, mech, boosting]);

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
      if (mech.health <= 0) {
        setGameState("lost");
      } else if (enemies.length === 0 && wave < 10) {
        // Allow time to collect resources before next wave
        setTimeout(() => {
          setWave(w => w + 1);
          setEnemies(spawnEnemies(wave + 1));
          setResourceNodes(spawnResources());
          setMech(m => ({ ...m, health: Math.min(m.health + 20, m.maxHealth) }));
        }, 3000);
      } else if (enemies.length === 0 && wave >= 10) {
        setGameState("won");
      }
    }
  }, [mech.health, enemies.length, gameState, wave, spawnEnemies, spawnResources]);

  // Render
  useEffect(() => {
    if (!canvasRef.current || (gameState !== "playing" && gameState !== "upgrading")) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Background - industrial arena
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Grid pattern
    ctx.strokeStyle = "#2a2a2a";
    ctx.lineWidth = 1;
    for (let x = 0; x < MAP_WIDTH; x += 50) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, MAP_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < MAP_HEIGHT; y += 50) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(MAP_WIDTH, y);
      ctx.stroke();
    }

    // Draw resource nodes
    resourceNodes.forEach(node => {
      const color = node.type === "energy" ? "#fbbf24" : node.type === "metal" ? "#94a3b8" : "#22d3ee";
      ctx.fillStyle = color + "40";
      ctx.beginPath();
      ctx.arc(node.x, node.y, 30, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(node.x, node.y, 10, 0, Math.PI * 2);
      ctx.fill();

      // Resource amount indicator
      ctx.fillStyle = "#fff";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(Math.round(node.amount).toString(), node.x, node.y + 4);
    });

    // Draw enemies
    enemies.forEach(enemy => {
      const color = enemy.type === "scout" ? "#f87171" : enemy.type === "heavy" ? "#ef4444" : "#dc2626";
      
      ctx.fillStyle = color;
      ctx.beginPath();
      if (enemy.type === "heavy") {
        ctx.rect(enemy.x - 18, enemy.y - 18, 36, 36);
      } else if (enemy.type === "artillery") {
        ctx.moveTo(enemy.x, enemy.y - 20);
        ctx.lineTo(enemy.x + 20, enemy.y + 15);
        ctx.lineTo(enemy.x - 20, enemy.y + 15);
        ctx.closePath();
      } else {
        ctx.arc(enemy.x, enemy.y, 12, 0, Math.PI * 2);
      }
      ctx.fill();

      // Health bar
      const hpPct = enemy.health / enemy.maxHealth;
      ctx.fillStyle = "#333";
      ctx.fillRect(enemy.x - 15, enemy.y - 28, 30, 5);
      ctx.fillStyle = "#ef4444";
      ctx.fillRect(enemy.x - 15, enemy.y - 28, 30 * hpPct, 5);

      // Type indicator
      ctx.fillStyle = "#fff";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      const typeChar = enemy.type === "scout" ? "S" : enemy.type === "heavy" ? "H" : "A";
      ctx.fillText(typeChar, enemy.x, enemy.y + 4);
    });

    // Draw bullets
    bullets.forEach(bullet => {
      ctx.fillStyle = bullet.owner === "player" ? "#22c55e" : "#f87171";
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, bullet.owner === "player" ? 5 : 4, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw player mech
    ctx.fillStyle = boosting && mech.energy > 0 ? "#4ade80" : "#22c55e";
    ctx.beginPath();
    ctx.arc(mech.x, mech.y, MECH_SIZE, 0, Math.PI * 2);
    ctx.fill();

    // Mech detail
    ctx.fillStyle = "#166534";
    ctx.beginPath();
    ctx.arc(mech.x, mech.y, MECH_SIZE - 8, 0, Math.PI * 2);
    ctx.fill();

    // Aim direction
    const aimAngle = Math.atan2(mousePos.y - mech.y, mousePos.x - mech.x);
    ctx.strokeStyle = "#86efac";
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(mech.x, mech.y);
    ctx.lineTo(mech.x + Math.cos(aimAngle) * 35, mech.y + Math.sin(aimAngle) * 35);
    ctx.stroke();

    // Boost effect
    if (boosting && mech.energy > 0) {
      ctx.fillStyle = "rgba(74, 222, 128, 0.3)";
      ctx.beginPath();
      ctx.arc(mech.x, mech.y, MECH_SIZE + 10, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crosshair
    ctx.strokeStyle = "#22c55e";
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
              <Box className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Mech Arena: Resource Wars</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Pilot your mech in brutal arena combat! Collect resources, upgrade your systems, and dominate the battlefield.
            </p>
            <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
              <p><strong>WASD</strong> - Move</p>
              <p><strong>Shift</strong> - Boost (uses energy)</p>
              <p><strong>Click/Space</strong> - Shoot</p>
              <p><strong>U</strong> - Upgrade menu (between waves)</p>
            </div>
            <Button onClick={startGame} size="lg" className="w-full" data-testid="button-start-mech">
              Deploy Mech
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === "upgrading") {
    return (
      <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl flex items-center justify-center gap-2">
              <Wrench className="w-6 h-6" /> Mech Upgrades
            </CardTitle>
            <p className="text-muted-foreground">Resources: {mech.resources}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            {upgrades.map((upgrade, i) => (
              <div key={upgrade.name} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-semibold">{upgrade.name}</p>
                  <p className="text-sm text-muted-foreground">
                    Level {upgrade.level}/{upgrade.maxLevel} | +{upgrade.amount} {upgrade.stat}
                  </p>
                </div>
                <Button
                  onClick={() => purchaseUpgrade(i)}
                  disabled={mech.resources < upgrade.cost || upgrade.level >= upgrade.maxLevel}
                  size="sm"
                  data-testid={`button-upgrade-${i}`}
                >
                  {upgrade.level >= upgrade.maxLevel ? "MAX" : `${upgrade.cost} R`}
                </Button>
              </div>
            ))}
            <Button 
              onClick={() => setGameState("playing")} 
              className="w-full"
              data-testid="button-continue-wave"
            >
              Continue to Wave {wave}
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
              {gameState === "won" ? "Arena Champion!" : "Mech Destroyed!"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xl">Score: {score}</p>
            <p>Waves Survived: {wave}</p>
            <p>Total Resources Collected: {mech.resources}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={startGame} data-testid="button-restart-mech">Play Again</Button>
              <Button variant="outline" onClick={() => { setGameState("menu"); onClose?.(); }} data-testid="button-menu-mech">
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
          HP: {Math.round(mech.health)}/{mech.maxHealth}
        </Badge>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Zap className="w-4 h-4 mr-2" />
          Energy: {Math.round(mech.energy)}
        </Badge>
        <Badge variant="secondary" className="text-lg px-4 py-2">
          <Box className="w-4 h-4 mr-2" />
          Resources: {mech.resources}
        </Badge>
        <Badge variant="default" className="text-lg px-4 py-2">
          Wave: {wave}/10 | Score: {score}
        </Badge>
      </div>
      {enemies.length === 0 && (
        <div className="absolute top-16 left-4 z-10">
          <Badge variant="outline" className="text-lg px-4 py-2 animate-pulse">
            Wave Clear! Press U to upgrade or wait for next wave...
          </Badge>
        </div>
      )}
      <Button
        variant="destructive"
        size="sm"
        className="absolute top-4 right-4 z-10"
        onClick={() => { setGameState("menu"); onClose?.(); }}
        data-testid="button-quit-mech"
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
