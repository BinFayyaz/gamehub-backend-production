import { useState } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users,
  Gamepad2,
  Swords,
  X,
  Shuffle,
  Hash,
  Calculator,
  Ban,
  UserX,
  Trash2,
  Shield,
  List,
  Crown,
  MessageCircle,
  Music,
} from "lucide-react";
import type { Player } from "@shared/schema";
import { Separator } from "@/components/ui/separator";
import { SettingsPanel } from "@/components/settings-panel";
import { MusicPlayer } from "@/components/music-player";
import { MediaGallery } from "@/components/media-gallery";
import { TutorialManager } from "@/components/tutorial-manager";
import { SupportRequests } from "@/components/support-requests";
import { getAvatarUrlForPlayer } from "@/lib/avatar";

interface OnlinePlayersProps {
  onClose?: () => void;
  isMobile?: boolean;
}

export function OnlinePlayers({ onClose, isMobile }: OnlinePlayersProps) {
  const {
    players,
    currentPlayerId,
    currentPlayerName,
    sendChallenge,
    tttGame,
    rpsGame,
    riddleLobby,
    riddleGame,
    wsGame,
    ngGame,
    qmGame,
    isAdmin,
    isVip,
    adminKick,
    adminBan,
    adminClearChat,
    adminForceKick,
    adminUnban,
    adminGetBannedList,
    adminToggleVip,
    bannedIPs,
    setCurrentDmPartner,
    dmUnreadCounts,
    vips,
  } = useWebSocket();
  const [showBannedList, setShowBannedList] = useState(false);
  const [musicPlayerOpen, setMusicPlayerOpen] = useState(false);
  const [showMiniPlayer, setShowMiniPlayer] = useState(false);

  const otherPlayers = players.filter((p) => p.id !== currentPlayerId);
  const onlineCount = otherPlayers.length;

  const isInGame = !!(
    tttGame ||
    rpsGame ||
    riddleLobby ||
    riddleGame ||
    wsGame ||
    ngGame ||
    qmGame
  );

  return (
    <div className="flex flex-col h-full bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-sidebar-foreground">
            Online Players
          </h2>
          <Badge variant="secondary" className="text-xs">
            {onlineCount}
          </Badge>
        </div>
        {isMobile && onClose && (
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            data-testid="button-close-players"
          >
            <X className="w-5 h-5" />
          </Button>
        )}
      </div>

      {/* Controls moved to top and aligned vertically */}
      <div className="p-2 border-b border-sidebar-border space-y-1">
        <SettingsPanel compact onMusicClick={() => {
          setMusicPlayerOpen(true);
          setShowMiniPlayer(true);
        }} />
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={() => {
            setMusicPlayerOpen(true);
            setShowMiniPlayer(true);
          }}
          data-testid="button-open-music-sidebar"
        >
          <Music className="w-4 h-4" />
          <span>Music Player</span>
        </Button>
        <MusicPlayer
          compact
          playerId={currentPlayerId}
          playerName={currentPlayerName}
          isVip={isVip}
          isAdmin={isAdmin}
          externalOpen={musicPlayerOpen}
          onExternalOpenChange={setMusicPlayerOpen}
          showMiniPlayer={showMiniPlayer}
          onMiniPlayerToggle={setShowMiniPlayer}
        />
        <MediaGallery
          currentPlayerId={currentPlayerId || ""}
          currentPlayerName={currentPlayerName || ""}
          isAdmin={isAdmin}
          isVip={isVip}
        />
        <TutorialManager
          currentPlayerId={currentPlayerId || ""}
          currentPlayerName={currentPlayerName || ""}
          isAdmin={isAdmin}
          isVip={isVip}
        />
        <SupportRequests
          currentPlayerId={currentPlayerId || ""}
          currentPlayerName={currentPlayerName || ""}
          isAdmin={isAdmin}
        />
      </div>

      {isAdmin && (
        <div className="p-2 border-b border-sidebar-border space-y-2">
          <Button
            size="sm"
            variant="destructive"
            className="w-full"
            onClick={adminClearChat}
            data-testid="button-admin-clear-chat"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear All Chat
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => {
              adminGetBannedList();
              setShowBannedList(!showBannedList);
            }}
            data-testid="button-admin-banned-list"
          >
            <List className="w-4 h-4 mr-2" />
            {showBannedList ? "Hide Banned List" : "View Banned List"}
          </Button>
          {showBannedList && (
            <div className="bg-card rounded-md p-2 max-h-32 overflow-y-auto">
              {bannedIPs.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center">
                  No banned IPs
                </p>
              ) : (
                <div className="space-y-1">
                  {bannedIPs.map((ip) => (
                    <div
                      key={ip}
                      className="flex items-center justify-between text-xs"
                    >
                      <span className="text-muted-foreground truncate">
                        {ip}
                      </span>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-6 px-2"
                        onClick={() => adminUnban(ip)}
                        data-testid={`button-unban-${ip}`}
                      >
                        <Shield className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <ScrollArea className="flex-1 p-2">
        {otherPlayers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
            <Users className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">No other players online</p>
            <p className="text-xs mt-1 opacity-70">Invite friends to play!</p>
          </div>
        ) : (
          <div className="space-y-1">
            {otherPlayers.map((player) => {
              const targetIsAdmin = player.username.toLowerCase() === "fahham";
              const targetIsVip = vips.includes(player.id);
              const canDmTarget = true;
              return (
                <PlayerItem
                  key={player.id}
                  player={player}
                  onChallenge={sendChallenge}
                  disabled={isInGame || player.status === "in_game"}
                  isAdmin={isAdmin}
                  isVip={isVip}
                  canDm={canDmTarget}
                  targetIsVip={targetIsVip}
                  targetIsAdmin={targetIsAdmin}
                  onKick={adminKick}
                  onBan={adminBan}
                  onForceKick={adminForceKick}
                  onToggleVip={adminToggleVip}
                  onOpenDm={(playerId) => setCurrentDmPartner(playerId)}
                  dmUnreadCount={dmUnreadCounts.get(player.id) || 0}
                />
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}

interface PlayerItemProps {
  player: Player;
  onChallenge: (
    playerId: string,
    gameType:
      | "tictactoe"
      | "rps"
      | "wordscramble"
      | "numberguess"
      | "quickmath",
  ) => void;
  disabled: boolean;
  isAdmin: boolean;
  isVip: boolean;
  canDm: boolean;
  targetIsVip?: boolean;
  targetIsAdmin?: boolean;
  onKick: (playerId: string) => void;
  onBan: (playerId: string) => void;
  onForceKick: (playerId: string) => void;
  onToggleVip: (playerId: string) => void;
  onOpenDm: (playerId: string) => void;
  dmUnreadCount: number;
}

function PlayerItem({
  player,
  onChallenge,
  disabled,
  isAdmin,
  isVip,
  canDm,
  targetIsVip,
  targetIsAdmin,
  onKick,
  onBan,
  onForceKick,
  onToggleVip,
  onOpenDm,
  dmUnreadCount,
}: PlayerItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  const getStatusColor = () => {
    switch (player.status) {
      case "online":
        return "bg-status-online";
      case "in_game":
        return "bg-status-away";
      default:
        return "bg-status-offline";
    }
  };

  const getStatusText = () => {
    switch (player.status) {
      case "online":
        return "Online";
      case "in_game":
        return "In Game";
      default:
        return "Away";
    }
  };

  const initials = player.username.slice(0, 2).toUpperCase();

  return (
    <div
      className="group flex items-center gap-3 p-2 rounded-md hover-elevate"
      data-testid={`player-item-${player.id}`}
    >
      <div className="relative">
        <Avatar className="h-9 w-9 border border-border/50">
          <AvatarImage src={getAvatarUrlForPlayer(player)} alt={player.username} />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
            {initials}
          </AvatarFallback>
        </Avatar>
        <span
          className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-sidebar ${getStatusColor()}`}
          title={getStatusText()}
        />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-sidebar-foreground truncate">
          {player.username}
        </p>
        <p className="text-xs text-muted-foreground">{getStatusText()}</p>
      </div>

      {!disabled && player.status === "online" && (
        <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              data-testid={`button-challenge-${player.id}`}
            >
              <Swords className="w-4 h-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => {
                onChallenge(player.id, "tictactoe");
                setIsOpen(false);
              }}
              className="cursor-pointer"
              data-testid={`button-challenge-ttt-${player.id}`}
            >
              <Gamepad2 className="w-4 h-4 mr-2" />
              Tic Tac Toe
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onChallenge(player.id, "rps");
                setIsOpen(false);
              }}
              className="cursor-pointer"
              data-testid={`button-challenge-rps-${player.id}`}
            >
              <Swords className="w-4 h-4 mr-2" />
              Rock Paper Scissors
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onChallenge(player.id, "wordscramble");
                setIsOpen(false);
              }}
              className="cursor-pointer"
              data-testid={`button-challenge-ws-${player.id}`}
            >
              <Shuffle className="w-4 h-4 mr-2" />
              Word Scramble
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onChallenge(player.id, "numberguess");
                setIsOpen(false);
              }}
              className="cursor-pointer"
              data-testid={`button-challenge-ng-${player.id}`}
            >
              <Hash className="w-4 h-4 mr-2" />
              Number Guess
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                onChallenge(player.id, "quickmath");
                setIsOpen(false);
              }}
              className="cursor-pointer"
              data-testid={`button-challenge-qm-${player.id}`}
            >
              <Calculator className="w-4 h-4 mr-2" />
              Quick Math
            </DropdownMenuItem>
            {canDm && (
              <>
                <Separator className="my-1" />
                <DropdownMenuItem
                  onClick={() => {
                    onOpenDm(player.id);
                    setIsOpen(false);
                  }}
                  className="cursor-pointer text-primary flex items-center justify-between"
                  data-testid={`button-dm-${player.id}`}
                >
                  <span className="flex items-center">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Send Message
                  </span>
                  {dmUnreadCount > 0 && (
                    <Badge variant="destructive" className="ml-2 text-[10px] px-1.5 py-0">
                      {dmUnreadCount > 99 ? "99+" : dmUnreadCount}
                    </Badge>
                  )}
                </DropdownMenuItem>
              </>
            )}
            {isAdmin && (
              <>
                <Separator className="my-1" />
                <DropdownMenuItem
                  onClick={() => {
                    onKick(player.id);
                    setIsOpen(false);
                  }}
                  className="cursor-pointer text-warning"
                  data-testid={`button-kick-${player.id}`}
                >
                  <UserX className="w-4 h-4 mr-2" />
                  Kick Player
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    onBan(player.id);
                    setIsOpen(false);
                  }}
                  className="cursor-pointer text-destructive"
                  data-testid={`button-ban-${player.id}`}
                >
                  <Ban className="w-4 h-4 mr-2" />
                  Ban Player
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    onToggleVip(player.id);
                    setIsOpen(false);
                  }}
                  className="cursor-pointer text-amber-500"
                  data-testid={`button-toggle-vip-${player.id}`}
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Toggle VIP Status
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      )}

      {player.status === "in_game" && !isAdmin && (
        <Badge
          variant="outline"
          className="text-xs text-warning border-warning/50"
        >
          Busy
        </Badge>
      )}

      {player.status === "in_game" && isAdmin && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              size="sm"
              variant="outline"
              className="text-warning border-warning/50"
              data-testid={`button-admin-busy-${player.id}`}
            >
              Busy
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => onForceKick(player.id)}
              className="cursor-pointer text-warning"
              data-testid={`button-force-kick-${player.id}`}
            >
              <UserX className="w-4 h-4 mr-2" />
              Force Kick (from game)
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onBan(player.id)}
              className="cursor-pointer text-destructive"
              data-testid={`button-ban-busy-${player.id}`}
            >
              <Ban className="w-4 h-4 mr-2" />
              Ban Player
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onToggleVip(player.id)}
              className="cursor-pointer text-amber-500"
              data-testid={`button-toggle-vip-busy-${player.id}`}
            >
              <Crown className="w-4 h-4 mr-2" />
              Toggle VIP Status
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}
