import { useState, useRef, useEffect, useCallback } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { GameChat } from "@/components/game-chat";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  X,
  Crown,
  TreePine,
  Wheat,
  Sword,
  Target,
  Home,
  Factory,
  Fence,
  Send,
  Hammer,
  Users,
  ArrowUp,
  DoorOpen,
  Info,
  Flag,
  Trash2,
} from "lucide-react";

const INTERPOLATION_MS = 100;
const lerp = (start: number, end: number, t: number) =>
  start * (1 - t) + end * t;
const getDistance = (x1: number, y1: number, x2: number, y2: number) =>
  Math.hypot(x2 - x1, y2 - y1);

export function CastlesSiegeLobby() {
  const {
    castlesLobby,
    leaveCastlesLobby,
    setCastlesTeam,
    setCastlesReady,
    startCastlesGame,
    currentPlayerId,
  } = useWebSocket();

  if (!castlesLobby) return null;

  const currentPlayer = castlesLobby.players.find(
    (p) => p.id === currentPlayerId,
  );
  const isHost = castlesLobby.hostId === currentPlayerId;
  const redTeam = castlesLobby.players.filter((p) => p.team === "red");
  const blueTeam = castlesLobby.players.filter((p) => p.team === "blue");
  const allReady = castlesLobby.players.every((p) => p.isReady);
  const canStart = isHost && allReady && castlesLobby.players.length >= 1;

  return (
    <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
      <GameChat />
      <Card className="w-full max-w-4xl mx-auto shadow-2xl border-amber-600/20">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <Crown className="w-6 h-6 text-amber-500" />
            <CardTitle className="text-xl font-bold">
              Castles: Siege Dominion
            </CardTitle>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => leaveCastlesLobby(castlesLobby.id)}
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="border-2 border-red-500/30 bg-red-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-red-600 flex items-center gap-2">
                  <Sword className="w-4 h-4" /> Red Kingdom ({redTeam.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {redTeam.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-2 rounded bg-background/50 border"
                  >
                    <span className="font-medium flex items-center gap-2">
                      {player.id === castlesLobby.hostId && (
                        <Crown className="w-3 h-3 text-amber-500" />
                      )}
                      {player.name}
                    </span>
                    {player.isReady && (
                      <Badge className="bg-green-600">Ready</Badge>
                    )}
                  </div>
                ))}
                {currentPlayer?.team !== "red" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2 border-red-200 hover:bg-red-100"
                    onClick={() => setCastlesTeam(castlesLobby.id, "red")}
                  >
                    Join Red
                  </Button>
                )}
              </CardContent>
            </Card>
            <Card className="border-2 border-blue-500/30 bg-blue-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-blue-600 flex items-center gap-2">
                  <Sword className="w-4 h-4" /> Blue Kingdom ({blueTeam.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {blueTeam.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center justify-between p-2 rounded bg-background/50 border"
                  >
                    <span className="font-medium flex items-center gap-2">
                      {player.id === castlesLobby.hostId && (
                        <Crown className="w-3 h-3 text-amber-500" />
                      )}
                      {player.name}
                    </span>
                    {player.isReady && (
                      <Badge className="bg-green-600">Ready</Badge>
                    )}
                  </div>
                ))}
                {currentPlayer?.team !== "blue" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-2 border-blue-200 hover:bg-blue-100"
                    onClick={() => setCastlesTeam(castlesLobby.id, "blue")}
                  >
                    Join Blue
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
          <div className="flex flex-col items-center gap-4 pt-4">
            <div className="flex gap-4">
              <Button
                size="lg"
                className={`w-40 ${currentPlayer?.isReady ? "bg-amber-600 hover:bg-amber-700" : ""}`}
                variant={currentPlayer?.isReady ? "secondary" : "default"}
                onClick={() =>
                  setCastlesReady(castlesLobby.id, !currentPlayer?.isReady)
                }
              >
                {currentPlayer?.isReady ? "Not Ready" : "Ready"}
              </Button>
              {isHost && (
                <Button
                  size="lg"
                  disabled={!canStart}
                  onClick={() => startCastlesGame(castlesLobby.id)}
                  className="w-40 bg-green-600 hover:bg-green-700"
                >
                  Start Game
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

type PendingAction =
  | {
      type: "GATHER";
      targetId: string;
      targetX: number;
      targetY: number;
      resourceType: "wood" | "food";
    }
  | { type: "ATTACK"; targetId: string; targetX: number; targetY: number }
  | { type: "MOVE_THEN_BUILD"; buildingType: string; x: number; y: number };

interface BuildingInfo {
  id: string;
  type: string;
  team: string;
  x: number;
  y: number;
  width: number;
  height: number;
  health: number;
  maxHealth: number;
  rallyX?: number;
  rallyY?: number;
}

export function CastlesSiegeGame() {
  const {
    castlesGame,
    sendCastlesCommand,
    sendCastlesChatMessage,
    castlesChatMessages,
    currentPlayerId,
    leaveCastlesGame,
  } = useWebSocket();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingInfo | null>(null);
  const [buildMode, setBuildMode] = useState<string | null>(null);
  const [rallyMode, setRallyMode] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [camera, setCamera] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [viewportSize, setViewportSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
  const [showControls, setShowControls] = useState(true);
  const [dragSelect, setDragSelect] = useState<{ startX: number; startY: number; endX: number; endY: number } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showVictory, setShowVictory] = useState(false);

  const unitPositions = useRef<Map<string, { x: number; y: number }>>(new Map());
  const pendingActions = useRef<Map<string, PendingAction>>(new Map());
  const lastServerUpdate = useRef<number>(Date.now());
  const animationFrameRef = useRef<number>();
  const lastLogicTick = useRef<number>(0);
  const buildingRallyPoints = useRef<Map<string, { x: number; y: number }>>(new Map());

  const player = castlesGame?.players.find((p) => p.id === currentPlayerId);
  const team = player?.team;

  useEffect(() => {
    const handleResize = () =>
      setViewportSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!castlesGame) return;
    lastServerUpdate.current = Date.now();
    const currentUnitIds = new Set(castlesGame.units.map((u) => u.id));
    for (const id of unitPositions.current.keys()) {
      if (!currentUnitIds.has(id)) {
        unitPositions.current.delete(id);
        pendingActions.current.delete(id);
      }
    }
    
    if (castlesGame.status === "finished" && castlesGame.winner) {
      setShowVictory(true);
    }
  }, [castlesGame]);

  useEffect(() => {
    if (castlesGame && player && camera.x === 0 && camera.y === 0) {
      const myCastle = castlesGame.buildings.find(
        (b) => b.type === "castle_center" && b.team === player.team,
      );
      if (myCastle) {
        setCamera({
          x: Math.max(0, myCastle.x - window.innerWidth / 2),
          y: Math.max(0, myCastle.y - window.innerHeight / 2),
        });
      }
    }
  }, [castlesGame?.id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return;
      setKeysPressed((prev) => new Set(prev).add(e.key.toLowerCase()));
      if (e.key === "Escape") {
        setBuildMode(null);
        setSelectedUnits([]);
        setSelectedBuilding(null);
        setRallyMode(false);
      }
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
    if (!castlesGame || !canvasRef.current || !player) return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;

    const CAM_SPEED = 20;
    let newCamX = camera.x;
    let newCamY = camera.y;
    if (keysPressed.has("w") || keysPressed.has("arrowup"))
      newCamY -= CAM_SPEED;
    if (keysPressed.has("s") || keysPressed.has("arrowdown"))
      newCamY += CAM_SPEED;
    if (keysPressed.has("a") || keysPressed.has("arrowleft"))
      newCamX -= CAM_SPEED;
    if (keysPressed.has("d") || keysPressed.has("arrowright"))
      newCamX += CAM_SPEED;
    newCamX = Math.max(
      0,
      Math.min(newCamX, castlesGame.mapWidth - viewportSize.width),
    );
    newCamY = Math.max(
      0,
      Math.min(newCamY, castlesGame.mapHeight - viewportSize.height),
    );
    if (
      Math.abs(newCamX - camera.x) > 0.5 ||
      Math.abs(newCamY - camera.y) > 0.5
    ) {
      setCamera({ x: newCamX, y: newCamY });
    }

    const now = Date.now();
    if (now - lastLogicTick.current > 200) {
      lastLogicTick.current = now;
      pendingActions.current.forEach((action, unitId) => {
        const unit = unitPositions.current.get(unitId);
        if (!unit) return;
        const dist = getDistance(
          unit.x,
          unit.y,
          action.targetX,
          action.targetY,
        );
        if (action.type === "GATHER" && dist < 60) {
          sendCastlesCommand(castlesGame.id, "gather", {
            unitIds: [unitId],
            resourceType: action.resourceType,
            targetId: action.targetId,
          });
          pendingActions.current.delete(unitId);
        } else if (action.type === "ATTACK" && dist < 200) {
          sendCastlesCommand(castlesGame.id, "attack", {
            unitIds: [unitId],
            buildingId: action.targetId,
          });
          pendingActions.current.delete(unitId);
        }
      });
    }

    ctx.clearRect(0, 0, viewportSize.width, viewportSize.height);
    ctx.save();
    ctx.translate(-newCamX, -newCamY);

    const gradient = ctx.createLinearGradient(
      0,
      0,
      castlesGame.mapWidth,
      castlesGame.mapHeight,
    );
    gradient.addColorStop(0, "#1a4d1a");
    gradient.addColorStop(0.5, "#3d6b22");
    gradient.addColorStop(1, "#1a4d1a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, castlesGame.mapWidth, castlesGame.mapHeight);

    for (const tree of castlesGame.trees) {
      if ((tree as any).isDepleted) {
        ctx.fillStyle = "#3e2723";
        ctx.beginPath();
        ctx.arc(tree.x, tree.y, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = "#3E2723";
        ctx.fillRect(tree.x - 4, tree.y, 8, 12);
        ctx.fillStyle = "#1B5E20";
        ctx.beginPath();
        ctx.arc(tree.x, tree.y - 10, 18, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    for (const building of castlesGame.buildings) {
      if (building.health <= 0) continue;
      const baseColor = building.team === "red" ? "#b91c1c" : "#1d4ed8";

      if (building.type === "wall" || building.type === "gate") {
        ctx.fillStyle = "#57534E";
        ctx.fillRect(building.x, building.y, building.width, building.height);
        if (building.type === "gate") {
          ctx.fillStyle =
            building.team === team
              ? "rgba(34, 197, 94, 0.5)"
              : "rgba(239, 68, 68, 0.5)";
          ctx.fillRect(
            building.x + 10,
            building.y + 10,
            building.width - 20,
            building.height - 20,
          );
        }
      } else {
        ctx.fillStyle = baseColor;
        ctx.fillRect(building.x, building.y, building.width, building.height);
        if (building.type === "castle_center") {
          ctx.fillStyle = "gold";
          ctx.font = "20px Arial";
          ctx.textAlign = "center";
          ctx.fillText("Crown", building.x + building.width/2, building.y + building.height/2 + 5);
        }
        if (building.type === "barracks") {
          ctx.fillStyle = "white";
          ctx.font = "12px Arial";
          ctx.textAlign = "center";
          ctx.fillText("Barracks", building.x + building.width/2, building.y + building.height/2 + 4);
        }
        if (building.type === "catapult_factory") {
          ctx.fillStyle = "white";
          ctx.font = "10px Arial";
          ctx.textAlign = "center";
          ctx.fillText("Factory", building.x + building.width/2, building.y + building.height/2 + 4);
        }
        if (building.type === "farm") {
          ctx.fillStyle = "#FCD34D";
          ctx.font = "12px Arial";
          ctx.textAlign = "center";
          ctx.fillText("Farm", building.x + building.width/2, building.y + building.height/2 + 4);
        }
      }

      if (selectedBuilding?.id === building.id) {
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 3;
        ctx.strokeRect(building.x - 2, building.y - 2, building.width + 4, building.height + 4);
      }

      const rallyPoint = buildingRallyPoints.current.get(building.id);
      if (rallyPoint && building.team === team) {
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.moveTo(building.x + building.width / 2, building.y + building.height / 2);
        ctx.lineTo(rallyPoint.x, rallyPoint.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = "#22c55e";
        ctx.beginPath();
        ctx.moveTo(rallyPoint.x, rallyPoint.y - 15);
        ctx.lineTo(rallyPoint.x + 8, rallyPoint.y);
        ctx.lineTo(rallyPoint.x, rallyPoint.y + 5);
        ctx.closePath();
        ctx.fill();
      }

      const hpPct = building.health / building.maxHealth;
      ctx.fillStyle = "red";
      ctx.fillRect(building.x, building.y - 8, building.width, 4);
      ctx.fillStyle = "green";
      ctx.fillRect(building.x, building.y - 8, building.width * hpPct, 4);
    }

    for (const unit of castlesGame.units) {
      if (unit.health <= 0) continue;
      const prevPos = unitPositions.current.get(unit.id) || {
        x: unit.x,
        y: unit.y,
      };
      const renderX = lerp(prevPos.x, unit.x, 0.2);
      const renderY = lerp(prevPos.y, unit.y, 0.2);
      unitPositions.current.set(unit.id, { x: renderX, y: renderY });

      const isSelected = selectedUnits.includes(unit.id);
      const unitColor = unit.team === "red" ? "#ef4444" : "#3b82f6";

      if (isSelected) {
        ctx.strokeStyle = "#22c55e";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(renderX, renderY + 5, 12, 6, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (unit.type === "catapult") {
        ctx.fillStyle = "#5C4033";
        ctx.fillRect(renderX - 15, renderY - 5, 30, 14);
        ctx.fillStyle = "#8B4513";
        ctx.beginPath();
        ctx.arc(renderX - 10, renderY + 10, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(renderX + 10, renderY + 10, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = "#3E2723";
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(renderX - 5, renderY - 5);
        ctx.quadraticCurveTo(renderX, renderY - 20, renderX + 10, renderY - 15);
        ctx.stroke();
        ctx.fillStyle = "#444";
        ctx.beginPath();
        ctx.arc(renderX + 10, renderY - 15, 5, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.fillStyle = unitColor;
        ctx.beginPath();
        ctx.arc(renderX, renderY, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = "white";
        ctx.font = "10px Arial";
        ctx.textAlign = "center";
        let icon = "";
        if (unit.type === "worker") icon = "W";
        else if (unit.type === "soldier") icon = "S";
        else if (unit.type === "archer") icon = "A";
        ctx.fillText(icon, renderX, renderY + 4);
      }
    }

    if (buildMode) {
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = team === "red" ? "#ef4444" : "#3b82f6";
      let w = 40,
        h = 40;
      if (buildMode === "farm") {
        w = 60;
        h = 60;
      }
      if (buildMode === "barracks") {
        w = 80;
        h = 80;
      }
      if (buildMode === "catapult_factory") {
        w = 90;
        h = 90;
      }
      ctx.fillRect(mousePos.x - w / 2, mousePos.y - h / 2, w, h);
      ctx.globalAlpha = 1.0;
    }

    if (dragSelect && isDragging) {
      ctx.strokeStyle = "#22c55e";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 2]);
      const x = Math.min(dragSelect.startX, dragSelect.endX);
      const y = Math.min(dragSelect.startY, dragSelect.endY);
      const w = Math.abs(dragSelect.endX - dragSelect.startX);
      const h = Math.abs(dragSelect.endY - dragSelect.startY);
      ctx.strokeRect(x, y, w, h);
      ctx.fillStyle = "rgba(34, 197, 94, 0.1)";
      ctx.fillRect(x, y, w, h);
      ctx.setLineDash([]);
    }

    ctx.restore();
    animationFrameRef.current = requestAnimationFrame(gameLoop);
  }, [
    castlesGame,
    selectedUnits,
    selectedBuilding,
    camera,
    keysPressed,
    mousePos,
    buildMode,
    player,
    viewportSize,
    team,
    dragSelect,
    isDragging,
  ]);

  useEffect(() => {
    animationFrameRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (animationFrameRef.current)
        cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gameLoop]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const worldX = e.clientX - rect.left + camera.x;
    const worldY = e.clientY - rect.top + camera.y;
    setMousePos({ x: worldX, y: worldY });
    
    if (isDragging && dragSelect) {
      setDragSelect({
        ...dragSelect,
        endX: worldX,
        endY: worldY,
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!castlesGame || !player) return;
    const wx = mousePos.x;
    const wy = mousePos.y;

    if (rallyMode && selectedBuilding) {
      buildingRallyPoints.current.set(selectedBuilding.id, { x: wx, y: wy });
      sendCastlesCommand(castlesGame.id, "set_rally", {
        buildingId: selectedBuilding.id,
        rallyX: wx,
        rallyY: wy,
      });
      setRallyMode(false);
      return;
    }

    if (buildMode) {
      if (e.button === 0) {
        let w = 40,
          h = 40;
        if (buildMode === "farm") {
          w = 60;
          h = 60;
        }
        if (buildMode === "barracks") {
          w = 80;
          h = 80;
        }
        if (buildMode === "catapult_factory") {
          w = 90;
          h = 90;
        }
        sendCastlesCommand(castlesGame.id, "build", {
          buildingType: buildMode,
          targetX: wx - w / 2,
          targetY: wy - h / 2,
        });
        if (!e.shiftKey) setBuildMode(null);
      } else {
        setBuildMode(null);
      }
      return;
    }

    if (e.button === 0) {
      const clickedBuilding = castlesGame.buildings.find(
        (b) =>
          b.team === team &&
          wx > b.x &&
          wx < b.x + b.width &&
          wy > b.y &&
          wy < b.y + b.height,
      );
      
      if (clickedBuilding) {
        setSelectedBuilding(clickedBuilding as BuildingInfo);
        setSelectedUnits([]);
        return;
      }

      const clickedUnit = castlesGame.units.find(
        (u) =>
          u.ownerId === currentPlayerId && Math.hypot(u.x - wx, u.y - wy) < 20,
      );
      if (clickedUnit) {
        if (e.ctrlKey) setSelectedUnits((prev) => [...prev, clickedUnit.id]);
        else setSelectedUnits([clickedUnit.id]);
        setSelectedBuilding(null);
      } else if (!e.shiftKey) {
        setIsDragging(true);
        setDragSelect({ startX: wx, startY: wy, endX: wx, endY: wy });
        setSelectedBuilding(null);
      }
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (!castlesGame || !player) return;
    
    if (isDragging && dragSelect) {
      const minX = Math.min(dragSelect.startX, dragSelect.endX);
      const maxX = Math.max(dragSelect.startX, dragSelect.endX);
      const minY = Math.min(dragSelect.startY, dragSelect.endY);
      const maxY = Math.max(dragSelect.startY, dragSelect.endY);
      
      if (maxX - minX > 10 || maxY - minY > 10) {
        const unitsInBox = castlesGame.units.filter(
          (u) =>
            u.ownerId === currentPlayerId &&
            u.x >= minX &&
            u.x <= maxX &&
            u.y >= minY &&
            u.y <= maxY,
        );
        if (unitsInBox.length > 0) {
          setSelectedUnits(unitsInBox.map((u) => u.id));
        }
      }
    }
    
    setIsDragging(false);
    setDragSelect(null);
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!castlesGame || selectedUnits.length === 0) return;
    const wx = mousePos.x;
    const wy = mousePos.y;

    const clickedTree = castlesGame.trees.find(
      (t) => !(t as any).isDepleted && Math.hypot(t.x - wx, t.y - wy) < 25,
    );
    if (clickedTree) {
      sendCastlesCommand(castlesGame.id, "move", {
        unitIds: selectedUnits,
        targetX: clickedTree.x,
        targetY: clickedTree.y,
      });
      selectedUnits.forEach((uid) => {
        pendingActions.current.set(uid, {
          type: "GATHER",
          targetId: clickedTree.id,
          targetX: clickedTree.x,
          targetY: clickedTree.y,
          resourceType: "wood",
        });
      });
      return;
    }

    const clickedFarm = castlesGame.buildings.find(
      (b) =>
        b.type === "farm" &&
        b.team === team &&
        wx > b.x &&
        wx < b.x + b.width &&
        wy > b.y &&
        wy < b.y + b.height,
    );
    if (clickedFarm) {
      sendCastlesCommand(castlesGame.id, "move", {
        unitIds: selectedUnits,
        targetX: clickedFarm.x + 30,
        targetY: clickedFarm.y + 30,
      });
      selectedUnits.forEach((uid) => {
        pendingActions.current.set(uid, {
          type: "GATHER",
          targetId: clickedFarm.id,
          targetX: clickedFarm.x + 30,
          targetY: clickedFarm.y + 30,
          resourceType: "food",
        });
      });
      return;
    }

    const clickedEnemy = castlesGame.units.find(
      (u) => u.team !== team && Math.hypot(u.x - wx, u.y - wy) < 20,
    );
    const clickedBuilding = castlesGame.buildings.find(
      (b) =>
        b.team !== team &&
        wx > b.x &&
        wx < b.x + b.width &&
        wy > b.y &&
        wy < b.y + b.height,
    );

    if (clickedEnemy || clickedBuilding) {
      const targetId = clickedEnemy?.id || clickedBuilding?.id;
      if (targetId) {
        sendCastlesCommand(castlesGame.id, "move", {
          unitIds: selectedUnits,
          targetX: wx,
          targetY: wy,
        });
        selectedUnits.forEach((uid) => {
          pendingActions.current.set(uid, {
            type: "ATTACK",
            targetId,
            targetX: wx,
            targetY: wy,
          });
        });
      }
      return;
    }

    sendCastlesCommand(castlesGame.id, "move", {
      unitIds: selectedUnits,
      targetX: wx,
      targetY: wy,
    });
    selectedUnits.forEach((uid) => pendingActions.current.delete(uid));
  };

  const trainUnit = (unitType: string, buildingId: string) => {
    sendCastlesCommand(castlesGame!.id, "train", { unitType, buildingId });
    const rallyPoint = buildingRallyPoints.current.get(buildingId);
    if (rallyPoint) {
      setTimeout(() => {
        const newUnit = castlesGame?.units.find(u => 
          u.ownerId === currentPlayerId && 
          !unitPositions.current.has(u.id)
        );
        if (newUnit) {
          sendCastlesCommand(castlesGame!.id, "move", {
            unitIds: [newUnit.id],
            targetX: rallyPoint.x,
            targetY: rallyPoint.y,
          });
        }
      }, 500);
    }
  };

  const destroyBuilding = (buildingId: string) => {
    sendCastlesCommand(castlesGame!.id, "destroy_building", { buildingId });
    setSelectedBuilding(null);
  };

  const sendChat = () => {
    if (chatInput.trim()) {
      sendCastlesChatMessage(castlesGame!.id, chatInput.trim());
      setChatInput("");
    }
  };

  const handleLeaveGame = () => {
    if (castlesGame) {
      leaveCastlesGame(castlesGame.id);
    }
  };

  if (!castlesGame || !player) return null;

  const castle = castlesGame.buildings.find(
    (b) => b.type === "castle_center" && b.team === team,
  );

  return (
    <div className="fixed inset-0 overflow-hidden bg-black select-none font-sans">
      <canvas
        ref={canvasRef}
        width={viewportSize.width}
        height={viewportSize.height}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onContextMenu={handleContextMenu}
        className="block cursor-crosshair"
      />

      <div className="absolute bottom-24 right-4 p-4 pointer-events-none">
        <div className="bg-background/90 backdrop-blur-md border rounded-xl p-4 flex flex-col gap-4 pointer-events-auto shadow-2xl ring-1 ring-white/10 w-48">
          <div className="flex items-center gap-2 border-b pb-2">
            <Crown
              className={`h-5 w-5 ${team === "red" ? "text-red-500" : "text-blue-500"}`}
            />
            <span className="font-bold text-sm">{team?.toUpperCase()}</span>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-amber-500">
                <TreePine className="h-5 w-5" />
                <span className="font-medium">Wood</span>
              </div>
              <span className="text-xl font-bold">{player.wood}</span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-yellow-500">
                <Wheat className="h-5 w-5" />
                <span className="font-medium">Food</span>
              </div>
              <span className="text-xl font-bold">{player.food}</span>
            </div>

            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 text-blue-400">
                <Users className="h-5 w-5" />
                <span className="font-medium">Army</span>
              </div>
              <span className="text-xl font-bold">
                {
                  castlesGame.units.filter((u) => u.ownerId === currentPlayerId)
                    .length
                }
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute top-4 left-4 flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowControls(true)}
        >
          <Info className="h-4 w-4 mr-2" /> Help
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={handleLeaveGame}
        >
          Leave Game
        </Button>
      </div>

      {selectedBuilding && (
        <div className="absolute top-4 right-4 pointer-events-auto">
          <Card className="w-64 bg-background/95 backdrop-blur-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center justify-between">
                <span className="capitalize">{selectedBuilding.type.replace('_', ' ')}</span>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setSelectedBuilding(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="text-xs text-muted-foreground">
                HP: {selectedBuilding.health}/{selectedBuilding.maxHealth}
              </div>
              
              {(selectedBuilding.type === "barracks" || selectedBuilding.type === "catapult_factory" || selectedBuilding.type === "castle_center") && (
                <div className="space-y-2">
                  <div className="text-xs font-medium">Train Units</div>
                  <div className="flex gap-2">
                    {selectedBuilding.type === "castle_center" && (
                      <Button size="sm" variant="secondary" onClick={() => trainUnit("worker", selectedBuilding.id)}>
                        <Hammer className="h-4 w-4 mr-1" /> Worker
                      </Button>
                    )}
                    {selectedBuilding.type === "barracks" && (
                      <>
                        <Button size="sm" variant="secondary" onClick={() => trainUnit("soldier", selectedBuilding.id)}>
                          <Sword className="h-4 w-4 mr-1" /> Soldier
                        </Button>
                        <Button size="sm" variant="secondary" onClick={() => trainUnit("archer", selectedBuilding.id)}>
                          <Target className="h-4 w-4 mr-1" /> Archer
                        </Button>
                      </>
                    )}
                    {selectedBuilding.type === "catapult_factory" && (
                      <Button size="sm" variant="secondary" onClick={() => trainUnit("catapult", selectedBuilding.id)}>
                        <ArrowUp className="h-4 w-4 mr-1" /> Catapult
                      </Button>
                    )}
                  </div>
                </div>
              )}
              
              {(selectedBuilding.type === "barracks" || selectedBuilding.type === "catapult_factory") && (
                <Button size="sm" variant="outline" className="w-full" onClick={() => setRallyMode(true)}>
                  <Flag className="h-4 w-4 mr-1" /> Set Rally Point
                </Button>
              )}
              
              {selectedBuilding.type !== "castle_center" && (
                <Button size="sm" variant="destructive" className="w-full" onClick={() => destroyBuilding(selectedBuilding.id)}>
                  <Trash2 className="h-4 w-4 mr-1" /> Destroy
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {rallyMode && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
          <Badge className="bg-green-600 text-lg px-4 py-2">
            Click to set rally point
          </Badge>
        </div>
      )}

      <Dialog open={showControls} onOpenChange={setShowControls}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>How to Play: Castles Siege</DialogTitle>
            <DialogDescription>
              Defend your castle, gather resources, and destroy the enemy!
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <h3 className="font-bold text-amber-500">Resources & Workers</h3>
              <p>
                Workers gather from Trees (wood) or Farms (food). Trees respawn after depletion.
              </p>
              <p>
                Workers stay near resources and auto-gather when idle.
              </p>
            </div>
            <div className="space-y-2">
              <h3 className="font-bold text-red-500">Combat & Siege</h3>
              <p>
                Soldiers/Archers auto-attack nearby enemies. Catapults are essential for destroying walls.
              </p>
              <p>
                <strong>Victory:</strong> Destroy the enemy Castle Center!
              </p>
            </div>
            <div className="col-span-2 bg-muted p-2 rounded">
              <p>
                <strong>Controls:</strong> Left Click (Select) | Drag Select (Multiple Units) | Right Click (Move/Gather/Attack) | WASD (Camera)
              </p>
              <p className="text-xs mt-1 text-muted-foreground">
                Click buildings to train units, set rally points, or destroy them.
              </p>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setShowControls(false)}>
              Start Playing
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {showVictory && castlesGame.status === "finished" && (
        <Dialog open={showVictory} onOpenChange={setShowVictory}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className={castlesGame.winner === team ? "text-green-500" : "text-red-500"}>
                {castlesGame.winner === team ? "Victory!" : "Defeat!"}
              </DialogTitle>
              <DialogDescription>
                {castlesGame.winner === team
                  ? "Congratulations! You destroyed the enemy castle!"
                  : "Your castle has been destroyed. Better luck next time!"}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center gap-4">
              <Button onClick={handleLeaveGame}>
                Leave Game
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      <div className="absolute bottom-24 left-4 w-72 pointer-events-auto z-10">
        <div className="bg-black/60 backdrop-blur-sm rounded-lg overflow-hidden border border-white/10">
          <ScrollArea className="h-32 p-2">
            {castlesChatMessages.map((msg, i) => (
              <div key={i} className="text-xs py-0.5 text-white/90">
                <span className="font-bold text-blue-300">{msg.sender}:</span>{" "}
                {msg.message}
              </div>
            ))}
          </ScrollArea>
          <div className="p-2 bg-white/5 flex gap-1">
            <Input
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendChat()}
              className="h-7 text-xs bg-transparent border-white/20 text-white"
              placeholder="Chat..."
            />
            <Button size="icon" className="h-7 w-7" onClick={sendChat}>
              <Send className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 bg-background/95 backdrop-blur-md border rounded-2xl p-3 flex gap-6 pointer-events-auto shadow-2xl">
        <div className="space-y-2">
          <div className="text-[10px] uppercase font-bold text-center">
            Build
          </div>
          <div className="flex gap-2">
            {[
              { id: "farm", icon: Wheat, cost: "50 W" },
              { id: "barracks", icon: Home, cost: "100 W" },
              { id: "catapult_factory", icon: Factory, cost: "150 W" },
              { id: "wall", icon: Fence, cost: "20 W" },
              { id: "gate", icon: DoorOpen, cost: "50 W" },
            ].map((b) => (
              <Button
                key={b.id}
                variant={buildMode === b.id ? "default" : "outline"}
                size="icon"
                onClick={() => setBuildMode(buildMode === b.id ? null : b.id)}
                title={b.cost}
              >
                <b.icon className="h-5 w-5" />
              </Button>
            ))}
          </div>
        </div>
        <div className="w-px bg-border/50 my-1" />
        <div className="space-y-2">
          <div className="text-[10px] uppercase font-bold text-center">
            Train (Click Building)
          </div>
          <div className="flex gap-2 text-xs text-muted-foreground items-center">
            <span>Select a building to train units</span>
          </div>
        </div>
      </div>
    </div>
  );
}
