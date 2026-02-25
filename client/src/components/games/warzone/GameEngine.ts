import { 
  GameState, Player, Bot, Bullet, Pickup, MapObject,
  WEAPONS, WIN_SCORE, MAP_SIZE, MAP_BOUNDS, GRAVITY, JUMP_FORCE, MapType
} from './GameTypes';
import { soundManager } from './SoundManager';

const createId = (): string =>
  typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

type KillCallback = (killer: string, victim: string) => void;
type GameOverCallback = (winner: 'blue' | 'red', rankings: Array<{name: string; kills: number; deaths: number; team: string}>) => void;

export class GameEngine {
  private state: GameState;
  private playerId: string;
  private onKill: KillCallback;
  private onGameOver: GameOverCallback;
  private updateInterval: number | null = null;
  private playerWaitingRespawn: boolean = false;
  private mapType: MapType;
  private difficulty: 'easy' | 'medium' | 'hard';

  constructor(
    playerName: string,
    team: 'blue' | 'red',
    primaryGun: 'ak47' | 'sniper' | 'rpg',
    skin: string,
    onKill: KillCallback,
    onGameOver: GameOverCallback,
    mapType: MapType = 'urban',
    botCount: number = 16,
    difficulty: 'easy' | 'medium' | 'hard' = 'hard'
  ) {
    this.playerId = 'player';
    this.onKill = onKill;
    this.onGameOver = onGameOver;
    this.mapType = mapType;
    this.difficulty = difficulty;

    const mapObjects = this.generateMap(mapType);
    
    this.state = {
      players: {},
      bullets: [],
      pickups: [],
      mapObjects,
      scores: { blue: 0, red: 0 },
      isActive: true,
      winner: null
    };

    // Create player
    this.state.players[this.playerId] = this.createPlayer(
      this.playerId,
      playerName,
      team,
      primaryGun,
      skin,
      false
    );

    // Create bots for both teams (8 blue, 8 red in singleplayer)
    const botNames = ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo', 'Foxtrot', 'Golf', 'Hotel',
                      'India', 'Juliet', 'Kilo', 'Lima', 'Mike', 'November', 'Oscar', 'Papa'];
    const guns: Array<'ak47' | 'sniper' | 'rpg'> = ['ak47', 'sniper', 'rpg'];
    
    const botsPerTeam = Math.floor(botCount / 2);
    for (let i = 0; i < botCount; i++) {
      const botTeam: 'blue' | 'red' = i < botsPerTeam ? 'blue' : 'red';
      const botId = `bot_${i}`;
      this.state.players[botId] = this.createBot(
        botId,
        botNames[i % botNames.length],
        botTeam,
        guns[i % 3]
      );
    }

    // Generate pickups
    this.generatePickups();

    // Start game loop
    this.startGameLoop();
  }

  private createPlayer(
    id: string,
    name: string,
    team: 'blue' | 'red',
    gun: 'ak47' | 'sniper' | 'rpg',
    skin: string,
    isBot: boolean
  ): Player {
    let sx: number, sz: number;
    do {
      sx = (Math.random() - 0.5) * 150;
      sz = (Math.random() - 0.5) * 150;
    } while (Math.abs(sx) < 15 || Math.abs(sz) < 15);

    // Set max ammo based on weapon type
    let maxAmmoPrimary = 80; // Default for AK-47
    if (gun === 'sniper') {
      maxAmmoPrimary = 40;
    } else if (gun === 'rpg') {
      maxAmmoPrimary = 10;
    }

    return {
      id,
      username: name,
      teamColor: team,
      primaryGun: gun,
      activeSlot: 'primary',
      skin,
      x: sx,
      y: 5,
      z: sz,
      vy: 0,
      rotation: 0,
      pitch: 0,
      health: 100,
      maxHealth: 100,
      ammoPrimary: maxAmmoPrimary,
      ammoSecondary: 30, // Pistol max 30
      grenades: 3,
      isDead: false,
      score: 0,
      cooldown: 0,
      grounded: false,
      sessionKills: 0,
      sessionDeaths: 0
    };
  }

  private createBot(
    id: string,
    name: string,
    team: 'blue' | 'red',
    gun: 'ak47' | 'sniper' | 'rpg'
  ): Bot {
    const player = this.createPlayer(id, name, team, gun, 'normal', true);
    return {
      ...player,
      isBot: true,
      targetId: null,
      moveDir: { x: 0, z: 0 },
      lastDirChange: 0,
      shootCooldown: 0
    };
  }

  private generateMap(mapType: MapType): MapObject[] {
    const objects: MapObject[] = [];
    const wallHeight = 8;
    
    // Boundary walls (all maps)
    objects.push({ x: 0, y: wallHeight/2, z: MAP_BOUNDS, w: MAP_SIZE, h: wallHeight, d: 2, type: 'wall' });
    objects.push({ x: 0, y: wallHeight/2, z: -MAP_BOUNDS, w: MAP_SIZE, h: wallHeight, d: 2, type: 'wall' });
    objects.push({ x: MAP_BOUNDS, y: wallHeight/2, z: 0, w: 2, h: wallHeight, d: MAP_SIZE, type: 'wall' });
    objects.push({ x: -MAP_BOUNDS, y: wallHeight/2, z: 0, w: 2, h: wallHeight, d: MAP_SIZE, type: 'wall' });

    switch (mapType) {
      case 'urban':
        // Central tower
        objects.push({ x: 0, y: 2.5, z: 0, w: 10, h: 5, d: 10, type: 'building' });
        objects.push({ x: 0, y: 7.5, z: 0, w: 12, h: 1, d: 12, type: 'building' });
        
        // Buildings scattered around
        for (let i = 0; i < 60; i++) {
          const r = 20 + Math.random() * 100;
          const a = Math.random() * Math.PI * 2;
          objects.push({
            x: Math.sin(a) * r,
            y: (2 + Math.random() * 6) / 2,
            z: Math.cos(a) * r,
            w: 2 + Math.random() * 4,
            h: 2 + Math.random() * 6,
            d: 2 + Math.random() * 4,
            type: Math.random() > 0.7 ? 'crate' : 'building'
          });
        }
        break;

      case 'desert':
        // Central pyramid
        objects.push({ x: 0, y: 6, z: 0, w: 20, h: 12, d: 20, type: 'building' });
        
        // Sand dunes (low wide obstacles)
        for (let i = 0; i < 30; i++) {
          const r = 30 + Math.random() * 90;
          const a = Math.random() * Math.PI * 2;
          objects.push({
            x: Math.sin(a) * r,
            y: 1.5,
            z: Math.cos(a) * r,
            w: 8 + Math.random() * 12,
            h: 3,
            d: 8 + Math.random() * 12,
            type: 'building'
          });
        }
        
        // Scattered ruins
        for (let i = 0; i < 25; i++) {
          const r = 15 + Math.random() * 110;
          const a = Math.random() * Math.PI * 2;
          objects.push({
            x: Math.sin(a) * r,
            y: (1 + Math.random() * 4) / 2,
            z: Math.cos(a) * r,
            w: 2 + Math.random() * 3,
            h: 1 + Math.random() * 4,
            d: 2 + Math.random() * 3,
            type: 'crate'
          });
        }
        break;

      case 'forest':
        // Central bunker
        objects.push({ x: 0, y: 2, z: 0, w: 8, h: 4, d: 8, type: 'building' });
        
        // Trees (tall narrow obstacles)
        for (let i = 0; i < 80; i++) {
          const r = 15 + Math.random() * 120;
          const a = Math.random() * Math.PI * 2;
          const h = 4 + Math.random() * 8;
          objects.push({
            x: Math.sin(a) * r,
            y: h / 2,
            z: Math.cos(a) * r,
            w: 1 + Math.random() * 1.5,
            h: h,
            d: 1 + Math.random() * 1.5,
            type: 'crate'
          });
        }
        
        // Rocks
        for (let i = 0; i < 20; i++) {
          const r = 20 + Math.random() * 100;
          const a = Math.random() * Math.PI * 2;
          objects.push({
            x: Math.sin(a) * r,
            y: 1,
            z: Math.cos(a) * r,
            w: 2 + Math.random() * 3,
            h: 2,
            d: 2 + Math.random() * 3,
            type: 'building'
          });
        }
        break;

      case 'industrial':
        // Central factory
        objects.push({ x: 0, y: 5, z: 0, w: 20, h: 10, d: 15, type: 'building' });
        objects.push({ x: 0, y: 12, z: 0, w: 10, h: 4, d: 8, type: 'building' });
        
        // Warehouse rows
        for (let row = -2; row <= 2; row++) {
          if (row === 0) continue;
          for (let col = -3; col <= 3; col++) {
            if (Math.random() > 0.6) continue;
            objects.push({
              x: row * 40,
              y: 4,
              z: col * 25,
              w: 15,
              h: 8,
              d: 12,
              type: 'building'
            });
          }
        }
        
        // Crates and containers
        for (let i = 0; i < 50; i++) {
          const x = (Math.random() - 0.5) * 260;
          const z = (Math.random() - 0.5) * 260;
          if (Math.abs(x) < 25 && Math.abs(z) < 20) continue;
          objects.push({
            x, y: 1.5, z,
            w: 3, h: 3, d: 6,
            type: 'crate'
          });
        }
        break;

      case 'arctic':
        // Ice fortress
        objects.push({ x: 0, y: 4, z: 0, w: 15, h: 8, d: 15, type: 'building' });
        objects.push({ x: -20, y: 3, z: 20, w: 10, h: 6, d: 10, type: 'building' });
        objects.push({ x: 20, y: 3, z: -20, w: 10, h: 6, d: 10, type: 'building' });
        
        // Ice formations
        for (let i = 0; i < 40; i++) {
          const r = 25 + Math.random() * 100;
          const a = Math.random() * Math.PI * 2;
          const h = 2 + Math.random() * 6;
          objects.push({
            x: Math.sin(a) * r,
            y: h / 2,
            z: Math.cos(a) * r,
            w: 3 + Math.random() * 4,
            h: h,
            d: 3 + Math.random() * 4,
            type: 'building'
          });
        }
        
        // Snow mounds
        for (let i = 0; i < 30; i++) {
          const r = 20 + Math.random() * 110;
          const a = Math.random() * Math.PI * 2;
          objects.push({
            x: Math.sin(a) * r,
            y: 1,
            z: Math.cos(a) * r,
            w: 5 + Math.random() * 6,
            h: 2,
            d: 5 + Math.random() * 6,
            type: 'crate'
          });
        }
        break;
    }

    return objects;
  }

  getMapType(): MapType {
    return this.mapType;
  }

  private generatePickups() {
    for (let i = 0; i < 20; i++) {
      const types: Array<'health' | 'ammo' | 'grenade'> = ['health', 'ammo', 'grenade'];
      this.state.pickups.push({
        id: createId(),
        type: types[Math.floor(Math.random() * 3)],
        x: (Math.random() - 0.5) * 250,
        z: (Math.random() - 0.5) * 250
      });
    }
  }

  private startGameLoop() {
    this.updateInterval = window.setInterval(() => {
      this.update();
    }, 16);
  }

  private update() {
    if (!this.state.isActive) return;

    // Update bots
    Object.values(this.state.players).forEach(p => {
      if ('isBot' in p && p.isBot) {
        this.updateBot(p as Bot);
      }
    });

    // Update bullets
    this.updateBullets();

    // Check pickups
    this.checkPickups();

    // Update cooldowns
    Object.values(this.state.players).forEach(p => {
      if (p.cooldown > 0) p.cooldown--;
    });
  }

  private updateBot(bot: Bot) {
    if (bot.isDead) return;

    const now = Date.now();
    
    // Change direction periodically
    if (now - bot.lastDirChange > 2000) {
      bot.moveDir = {
        x: Math.random() * 2 - 1,
        z: Math.random() * 2 - 1
      };
      bot.lastDirChange = now;
    }

    // Find target
    let closestEnemy: Player | null = null;
    let closestDist = Infinity;
    
    Object.values(this.state.players).forEach(p => {
      if (p.id !== bot.id && p.teamColor !== bot.teamColor && !p.isDead) {
        const dist = Math.hypot(p.x - bot.x, p.z - bot.z);
        if (dist < closestDist) {
          closestDist = dist;
          closestEnemy = p;
        }
      }
    });

    // Move towards enemy or random direction
    if (closestEnemy && closestDist < 80) {
      const dx = closestEnemy.x - bot.x;
      const dz = closestEnemy.z - bot.z;
      bot.rotation = Math.atan2(-dx, -dz);
      
      // Move towards enemy
      const speed = 0.2;
      const newX = bot.x + Math.sin(-bot.rotation) * speed;
      const newZ = bot.z + Math.cos(-bot.rotation) * speed;
      
      if (Math.abs(newX) < MAP_BOUNDS && !this.checkCollision(newX, bot.y, bot.z)) {
        bot.x = newX;
      }
      if (Math.abs(newZ) < MAP_BOUNDS && !this.checkCollision(bot.x, bot.y, newZ)) {
        bot.z = newZ;
      }

      // Shoot at enemy
      if (bot.shootCooldown <= 0 && closestDist < 50) {
        this.botShoot(bot, closestEnemy);
        bot.shootCooldown = 30 + Math.random() * 30;
      }
    } else {
      // Random movement
      const speed = 0.15;
      const newX = bot.x + bot.moveDir.x * speed;
      const newZ = bot.z + bot.moveDir.z * speed;
      
      if (Math.abs(newX) < MAP_BOUNDS && !this.checkCollision(newX, bot.y, bot.z)) {
        bot.x = newX;
      }
      if (Math.abs(newZ) < MAP_BOUNDS && !this.checkCollision(bot.x, bot.y, newZ)) {
        bot.z = newZ;
      }
    }

    // Apply gravity
    bot.vy -= GRAVITY;
    let ny = bot.y + bot.vy;
    const floor = this.getFloor(bot.x, ny, bot.z);
    
    if (floor !== null && ny <= floor) {
      bot.y = floor;
      bot.vy = 0;
      bot.grounded = true;
    } else if (ny < 0) {
      bot.y = 0;
      bot.vy = 0;
      bot.grounded = true;
    } else {
      bot.y = ny;
      bot.grounded = false;
    }

    if (bot.shootCooldown > 0) bot.shootCooldown--;
  }

  private botShoot(bot: Bot, target: Player) {
    const weapon = WEAPONS[bot.primaryGun];
    if (bot.ammoPrimary <= 0) return;
    
    bot.ammoPrimary--;
    
    const dx = target.x - bot.x;
    const dy = (target.y + 1.5) - (bot.y + 1.5);
    const dz = target.z - bot.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
    
    // Add some inaccuracy
    const accuracy = 0.95;
    const vx = (dx / dist) * weapon.speed * (accuracy + Math.random() * (1 - accuracy));
    const vy = (dy / dist) * weapon.speed * (accuracy + Math.random() * (1 - accuracy));
    const vz = (dz / dist) * weapon.speed * (accuracy + Math.random() * (1 - accuracy));

    this.state.bullets.push({
      id: createId(),
      ownerId: bot.id,
      x: bot.x,
      y: bot.y + 1.5,
      z: bot.z,
      vx, vy, vz,
      type: bot.primaryGun,
      life: weapon.life,
      damage: weapon.damage,
      splash: weapon.splash,
      speed: weapon.speed
    });

    soundManager.play(bot.primaryGun === 'rpg' ? 'rpg' : 'shoot', 0.3);
  }

  private updateBullets() {
    for (let i = this.state.bullets.length - 1; i >= 0; i--) {
      const b = this.state.bullets[i];
      const steps = Math.ceil(b.speed || 1);
      const sVx = b.vx / steps;
      const sVy = b.vy / steps;
      const sVz = b.vz / steps;
      let hit = false;

      for (let s = 0; s < steps; s++) {
        if (b.gravity) b.vy -= b.gravity / steps;
        b.x += sVx;
        b.y += sVy;
        b.z += sVz;

        // Check floor collision
        let floor = this.getFloor(b.x, b.y, b.z);
        if (floor === null && b.y < 0) floor = 0;

        if (floor !== null && b.y <= floor + 0.2) {
          if (b.type === 'grenade') {
            b.y = floor + 0.2;
            b.vy *= -0.5;
            b.vx *= 0.7;
            b.vz *= 0.7;
          } else {
            hit = true;
            break;
          }
        } else if (this.checkCollision(b.x, b.y, b.z)) {
          hit = true;
          break;
        }

        // Check player collision
        if (b.type !== 'grenade') {
          for (const pid in this.state.players) {
            const p = this.state.players[pid];
            if (p.id !== b.ownerId && !p.isDead) {
              if (Math.abs(p.x - b.x) < 1 && Math.abs(p.z - b.z) < 1 && b.y > p.y && b.y < p.y + 2) {
                this.applyDamage(p, b.ownerId, b.damage);
                hit = true;
                if (b.splash) this.explode(b);
                break;
              }
            }
          }
        }
        if (hit) break;
      }

      b.life--;
      if (hit || (b.type === 'grenade' && b.life <= 0) || (b.type !== 'grenade' && b.life <= 0)) {
        if (b.splash && (hit || b.life <= 0)) this.explode(b);
        if (b.type !== 'grenade' || b.life <= 0) {
          this.state.bullets.splice(i, 1);
        }
      }
    }
  }

  private explode(bullet: Bullet) {
    soundManager.play('explosion', 0.8);
    
    const range = bullet.splash || 15;
    
    Object.values(this.state.players).forEach(p => {
      if (!p.isDead) {
        const dist = Math.sqrt(
          Math.pow(p.x - bullet.x, 2) +
          Math.pow(p.y - bullet.y, 2) +
          Math.pow(p.z - bullet.z, 2)
        );
        if (dist < range) {
          const dmg = Math.floor(10 + (bullet.damage - 10) * (1 - dist / range));
          this.applyDamage(p, bullet.ownerId, dmg);
        }
      }
    });
  }

  private applyDamage(player: Player, attackerId: string, damage: number) {
    const attacker = this.state.players[attackerId];
    
    // No friendly fire
    if (attacker && attacker.teamColor === player.teamColor && attackerId !== player.id) {
      return;
    }

    player.health -= damage;
    soundManager.play('hit', 0.5);

    if (player.health <= 0) {
      player.health = 0;
      player.isDead = true;
      player.sessionDeaths++;

      if (attacker) {
        attacker.score++;
        attacker.sessionKills++;
        this.state.scores[attacker.teamColor]++;
        this.onKill(attacker.username, player.username);
        this.checkWin();
      }

      // Bots auto-respawn, players wait for manual respawn
      if (player.id !== this.playerId) {
        setTimeout(() => {
          this.respawnPlayer(player.id);
        }, 3000);
      } else {
        this.playerWaitingRespawn = true;
      }
    }
  }

  // Manual respawn for player
  manualRespawn() {
    if (this.playerWaitingRespawn) {
      this.respawnPlayer(this.playerId);
      this.playerWaitingRespawn = false;
    }
  }

  isWaitingRespawn(): boolean {
    return this.playerWaitingRespawn;
  }

  private respawnPlayer(playerId: string) {
    const player = this.state.players[playerId];
    if (!player) return;

    let sx: number, sz: number;
    do {
      sx = (Math.random() - 0.5) * 150;
      sz = (Math.random() - 0.5) * 150;
    } while (Math.abs(sx) < 15 || Math.abs(sz) < 15);

    // Get max ammo based on weapon type
    let maxAmmoPrimary = 80; // Default for AK-47
    if (player.primaryGun === 'sniper') {
      maxAmmoPrimary = 40;
    } else if (player.primaryGun === 'rpg') {
      maxAmmoPrimary = 10;
    }

    player.x = sx;
    player.y = 5;
    player.z = sz;
    player.health = 100;
    player.isDead = false;
    player.ammoPrimary = maxAmmoPrimary;
    player.ammoSecondary = 30; // Pistol max 30
    player.grenades = 3;
  }

  private checkWin() {
    if (this.state.scores.blue >= WIN_SCORE || this.state.scores.red >= WIN_SCORE) {
      this.state.isActive = false;
      const winner: 'blue' | 'red' = this.state.scores.blue >= WIN_SCORE ? 'blue' : 'red';
      this.state.winner = winner;

      // Create rankings
      const rankings = Object.values(this.state.players)
        .map(p => ({
          name: p.username,
          kills: p.sessionKills,
          deaths: p.sessionDeaths,
          team: p.teamColor
        }))
        .sort((a, b) => {
          if (b.kills !== a.kills) return b.kills - a.kills;
          return a.deaths - b.deaths; // Less deaths is better
        });

      this.onGameOver(winner, rankings);
    }
  }

  private checkPickups() {
    Object.values(this.state.players).forEach(p => {
      if (p.isDead) return;
      
      // Get max ammo based on weapon type
      const getMaxPrimaryAmmo = (gun: string) => {
        if (gun === 'sniper') return 40;
        if (gun === 'rpg') return 10;
        return 80; // AK-47
      };
      const maxPrimary = getMaxPrimaryAmmo(p.primaryGun);
      const maxSecondary = 30; // Pistol
      const maxGrenades = 5;
      
      for (let i = this.state.pickups.length - 1; i >= 0; i--) {
        const pk = this.state.pickups[i];
        // Fixed: check horizontal distance and height above ground
        const horizontalDist = Math.hypot(p.x - pk.x, p.z - pk.z);
        if (horizontalDist < 2.5 && p.y < 3) {
          let used = false;
          
          if (pk.type === 'health') {
            if (p.health < 100) {
              p.health = Math.min(100, p.health + 50);
              used = true;
            }
          } else if (pk.type === 'ammo') {
            // Only collect if below max
            if (p.ammoPrimary < maxPrimary || p.ammoSecondary < maxSecondary) {
              const primaryToAdd = Math.min(maxPrimary - p.ammoPrimary, Math.ceil(maxPrimary * 0.3));
              const secondaryToAdd = Math.min(maxSecondary - p.ammoSecondary, Math.ceil(maxSecondary * 0.3));
              
              if (primaryToAdd > 0 || secondaryToAdd > 0) {
                p.ammoPrimary = Math.min(maxPrimary, p.ammoPrimary + primaryToAdd);
                p.ammoSecondary = Math.min(maxSecondary, p.ammoSecondary + secondaryToAdd);
                used = true;
              }
            }
          } else if (pk.type === 'grenade') {
            if (p.grenades < maxGrenades) {
              p.grenades++;
              used = true;
            }
          }

          if (used) {
            soundManager.play('pickup', 0.5);
            this.state.pickups.splice(i, 1);
            
            // Respawn pickup after delay
            setTimeout(() => {
              const types: Array<'health' | 'ammo' | 'grenade'> = ['health', 'ammo', 'grenade'];
              this.state.pickups.push({
                id: createId(),
                type: types[Math.floor(Math.random() * 3)],
                x: (Math.random() - 0.5) * 250,
                z: (Math.random() - 0.5) * 250
              });
            }, 10000);
          }
        }
      }
    });
  }

  private checkCollision(x: number, y: number, z: number): boolean {
    const r = 0.6;
    for (const o of this.state.mapObjects) {
      if (
        x > o.x - o.w / 2 - r && x < o.x + o.w / 2 + r &&
        z > o.z - o.d / 2 - r && z < o.z + o.d / 2 + r &&
        y + 0.5 < o.y + o.h / 2 && y + 1.5 > o.y - o.h / 2
      ) {
        return true;
      }
    }
    return false;
  }

  private getFloor(x: number, y: number, z: number): number | null {
    let highestY: number | null = null;
    for (const o of this.state.mapObjects) {
      if (x >= o.x - o.w / 2 && x <= o.x + o.w / 2 && z >= o.z - o.d / 2 && z <= o.z + o.d / 2) {
        const top = o.y + o.h / 2;
        if (y >= top - 0.5) {
          if (highestY === null || top > highestY) highestY = top;
        }
      }
    }
    return highestY;
  }

  // Public methods for player control
  processInput(input: {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    jump: boolean;
    rotation: number;
    pitch: number;
  }) {
    const player = this.state.players[this.playerId];
    if (!player || player.isDead || !this.state.isActive) return;

    const sin = Math.sin(input.rotation);
    const cos = Math.cos(input.rotation);
    let dx = 0, dz = 0;
    const speed = 0.4;

    if (input.up) { dx -= sin * speed; dz -= cos * speed; }
    if (input.down) { dx += sin * speed; dz += cos * speed; }
    if (input.left) { dx -= cos * speed; dz += sin * speed; }
    if (input.right) { dx += cos * speed; dz -= sin * speed; }

    // Check collisions and apply movement
    if (Math.abs(player.x + dx) < MAP_BOUNDS && !this.checkCollision(player.x + dx, player.y, player.z)) {
      player.x += dx;
    }
    if (Math.abs(player.z + dz) < MAP_BOUNDS && !this.checkCollision(player.x, player.y, player.z + dz)) {
      player.z += dz;
    }

    // Jump
    if (input.jump && player.grounded) {
      player.vy = JUMP_FORCE;
      player.grounded = false;
    }

    // Apply gravity
    player.vy -= GRAVITY;
    let ny = player.y + player.vy;
    let floor = this.getFloor(player.x, ny, player.z);
    if (floor === null && ny < 0) floor = 0;

    if (floor !== null && ny <= floor) {
      player.y = floor;
      player.vy = 0;
      player.grounded = true;
    } else {
      player.y = ny;
      player.grounded = false;
    }

    player.rotation = input.rotation;
    player.pitch = input.pitch;
  }

  shoot(yaw: number, pitch: number) {
    const player = this.state.players[this.playerId];
    if (!player || player.isDead || player.cooldown > 0 || !this.state.isActive) return;

    let weaponType: string = '';
    let fire = false;

    if (player.activeSlot === 'primary' && player.ammoPrimary > 0) {
      weaponType = player.primaryGun;
      player.ammoPrimary--;
      fire = true;
    } else if (player.activeSlot === 'secondary' && player.ammoSecondary > 0) {
      weaponType = 'pistol';
      player.ammoSecondary--;
      fire = true;
    } else if (player.activeSlot === 'utility' && player.grenades > 0) {
      weaponType = 'grenade';
      player.grenades--;
      fire = true;
    }

    if (fire && weaponType) {
      const weapon = WEAPONS[weaponType];
      player.cooldown = weapon.cooldown;

      const spawnY = player.y + 1.5;
      const vx = -Math.sin(yaw) * Math.cos(pitch) * weapon.speed;
      const vy = Math.sin(pitch) * weapon.speed;
      const vz = -Math.cos(yaw) * Math.cos(pitch) * weapon.speed;

      this.state.bullets.push({
        id: createId(),
        ownerId: player.id,
        x: player.x,
        y: spawnY,
        z: player.z,
        vx, vy, vz,
        type: weaponType as Bullet['type'],
        life: weapon.life,
        damage: weapon.damage,
        splash: weapon.splash,
        gravity: weapon.gravity,
        speed: weapon.speed
      });

      // Play appropriate sound
      if (weaponType === 'grenade') {
        soundManager.play('shoot', 0.4);
      } else if (weaponType === 'pistol') {
        soundManager.play('pistol', 0.5);
      } else if (weaponType === 'sniper') {
        soundManager.play('sniper', 0.6);
      } else if (weaponType === 'rpg') {
        soundManager.play('rpg', 0.7);
      } else {
        soundManager.play('shoot', 0.5);
      }
    }
  }

  switchWeapon(slot: 'primary' | 'secondary' | 'utility') {
    const player = this.state.players[this.playerId];
    if (player) {
      player.activeSlot = slot;
    }
  }

  changePlayerWeapon(gun: 'ak47' | 'sniper' | 'rpg', skin: string) {
    const player = this.state.players[this.playerId];
    if (player) {
      player.primaryGun = gun;
      player.skin = skin;
    }
  }

  setSensitivity(sensitivity: number) {
    // Sensitivity is handled in the renderer
  }

  getState(): GameState {
    return this.state;
  }

  getPlayer(): Player | undefined {
    return this.state.players[this.playerId];
  }

  getPlayerId(): string {
    return this.playerId;
  }

  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
    }
  }
}
