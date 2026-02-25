import { useState, useEffect } from "react";
import { useWebSocket } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  Users, 
  Play, 
  LogOut, 
  Crown, 
  Check,
  X,
  BookOpen,
  ThumbsUp,
  ThumbsDown,
  Trophy,
  UserX
} from "lucide-react";
import { GameChat } from "@/components/game-chat";

export function TruthOrBluffLobby() {
  const { 
    truthOrBluffLobby, 
    currentPlayerId, 
    startTruthOrBluffGame, 
    leaveTruthOrBluffLobby,
    isAdmin,
    adminForceKick
  } = useWebSocket();

  if (!truthOrBluffLobby) return null;

  const isHost = currentPlayerId === truthOrBluffLobby.hostId;
  const canStart = truthOrBluffLobby.players.length >= truthOrBluffLobby.minPlayers && isHost;
  const waitingCount = truthOrBluffLobby.minPlayers - truthOrBluffLobby.players.length;

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
      <GameChat />
      <Card className="w-full max-w-md border-border/50 shadow-2xl animate-bounce-in" data-testid="truthorbluff-lobby">
        <CardHeader className="text-center border-b border-border/50">
          <div className="flex items-center justify-between gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={leaveTruthOrBluffLobby}
              data-testid="button-leave-truthorbluff-lobby"
            >
              <LogOut className="w-4 h-4 mr-1" />
              Leave
            </Button>
            <div className="flex-1" />
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <BookOpen className="w-8 h-8 text-purple-500" />
            <CardTitle className="text-2xl font-bold">Truth or Bluff</CardTitle>
          </div>
          <CardDescription>
            Tell stories - can others spot the lies?
          </CardDescription>
          <Badge variant="secondary" className="mt-2">
            <Users className="w-3 h-3 mr-1" />
            {truthOrBluffLobby.players.length} / {truthOrBluffLobby.minPlayers}+ players
          </Badge>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          <ScrollArea className="h-48">
            <div className="space-y-2">
              {truthOrBluffLobby.players.map((player) => (
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
                  <span className="text-sm text-muted-foreground">
                    Score: {player.score}
                  </span>
                  {player.id === truthOrBluffLobby.hostId && (
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

          <div className="space-y-3">
            <div className="text-sm text-center text-muted-foreground">
              Write a story (20+ words), mark it as true or fake, and see if others can guess!
            </div>
            
            {waitingCount > 0 && (
              <p className="text-sm text-center text-muted-foreground">
                Waiting for {waitingCount} more player{waitingCount > 1 ? "s" : ""}...
              </p>
            )}

            {isHost && (
              <Button
                className="w-full bg-purple-500 hover:bg-purple-600"
                disabled={!canStart}
                onClick={startTruthOrBluffGame}
                data-testid="button-start-truthorbluff"
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

export function TruthOrBluffGame() {
  const { 
    truthOrBluffGame, 
    currentPlayerId,
    submitTruthOrBluffStory,
    voteTruthOrBluff,
    leaveTruthOrBluffLobby
  } = useWebSocket();
  
  const [story, setStory] = useState("");
  const [isTruth, setIsTruth] = useState<boolean | null>(null);
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    if (truthOrBluffGame?.status === "waiting_story") {
      setStory("");
      setIsTruth(null);
    }
    if (truthOrBluffGame?.status === "voting") {
      setHasVoted(false);
    }
  }, [truthOrBluffGame?.status, truthOrBluffGame?.currentTurnIndex]);

  if (!truthOrBluffGame) return null;

  const isMyTurn = truthOrBluffGame.currentStoryteller === currentPlayerId;
  const currentStoryteller = truthOrBluffGame.players.find(p => p.id === truthOrBluffGame.currentStoryteller);
  const wordCount = story.trim().split(/\s+/).filter(w => w.length > 0).length;
  const canSubmit = wordCount >= 20 && isTruth !== null;
  const hasVotedInGame = truthOrBluffGame.votes[currentPlayerId] !== undefined;

  const handleSubmitStory = () => {
    if (canSubmit && isTruth !== null) {
      submitTruthOrBluffStory(story, isTruth);
    }
  };

  const handleVote = (voteTruth: boolean) => {
    voteTruthOrBluff(voteTruth);
    setHasVoted(true);
  };

  const renderContent = () => {
    switch (truthOrBluffGame.status) {
      case "waiting_story":
        if (isMyTurn) {
          return (
            <div className="space-y-4">
              <div className="text-center">
                <h2 className="text-xl font-bold mb-2">Your Turn!</h2>
                <p className="text-muted-foreground">
                  Write a story (minimum 20 words) and mark it as true or fake.
                </p>
              </div>
              
              <Textarea
                value={story}
                onChange={(e) => setStory(e.target.value)}
                placeholder="Write your story here..."
                className="min-h-32"
                data-testid="textarea-story"
              />
              
              <div className="flex justify-between items-center">
                <span className={`text-sm ${wordCount >= 20 ? "text-green-500" : "text-muted-foreground"}`}>
                  {wordCount}/20 words {wordCount >= 20 && <Check className="inline w-4 h-4" />}
                </span>
              </div>
              
              <div className="flex gap-4 justify-center">
                <Button
                  variant={isTruth === true ? "default" : "outline"}
                  onClick={() => setIsTruth(true)}
                  className={isTruth === true ? "bg-green-500 hover:bg-green-600" : ""}
                  data-testid="button-mark-truth"
                >
                  <Check className="w-4 h-4 mr-2" />
                  This is TRUE
                </Button>
                <Button
                  variant={isTruth === false ? "default" : "outline"}
                  onClick={() => setIsTruth(false)}
                  className={isTruth === false ? "bg-red-500 hover:bg-red-600" : ""}
                  data-testid="button-mark-fake"
                >
                  <X className="w-4 h-4 mr-2" />
                  This is FAKE
                </Button>
              </div>
              
              <Button 
                className="w-full"
                disabled={!canSubmit}
                onClick={handleSubmitStory}
                data-testid="button-submit-story"
              >
                Submit Story
              </Button>
            </div>
          );
        } else {
          return (
            <div className="text-center space-y-4">
              <div className="animate-pulse">
                <BookOpen className="w-16 h-16 mx-auto text-purple-500" />
              </div>
              <h2 className="text-xl font-bold">
                {currentStoryteller?.name} is writing their story...
              </h2>
              <p className="text-muted-foreground">
                Get ready to guess if it's true or fake!
              </p>
            </div>
          );
        }

      case "voting":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl font-bold mb-2">
                {currentStoryteller?.name}'s Story
              </h2>
            </div>
            
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <p className="text-lg italic">"{truthOrBluffGame.currentStory}"</p>
              </CardContent>
            </Card>
            
            {!isMyTurn && !hasVotedInGame && !hasVoted ? (
              <div className="space-y-4">
                <p className="text-center text-muted-foreground">
                  Is this story TRUE or FAKE?
                </p>
                <div className="flex gap-4 justify-center">
                  <Button
                    size="lg"
                    className="bg-green-500 hover:bg-green-600"
                    onClick={() => handleVote(true)}
                    data-testid="button-vote-truth"
                  >
                    <ThumbsUp className="w-5 h-5 mr-2" />
                    TRUE
                  </Button>
                  <Button
                    size="lg"
                    className="bg-red-500 hover:bg-red-600"
                    onClick={() => handleVote(false)}
                    data-testid="button-vote-fake"
                  >
                    <ThumbsDown className="w-5 h-5 mr-2" />
                    FAKE
                  </Button>
                </div>
              </div>
            ) : isMyTurn ? (
              <p className="text-center text-muted-foreground">
                Waiting for others to vote...
              </p>
            ) : (
              <p className="text-center text-green-500">
                <Check className="inline w-4 h-4 mr-1" />
                Vote submitted! Waiting for others...
              </p>
            )}
            
            <div className="text-center text-sm text-muted-foreground">
              Votes: {Object.keys(truthOrBluffGame.votes).length} / {truthOrBluffGame.players.length - 1}
            </div>
          </div>
        );

      case "reveal":
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-2xl font-bold mb-4">The Truth Revealed!</h2>
              <div className={`text-4xl font-bold ${truthOrBluffGame.storyIsTruth ? "text-green-500" : "text-red-500"}`}>
                {truthOrBluffGame.storyIsTruth ? (
                  <span><Check className="inline w-10 h-10" /> TRUE</span>
                ) : (
                  <span><X className="inline w-10 h-10" /> FAKE</span>
                )}
              </div>
            </div>
            
            <Card className="bg-muted/50">
              <CardContent className="p-4">
                <p className="text-lg italic">"{truthOrBluffGame.currentStory}"</p>
              </CardContent>
            </Card>
            
            <div className="space-y-2">
              <h3 className="font-semibold text-center">Results:</h3>
              <div className="grid gap-2">
                {truthOrBluffGame.voteResults.map(result => (
                  <div 
                    key={result.playerId}
                    className={`flex items-center justify-between p-2 rounded-lg ${
                      result.wasCorrect ? "bg-green-500/20" : "bg-red-500/20"
                    }`}
                  >
                    <span className="font-medium">{result.playerName}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">
                        Voted: {result.votedTruth ? "True" : "Fake"}
                      </span>
                      {result.wasCorrect ? (
                        <Check className="w-5 h-5 text-green-500" />
                      ) : (
                        <X className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case "finished":
        const sortedPlayers = [...truthOrBluffGame.players].sort((a, b) => b.score - a.score);
        const winner = sortedPlayers[0];
        
        return (
          <div className="text-center space-y-6">
            <Trophy className="w-16 h-16 mx-auto text-yellow-500" />
            <h2 className="text-2xl font-bold">Game Over!</h2>
            
            <div className="space-y-2">
              <p className="text-lg">Winner:</p>
              <Badge className="text-lg px-4 py-2 bg-yellow-500">
                <Trophy className="w-4 h-4 mr-2" />
                {winner.name} - {winner.score} points
              </Badge>
            </div>
            
            <div className="space-y-2">
              <h3 className="font-semibold">Final Scores:</h3>
              {sortedPlayers.map((player, index) => (
                <div key={player.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-lg">
                  <span className="flex items-center gap-2">
                    {index === 0 && <Trophy className="w-4 h-4 text-yellow-500" />}
                    {player.name}
                  </span>
                  <span className="font-bold">{player.score} pts</span>
                </div>
              ))}
            </div>
            
            <Button onClick={leaveTruthOrBluffLobby} data-testid="button-leave-game">
              Leave Game
            </Button>
          </div>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-40 bg-background/95 backdrop-blur flex items-center justify-center p-4">
      <GameChat />
      <Card className="w-full max-w-2xl border-purple-500/50 shadow-2xl" data-testid="truthorbluff-game">
        <CardHeader className="border-b border-border/50 bg-purple-500/10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-purple-500" />
              <CardTitle className="text-purple-500">Truth or Bluff</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                Round {truthOrBluffGame.roundNumber}/{truthOrBluffGame.totalRounds}
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={leaveTruthOrBluffLobby}
                data-testid="button-leave"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {renderContent()}
          
          {truthOrBluffGame.status !== "finished" && (
            <div className="mt-6 border-t pt-4">
              <h3 className="text-sm font-semibold mb-2">Scores:</h3>
              <div className="flex flex-wrap gap-2">
                {truthOrBluffGame.players.map(player => (
                  <Badge 
                    key={player.id} 
                    variant={player.id === currentPlayerId ? "default" : "secondary"}
                  >
                    {player.name}: {player.score}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
