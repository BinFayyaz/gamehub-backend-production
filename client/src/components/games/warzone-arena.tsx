import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useWebSocket } from "@/lib/websocket";
import { GameEngine } from "./warzone/GameEngine";
import { GameRenderer } from "./warzone/GameRenderer";
import type { Player as WzPlayer, MapType as WzMapType } from "./warzone/GameTypes";
import type { WarzoneMap, WarzoneTeam } from "@shared/schema";

interface WarzoneArenaProps {
  onClose?: () => void;
}

type Screen = "menu" | "lobby" | "playing_bot" | "playing_multi";

const MAPS: WzMapType[] = ["urban", "desert", "forest", "industrial", "arctic"];
const GUNS: Array<"ak47" | "sniper" | "rpg"> = ["ak47", "sniper", "rpg"];
const SKINS = ["normal", "gold", "camo", "neon"];

export function WarzoneArena({ onClose }: WarzoneArenaProps) {
  const {
    currentPlayerId,
    warzoneRoom,
    warzoneStates,
    warzoneChatMessages,
    createWarzoneRoom,
    joinWarzoneRoom,
    leaveWarzoneRoom,
    startWarzoneGame,
    updateWarzoneState,
    sendWarzoneChat,
  } = useWebSocket();

  const [screen, setScreen] = useState<Screen>("menu");
  const [nickname, setNickname] = useState(() => {
    const cached = localStorage.getItem("warzone_nickname");
    if (cached && cached.trim()) return cached.trim();
    return `Soldier${Math.floor(Math.random() * 900 + 100)}`;
  });
  const [team, setTeam] = useState<WarzoneTeam>("blue");
  const [map, setMap] = useState<WzMapType>("urban");
  const [gun, setGun] = useState<"ak47" | "sniper" | "rpg">("ak47");
  const [skin, setSkin] = useState("normal");
  const [joinCode, setJoinCode] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [localPlayer, setLocalPlayer] = useState<WzPlayer | undefined>(undefined);
  const [kills, setKills] = useState<Array<{ id: string; killer: string; victim: string }>>([]);
  const [currentSlot] = useState(1);
  const gameRef = useRef<GameEngine | null>(null);

  const remotePlayers = useMemo(() => {
    const result: Record<string, any> = {};
    warzoneStates.forEach((st) => {
      if (st.playerId === currentPlayerId) return;
      result[st.playerId] = {
        id: st.playerId,
        name: st.name,
        team: st.team,
        position: st.position,
        rotation: st.rotation,
        health: st.health,
        isDead: st.isDead,
        currentWeapon: st.currentWeapon,
        weaponType: st.weaponType,
        isShooting: false,
        lastUpdate: st.timestamp,
      };
    });
    return result;
  }, [warzoneStates, currentPlayerId]);

  useEffect(() => {
    localStorage.setItem("warzone_nickname", nickname);
  }, [nickname]);

  useEffect(() => {
    if (screen !== "playing_multi") return;
    if (!warzoneRoom || !gameRef.current) return;
    const t = setInterval(() => {
      const p = gameRef.current?.getPlayer();
      if (!p) return;
      updateWarzoneState({
        position: { x: p.x, y: p.y, z: p.z },
        rotation: { x: p.pitch, y: p.rotation },
        health: p.health,
        isDead: p.isDead,
        currentWeapon: currentSlot,
        weaponType: p.primaryGun,
      });
    }, 50);
    return () => clearInterval(t);
  }, [screen, warzoneRoom, currentSlot, updateWarzoneState]);

  useEffect(() => {
    if (!warzoneRoom?.started) return;
    if (screen !== "lobby") return;
    if (gameRef.current) return;

    const me = warzoneRoom.players.find((p) => p.playerId === currentPlayerId);
    const playerTeam: "blue" | "red" = me?.team === "red" ? "red" : "blue";
    const playerName = me?.name || nickname;
    const selectedMap = (warzoneRoom.map || "urban") as WzMapType;
    gameRef.current = new GameEngine(
      playerName,
      playerTeam,
      gun,
      skin,
      (killer, victim) => {
        setKills((prev) => [
          ...prev.slice(-4),
          { id: `${Date.now()}-${Math.random()}`, killer, victim },
        ]);
      },
      () => {},
      selectedMap,
      0,
      "hard",
    );
    setScreen("playing_multi");
  }, [warzoneRoom, screen, currentPlayerId, nickname, gun, skin]);

  const cleanupGame = () => {
    if (gameRef.current) {
      gameRef.current.destroy();
      gameRef.current = null;
    }
    setLocalPlayer(undefined);
    setKills([]);
  };

  const handleClose = () => {
    cleanupGame();
    if (warzoneRoom) leaveWarzoneRoom();
    onClose?.();
  };

  const startBotMode = () => {
    cleanupGame();
    gameRef.current = new GameEngine(
      nickname.trim() || "Soldier",
      team === "red" ? "red" : "blue",
      gun,
      skin,
      (killer, victim) => {
        setKills((prev) => [
          ...prev.slice(-4),
          { id: `${Date.now()}-${Math.random()}`, killer, victim },
        ]);
      },
      () => {},
      map,
      16,
      "hard",
    );
    setScreen("playing_bot");
  };

  const openLobby = () => {
    cleanupGame();
    setScreen("lobby");
  };

  const createRoom = () => {
    createWarzoneRoom(nickname.trim() || "Soldier", team, map as WarzoneMap);
    setScreen("lobby");
  };

  const joinRoom = () => {
    joinWarzoneRoom(joinCode.trim().toUpperCase(), nickname.trim() || "Soldier", team);
    setScreen("lobby");
  };

  const leaveRoomToMenu = () => {
    cleanupGame();
    leaveWarzoneRoom();
    setScreen("menu");
  };

  const leavePlayToMenu = () => {
    cleanupGame();
    if (screen === "playing_multi") {
      leaveWarzoneRoom();
    }
    setScreen("menu");
  };

  const sendChat = () => {
    const msg = chatInput.trim();
    if (!msg) return;
    sendWarzoneChat(msg);
    setChatInput("");
  };

  const renderHud = () => (
    <div className="pointer-events-none absolute inset-0 z-20">
      <div className="absolute left-1/2 top-1/2 h-4 w-4 -translate-x-1/2 -translate-y-1/2">
        <div className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-white/80" />
        <div className="absolute left-0 top-1/2 h-px w-4 -translate-y-1/2 bg-white/80" />
      </div>
      <div className="absolute left-4 top-4 rounded bg-black/60 px-3 py-2 text-sm text-white">
        <div>HP: {Math.max(0, Math.floor(localPlayer?.health || 0))}</div>
        <div>Score: {localPlayer?.score || 0}</div>
      </div>
      <div className="absolute right-4 top-4 space-y-1">
        {kills.map((k) => (
          <div key={k.id} className="rounded bg-black/60 px-2 py-1 text-xs text-white">
            {k.killer} {"->"} {k.victim}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/85 p-4">
      <Card className="mx-auto flex h-full w-full max-w-7xl flex-col">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-2xl">Warzone Arena</CardTitle>
          <Button variant="ghost" size="icon" onClick={handleClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>
        <CardContent className="relative flex-1 overflow-hidden">
          {screen === "menu" && (
            <div className="mx-auto grid h-full max-w-3xl content-center gap-4">
              <div className="grid gap-2">
                <Label>In-Game Name (independent from GameHub)</Label>
                <Input value={nickname} onChange={(e) => setNickname(e.target.value.slice(0, 20))} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Team</Label>
                  <div className="flex gap-2">
                    <Button variant={team === "blue" ? "default" : "outline"} onClick={() => setTeam("blue")}>Blue</Button>
                    <Button variant={team === "red" ? "default" : "outline"} onClick={() => setTeam("red")}>Red</Button>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label>Map</Label>
                  <select
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    value={map}
                    onChange={(e) => setMap(e.target.value as WzMapType)}
                  >
                    {MAPS.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label>Primary Gun</Label>
                  <select
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    value={gun}
                    onChange={(e) => setGun(e.target.value as "ak47" | "sniper" | "rpg")}
                  >
                    {GUNS.map((g) => (
                      <option key={g} value={g}>{g.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label>Skin</Label>
                  <select
                    className="h-10 rounded-md border bg-background px-3 text-sm"
                    value={skin}
                    onChange={(e) => setSkin(e.target.value)}
                  >
                    {SKINS.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <Button onClick={startBotMode}>Start Bot Mode (Default)</Button>
                <Button variant="outline" onClick={openLobby}>Open Multiplayer Lobby</Button>
              </div>
            </div>
          )}

          {screen === "lobby" && !warzoneRoom && (
            <div className="mx-auto grid h-full max-w-xl content-center gap-3">
              <Button onClick={createRoom}>Create Multiplayer Room</Button>
              <div className="flex gap-2">
                <Input
                  placeholder="Enter room code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                />
                <Button variant="outline" onClick={joinRoom}>Join</Button>
              </div>
              <Button variant="ghost" onClick={() => setScreen("menu")}>Back</Button>
            </div>
          )}

          {screen === "lobby" && warzoneRoom && (
            <div className="mx-auto grid h-full max-w-2xl content-center gap-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Room {warzoneRoom.code}</h3>
                <Badge>{warzoneRoom.players.length} players</Badge>
              </div>
              <div className="grid gap-2 rounded border p-3">
                {warzoneRoom.players.map((p) => (
                  <div key={p.playerId} className="flex items-center justify-between text-sm">
                    <span>{p.name}</span>
                    <Badge variant="outline">{p.team}</Badge>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={startWarzoneGame}
                  disabled={warzoneRoom.hostPlayerId !== currentPlayerId || warzoneRoom.players.length < 2}
                >
                  Start Match
                </Button>
                <Button variant="outline" onClick={leaveRoomToMenu}>Leave Room</Button>
              </div>
            </div>
          )}

          {(screen === "playing_bot" || screen === "playing_multi") && gameRef.current && (
            <div className="relative h-full w-full">
              <GameRenderer
                gameEngine={gameRef.current}
                onPlayerUpdate={setLocalPlayer}
                remotePlayers={screen === "playing_multi" ? remotePlayers : {}}
              />
              {renderHud()}
              <div className="absolute bottom-3 left-3 z-30">
                <Button size="sm" variant="secondary" onClick={leavePlayToMenu}>Leave Match</Button>
              </div>
              {screen === "playing_multi" && (
                <div className="absolute bottom-3 right-3 z-30 flex h-64 w-80 flex-col rounded border bg-black/70 p-2 text-white">
                  <div className="mb-2 text-sm font-semibold">In-Game Chat</div>
                  <div className="mb-2 flex-1 overflow-auto text-xs">
                    {warzoneChatMessages.map((m) => (
                      <div key={m.id} className="mb-1">
                        <span className="font-semibold">{m.sender}: </span>
                        <span>{m.content}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Input
                      className="h-8 border-white/20 bg-black/40 text-xs text-white"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && sendChat()}
                      placeholder="Type message..."
                    />
                    <Button size="sm" onClick={sendChat}>Send</Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
