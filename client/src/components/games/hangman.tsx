import { useState, useEffect, useRef } from "react";
import { useWebSocket } from "@/lib/websocket";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Crown,
  Users,
  Send,
  Trophy,
  X,
  Pencil,
  AlertCircle,
} from "lucide-react";
import { GameChat } from "@/components/game-chat";
import { useSoundSettings } from "@/hooks/use-sound-settings";

const HANGMAN_STAGES = [
  `
      -----
      |   |
          |
          |
          |
          |
    =========
  `,
  `
      -----
      |   |
      O   |
          |
          |
          |
    =========
  `,
  `
      -----
      |   |
      O   |
      |   |
          |
          |
    =========
  `,
  `
      -----
      |   |
      O   |
     /|   |
          |
          |
    =========
  `,
  `
      -----
      |   |
      O   |
     /|\\  |
          |
          |
    =========
  `,
  `
      -----
      |   |
      O   |
     /|\\  |
     /    |
          |
    =========
  `,
  `
      -----
      |   |
      O   |
     /|\\  |
     / \\  |
          |
    =========
  `,
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

export function Hangman() {
  const {
    hangmanLobby,
    hangmanGame,
    hangmanChatMessages, // <-- This is the array being used for messages
    currentPlayerId,
    startHangmanGame,
    leaveHangmanLobby,
    setHangmanWord,
    guessHangmanLetter,
    sendHangmanChat,
    clearHangmanChat,
  } = useWebSocket();
  const { playWinSound, playLoseSound } = useSoundSettings();

  const [wordInput, setWordInput] = useState("");
  const [chatMessage, setChatMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const soundPlayedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!hangmanGame || !currentPlayerId) return;
    if (hangmanGame.status !== "finished") {
      soundPlayedRef.current = null;
      return;
    }
    const soundKey = `${hangmanGame.id}-finished`;
    if (soundPlayedRef.current === soundKey) return;
    soundPlayedRef.current = soundKey;

    if (hangmanGame.winner === currentPlayerId) {
      playWinSound();
    } else {
      playLoseSound();
    }
  }, [hangmanGame, currentPlayerId, playWinSound, playLoseSound]);

  // AUTO-SCROLL TO NEW MESSAGE
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [hangmanChatMessages]);

  const isHost = hangmanLobby?.hostId === currentPlayerId;
  const canStart =
    hangmanLobby && hangmanLobby.players.length >= hangmanLobby.minPlayers;

  const handleSetWord = (e: React.FormEvent) => {
    e.preventDefault();
    if (wordInput.trim() && wordInput.trim().length >= 3) {
      setHangmanWord(wordInput.trim().toUpperCase());
      setWordInput("");
    }
  };

  const handleGuessLetter = (letter: string) => {
    guessHangmanLetter(letter);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (chatMessage.trim()) {
      sendHangmanChat(chatMessage.trim());
      setChatMessage("");
    }
  };

  const handleClose = () => {
    leaveHangmanLobby();
    clearHangmanChat();
  };

  const isWordSetter = hangmanGame?.wordSetter === currentPlayerId;
  const isCurrentGuesser = hangmanGame?.currentGuesser === currentPlayerId;
  const currentPlayer = hangmanGame?.players.find(
    (p) => p.id === currentPlayerId,
  );
  const wordSetterPlayer = hangmanGame?.players.find(
    (p) => p.id === hangmanGame.wordSetter,
  );
  const currentGuesserPlayer = hangmanGame?.players.find(
    (p) => p.id === hangmanGame.currentGuesser,
  );

  const getWinner = () => {
    if (!hangmanGame || hangmanGame.status !== "finished") return null;
    return hangmanGame.players.find((p) => p.id === hangmanGame.winner);
  };
  const winner = getWinner();

  if (!hangmanLobby && !hangmanGame) return null;

  return (
    <>
      <GameChat />
      <Dialog open={true} onOpenChange={(open) => !open && handleClose()}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5" />
              Hangman
              {hangmanGame && (
                <Badge variant="secondary">
                  Round {hangmanGame.roundNumber}
                </Badge>
              )}
            </DialogTitle>
            <DialogDescription>
              Guess the word letter by letter before the hangman is complete!
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex gap-4 min-h-0">
            {/* Main Game Area */}
            <ScrollArea className="flex-1 min-h-0">
              <div className="flex flex-col gap-4 pr-4">
                {!hangmanGame ? (
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Users className="w-4 h-4" />
                        <span className="font-medium">
                          Players ({hangmanLobby?.players.length || 0}/
                          {hangmanLobby?.maxPlayers || 8})
                        </span>
                      </div>
                      <div className="space-y-2">
                        {hangmanLobby?.players.map((player) => (
                          <div
                            key={player.id}
                            className="flex items-center justify-between p-2 rounded bg-muted/50"
                            data-testid={`player-${player.id}`}
                          >
                            <div className="flex items-center gap-2">
                              {player.id === hangmanLobby.hostId && (
                                <Crown className="w-4 h-4 text-yellow-500" />
                              )}
                              <span>{player.name}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      {isHost && (
                        <Button
                          className="w-full mt-4"
                          onClick={startHangmanGame}
                          disabled={!canStart}
                          data-testid="button-start-hangman"
                        >
                          {canStart
                            ? "Start Game"
                            : `Need ${hangmanLobby?.minPlayers} players to start`}
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
                          <Badge variant="outline">
                            {hangmanGame.wrongGuesses}/
                            {hangmanGame.maxWrongGuesses} wrong
                          </Badge>
                          {hangmanGame.status === "setting_word" && (
                            <Badge variant="secondary">
                              {wordSetterPlayer?.name} is setting the word...
                            </Badge>
                          )}
                          {hangmanGame.status === "guessing" && (
                            <Badge variant="secondary">
                              {currentGuesserPlayer?.name}'s turn to guess
                            </Badge>
                          )}
                        </div>

                        {/* The Hangman figure illustration */}
                        <pre
                          className="font-mono text-xs sm:text-sm text-center whitespace-pre bg-muted/30 rounded p-2 mb-4"
                          data-testid="hangman-figure"
                        >
                          {
                            HANGMAN_STAGES[
                              Math.min(hangmanGame.wrongGuesses, 6)
                            ]
                          }
                        </pre>

                        <div className="text-center py-4">
                          <div
                            className="text-3xl sm:text-4xl font-mono tracking-[0.3em] mb-4"
                            data-testid="revealed-word"
                          >
                            {hangmanGame.revealedWord.split("").join(" ")}
                          </div>

                          {hangmanGame.lastGuess &&
                            hangmanGame.status === "guessing" && (
                              <div
                                className={`text-sm mb-2 ${hangmanGame.lastGuess.correct ? "text-green-500" : "text-destructive"}`}
                              >
                                {hangmanGame.lastGuess.playerName} guessed "
                                {hangmanGame.lastGuess.letter}" -{" "}
                                {hangmanGame.lastGuess.correct
                                  ? "Correct!"
                                  : "Wrong!"}
                              </div>
                            )}
                        </div>

                        {hangmanGame.status === "setting_word" &&
                          isWordSetter && (
                            <form
                              onSubmit={handleSetWord}
                              className="space-y-3"
                            >
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <AlertCircle className="w-4 h-4" />
                                <span>
                                  Enter a word for others to guess (minimum 3
                                  letters)
                                </span>
                              </div>
                              <div className="flex gap-2">
                                <Input
                                  value={wordInput}
                                  onChange={(e) =>
                                    setWordInput(
                                      e.target.value.replace(/[^a-zA-Z]/g, ""),
                                    )
                                  }
                                  placeholder="Enter word..."
                                  className="uppercase"
                                  data-testid="input-hangman-word"
                                />
                                <Button
                                  type="submit"
                                  disabled={wordInput.length < 3}
                                  data-testid="button-set-word"
                                >
                                  Set Word
                                </Button>
                              </div>
                            </form>
                          )}

                        {hangmanGame.status === "setting_word" &&
                          !isWordSetter && (
                            <div className="text-center text-muted-foreground">
                              Waiting for {wordSetterPlayer?.name} to set the
                              word...
                            </div>
                          )}

                        {hangmanGame.status === "guessing" && (
                          <div className="space-y-3">
                            <div className="text-sm text-muted-foreground text-center mb-2">
                              Guessed:{" "}
                              {hangmanGame.guessedLetters.join(", ") || "None"}
                            </div>
                            <div className="flex flex-wrap gap-1 justify-center">
                              {ALPHABET.map((letter) => (
                                <Button
                                  key={letter}
                                  size="sm"
                                  variant={
                                    hangmanGame.guessedLetters.includes(letter)
                                      ? "outline"
                                      : "secondary"
                                  }
                                  disabled={
                                    hangmanGame.guessedLetters.includes(
                                      letter,
                                    ) || !isCurrentGuesser
                                  }
                                  onClick={() => handleGuessLetter(letter)}
                                  className="w-8 h-8 p-0"
                                  data-testid={`button-letter-${letter}`}
                                >
                                  {letter}
                                </Button>
                              ))}
                            </div>
                            {!isCurrentGuesser && !isWordSetter && (
                              <div className="text-center text-muted-foreground text-sm">
                                Waiting for {currentGuesserPlayer?.name} to
                                guess...
                              </div>
                            )}
                            {isWordSetter && (
                              <div className="text-center text-muted-foreground text-sm">
                                You set the word! Watch others guess.
                              </div>
                            )}
                          </div>
                        )}

                        {hangmanGame.status === "round_end" && (
                          <div className="text-center py-4">
                            <div className="text-xl font-bold mb-2">
                              The word was: {hangmanGame.word}
                            </div>
                            <div className="text-muted-foreground">
                              Next round starting soon...
                            </div>
                          </div>
                        )}

                        {hangmanGame.status === "finished" && winner && (
                          <div className="text-center py-4">
                            <Trophy className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
                            <div className="text-xl font-bold text-primary">
                              {winner.id === currentPlayerId
                                ? "You win!"
                                : `${winner.name} wins!`}
                            </div>
                            <div className="text-muted-foreground mt-1">
                              Final word: {hangmanGame.word}
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <Trophy className="w-4 h-4" />
                          <span className="font-medium">Scores</span>
                        </div>
                        <div className="space-y-1">
                          {[...hangmanGame.players]
                            .sort((a, b) => b.score - a.score)
                            .map((player, index) => (
                              <div
                                key={player.id}
                                className="flex items-center justify-between text-sm"
                                data-testid={`score-${player.id}`}
                              >
                                <span
                                  className={
                                    player.id === currentPlayerId
                                      ? "font-bold"
                                      : ""
                                  }
                                >
                                  {index + 1}. {player.name}
                                  {player.id === hangmanGame.wordSetter && (
                                    <span className="ml-1 text-muted-foreground text-xs">
                                      (setter)
                                    </span>
                                  )}
                                </span>
                                <Badge variant="secondary">
                                  {player.score}
                                </Badge>
                              </div>
                            ))}
                        </div>
                      </CardContent>
                    </Card>
                  </>
                )}
              </div>
            </ScrollArea>

            {/* Right Panel: Chat Container - FIXED HEIGHT IMPLEMENTATION */}
            <Card className="w-64 flex flex-col h-[400px]">
              <CardContent className="p-3 flex-1 flex flex-col min-h-0">
                <div className="text-sm font-medium mb-2">Chat</div>

                {/* Scrollable Message Area */}
                <div className="flex-1 min-h-0">
                  <ScrollArea className="h-full">
                    <div className="space-y-2 pr-2">
                      {/* --- CRITICAL SECTION: Ensure this maps the correct game chat messages --- */}
                      {hangmanChatMessages.map((msg) => (
                        <div key={msg.id} className="text-sm">
                          <span className="font-medium">{msg.sender}:</span>{" "}
                          <span className="text-muted-foreground">
                            {msg.message}
                          </span>
                        </div>
                      ))}
                      {/* --- End CRITICAL SECTION --- */}
                      <div ref={chatEndRef} />
                    </div>
                  </ScrollArea>
                </div>

                {/* Chat Input */}
                <form onSubmit={handleSendChat} className="flex gap-2 mt-2">
                  <Input
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    placeholder="Chat..."
                    className="text-sm"
                    data-testid="input-hangman-chat"
                  />
                  <Button
                    type="submit"
                    size="icon"
                    variant="ghost"
                    data-testid="button-send-hangman-chat"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              onClick={handleClose}
              data-testid="button-leave-hangman"
            >
              <X className="w-4 h-4 mr-2" />
              Leave
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
