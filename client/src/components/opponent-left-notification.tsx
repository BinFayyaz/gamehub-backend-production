import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy, X } from "lucide-react";

export function OpponentLeftNotification() {
  const { opponentLeftNotification, dismissOpponentLeftNotification } = useWebSocket();

  if (!opponentLeftNotification) return null;

  const gameNameMap: Record<string, string> = {
    tictactoe: "Tic Tac Toe",
    rps: "Rock Paper Scissors",
    wordscramble: "Word Scramble",
    numberguess: "Number Guess",
    quickmath: "Quick Math",
    connectfour: "Connect Four",
    memory: "Memory Match",
    typing: "Typing Race"
  };

  const gameName = gameNameMap[opponentLeftNotification.game] || opponentLeftNotification.game;

  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur flex items-center justify-center p-4">
      <Card className="w-full max-w-sm border-warning/50 shadow-2xl animate-bounce-in" data-testid="opponent-left-notification">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-2 w-16 h-16 rounded-full bg-warning/20 flex items-center justify-center">
            <Trophy className="w-8 h-8 text-warning" />
          </div>
          <CardTitle className="text-2xl font-bold text-warning">You Win!</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 text-center">
          <p className="text-foreground">
            {opponentLeftNotification.message}
          </p>
          <p className="text-sm text-muted-foreground">
            Game: {gameName}
          </p>
          <Button 
            onClick={dismissOpponentLeftNotification}
            className="w-full"
            data-testid="button-dismiss-opponent-left"
          >
            <X className="w-4 h-4 mr-2" />
            Close
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
