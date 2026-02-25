import { useState, useEffect, useRef } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Crown, Users, Send, Trophy, Clock, X, HelpCircle, CheckCircle, XCircle, UserX } from "lucide-react";
import { GameChat } from "@/components/game-chat";
import { useSoundSettings } from "@/hooks/use-sound-settings";

export function TriviaQuiz() {
  const {
    triviaQuizLobby,
    triviaQuizGame,
    triviaQuizChatMessages,
    currentPlayerId,
    startTriviaQuizGame,
    leaveTriviaQuizLobby,
    submitTriviaQuizAnswer,
    sendTriviaQuizChat,
    clearTriviaQuizChat,
    isAdmin,
    adminForceKick,
  } = useWebSocket();
  const { playWinSound, playLoseSound } = useSoundSettings();

  const [chatMessage, setChatMessage] = useState("");
  const [timeLeft, setTimeLeft] = useState(15);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const soundPlayedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!triviaQuizGame || !currentPlayerId) return;
    if (triviaQuizGame.status !== "finished") {
      soundPlayedRef.current = null;
      return;
    }
    const soundKey = `${triviaQuizGame.id}-finished`;
    if (soundPlayedRef.current === soundKey) return;
    soundPlayedRef.current = soundKey;
    
    const sortedPlayers = [...triviaQuizGame.players].sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0];
    
    if (winner?.id === currentPlayerId) {
      playWinSound();
    } else {
      playLoseSound();
    }
  }, [triviaQuizGame, currentPlayerId, playWinSound, playLoseSound]);

  const isHost = triviaQuizLobby?.hostId === currentPlayerId;
  const canStart = triviaQuizLobby && triviaQuizLobby.players.length >= triviaQuizLobby.minPlayers;

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [triviaQuizChatMessages]);

  useEffect(() => {
    if (triviaQuizGame && triviaQuizGame.status === "question") {
      setSelectedAnswer(null);
      const elapsed = Math.floor((Date.now() - triviaQuizGame.questionStartTime) / 1000);
      setTimeLeft(Math.max(0, triviaQuizGame.timeLimit - elapsed));
      const interval = setInterval(() => {
        const newElapsed = Math.floor((Date.now() - triviaQuizGame.questionStartTime) / 1000);
        setTimeLeft(Math.max(0, triviaQuizGame.timeLimit - newElapsed));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [triviaQuizGame?.questionStartTime, triviaQuizGame?.status, triviaQuizGame?.questionIndex]);

  const handleSubmitAnswer = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
    submitTriviaQuizAnswer(answerIndex);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      sendTriviaQuizChat(chatMessage.trim());
      setChatMessage("");
    }
  };

  const handleClose = () => {
    leaveTriviaQuizLobby();
    clearTriviaQuizChat();
  };

  const currentPlayer = triviaQuizGame?.players.find(p => p.id === currentPlayerId);
  const hasAnswered = currentPlayer?.hasAnswered || false;

  const getWinner = () => {
    if (!triviaQuizGame || triviaQuizGame.status !== "finished") return null;
    const sortedPlayers = [...triviaQuizGame.players].sort((a, b) => b.score - a.score);
    return sortedPlayers[0];
  };
  const winner = getWinner();

  if (!triviaQuizLobby && !triviaQuizGame) return null;

  return (
    <>
      <GameChat />
      <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="w-5 h-5" />
              Trivia Quiz
              {triviaQuizGame && (
                <Badge variant="secondary">
                  Question {triviaQuizGame.questionIndex + 1}/{triviaQuizGame.totalQuestions}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Answer questions correctly and quickly to earn points!
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex gap-4 min-h-0">
            <ScrollArea className="flex-1 min-h-0">
              <div className="flex flex-col gap-4 pr-4">
                {!triviaQuizGame ? (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="w-4 h-4" />
                        <span className="font-medium">
                          Players ({triviaQuizLobby?.players.length || 0}/{triviaQuizLobby?.maxPlayers || 8})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {triviaQuizLobby?.players.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center justify-between p-2 rounded bg-muted/50"
                            data-testid={`player-${player.id}`}
                          >
                            <div className="flex items-center gap-2">
                              {player.id === triviaQuizLobby.hostId && (
                                <Crown className="w-4 h-4 text-yellow-500" />
                              )}
                              <span>{player.name}</span>
                            </div>
                            {isAdmin && player.id !== currentPlayerId && (
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-destructive hover:bg-destructive/10"
                                onClick={() => adminForceKick(player.id)}
                                data-testid={`button-kick-trivia-${player.id}`}
                              >
                                <UserX className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                      {isHost && (
                        <Button
                          className="w-full mt-4"
                          onClick={startTriviaQuizGame}
                          disabled={!canStart}
                          data-testid="button-start-triviaquiz"
                        >
                          {canStart
                            ? "Start Game"
                            : `Need ${triviaQuizLobby?.minPlayers} players to start`}
                        </Button>
                      )}
                      {!isHost && (
                        <p className="text-center text-muted-foreground mt-4">
                          Waiting for host to start...
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ) : (
                  <>
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            <span className={timeLeft <= 5 ? "text-destructive font-bold" : ""}>
                              {timeLeft}s
                            </span>
                          </div>
                          {triviaQuizGame.currentQuestion && (
                            <Badge variant="outline">{triviaQuizGame.currentQuestion.category}</Badge>
                          )}
                        </div>

                        {triviaQuizGame.status === "question" && triviaQuizGame.currentQuestion && (
                          <div className="space-y-4">
                            <div className="text-lg font-medium text-center py-4" data-testid="question-text">
                              {triviaQuizGame.currentQuestion.question}
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {triviaQuizGame.currentQuestion.options.map((option, index) => (
                                <Button
                                  key={index}
                                  variant={selectedAnswer === index ? "default" : "outline"}
                                  className="w-full justify-start text-left h-auto py-3 px-4"
                                  disabled={hasAnswered}
                                  onClick={() => handleSubmitAnswer(index)}
                                  data-testid={`button-answer-${index}`}
                                >
                                  <span className="mr-2 font-bold">{String.fromCharCode(65 + index)}.</span>
                                  {option}
                                </Button>
                              ))}
                            </div>
                            {hasAnswered && (
                              <div className="text-center text-muted-foreground text-sm">
                                Answer submitted! Waiting for others...
                              </div>
                            )}
                          </div>
                        )}

                        {triviaQuizGame.status === "reveal" && triviaQuizGame.currentQuestion && (
                          <div className="space-y-4">
                            <div className="text-lg font-medium text-center py-4">
                              {triviaQuizGame.currentQuestion.question}
                            </div>
                            <div className="grid grid-cols-1 gap-2">
                              {triviaQuizGame.currentQuestion.options.map((option, index) => {
                                const isCorrect = index === triviaQuizGame.currentQuestion!.correctIndex;
                                const wasSelected = selectedAnswer === index;
                                return (
                                  <div
                                    key={index}
                                    className={`flex items-center gap-2 p-3 rounded border ${
                                      isCorrect 
                                        ? "bg-green-500/20 border-green-500" 
                                        : wasSelected 
                                          ? "bg-destructive/20 border-destructive" 
                                          : "bg-muted/50 border-border"
                                    }`}
                                    data-testid={`reveal-answer-${index}`}
                                  >
                                    {isCorrect ? (
                                      <CheckCircle className="w-5 h-5 text-green-500 shrink-0" />
                                    ) : wasSelected ? (
                                      <XCircle className="w-5 h-5 text-destructive shrink-0" />
                                    ) : (
                                      <div className="w-5 h-5" />
                                    )}
                                    <span className="mr-2 font-bold">{String.fromCharCode(65 + index)}.</span>
                                    {option}
                                  </div>
                                );
                              })}
                            </div>
                            {triviaQuizGame.correctAnswers.length > 0 && (
                              <div className="text-center text-sm text-muted-foreground">
                                Fastest correct: {triviaQuizGame.correctAnswers.map(a => `${a.playerName} (${(a.timeMs / 1000).toFixed(1)}s)`).join(", ")}
                              </div>
                            )}
                            {currentPlayer?.lastAnswerCorrect === true && (
                              <div className="text-center text-green-500 font-medium">
                                Correct! +10 points
                              </div>
                            )}
                            {currentPlayer?.lastAnswerCorrect === false && (
                              <div className="text-center text-destructive font-medium">
                                Wrong answer!
                              </div>
                            )}
                          </div>
                        )}

                        {triviaQuizGame.status === "finished" && winner && (
                          <div className="text-center py-8">
                            <Trophy className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                            <div className="text-2xl font-bold text-primary mb-1">
                              {winner.id === currentPlayerId ? "You win!" : `${winner.name} wins!`}
                            </div>
                            <div className="text-muted-foreground">
                              Final score: {winner.score} points
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="w-4 h-4" />
                          <span className="font-medium">Leaderboard</span>
                        </div>
                        <div className="space-y-1">
                          {[...triviaQuizGame.players]
                            .sort((a, b) => b.score - a.score)
                            .map((player, index) => (
                              <div
                                key={player.id}
                                className="flex items-center justify-between text-sm"
                                data-testid={`score-${player.id}`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className={player.id === currentPlayerId ? "font-bold" : ""}>
                                    {index + 1}. {player.name}
                                  </span>
                                  {player.hasAnswered && triviaQuizGame.status === "question" && (
                                    <CheckCircle className="w-3 h-3 text-green-500" />
                                  )}
                                </div>
                                <Badge variant="secondary">{player.score}</Badge>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </ScrollArea>

            <Card className="w-64 flex flex-col min-h-0">
              <CardContent className="p-3 flex-1 flex flex-col min-h-0">
                <div className="text-sm font-medium mb-2">Chat</div>
                <ScrollArea className="flex-1 min-h-0 max-h-64">
                  <div className="space-y-2 pr-2">
                    {triviaQuizChatMessages.map((msg) => (
                      <div key={msg.id} className="text-sm">
                        <span className="font-medium">{msg.sender}:</span>{" "}
                        <span className="text-muted-foreground">{msg.message}</span>
                      </div>
                    ))}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>
                <form onSubmit={handleSendChat} className="flex gap-2 mt-2">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Chat..."
                    className="text-sm"
                    data-testid="input-triviaquiz-chat"
                  />
                  <Button type="submit" size="icon" variant="ghost" data-testid="button-send-triviaquiz-chat">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="outline" onClick={handleClose} data-testid="button-leave-triviaquiz">
              <X className="w-4 h-4 mr-2" />
              Leave
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
