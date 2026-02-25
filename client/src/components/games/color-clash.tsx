import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { GameChat } from "@/components/game-chat";
import { 
  Users, 
  Play, 
  LogOut, 
  Crown, 
  Trophy,
  Palette,
  UserX,
  Send,
  RotateCcw,
  Check,
  X,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

const COLORS = ["red", "blue", "green", "yellow"] as const;
type ColorType = typeof COLORS[number];

const COLOR_CLASSES: Record<ColorType, { bg: string; border: string; ring: string }> = {
  red: { bg: "bg-red-500", border: "border-red-400", ring: "ring-red-300" },
  blue: { bg: "bg-blue-500", border: "border-blue-400", ring: "ring-blue-300" },
  green: { bg: "bg-green-500", border: "border-green-400", ring: "ring-green-300" },
  yellow: { bg: "bg-yellow-500", border: "border-yellow-400", ring: "ring-yellow-300" },
};

export function ColorClashLobby() {
  const { 
    colorClashLobby, 
    currentPlayerId, 
    startColorClashGame, 
    leaveColorClashLobby,
    sendColorClashChat,
    colorClashChatMessages,
    isAdmin,
    adminForceKick
  } = useWebSocket();

  const [chatInput, setChatInput] = useState("");

  if (!colorClashLobby) return null;

  const isHost = currentPlayerId === colorClashLobby.hostId;
  const canStart = colorClashLobby.players.length >= colorClashLobby.minPlayers && isHost;
  const waitingCount = colorClashLobby.minPlayers - colorClashLobby.players.length;

  const handleSendChat = () => {
    if (chatInput.trim()) {
      sendColorClashChat(chatInput.trim());
      setChatInput("");
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 shadow-2xl animate-bounce-in" data-testid="colorclash-lobby">
        <CardHeader className="text-center border-b border-border/50">
          <div className="flex items-center justify-between gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={leaveColorClashLobby}
              data-testid="button-leave-colorclash-lobby"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Leave
            </Button>
            <div className="flex-1" />
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
              <Palette className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-500 to-pink-600 bg-clip-text text-transparent">
              Color Clash
            </CardTitle>
          </div>
          <CardDescription>
            Watch the sequence, repeat it perfectly!
          </CardDescription>
          <Badge variant="secondary" className="mt-2">
            <Users className="w-3 h-3 mr-1" />
            {colorClashLobby.players.length} / {colorClashLobby.minPlayers}+ players
          </Badge>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          <ScrollArea className="h-36">
            <div className="space-y-2">
              {colorClashLobby.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                  data-testid={`player-${player.id}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-purple-500/20 text-purple-500">
                      {player.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 font-medium">{player.name}</span>
                  {player.id === colorClashLobby.hostId && (
                    <Badge variant="outline" className="text-xs">
                      <Crown className="w-3 h-3 mr-1" />
                      Host
                    </Badge>
                  )}
                  {isAdmin && player.id !== currentPlayerId && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-6 w-6"
                      onClick={() => adminForceKick(player.id)}
                      data-testid={`button-kick-${player.id}`}
                    >
                      <UserX className="w-3 h-3 text-destructive" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <div className="border-t border-border/50 pt-4">
            <div className="text-sm text-center text-muted-foreground mb-2">
              Chat
            </div>
            <ScrollArea className="h-24 mb-2 bg-muted/30 rounded-lg p-2">
              {colorClashChatMessages.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center">No messages yet</p>
              ) : (
                colorClashChatMessages.map((msg) => (
                  <div key={msg.id} className="text-xs mb-1">
                    <span className="font-medium text-primary">{msg.sender}: </span>
                    <span>{msg.message}</span>
                  </div>
                ))
              )}
            </ScrollArea>
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendChat()}
                className="flex-1 text-sm"
                data-testid="input-chat"
              />
              <Button size="icon" onClick={handleSendChat} data-testid="button-send-chat">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3">
            {waitingCount > 0 && (
              <p className="text-sm text-center text-muted-foreground">
                Waiting for {waitingCount} more player{waitingCount > 1 ? "s" : ""}...
              </p>
            )}

            {isHost && (
              <Button
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
                disabled={!canStart}
                onClick={startColorClashGame}
                data-testid="button-start-colorclash"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Game
              </Button>
            )}

            {!isHost && (
              <p className="text-sm text-center text-muted-foreground">
                Waiting for the host to start the game...
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function ColorClashGame() {
  const { 
    colorClashGame, 
    currentPlayerId,
    inputColorClash,
    submitColorClash,
    leaveColorClashLobby
  } = useWebSocket();

  if (!colorClashGame) return null;

  const currentPlayer = colorClashGame.players.find(p => p.id === currentPlayerId);
  const isFinished = colorClashGame.status === "finished";
  const roundStatus = colorClashGame.roundStatus;
  const activePlayers = colorClashGame.players.filter(p => !p.isEliminated);
  const eliminatedPlayers = colorClashGame.players.filter(p => p.isEliminated);

  const handleColorClick = (color: string) => {
    if (roundStatus !== "input" || currentPlayer?.hasSubmitted || currentPlayer?.isEliminated) return;
    inputColorClash(color);
  };

  const handleClear = () => {
    if (!currentPlayer?.currentInput.length) return;
    currentPlayer.currentInput.forEach(() => inputColorClash("clear"));
  };

  const handleSubmit = () => {
    if (currentPlayer?.hasSubmitted || currentPlayer?.isEliminated) return;
    submitColorClash();
  };

  const sortedPlayers = [...colorClashGame.players].sort((a, b) => {
    if (a.isEliminated && !b.isEliminated) return 1;
    if (!a.isEliminated && b.isEliminated) return -1;
    return 0;
  });

  if (isFinished) {
    return (
      <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
        <GameChat />
        <Card className="w-full max-w-md border-border/50 shadow-2xl" data-testid="colorclash-finished">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="w-8 h-8 text-yellow-500" />
            </div>
            <CardTitle>Game Over!</CardTitle>
            <CardDescription>
              {colorClashGame.winnerName ? `${colorClashGame.winnerName} wins!` : "No winner"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    player.id === colorClashGame.winner 
                      ? "bg-yellow-500/20 border border-yellow-500/50" 
                      : player.isEliminated 
                        ? "bg-destructive/10" 
                        : "bg-muted/50"
                  }`}
                  data-testid={`result-player-${player.id}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className={player.isEliminated ? "bg-destructive/20 text-destructive" : "bg-purple-500/20 text-purple-500"}>
                      {player.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className={`font-medium ${player.isEliminated ? "line-through text-muted-foreground" : ""}`}>
                      {player.name}
                    </div>
                    {player.isEliminated && (
                      <div className="text-xs text-destructive">Eliminated</div>
                    )}
                  </div>
                  {player.id === colorClashGame.winner && <Trophy className="w-5 h-5 text-yellow-500" />}
                  {player.isEliminated && <X className="w-4 h-4 text-destructive" />}
                </div>
              ))}
            </div>

            <Button
              className="w-full"
              onClick={leaveColorClashLobby}
              data-testid="button-leave-colorclash"
            >
              Leave Game
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex flex-col p-4" data-testid="colorclash-game">
      <GameChat />
      <div className="flex items-center justify-between gap-2 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={leaveColorClashLobby}
          data-testid="button-leave-game"
        >
          <LogOut className="w-4 h-4 mr-1" />
          Leave
        </Button>
        <Badge variant="secondary" data-testid="text-round">
          Round {colorClashGame.currentRound}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2 justify-center mb-4">
        {sortedPlayers.map((player) => (
          <Badge 
            key={player.id} 
            variant={player.isEliminated ? "destructive" : player.id === currentPlayerId ? "default" : "outline"}
            className={`flex items-center gap-1 ${player.isEliminated ? "line-through" : ""}`}
            data-testid={`badge-player-${player.id}`}
          >
            {player.name}
            {player.hasSubmitted && roundStatus === "input" && !player.isEliminated && (
              <Check className="w-3 h-3 ml-1" />
            )}
            {player.isEliminated && <X className="w-3 h-3 ml-1" />}
          </Badge>
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          {roundStatus === "showing" && (
            <motion.div
              key="showing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center mb-6"
            >
              <div className="flex items-center justify-center gap-2 mb-2">
                <Eye className="w-5 h-5" />
                <span className="text-lg font-medium">Watch the sequence...</span>
              </div>
              <p className="text-sm text-muted-foreground">Remember the colors!</p>
            </motion.div>
          )}

          {roundStatus === "input" && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center mb-6"
            >
              {currentPlayer?.hasSubmitted ? (
                <div className="text-lg font-medium text-muted-foreground">
                  Waiting for others...
                </div>
              ) : currentPlayer?.isEliminated ? (
                <div className="text-lg font-medium text-destructive">
                  You have been eliminated
                </div>
              ) : (
                <>
                  <div className="text-lg font-medium mb-2">Your turn! Repeat the sequence</div>
                  <div className="flex justify-center gap-2 mb-4 min-h-[32px]">
                    {currentPlayer?.currentInput.map((color, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`w-8 h-8 rounded ${COLOR_CLASSES[color as ColorType]?.bg || "bg-gray-500"}`}
                        data-testid={`input-color-${idx}`}
                      />
                    ))}
                    {(!currentPlayer?.currentInput.length) && (
                      <span className="text-muted-foreground text-sm">Tap the colors below</span>
                    )}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {roundStatus === "results" && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center mb-6"
            >
              <div className="text-lg font-medium mb-4">Round Results</div>
              <div className="space-y-2">
                {colorClashGame.players.map((player) => (
                  <div
                    key={player.id}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      player.isEliminated ? "bg-destructive/20" : "bg-green-500/20"
                    }`}
                    data-testid={`result-${player.id}`}
                  >
                    <span className={player.isEliminated ? "line-through text-muted-foreground" : ""}>
                      {player.name}
                    </span>
                    {player.isEliminated ? (
                      <Badge variant="destructive" className="text-xs">
                        <X className="w-3 h-3 mr-1" />
                        Wrong
                      </Badge>
                    ) : (
                      <Badge variant="default" className="text-xs bg-green-500">
                        <Check className="w-3 h-3 mr-1" />
                        Correct
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid grid-cols-2 gap-4 max-w-xs w-full">
          {COLORS.map((color, index) => {
            const isHighlighted = roundStatus === "showing" && 
              colorClashGame.colorSequence[colorClashGame.showingIndex] === color;
            const colorClass = COLOR_CLASSES[color];
            
            return (
              <motion.button
                key={color}
                className={`
                  w-full aspect-square min-h-[80px] rounded-xl border-4 
                  ${colorClass.bg} ${colorClass.border}
                  ${roundStatus === "input" && !currentPlayer?.hasSubmitted && !currentPlayer?.isEliminated 
                    ? "cursor-pointer active:scale-95" 
                    : "cursor-default"}
                  ${isHighlighted ? `ring-4 ${colorClass.ring}` : ""}
                  transition-all duration-150 touch-manipulation
                `}
                animate={isHighlighted ? { 
                  scale: 1.1,
                  transition: { duration: 0.2 }
                } : { 
                  scale: 1,
                  transition: { duration: 0.2 }
                }}
                onClick={() => handleColorClick(color)}
                disabled={roundStatus !== "input" || currentPlayer?.hasSubmitted || currentPlayer?.isEliminated}
                data-testid={`button-color-${color}`}
                style={{ touchAction: "manipulation" }}
              />
            );
          })}
        </div>

        {roundStatus === "input" && !currentPlayer?.hasSubmitted && !currentPlayer?.isEliminated && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 mt-6"
          >
            <Button
              variant="outline"
              onClick={handleClear}
              disabled={!currentPlayer?.currentInput.length}
              data-testid="button-clear"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Clear
            </Button>
            <Button
              className="bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
              onClick={handleSubmit}
              disabled={!currentPlayer?.currentInput.length}
              data-testid="button-submit"
            >
              <Check className="w-4 h-4 mr-2" />
              Submit
            </Button>
          </motion.div>
        )}
      </div>

      {eliminatedPlayers.length > 0 && (
        <div className="mt-4 text-center">
          <p className="text-xs text-muted-foreground">
            Eliminated: {eliminatedPlayers.map(p => p.name).join(", ")}
          </p>
        </div>
      )}
    </div>
  );
}
