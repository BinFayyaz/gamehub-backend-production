import { useEffect, useState } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Eye, Users, Gamepad2, Grid3X3, Hash, Calculator, CircleDot, Brain, Type } from "lucide-react";

interface SpectateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type GameType = "all" | "tictactoe" | "wordscramble" | "numberguess" | "quickmath" | "connectfour" | "memory";

const gameTypeLabels: Record<string, { label: string; icon: typeof Grid3X3 }> = {
  tictactoe: { label: "Tic Tac Toe", icon: Grid3X3 },
  wordscramble: { label: "Word Scramble", icon: Type },
  numberguess: { label: "Number Guess", icon: Hash },
  quickmath: { label: "Quick Math", icon: Calculator },
  connectfour: { label: "Connect Four", icon: CircleDot },
  memory: { label: "Memory Match", icon: Brain },
};

export function SpectateDialog({ open, onOpenChange }: SpectateDialogProps) {
  const { 
    activeTTTGames, 
    activeWSGames,
    activeNGGames,
    activeQMGames,
    activeC4Games,
    activeMemoryGames,
    requestActiveTTTGames, 
    requestActiveWSGames,
    requestActiveNGGames,
    requestActiveQMGames,
    requestActiveC4Games,
    requestActiveMemoryGames,
    spectateTTTGame,
    spectateWSGame,
    spectateNGGame,
    spectateQMGame,
    spectateC4Game,
    spectateMemoryGame,
  } = useWebSocket();

  const [activeTab, setActiveTab] = useState<GameType>("all");

  useEffect(() => {
    if (open) {
      const refreshAllGames = () => {
        requestActiveTTTGames();
        requestActiveWSGames();
        requestActiveNGGames();
        requestActiveQMGames();
        requestActiveC4Games();
        requestActiveMemoryGames();
      };
      
      refreshAllGames();
      const interval = setInterval(refreshAllGames, 3000);
      return () => clearInterval(interval);
    }
  }, [open, requestActiveTTTGames, requestActiveWSGames, requestActiveNGGames, requestActiveQMGames, requestActiveC4Games, requestActiveMemoryGames]);

  const handleSpectate = (gameType: string, gameId: string) => {
    switch (gameType) {
      case "tictactoe":
        spectateTTTGame(gameId);
        break;
      case "wordscramble":
        spectateWSGame(gameId);
        break;
      case "numberguess":
        spectateNGGame(gameId);
        break;
      case "quickmath":
        spectateQMGame(gameId);
        break;
      case "connectfour":
        spectateC4Game(gameId);
        break;
      case "memory":
        spectateMemoryGame(gameId);
        break;
    }
    onOpenChange(false);
  };

  const allGames = [
    ...activeTTTGames.map(g => ({ ...g, gameType: "tictactoe", displayPlayers: `${g.player1Name} vs ${g.player2Name}` })),
    ...activeWSGames.map(g => ({ ...g, gameType: "wordscramble", displayPlayers: `${g.player1Name} vs ${g.player2Name}` })),
    ...activeNGGames.map(g => ({ ...g, gameType: "numberguess", displayPlayers: `${g.player1Name} vs ${g.player2Name}` })),
    ...activeQMGames.map(g => ({ ...g, gameType: "quickmath", displayPlayers: `${g.player1Name} vs ${g.player2Name}` })),
    ...activeC4Games.map(g => ({ ...g, gameType: "connectfour", displayPlayers: `${g.player1Name} vs ${g.player2Name}` })),
    ...activeMemoryGames.map(g => ({ ...g, gameType: "memory", displayPlayers: g.playerNames.join(" vs ") })),
  ];

  const filteredGames = activeTab === "all" 
    ? allGames 
    : allGames.filter(g => g.gameType === activeTab);

  const totalGames = allGames.length;

  const renderGameItem = (game: typeof allGames[0]) => {
    const gameInfo = gameTypeLabels[game.gameType];
    const Icon = gameInfo?.icon || Gamepad2;
    
    return (
      <div
        key={`${game.gameType}-${game.id}`}
        className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/30 hover-elevate transition-colors"
        data-testid={`spectate-game-${game.gameType}-${game.id}`}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="outline" className="text-xs">
              <Icon className="w-3 h-3 mr-1" />
              {gameInfo?.label || game.gameType}
            </Badge>
            {game.spectatorCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Users className="w-3 h-3 mr-1" />
                {game.spectatorCount}
              </Badge>
            )}
          </div>
          <p className="text-sm font-medium mt-1 truncate">
            {game.displayPlayers}
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => handleSpectate(game.gameType, game.id)}
          data-testid={`button-spectate-${game.gameType}-${game.id}`}
        >
          <Eye className="w-4 h-4 mr-1" />
          Watch
        </Button>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Watch Live Games
            {totalGames > 0 && (
              <Badge variant="secondary" className="ml-2">
                {totalGames} live
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as GameType)}>
          <TabsList className="grid w-full grid-cols-4 mb-4">
            <TabsTrigger value="all" className="text-xs" data-testid="tab-all-games">
              All
            </TabsTrigger>
            <TabsTrigger value="tictactoe" className="text-xs" data-testid="tab-ttt-games">
              <Grid3X3 className="w-3 h-3 mr-1" />
              TTT
            </TabsTrigger>
            <TabsTrigger value="connectfour" className="text-xs" data-testid="tab-c4-games">
              <CircleDot className="w-3 h-3 mr-1" />
              C4
            </TabsTrigger>
            <TabsTrigger value="memory" className="text-xs" data-testid="tab-memory-games">
              <Brain className="w-3 h-3 mr-1" />
              Mem
            </TabsTrigger>
          </TabsList>

          <div className="py-2">
            {filteredGames.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Gamepad2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No games in progress right now.</p>
                <p className="text-sm mt-1">Check back later!</p>
              </div>
            ) : (
              <ScrollArea className="max-h-[300px]">
                <div className="space-y-2 pr-2">
                  {filteredGames.map(renderGameItem)}
                </div>
              </ScrollArea>
            )}
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
