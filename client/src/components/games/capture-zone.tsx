import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { X, Flag, Users, Trophy, Swords, Shield, Clock } from "lucide-react";

const MAP_WIDTH = 800;
const MAP_HEIGHT = 600;
const PLAYER_SIZE = 15;
const PLAYER_SPEED = 4;
const AI_SPEED = 2.5;
const ZONE_SIZE = 80;

interface Unit {
  id: string;
  x: number;
  y: number;
  team: "red" | "blue";
  health: number;
  maxHealth: number;
  isPlayer?: boolean;
  targetX: number | null;
  targetY: number | null;
  lastAttack: number;
}

interface Zone {
  id: string;
  x: number;
  y: number;
  controlledBy: "red" | "blue" | "neutral";
  captureProgress: number;
}

interface CaptureZoneProps {
  onClose?: () => void;
}

export function CaptureZone({ onClose }: CaptureZoneProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameover">("menu");
  const [playerTeam, setPlayerTeam] = useState<"red" | "blue">("blue");
  const [units, setUnits] = useState<Unit[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [scores, setScores] = useState({ red: 0, blue: 0 });
  const [timeLeft, setTimeLeft] = useState(180);
  const [winner, setWinner] = useState<"red" | "blue" | null>(null);
  const keysPressed = useRef<Set<string>>(new Set());

  const initGame = useCallback(() => {
    const initialZones: Zone[] = [
      { id: "zone-1", x: MAP_WIDTH / 2, y: MAP_HEIGHT / 4, controlledBy: "neutral", captureProgress: 0 },
      { id: "zone-2", x: MAP_WIDTH / 4, y: MAP_HEIGHT / 2, controlledBy: "neutral", captureProgress: 0 },
      { id: "zone-3", x: (MAP_WIDTH * 3) / 4, y: MAP_HEIGHT / 2, controlledBy: "neutral", captureProgress: 0 },
      { id: "zone-4", x: MAP_WIDTH / 2, y: (MAP_HEIGHT * 3) / 4, controlledBy: "neutral", captureProgress: 0 },
      { id: "zone-center", x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2, controlledBy: "neutral", captureProgress: 0 },
    ];

    const initialUnits: Unit[] = [
      { id: "player", x: playerTeam === "blue" ? 100 : MAP_WIDTH - 100, y: MAP_HEIGHT / 2, team: playerTeam, health: 100, maxHealth: 100, isPlayer: true, targetX: null, targetY: null, lastAttack: 0 },
    ];

    for (let i = 0; i < 4; i++) {
      initialUnits.push({
        id: `blue-${i}`,
        x: 80 + Math.random() * 60,
        y: 100 + i * 100,
        team: "blue",
        health: 80,
        maxHealth: 80,
        targetX: null,
        targetY: null,
        lastAttack: 0,
      });
      initialUnits.push({
        id: `red-${i}`,
        x: MAP_WIDTH - 80 - Math.random() * 60,
        y: 100 + i * 100,
        team: "red",
        health: 80,
        maxHealth: 80,
        targetX: null,
        targetY: null,
        lastAttack: 0,
      });
    }

    setZones(initialZones);
    setUnits(initialUnits);
    setScores({ red: 0, blue: 0 });
    setTimeLeft(180);
    setWinner(null);
  }, [playerTeam]);

  const startGame = () => {
    setGameState("playing");
    initGame();
  };

  useEffect(() => {
    if (gameState !== "playing") return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setGameState("gameover");
          setWinner(scores.red > scores.blue ? "red" : scores.blue > scores.red ? "blue" : null);
          return 0;
        }
        return prev - 1;
      });

      setScores((prev) => {
        const redZones = zones.filter((z) => z.controlledBy === "red").length;
        const blueZones = zones.filter((z) => z.controlledBy === "blue").length;
        return {
          red: prev.red + redZones * 2,
          blue: prev.blue + blueZones * 2,
        };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameState, zones, scores]);

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

      setUnits((prevUnits) => {
        return prevUnits.map((unit) => {
          if (unit.health <= 0) return unit;

          let newX = unit.x;
          let newY = unit.y;
          let newTargetX = unit.targetX;
          let newTargetY = unit.targetY;

          if (unit.isPlayer) {
            let dx = 0;
            let dy = 0;
            if (keysPressed.current.has("w") || keysPressed.current.has("arrowup")) dy -= PLAYER_SPEED;
            if (keysPressed.current.has("s") || keysPressed.current.has("arrowdown")) dy += PLAYER_SPEED;
            if (keysPressed.current.has("a") || keysPressed.current.has("arrowleft")) dx -= PLAYER_SPEED;
            if (keysPressed.current.has("d") || keysPressed.current.has("arrowright")) dx += PLAYER_SPEED;
            newX = Math.max(PLAYER_SIZE, Math.min(MAP_WIDTH - PLAYER_SIZE, unit.x + dx));
            newY = Math.max(PLAYER_SIZE, Math.min(MAP_HEIGHT - PLAYER_SIZE, unit.y + dy));
          } else {
            if (!unit.targetX || !unit.targetY || Math.random() < 0.02) {
              const uncontrolledZones = zones.filter((z) => z.controlledBy !== unit.team);
              if (uncontrolledZones.length > 0) {
                const targetZone = uncontrolledZones[Math.floor(Math.random() * uncontrolledZones.length)];
                newTargetX = targetZone.x + (Math.random() - 0.5) * 40;
                newTargetY = targetZone.y + (Math.random() - 0.5) * 40;
              }
            }

            if (newTargetX && newTargetY) {
              const dx = newTargetX - unit.x;
              const dy = newTargetY - unit.y;
              const dist = Math.hypot(dx, dy);
              if (dist > 5) {
                newX = unit.x + (dx / dist) * AI_SPEED;
                newY = unit.y + (dy / dist) * AI_SPEED;
              }
            }
          }

          const nearbyEnemy = prevUnits.find(
            (u) =>
              u.id !== unit.id &&
              u.team !== unit.team &&
              u.health > 0 &&
              Math.hypot(u.x - unit.x, u.y - unit.y) < 50
          );

          let newHealth = unit.health;
          let newLastAttack = unit.lastAttack;

          if (nearbyEnemy && now - unit.lastAttack > 1000) {
            newLastAttack = now;
          }

          return {
            ...unit,
            x: newX,
            y: newY,
            targetX: newTargetX,
            targetY: newTargetY,
            health: newHealth,
            lastAttack: newLastAttack,
          };
        });
      });

      setUnits((prevUnits) => {
        return prevUnits.map((unit) => {
          if (unit.health <= 0) return unit;

          const attackers = prevUnits.filter(
            (u) =>
              u.id !== unit.id &&
              u.team !== unit.team &&
              u.health > 0 &&
              Math.hypot(u.x - unit.x, u.y - unit.y) < 50 &&
              now - u.lastAttack < 100
          );

          const damage = attackers.length * 5;
          return { ...unit, health: Math.max(0, unit.health - damage) };
        });
      });

      setZones((prevZones) => {
        return prevZones.map((zone) => {
          const unitsInZone = units.filter(
            (u) => u.health > 0 && Math.hypot(u.x - zone.x, u.y - zone.y) < ZONE_SIZE
          );
          const redCount = unitsInZone.filter((u) => u.team === "red").length;
          const blueCount = unitsInZone.filter((u) => u.team === "blue").length;

          let newProgress = zone.captureProgress;
          let newController = zone.controlledBy;

          if (redCount > blueCount) {
            if (zone.controlledBy === "red") {
              newProgress = Math.min(100, zone.captureProgress + 2);
            } else {
              newProgress = zone.captureProgress - 3;
              if (newProgress <= 0) {
                newController = "neutral";
                newProgress = 0;
              }
            }
            if (newController === "neutral" && redCount > 0) {
              newProgress += 2;
              if (newProgress >= 100) {
                newController = "red";
                newProgress = 100;
              }
            }
          } else if (blueCount > redCount) {
            if (zone.controlledBy === "blue") {
              newProgress = Math.min(100, zone.captureProgress + 2);
            } else {
              newProgress = zone.captureProgress - 3;
              if (newProgress <= 0) {
                newController = "neutral";
                newProgress = 0;
              }
            }
            if (newController === "neutral" && blueCount > 0) {
              newProgress += 2;
              if (newProgress >= 100) {
                newController = "blue";
                newProgress = 100;
              }
            }
          }

          return { ...zone, captureProgress: Math.max(0, Math.min(100, newProgress)), controlledBy: newController };
        });
      });

      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#1a2e1a";
      ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

      zones.forEach((zone) => {
        const color =
          zone.controlledBy === "red"
            ? "rgba(239, 68, 68, 0.3)"
            : zone.controlledBy === "blue"
              ? "rgba(59, 130, 246, 0.3)"
              : "rgba(156, 163, 175, 0.2)";
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, ZONE_SIZE, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle =
          zone.controlledBy === "red"
            ? "#ef4444"
            : zone.controlledBy === "blue"
              ? "#3b82f6"
              : "#9ca3af";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(zone.x, zone.y, ZONE_SIZE, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "#fff";
        ctx.font = "12px Arial";
        ctx.textAlign = "center";
        ctx.fillText(`${Math.round(zone.captureProgress)}%`, zone.x, zone.y + 4);
      });

      units.forEach((unit) => {
        if (unit.health <= 0) return;

        ctx.fillStyle = unit.team === "red" ? "#ef4444" : "#3b82f6";
        ctx.beginPath();
        ctx.arc(unit.x, unit.y, unit.isPlayer ? PLAYER_SIZE : 12, 0, Math.PI * 2);
        ctx.fill();

        if (unit.isPlayer) {
          ctx.strokeStyle = "#fbbf24";
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.arc(unit.x, unit.y, PLAYER_SIZE + 4, 0, Math.PI * 2);
          ctx.stroke();
        }

        const hpWidth = 24;
        ctx.fillStyle = "#dc2626";
        ctx.fillRect(unit.x - hpWidth / 2, unit.y - 22, hpWidth, 4);
        ctx.fillStyle = "#22c55e";
        ctx.fillRect(unit.x - hpWidth / 2, unit.y - 22, (hpWidth * unit.health) / unit.maxHealth, 4);
      });
    };

    const interval = setInterval(gameLoop, 16);
    return () => clearInterval(interval);
  }, [gameState, units, zones]);

  const playerUnit = units.find((u) => u.isPlayer);
  const isPlayerAlive = playerUnit && playerUnit.health > 0;

  if (gameState === "menu") {
    return (
      <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-amber-500" />
              Capture Zone
            </CardTitle>
            {onClose && (
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground text-center">
              Control zones to earn points! Capture and hold as many zones as possible.
              Each zone you control gives you points every second.
            </p>
            <div className="flex flex-col items-center gap-2">
              <span className="text-sm font-medium">Choose Your Team</span>
              <div className="flex gap-2">
                <Button
                  variant={playerTeam === "blue" ? "default" : "outline"}
                  className={playerTeam === "blue" ? "bg-blue-600 hover:bg-blue-700" : ""}
                  onClick={() => setPlayerTeam("blue")}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Blue Team
                </Button>
                <Button
                  variant={playerTeam === "red" ? "default" : "outline"}
                  className={playerTeam === "red" ? "bg-red-600 hover:bg-red-700" : ""}
                  onClick={() => setPlayerTeam("red")}
                >
                  <Swords className="w-4 h-4 mr-2" />
                  Red Team
                </Button>
              </div>
            </div>
            <Button className="w-full" onClick={startGame} data-testid="button-start-capture-zone">
              Start Battle
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState === "gameover") {
    const didWin = winner === playerTeam;
    return (
      <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className={`flex items-center gap-2 justify-center ${didWin ? "text-green-500" : "text-red-500"}`}>
              <Trophy className="w-6 h-6" />
              {didWin ? "Victory!" : winner ? "Defeat!" : "Draw!"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="flex justify-around">
              <div>
                <div className="text-2xl font-bold text-blue-500">{scores.blue}</div>
                <div className="text-sm text-muted-foreground">Blue Team</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-500">{scores.red}</div>
                <div className="text-sm text-muted-foreground">Red Team</div>
              </div>
            </div>
            <div className="flex gap-4 justify-center">
              <Button onClick={startGame} data-testid="button-restart-capture-zone">
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
              <Flag className="w-5 h-5" />
              Capture Zone
            </CardTitle>
            <Badge variant="secondary" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
            </Badge>
            <Badge className="bg-blue-600 flex items-center gap-1">
              Blue: {scores.blue}
            </Badge>
            <Badge className="bg-red-600 flex items-center gap-1">
              Red: {scores.red}
            </Badge>
            {isPlayerAlive && (
              <div className="flex items-center gap-1">
                <span className="text-xs">HP:</span>
                <Progress value={playerUnit.health} className="w-20 h-2" />
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
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            className="border rounded-lg"
          />
          <div className="mt-2 text-xs text-muted-foreground text-center">
            Use WASD or Arrow Keys to move. Stand in zones to capture them!
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
