import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  ScrollText, 
  Trophy, 
  Handshake,
  Grid3X3,
  Hand,
  Shuffle,
  Hash,
  Calculator,
  Circle,
  Grid2X2,
  Keyboard
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const gameIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  "Tic Tac Toe": Grid3X3,
  "Rock Paper Scissors": Hand,
  "Word Scramble": Shuffle,
  "Number Guess": Hash,
  "Quick Math": Calculator,
  "Connect Four": Circle,
  "Memory Match": Grid2X2,
  "Typing Race": Keyboard,
};

export function GameLogs() {
  const { gameLogs } = useWebSocket();

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="hidden sm:flex gap-2 items-center"
          data-testid="button-game-logs"
        >
          <ScrollText className="w-4 h-4" />
          Game Logs
          {gameLogs.length > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 min-w-5 text-xs">
              {gameLogs.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="p-3 border-b border-border/50">
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <ScrollText className="w-4 h-4" />
            Recent Match Results
          </h3>
        </div>
        <ScrollArea className="h-80">
          {gameLogs.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              <Trophy className="w-10 h-10 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No matches played yet</p>
              <p className="text-xs">Results will appear here</p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {gameLogs.map((log) => {
                const GameIcon = gameIcons[log.gameType] || Trophy;
                return (
                  <div
                    key={log.id}
                    className="p-3 rounded-lg bg-muted/30 border border-border/30"
                    data-testid={`game-log-${log.id}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <GameIcon className="w-4 h-4 text-primary" />
                      <span className="text-xs font-medium text-muted-foreground">
                        {log.gameType}
                      </span>
                      <span className="text-xs text-muted-foreground/60 ml-auto">
                        {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {log.isDraw ? (
                        <>
                          <Handshake className="w-4 h-4 text-warning" />
                          <span className="text-sm">
                            <span className="font-semibold">{log.winnerName}</span>
                            {" drew with "}
                            <span className="font-semibold">{log.loserName}</span>
                          </span>
                        </>
                      ) : (
                        <>
                          <Trophy className="w-4 h-4 text-success" />
                          <span className="text-sm">
                            <span className="font-semibold text-success">{log.winnerName}</span>
                            {" defeated "}
                            <span className="font-semibold text-muted-foreground">{log.loserName}</span>
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
