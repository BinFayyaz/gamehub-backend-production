import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Image, Upload, Trash2, X, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { withApiBase } from "@/lib/runtime-config";
import type { Screenshot } from "@shared/schema";

interface MediaGalleryProps {
  currentPlayerId: string;
  currentPlayerName: string;
  isAdmin: boolean;
  isVip?: boolean;
}

export function MediaGallery({ currentPlayerId, currentPlayerName, isAdmin, isVip }: MediaGalleryProps) {
  const canUpload = isAdmin || isVip;
  const [isOpen, setIsOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Screenshot | null>(null);
  const [gameName, setGameName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<{ screenshots: Screenshot[] }>({
    queryKey: ["/api/screenshots"],
    enabled: isOpen,
  });

  const screenshots = data?.screenshots || [];

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/screenshots", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/screenshots"] });
      toast({ title: "Screenshot uploaded!" });
      setGameName("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    onError: () => {
      toast({ title: "Failed to upload screenshot", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return apiRequest("DELETE", `/api/screenshots/${id}?username=${encodeURIComponent(currentPlayerName)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/screenshots"] });
      toast({ title: "Screenshot deleted!" });
      setSelectedImage(null);
    },
    onError: () => {
      toast({ title: "Failed to delete screenshot", variant: "destructive" });
    },
  });

  const handleUpload = () => {
    const file = fileInputRef.current?.files?.[0];
    if (!file || !gameName) {
      toast({ title: "Please select a file and game", variant: "destructive" });
      return;
    }
    const formData = new FormData();
    formData.append("screenshot", file);
    formData.append("uploaderId", currentPlayerId);
    formData.append("uploaderName", currentPlayerName);
    formData.append("gameName", gameName);
    uploadMutation.mutate(formData);
  };

  const games = [
    "Tic Tac Toe",
    "Rock Paper Scissors",
    "Word Scramble",
    "Number Guess",
    "Quick Math",
    "Connect Four",
    "Riddles",
    "Memory Match",
    "Typing Race",
    "Werewolf",
    "Spy Hunt",
    "Point on Point",
    "Outpost Rush",
    "Emoji Chain",
    "Word Association",
    "Other",
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          data-testid="button-media-gallery"
        >
          <Image className="w-4 h-4" />
          <span>Media Gallery</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Game Screenshots Gallery</DialogTitle>
        </DialogHeader>
        
        {canUpload && (
          <div className="flex gap-2 items-end flex-wrap p-3 bg-muted/50 rounded-md">
            <div className="flex-1 min-w-[120px]">
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="text-sm"
                data-testid="input-screenshot-file"
              />
            </div>
            <Select value={gameName} onValueChange={setGameName}>
              <SelectTrigger className="w-[140px]" data-testid="select-game-name">
                <SelectValue placeholder="Select game" />
              </SelectTrigger>
              <SelectContent>
                {games.map((game) => (
                  <SelectItem key={game} value={game}>
                    {game}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              onClick={handleUpload}
              disabled={uploadMutation.isPending}
              size="sm"
              data-testid="button-upload-screenshot"
            >
              {uploadMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </Button>
          </div>
        )}

        <ScrollArea className="flex-1 min-h-[300px]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : screenshots.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Image className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-sm">No screenshots yet</p>
              <p className="text-xs mt-1">Upload your game wins!</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2 p-1">
              {screenshots.map((screenshot) => (
                <div
                  key={screenshot.id}
                  className="relative aspect-video bg-muted rounded-md overflow-hidden cursor-pointer hover-elevate"
                  onClick={() => setSelectedImage(screenshot)}
                  data-testid={`screenshot-${screenshot.id}`}
                >
                  <img
                    src={withApiBase(`/uploads/screenshots/${screenshot.filename}`)}
                    alt={screenshot.gameName}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-1">
                    <p className="text-xs text-white truncate">{screenshot.gameName}</p>
                    <p className="text-xs text-white/70 truncate">{screenshot.uploaderName}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {selectedImage && (
          <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between gap-2">
                  <span>{selectedImage.gameName} - {selectedImage.uploaderName}</span>
                  {isAdmin && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(selectedImage.id)}
                      disabled={deleteMutation.isPending}
                      data-testid="button-delete-screenshot"
                    >
                      {deleteMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  )}
                </DialogTitle>
              </DialogHeader>
              <img
                src={withApiBase(`/uploads/screenshots/${selectedImage.filename}`)}
                alt={selectedImage.gameName}
                className="w-full h-auto max-h-[70vh] object-contain rounded-md"
              />
              <p className="text-sm text-muted-foreground text-center">
                Uploaded {new Date(selectedImage.timestamp).toLocaleDateString()}
              </p>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}
