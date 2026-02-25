import { useState, useEffect, useCallback, useRef } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  Play, 
  LogOut, 
  Crown, 
  Eye,
  EyeOff,
  UserX,
  Target,
  Clock,
  Home,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Settings,
  Shuffle
} from "lucide-react";
import { GameChat } from "@/components/game-chat";
import * as THREE from "three";

const MAP_SIZE = 400;
const STREET_WIDTH = 20;
const HOUSE_SIZE = 25;
const PLAYER_HEIGHT = 10;
const CROUCH_HEIGHT = 5;

interface HouseData {
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
  color: number;
  roofHeight: number;
}

function generateNeighborhood(): HouseData[] {
  const houses: HouseData[] = [];
  const streets = 4;
  const housesPerStreet = { min: 5, max: 10 };
  
  for (let street = 0; street < streets; street++) {
    const streetZ = -MAP_SIZE / 2 + (street + 1) * (MAP_SIZE / (streets + 1));
    const numHouses = Math.floor(Math.random() * (housesPerStreet.max - housesPerStreet.min + 1)) + housesPerStreet.min;
    const spacing = (MAP_SIZE - 40) / numHouses;
    
    for (let i = 0; i < numHouses; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      houses.push({
        x: -MAP_SIZE / 2 + 20 + i * spacing,
        z: streetZ + side * (STREET_WIDTH + HOUSE_SIZE / 2 + 5),
        width: HOUSE_SIZE + Math.random() * 10,
        depth: HOUSE_SIZE + Math.random() * 10,
        height: 20 + Math.random() * 15,
        color: [0x8b4513, 0xa0522d, 0xd2691e, 0xcd853f, 0xdeb887][Math.floor(Math.random() * 5)],
        roofHeight: 8 + Math.random() * 5
      });
    }
  }
  
  return houses;
}

export function HideSeekLobby() {
  const { 
    hideSeekLobby, 
    currentPlayerId, 
    startHideSeekGame, 
    leaveHideSeekLobby,
    setHideSeekSettings,
    isAdmin,
    adminForceKick
  } = useWebSocket();

  if (!hideSeekLobby) return null;

  const isHost = currentPlayerId === hideSeekLobby.hostId;
  const canStart = hideSeekLobby.players.length >= hideSeekLobby.minPlayers && isHost;
  const waitingCount = hideSeekLobby.minPlayers - hideSeekLobby.players.length;

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
      <GameChat />
      <Card className="w-full max-w-md border-border/50 shadow-2xl animate-bounce-in" data-testid="hideseek-lobby">
        <CardHeader className="text-center border-b border-border/50">
          <div className="flex items-center justify-between gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={leaveHideSeekLobby}
              data-testid="button-leave-hideseek-lobby"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Leave
            </Button>
            <div className="flex-1" />
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center">
              <Eye className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-indigo-500">Hide & Seek</CardTitle>
          </div>
          <CardDescription>
            3D multiplayer hide and seek in a neighborhood!
          </CardDescription>
          <Badge variant="secondary" className="mt-2">
            <Users className="w-3 h-3 mr-1" />
            {hideSeekLobby.players.length} / {hideSeekLobby.minPlayers}+ players
          </Badge>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {hideSeekLobby.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                  data-testid={`player-${player.id}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-indigo-500/20 text-indigo-500">
                      {player.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 font-medium">{player.name}</span>
                  {player.id === hideSeekLobby.hostId && (
                    <Badge variant="outline" className="text-xs">
                      <Crown className="w-3 h-3 mr-1" />
                      Host
                    </Badge>
                  )}
                  {isAdmin && player.id !== currentPlayerId && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => adminForceKick(player.id)}
                      data-testid={`button-kick-${player.id}`}
                    >
                      <UserX className="w-3 h-3 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          {isHost && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4" />
                <span className="font-medium">Game Settings</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Seeker Selection:</span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={hideSeekLobby.seekerMode === "random" ? "default" : "outline"}
                    onClick={() => setHideSeekSettings("random")}
                    data-testid="button-seeker-random"
                  >
                    <Shuffle className="w-3 h-3 mr-1" />
                    Random
                  </Button>
                  <Button
                    size="sm"
                    variant={hideSeekLobby.seekerMode === "host" ? "default" : "outline"}
                    onClick={() => setHideSeekSettings("host")}
                    data-testid="button-seeker-host"
                  >
                    <Crown className="w-3 h-3 mr-1" />
                    Host is Seeker
                  </Button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <div className="text-sm text-center text-muted-foreground space-y-1">
              <p className="flex items-center justify-center gap-2">
                <Home className="w-4 h-4" />
                4 streets with 5-10 houses each
              </p>
              <p className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                10 min game, 1 min hiding time
              </p>
            </div>
            
            {waitingCount > 0 && (
              <p className="text-sm text-center text-muted-foreground">
                Waiting for {waitingCount} more player{waitingCount > 1 ? "s" : ""}...
              </p>
            )}

            {isHost && (
              <Button
                className="w-full bg-indigo-500 hover:bg-indigo-600"
                disabled={!canStart}
                onClick={startHideSeekGame}
                data-testid="button-start-hideseek"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Game
              </Button>
            )}

            {!isHost && (
              <p className="text-sm text-center text-muted-foreground">
                Waiting for the host to start the game...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function HideSeekGame() {
  const { 
    hideSeekGame, 
    currentPlayerId,
    hideSeekAction,
    hideSeekMove,
    leaveHideSeekLobby
  } = useWebSocket();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playerMeshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const housesRef = useRef<HouseData[]>([]);
  const [keysPressed, setKeysPressed] = useState<Set<string>>(new Set());
  const [isCrouching, setIsCrouching] = useState(false);
  const playerPositionRef = useRef({ x: 0, y: PLAYER_HEIGHT, z: 0, rotation: 0 });
  const animationFrameRef = useRef<number>();
  const lastMoveTime = useRef(0);

  const currentPlayer = hideSeekGame?.players.find(p => p.id === currentPlayerId);
  const isSeeker = currentPlayer?.isSeeker ?? false;
  const isEliminated = currentPlayer?.isEliminated ?? false;

  useEffect(() => {
    if (!containerRef.current || !hideSeekGame) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 100, 400);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, containerRef.current.clientWidth / containerRef.current.clientHeight, 0.1, 1000);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(50, 100, 50);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const groundGeometry = new THREE.PlaneGeometry(MAP_SIZE * 2, MAP_SIZE * 2);
    const groundMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const houses = generateNeighborhood();
    housesRef.current = houses;

    houses.forEach(house => {
      const houseGroup = new THREE.Group();

      const bodyGeometry = new THREE.BoxGeometry(house.width, house.height, house.depth);
      const bodyMaterial = new THREE.MeshLambertMaterial({ color: house.color });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      body.position.y = house.height / 2;
      body.castShadow = true;
      body.receiveShadow = true;
      houseGroup.add(body);

      const roofGeometry = new THREE.ConeGeometry(Math.max(house.width, house.depth) * 0.7, house.roofHeight, 4);
      const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x8b0000 });
      const roof = new THREE.Mesh(roofGeometry, roofMaterial);
      roof.position.y = house.height + house.roofHeight / 2;
      roof.rotation.y = Math.PI / 4;
      roof.castShadow = true;
      houseGroup.add(roof);

      const doorGeometry = new THREE.BoxGeometry(house.width * 0.2, house.height * 0.4, 0.5);
      const doorMaterial = new THREE.MeshLambertMaterial({ color: 0x4a3728 });
      const door = new THREE.Mesh(doorGeometry, doorMaterial);
      door.position.set(0, house.height * 0.2, house.depth / 2);
      houseGroup.add(door);

      const windowGeometry = new THREE.BoxGeometry(house.width * 0.15, house.height * 0.2, 0.5);
      const windowMaterial = new THREE.MeshLambertMaterial({ color: 0x87ceeb });
      [-1, 1].forEach(side => {
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.set(side * house.width * 0.3, house.height * 0.6, house.depth / 2);
        houseGroup.add(window);
      });

      houseGroup.position.set(house.x, 0, house.z);
      scene.add(houseGroup);
    });

    for (let street = 0; street < 4; street++) {
      const streetZ = -MAP_SIZE / 2 + (street + 1) * (MAP_SIZE / 5);
      const streetGeometry = new THREE.PlaneGeometry(MAP_SIZE, STREET_WIDTH);
      const streetMaterial = new THREE.MeshLambertMaterial({ color: 0x333333 });
      const streetMesh = new THREE.Mesh(streetGeometry, streetMaterial);
      streetMesh.rotation.x = -Math.PI / 2;
      streetMesh.position.set(0, 0.1, streetZ);
      scene.add(streetMesh);
    }

    if (isSeeker) {
      camera.position.set(0, 50, 0);
      camera.lookAt(0, 0, 0);
    } else {
      const startX = (Math.random() - 0.5) * 100;
      const startZ = (Math.random() - 0.5) * 100;
      playerPositionRef.current = { x: startX, y: PLAYER_HEIGHT, z: startZ, rotation: 0 };
      camera.position.set(startX, PLAYER_HEIGHT + 5, startZ + 10);
      camera.lookAt(startX, PLAYER_HEIGHT, startZ);
    }

    const handleResize = () => {
      if (!containerRef.current || !camera || !renderer) return;
      camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [hideSeekGame?.id, isSeeker]);

  useEffect(() => {
    if (!sceneRef.current || !hideSeekGame) return;

    const scene = sceneRef.current;
    const existingMeshes = playerMeshesRef.current;

    hideSeekGame.players.forEach(player => {
      if (player.isEliminated) {
        const mesh = existingMeshes.get(player.id);
        if (mesh) {
          scene.remove(mesh);
          existingMeshes.delete(player.id);
        }
        return;
      }

      let playerGroup = existingMeshes.get(player.id);
      
      if (!playerGroup) {
        playerGroup = new THREE.Group();
        
        const bodyHeight = player.isCrouching ? CROUCH_HEIGHT : PLAYER_HEIGHT;
        const bodyGeometry = new THREE.CylinderGeometry(2, 2, bodyHeight, 8);
        const bodyMaterial = new THREE.MeshLambertMaterial({ 
          color: player.isSeeker ? 0xff0000 : 0x00ff00 
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = bodyHeight / 2;
        body.castShadow = true;
        playerGroup.add(body);

        const headGeometry = new THREE.SphereGeometry(2.5, 16, 16);
        const headMaterial = new THREE.MeshLambertMaterial({ color: 0xffdbac });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = bodyHeight + 2;
        head.castShadow = true;
        playerGroup.add(head);

        scene.add(playerGroup);
        existingMeshes.set(player.id, playerGroup);
      }

      playerGroup.position.set(player.x, 0, player.z);
      playerGroup.rotation.y = player.rotation;
    });
  }, [hideSeekGame?.players]);

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (["w", "a", "s", "d", "shift", "control", " "].includes(key)) {
      e.preventDefault();
      setKeysPressed(prev => new Set(prev).add(key));
      
      if (key === "control") {
        setIsCrouching(true);
        hideSeekAction("crouch");
      }
      if (key === " ") {
        hideSeekAction("jump");
      }
    }
  }, [hideSeekAction]);

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    setKeysPressed(prev => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    
    if (key === "control") {
      setIsCrouching(false);
      hideSeekAction("stand");
    }
  }, [hideSeekAction]);

  const handleClick = useCallback(() => {
    if (!isSeeker || !hideSeekGame || isEliminated) return;

    const camera = cameraRef.current;
    if (!camera) return;

    const raycaster = new THREE.Raycaster();
    const center = new THREE.Vector2(0, 0);
    raycaster.setFromCamera(center, camera);

    const playerMeshes = Array.from(playerMeshesRef.current.entries())
      .filter(([id]) => {
        const player = hideSeekGame.players.find(p => p.id === id);
        return player && !player.isSeeker && !player.isEliminated;
      })
      .map(([, mesh]) => mesh);

    const intersects = raycaster.intersectObjects(playerMeshes, true);
    
    if (intersects.length > 0) {
      const hitMesh = intersects[0].object.parent;
      const targetId = Array.from(playerMeshesRef.current.entries())
        .find(([, mesh]) => mesh === hitMesh)?.[0];
      
      if (targetId) {
        hideSeekAction("eliminate", targetId);
      }
    }
  }, [isSeeker, hideSeekGame, isEliminated, hideSeekAction]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("click", handleClick);
    
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("click", handleClick);
    };
  }, [handleKeyDown, handleKeyUp, handleClick]);

  useEffect(() => {
    if (!hideSeekGame || isEliminated) return;
    if (hideSeekGame.phase === "hiding" && isSeeker) return;

    const moveSpeed = keysPressed.has("shift") ? 0.8 : 0.4;
    const rotSpeed = 0.03;

    const update = () => {
      const now = Date.now();
      if (now - lastMoveTime.current < 16) {
        animationFrameRef.current = requestAnimationFrame(update);
        return;
      }
      lastMoveTime.current = now;

      let moved = false;
      const pos = playerPositionRef.current;

      if (keysPressed.has("w")) {
        pos.z -= Math.cos(pos.rotation) * moveSpeed;
        pos.x -= Math.sin(pos.rotation) * moveSpeed;
        moved = true;
      }
      if (keysPressed.has("s")) {
        pos.z += Math.cos(pos.rotation) * moveSpeed;
        pos.x += Math.sin(pos.rotation) * moveSpeed;
        moved = true;
      }
      if (keysPressed.has("a")) {
        pos.rotation += rotSpeed;
        moved = true;
      }
      if (keysPressed.has("d")) {
        pos.rotation -= rotSpeed;
        moved = true;
      }

      pos.x = Math.max(-MAP_SIZE, Math.min(MAP_SIZE, pos.x));
      pos.z = Math.max(-MAP_SIZE, Math.min(MAP_SIZE, pos.z));

      if (moved) {
        hideSeekMove(pos.x, pos.y, pos.z, pos.rotation);
      }

      if (cameraRef.current) {
        const camera = cameraRef.current;
        const height = isCrouching ? CROUCH_HEIGHT + 3 : PLAYER_HEIGHT + 5;
        camera.position.set(
          pos.x + Math.sin(pos.rotation) * 15,
          height,
          pos.z + Math.cos(pos.rotation) * 15
        );
        camera.lookAt(pos.x, height - 2, pos.z);
      }

      animationFrameRef.current = requestAnimationFrame(update);
    };

    animationFrameRef.current = requestAnimationFrame(update);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [hideSeekGame?.id, isEliminated, isSeeker, hideSeekMove]);

  useEffect(() => {
    if (!sceneRef.current || !cameraRef.current || !rendererRef.current) return;

    const render = () => {
      rendererRef.current!.render(sceneRef.current!, cameraRef.current!);
      requestAnimationFrame(render);
    };

    const frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, []);

  if (!hideSeekGame) return null;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const hidersRemaining = hideSeekGame.players.filter(p => !p.isSeeker && !p.isEliminated).length;
  const totalHiders = hideSeekGame.players.filter(p => !p.isSeeker).length;

  return (
    <div className="fixed inset-0 z-40 bg-background flex flex-col">
      <div className="flex items-center justify-between p-4 bg-background/90 border-b gap-2 flex-wrap">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-indigo-500" />
            <span className="font-bold text-indigo-500">Hide & Seek</span>
          </div>
          
          <Badge variant={hideSeekGame.phase === "hiding" ? "secondary" : "default"}>
            {hideSeekGame.phase === "hiding" ? "HIDING PHASE" : 
             hideSeekGame.phase === "seeking" ? "SEEKING PHASE" : "FINISHED"}
          </Badge>
        </div>

        <div className="flex items-center gap-4">
          {hideSeekGame.phase === "hiding" && (
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              Hiding: {formatTime(Math.max(0, hideSeekGame.hidingTimeRemaining))}
            </Badge>
          )}
          
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            Game: {formatTime(Math.max(0, hideSeekGame.gameTimeRemaining))}
          </Badge>

          <Badge variant="outline">
            <Users className="w-3 h-3 mr-1" />
            Hiders: {hidersRemaining}/{totalHiders}
          </Badge>

          <Badge variant={isSeeker ? "destructive" : isEliminated ? "outline" : "default"}>
            {isSeeker ? (
              <>
                <Eye className="w-3 h-3 mr-1" />
                SEEKER
              </>
            ) : isEliminated ? (
              <>
                <EyeOff className="w-3 h-3 mr-1" />
                ELIMINATED
              </>
            ) : (
              <>
                <EyeOff className="w-3 h-3 mr-1" />
                HIDING
              </>
            )}
          </Badge>

          <Button
            variant="ghost"
            size="sm"
            onClick={leaveHideSeekLobby}
            data-testid="button-leave-hideseek"
          >
            <LogOut className="w-4 h-4 mr-1" />
            Leave
          </Button>
        </div>
      </div>

      <div className="flex-1 relative">
        <div ref={containerRef} className="w-full h-full" data-testid="canvas-hideseek" />
        
        {isSeeker && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none">
            <Target className="w-8 h-8 text-red-500" />
          </div>
        )}

        <div className="absolute bottom-4 left-4 p-3 bg-background/80 rounded-lg border text-sm space-y-1">
          <div className="flex items-center gap-2">
            <span className="font-medium">Controls:</span>
          </div>
          <div className="flex items-center gap-2">
            <ArrowUp className="w-3 h-3" /> W - Forward
          </div>
          <div className="flex items-center gap-2">
            <ArrowDown className="w-3 h-3" /> S - Backward
          </div>
          <div className="flex items-center gap-2">
            <ArrowLeft className="w-3 h-3" /> A - Turn Left
          </div>
          <div className="flex items-center gap-2">
            <ArrowRight className="w-3 h-3" /> D - Turn Right
          </div>
          <div>Shift - Run</div>
          <div>Ctrl - Crouch</div>
          <div>Space - Jump</div>
          {isSeeker && <div className="text-red-500">Click - Eliminate</div>}
        </div>

        {hideSeekGame.status === "finished" && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <Card className="w-full max-w-md">
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">
                  {hideSeekGame.winner === "seeker" ? "Seeker Wins!" : "Hiders Win!"}
                </CardTitle>
                <CardDescription>
                  {hideSeekGame.winner === "seeker" 
                    ? "All hiders have been found!" 
                    : "Time ran out - hiders survived!"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h3 className="font-semibold">Players:</h3>
                  <div className="flex flex-wrap gap-2">
                    {hideSeekGame.players.map(player => (
                      <Badge 
                        key={player.id}
                        variant={player.isSeeker ? "destructive" : player.isEliminated ? "outline" : "default"}
                      >
                        {player.isSeeker && <Eye className="w-3 h-3 mr-1" />}
                        {player.name}
                        {player.isEliminated && " (Found)"}
                      </Badge>
                    ))}
                  </div>
                </div>
                <Button className="w-full" onClick={leaveHideSeekLobby}>
                  Return to Lobby
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
