import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Settings, Volume2, VolumeX, Music } from "lucide-react";
import { useSoundSettings } from "@/hooks/use-sound-settings";

interface SettingsPanelProps {
  compact?: boolean;
  onMusicClick?: () => void;
}

export function SettingsPanel({ compact, onMusicClick }: SettingsPanelProps) {
  const { 
    soundEffectsEnabled, 
    setSoundEffectsEnabled, 
    playWinSound 
  } = useSoundSettings();

  const handleTestSound = () => {
    playWinSound();
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size={compact ? "sm" : "default"} 
          className={compact ? "w-full justify-start gap-2" : "gap-2"}
          data-testid="button-settings"
        >
          <Settings className="w-4 h-4" />
          {!compact && "Settings"}
          {compact && <span>Settings</span>}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Settings
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground">Sound</h3>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {soundEffectsEnabled ? (
                  <Volume2 className="w-5 h-5 text-primary" />
                ) : (
                  <VolumeX className="w-5 h-5 text-muted-foreground" />
                )}
                <Label htmlFor="sound-effects" className="text-sm font-normal">
                  Sound Effects
                </Label>
              </div>
              <Switch
                id="sound-effects"
                checked={soundEffectsEnabled}
                onCheckedChange={setSoundEffectsEnabled}
                data-testid="switch-sound-effects"
              />
            </div>
            
            <p className="text-xs text-muted-foreground">
              Play sounds when you win or lose a game
            </p>
            
            {soundEffectsEnabled && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleTestSound}
                className="w-full"
                data-testid="button-test-sound"
              >
                <Volume2 className="w-4 h-4 mr-2" />
                Test Win Sound
              </Button>
            )}
          </div>

          {onMusicClick && (
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-muted-foreground">Music</h3>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={onMusicClick}
                className="w-full"
                data-testid="button-open-music"
              >
                <Music className="w-4 h-4 mr-2" />
                Open Music Player
              </Button>
              <p className="text-xs text-muted-foreground">
                Listen to music while playing games
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
