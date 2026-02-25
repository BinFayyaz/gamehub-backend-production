import { useState, useEffect, useCallback, useRef } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { GameChat } from "@/components/game-chat";
import { Flag, ArrowLeft, Loader2, Users, Timer, Trophy } from "lucide-react";
import type { CTFGame, CTFTeam } from "@shared/schema";

export function CTFLobby() {
  const { ctfLobby, currentPlayerId, leaveCTFLobby, setCTFTeam, setCTFReady, startCTFGame } = useWebSocket();

  if (!ctfLobby) return null;

  const isHost = ctfLobby.hostId === currentPlayerId;
  const myPlayer = ctfLobby.players.find((p) => p.id === currentPlayerId);
  const redTeam = ctfLobby.players.filter((p) => p.team === "red");
  const blueTeam = ctfLobby.players.filter((p) => p.team === "blue");
  const allReady = ctfLobby.players.every((p) => p.isReady);
  const hasEnoughPlayers = ctfLobby.players.length >= 2;
  const hasBalancedTeams = redTeam.length > 0 && blueTeam.length > 0;
  const canStart = hasEnoughPlayers && hasBalancedTeams && allReady;

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <GameChat />
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5" />
              Capture the Flag Lobby
            </CardTitle>
            <Button variant="ghost" size="icon" onClick={leaveCTFLobby} data-testid="button-leave-ctf-lobby">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-red-500 flex items-center gap-2">
                <Flag className="w-4 h-4" /> Red Team ({redTeam.length})
              </h3>
              <div className="space-y-1 min-h-24 p-2 bg-red-500/10 rounded border border-red-500/30">
                {redTeam.map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-1 bg-red-500/20 rounded text-sm">
                    <span>{player.name}</span>
                    <div className="flex items-center gap-1">
                      {player.id === ctfLobby.hostId && <Badge variant="outline" className="text-xs">Host</Badge>}
                      {player.isReady && <Badge className="text-xs bg-green-500">Ready</Badge>}
                    </div>
                  </div>
                ))}
                {myPlayer?.team !== "red" && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2 border-red-500/50 text-red-500"
                    onClick={() => setCTFTeam(ctfLobby.id, "red")}
                    data-testid="button-join-red-team"
                  >
                    Join Red Team
                  </Button>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-medium text-blue-500 flex items-center gap-2">
                <Flag className="w-4 h-4" /> Blue Team ({blueTeam.length})
              </h3>
              <div className="space-y-1 min-h-24 p-2 bg-blue-500/10 rounded border border-blue-500/30">
                {blueTeam.map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-1 bg-blue-500/20 rounded text-sm">
                    <span>{player.name}</span>
                    <div className="flex items-center gap-1">
                      {player.id === ctfLobby.hostId && <Badge variant="outline" className="text-xs">Host</Badge>}
                      {player.isReady && <Badge className="text-xs bg-green-500">Ready</Badge>}
                    </div>
                  </div>
                ))}
                {myPlayer?.team !== "blue" && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full mt-2 border-blue-500/50 text-blue-500"
                    onClick={() => setCTFTeam(ctfLobby.id, "blue")}
                    data-testid="button-join-blue-team"
                  >
                    Join Blue Team
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            {!myPlayer?.isReady ? (
              <Button className="flex-1" onClick={() => setCTFReady(ctfLobby.id, true)} data-testid="button-ready-ctf">
                Ready
              </Button>
            ) : (
              <Button variant="outline" className="flex-1" onClick={() => setCTFReady(ctfLobby.id, false)} data-testid="button-unready-ctf">
                Not Ready
              </Button>
            )}
            {isHost && (
              <Button className="flex-1" onClick={() => startCTFGame(ctfLobby.id)} disabled={!canStart} data-testid="button-start-ctf">
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

export function CTFGameComponent() {
  const { ctfGame, currentPlayerId, moveCTF, tagCTF, leaveCTFGame, sendCTFChat } = useWebSocket();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [keys, setKeys] = useState<Set<string>>(new Set());

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    setKeys((prev) => new Set(prev).add(e.key.toLowerCase()));
  }, []);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    setKeys((prev) => {
      const next = new Set(prev);
      next.delete(e.key.toLowerCase());
      return next;
    });
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => {
    if (!ctfGame || ctfGame.status !== "playing") return;

    const interval = setInterval(() => {
      let dx = 0;
      let dy = 0;
      const speed = 5;

      if (keys.has("w") || keys.has("arrowup")) dy -= speed;
      if (keys.has("s") || keys.has("arrowdown")) dy += speed;
      if (keys.has("a") || keys.has("arrowleft")) dx -= speed;
      if (keys.has("d") || keys.has("arrowright")) dx += speed;

      if (dx !== 0 || dy !== 0) {
        const myPlayer = ctfGame.players.find((p) => p.id === currentPlayerId);
        if (myPlayer && !myPlayer.isStunned) {
          const newX = Math.max(10, Math.min(ctfGame.mapWidth - 10, myPlayer.x + dx));
          const newY = Math.max(10, Math.min(ctfGame.mapHeight - 10, myPlayer.y + dy));
          moveCTF(ctfGame.id, newX, newY);
        }
      }
    }, 50);

    return () => clearInterval(interval);
  }, [ctfGame, currentPlayerId, keys, moveCTF]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ctfGame) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#1a1a2e";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(ctfGame.mapWidth / 2, 0);
    ctx.lineTo(ctfGame.mapWidth / 2, ctfGame.mapHeight);
    ctx.stroke();

    ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
    ctx.fillRect(0, 0, ctfGame.mapWidth / 2, ctfGame.mapHeight);
    ctx.fillStyle = "rgba(0, 0, 255, 0.1)";
    ctx.fillRect(ctfGame.mapWidth / 2, 0, ctfGame.mapWidth / 2, ctfGame.mapHeight);

    if (!ctfGame.redFlagCarrier) {
      ctx.fillStyle = "#ff4444";
      ctx.beginPath();
      ctx.moveTo(ctfGame.redFlagPosition.x, ctfGame.redFlagPosition.y - 20);
      ctx.lineTo(ctfGame.redFlagPosition.x + 15, ctfGame.redFlagPosition.y - 10);
      ctx.lineTo(ctfGame.redFlagPosition.x, ctfGame.redFlagPosition.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(ctfGame.redFlagPosition.x - 2, ctfGame.redFlagPosition.y - 20, 4, 25);
    }

    if (!ctfGame.blueFlagCarrier) {
      ctx.fillStyle = "#4444ff";
      ctx.beginPath();
      ctx.moveTo(ctfGame.blueFlagPosition.x, ctfGame.blueFlagPosition.y - 20);
      ctx.lineTo(ctfGame.blueFlagPosition.x - 15, ctfGame.blueFlagPosition.y - 10);
      ctx.lineTo(ctfGame.blueFlagPosition.x, ctfGame.blueFlagPosition.y);
      ctx.closePath();
      ctx.fill();
      ctx.fillRect(ctfGame.blueFlagPosition.x - 2, ctfGame.blueFlagPosition.y - 20, 4, 25);
    }

    ctfGame.players.forEach((player) => {
      const isMe = player.id === currentPlayerId;
      ctx.fillStyle = player.team === "red" ? "#ff6666" : "#6666ff";
      
      if (player.isStunned) {
        ctx.globalAlpha = 0.5;
      }

      ctx.beginPath();
      ctx.arc(player.x, player.y, isMe ? 12 : 10, 0, Math.PI * 2);
      ctx.fill();

      if (player.hasFlag) {
        ctx.fillStyle = player.team === "red" ? "#4444ff" : "#ff4444";
        ctx.beginPath();
        ctx.moveTo(player.x, player.y - 15);
        ctx.lineTo(player.x + (player.team === "red" ? -10 : 10), player.y - 8);
        ctx.lineTo(player.x, player.y);
        ctx.closePath();
        ctx.fill();
      }

      ctx.globalAlpha = 1;

      ctx.fillStyle = "#fff";
      ctx.font = "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(player.name, player.x, player.y - 15);
    });
  }, [ctfGame, currentPlayerId]);

  if (!ctfGame) return null;

  const myPlayer = ctfGame.players.find((p) => p.id === currentPlayerId);
  const isFinished = ctfGame.status === "finished";

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!myPlayer || myPlayer.isStunned) return;

    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;

    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    ctfGame.players.forEach((player) => {
      if (player.id !== currentPlayerId && player.team !== myPlayer.team) {
        const dist = Math.hypot(player.x - x, player.y - y);
        if (dist < 20) {
          tagCTF(ctfGame.id, player.id);
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5" />
              Capture the Flag
            </CardTitle>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="bg-red-500/20 text-red-500 border-red-500/50">
                  Red: {ctfGame.redScore}
                </Badge>
                <Badge variant="outline" className="bg-blue-500/20 text-blue-500 border-blue-500/50">
                  Blue: {ctfGame.blueScore}
                </Badge>
              </div>
              <Badge variant="secondary" className="flex items-center gap-1">
                <Timer className="w-3 h-3" />
                {Math.floor(ctfGame.gameTimeRemaining / 60)}:{String(ctfGame.gameTimeRemaining % 60).padStart(2, "0")}
              </Badge>
              <Button variant="ghost" size="icon" onClick={() => leaveCTFGame(ctfGame.id)} data-testid="button-leave-ctf">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isFinished && (
            <div className={`text-center p-4 rounded ${ctfGame.winner === myPlayer?.team ? "bg-green-500/20" : "bg-red-500/20"}`}>
              <Trophy className="w-8 h-8 mx-auto mb-2" />
              <h3 className="text-xl font-bold">
                {ctfGame.winner === myPlayer?.team ? "Victory!" : "Defeat!"}
              </h3>
              <p className="capitalize">{ctfGame.winner} team wins!</p>
            </div>
          )}

          <div className="relative">
            <canvas
              ref={canvasRef}
              width={ctfGame.mapWidth}
              height={ctfGame.mapHeight}
              className="w-full border rounded cursor-crosshair"
              style={{ aspectRatio: `${ctfGame.mapWidth}/${ctfGame.mapHeight}` }}
              onClick={handleCanvasClick}
            />
          </div>

          <div className="text-sm text-muted-foreground text-center">
            Use WASD or Arrow keys to move. Click on enemies to tag them!
          </div>
        </CardContent>
      </Card>
      <GameChat />
    </div>
  );
}
