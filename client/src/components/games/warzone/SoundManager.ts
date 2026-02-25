// Sound Manager using Web Audio API with procedurally generated sounds
class SoundManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private sounds: Map<string, AudioBuffer> = new Map();
  private isInitialized = false;

  async init() {
    if (this.isInitialized) return;
    
    try {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = 0.5;
      
      // Generate procedural sounds
      this.sounds.set('shoot', this.generateShootSound());
      this.sounds.set('pistol', this.generatePistolSound());
      this.sounds.set('sniper', this.generateSniperSound());
      this.sounds.set('rpg', this.generateRPGSound());
      this.sounds.set('explosion', this.generateExplosionSound());
      this.sounds.set('walk', this.generateWalkSound());
      this.sounds.set('pickup', this.generatePickupSound());
      this.sounds.set('hit', this.generateHitSound());
      
      this.isInitialized = true;
    } catch (e) {
      console.warn('Audio context not available:', e);
    }
  }

  private generateShootSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context');
    const duration = 0.15;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 30);
      const noise = (Math.random() * 2 - 1) * 0.3;
      const tone = Math.sin(2 * Math.PI * 150 * t) * 0.7;
      data[i] = (noise + tone) * envelope;
    }
    return buffer;
  }

  private generatePistolSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context');
    const duration = 0.1;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 40);
      const noise = (Math.random() * 2 - 1) * 0.4;
      const tone = Math.sin(2 * Math.PI * 200 * t) * 0.6;
      data[i] = (noise + tone) * envelope;
    }
    return buffer;
  }

  private generateSniperSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context');
    const duration = 0.3;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 15);
      const noise = (Math.random() * 2 - 1) * 0.5;
      const tone = Math.sin(2 * Math.PI * 80 * t) * 0.5;
      const crack = Math.sin(2 * Math.PI * 2000 * t) * Math.exp(-t * 100) * 0.3;
      data[i] = (noise + tone + crack) * envelope;
    }
    return buffer;
  }

  private generateRPGSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context');
    const duration = 0.5;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 8);
      const noise = (Math.random() * 2 - 1) * 0.4;
      const whoosh = Math.sin(2 * Math.PI * (100 + t * 500) * t) * 0.6;
      data[i] = (noise + whoosh) * envelope;
    }
    return buffer;
  }

  private generateExplosionSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context');
    const duration = 0.8;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 5);
      const noise = (Math.random() * 2 - 1);
      const lowRumble = Math.sin(2 * Math.PI * 40 * t) * 0.5;
      const midCrunch = Math.sin(2 * Math.PI * 120 * t) * Math.exp(-t * 10) * 0.3;
      data[i] = (noise * 0.4 + lowRumble + midCrunch) * envelope;
    }
    return buffer;
  }

  private generateWalkSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context');
    const duration = 0.2;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 20);
      const noise = (Math.random() * 2 - 1) * 0.2;
      const thud = Math.sin(2 * Math.PI * 80 * t) * 0.3;
      data[i] = (noise + thud) * envelope;
    }
    return buffer;
  }

  private generatePickupSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context');
    const duration = 0.3;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 10);
      const tone1 = Math.sin(2 * Math.PI * 440 * t) * 0.3;
      const tone2 = Math.sin(2 * Math.PI * 660 * t) * 0.3;
      const tone3 = Math.sin(2 * Math.PI * 880 * t * (1 + t)) * 0.2;
      data[i] = (tone1 + tone2 + tone3) * envelope;
    }
    return buffer;
  }

  private generateHitSound(): AudioBuffer {
    if (!this.audioContext) throw new Error('No audio context');
    const duration = 0.15;
    const sampleRate = this.audioContext.sampleRate;
    const buffer = this.audioContext.createBuffer(1, duration * sampleRate, sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < buffer.length; i++) {
      const t = i / sampleRate;
      const envelope = Math.exp(-t * 25);
      const noise = (Math.random() * 2 - 1) * 0.5;
      const thump = Math.sin(2 * Math.PI * 200 * t) * 0.5;
      data[i] = (noise + thump) * envelope;
    }
    return buffer;
  }

  play(soundName: string, volume = 1, playbackRate = 1) {
    if (!this.audioContext || !this.masterGain || !this.isInitialized) return;
    
    const buffer = this.sounds.get(soundName);
    if (!buffer) return;
    
    // Resume context if suspended
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    
    const source = this.audioContext.createBufferSource();
    const gainNode = this.audioContext.createGain();
    
    source.buffer = buffer;
    source.playbackRate.value = playbackRate + (Math.random() - 0.5) * 0.1;
    gainNode.gain.value = volume;
    
    source.connect(gainNode);
    gainNode.connect(this.masterGain);
    source.start(0);
  }

  setMasterVolume(volume: number) {
    if (this.masterGain) {
      this.masterGain.gain.value = Math.max(0, Math.min(1, volume));
    }
  }
}

export const soundManager = new SoundManager();
