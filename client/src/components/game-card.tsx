import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LucideIcon } from "lucide-react";

interface GameCardProps {
  title: string;
  description: string;
  icon: LucideIcon;
  playerCount: string;
  onPlay: () => void;
  disabled?: boolean;
  status?: string;
  lobbyCount?: { current: number; max: number };
  testId: string;
}

export function GameCard({
  title,
  description,
  icon: Icon,
  playerCount,
  onPlay,
  disabled = false,
  status,
  lobbyCount,
  testId,
}: GameCardProps) {
  const displayStatus = lobbyCount && lobbyCount.current > 0
    ? `${lobbyCount.current}/${lobbyCount.max}` 
    : status;
  return (
    <Card 
      className="group relative overflow-visible border-border/50 bg-card/80 backdrop-blur transition-all duration-300 hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1"
      data-testid={testId}
    >
      <div className="absolute inset-0 rounded-md bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20 transition-colors">
              <Icon className="w-6 h-6" />
            </div>
            <div>
              <CardTitle className="text-lg font-bold text-foreground">
                {title}
              </CardTitle>
              <Badge variant="secondary" className="mt-1 text-xs">
                {playerCount}
              </Badge>
            </div>
          </div>
          {displayStatus && (
            <Badge 
              variant="outline" 
              className="text-xs border-success/50 text-success bg-success/10"
            >
              {displayStatus}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <CardDescription className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </CardDescription>

        <Button
          onClick={onPlay}
          disabled={disabled}
          className="w-full font-semibold transition-all duration-300 group-hover:shadow-md group-hover:shadow-primary/20"
          data-testid={`button-play-${testId}`}
        >
          Play Now
        </Button>
      </CardContent>

      <div className="absolute -inset-px rounded-md opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
        <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/20 via-transparent to-primary/20 blur-sm" />
      </div>
    </Card>
  );
}
