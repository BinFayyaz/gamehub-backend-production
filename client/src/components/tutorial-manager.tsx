import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Video, Upload, Trash2, Play, Loader2, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { withApiBase } from "@/lib/runtime-config";
import type { Tutorial } from "@shared/schema";

interface TutorialManagerProps {
  currentPlayerId: string;
  currentPlayerName: string;
  isAdmin: boolean;
  isVip?: boolean;
}

const gameTypes = [
  { value: "tictactoe", label: "Tic Tac Toe" },
  { value: "rps", label: "Rock Paper Scissors" },
  { value: "wordscramble", label: "Word Scramble" },
  { value: "numberguess", label: "Number Guess" },
  { value: "quickmath", label: "Quick Math" },
  { value: "connectfour", label: "Connect Four" },
  { value: "riddles", label: "Riddles" },
  { value: "memory", label: "Memory Match" },
  { value: "typing", label: "Typing Race" },
  { value: "werewolf", label: "Werewolf" },
  { value: "spyhunt", label: "Spy Hunt" },
  { value: "pointonpoint", label: "Point on Point" },
  { value: "outpostrush", label: "Outpost Rush" },
  { value: "emojichain", label: "Emoji Chain" },
  { value: "wordassociation", label: "Word Association" },
  { value: "hangman", label: "Hangman" },
  { value: "triviaquiz", label: "Trivia Quiz" },
];

export function TutorialManager({ currentPlayerId, currentPlayerName, isAdmin, isVip }: TutorialManagerProps) {
  const canUpload = isAdmin || isVip;
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTutorial, setSelectedTutorial] = useState<Tutorial | null>(null);
  const [gameType, setGameType] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ tutorials: Tutorial[] }>({
    queryKey: ["/api/tutorials"],
    enabled: isOpen,
  });

  const tutorials = data?.tutorials || [];

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/tutorials", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || "Upload failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutorials"] });
      toast({ title: "Tutorial uploaded!" });
      setGameType("");
      setTitle("");
      setDescription("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: (error: Error) => {
      toast({ title: error.message || "Failed to upload tutorial", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/tutorials/${id}?username=${encodeURIComponent(currentPlayerName)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tutorials"] });
      toast({ title: "Tutorial deleted!" });
      setSelectedTutorial(null);
    },
    onError: () => {
      toast({ title: "Failed to delete tutorial", variant: "destructive" });
    },
  });

  const handleUpload = () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !gameType || !title) {
      toast({ title: "Please fill all required fields", variant: "destructive" });
      return;
    }
    const formData = new FormData();
    formData.append("video", file);
    formData.append("uploaderId", currentPlayerId);
    formData.append("uploaderName", currentPlayerName);
    formData.append("username", currentPlayerName);
    formData.append("gameType", gameType);
    formData.append("title", title);
    formData.append("description", description);
    uploadMutation.mutate(formData);
  };

  const getGameLabel = (type: string) => {
    return gameTypes.find(g => g.value === type)?.label || type;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          data-testid="button-tutorial-manager"
        >
          <BookOpen className="w-4 h-4" />
          <span>Game Tutorials</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Game Tutorial Videos</DialogTitle>
        </DialogHeader>
        
        {canUpload && (
          <div className="space-y-3 p-3 bg-muted/50 rounded-md">
            <p className="text-sm font-medium">Upload New Tutorial (VIP/Admin Only)</p>
            <div className="flex gap-2 flex-wrap">
              <Select value={gameType} onValueChange={setGameType}>
                <SelectTrigger className="w-[160px]" data-testid="select-tutorial-game">
                  <SelectValue placeholder="Select game" />
                </SelectTrigger>
                <SelectContent>
                  {gameTypes.map((game) => (
                    <SelectItem key={game.value} value={game.value}>
                      {game.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Tutorial title"
                className="flex-1 min-w-[150px]"
                data-testid="input-tutorial-title"
              />
            </div>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of what this tutorial covers..."
              className="resize-none"
              rows={2}
              data-testid="input-tutorial-description"
            />
            <div className="flex gap-2 items-center">
              <Input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                className="flex-1 text-sm"
                data-testid="input-tutorial-file"
              />
              <Button
                onClick={handleUpload}
                disabled={uploadMutation.isPending}
                data-testid="button-upload-tutorial"
              >
                {uploadMutation.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 min-h-[250px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : tutorials.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Video className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-sm">No tutorials yet</p>
              {canUpload && <p className="text-xs mt-1">Upload tutorial videos for games!</p>}
            </div>
          ) : (
            <div className="space-y-2 p-1">
              {tutorials.map((tutorial) => (
                <div
                  key={tutorial.id}
                  className="flex items-center gap-3 p-3 bg-card rounded-md border hover-elevate cursor-pointer"
                  onClick={() => setSelectedTutorial(tutorial)}
                  data-testid={`tutorial-${tutorial.id}`}
                >
                  <div className="w-10 h-10 bg-primary/10 rounded-md flex items-center justify-center">
                    <Play className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{tutorial.title}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {getGameLabel(tutorial.gameType)} - by {tutorial.uploaderName}
                    </p>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteMutation.mutate(tutorial.id);
                      }}
                      disabled={deleteMutation.isPending}
                      data-testid={`button-delete-tutorial-${tutorial.id}`}
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 text-destructive" />
                      )}
                    </Button>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {selectedTutorial && (
          <Dialog open={!!selectedTutorial} onOpenChange={() => setSelectedTutorial(null)}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>{selectedTutorial.title}</DialogTitle>
              </DialogHeader>
              <p className="text-sm text-muted-foreground mb-2">
                {getGameLabel(selectedTutorial.gameType)} Tutorial
              </p>
              {selectedTutorial.description && (
                <p className="text-sm mb-3">{selectedTutorial.description}</p>
              )}
              <video
                src={withApiBase(`/uploads/tutorials/${selectedTutorial.videoFilename}`)}
                controls
                className="w-full max-h-[60vh] rounded-md bg-black"
                data-testid="video-tutorial-player"
              />
              <p className="text-xs text-muted-foreground text-center mt-2">
                Uploaded by {selectedTutorial.uploaderName} on {new Date(selectedTutorial.timestamp).toLocaleDateString()}
              </p>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}

interface TutorialViewerProps {
  gameType: string;
}

export function TutorialViewer({ gameType }: TutorialViewerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const { data, isLoading } = useQuery<{ tutorial: Tutorial }>({
    queryKey: ["/api/tutorials", gameType],
    enabled: isOpen,
  });

  const tutorial = data?.tutorial;

  const gameLabel = gameTypes.find(g => g.value === gameType)?.label || gameType;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          data-testid={`button-watch-tutorial-${gameType}`}
        >
          <BookOpen className="w-4 h-4" />
          How to Play
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>{gameLabel} Tutorial</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : tutorial ? (
          <div>
            <h3 className="font-medium mb-2">{tutorial.title}</h3>
            {tutorial.description && (
              <p className="text-sm text-muted-foreground mb-3">{tutorial.description}</p>
            )}
            <video
              src={withApiBase(`/uploads/tutorials/${tutorial.videoFilename}`)}
              controls
              className="w-full max-h-[50vh] rounded-md bg-black"
              data-testid="video-tutorial-viewer"
            />
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <Video className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">No tutorial available for this game yet</p>
            <p className="text-xs mt-1">Check back later!</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
