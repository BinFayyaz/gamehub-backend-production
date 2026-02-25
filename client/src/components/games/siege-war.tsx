import { useState, useEffect, useCallback, useRef } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameChat } from "@/components/game-chat";
import { Swords, ArrowLeft, Loader2, Shield, Users, Timer, Trophy, Castle } from "lucide-react";
import type { SiegeWarGame, SiegeWarTeam, SiegeWarUnitType } from "@shared/schema";

const UNIT_COSTS: Record<SiegeWarUnitType, number> = {
  infantry: 10,
  archer: 15,
  cavalry: 25,
  siege_tower: 50,
  catapult: 40,
};

const UNIT_NAMES: Record<SiegeWarUnitType, string> = {
  infantry: "Infantry",
  archer: "Archer",
  cavalry: "Cavalry",
  siege_tower: "Siege Tower",
  catapult: "Catapult",
};

export function SiegeWarLobby() {
  const { siegeWarLobby, currentPlayerId, leaveSiegeWarLobby, setSiegeWarTeam, setSiegeWarReady, startSiegeWarGame } = useWebSocket();

  if (!siegeWarLobby) return null;

  const isHost = siegeWarLobby.hostId === currentPlayerId;
  const myPlayer = siegeWarLobby.players.find((p) => p.id === currentPlayerId);
  const attackers = siegeWarLobby.players.filter((p) => p.team === "attackers");
  const defenders = siegeWarLobby.players.filter((p) => p.team === "defenders");
  const allReady = siegeWarLobby.players.every((p) => p.isReady);
  const hasEnoughPlayers = siegeWarLobby.players.length >= 2;
  const hasBalancedTeams = attackers.length > 0 && defenders.length > 0;
  const canStart = hasEnoughPlayers && hasBalancedTeams && allReady;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <GameChat />
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Swords className="w-5 h-5" />
              Siege War Lobby
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={leaveSiegeWarLobby} data-testid="button-leave-siegewar-lobby">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-orange-500 flex items-center gap-2">
                <Swords className="w-4 h-4" /> Attackers ({attackers.length})
              </h3>
              <div className="space-y-1 min-h-24 p-2 bg-orange-500/10 rounded border border-orange-500/30">
                {attackers.map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-1 bg-orange-500/20 rounded text-sm">
                    <span>{player.name}</span>
                    <div className="flex items-center gap-1">
                      {player.id === siegeWarLobby.hostId && <Badge variant="outline" className="text-xs">Host</Badge>}
                      {player.isReady && <Badge className="text-xs bg-green-500">Ready</Badge>}
                    </div>
                  </div>
                ))}
                {myPlayer?.team !== "attackers" && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2 border-orange-500/50 text-orange-500"
                    onClick={() => setSiegeWarTeam(siegeWarLobby.id, "attackers")}
                    data-testid="button-join-attackers"
                  >
                    Join Attackers
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-cyan-500 flex items-center gap-2">
                <Shield className="w-4 h-4" /> Defenders ({defenders.length})
              </h3>
              <div className="space-y-1 min-h-24 p-2 bg-cyan-500/10 rounded border border-cyan-500/30">
                {defenders.map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-1 bg-cyan-500/20 rounded text-sm">
                    <span>{player.name}</span>
                    <div className="flex items-center gap-1">
                      {player.id === siegeWarLobby.hostId && <Badge variant="outline" className="text-xs">Host</Badge>}
                      {player.isReady && <Badge className="text-xs bg-green-500">Ready</Badge>}
                    </div>
                  </div>
                ))}
                {myPlayer?.team !== "defenders" && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2 border-cyan-500/50 text-cyan-500"
                    onClick={() => setSiegeWarTeam(siegeWarLobby.id, "defenders")}
                    data-testid="button-join-defenders"
                  >
                    Join Defenders
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {!myPlayer?.isReady ? (
              <Button className="flex-1" onClick={() => setSiegeWarReady(siegeWarLobby.id, true)} data-testid="button-ready-siegewar">
                Ready
              </Button>
            ) : (
              <Button variant="outline" className="flex-1" onClick={() => setSiegeWarReady(siegeWarLobby.id, false)} data-testid="button-unready-siegewar">
                Not Ready
              </Button>
            )}
            {isHost && (
              <Button className="flex-1" onClick={() => startSiegeWarGame(siegeWarLobby.id)} disabled={!canStart} data-testid="button-start-siegewar">
                Start Game
              </Button>
            )}
          </div>

          {!hasBalancedTeams && (
            <p className="text-sm text-muted-foreground text-center">Both teams need at least one player</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function SiegeWarGameComponent() {
  const { siegeWarGame, currentPlayerId, spawnSiegeWarUnit, moveSiegeWarUnits, attackSiegeWar, leaveSiegeWarGame, sendSiegeWarChat } = useWebSocket();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [selectedUnits, setSelectedUnits] = useState<string[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !siegeWarGame) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#2d3436";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#4a6741";
    ctx.fillRect(0, 0, siegeWarGame.mapWidth * 0.65, siegeWarGame.mapHeight);

    ctx.fillStyle = "#a0826d";
    ctx.fillRect(siegeWarGame.mapWidth * 0.65, 0, siegeWarGame.mapWidth * 0.35, siegeWarGame.mapHeight);

    siegeWarGame.buildings.forEach((building) => {
      ctx.fillStyle = building.team === "defenders" ? "#4a5568" : "#8b4513";
      ctx.fillRect(building.x - building.width / 2, building.y - building.height / 2, building.width, building.height);
      
      if (building.type === "tower") {
        ctx.fillStyle = "#2d3748";
        ctx.fillRect(building.x - 10, building.y - 30, 20, 30);
      }

      const healthPercent = building.health / building.maxHealth;
      ctx.fillStyle = "#333";
      ctx.fillRect(building.x - building.width / 2, building.y + building.height / 2 + 2, building.width, 4);
      ctx.fillStyle = healthPercent > 0.5 ? "#48bb78" : healthPercent > 0.25 ? "#ecc94b" : "#f56565";
      ctx.fillRect(building.x - building.width / 2, building.y + building.height / 2 + 2, building.width * healthPercent, 4);
    });

    ctx.fillStyle = "#6b4423";
    ctx.fillRect(siegeWarGame.mapWidth - 100, siegeWarGame.mapHeight / 2 - 50, 80, 100);
    ctx.fillStyle = "#8b5a2b";
    ctx.beginPath();
    ctx.moveTo(siegeWarGame.mapWidth - 100, siegeWarGame.mapHeight / 2 - 50);
    ctx.lineTo(siegeWarGame.mapWidth - 60, siegeWarGame.mapHeight / 2 - 80);
    ctx.lineTo(siegeWarGame.mapWidth - 20, siegeWarGame.mapHeight / 2 - 50);
    ctx.closePath();
    ctx.fill();

    const castleHealthPercent = siegeWarGame.castleHealth / siegeWarGame.castleMaxHealth;
    ctx.fillStyle = "#333";
    ctx.fillRect(siegeWarGame.mapWidth - 100, siegeWarGame.mapHeight / 2 + 55, 80, 6);
    ctx.fillStyle = castleHealthPercent > 0.5 ? "#48bb78" : castleHealthPercent > 0.25 ? "#ecc94b" : "#f56565";
    ctx.fillRect(siegeWarGame.mapWidth - 100, siegeWarGame.mapHeight / 2 + 55, 80 * castleHealthPercent, 6);

    siegeWarGame.units.forEach((unit) => {
      const isSelected = selectedUnits.includes(unit.id);
      const isMyUnit = siegeWarGame.players.find((p) => p.id === currentPlayerId)?.team === unit.team;
      
      ctx.fillStyle = unit.team === "attackers" ? "#e57373" : "#64b5f6";
      
      if (unit.type === "infantry") {
        ctx.beginPath();
        ctx.arc(unit.x, unit.y, 8, 0, Math.PI * 2);
        ctx.fill();
      } else if (unit.type === "archer") {
        ctx.fillRect(unit.x - 6, unit.y - 6, 12, 12);
      } else if (unit.type === "cavalry") {
        ctx.beginPath();
        ctx.moveTo(unit.x, unit.y - 10);
        ctx.lineTo(unit.x + 10, unit.y + 10);
        ctx.lineTo(unit.x - 10, unit.y + 10);
        ctx.closePath();
        ctx.fill();
      } else if (unit.type === "siege_tower") {
        ctx.fillRect(unit.x - 15, unit.y - 20, 30, 40);
      } else if (unit.type === "catapult") {
        ctx.fillRect(unit.x - 12, unit.y - 8, 24, 16);
        ctx.fillStyle = "#5d4037";
        ctx.fillRect(unit.x - 5, unit.y - 15, 10, 10);
      }

      if (isSelected) {
        ctx.strokeStyle = "#ffd700";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(unit.x, unit.y, 15, 0, Math.PI * 2);
        ctx.stroke();
      }
    });
  }, [siegeWarGame, selectedUnits, currentPlayerId]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!siegeWarGame || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = siegeWarGame.mapWidth / rect.width;
    const scaleY = siegeWarGame.mapHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const myPlayer = siegeWarGame.players.find((p) => p.id === currentPlayerId);
    if (!myPlayer) return;

    const myUnits = siegeWarGame.units.filter((u) => u.team === myPlayer.team);
    const clickedUnit = myUnits.find((u) => Math.hypot(u.x - x, u.y - y) < 15);

    if (clickedUnit) {
      if (e.shiftKey) {
        setSelectedUnits((prev) => 
          prev.includes(clickedUnit.id) 
            ? prev.filter((id) => id !== clickedUnit.id)
            : [...prev, clickedUnit.id]
        );
      } else {
        setSelectedUnits([clickedUnit.id]);
      }
    } else if (selectedUnits.length > 0) {
      moveSiegeWarUnits(siegeWarGame.id, selectedUnits, x, y);
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (!siegeWarGame || !canvasRef.current || selectedUnits.length === 0) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = siegeWarGame.mapWidth / rect.width;
    const scaleY = siegeWarGame.mapHeight / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const myPlayer = siegeWarGame.players.find((p) => p.id === currentPlayerId);
    if (!myPlayer) return;

    const enemyTeam = myPlayer.team === "attackers" ? "defenders" : "attackers";
    const enemyBuilding = siegeWarGame.buildings.find((b) => 
      b.team === enemyTeam && 
      x >= b.x - b.width / 2 && x <= b.x + b.width / 2 &&
      y >= b.y - b.height / 2 && y <= b.y + b.height / 2
    );

    if (enemyBuilding) {
      attackSiegeWar(siegeWarGame.id, selectedUnits, enemyBuilding.id);
    }
  };

  if (!siegeWarGame) return null;

  const myPlayer = siegeWarGame.players.find((p) => p.id === currentPlayerId);
  const isFinished = siegeWarGame.status === "finished";

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-5xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Swords className="w-5 h-5" />
              Siege War
            </CardTitle>
            <div className="flex items-center gap-4">
              <Badge variant="outline" className="flex items-center gap-1">
                <Castle className="w-3 h-3" />
                Castle: {siegeWarGame.castleHealth}/{siegeWarGame.castleMaxHealth}
              </Badge>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Timer className="w-3 h-3" />
                {Math.floor(siegeWarGame.gameTimeRemaining / 60)}:{String(siegeWarGame.gameTimeRemaining % 60).padStart(2, "0")}
              </Badge>
              <Button variant="ghost" size="icon" onClick={() => leaveSiegeWarGame(siegeWarGame.id)} data-testid="button-leave-siegewar">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isFinished && (
            <div className={`text-center p-4 rounded ${siegeWarGame.winner === myPlayer?.team ? "bg-green-500/20" : "bg-red-500/20"}`}>
              <Trophy className="w-8 h-8 mx-auto mb-2" />
              <h3 className="text-xl font-bold">
                {siegeWarGame.winner === myPlayer?.team ? "Victory!" : "Defeat!"}
              </h3>
              <p className="capitalize">{siegeWarGame.winner} win!</p>
            </div>
          )}

          {myPlayer && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Badge variant="outline">Gold: {myPlayer.gold}</Badge>
                <Badge variant="outline" className={myPlayer.team === "attackers" ? "bg-orange-500/20" : "bg-cyan-500/20"}>
                  {myPlayer.team === "attackers" ? "Attacker" : "Defender"}
                </Badge>
              </div>
              <div className="flex gap-1 flex-wrap">
                {(Object.keys(UNIT_COSTS) as SiegeWarUnitType[]).map((unitType) => (
                  <Button
                    key={unitType}
                    size="sm"
                    variant="outline"
                    onClick={() => spawnSiegeWarUnit(siegeWarGame.id, unitType)}
                    disabled={myPlayer.gold < UNIT_COSTS[unitType]}
                    data-testid={`button-spawn-${unitType}`}
                  >
                    {UNIT_NAMES[unitType]} ({UNIT_COSTS[unitType]}g)
                  </Button>
                ))}
              </div>
            </div>
          )}

          <div className="relative">
            <canvas
              ref={canvasRef}
              width={siegeWarGame.mapWidth}
              height={siegeWarGame.mapHeight}
              className="w-full border rounded cursor-crosshair"
              style={{ aspectRatio: `${siegeWarGame.mapWidth}/${siegeWarGame.mapHeight}` }}
              onClick={handleCanvasClick}
              onContextMenu={handleContextMenu}
            />
          </div>

          <div className="text-sm text-muted-foreground text-center">
            Click to select units, click elsewhere to move. Right-click on buildings to attack.
          </div>
        </CardContent>
      </Card>
      <GameChat />
    </div>
  );
}
