import { useState } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Users, Swords, Gamepad2, Circle } from "lucide-react";
import type { Player } from "@shared/schema";
import { getAvatarUrlForPlayer } from "@/lib/avatar";

type GameType = "tictactoe" | "rps" | "wordscramble" | "numberguess" | "quickmath" | "connectfour";

interface PlayerSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  gameType: GameType;
  gameTitle: string;
}

const gameIcons: Record<GameType, typeof Gamepad2> = {
  tictactoe: Gamepad2,
  rps: Swords,
  wordscramble: Gamepad2,
  numberguess: Gamepad2,
  quickmath: Gamepad2,
  connectfour: Circle,
};

export function PlayerSelectDialog({
  open,
  onOpenChange,
  gameType,
  gameTitle,
}: PlayerSelectDialogProps) {
  const { players, currentPlayerId, sendChallenge } = useWebSocket();
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);

  const onlinePlayers = players.filter(
    (p) => p.id !== currentPlayerId && p.status === "online"
  );

  const handleChallenge = () => {
    if (selectedPlayer) {
      sendChallenge(selectedPlayer, gameType);
      onOpenChange(false);
      setSelectedPlayer(null);
    }
  };

  const Icon = gameIcons[gameType];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-player-select">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="w-5 h-5 text-primary" />
            Challenge to {gameTitle}
          </DialogTitle>
          <DialogDescription>
            Select a player to challenge. They will receive a notification to accept or decline.
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {onlinePlayers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
              <Users className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-sm">No players available</p>
              <p className="text-xs mt-1 opacity-70">
                Wait for others to come online
              </p>
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2 pr-4">
                {onlinePlayers.map((player) => (
                  <PlayerSelectItem
                    key={player.id}
                    player={player}
                    selected={selectedPlayer === player.id}
                    onSelect={() => setSelectedPlayer(player.id)}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
              setSelectedPlayer(null);
            }}
            data-testid="button-cancel-challenge"
          >
            Cancel
          </Button>
          <Button
            onClick={handleChallenge}
            disabled={!selectedPlayer}
            data-testid="button-send-challenge"
          >
            <Swords className="w-4 h-4 mr-2" />
            Challenge
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface PlayerSelectItemProps {
  player: Player;
  selected: boolean;
  onSelect: () => void;
}

function PlayerSelectItem({ player, selected, onSelect }: PlayerSelectItemProps) {
  const initials = player.username.slice(0, 2).toUpperCase();

  return (
    <button
      onClick={onSelect}
      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all ${
        selected
          ? "bg-primary/20 border-2 border-primary"
          : "bg-muted/50 border-2 border-transparent hover-elevate"
      }`}
      data-testid={`player-select-${player.id}`}
    >
      <div className="relative">
        <Avatar className="h-10 w-10 border border-border/50">
          <AvatarImage src={getAvatarUrlForPlayer(player)} alt={player.username} />
          <AvatarFallback className="bg-primary/10 text-primary font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-background bg-status-online" />
      </div>

      <div className="flex-1 text-left">
        <p className="font-medium text-foreground">{player.username}</p>
        <p className="text-xs text-muted-foreground">Online</p>
      </div>

      {selected && (
        <Badge variant="default" className="bg-primary">
          Selected
        </Badge>
      )}
    </button>
  );
}
