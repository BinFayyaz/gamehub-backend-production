import { useState, useRef, useEffect, useCallback } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GameChat } from "@/components/game-chat";
import {
  ArrowLeft,
  Users,
  Crown,
  Shield,
  Swords,
  Castle,
  Target,
  ArrowUp,
  Hammer,
  Crosshair,
  UserX,
} from "lucide-react";

export function OutpostRushLobby() {
  const {
    outpostRushLobby,
    currentPlayerId,
    leaveOutpostRushLobby,
    selectOutpostRushTeam,
    startOutpostRushGame,
    isAdmin,
    adminForceKick,
  } = useWebSocket();

  if (!outpostRushLobby) return null;

  const isHost = outpostRushLobby.hostId === currentPlayerId;
  const canStart = outpostRushLobby.players.length >= outpostRushLobby.minPlayers;
  const currentPlayer = outpostRushLobby.players.find((p) => p.id === currentPlayerId);
  const alphaTeam = outpostRushLobby.players.filter((p) => p.team === "alpha");
  const betaTeam = outpostRushLobby.players.filter((p) => p.team === "beta");

  return (
    <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="flex flex-row items-center gap-2 justify-between pb-2">
          <CardTitle className="flex items-center gap-2">
            <Castle className="h-5 w-5" />
            Outpost Rush
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={leaveOutpostRushLobby}
            data-testid="button-leave-outpostrush-lobby"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center text-sm text-muted-foreground">
            Team-based battle! Capture outposts and defend your base.
          </div>

          <div className="flex items-center justify-center gap-2 mb-2">
            <Users className="h-4 w-4" />
            <span className="text-sm font-medium">
              Players ({outpostRushLobby.players.length}/{outpostRushLobby.maxPlayers})
            </span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 justify-center">
                <Badge variant="default" className="bg-blue-600">
                  <Shield className="h-3 w-3 mr-1" />
                  Alpha Team ({alphaTeam.length})
                </Badge>
              </div>
              <Card className="border-blue-600/50">
                <CardContent className="p-2">
                  <div className="flex flex-wrap gap-1">
                    {alphaTeam.map((player) => (
                      <div key={player.id} className="flex items-center gap-1">
                        <Badge
                          variant={player.id === outpostRushLobby.hostId ? "default" : "secondary"}
                          className="flex items-center gap-1"
                          data-testid={`badge-player-${player.id}`}
                        >
                          {player.id === outpostRushLobby.hostId && <Crown className="h-3 w-3" />}
                          {player.name}
                        </Badge>
                        {isAdmin && player.id !== currentPlayerId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-destructive hover:bg-destructive/10"
                            onClick={() => adminForceKick(player.id)}
                            data-testid={`button-kick-or-${player.id}`}
                          >
                            <UserX className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {currentPlayer?.team !== "alpha" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => selectOutpostRushTeam("alpha")}
                      data-testid="button-join-alpha"
                    >
                      Join Alpha
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 justify-center">
                <Badge variant="default" className="bg-red-600">
                  <Swords className="h-3 w-3 mr-1" />
                  Beta Team ({betaTeam.length})
                </Badge>
              </div>
              <Card className="border-red-600/50">
                <CardContent className="p-2">
                  <div className="flex flex-wrap gap-1">
                    {betaTeam.map((player) => (
                      <div key={player.id} className="flex items-center gap-1">
                        <Badge
                          variant={player.id === outpostRushLobby.hostId ? "default" : "secondary"}
                          className="flex items-center gap-1"
                          data-testid={`badge-player-${player.id}`}
                        >
                          {player.id === outpostRushLobby.hostId && <Crown className="h-3 w-3" />}
                          {player.name}
                        </Badge>
                        {isAdmin && player.id !== currentPlayerId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5 text-destructive hover:bg-destructive/10"
                            onClick={() => adminForceKick(player.id)}
                            data-testid={`button-kick-or-${player.id}`}
                          >
                            <UserX className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                  {currentPlayer?.team !== "beta" && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => selectOutpostRushTeam("beta")}
                      data-testid="button-join-beta"
                    >
                      Join Beta
                    </Button>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="text-sm text-muted-foreground text-center">
            {outpostRushLobby.players.length < outpostRushLobby.minPlayers
              ? `Waiting for ${outpostRushLobby.minPlayers - outpostRushLobby.players.length} more player(s)`
              : "Waiting for host to start..."}
          </div>

          {isHost && (
            <Button
              className="w-full"
              onClick={startOutpostRushGame}
              disabled={!canStart}
              data-testid="button-start-outpostrush-game"
            >
              Start Game ({outpostRushLobby.players.length}/{outpostRushLobby.minPlayers} min)
            </Button>
          )}

          <div className="text-xs text-muted-foreground text-center border-t pt-3 mt-3">
            <div className="font-medium mb-1">Controls:</div>
            <div>WASD or Arrow Keys - Move</div>
            <div>Mouse Click - Fire | Space - Capture/Collect | Q - Wall | E - Upgrade | R - Revive</div>
          </div>
        </CardContent>
      </Card>

      <GameChat />
    </div>
  );
}

const MAP_WIDTH = 12000;
const MAP_HEIGHT = 6000;

const OUTPOST_POSITIONS = [
  { x: 1500, y: 1500 },
  { x: 4000, y: 1000 },
  { x: 2500, y: 3000 },
  { x: 6000, y: 3000 },
  { x: 9500, y: 3000 },
  { x: 8000, y: 5000 },
  { x: 10500, y: 4500 },
];

const PATH_CONNECTIONS = [
  [0, 1], [0, 2], [1, 2], [1, 3], [2, 3], [3, 4], [3, 5], [4, 5], [4, 6], [5, 6]
];

function generateCurvyPath(x1: number, y1: number, x2: number, y2: number): string {
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const perpX = -dy * 0.15;
  const perpY = dx * 0.15;
  const ctrlX = midX + perpX;
  const ctrlY = midY + perpY;
  return `M ${x1} ${y1} Q ${ctrlX} ${ctrlY} ${x2} ${y2}`;
}

function getPathBounds(connections: number[][]): { paths: { x1: number; y1: number; x2: number; y2: number }[] } {
  return {
    paths: connections.map(([i, j]) => ({
      x1: OUTPOST_POSITIONS[i].x,
      y1: OUTPOST_POSITIONS[i].y,
      x2: OUTPOST_POSITIONS[j].x,
      y2: OUTPOST_POSITIONS[j].y,
    }))
  };
}

interface Projectile {
  id: string;
  startX: number;
  startY: number;
  dirX: number;
  dirY: number;
  startTime: number;
  speed: number;
  maxDistance: number;
}

export function OutpostRushGame() {
  const {
    outpostRushGame,
    currentPlayerId,
    leaveOutpostRushLobby,
    outpostRushCapture,
    outpostRushBuildDefense,
    outpostRushUpgradeWeapon,
    outpostRushAttack,
    outpostRushRevive,
    outpostRushMove,
    outpostRushCollectResources,
  } = useWebSocket();

  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
  const [localPosition, setLocalPosition] = useState<{ x: number; y: number } | null>(null);
  const [projectiles, setProjectiles] = useState<Projectile[]>([]);
  const [cameraOffset, setCameraOffset] = useState({ x: 0, y: 0 });
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [bowAngle, setBowAngle] = useState(0);
  const [canFire, setCanFire] = useState(true);
  const [fireCooldown, setFireCooldown] = useState(0);
  const viewportRef = useRef<HTMLDivElement>(null);
  const lastMoveTime = useRef(0);
  const animationFrameRef = useRef<number>();
  const lastFireTime = useRef(0);

  const currentPlayer = outpostRushGame?.players.find((p) => p.id === currentPlayerId);
  const myTeam = currentPlayer?.team || "alpha";

  const playerX = localPosition?.x ?? currentPlayer?.x ?? 0;
  const playerY = localPosition?.y ?? currentPlayer?.y ?? 0;

  const weaponNames = ["Bow", "Crossbow", "Repeating Crossbow"];
  const fireRates = [3000, 2000, 1000];
  const weaponRanges = [400, 500, 600];

  useEffect(() => {
    if (currentPlayer && !localPosition) {
      setLocalPosition({ x: currentPlayer.x, y: currentPlayer.y });
    }
  }, [currentPlayer, localPosition]);

  useEffect(() => {
    if (!viewportRef.current) return;
    const viewportWidth = viewportRef.current.clientWidth;
    const viewportHeight = viewportRef.current.clientHeight;
    
    const targetX = playerX - viewportWidth / 2;
    const targetY = playerY - viewportHeight / 2;
    
    const clampedX = Math.max(0, Math.min(MAP_WIDTH - viewportWidth, targetX));
    const clampedY = Math.max(0, Math.min(MAP_HEIGHT - viewportHeight, targetY));
    
    setCameraOffset({ x: clampedX, y: clampedY });
  }, [playerX, playerY]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!viewportRef.current) return;
      const rect = viewportRef.current.getBoundingClientRect();
      const mouseScreenX = e.clientX - rect.left;
      const mouseScreenY = e.clientY - rect.top;
      
      const mouseWorldX = mouseScreenX + cameraOffset.x;
      const mouseWorldY = mouseScreenY + cameraOffset.y;
      
      setMousePosition({ x: mouseWorldX, y: mouseWorldY });
      
      const dx = mouseWorldX - playerX;
      const dy = mouseWorldY - playerY;
      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
      setBowAngle(angle);
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [playerX, playerY, cameraOffset]);

  const fireArrow = useCallback(() => {
    if (!currentPlayer?.isAlive || !canFire) return;

    const now = Date.now();
    const fireRate = fireRates[(currentPlayer?.weaponLevel || 1) - 1];
    
    if (now - lastFireTime.current < fireRate) return;
    
    lastFireTime.current = now;
    setCanFire(false);
    setFireCooldown(fireRate);

    const dx = mousePosition.x - playerX;
    const dy = mousePosition.y - playerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const dirX = dx / dist;
    const dirY = dy / dist;

    const range = weaponRanges[(currentPlayer?.weaponLevel || 1) - 1];
    
    const projectileId = `proj-${Date.now()}-${Math.random()}`;
    const newProjectile: Projectile = {
      id: projectileId,
      startX: playerX,
      startY: playerY,
      dirX,
      dirY,
      startTime: Date.now(),
      speed: 800,
      maxDistance: range,
    };
    setProjectiles((prev) => [...prev, newProjectile]);

    const enemies = outpostRushGame?.players.filter(
      (p) => p.team !== myTeam && p.isAlive
    ) || [];

    for (const enemy of enemies) {
      const enemyDist = Math.sqrt(
        Math.pow(playerX - enemy.x, 2) + Math.pow(playerY - enemy.y, 2)
      );
      if (enemyDist <= range) {
        const toEnemyX = enemy.x - playerX;
        const toEnemyY = enemy.y - playerY;
        const toEnemyDist = Math.sqrt(toEnemyX * toEnemyX + toEnemyY * toEnemyY);
        const dotProduct = (dirX * toEnemyX + dirY * toEnemyY) / toEnemyDist;
        
        if (dotProduct > 0.9) {
          outpostRushAttack(enemy.id);
          break;
        }
      }
    }

    setTimeout(() => {
      setProjectiles((prev) => prev.filter((p) => p.id !== projectileId));
    }, 1000);

    setTimeout(() => {
      setCanFire(true);
    }, fireRate);
  }, [currentPlayer, canFire, mousePosition, playerX, playerY, outpostRushGame, myTeam, outpostRushAttack]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (fireCooldown > 0) {
        setFireCooldown((prev) => Math.max(0, prev - 100));
      }
    }, 100);
    return () => clearInterval(interval);
  }, [fireCooldown]);

  const handleCaptureOrCollect = useCallback(() => {
    if (!currentPlayer || !outpostRushGame) return;
    
    for (const outpost of outpostRushGame.outposts) {
      const dist = Math.sqrt(
        Math.pow(playerX - outpost.x, 2) + Math.pow(playerY - outpost.y, 2)
      );
      
      if (dist <= 150) {
        if (outpost.owner === myTeam && (outpost.storedResources || 0) > 0) {
          outpostRushCollectResources?.(outpost.id);
        } else if (outpost.owner !== myTeam) {
          outpostRushCapture(outpost.id);
        }
        return;
      }
    }
  }, [currentPlayer, outpostRushGame, myTeam, playerX, playerY, outpostRushCapture, outpostRushCollectResources]);

  const handleBuildWall = useCallback(() => {
    if (!currentPlayer?.isAlive || (currentPlayer?.resources || 0) < 20) return;
    outpostRushBuildDefense("wall", playerX, playerY);
  }, [currentPlayer, playerX, playerY, outpostRushBuildDefense]);

  const nearbyDeadTeammate = outpostRushGame?.players.find((p) => {
    if (p.team !== myTeam || p.isAlive || p.id === currentPlayerId) return false;
    const dist = Math.sqrt(Math.pow(playerX - p.x, 2) + Math.pow(playerY - p.y, 2));
    return dist <= 100;
  });

  const handleRevive = useCallback(() => {
    if (!currentPlayer?.isAlive || !nearbyDeadTeammate) return;
    outpostRushRevive(nearbyDeadTeammate.id);
  }, [currentPlayer, nearbyDeadTeammate, outpostRushRevive]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      const key = e.key.toLowerCase();
      
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'q', 'e', 'r'].includes(key)) {
        e.preventDefault();
      }

      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        setKeysPressed((prev) => new Set(prev).add(key));
      }

      if (key === ' ') {
        handleCaptureOrCollect();
      } else if (key === 'q') {
        handleBuildWall();
      } else if (key === 'e') {
        outpostRushUpgradeWeapon();
      } else if (key === 'r') {
        handleRevive();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      setKeysPressed((prev) => {
        const newSet = new Set(prev);
        newSet.delete(key);
        return newSet;
      });
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        fireArrow();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [handleCaptureOrCollect, handleBuildWall, outpostRushUpgradeWeapon, fireArrow, handleRevive]);

  useEffect(() => {
    if (!currentPlayer?.isAlive) return;

    const moveSpeed = 10;
    const networkUpdateInterval = 100;

    const gameLoop = () => {
      if (keysPressed.size > 0) {
        let dx = 0;
        let dy = 0;

        if (keysPressed.has('w') || keysPressed.has('arrowup')) dy -= moveSpeed;
        if (keysPressed.has('s') || keysPressed.has('arrowdown')) dy += moveSpeed;
        if (keysPressed.has('a') || keysPressed.has('arrowleft')) dx -= moveSpeed;
        if (keysPressed.has('d') || keysPressed.has('arrowright')) dx += moveSpeed;

        if (dx !== 0 || dy !== 0) {
          setLocalPosition((prev) => {
            const currentX = prev?.x ?? currentPlayer.x;
            const currentY = prev?.y ?? currentPlayer.y;
            let newX = Math.max(30, Math.min(MAP_WIDTH - 30, currentX + dx));
            let newY = Math.max(30, Math.min(MAP_HEIGHT - 30, currentY + dy));
            
            if (outpostRushGame?.defenses) {
              for (const defense of outpostRushGame.defenses) {
                if (defense.type === "wall") {
                  const wallLeft = defense.x - 25;
                  const wallRight = defense.x + 25;
                  const wallTop = defense.y - 25;
                  const wallBottom = defense.y + 25;
                  
                  const isCollidingX = newX + 20 > wallLeft && newX - 20 < wallRight;
                  const isCollidingY = newY + 20 > wallTop && newY - 20 < wallBottom;
                  
                  if (isCollidingX && isCollidingY) {
                    if (defense.team === myTeam) {
                      continue;
                    }
                    newX = currentX;
                    newY = currentY;
                    break;
                  }
                }
              }
            }
            
            const now = Date.now();
            if (now - lastMoveTime.current >= networkUpdateInterval) {
              lastMoveTime.current = now;
              outpostRushMove(newX, newY);
            }
            
            return { x: newX, y: newY };
          });
        }
      }

      animationFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animationFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [keysPressed, currentPlayer, outpostRushMove]);

  useEffect(() => {
    if (currentPlayer && localPosition) {
      const dx = Math.abs(currentPlayer.x - localPosition.x);
      const dy = Math.abs(currentPlayer.y - localPosition.y);
      if (dx > 100 || dy > 100) {
        setLocalPosition({ x: currentPlayer.x, y: currentPlayer.y });
      }
    }
  }, [currentPlayer?.x, currentPlayer?.y]);

  if (!outpostRushGame) return null;

  const isFinished = outpostRushGame.status === "finished";

  const alphaPlayers = outpostRushGame.players.filter((p) => p.team === "alpha");
  const betaPlayers = outpostRushGame.players.filter((p) => p.team === "beta");

  const alphaOutposts = outpostRushGame.outposts.filter((o) => o.owner === "alpha").length;
  const betaOutposts = outpostRushGame.outposts.filter((o) => o.owner === "beta").length;

  const currentWeapon = currentPlayer ? weaponNames[currentPlayer.weaponLevel - 1] : "Bow";
  const upgradeCost = currentPlayer ? currentPlayer.weaponLevel * 50 : 50;

  if (isFinished) {
    return (
      <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="flex items-center justify-center gap-2">
              <Castle className="h-6 w-6" />
              Game Over
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="text-2xl font-bold">
              {outpostRushGame.winner === "alpha" ? (
                <span className="text-blue-500">Alpha Team Wins!</span>
              ) : outpostRushGame.winner === "beta" ? (
                <span className="text-red-500">Beta Team Wins!</span>
              ) : (
                <span>Draw</span>
              )}
            </div>
            {outpostRushGame.winReason && (
              <div className="text-muted-foreground">{outpostRushGame.winReason}</div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="font-medium text-blue-500">Alpha Team</div>
                {alphaPlayers.map((p) => (
                  <div key={p.id} className="text-sm">
                    {p.name}: {p.kills}K / {p.deaths}D
                  </div>
                ))}
              </div>
              <div>
                <div className="font-medium text-red-500">Beta Team</div>
                {betaPlayers.map((p) => (
                  <div key={p.id} className="text-sm">
                    {p.name}: {p.kills}K / {p.deaths}D
                  </div>
                ))}
              </div>
            </div>

            <Button
              onClick={leaveOutpostRushLobby}
              data-testid="button-leave-outpostrush"
            >
              Leave Game
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-background z-50 flex flex-col">
      <div className="flex items-center justify-between p-2 border-b bg-card">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={leaveOutpostRushLobby}
            data-testid="button-leave-outpostrush"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2">
            <Badge className="bg-blue-600">
              <Shield className="h-3 w-3 mr-1" />
              Alpha: {alphaOutposts}
            </Badge>
            <Badge className="bg-red-600">
              <Swords className="h-3 w-3 mr-1" />
              Beta: {betaOutposts}
            </Badge>
          </div>
        </div>

        {currentPlayer && (
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Crosshair className="h-4 w-4" />
              <span className="text-sm">{currentWeapon}</span>
              {!canFire && (
                <div className="w-12 h-2 bg-gray-300 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-amber-500 transition-all"
                    style={{ width: `${(1 - fireCooldown / fireRates[(currentPlayer?.weaponLevel || 1) - 1]) * 100}%` }}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm">Resources: {currentPlayer.resources}</span>
            </div>
            <Badge variant={currentPlayer.isAlive ? "default" : "destructive"}>
              HP: {currentPlayer.health}/100
            </Badge>
          </div>
        )}
      </div>

      <div 
        ref={viewportRef}
        className="flex-1 relative overflow-hidden bg-green-900/20 cursor-crosshair"
        data-testid="game-viewport"
      >
        <div
          className="absolute"
          style={{
            width: MAP_WIDTH,
            height: MAP_HEIGHT,
            transform: `translate(${-cameraOffset.x}px, ${-cameraOffset.y}px)`,
            background: 'linear-gradient(135deg, #1a4d1a 0%, #2d5a1e 20%, #3d6b22 40%, #4a7c2a 60%, #3d6b22 80%, #2d5a1e 100%)',
            boxShadow: 'inset 0 0 200px rgba(0,0,0,0.4)',
          }}
          data-testid="game-map"
        >
          <div 
            className="absolute inset-0 opacity-20"
            style={{
              backgroundImage: `
                radial-gradient(circle at 10% 20%, rgba(34, 139, 34, 0.3) 0%, transparent 20%),
                radial-gradient(circle at 80% 30%, rgba(0, 100, 0, 0.2) 0%, transparent 25%),
                radial-gradient(circle at 40% 70%, rgba(34, 139, 34, 0.3) 0%, transparent 20%),
                radial-gradient(circle at 90% 80%, rgba(0, 100, 0, 0.2) 0%, transparent 25%)
              `,
            }}
          />

          <svg
            className="absolute inset-0"
            width={MAP_WIDTH}
            height={MAP_HEIGHT}
            style={{ pointerEvents: 'none' }}
          >
            <defs>
              <linearGradient id="sandGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#c2b280" />
                <stop offset="50%" stopColor="#d4c69a" />
                <stop offset="100%" stopColor="#c2b280" />
              </linearGradient>
              <filter id="sandTexture">
                <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
                <feDiffuseLighting in="noise" lightingColor="#d4c69a" surfaceScale="2">
                  <feDistantLight azimuth="45" elevation="60" />
                </feDiffuseLighting>
              </filter>
            </defs>
            {PATH_CONNECTIONS.map(([i, j], idx) => {
              const p1 = OUTPOST_POSITIONS[i];
              const p2 = OUTPOST_POSITIONS[j];
              return (
                <g key={idx}>
                  <path
                    d={generateCurvyPath(p1.x, p1.y, p2.x, p2.y)}
                    fill="none"
                    stroke="#8B7355"
                    strokeWidth="60"
                    strokeLinecap="round"
                    opacity="0.6"
                  />
                  <path
                    d={generateCurvyPath(p1.x, p1.y, p2.x, p2.y)}
                    fill="none"
                    stroke="url(#sandGradient)"
                    strokeWidth="50"
                    strokeLinecap="round"
                    opacity="0.8"
                  />
                  <path
                    d={generateCurvyPath(p1.x, p1.y, p2.x, p2.y)}
                    fill="none"
                    stroke="#d4c69a"
                    strokeWidth="40"
                    strokeLinecap="round"
                    strokeDasharray="2 8"
                    opacity="0.4"
                  />
                </g>
              );
            })}
          </svg>

          {outpostRushGame.outposts.map((outpost) => (
            <div
              key={outpost.id}
              className={`absolute w-32 h-32 rounded-xl border-4 flex flex-col items-center justify-center shadow-2xl ${
                outpost.owner === "alpha"
                  ? "bg-blue-500/50 border-blue-400"
                  : outpost.owner === "beta"
                  ? "bg-red-500/50 border-red-400"
                  : "bg-gray-500/50 border-gray-400"
              }`}
              style={{
                left: outpost.x - 64,
                top: outpost.y - 64,
              }}
              data-testid={`outpost-${outpost.id}`}
            >
              <Castle className="h-12 w-12 text-white drop-shadow-lg" />
              <span className="text-xs text-white font-medium mt-1 drop-shadow">{outpost.name}</span>
              
              {outpost.owner !== "neutral" && (
                <div className="absolute -bottom-6 w-28">
                  <div className="text-xs text-center text-white mb-1">
                    Resources: {outpost.storedResources || 0}
                  </div>
                  <div className="w-full h-3 bg-gray-700/80 rounded-full overflow-hidden border border-white/30">
                    <div 
                      className="h-full bg-yellow-400 transition-all"
                      style={{ width: `${Math.min(100, ((outpost.storedResources || 0) / 1000) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              
              {outpost.captureProgress > 0 && (
                <Progress
                  value={outpost.captureProgress}
                  className="absolute -top-4 w-24 h-2"
                />
              )}
            </div>
          ))}

          {outpostRushGame.defenses.map((defense) => (
            <div
              key={defense.id}
              className={`absolute w-10 h-10 rounded ${
                defense.team === "alpha" ? "bg-blue-400" : "bg-red-400"
              }`}
              style={{ left: defense.x - 20, top: defense.y - 20 }}
              data-testid={`defense-${defense.id}`}
            >
              {defense.type === "turret" && <Target className="h-8 w-8 m-1 text-white" />}
              {defense.type === "wall" && <Shield className="h-8 w-8 m-1 text-white" />}
            </div>
          ))}

          {outpostRushGame.players.map((player) => {
            const displayX = player.id === currentPlayerId ? playerX : player.x;
            const displayY = player.id === currentPlayerId ? playerY : player.y;
            const isMe = player.id === currentPlayerId;
            
            return (
              <div
                key={player.id}
                className={`absolute flex items-center justify-center ${!player.isAlive ? "opacity-30" : ""}`}
                style={{
                  left: displayX,
                  top: displayY,
                  transform: 'translate(-50%, -50%)',
                }}
                data-testid={`player-${player.id}`}
              >
                {isMe && player.isAlive && (
                  <div
                    className="absolute"
                    style={{
                      width: 60,
                      height: 20,
                      transformOrigin: 'left center',
                      transform: `rotate(${bowAngle}deg)`,
                      left: 0,
                      top: -10,
                    }}
                  >
                    <svg width="60" height="20" viewBox="0 0 60 20">
                      <path
                        d="M 5 10 Q 15 2, 25 10 Q 15 18, 5 10"
                        fill="none"
                        stroke="#8B4513"
                        strokeWidth="3"
                      />
                      <line x1="25" y1="10" x2="55" y2="10" stroke="#8B4513" strokeWidth="2" />
                      <polygon points="55,10 48,6 48,14" fill="#8B4513" />
                    </svg>
                  </div>
                )}
                
                <div className="flex flex-col items-center">
                  <div className="mb-1 w-16 h-2 bg-gray-700/80 rounded-full overflow-hidden border border-white/50">
                    <div 
                      className={`h-full transition-all ${
                        player.health > 50 ? "bg-green-500" : player.health > 25 ? "bg-yellow-500" : "bg-red-500"
                      }`}
                      style={{ width: `${player.health}%` }}
                    />
                  </div>
                  <div
                    className={`w-14 h-14 rounded-full border-3 flex items-center justify-center text-sm font-bold shadow-lg ${
                      player.team === "alpha"
                        ? "bg-blue-500 border-blue-300"
                        : "bg-red-500 border-red-300"
                    } ${isMe ? "ring-4 ring-yellow-400 ring-offset-2 ring-offset-transparent" : ""}`}
                  >
                    <span className="text-white drop-shadow text-base">
                      {player.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  {!player.isAlive && (
                    <div className="text-xs text-red-400 font-medium mt-1">DEAD</div>
                  )}
                </div>
              </div>
            );
          })}

          {projectiles.map((proj) => {
            const elapsed = Date.now() - proj.startTime;
            const distance = Math.min(elapsed * proj.speed / 1000, proj.maxDistance);
            const currentX = proj.startX + proj.dirX * distance;
            const currentY = proj.startY + proj.dirY * distance;
            const angle = Math.atan2(proj.dirY, proj.dirX) * (180 / Math.PI);
            
            return (
              <div
                key={proj.id}
                className="absolute"
                style={{
                  left: currentX,
                  top: currentY,
                  transform: `translate(-50%, -50%) rotate(${angle}deg)`,
                }}
                data-testid={`projectile-${proj.id}`}
              >
                <svg width="30" height="10" viewBox="0 0 30 10">
                  <line x1="0" y1="5" x2="25" y2="5" stroke="#8B4513" strokeWidth="2" />
                  <polygon points="30,5 22,1 22,9" fill="#8B4513" />
                  <line x1="0" y1="5" x2="5" y2="2" stroke="#D2691E" strokeWidth="1" />
                  <line x1="0" y1="5" x2="5" y2="8" stroke="#D2691E" strokeWidth="1" />
                </svg>
              </div>
            );
          })}

          {outpostRushGame.events.map((event) => (
            <div
              key={event.id}
              className="absolute px-3 py-1 bg-yellow-500/90 text-black text-xs rounded-lg font-medium shadow-lg"
              style={{ left: event.x, top: event.y }}
              data-testid={`event-${event.id}`}
            >
              {event.type}
            </div>
          ))}
        </div>

        <div className="absolute bottom-4 right-4 bg-card/80 backdrop-blur p-2 rounded-lg border text-xs">
          <div className="text-muted-foreground">
            Position: {Math.round(playerX)}, {Math.round(playerY)}
          </div>
        </div>

        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card/80 backdrop-blur px-4 py-2 rounded-lg border">
          <div className="text-xs text-muted-foreground text-center">
            WASD: Move | Click: Fire | Space: Capture/Collect | Q: Wall | E: Upgrade | R: Revive
          </div>
        </div>
      </div>

      <div className="p-2 border-t bg-card">
        <div className="flex items-center gap-2 justify-center flex-wrap">
          <Button
            onClick={handleCaptureOrCollect}
            disabled={!currentPlayer?.isAlive}
            data-testid="button-capture-outpost"
          >
            <Castle className="h-4 w-4 mr-2" />
            Capture/Collect
          </Button>
          <Button
            onClick={fireArrow}
            disabled={!currentPlayer?.isAlive || !canFire}
            variant="destructive"
            data-testid="button-attack"
          >
            <Crosshair className="h-4 w-4 mr-2" />
            Fire
          </Button>
          <Button
            onClick={outpostRushUpgradeWeapon}
            disabled={
              !currentPlayer?.isAlive ||
              (currentPlayer?.resources || 0) < upgradeCost ||
              (currentPlayer?.weaponLevel || 1) >= 3
            }
            variant="secondary"
            data-testid="button-upgrade-weapon"
          >
            <ArrowUp className="h-4 w-4 mr-2" />
            Upgrade ({upgradeCost})
          </Button>
          <Button
            onClick={handleBuildWall}
            disabled={!currentPlayer?.isAlive || (currentPlayer?.resources || 0) < 20}
            variant="outline"
            data-testid="button-build-wall"
          >
            <Hammer className="h-4 w-4 mr-2" />
            Wall (20)
          </Button>
          <Button
            onClick={() => currentPlayer && outpostRushBuildDefense("turret", playerX, playerY)}
            disabled={!currentPlayer?.isAlive || (currentPlayer?.resources || 0) < 50}
            variant="outline"
            data-testid="button-build-turret"
          >
            <Target className="h-4 w-4 mr-2" />
            Turret (50)
          </Button>
        </div>
      </div>

      <GameChat />
    </div>
  );
}
