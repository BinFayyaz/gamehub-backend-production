import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Swords, Gamepad2, Check, X, Shuffle, Hash, Calculator } from "lucide-react";
import type { Challenge } from "@shared/schema";

export function ChallengeNotifications() {
  const { challenges, respondToChallenge, dismissChallenge } = useWebSocket();

  if (challenges.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full">
      {challenges.map((challenge) => (
        <ChallengeCard
          key={challenge.id}
          challenge={challenge}
          onAccept={() => respondToChallenge(challenge.id, true)}
          onDecline={() => respondToChallenge(challenge.id, false)}
          onDismiss={() => dismissChallenge(challenge.id)}
        />
      ))}
    </div>
  );
}

interface ChallengeCardProps {
  challenge: Challenge;
  onAccept: () => void;
  onDecline: () => void;
  onDismiss: () => void;
}

function ChallengeCard({ challenge, onAccept, onDecline, onDismiss }: ChallengeCardProps) {
  const getGameInfo = () => {
    switch (challenge.gameType) {
      case "tictactoe":
        return { icon: Gamepad2, name: "Tic Tac Toe" };
      case "rps":
        return { icon: Swords, name: "Rock Paper Scissors" };
      case "wordscramble":
        return { icon: Shuffle, name: "Word Scramble" };
      case "numberguess":
        return { icon: Hash, name: "Number Guess" };
      case "quickmath":
        return { icon: Calculator, name: "Quick Math" };
      default:
        return { icon: Gamepad2, name: "Game" };
    }
  };
  
  const { icon: GameIcon, name: gameName } = getGameInfo();

  return (
    <Card 
      className="border-primary/50 bg-card/95 backdrop-blur shadow-xl animate-slide-in"
      data-testid={`challenge-notification-${challenge.id}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary/20 text-primary shrink-0">
            <GameIcon className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-foreground">Game Challenge!</span>
              <Badge variant="secondary" className="text-xs">
                {gameName}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-warning">{challenge.fromPlayerName}</span> wants to play with you
            </p>

            <div className="flex items-center gap-2 mt-3">
              <Button
                size="sm"
                onClick={onAccept}
                className="flex-1"
                data-testid={`button-accept-challenge-${challenge.id}`}
              >
                <Check className="w-4 h-4 mr-1" />
                Accept
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={onDecline}
                className="flex-1"
                data-testid={`button-decline-challenge-${challenge.id}`}
              >
                <X className="w-4 h-4 mr-1" />
                Decline
              </Button>
            </div>
          </div>

          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6 shrink-0"
            onClick={onDismiss}
            data-testid={`button-dismiss-challenge-${challenge.id}`}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
