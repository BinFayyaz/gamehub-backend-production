import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { 
  Users, 
  Play, 
  LogOut, 
  Crown, 
  Trophy,
  Zap,
  AlertTriangle,
  UserX,
  Send,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export function ReactionRaceLobby() {
  const { 
    reactionRaceLobby, 
    currentPlayerId, 
    startReactionRaceGame, 
    leaveReactionRaceLobby,
    sendReactionRaceChat,
    reactionRaceChatMessages,
    isAdmin,
    adminForceKick
  } = useWebSocket();

  const [chatInput, setChatInput] = useState("");

  if (!reactionRaceLobby) return null;

  const isHost = currentPlayerId === reactionRaceLobby.hostId;
  const canStart = reactionRaceLobby.players.length >= reactionRaceLobby.minPlayers && isHost;
  const waitingCount = reactionRaceLobby.minPlayers - reactionRaceLobby.players.length;

  const handleSendChat = () => {
    if (chatInput.trim()) {
      sendReactionRaceChat(chatInput.trim());
      setChatInput("");
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border/50 shadow-2xl animate-bounce-in" data-testid="reactionrace-lobby">
        <CardHeader className="text-center border-b border-border/50">
          <div className="flex items-center justify-between gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={leaveReactionRaceLobby}
              data-testid="button-leave-reactionrace-lobby"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Leave
            </Button>
            <div className="flex-1" />
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-500 to-emerald-600 bg-clip-text text-transparent">
              Reaction Race
            </CardTitle>
          </div>
          <CardDescription>
            Test your reflexes! Tap when the screen turns green.
          </CardDescription>
          <Badge variant="secondary" className="mt-2">
            <Users className="w-3 h-3 mr-1" />
            {reactionRaceLobby.players.length} / {reactionRaceLobby.minPlayers}+ players
          </Badge>
        </CardHeader>

        <CardContent className="p-6 space-y-4">
          <ScrollArea className="h-36">
            <div className="space-y-2">
              {reactionRaceLobby.players.map((player) => (
                <div
                  key={player.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                  data-testid={`player-${player.id}`}
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-green-500/20 text-green-500">
                      {player.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="flex-1 font-medium">{player.name}</span>
                  {player.id === reactionRaceLobby.hostId && (
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
              {reactionRaceChatMessages.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center">No messages yet</p>
              ) : (
                reactionRaceChatMessages.map((msg) => (
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
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700"
                disabled={!canStart}
                onClick={startReactionRaceGame}
                data-testid="button-start-reactionrace"
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

export function ReactionRaceGame() {
  const { 
    reactionRaceGame, 
    currentPlayerId,
    reactReactionRace,
    leaveReactionRaceLobby
  } = useWebSocket();

  if (!reactionRaceGame) return null;

  const currentPlayer = reactionRaceGame.players.find(p => p.id === currentPlayerId);
  const isFinished = reactionRaceGame.status === "finished";
  const roundStatus = reactionRaceGame.roundStatus;

  const handleReaction = (e: React.PointerEvent) => {
    e.preventDefault();
    if (roundStatus === "ready" || roundStatus === "signal") {
      reactReactionRace();
    }
  };

  const getReactionAreaStyle = () => {
    switch (roundStatus) {
      case "waiting":
        return "bg-gray-500";
      case "ready":
        return "bg-yellow-500";
      case "signal":
        return "bg-green-500";
      case "complete":
        return currentPlayer?.falseStart ? "bg-red-500" : "bg-blue-500";
      default:
        return "bg-gray-500";
    }
  };

  const getReactionMessage = () => {
    switch (roundStatus) {
      case "waiting":
        return "Get Ready...";
      case "ready":
        return "Wait for green...";
      case "signal":
        return "TAP NOW!";
      case "complete":
        if (currentPlayer?.falseStart) {
          return "False Start!";
        }
        if (currentPlayer?.lastReactionTime) {
          return `${currentPlayer.lastReactionTime}ms`;
        }
        return "Round Complete";
      default:
        return "Get Ready...";
    }
  };

  const sortedPlayers = [...reactionRaceGame.players].sort((a, b) => b.score - a.score);

  if (isFinished) {
    return (
      <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-border/50 shadow-2xl" data-testid="reactionrace-finished">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Trophy className="w-8 h-8 text-yellow-500" />
            </div>
            <CardTitle>Game Over!</CardTitle>
            <CardDescription>Final Rankings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center gap-3 p-3 rounded-lg ${
                    index === 0 ? "bg-yellow-500/20 border border-yellow-500/50" :
                    index === 1 ? "bg-gray-400/20" :
                    index === 2 ? "bg-orange-600/20" : "bg-muted/50"
                  }`}
                  data-testid={`ranking-${index + 1}`}
                >
                  <span className="text-2xl font-bold">#{index + 1}</span>
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-green-500/20 text-green-500">
                      {player.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">{player.name}</div>
                    <div className="text-xs text-muted-foreground">
                      Score: {player.score} pts
                    </div>
                  </div>
                  {index === 0 && <Trophy className="w-5 h-5 text-yellow-500" />}
                </div>
              ))}
            </div>

            <div className="border-t border-border/50 pt-4">
              <h4 className="text-sm font-medium mb-2 text-center">Round Results</h4>
              <div className="space-y-1">
                {reactionRaceGame.roundResults.map((result) => (
                  <div key={result.round} className="flex items-center justify-between text-xs p-2 bg-muted/30 rounded">
                    <span>Round {result.round}</span>
                    <span>
                      {result.winnerName ? (
                        <>
                          {result.winnerName} - {result.reactionTime}ms
                        </>
                      ) : (
                        "No winner"
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              className="w-full"
              onClick={leaveReactionRaceLobby}
              data-testid="button-leave-reactionrace"
            >
              Leave Game
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex flex-col p-4" data-testid="reactionrace-game">
      <div className="flex items-center justify-between gap-2 mb-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={leaveReactionRaceLobby}
          data-testid="button-leave-game"
        >
          <LogOut className="w-4 h-4 mr-1" />
          Leave
        </Button>
        <Badge variant="secondary" data-testid="text-round">
          Round {reactionRaceGame.currentRound} / {reactionRaceGame.totalRounds}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2 justify-center mb-4">
        {sortedPlayers.map((player) => (
          <Badge 
            key={player.id} 
            variant={player.id === currentPlayerId ? "default" : "outline"}
            className="flex items-center gap-1"
            data-testid={`score-${player.id}`}
          >
            {player.name}: {player.score}
            {player.falseStart && roundStatus === "complete" && (
              <AlertTriangle className="w-3 h-3 text-red-500 ml-1" />
            )}
          </Badge>
        ))}
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={roundStatus}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            className="w-full max-w-lg"
          >
            <div
              className={`${getReactionAreaStyle()} rounded-xl cursor-pointer select-none transition-colors duration-100`}
              onPointerDown={handleReaction}
              style={{ 
                minHeight: "300px",
                touchAction: "manipulation"
              }}
              data-testid="reaction-area"
            >
              <div className="h-full flex flex-col items-center justify-center p-8 text-white">
                <Zap className="w-16 h-16 mb-4" />
                <span className="text-3xl font-bold text-center" data-testid="text-reaction-message">
                  {getReactionMessage()}
                </span>
                {roundStatus === "complete" && currentPlayer?.falseStart && (
                  <span className="text-sm mt-2 opacity-90">
                    You clicked too early!
                  </span>
                )}
                {(roundStatus === "waiting" || roundStatus === "ready") && (
                  <span className="text-sm mt-2 opacity-90">
                    Tap when it turns green
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {roundStatus === "complete" && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4"
        >
          <Card className="border-border/50">
            <CardContent className="p-4">
              <h4 className="text-sm font-medium mb-2 text-center">Round Results</h4>
              <div className="space-y-1">
                {reactionRaceGame.players
                  .filter(p => p.lastReactionTime !== null || p.falseStart)
                  .sort((a, b) => {
                    if (a.falseStart && !b.falseStart) return 1;
                    if (!a.falseStart && b.falseStart) return -1;
                    return (a.lastReactionTime || Infinity) - (b.lastReactionTime || Infinity);
                  })
                  .map((player, index) => (
                    <div 
                      key={player.id} 
                      className={`flex items-center justify-between text-sm p-2 rounded ${
                        index === 0 && !player.falseStart ? "bg-green-500/20" : 
                        player.falseStart ? "bg-red-500/20" : "bg-muted/30"
                      }`}
                      data-testid={`result-${player.id}`}
                    >
                      <span className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-xs">
                            {player.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        {player.name}
                      </span>
                      <span>
                        {player.falseStart ? (
                          <span className="text-red-500 flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            False Start
                          </span>
                        ) : player.lastReactionTime ? (
                          <span className={index === 0 ? "text-green-500 font-bold" : ""}>
                            {player.lastReactionTime}ms
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </span>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
