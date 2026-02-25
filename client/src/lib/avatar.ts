import type { Player } from "@shared/schema";

export function getAvatarUrlForPlayer(player: Pick<Player, "username" | "avatar" | "avatarStyle">): string {
  if (player.avatar && player.avatar.trim()) {
    return player.avatar;
  }
  const style = player.avatarStyle || "avataaars";
  return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(player.username)}`;
}
