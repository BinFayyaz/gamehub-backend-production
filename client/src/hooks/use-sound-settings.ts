import { useState, useEffect, useCallback } from "react";

interface SoundSettings {
  soundEffectsEnabled: boolean;
}

const DEFAULT_SETTINGS: SoundSettings = {
  soundEffectsEnabled: true,
};

const STORAGE_KEY = "gameHub_soundSettings";

let audioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return audioContext;
}

export function useSoundSettings() {
  const [settings, setSettings] = useState<SoundSettings>(() => {
    if (typeof window === "undefined") return DEFAULT_SETTINGS;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        return DEFAULT_SETTINGS;
      }
    }
    return DEFAULT_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  }, [settings]);

  const toggleSoundEffects = useCallback(() => {
    setSettings((prev) => ({
      ...prev,
      soundEffectsEnabled: !prev.soundEffectsEnabled,
    }));
  }, []);

  const setSoundEffectsEnabled = useCallback((enabled: boolean) => {
    setSettings((prev) => ({
      ...prev,
      soundEffectsEnabled: enabled,
    }));
  }, []);

  const playWinSound = useCallback(() => {
    if (!settings.soundEffectsEnabled) return;
    
    try {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      
      const oscillator1 = ctx.createOscillator();
      const oscillator2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator1.connect(gainNode);
      oscillator2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator1.type = "sine";
      oscillator2.type = "sine";
      
      const now = ctx.currentTime;
      
      oscillator1.frequency.setValueAtTime(523.25, now);
      oscillator1.frequency.setValueAtTime(659.25, now + 0.15);
      oscillator1.frequency.setValueAtTime(783.99, now + 0.3);
      
      oscillator2.frequency.setValueAtTime(659.25, now);
      oscillator2.frequency.setValueAtTime(783.99, now + 0.15);
      oscillator2.frequency.setValueAtTime(1046.5, now + 0.3);
      
      gainNode.gain.setValueAtTime(0.15, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      
      oscillator1.start(now);
      oscillator2.start(now);
      oscillator1.stop(now + 0.5);
      oscillator2.stop(now + 0.5);
    } catch (e) {
      console.error("Error playing win sound:", e);
    }
  }, [settings.soundEffectsEnabled]);

  const playLoseSound = useCallback(() => {
    if (!settings.soundEffectsEnabled) return;
    
    try {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = "sawtooth";
      
      const now = ctx.currentTime;
      
      oscillator.frequency.setValueAtTime(400, now);
      oscillator.frequency.exponentialRampToValueAtTime(200, now + 0.3);
      oscillator.frequency.exponentialRampToValueAtTime(100, now + 0.5);
      
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.5);
      
      oscillator.start(now);
      oscillator.stop(now + 0.5);
    } catch (e) {
      console.error("Error playing lose sound:", e);
    }
  }, [settings.soundEffectsEnabled]);

  const playDrawSound = useCallback(() => {
    if (!settings.soundEffectsEnabled) return;
    
    try {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") {
        ctx.resume();
      }
      
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      oscillator.type = "triangle";
      
      const now = ctx.currentTime;
      
      oscillator.frequency.setValueAtTime(440, now);
      oscillator.frequency.setValueAtTime(440, now + 0.2);
      
      gainNode.gain.setValueAtTime(0.1, now);
      gainNode.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      
      oscillator.start(now);
      oscillator.stop(now + 0.4);
    } catch (e) {
      console.error("Error playing draw sound:", e);
    }
  }, [settings.soundEffectsEnabled]);

  return {
    soundEffectsEnabled: settings.soundEffectsEnabled,
    toggleSoundEffects,
    setSoundEffectsEnabled,
    playWinSound,
    playLoseSound,
    playDrawSound,
  };
}
