import { useState, useEffect, useRef } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, RotateCcw, LogOut, Circle, Smile } from "lucide-react";
import { GameChat } from "@/components/game-chat";
import { EmojiReaction } from "@/components/emoji-reaction";
import { useSoundSettings } from "@/hooks/use-sound-settings";

const REACTION_EMOJIS = [
  "😂",
  "😍",
  "🤩",
  "😥",
  "🙄",
  "😒",
  "😔",
  "🥶",
  "😱",
  "❤",
];

export function ConnectFour() {
  const {
    c4Game,
    currentPlayerId,
    makeC4Move,
    requestC4Rematch,
    leaveC4Game,
    activeEmojis,
    sendEmojiReaction,
    clearEmojiReaction,
  } = useWebSocket();
  const { playWinSound, playLoseSound, playDrawSound } = useSoundSettings();
  const soundPlayedRef = useRef<string | null>(null);

  const [showEmojiPanel, setShowEmojiPanel] = useState(false);
  const emojiPanelRef = useRef<HTMLDivElement>(null);

  const gameEmojis = activeEmojis.filter(e => e.gameType === "connectfour" && e.gameId === c4Game?.id);

  useEffect(() => {
    if (!c4Game) return;
    const isPlayer1 = currentPlayerId === c4Game.player1Id;
    const isPlayer2 = currentPlayerId === c4Game.player2Id;
    const isSpectator = !isPlayer1 && !isPlayer2;
    if (isSpectator) return;
    if (c4Game.status !== "finished") {
      soundPlayedRef.current = null;
      return;
    }
    const soundKey = `${c4Game.id}-${c4Game.player1Score}-${c4Game.player2Score}`;
    if (soundPlayedRef.current === soundKey) return;
    soundPlayedRef.current = soundKey;
    
    if (c4Game.isDraw) {
      playDrawSound();
    } else if (c4Game.winner === currentPlayerId) {
      playWinSound();
    } else {
      playLoseSound();
    }
  }, [c4Game, currentPlayerId, playWinSound, playLoseSound, playDrawSound]);

  // Close emoji panel when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        emojiPanelRef.current &&
        !emojiPanelRef.current.contains(event.target as Node) &&
        showEmojiPanel
      ) {
        setShowEmojiPanel(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPanel]);

  const handleEmojiReaction = (emoji: string) => {
    if (c4Game) {
      sendEmojiReaction("connectfour", c4Game.id, emoji);
      setShowEmojiPanel(false);
    }
  };

  const handleEmojiComplete = (id: string) => {
    clearEmojiReaction(id);
  };

  if (!c4Game) return null;

  const isPlayer1 = currentPlayerId === c4Game.player1Id;
  const isPlayer2 = currentPlayerId === c4Game.player2Id;
  const isMyTurn = currentPlayerId === c4Game.currentTurn;
  const gameFinished = c4Game.status === "finished";

  // Check if user is a spectator (not player1 or player2)
  const isSpectator = !isPlayer1 && !isPlayer2;

  const myColor = isPlayer1 ? "R" : "Y";
  const opponentName = isPlayer1 ? c4Game.player2Name : c4Game.player1Name;
  const myName = isPlayer1 ? c4Game.player1Name : c4Game.player2Name;
  const myScore = isPlayer1 ? c4Game.player1Score : c4Game.player2Score;
  const opponentScore = isPlayer1 ? c4Game.player2Score : c4Game.player1Score;

  const isWinner = c4Game.winner === currentPlayerId;
  const isLoser = c4Game.winner && c4Game.winner !== currentPlayerId;

  const isWinningCell = (row: number, col: number) => {
    return (
      c4Game.winningCells?.some((c) => c.row === row && c.col === col) || false
    );
  };

  const getStatusMessage = () => {
    if (c4Game.isDraw) return "It's a draw!";
    if (isWinner) return "You won!";
    if (isLoser) return `${opponentName} won!`;
    if (isMyTurn) return "Your turn";
    if (isSpectator)
      return `${c4Game.currentTurn === c4Game.player1Id ? c4Game.player1Name : c4Game.player2Name}'s turn`;
    return `${opponentName}'s turn`;
  };

  const handleColumnClick = (col: number) => {
    if (!gameFinished && isMyTurn && !isSpectator) {
      const canDrop = c4Game.board[0][col] === null;
      if (canDrop) {
        makeC4Move(col);
      }
    }
  };

  const canDropInColumn = (col: number) => {
    return c4Game.board[0][col] === null;
  };

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
      <GameChat />
      <Card
        className="w-full max-w-lg border-border/50 shadow-2xl animate-bounce-in relative"
        data-testid="c4-game-container"
      >
        <CardHeader className="text-center border-b border-border/50 pb-4">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={leaveC4Game}
              data-testid="button-leave-c4"
              className="flex items-center gap-1"
            >
              <LogOut className="w-4 h-4" />
              <span>Leave</span>
            </Button>
            <CardTitle className="text-xl font-bold">Connect Four</CardTitle>
            <div className="flex items-center gap-2">
              {isSpectator && (
                <Badge variant="outline" className="text-xs">
                  Spectator
                </Badge>
              )}
              <div className="relative" ref={emojiPanelRef}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowEmojiPanel(!showEmojiPanel)}
                  className="h-9 w-9 rounded-full relative"
                  data-testid="button-emoji-panel"
                >
                  <Smile className="w-4 h-4" />
                </Button>

                {/* Emoji Reaction Panel */}
                {showEmojiPanel && (
                  <div className="absolute top-full right-0 mt-2 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="bg-card border border-border rounded-lg p-3 shadow-xl w-48">
                      <div className="flex flex-wrap gap-2 justify-center">
                        {REACTION_EMOJIS.map((emoji) => (
                          <Button
                            key={emoji}
                            variant="ghost"
                            size="sm"
                            className="h-10 w-10 text-lg hover:scale-110 transition-transform active:scale-95"
                            onClick={() => handleEmojiReaction(emoji)}
                            data-testid={`emoji-${emoji}`}
                          >
                            {emoji}
                          </Button>
                        ))}
                      </div>
                      <p className="text-xs text-center text-muted-foreground mt-2">
                        Click to react
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            <PlayerInfo
              name={c4Game.player1Name}
              score={c4Game.player1Score}
              color="R"
              isActive={
                c4Game.currentTurn === c4Game.player1Id && !gameFinished
              }
              isPlayer1={true}
              isYou={currentPlayerId === c4Game.player1Id}
            />

            <div className="text-center">
              <Badge
                variant={
                  gameFinished
                    ? isWinner
                      ? "default"
                      : "secondary"
                    : "outline"
                }
                className={`text-sm px-4 py-1 ${isWinner ? "bg-success text-success-foreground" : ""} ${isLoser ? "bg-destructive/20 text-destructive" : ""}`}
              >
                {getStatusMessage()}
              </Badge>
              {isSpectator && (
                <p className="text-xs text-muted-foreground mt-1">
                  Watching the game
                </p>
              )}
            </div>

            <PlayerInfo
              name={c4Game.player2Name}
              score={c4Game.player2Score}
              color="Y"
              isActive={
                c4Game.currentTurn === c4Game.player2Id && !gameFinished
              }
              isPlayer1={false}
              isYou={currentPlayerId === c4Game.player2Id}
            />
          </div>

          {/* Connect Four Board */}
          <div
            className="bg-blue-600 dark:bg-blue-800 p-2 rounded-lg mx-auto max-w-fit"
            data-testid="c4-board"
          >
            <div className="grid grid-cols-7 gap-1">
              {c4Game.board.map((row, rowIdx) =>
                row.map((cell, colIdx) => (
                  <button
                    key={`${rowIdx}-${colIdx}`}
                    onClick={() => handleColumnClick(colIdx)}
                    disabled={
                      gameFinished ||
                      !isMyTurn ||
                      !canDropInColumn(colIdx) ||
                      isSpectator
                    }
                    className={`
                      w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center
                      transition-all duration-200 transform
                      ${cell === null ? "bg-white dark:bg-gray-200 hover:bg-gray-100 dark:hover:bg-gray-300" : ""}
                      ${cell === "R" ? "bg-red-500 hover:bg-red-600" : ""}
                      ${cell === "Y" ? "bg-yellow-400 hover:bg-yellow-500" : ""}
                      ${isWinningCell(rowIdx, colIdx) ? "ring-4 ring-white animate-pulse" : ""}
                      ${
                        !gameFinished &&
                        isMyTurn &&
                        canDropInColumn(colIdx) &&
                        cell === null &&
                        !isSpectator
                          ? "cursor-pointer hover:scale-105"
                          : "cursor-default"
                      }
                      disabled:cursor-not-allowed disabled:hover:scale-100
                    `}
                    data-testid={`c4-cell-${rowIdx}-${colIdx}`}
                  >
                    {cell && (
                      <Circle
                        className={`w-8 h-8 md:w-10 md:h-10 fill-current ${cell === "R" ? "text-red-700" : "text-yellow-600"}`}
                      />
                    )}
                  </button>
                )),
              )}
            </div>
          </div>

          {gameFinished && !isSpectator && (
            <div className="flex items-center justify-center gap-3 animate-slide-up">
              {isWinner && (
                <div className="flex items-center gap-2 text-success">
                  <Trophy className="w-6 h-6" />
                  <span className="font-bold">Victory!</span>
                </div>
              )}
              <Button
                onClick={requestC4Rematch}
                data-testid="button-rematch-c4"
                className="gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Rematch</span>
              </Button>
            </div>
          )}

          {gameFinished && isSpectator && (
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Game finished. Waiting for players to rematch...
              </p>
            </div>
          )}
        </CardContent>

        {/* Emoji Reactions Overlay - These fly across the screen */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-10">
          {gameEmojis.map(({ id, emoji, senderName }) => (
            <EmojiReaction
              key={id}
              emoji={emoji}
              senderName={senderName}
              onComplete={() => handleEmojiComplete(id)}
            />
          ))}
        </div>
      </Card>
    </div>
  );
}

interface PlayerInfoProps {
  name: string;
  score: number;
  color: "R" | "Y";
  isActive: boolean;
  isPlayer1: boolean;
  isYou?: boolean;
}

function PlayerInfo({
  name,
  score,
  color,
  isActive,
  isPlayer1,
  isYou,
}: PlayerInfoProps) {
  const initials = name.slice(0, 2).toUpperCase();

  return (
    <div
      className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all duration-300 ${
        isActive ? "bg-primary/10 ring-2 ring-primary shadow-lg" : "opacity-90"
      }`}
    >
      <div className="relative">
        <Avatar className="h-12 w-12 border-2 border-border">
          <AvatarFallback
            className={`${color === "R" ? "bg-red-500/20 text-red-500" : "bg-yellow-400/20 text-yellow-600"} font-bold`}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
        <div
          className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-background ${color === "R" ? "bg-red-500" : "bg-yellow-400"}`}
        >
          <Circle
            className={`w-3 h-3 ${color === "R" ? "text-red-700" : "text-yellow-600"}`}
          />
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground truncate max-w-[80px]">
          {isYou ? "You" : name}
          {isYou && (
            <span className="text-xs text-muted-foreground ml-1">(you)</span>
          )}
        </p>
        <p className="text-xs text-muted-foreground">
          Score: <span className="font-bold">{score}</span>
        </p>
      </div>
    </div>
  );
}
