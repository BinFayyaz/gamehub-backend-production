import { useState, useEffect } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameChat } from "@/components/game-chat";
import { Anchor, X, RotateCcw, Check, Target, Waves, Loader2, ArrowLeft, GripVertical } from "lucide-react";
import type { BattleshipGame, BattleshipShip } from "@shared/schema";

const SHIP_CONFIGS = [
  { size: 5, name: "Carrier" },
  { size: 4, name: "Battleship" },
  { size: 3, name: "Cruiser" },
  { size: 3, name: "Submarine" },
  { size: 2, name: "Destroyer" },
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
  disabled?: boolean;
}

function GridCell({ x, y, isShip, isHit, isMiss, isSunk, isPreview, isInvalid, onClick, disabled }: GridCellProps) {
  let bg = "bg-slate-700 hover:bg-slate-600";
  if (isPreview && isInvalid) bg = "bg-red-500/50";
  else if (isPreview) bg = "bg-blue-500/50";
  else if (isSunk) bg = "bg-red-800";
  else if (isHit) bg = "bg-red-500";
  else if (isMiss) bg = "bg-slate-500";
  else if (isShip) bg = "bg-blue-600";

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-7 h-7 border border-slate-600 ${bg} transition-colors text-xs flex items-center justify-center`}
      data-testid={`cell-${x}-${y}`}
    >
      {isHit && !isSunk && <X className="w-4 h-4 text-white" />}
      {isMiss && <span className="text-slate-400">.</span>}
    </button>
  );
}

interface GameGridProps {
  ships: BattleshipShip[];
  shots: Array<{ x: number; y: number; hit: boolean }>;
  gridSize: number;
  isOwnGrid: boolean;
  onCellClick: (x: number, y: number) => void;
  previewPositions?: Array<{ x: number; y: number }>;
  isInvalidPlacement?: boolean;
  disabled?: boolean;
  hideShips?: boolean;
}

function GameGrid({ ships, shots, gridSize, isOwnGrid, onCellClick, previewPositions, isInvalidPlacement, disabled, hideShips }: GameGridProps) {
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

  return (
    <div className="inline-block">
      <div className="flex">
        <div className="w-7 h-7" />
        {Array.from({ length: gridSize }).map((_, i) => (
          <div key={i} className="w-7 h-7 flex items-center justify-center text-xs text-muted-foreground font-medium">
            {String.fromCharCode(65 + i)}
          </div>
        ))}
      </div>
      {Array.from({ length: gridSize }).map((_, y) => (
        <div key={y} className="flex">
          <div className="w-7 h-7 flex items-center justify-center text-xs text-muted-foreground font-medium">
            {y + 1}
          </div>
          {Array.from({ length: gridSize }).map((_, x) => {
            const ship = getShipAtPosition(x, y);
            const shot = getShotAtPosition(x, y);
            const isPreview = isPreviewPosition(x, y);
            
            return (
              <GridCell
                key={`${x}-${y}`}
                x={x}
                y={y}
                isShip={!hideShips && ship !== null}
                isHit={shot?.hit ?? false}
                isMiss={shot !== undefined && !shot.hit}
                isSunk={ship?.isSunk ?? false}
                isPreview={isPreview}
                isInvalid={isPreview && isInvalidPlacement}
                onClick={() => onCellClick(x, y)}
                disabled={disabled}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function BattleshipLobby() {
  const { battleshipLobby, currentPlayerId, leaveBattleshipLobby, startBattleshipGame } = useWebSocket();

  if (!battleshipLobby) return null;

  const isHost = battleshipLobby.hostId === currentPlayerId;
  const canStart = battleshipLobby.players.length >= 2;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <GameChat />
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Anchor className="w-5 h-5" />
              Battleship Lobby
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={leaveBattleshipLobby} data-testid="button-leave-battleship-lobby">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Players ({battleshipLobby.players.length}/2)</h3>
            {battleshipLobby.players.map((player) => (
              <div key={player.id} className="flex items-center justify-between p-2 bg-muted rounded">
                <span>{player.name}</span>
                {player.id === battleshipLobby.hostId && <Badge>Host</Badge>}
              </div>
            ))}
          </div>

          {battleshipLobby.players.length < 2 && (
            <div className="flex items-center justify-center p-4 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Waiting for opponent...
            </div>
          )}

          {isHost && (
            <Button
              className="w-full"
              onClick={() => startBattleshipGame(battleshipLobby.id)}
              disabled={!canStart}
              data-testid="button-start-battleship"
            >
              Start Game
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function BattleshipGame() {
  const { battleshipGame, currentPlayerId, placeBattleshipShip, readyBattleship, shootBattleship, leaveBattleshipGame, sendBattleshipChat } = useWebSocket();
  const [selectedShipIndex, setSelectedShipIndex] = useState<number | null>(null);
  const [isHorizontal, setIsHorizontal] = useState(true);
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number } | null>(null);

  if (!battleshipGame) return null;

  const myPlayer = battleshipGame.players.find((p) => p.id === currentPlayerId);
  const opponent = battleshipGame.players.find((p) => p.id !== currentPlayerId);
  
  if (!myPlayer || !opponent) return null;

  const isMyTurn = battleshipGame.currentTurn === currentPlayerId;
  const isSetup = battleshipGame.status === "setup";
  const isPlaying = battleshipGame.status === "playing";
  const isFinished = battleshipGame.status === "finished";

  const placedShipSizes = myPlayer.ships.map((s) => s.size);
  const unplacedShips = SHIP_CONFIGS.filter((config) => {
    const placed = placedShipSizes.filter((s) => s === config.size).length;
    const total = SHIP_CONFIGS.filter((c) => c.size === config.size).length;
    return placed < total;
  });

  const getPreviewPositions = (startX: number, startY: number) => {
    if (selectedShipIndex === null) return [];
    const size = unplacedShips[selectedShipIndex]?.size ?? 0;
    const positions: Array<{ x: number; y: number }> = [];
    for (let i = 0; i < size; i++) {
      positions.push({
        x: isHorizontal ? startX + i : startX,
        y: isHorizontal ? startY : startY + i,
      });
    }
    return positions;
  };

  const isValidPlacement = (positions: Array<{ x: number; y: number }>) => {
    return positions.every((p) => {
      if (p.x < 0 || p.x >= battleshipGame.gridSize || p.y < 0 || p.y >= battleshipGame.gridSize) return false;
      return !myPlayer.ships.some((ship) => ship.positions.some((sp) => sp.x === p.x && sp.y === p.y));
    });
  };

  const handleSetupCellClick = (x: number, y: number) => {
    if (selectedShipIndex === null) return;
    const positions = getPreviewPositions(x, y);
    if (isValidPlacement(positions)) {
      placeBattleshipShip(battleshipGame.id, unplacedShips[selectedShipIndex].size, positions);
      setSelectedShipIndex(null);
    }
  };

  const handleBattleCellClick = (x: number, y: number) => {
    if (!isMyTurn || !isPlaying) return;
    if (opponent.shots?.some((s) => s.x === x && s.y === y)) return;
    shootBattleship(battleshipGame.id, x, y);
  };

  const allShipsPlaced = unplacedShips.length === 0;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] overflow-auto">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Anchor className="w-5 h-5" />
              Battleship
            </CardTitle>
            <div className="flex items-center gap-2">
              {isPlaying && (
                <Badge variant={isMyTurn ? "default" : "secondary"}>
                  {isMyTurn ? "Your Turn" : `${opponent.name}'s Turn`}
                </Badge>
              )}
              <Button variant="ghost" size="icon" onClick={() => leaveBattleshipGame(battleshipGame.id)} data-testid="button-leave-battleship">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isFinished && (
            <div className="text-center p-4 bg-muted rounded">
              <h3 className="text-xl font-bold mb-2">
                {battleshipGame.winner === currentPlayerId ? "Victory!" : "Defeat!"}
              </h3>
              <p>{battleshipGame.winnerName} wins!</p>
            </div>
          )}

          {isSetup && (
            <div className="space-y-4">
              <h3 className="font-medium">Place Your Ships</h3>
              <div className="flex flex-wrap gap-2">
                {unplacedShips.map((ship, idx) => (
                  <Button
                    key={`${ship.name}-${idx}`}
                    variant={selectedShipIndex === idx ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedShipIndex(idx)}
                    data-testid={`button-select-ship-${idx}`}
                  >
                    {ship.name} ({ship.size})
                  </Button>
                ))}
              </div>
              {selectedShipIndex !== null && (
                <Button variant="outline" size="sm" onClick={() => setIsHorizontal(!isHorizontal)} data-testid="button-rotate-ship">
                  <RotateCcw className="w-4 h-4 mr-2" />
                  {isHorizontal ? "Horizontal" : "Vertical"}
                </Button>
              )}
              <GameGrid
                ships={myPlayer.ships}
                shots={[]}
                gridSize={battleshipGame.gridSize}
                isOwnGrid={true}
                onCellClick={handleSetupCellClick}
                previewPositions={previewPos ? getPreviewPositions(previewPos.x, previewPos.y) : undefined}
                isInvalidPlacement={previewPos ? !isValidPlacement(getPreviewPositions(previewPos.x, previewPos.y)) : false}
                disabled={selectedShipIndex === null}
              />
              {allShipsPlaced && !myPlayer.isReady && (
                <Button className="w-full" onClick={() => readyBattleship(battleshipGame.id)} data-testid="button-ready-battleship">
                  <Check className="w-4 h-4 mr-2" />
                  Ready to Battle
                </Button>
              )}
              {myPlayer.isReady && (
                <div className="flex items-center justify-center p-4 text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Waiting for opponent...
                </div>
              )}
            </div>
          )}

          {isPlaying && (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Your Fleet</h4>
                <GameGrid
                  ships={myPlayer.ships}
                  shots={myPlayer.shots?.filter((s) => opponent.ships.some((ship) => ship.positions.some((p) => p.x === s.x && p.y === s.y))) ?? []}
                  gridSize={battleshipGame.gridSize}
                  isOwnGrid={true}
                  onCellClick={() => {}}
                  disabled={true}
                />
              </div>
              <div>
                <h4 className="font-medium mb-2">Enemy Waters</h4>
                <GameGrid
                  ships={opponent.ships.filter((s) => s.isSunk)}
                  shots={myPlayer.shots}
                  gridSize={battleshipGame.gridSize}
                  isOwnGrid={false}
                  onCellClick={handleBattleCellClick}
                  disabled={!isMyTurn}
                  hideShips={false}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      <GameChat />
    </div>
  );
}
