import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Flame, Droplets, Wind, Mountain, Shield, Zap } from "lucide-react";

const MAP_WIDTH = 800;
const MAP_HEIGHT = 600;
const PLAYER_SIZE = 18;

type Element = "fire" | "water" | "earth" | "air";

interface Player {
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  mana: number;
  maxMana: number;
  element: Element;
}

interface Enemy {
  id: string;
  x: number;
  y: number;
  health: number;
  maxHealth: number;
  element: Element;
  speed: number;
  lastAttack: number;
}

interface Projectile {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  element: Element;
  owner: "player" | "enemy";
  size: number;
}

interface AreaEffect {
  id: string;
  x: number;
  y: number;
  radius: number;
  element: Element;
  duration: number;
  created: number;
}

interface ElementalConquestProps {
  onClose?: () => void;
}

const ELEMENT_COLORS: Record<Element, string> = {
  fire: "#ef4444",
  water: "#3b82f6",
  earth: "#84cc16",
  air: "#a855f7",
};

const ELEMENT_WEAKNESS: Record<Element, Element> = {
  fire: "water",
  water: "earth",
  earth: "air",
  air: "fire",
};

export function ElementalConquest({ onClose }: ElementalConquestProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"menu" | "playing" | "won" | "lost">("menu");
  const [score, setScore] = useState(0);
  const [wave, setWave] = useState(1);
  const [player, setPlayer] = useState<Player>({
    x: MAP_WIDTH / 2,
    y: MAP_HEIGHT - 80,
    health: 100,
    maxHealth: 100,
    mana: 100,
    maxMana: 100,
    element: "fire",
  });
  const [enemies, setEnemies] = useState<Enemy[]>([]);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [areaEffects, setAreaEffects] = useState<AreaEffect[]>([]);
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [comboElement, setComboElement] = useState<Element | null>(null);

  const animationRef = useRef<number>();

  const spawnEnemies = useCallback((waveNum: number) => {
    const elements: Element[] = ["fire", "water", "earth", "air"];
    const newEnemies: Enemy[] = [];
    const count = 4 + waveNum * 2;

    for (let i = 0; i < count; i++) {
      newEnemies.push({
        id: Math.random().toString(),
        x: Math.random() * (MAP_WIDTH - 100) + 50,
        y: Math.random() * 200 + 50,
        health: 40 + waveNum * 10,
        maxHealth: 40 + waveNum * 10,
        element: elements[Math.floor(Math.random() * elements.length)],
        speed: 1 + waveNum * 0.1,
        lastAttack: 0,
      });
    }
    return newEnemies;
  }, []);

  const startGame = () => {
    setGameState("playing");
    setScore(0);
    setWave(1);
    setComboElement(null);
    setPlayer({
      x: MAP_WIDTH / 2,
      y: MAP_HEIGHT - 80,
      health: 100,
      maxHealth: 100,
      mana: 100,
      maxMana: 100,
      element: "fire",
    });
    setEnemies(spawnEnemies(1));
    setProjectiles([]);
    setAreaEffects([]);
  };

  const castSpell = useCallback((targetX: number, targetY: number, special: boolean = false) => {
    const manaCost = special ? 30 : 10;
    if (player.mana < manaCost) return;

    const angle = Math.atan2(targetY - player.y, targetX - player.x);
    const speed = special ? 4 : 8;

    if (special) {
      // Create area effect spell
      setAreaEffects(prev => [...prev, {
        id: Math.random().toString(),
        x: targetX,
        y: targetY,
        radius: player.element === "earth" ? 80 : 60,
        element: player.element,
        duration: player.element === "earth" ? 5000 : 3000,
        created: Date.now(),
      }]);
    } else {
      // Regular projectile
      setProjectiles(prev => [...prev, {
        id: Math.random().toString(),
        x: player.x,
        y: player.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        element: player.element,
        owner: "player",
        size: 10,
      }]);
    }

    setPlayer(prev => ({ ...prev, mana: prev.mana - manaCost }));

    // Check for combo
    if (comboElement && comboElement !== player.element) {
      // Combo attack!
      const comboX = player.x + Math.cos(angle) * 100;
      const comboY = player.y + Math.sin(angle) * 100;
      setAreaEffects(prev => [...prev, {
        id: Math.random().toString(),
        x: comboX,
        y: comboY,
        radius: 100,
        element: player.element,
        duration: 2000,
        created: Date.now(),
      }]);
      setComboElement(null);
    } else {
      setComboElement(player.element);
      setTimeout(() => setComboElement(null), 2000);
    }
  }, [player, comboElement]);

  const switchElement = useCallback((element: Element) => {
    setPlayer(prev => ({ ...prev, element }));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeysPressed(prev => new Set(prev).add(e.key.toLowerCase()));
      
      if (e.key === "1") switchElement("fire");
      if (e.key === "2") switchElement("water");
      if (e.key === "3") switchElement("earth");
      if (e.key === "4") switchElement("air");
      if (e.key === " " && gameState === "playing") {
        e.preventDefault();
        castSpell(mousePos.x, mousePos.y);
      }
      if (e.key === "e" && gameState === "playing") {
        castSpell(mousePos.x, mousePos.y, true);
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
  }, [gameState, castSpell, switchElement, mousePos]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (gameState === "playing") {
      castSpell(mousePos.x, mousePos.y, e.shiftKey);
    }
  }, [gameState, castSpell, mousePos]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, []);

  const gameLoop = useCallback(() => {
    if (gameState !== "playing") return;
    const now = Date.now();

    // Regenerate mana
    setPlayer(prev => ({
      ...prev,
      mana: Math.min(prev.mana + 0.3, prev.maxMana),
    }));

    // Move player
    setPlayer(prev => {
      let newX = prev.x;
      let newY = prev.y;
      const speed = 4;
      if (keysPressed.has("a") || keysPressed.has("arrowleft")) newX -= speed;
      if (keysPressed.has("d") || keysPressed.has("arrowright")) newX += speed;
      if (keysPressed.has("w") || keysPressed.has("arrowup")) newY -= speed;
      if (keysPressed.has("s") || keysPressed.has("arrowdown")) newY += speed;
      newX = Math.max(PLAYER_SIZE, Math.min(MAP_WIDTH - PLAYER_SIZE, newX));
      newY = Math.max(PLAYER_SIZE, Math.min(MAP_HEIGHT - PLAYER_SIZE, newY));
      return { ...prev, x: newX, y: newY };
    });

    // Enemy AI
    setEnemies(prev => prev.map(enemy => {
      const dx = player.x - enemy.x;
      const dy = player.y - enemy.y;
      const dist = Math.hypot(dx, dy);
      const angle = Math.atan2(dy, dx);

      let newX = enemy.x;
      let newY = enemy.y;

      // Move towards player
      if (dist > 150) {
        newX += Math.cos(angle) * enemy.speed;
        newY += Math.sin(angle) * enemy.speed;
      } else if (dist < 100) {
        newX -= Math.cos(angle) * enemy.speed * 0.5;
        newY -= Math.sin(angle) * enemy.speed * 0.5;
      }

      // Enemy attacks
      if (now - enemy.lastAttack > 2000 && dist < 300) {
        setProjectiles(p => [...p, {
          id: Math.random().toString(),
          x: enemy.x,
          y: enemy.y,
          vx: Math.cos(angle) * 5,
          vy: Math.sin(angle) * 5,
          element: enemy.element,
          owner: "enemy",
          size: 8,
        }]);
        return { ...enemy, x: newX, y: newY, lastAttack: now };
      }

      return { ...enemy, x: newX, y: newY };
    }));

    // Move projectiles
    setProjectiles(prev => {
      const newProjectiles = prev.map(p => ({
        ...p,
        x: p.x + p.vx,
        y: p.y + p.vy,
      })).filter(p => p.x > 0 && p.x < MAP_WIDTH && p.y > 0 && p.y < MAP_HEIGHT);

      // Check collisions
      newProjectiles.forEach(proj => {
        if (proj.owner === "player") {
          setEnemies(enemies => enemies.map(e => {
            if (Math.hypot(e.x - proj.x, e.y - proj.y) < 20) {
              proj.x = -100;
              // Elemental damage multiplier
              const isWeak = ELEMENT_WEAKNESS[e.element] === proj.element;
              const isStrong = ELEMENT_WEAKNESS[proj.element] === e.element;
              const damage = isWeak ? 30 : isStrong ? 10 : 20;
              
              if (e.health - damage <= 0) {
                setScore(s => s + (isWeak ? 75 : 50));
              }
              return { ...e, health: e.health - damage };
            }
            return e;
          }));
        } else {
          setPlayer(p => {
            if (Math.hypot(p.x - proj.x, p.y - proj.y) < PLAYER_SIZE) {
              proj.x = -100;
              const isWeak = ELEMENT_WEAKNESS[p.element] === proj.element;
              const isStrong = ELEMENT_WEAKNESS[proj.element] === p.element;
              const damage = isWeak ? 20 : isStrong ? 8 : 12;
              return { ...p, health: p.health - damage };
            }
            return p;
          });
        }
      });

      return newProjectiles.filter(p => p.x > 0);
    });

    // Update area effects
    setAreaEffects(prev => {
      const active = prev.filter(ae => now - ae.created < ae.duration);
      
      // Apply area effect damage
      active.forEach(ae => {
        setEnemies(enemies => enemies.map(e => {
          if (Math.hypot(e.x - ae.x, e.y - ae.y) < ae.radius) {
            const isWeak = ELEMENT_WEAKNESS[e.element] === ae.element;
            const damage = isWeak ? 1 : 0.5;
            return { ...e, health: e.health - damage };
          }
          return e;
        }));
      });

      return active;
    });

    // Remove dead enemies
    setEnemies(prev => prev.filter(e => e.health > 0));

    animationRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, keysPressed, player]);

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
      } else if (enemies.length === 0) {
        setWave(w => w + 1);
        setEnemies(spawnEnemies(wave + 1));
        setPlayer(p => ({
          ...p,
          health: Math.min(p.health + 30, p.maxHealth),
        }));
        setScore(s => s + wave * 150);
      }
    }
  }, [player.health, enemies.length, gameState, wave, spawnEnemies]);

  // Render
  useEffect(() => {
    if (!canvasRef.current || gameState !== "playing") return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    // Background
    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

    // Draw area effects
    areaEffects.forEach(ae => {
      const elapsed = Date.now() - ae.created;
      const alpha = 1 - elapsed / ae.duration;
      ctx.fillStyle = ELEMENT_COLORS[ae.element] + Math.floor(alpha * 50).toString(16).padStart(2, "0");
      ctx.beginPath();
      ctx.arc(ae.x, ae.y, ae.radius, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = ELEMENT_COLORS[ae.element];
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Draw enemies
    enemies.forEach(enemy => {
      // Enemy body
      ctx.fillStyle = ELEMENT_COLORS[enemy.element];
      ctx.beginPath();
      ctx.arc(enemy.x, enemy.y, 15, 0, Math.PI * 2);
      ctx.fill();

      // Element indicator
      ctx.fillStyle = "#fff";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      const symbol = enemy.element === "fire" ? "F" : enemy.element === "water" ? "W" : enemy.element === "earth" ? "E" : "A";
      ctx.fillText(symbol, enemy.x, enemy.y + 4);

      // Health bar
      const hpPct = enemy.health / enemy.maxHealth;
      ctx.fillStyle = "#333";
      ctx.fillRect(enemy.x - 15, enemy.y - 25, 30, 5);
      ctx.fillStyle = ELEMENT_COLORS[enemy.element];
      ctx.fillRect(enemy.x - 15, enemy.y - 25, 30 * hpPct, 5);
    });

    // Draw projectiles
    projectiles.forEach(proj => {
      ctx.fillStyle = ELEMENT_COLORS[proj.element];
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, proj.size, 0, Math.PI * 2);
      ctx.fill();

      // Trail effect
      ctx.fillStyle = ELEMENT_COLORS[proj.element] + "40";
      ctx.beginPath();
      ctx.arc(proj.x - proj.vx * 2, proj.y - proj.vy * 2, proj.size * 0.7, 0, Math.PI * 2);
      ctx.fill();
    });

    // Draw player
    ctx.fillStyle = ELEMENT_COLORS[player.element];
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_SIZE, 0, Math.PI * 2);
    ctx.fill();

    // Player glow
    ctx.strokeStyle = ELEMENT_COLORS[player.element];
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(player.x, player.y, PLAYER_SIZE + 5, 0, Math.PI * 2);
    ctx.stroke();

    // Aim line
    ctx.strokeStyle = ELEMENT_COLORS[player.element] + "80";
    ctx.lineWidth = 2;
    ctx.setLineDash([5, 5]);
    ctx.beginPath();
    ctx.moveTo(player.x, player.y);
    ctx.lineTo(mousePos.x, mousePos.y);
    ctx.stroke();
    ctx.setLineDash([]);

    // Combo indicator
    if (comboElement) {
      ctx.fillStyle = ELEMENT_COLORS[comboElement] + "60";
      ctx.beginPath();
      ctx.arc(player.x, player.y, PLAYER_SIZE + 15, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crosshair
    ctx.strokeStyle = ELEMENT_COLORS[player.element];
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(mousePos.x, mousePos.y, 12, 0, Math.PI * 2);
    ctx.moveTo(mousePos.x - 18, mousePos.y);
    ctx.lineTo(mousePos.x + 18, mousePos.y);
    ctx.moveTo(mousePos.x, mousePos.y - 18);
    ctx.lineTo(mousePos.x, mousePos.y + 18);
    ctx.stroke();
  });

  const ElementIcon = ({ element }: { element: Element }) => {
    switch (element) {
      case "fire": return <Flame className="w-4 h-4" />;
      case "water": return <Droplets className="w-4 h-4" />;
      case "earth": return <Mountain className="w-4 h-4" />;
      case "air": return <Wind className="w-4 h-4" />;
    }
  };

  if (gameState === "menu") {
    return (
      <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
              <Zap className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">Elemental Conquest</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-muted-foreground">
              Master the four elements! Exploit elemental weaknesses and combine attacks for devastating combos.
            </p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 p-2 bg-red-500/20 rounded">
                <Flame className="w-4 h-4 text-red-500" /> Fire beats Air
              </div>
              <div className="flex items-center gap-2 p-2 bg-blue-500/20 rounded">
                <Droplets className="w-4 h-4 text-blue-500" /> Water beats Fire
              </div>
              <div className="flex items-center gap-2 p-2 bg-green-500/20 rounded">
                <Mountain className="w-4 h-4 text-green-500" /> Earth beats Water
              </div>
              <div className="flex items-center gap-2 p-2 bg-purple-500/20 rounded">
                <Wind className="w-4 h-4 text-purple-500" /> Air beats Earth
              </div>
            </div>
            <div className="bg-muted p-3 rounded-lg text-sm space-y-1">
              <p><strong>WASD</strong> - Move</p>
              <p><strong>1-4</strong> - Switch Element</p>
              <p><strong>Click/Space</strong> - Cast Spell</p>
              <p><strong>E/Shift+Click</strong> - Area Spell (30 mana)</p>
            </div>
            <Button onClick={startGame} size="lg" className="w-full" data-testid="button-start-elemental">
              Begin Conquest
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
              {gameState === "won" ? "Elemental Master!" : "Elements Overwhelm!"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xl">Score: {score}</p>
            <p>Waves Conquered: {wave - 1}</p>
            <div className="flex gap-4 justify-center">
              <Button onClick={startGame} data-testid="button-restart-elemental">Play Again</Button>
              <Button variant="outline" onClick={() => { setGameState("menu"); onClose?.(); }} data-testid="button-menu-elemental">
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
          <Zap className="w-4 h-4 mr-2" />
          Mana: {Math.round(player.mana)}
        </Badge>
        <Badge 
          variant="default" 
          className="text-lg px-4 py-2"
          style={{ backgroundColor: ELEMENT_COLORS[player.element] }}
        >
          <ElementIcon element={player.element} />
          <span className="ml-2 capitalize">{player.element}</span>
        </Badge>
        <Badge variant="default" className="text-lg px-4 py-2">
          Wave: {wave} | Score: {score}
        </Badge>
      </div>
      <div className="absolute top-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
        {(["fire", "water", "earth", "air"] as Element[]).map((el, i) => (
          <Button
            key={el}
            variant={player.element === el ? "default" : "outline"}
            size="sm"
            onClick={() => switchElement(el)}
            style={{ borderColor: ELEMENT_COLORS[el], color: player.element === el ? "#fff" : ELEMENT_COLORS[el] }}
            data-testid={`button-element-${el}`}
          >
            <ElementIcon element={el} />
            <span className="ml-1">{i + 1}</span>
          </Button>
        ))}
      </div>
      <Button
        variant="destructive"
        size="sm"
        className="absolute top-4 right-4 z-10"
        onClick={() => { setGameState("menu"); onClose?.(); }}
        data-testid="button-quit-elemental"
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
