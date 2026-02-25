import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Achievement } from "@shared/schema";

interface AchievementsDisplayProps {
  achievements: Achievement[];
  isLoading?: boolean;
}

const ACHIEVEMENT_COLORS: Record<string, string> = {
  common: "bg-gray-100 text-gray-900 dark:bg-gray-700 dark:text-gray-100",
  rare: "bg-blue-100 text-blue-900 dark:bg-blue-700 dark:text-blue-100",
  epic: "bg-purple-100 text-purple-900 dark:bg-purple-700 dark:text-purple-100",
  legendary:
    "bg-yellow-100 text-yellow-900 dark:bg-yellow-700 dark:text-yellow-100",
};

export function AchievementsDisplay({
  achievements,
  isLoading = false,
}: AchievementsDisplayProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[...Array(6)].map((_, i) => (
          <Card key={i} className="p-4 animate-pulse">
            <div className="h-20 bg-muted rounded" />
          </Card>
        ))}
      </div>
    );
  }

  if (achievements.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">
          No achievements yet. Play games to unlock them!
        </p>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {achievements.map((achievement) => (
        <Card key={achievement.id} className="p-4">
          <div className="flex items-start gap-4">
            <div className="text-4xl flex-shrink-0">{achievement.icon}</div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-foreground truncate">
                {achievement.name}
              </h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {achievement.description}
              </p>
              <div className="mt-2 flex gap-2 flex-wrap">
                {achievement.rarity && (
                  <Badge
                    className={`${ACHIEVEMENT_COLORS[achievement.rarity] || ACHIEVEMENT_COLORS.common}`}
                    data-testid={`badge-rarity-${achievement.rarity}`}
                  >
                    {achievement.rarity}
                  </Badge>
                )}
                <Badge
                  variant="secondary"
                  className="text-xs"
                  data-testid="badge-unlocked"
                >
                  Unlocked
                </Badge>
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
