export interface Player {
  id: string;
  username: string;
  teamColor: 'blue' | 'red';
  primaryGun: 'ak47' | 'sniper' | 'rpg';
  activeSlot: 'primary' | 'secondary' | 'utility';
  skin: string;
  x: number;
  y: number;
  z: number;
  vy: number;
  rotation: number;
  pitch: number;
  health: number;
  maxHealth: number;
  ammoPrimary: number;
  ammoSecondary: number;
  grenades: number;
  isDead: boolean;
  score: number;
  cooldown: number;
  grounded: boolean;
  sessionKills: number;
  sessionDeaths: number;
}

export interface Bot extends Player {
  isBot: true;
  targetId: string | null;
  moveDir: { x: number; z: number };
  lastDirChange: number;
  shootCooldown: number;
}

export interface Bullet {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  type: 'ak47' | 'sniper' | 'rpg' | 'pistol' | 'grenade';
  life: number;
  damage: number;
  splash?: number;
  gravity?: number;
  speed: number;
}

export interface Pickup {
  id: string;
  type: 'health' | 'ammo' | 'grenade';
  x: number;
  z: number;
}

export interface MapObject {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
  type?: 'building' | 'crate' | 'wall';
}

export interface GameState {
  players: Record<string, Player | Bot>;
  bullets: Bullet[];
  pickups: Pickup[];
  mapObjects: MapObject[];
  scores: { blue: number; red: number };
  isActive: boolean;
  winner: 'blue' | 'red' | null;
}

export interface WeaponStats {
  damage: number;
  speed: number;
  cooldown: number;
  life: number;
  type: string;
  splash?: number;
  gravity?: number;
}

export const WEAPONS: Record<string, WeaponStats> = {
  pistol: { damage: 15, speed: 2.0, cooldown: 15, life: 40, type: 'secondary' },
  ak47: { damage: 25, speed: 2.5, cooldown: 8, life: 60, type: 'primary' },
  sniper: { damage: 50, speed: 6.0, cooldown: 60, life: 120, type: 'primary' },
  rpg: { damage: 100, speed: 1.2, cooldown: 100, life: 100, type: 'primary', splash: 15 },
  grenade: { damage: 100, speed: 0.9, cooldown: 100, life: 120, type: 'utility', splash: 20, gravity: 0.03 }
};

export type MapType = 'urban' | 'desert' | 'forest' | 'industrial' | 'arctic';

export const WIN_SCORE = 20;
export const MAP_SIZE = 300;
export const MAP_BOUNDS = MAP_SIZE / 2;
export const GRAVITY = 0.025;
export const JUMP_FORCE = 0.55;
