import { useEffect, useRef } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Trophy, RotateCcw, LogOut, X, Circle, Eye } from "lucide-react";
import { GameChat } from "@/components/game-chat";
import { EmojiReaction } from "@/components/emoji-reaction";
import { useSoundSettings } from "@/hooks/use-sound-settings";

const REACTION_EMOJIS = ["😂", "😍", "🤩", "😥", "🙄", "😒", "😔", "🥶", "😱", "❤"];

export function TicTacToe() {
  const { 
    tttGame, 
    currentPlayerId, 
    makeTTTMove, 
    requestTTTRematch, 
    leaveTTTGame,
    isSpectating,
    stopSpectatingTTT,
    activeEmojis,
    sendEmojiReaction,
    clearEmojiReaction
  } = useWebSocket();
  const { playWinSound, playLoseSound, playDrawSound } = useSoundSettings();
  const soundPlayedRef = useRef<string | null>(null);

  const gameEmojis = activeEmojis.filter(e => e.gameType === "tictactoe" && e.gameId === tttGame?.id);

  useEffect(() => {
    if (!tttGame || isSpectating) return;
    if (tttGame.status !== "finished") {
      soundPlayedRef.current = null;
      return;
    }
    const soundKey = `${tttGame.id}-${tttGame.player1Score}-${tttGame.player2Score}`;
    if (soundPlayedRef.current === soundKey) return;
    soundPlayedRef.current = soundKey;
    
    if (tttGame.isDraw) {
      playDrawSound();
    } else if (tttGame.winner === currentPlayerId) {
      playWinSound();
    } else if (tttGame.winner) {
      playLoseSound();
    }
  }, [tttGame, currentPlayerId, isSpectating, playWinSound, playLoseSound, playDrawSound]);

  const handleEmojiReaction = (emoji: string) => {
    if (tttGame) {
      sendEmojiReaction("tictactoe", tttGame.id, emoji);
    }
  };

  const handleEmojiComplete = (id: string) => {
    clearEmojiReaction(id);
  };

  if (!tttGame) return null;

  const isPlayer1 = currentPlayerId === tttGame.player1Id;
  const isPlayer2 = currentPlayerId === tttGame.player2Id;
  const isPlayer = isPlayer1 || isPlayer2;
  const isMyTurn = currentPlayerId === tttGame.currentTurn;
  const gameFinished = tttGame.status === "finished";

  const mySymbol = isPlayer1 ? "X" : "O";
  const opponentName = isPlayer1 ? tttGame.player2Name : tttGame.player1Name;
  const myName = isPlayer1 ? tttGame.player1Name : tttGame.player2Name;
  const myScore = isPlayer1 ? tttGame.player1Score : tttGame.player2Score;
  const opponentScore = isPlayer1 ? tttGame.player2Score : tttGame.player1Score;

  const isWinner = tttGame.winner === currentPlayerId;
  const isLoser = tttGame.winner && tttGame.winner !== currentPlayerId;

  const getStatusMessage = () => {
    if (isSpectating) {
      if (tttGame.isDraw) return "It's a draw!";
      const winnerName = tttGame.winner === tttGame.player1Id ? tttGame.player1Name : tttGame.player2Name;
      if (tttGame.winner) return `${winnerName} won!`;
      const turnName = tttGame.currentTurn === tttGame.player1Id ? tttGame.player1Name : tttGame.player2Name;
      return `${turnName}'s turn`;
    }
    if (tttGame.isDraw) return "It's a draw!";
    if (isWinner) return "You won!";
    if (isLoser) return `${opponentName} won!`;
    if (isMyTurn) return "Your turn";
    return `${opponentName}'s turn`;
  };

  const handleCellClick = (index: number) => {
    if (isSpectating) return;
    if (!gameFinished && isMyTurn && tttGame.board[index] === null) {
      makeTTTMove(index);
    }
  };

  const handleLeave = () => {
    if (isSpectating) {
      stopSpectatingTTT();
    } else {
      leaveTTTGame();
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
      <GameChat />
      <Card className="w-full max-w-md border-border/50 shadow-2xl animate-bounce-in relative" data-testid="ttt-game-container">
        <CardHeader className="text-center border-b border-border/50 pb-4">
          <div className="flex items-center justify-between gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLeave}
              data-testid="button-leave-ttt"
            >
              <LogOut className="w-4 h-4 mr-1" />
              {isSpectating ? "Stop Watching" : "Leave"}
            </Button>
            <div className="flex flex-col items-center">
              <CardTitle className="text-xl font-bold">Tic Tac Toe</CardTitle>
              {isSpectating && (
                <Badge variant="secondary" className="mt-1 text-xs">
                  <Eye className="w-3 h-3 mr-1" />
                  Spectating
                </Badge>
              )}
            </div>
            <div className="w-20">
              {tttGame.spectators.length > 0 && (
                <Badge variant="outline" className="text-xs">
                  <Eye className="w-3 h-3 mr-1" />
                  {tttGame.spectators.length}
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <div className="flex items-center justify-between">
            {isSpectating ? (
              <>
                <PlayerInfo
                  name={tttGame.player1Name}
                  score={tttGame.player1Score}
                  symbol="X"
                  isActive={tttGame.currentTurn === tttGame.player1Id && !gameFinished}
                  isPlayer1={true}
                />
                <div className="text-center">
                  <Badge 
                    variant={gameFinished ? "default" : "outline"}
                    className="text-sm px-4 py-1"
                  >
                    {getStatusMessage()}
                  </Badge>
                </div>
                <PlayerInfo
                  name={tttGame.player2Name}
                  score={tttGame.player2Score}
                  symbol="O"
                  isActive={tttGame.currentTurn === tttGame.player2Id && !gameFinished}
                  isPlayer1={false}
                />
              </>
            ) : (
              <>
                <PlayerInfo
                  name={opponentName}
                  score={opponentScore}
                  symbol={isPlayer1 ? "O" : "X"}
                  isActive={!isMyTurn && !gameFinished}
                  isPlayer1={!isPlayer1}
                />
                <div className="text-center">
                  <Badge 
                    variant={gameFinished ? (isWinner ? "default" : "secondary") : "outline"}
                    className={`text-sm px-4 py-1 ${isWinner ? "bg-success text-success-foreground" : ""} ${isLoser ? "bg-destructive/20 text-destructive" : ""}`}
                  >
                    {getStatusMessage()}
                  </Badge>
                </div>
                <PlayerInfo
                  name={myName}
                  score={myScore}
                  symbol={mySymbol}
                  isActive={isMyTurn && !gameFinished}
                  isPlayer1={isPlayer1}
                  isYou
                />
              </>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto" data-testid="ttt-board">
            {tttGame.board.map((cell, index) => (
              <button
                key={index}
                onClick={() => handleCellClick(index)}
                disabled={isSpectating || gameFinished || !isMyTurn || cell !== null}
                className={`
                  aspect-square rounded-lg text-4xl font-bold flex items-center justify-center
                  transition-all duration-200 border border-border/50
                  ${!isSpectating && cell === null && isMyTurn && !gameFinished
                    ? "bg-muted/50 hover:bg-primary/20 hover:border-primary/50 cursor-pointer"
                    : "bg-muted/30"
                  }
                  ${cell === "X" ? "text-primary" : "text-warning"}
                  disabled:cursor-not-allowed
                `}
                data-testid={`ttt-cell-${index}`}
              >
                {cell === "X" && <X className="w-10 h-10" />}
                {cell === "O" && <Circle className="w-8 h-8" />}
              </button>
            ))}
          </div>

          {gameFinished && !isSpectating && (
            <div className="flex items-center justify-center gap-3 animate-slide-up">
              {isWinner && (
                <div className="flex items-center gap-2 text-success">
                  <Trophy className="w-6 h-6" />
                  <span className="font-bold">Victory!</span>
                </div>
              )}
              <Button onClick={requestTTTRematch} data-testid="button-rematch-ttt">
                <RotateCcw className="w-4 h-4 mr-2" />
                Rematch
              </Button>
            </div>
          )}

          {gameFinished && isSpectating && (
            <div className="flex items-center justify-center gap-3 animate-slide-up">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Trophy className="w-5 h-5" />
                <span className="text-sm">Waiting for players to rematch...</span>
              </div>
            </div>
          )}

          {isSpectating && (
            <div className="flex flex-wrap justify-center gap-2 pt-4 border-t border-border/50">
              {REACTION_EMOJIS.map((emoji) => (
                <Button
                  key={emoji}
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEmojiReaction(emoji)}
                  className="text-xl p-2 h-auto"
                  data-testid={`button-emoji-${emoji}`}
                >
                  {emoji}
                </Button>
              ))}
            </div>
          )}
        </CardContent>

        {/* Emoji reactions overlay */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
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
  symbol: "X" | "O";
  isActive: boolean;
  isPlayer1: boolean;
  isYou?: boolean;
}

function PlayerInfo({ name, score, symbol, isActive, isPlayer1, isYou }: PlayerInfoProps) {
  const initials = name.slice(0, 2).toUpperCase();
  
  return (
    <div className={`flex flex-col items-center gap-2 p-3 rounded-lg transition-all ${isActive ? "bg-primary/10 ring-2 ring-primary" : ""}`}>
      <div className="relative">
        <Avatar className="h-12 w-12 border-2 border-border">
          <AvatarFallback className={`${isPlayer1 ? "bg-primary/20 text-primary" : "bg-warning/20 text-warning"} font-bold`}>
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${isPlayer1 ? "bg-primary text-primary-foreground" : "bg-warning text-warning-foreground"}`}>
          {symbol}
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-foreground truncate max-w-[80px]">
          {isYou ? "You" : name}
        </p>
        <p className="text-xs text-muted-foreground">Score: {score}</p>
      </div>
    </div>
  );
}
