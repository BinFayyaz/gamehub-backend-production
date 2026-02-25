import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { GameEngine } from './GameEngine';
import { MapObject, Player, MapType } from './GameTypes';
import { TextureManager } from './TextureManager';
import { soundManager } from './SoundManager';

interface RemotePlayer {
  id: string;
  name: string;
  team: 'blue' | 'red';
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number };
  health: number;
  isDead: boolean;
  currentWeapon: number;
  weaponType: string;
  isShooting: boolean;
  lastUpdate: number;
}

interface GameRendererProps {
  gameEngine: GameEngine;
  onPlayerUpdate: (player: Player | undefined) => void;
  onZoomChange?: (isZoomed: boolean) => void;
  sensitivity?: number;
  remotePlayers?: Record<string, RemotePlayer>;
}

export const GameRenderer: React.FC<GameRendererProps> = ({ 
  gameEngine, 
  onPlayerUpdate, 
  onZoomChange, 
  sensitivity = 1.0,
  remotePlayers = {}
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const playersRef = useRef<Map<string, THREE.Group>>(new Map());
  const remotePlayersRef = useRef<Map<string, THREE.Group>>(new Map());
  const bulletsRef = useRef<Map<string, THREE.Object3D>>(new Map());
  const pickupsRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const eulerRef = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const keysRef = useRef({ up: false, down: false, left: false, right: false, jump: false });
  const mouseDownRef = useRef(false);
  const rightMouseDownRef = useRef(false);
  const lockedRef = useRef(false);
  const gunMeshRef = useRef<THREE.Group | null>(null);
  const currentSlotRef = useRef(1);
  const lastWalkSoundRef = useRef(0);
  const frameRef = useRef(0);
  const isZoomedRef = useRef(false);
  const normalFOV = 70;
  const zoomedFOV = 25;

  const createGunMesh = useCallback((gun: string, skin: string, slot: number): THREE.Group => {
    const group = new THREE.Group();
    const mat = TextureManager.getGunMaterial(skin);
    const metalMat = new THREE.MeshStandardMaterial({ color: '#555', metalness: 0.8, roughness: 0.3 });

    if (slot === 1) {
      if (gun === 'rpg') {
        const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 16), mat);
        tube.rotation.x = Math.PI / 2;
        const head = new THREE.Mesh(new THREE.ConeGeometry(0.15, 0.4, 16), new THREE.MeshStandardMaterial({ color: '#661111' }));
        head.rotation.x = -Math.PI / 2;
        head.position.z = -0.8;
        group.add(tube, head);
        group.position.set(0.4, -0.3, -0.5);
      } else if (gun === 'sniper') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.15, 1.8), mat);
        const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.3), metalMat);
        scope.rotation.x = Math.PI / 2;
        scope.position.y = 0.12;
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.5), metalMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.z = -1.0;
        group.add(body, scope, barrel);
        group.position.set(0.3, -0.3, -0.7);
      } else {
        // AK47
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 1.0), mat);
        const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.6), metalMat);
        barrel.rotation.x = Math.PI / 2;
        barrel.position.z = -0.6;
        const stock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.15, 0.3), mat);
        stock.position.z = 0.5;
        stock.position.y = -0.03;
        const mag = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.25, 0.12), mat);
        mag.position.y = -0.2;
        mag.position.z = 0.1;
        mag.rotation.x = -0.2;
        group.add(body, barrel, stock, mag);
        group.position.set(0.3, -0.3, -0.6);
      }
    } else if (slot === 2) {
      // Pistol
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.35), metalMat);
      const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.15, 0.08), mat);
      grip.position.y = -0.12;
      grip.position.z = 0.1;
      grip.rotation.x = -0.3;
      group.add(body, grip);
      group.position.set(0.2, -0.3, -0.4);
    } else {
      // Grenade
      const body = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 16, 16),
        new THREE.MeshStandardMaterial({ color: '#2d5a27', metalness: 0.3, roughness: 0.6 })
      );
      const cap = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 0.08),
        new THREE.MeshStandardMaterial({ color: '#333' })
      );
      cap.position.y = 0.12;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.03, 0.01, 8, 16),
        new THREE.MeshStandardMaterial({ color: '#888' })
      );
      ring.position.set(0.06, 0.15, 0);
      ring.rotation.y = Math.PI / 2;
      group.add(body, cap, ring);
      group.position.set(0.2, -0.3, -0.4);
    }

    return group;
  }, []);

  const createPlayerMesh = useCallback((player: Player): THREE.Group => {
    const group = new THREE.Group();
    const teamColor = player.teamColor === 'blue' ? 0x3498db : 0xe74c3c;
    const mat = new THREE.MeshStandardMaterial({ color: teamColor });

    // Body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.8), mat);
    body.position.y = 0.9;
    body.castShadow = true;

    // Head
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    head.position.y = 2.0;
    head.castShadow = true;

    // Gun
    const gunMat = TextureManager.getGunMaterial(player.skin);
    let gunGeo: THREE.BufferGeometry;
    if (player.primaryGun === 'rpg') {
      gunGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.2);
    } else if (player.primaryGun === 'sniper') {
      gunGeo = new THREE.BoxGeometry(0.1, 0.15, 1.4);
    } else {
      gunGeo = new THREE.BoxGeometry(0.1, 0.2, 0.8);
    }
    const gun = new THREE.Mesh(gunGeo, gunMat);
    if (player.primaryGun === 'rpg') {
      gun.rotation.x = Math.PI / 2;
    }
    gun.position.set(0.3, 1.3, 0.3);
    gun.castShadow = true;

    group.add(body, head, gun);
    return group;
  }, []);

  // Create mesh for remote multiplayer players
  const createRemotePlayerMesh = useCallback((rPlayer: RemotePlayer): THREE.Group => {
    const group = new THREE.Group();
    const teamColor = rPlayer.team === 'blue' ? 0x3498db : 0xe74c3c;
    const mat = new THREE.MeshStandardMaterial({ color: teamColor });

    // Body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 1.8), mat);
    body.position.y = 0.9;
    body.castShadow = true;

    // Head
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x222222 })
    );
    head.position.y = 2.0;
    head.castShadow = true;

    // Gun
    const gunMat = TextureManager.getGunMaterial('normal');
    let gunGeo: THREE.BufferGeometry;
    if (rPlayer.weaponType === 'rpg') {
      gunGeo = new THREE.CylinderGeometry(0.1, 0.1, 1.2);
    } else if (rPlayer.weaponType === 'sniper') {
      gunGeo = new THREE.BoxGeometry(0.1, 0.15, 1.4);
    } else {
      gunGeo = new THREE.BoxGeometry(0.1, 0.2, 0.8);
    }
    const gun = new THREE.Mesh(gunGeo, gunMat);
    if (rPlayer.weaponType === 'rpg') {
      gun.rotation.x = Math.PI / 2;
    }
    gun.position.set(0.3, 1.3, 0.3);
    gun.castShadow = true;

    // Name tag
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = teamColor === 0x3498db ? '#3498db' : '#e74c3c';
    ctx.fillRect(0, 0, 256, 64);
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = 'white';
    ctx.textAlign = 'center';
    ctx.fillText(rPlayer.name.substring(0, 12), 128, 40);
    
    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({ map: texture });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.y = 2.8;
    sprite.scale.set(2, 0.5, 1);

    group.add(body, head, gun, sprite);
    return group;
  }, []);

  const renderMap = useCallback((mapObjects: MapObject[], scene: THREE.Scene, mapType: MapType) => {
    // Ground with map-specific colors
    const groundGeo = new THREE.PlaneGeometry(300, 300, 50, 50);
    let groundColor: THREE.Color;
    let fogColor: number;
    
    switch (mapType) {
      case 'desert':
        groundColor = new THREE.Color(0xd4a574);
        fogColor = 0xd4a574;
        scene.background = new THREE.Color(0xffd699);
        break;
      case 'forest':
        groundColor = new THREE.Color(0x2d5a27);
        fogColor = 0x1a3318;
        scene.background = new THREE.Color(0x1a3318);
        break;
      case 'industrial':
        groundColor = new THREE.Color(0x4a4a4a);
        fogColor = 0x333333;
        scene.background = new THREE.Color(0x2a2a2a);
        break;
      case 'arctic':
        groundColor = new THREE.Color(0xe8f4f8);
        fogColor = 0xc8e4f8;
        scene.background = new THREE.Color(0xc8e4f8);
        break;
      default: // urban
        groundColor = new THREE.Color(0x3a4a3a);
        fogColor = 0x1a2030;
        scene.background = new THREE.Color(0x1a2030);
    }
    
    scene.fog = new THREE.Fog(fogColor, 50, 200);
    
    const groundMat = new THREE.MeshStandardMaterial({
      color: groundColor,
      roughness: 0.9
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Map objects with map-specific materials
    mapObjects.forEach(obj => {
      let material: THREE.Material;
      
      if (mapType === 'arctic') {
        material = new THREE.MeshStandardMaterial({
          color: obj.type === 'crate' ? 0xaaddff : 0xffffff,
          roughness: 0.3,
          metalness: 0.1
        });
      } else if (mapType === 'desert') {
        material = new THREE.MeshStandardMaterial({
          color: obj.type === 'crate' ? 0xc4956a : 0xb8956a,
          roughness: 0.9
        });
      } else if (mapType === 'forest') {
        material = new THREE.MeshStandardMaterial({
          color: obj.type === 'crate' ? 0x4a3520 : 0x5a6a5a,
          roughness: 0.85
        });
      } else if (mapType === 'industrial') {
        if (obj.type === 'crate') {
          material = new THREE.MeshStandardMaterial({
            color: 0x8b4513,
            roughness: 0.7
          });
        } else {
          material = new THREE.MeshStandardMaterial({
            color: 0x555555,
            roughness: 0.5,
            metalness: 0.3
          });
        }
      } else {
        if (obj.type === 'crate') {
          material = new THREE.MeshStandardMaterial({
            map: TextureManager.getCrateTexture(),
            roughness: 0.8
          });
        } else if (obj.type === 'wall') {
          material = new THREE.MeshStandardMaterial({
            map: TextureManager.getBrickTexture(),
            roughness: 0.9
          });
        } else {
          material = new THREE.MeshStandardMaterial({
            map: TextureManager.getConcreteTexture(),
            roughness: 0.8
          });
        }
      }

      const mesh = new THREE.Mesh(new THREE.BoxGeometry(obj.w, obj.h, obj.d), material);
      mesh.position.set(obj.x, obj.y, obj.z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      scene.add(mesh);
    });
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize sound
    soundManager.init();

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x1a2030);
    scene.fog = new THREE.Fog(0x1a2030, 50, 200);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 500);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lighting
    const ambient = new THREE.AmbientLight(0x404050, 0.8);
    scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffeedd, 1.0);
    sun.position.set(100, 150, 100);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    sun.shadow.camera.near = 10;
    sun.shadow.camera.far = 400;
    sun.shadow.camera.left = -150;
    sun.shadow.camera.right = 150;
    sun.shadow.camera.top = 150;
    sun.shadow.camera.bottom = -150;
    scene.add(sun);

    // Hemisphere light for ambient
    const hemi = new THREE.HemisphereLight(0x87ceeb, 0x444422, 0.5);
    scene.add(hemi);

    // Render map with map type
    const gameState = gameEngine.getState();
    const mapType = gameEngine.getMapType();
    renderMap(gameState.mapObjects, scene, mapType);

    // Create initial gun
    const player = gameEngine.getPlayer();
    if (player) {
      const gunMesh = createGunMesh(player.primaryGun, player.skin, 1);
      camera.add(gunMesh);
      scene.add(camera);
      gunMeshRef.current = gunMesh;
    }

    // Animation loop
    const animate = () => {
      frameRef.current = requestAnimationFrame(animate);
      
      const state = gameEngine.getState();
      const player = gameEngine.getPlayer();
      
      // Handle sniper zoom
      if (player && player.primaryGun === 'sniper' && currentSlotRef.current === 1) {
        if (rightMouseDownRef.current && !isZoomedRef.current) {
          isZoomedRef.current = true;
          camera.fov = zoomedFOV;
          camera.updateProjectionMatrix();
          if (gunMeshRef.current) gunMeshRef.current.visible = false;
          onZoomChange?.(true);
        } else if (!rightMouseDownRef.current && isZoomedRef.current) {
          isZoomedRef.current = false;
          camera.fov = normalFOV;
          camera.updateProjectionMatrix();
          if (gunMeshRef.current) gunMeshRef.current.visible = true;
          onZoomChange?.(false);
        }
      } else if (isZoomedRef.current) {
        isZoomedRef.current = false;
        camera.fov = normalFOV;
        camera.updateProjectionMatrix();
        if (gunMeshRef.current) gunMeshRef.current.visible = true;
        onZoomChange?.(false);
      }
      
      if (player && !player.isDead && state.isActive && lockedRef.current) {
        // Process input
        gameEngine.processInput({
          up: keysRef.current.up,
          down: keysRef.current.down,
          left: keysRef.current.left,
          right: keysRef.current.right,
          jump: keysRef.current.jump,
          rotation: eulerRef.current.y,
          pitch: eulerRef.current.x
        });

        // Walking sound
        const isMoving = keysRef.current.up || keysRef.current.down || 
                        keysRef.current.left || keysRef.current.right;
        if (isMoving && player.grounded) {
          const now = Date.now();
          if (now - lastWalkSoundRef.current > 350) {
            soundManager.play('walk', 0.2, 0.8 + Math.random() * 0.4);
            lastWalkSoundRef.current = now;
          }
        }

        // Shooting
        if (mouseDownRef.current) {
          gameEngine.shoot(eulerRef.current.y, eulerRef.current.x);
        }
      }

      // Update camera
      if (player && !player.isDead) {
        camera.position.lerp(
          new THREE.Vector3(player.x, player.y + 1.6, player.z),
          0.5
        );
      }

      // Update bot players (from game engine)
      const playerIds = Object.keys(state.players);
      const playerId = gameEngine.getPlayerId();

      // Remove old bot players
      playersRef.current.forEach((mesh, id) => {
        if (!playerIds.includes(id)) {
          scene.remove(mesh);
          playersRef.current.delete(id);
        }
      });

      // Update/add bot players
      playerIds.forEach(id => {
        if (id === playerId) return;
        
        const p = state.players[id];
        if (!playersRef.current.has(id)) {
          const mesh = createPlayerMesh(p);
          scene.add(mesh);
          playersRef.current.set(id, mesh);
        }

        const mesh = playersRef.current.get(id)!;
        mesh.visible = !p.isDead;
        mesh.position.lerp(new THREE.Vector3(p.x, p.y, p.z), 0.3);
        mesh.rotation.y = p.rotation;
      });

      // Update bullets
      const bulletIds = state.bullets.map(b => b.id);
      bulletsRef.current.forEach((mesh, id) => {
        if (!bulletIds.includes(id)) {
          scene.remove(mesh);
          bulletsRef.current.delete(id);
        }
      });

      state.bullets.forEach(b => {
        if (!bulletsRef.current.has(b.id)) {
          let mesh: THREE.Object3D;
          
          if (b.type === 'rpg') {
            const group = new THREE.Group();
            const body = new THREE.Mesh(
              new THREE.CylinderGeometry(0.1, 0.1, 0.6),
              new THREE.MeshBasicMaterial({ color: 0x555555 })
            );
            body.rotation.x = Math.PI / 2;
            const head = new THREE.Mesh(
              new THREE.ConeGeometry(0.12, 0.2),
              new THREE.MeshBasicMaterial({ color: 0xff0000 })
            );
            head.rotation.x = -Math.PI / 2;
            head.position.z = 0.4;
            group.add(body, head);
            mesh = group;
          } else if (b.type === 'grenade') {
            mesh = new THREE.Mesh(
              new THREE.SphereGeometry(0.15),
              new THREE.MeshBasicMaterial({ color: 0x22aa22 })
            );
          } else {
            mesh = new THREE.Mesh(
              new THREE.SphereGeometry(0.08),
              new THREE.MeshBasicMaterial({ color: 0xffff00 })
            );
          }
          
          scene.add(mesh);
          bulletsRef.current.set(b.id, mesh);
        }

        const mesh = bulletsRef.current.get(b.id)!;
        mesh.position.set(b.x, b.y, b.z);
        if (b.type === 'rpg') {
          mesh.lookAt(b.x + b.vx, b.y + b.vy, b.z + b.vz);
        }
      });

      // Update pickups
      const pickupIds = state.pickups.map(p => p.id);
      pickupsRef.current.forEach((mesh, id) => {
        if (!pickupIds.includes(id)) {
          scene.remove(mesh);
          pickupsRef.current.delete(id);
        }
      });

      state.pickups.forEach(pk => {
        if (!pickupsRef.current.has(pk.id)) {
          let material: THREE.MeshStandardMaterial;
          if (pk.type === 'health') {
            material = TextureManager.getHealthPackTexture();
          } else if (pk.type === 'ammo') {
            material = TextureManager.getAmmoPackTexture();
          } else {
            material = TextureManager.getGrenadePackTexture();
          }
          
          const mesh = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.2, 1.2), material);
          mesh.position.set(pk.x, 0.6, pk.z);
          mesh.castShadow = true;
          scene.add(mesh);
          pickupsRef.current.set(pk.id, mesh);
        }

        const mesh = pickupsRef.current.get(pk.id)!;
        mesh.rotation.y += 0.03;
        mesh.position.y = 0.6 + Math.sin(Date.now() * 0.003) * 0.1;
      });

      // Notify parent of player state
      onPlayerUpdate(player);

      renderer.render(scene, camera);
    };

    animate();

    // Event handlers
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    const handlePointerLockChange = () => {
      lockedRef.current = document.pointerLockElement === renderer.domElement;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!lockedRef.current) return;
      const sens = sensitivity * 0.002;
      eulerRef.current.y -= e.movementX * sens;
      eulerRef.current.x -= e.movementY * sens;
      eulerRef.current.x = Math.max(-1.5, Math.min(1.5, eulerRef.current.x));
      camera.quaternion.setFromEuler(eulerRef.current);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        mouseDownRef.current = true;
        if (!lockedRef.current) {
          renderer.domElement.requestPointerLock();
        }
      } else if (e.button === 2) {
        rightMouseDownRef.current = true;
        e.preventDefault();
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 0) {
        mouseDownRef.current = false;
      } else if (e.button === 2) {
        rightMouseDownRef.current = false;
      }
    };

    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'KeyW') keysRef.current.up = true;
      if (code === 'KeyS') keysRef.current.down = true;
      if (code === 'KeyA') keysRef.current.left = true;
      if (code === 'KeyD') keysRef.current.right = true;
      if (code === 'Space') keysRef.current.jump = true;

      if (code === 'Digit1' || code === 'Numpad1') switchWeapon(1);
      if (code === 'Digit2' || code === 'Numpad2') switchWeapon(2);
      if (code === 'Digit3' || code === 'Numpad3') switchWeapon(3);
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const code = e.code;
      if (code === 'KeyW') keysRef.current.up = false;
      if (code === 'KeyS') keysRef.current.down = false;
      if (code === 'KeyA') keysRef.current.left = false;
      if (code === 'KeyD') keysRef.current.right = false;
      if (code === 'Space') keysRef.current.jump = false;
    };

    const switchWeapon = (slot: number) => {
      currentSlotRef.current = slot;
      const slotMap: Record<number, 'primary' | 'secondary' | 'utility'> = {
        1: 'primary',
        2: 'secondary',
        3: 'utility'
      };
      gameEngine.switchWeapon(slotMap[slot]);

      // Update gun mesh
      if (gunMeshRef.current && cameraRef.current) {
        cameraRef.current.remove(gunMeshRef.current);
      }
      const player = gameEngine.getPlayer();
      if (player && cameraRef.current) {
        const newGun = createGunMesh(player.primaryGun, player.skin, slot);
        cameraRef.current.add(newGun);
        gunMeshRef.current = newGun;
      }
    };

    window.addEventListener('resize', handleResize);
    document.addEventListener('pointerlockchange', handlePointerLockChange);
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);

    // Initial pointer lock
    renderer.domElement.addEventListener('click', () => {
      renderer.domElement.requestPointerLock();
    });

    return () => {
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', handleResize);
      document.removeEventListener('pointerlockchange', handlePointerLockChange);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [gameEngine, createGunMesh, createPlayerMesh, renderMap, onPlayerUpdate, sensitivity]);

  // Update remote multiplayer players
  useEffect(() => {
    if (!sceneRef.current) return;
    const scene = sceneRef.current;
    
    const remotePlayerIds = Object.keys(remotePlayers);
    
    // Remove players who left
    remotePlayersRef.current.forEach((mesh, id) => {
      if (!remotePlayerIds.includes(id)) {
        scene.remove(mesh);
        remotePlayersRef.current.delete(id);
      }
    });

    // Update/add remote players
    remotePlayerIds.forEach(id => {
      const rPlayer = remotePlayers[id];
      
      if (!remotePlayersRef.current.has(id)) {
        const mesh = createRemotePlayerMesh(rPlayer);
        scene.add(mesh);
        remotePlayersRef.current.set(id, mesh);
      }

      const mesh = remotePlayersRef.current.get(id)!;
      mesh.visible = !rPlayer.isDead;
      mesh.position.lerp(
        new THREE.Vector3(rPlayer.position.x, rPlayer.position.y, rPlayer.position.z),
        0.3
      );
      mesh.rotation.y = rPlayer.rotation.y;
    });
  }, [remotePlayers, createRemotePlayerMesh]);

  return <div ref={containerRef} className="absolute inset-0 z-0" />;
};
