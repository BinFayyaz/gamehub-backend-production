import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye } from "lucide-react";
import type { Spectator } from "@shared/schema";

interface SpectatorModeProps {
  spectators: Spectator[];
  isSpectating?: boolean;
  onLeaveSpectate?: () => void;
}

export function SpectatorMode({
  spectators,
  isSpectating = false,
  onLeaveSpectate,
}: SpectatorModeProps) {
  return (
    <Card className="p-4 border-primary/50">
      <div className="flex items-center gap-2 mb-3">
        <Eye className="w-5 h-5 text-primary" />
        <h3 className="font-semibold text-foreground">
          Spectators ({spectators.length})
        </h3>
        {isSpectating && (
          <Badge variant="secondary" className="ml-auto">
            You are spectating
          </Badge>
        )}
      </div>
      {spectators.length === 0 ? (
        <p className="text-sm text-muted-foreground">No spectators watching</p>
      ) : (
        <div className="space-y-2">
          {spectators.map((spectator) => (
            <div key={spectator.playerId} className="flex items-center gap-2">
              <Avatar className="w-6 h-6">
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${spectator.playerId}`}
                />
                <AvatarFallback>
                  {spectator.playerName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-foreground">{spectator.playerName}</span>
              <span className="text-xs text-muted-foreground ml-auto">
                {new Date(spectator.joinedAt).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
