import { useState, useEffect, useCallback, useRef } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameChat } from "@/components/game-chat";
import {
  Anchor,
  X,
  RotateCcw,
  Check,
  Target,
  Waves,
  Loader2,
  GripVertical,
} from "lucide-react";
import type { ShipsBattleGame, ShipsBattleShip } from "@shared/schema";

const SHIP_CONFIGS = [
  { size: 6, name: "Dreadnought", color: "#1e40af" },
  { size: 5, name: "Carrier", color: "#4338ca" },
  { size: 4, name: "Battleship", color: "#7c3aed" },
  { size: 3, name: "Cruiser", color: "#a21caf" },
  { size: 2, name: "Destroyer", color: "#be185d" },
];

interface GridCellProps {
  x: number;
  y: number;
  isShip: boolean;
  isHit: boolean;
  isMiss: boolean;
  isSunk: boolean;
  isPreview?: boolean;
  isInvalid?: boolean;
  onClick: () => void;
  onDrop?: (shipIndex: number, isHorizontal: boolean) => void;
  disabled?: boolean;
  shipColor?: string;
}

function GridCell({
  x,
  y,
  isShip,
  isHit,
  isMiss,
  isSunk,
  isPreview,
  isInvalid,
  onClick,
  onDrop,
  disabled,
  shipColor,
}: GridCellProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  
  let bg = "bg-slate-700 hover:bg-slate-600";
  if (isDragOver) bg = "bg-blue-400/50";
  else if (isPreview && isInvalid) bg = "bg-red-500/50";
  else if (isPreview) bg = "bg-blue-500/50";
  else if (isSunk) bg = "bg-red-800";
  else if (isHit) bg = "bg-red-500";
  else if (isMiss) bg = "bg-slate-500";
  else if (isShip) bg = shipColor ? "" : "bg-blue-600";

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const data = e.dataTransfer.getData("application/json");
    if (data && onDrop) {
      const { shipIndex, isHorizontal } = JSON.parse(data);
      onDrop(shipIndex, isHorizontal);
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`w-7 h-7 border border-slate-600 ${bg} transition-colors text-xs flex items-center justify-center`}
      style={isShip && shipColor ? { backgroundColor: shipColor } : undefined}
      data-testid={`cell-${x}-${y}`}
    >
      {isHit && !isSunk && <X className="w-4 h-4 text-white" />}
      {isMiss && <span className="text-slate-400">.</span>}
    </button>
  );
}

interface DraggableShipProps {
  config: typeof SHIP_CONFIGS[0];
  index: number;
  isPlaced: boolean;
  isHorizontal: boolean;
  onRotate: () => void;
}

function DraggableShip({ config, index, isPlaced, isHorizontal, onRotate }: DraggableShipProps) {
  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ shipIndex: index, isHorizontal }));
    e.dataTransfer.effectAllowed = "move";
  };

  if (isPlaced) {
    return (
      <div className="flex items-center gap-2 p-2 bg-muted/50 rounded border opacity-50">
        <div className="flex gap-0.5">
          {Array.from({ length: config.size }).map((_, i) => (
            <div
              key={i}
              className="w-5 h-5 rounded-sm"
              style={{ backgroundColor: config.color }}
            />
          ))}
        </div>
        <span className="text-xs text-muted-foreground line-through">{config.name}</span>
        <Check className="w-4 h-4 text-green-500 ml-auto" />
      </div>
    );
  }

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className="flex items-center gap-2 p-2 bg-card rounded border cursor-grab active:cursor-grabbing hover:border-primary transition-colors"
    >
      <GripVertical className="w-4 h-4 text-muted-foreground" />
      <div className={`flex ${isHorizontal ? "flex-row" : "flex-col"} gap-0.5`}>
        {Array.from({ length: config.size }).map((_, i) => (
          <div
            key={i}
            className="w-5 h-5 rounded-sm"
            style={{ backgroundColor: config.color }}
          />
        ))}
      </div>
      <div className="flex-1">
        <span className="text-sm font-medium">{config.name}</span>
        <span className="text-xs text-muted-foreground ml-2">({config.size})</span>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-6 w-6"
        onClick={(e) => {
          e.stopPropagation();
          onRotate();
        }}
        data-testid={`button-rotate-ship-${index}`}
      >
        <RotateCcw className="w-3 h-3" />
      </Button>
    </div>
  );
}

interface GameGridProps {
  ships: ShipsBattleShip[];
  shots: Array<{ x: number; y: number; hit: boolean }>;
  gridSize: number;
  isOwnGrid: boolean;
  onCellClick: (x: number, y: number) => void;
  onCellDrop?: (x: number, y: number, shipIndex: number, isHorizontal: boolean) => void;
  previewPositions?: Array<{ x: number; y: number }>;
  isInvalidPlacement?: boolean;
  disabled?: boolean;
  hideShips?: boolean;
}

function GameGrid({
  ships,
  shots,
  gridSize,
  isOwnGrid,
  onCellClick,
  onCellDrop,
  previewPositions,
  isInvalidPlacement,
  disabled,
  hideShips,
}: GameGridProps) {
  const getShipAtPosition = (x: number, y: number) => {
    for (const ship of ships) {
      if (ship.positions.some((p) => p.x === x && p.y === y)) {
        return ship;
      }
    }
    return null;
  };

  const getShotAtPosition = (x: number, y: number) => {
    return shots.find((s) => s.x === x && s.y === y);
  };

  const isPreviewPosition = (x: number, y: number) => {
    return previewPositions?.some((p) => p.x === x && p.y === y) ?? false;
  };

  const getShipColor = (ship: ShipsBattleShip | null) => {
    if (!ship) return undefined;
    const config = SHIP_CONFIGS.find(c => c.size === ship.size);
    return config?.color;
  };

  return (
    <div className="inline-block">
      <div className="flex">
        <div className="w-7 h-7" />
        {Array.from({ length: gridSize }).map((_, i) => (
          <div
            key={i}
            className="w-7 h-7 flex items-center justify-center text-xs text-muted-foreground"
          >
            {String.fromCharCode(65 + i)}
          </div>
        ))}
      </div>
      {Array.from({ length: gridSize }).map((_, y) => (
        <div key={y} className="flex">
          <div className="w-7 h-7 flex items-center justify-center text-xs text-muted-foreground">
            {y + 1}
          </div>
          {Array.from({ length: gridSize }).map((_, x) => {
            const ship = getShipAtPosition(x, y);
            const shot = getShotAtPosition(x, y);
            const isHit = shot?.hit ?? false;
            const isMiss = shot && !shot.hit;
            const isShip = ship !== null && (isOwnGrid || !hideShips);
            const isSunk = ship?.isSunk ?? false;

            return (
              <GridCell
                key={x}
                x={x}
                y={y}
                isShip={isShip}
                isHit={isHit}
                isMiss={isMiss ?? false}
                isSunk={isSunk && (isHit || !hideShips)}
                isPreview={isPreviewPosition(x, y)}
                isInvalid={isPreviewPosition(x, y) && isInvalidPlacement}
                onClick={() => onCellClick(x, y)}
                onDrop={onCellDrop ? (shipIndex, isHorizontal) => onCellDrop(x, y, shipIndex, isHorizontal) : undefined}
                disabled={disabled}
                shipColor={isShip ? getShipColor(ship) : undefined}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function ShipsBattle() {
  const {
    shipsBattleGame,
    shipsBattleLobby,
    leaveShipsBattleLobby,
    placeShipsBattleShip,
    setShipsBattleReady,
    shootShipsBattle,
    leaveShipsBattleGame,
    rematchShipsBattle,
    currentPlayerId,
  } = useWebSocket();

  const [shipOrientations, setShipOrientations] = useState<boolean[]>(
    SHIP_CONFIGS.map(() => true)
  );
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  if (shipsBattleLobby && !shipsBattleGame) {
    return (
      <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
        <GameChat />
        <Card className="w-full max-w-md mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Anchor className="w-5 h-5" />
              Ships Battle Lobby
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center py-8 space-y-4">
            <Loader2 className="w-12 h-12 animate-spin text-primary" />
            <div className="text-center">
              <h3 className="text-lg font-medium">Looking for opponent...</h3>
              <p className="text-muted-foreground text-sm">
                Please wait while we find a worthy captain.
              </p>
            </div>
            <Button variant="destructive" onClick={() => leaveShipsBattleLobby()} data-testid="button-cancel-ships-lobby">
              Cancel Search
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!shipsBattleGame) return null;

  const isPlayer1 = shipsBattleGame.player1.id === currentPlayerId;
  const myData = isPlayer1 ? shipsBattleGame.player1 : shipsBattleGame.player2;
  const opponentData = isPlayer1
    ? shipsBattleGame.player2
    : shipsBattleGame.player1;
  const isMyTurn = shipsBattleGame.currentTurn === currentPlayerId;
  const gridSize = shipsBattleGame.gridSize;

  const getPreviewPositions = (
    x: number,
    y: number,
    size: number,
    horizontal: boolean,
  ): Array<{ x: number; y: number }> => {
    const positions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < size; i++) {
      if (horizontal) {
        positions.push({ x: x + i, y });
      } else {
        positions.push({ x, y: y + i });
      }
    }
    return positions;
  };

  const isValidPlacement = (positions: Array<{ x: number; y: number }>, excludeSize?: number): boolean => {
    for (const pos of positions) {
      if (pos.x < 0 || pos.x >= gridSize || pos.y < 0 || pos.y >= gridSize) {
        return false;
      }
      for (const ship of myData.ships) {
        if (excludeSize && ship.size === excludeSize) continue;
        if (ship.positions.some((p) => p.x === pos.x && p.y === pos.y)) {
          return false;
        }
      }
    }
    return true;
  };

  const handleCellDrop = (x: number, y: number, shipIndex: number, isHorizontal: boolean) => {
    if (shipsBattleGame.status !== "placing" || myData.isReady) return;
    
    const shipConfig = SHIP_CONFIGS[shipIndex];
    const positions = getPreviewPositions(x, y, shipConfig.size, isHorizontal);

    if (!isValidPlacement(positions, shipConfig.size)) return;

    placeShipsBattleShip(shipsBattleGame.id, shipConfig.size, positions);
  };

  const handleAttackClick = (x: number, y: number) => {
    if (shipsBattleGame.status !== "playing" || !isMyTurn) return;
    if (myData.shots.some((s) => s.x === x && s.y === y)) return;
    shootShipsBattle(shipsBattleGame.id, x, y);
  };

  const handleReadyClick = () => {
    if (myData.ships.length === SHIP_CONFIGS.length) {
      setShipsBattleReady(shipsBattleGame.id);
    }
  };

  const toggleShipOrientation = (index: number) => {
    setShipOrientations(prev => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  };

  const placedShipSizes = new Set(myData.ships.map(s => s.size));
  const isShipPlaced = (index: number) => {
    const config = SHIP_CONFIGS[index];
    let count = 0;
    for (const ship of myData.ships) {
      if (ship.size === config.size) count++;
    }
    const sameIndexConfigs = SHIP_CONFIGS.slice(0, index + 1).filter(c => c.size === config.size).length;
    return count >= sameIndexConfigs;
  };

  const myShipsSunk = myData.ships.filter((s) => s.isSunk).length;
  const opponentShipsSunk = opponentData.ships.filter((s) => s.isSunk).length;

  return (
    <div className="fixed inset-0 bg-background/95 z-50 flex items-center justify-center p-4">
      <GameChat />
      <Card className="w-full max-w-5xl mx-auto shadow-2xl">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2 border-b">
          <div className="flex items-center gap-2">
            <Anchor className="w-5 h-5 text-blue-500" />
            <CardTitle className="text-xl">Ships Battle</CardTitle>
            <Badge variant="secondary">
              vs {opponentData.name}
            </Badge>
            {shipsBattleGame.status === "finished" && (
              <Badge
                variant={
                  shipsBattleGame.winner === currentPlayerId
                    ? "default"
                    : "destructive"
                }
              >
                {shipsBattleGame.winner === currentPlayerId
                  ? "Victory!"
                  : "Defeat"}
              </Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => leaveShipsBattleGame(shipsBattleGame.id)}
            data-testid="button-leave-ships"
          >
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>
        <CardContent className="pt-4">
          {shipsBattleGame.status === "placing" && (
            <div className="flex flex-col lg:flex-row gap-6">
              <div className="lg:w-64 space-y-3">
                <h3 className="font-semibold text-sm">Drag Ships to Grid</h3>
                <p className="text-xs text-muted-foreground">
                  Drag each ship onto the grid. Click the rotate button to change orientation.
                </p>
                <div className="space-y-2">
                  {SHIP_CONFIGS.map((config, index) => (
                    <DraggableShip
                      key={index}
                      config={config}
                      index={index}
                      isPlaced={isShipPlaced(index)}
                      isHorizontal={shipOrientations[index]}
                      onRotate={() => toggleShipOrientation(index)}
                    />
                  ))}
                </div>
                {myData.ships.length === SHIP_CONFIGS.length && !myData.isReady && (
                  <Button
                    onClick={handleReadyClick}
                    className="w-full"
                    data-testid="button-ready-ships"
                  >
                    <Check className="w-4 h-4 mr-1" /> Ready
                  </Button>
                )}
                {myData.isReady && (
                  <Badge variant="secondary" className="w-full justify-center py-2">
                    Waiting for opponent...
                  </Badge>
                )}
              </div>
              <div className="flex-1 flex justify-center">
                <div>
                  <h4 className="font-semibold mb-2 text-center">Your Fleet</h4>
                  <GameGrid
                    ships={myData.ships}
                    shots={[]}
                    gridSize={gridSize}
                    isOwnGrid={true}
                    onCellClick={() => {}}
                    onCellDrop={handleCellDrop}
                    disabled={myData.isReady}
                  />
                  <div className="text-center text-sm text-muted-foreground mt-2">
                    Ships placed: {myData.ships.length}/{SHIP_CONFIGS.length}
                  </div>
                </div>
              </div>
            </div>
          )}

          {shipsBattleGame.status === "playing" && (
            <div className="space-y-4">
              <div className="text-center">
                <Badge
                  variant={isMyTurn ? "default" : "secondary"}
                  className="text-lg px-4 py-1"
                >
                  {isMyTurn ? "Your Turn - Attack!" : "Opponent's Turn"}
                </Badge>
              </div>
              <div className="flex flex-col lg:flex-row gap-6 justify-center items-center">
                <div className="text-center">
                  <h4 className="font-semibold mb-2 flex items-center justify-center gap-2">
                    <Target className="w-4 h-4" /> Enemy Waters
                  </h4>
                  <GameGrid
                    ships={opponentData.ships}
                    shots={myData.shots}
                    gridSize={gridSize}
                    isOwnGrid={false}
                    onCellClick={handleAttackClick}
                    disabled={!isMyTurn}
                    hideShips={true}
                  />
                  <div className="text-sm mt-2">
                    Ships sunk: {opponentShipsSunk}/{SHIP_CONFIGS.length}
                  </div>
                </div>
                <div className="text-center">
                  <h4 className="font-semibold mb-2 flex items-center justify-center gap-2">
                    <Waves className="w-4 h-4" /> Your Fleet
                  </h4>
                  <GameGrid
                    ships={myData.ships}
                    shots={opponentData.shots}
                    gridSize={gridSize}
                    isOwnGrid={true}
                    onCellClick={() => {}}
                    disabled={true}
                  />
                  <div className="text-sm mt-2">
                    Ships lost: {myShipsSunk}/{SHIP_CONFIGS.length}
                  </div>
                </div>
              </div>
            </div>
          )}

          {shipsBattleGame.status === "finished" && (
            <div className="text-center space-y-4">
              <div className="text-2xl font-bold">
                {shipsBattleGame.winner === currentPlayerId ? (
                  <span className="text-green-500">You Won!</span>
                ) : (
                  <span className="text-red-500">You Lost!</span>
                )}
              </div>
              <p>Winner: {shipsBattleGame.winnerName}</p>
              <div className="flex justify-center gap-4">
                <Button
                  onClick={() => rematchShipsBattle(shipsBattleGame.id)}
                  data-testid="button-rematch-ships"
                >
                  Rematch
                </Button>
                <Button
                  variant="outline"
                  onClick={() => leaveShipsBattleGame(shipsBattleGame.id)}
                  data-testid="button-leave-ships-final"
                >
                  Leave
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
