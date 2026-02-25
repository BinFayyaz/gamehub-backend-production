import { useState, useRef, useEffect, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Music,
  Play,
  Pause,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward,
  Loader2,
  Repeat,
  Repeat1,
  Shuffle,
  ListMusic,
  Upload,
  Plus,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
  GripHorizontal,
  Check,
  Pencil,
  Save,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { withApiBase } from "@/lib/runtime-config";
import type { Song, Playlist } from "@shared/schema";

interface SongWithUrl extends Song {
  url: string;
}

interface MusicPlayerProps {
  compact?: boolean;
  playerId?: string;
  playerName?: string;
  isVip?: boolean;
  isAdmin?: boolean;
  onMiniPlayerToggle?: (show: boolean) => void;
  showMiniPlayer?: boolean;
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
}

type RepeatMode = "none" | "all" | "one";

export function MusicPlayer({ compact, playerId, playerName, isVip, isAdmin, onMiniPlayerToggle, showMiniPlayer, externalOpen, onExternalOpenChange }: MusicPlayerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  
  // Handle external open control
  useEffect(() => {
    if (externalOpen !== undefined && externalOpen !== isDialogOpen) {
      setIsDialogOpen(externalOpen);
    }
  }, [externalOpen]);
  
  // Notify parent of dialog state changes
  const handleDialogOpenChange = (open: boolean) => {
    setIsDialogOpen(open);
    onExternalOpenChange?.(open);
  };
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSongIndex, setCurrentSongIndex] = useState(0);
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [repeatMode, setRepeatMode] = useState<RepeatMode>("none");
  const [shuffle, setShuffle] = useState(false);
  const [currentPlaylist, setCurrentPlaylist] = useState<Playlist | null>(null);
  const [isMiniPlayerExpanded, setIsMiniPlayerExpanded] = useState(true);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showPlaylistForm, setShowPlaylistForm] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadIsPublic, setUploadIsPublic] = useState(true);
  const [newPlaylistName, setNewPlaylistName] = useState("");
  const [newPlaylistDescription, setNewPlaylistDescription] = useState("");
  const [newPlaylistIsPublic, setNewPlaylistIsPublic] = useState(true);
  const [selectedSongsForPlaylist, setSelectedSongsForPlaylist] = useState<string[]>([]);
  const [showSongSelection, setShowSongSelection] = useState(false);
  const [pendingPlaylistId, setPendingPlaylistId] = useState<string | null>(null);
  const [editingPlaylistId, setEditingPlaylistId] = useState<string | null>(null);
  const [editingDescription, setEditingDescription] = useState("");
  const [miniPlayerPosition, setMiniPlayerPosition] = useState({ x: 16, y: 16 });
  const [isDragging, setIsDragging] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const songsLengthRef = useRef(0);
  const repeatModeRef = useRef<RepeatMode>("none");
  const shuffleRef = useRef(false);
  const currentSongIndexRef = useRef(0);
  const { toast } = useToast();

  const canUpload = isVip || isAdmin;

  // Keep refs in sync with state
  useEffect(() => {
    repeatModeRef.current = repeatMode;
  }, [repeatMode]);

  useEffect(() => {
    shuffleRef.current = shuffle;
  }, [shuffle]);

  useEffect(() => {
    currentSongIndexRef.current = currentSongIndex;
  }, [currentSongIndex]);

  const { data: songsData, isLoading: songsLoading } = useQuery<{ songs: SongWithUrl[] }>({
    queryKey: ["/api/songs", playerName],
    queryFn: async () => {
      const res = await fetch(`/api/songs?username=${encodeURIComponent(playerName || "")}`);
      return res.json();
    },
  });

  const { data: playlistsData, isLoading: playlistsLoading } = useQuery<{ playlists: Playlist[] }>({
    queryKey: ["/api/playlists", playerName],
    queryFn: async () => {
      const res = await fetch(`/api/playlists?username=${encodeURIComponent(playerName || "")}`);
      return res.json();
    },
  });

  const songs = songsData?.songs || [];
  const playlists = playlistsData?.playlists || [];
  
  const playlistSongs = currentPlaylist
    ? songs.filter(s => currentPlaylist.songIds.includes(s.id))
    : songs;
  
  const currentSong = playlistSongs[currentSongIndex];
  songsLengthRef.current = playlistSongs.length;

  const uploadSongMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const res = await fetch("/api/songs", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Upload failed");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      setShowUploadForm(false);
      setUploadName("");
      setUploadFile(null);
      setUploadIsPublic(true);
      toast({ title: "Song uploaded successfully" });
    },
    onError: (error: Error) => {
      toast({ title: "Upload failed", description: error.message, variant: "destructive" });
    },
  });

  const deleteSongMutation = useMutation({
    mutationFn: async (songId: string) => {
      const res = await fetch(`/api/songs/${songId}?username=${encodeURIComponent(playerName || "")}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/songs"] });
      toast({ title: "Song deleted" });
    },
  });

  const createPlaylistMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; isPublic: boolean }) => {
      return apiRequest("/api/playlists", {
        method: "POST",
        body: JSON.stringify({
          name: data.name,
          description: data.description || null,
          creatorId: playerId,
          creatorName: playerName,
          isPublic: data.isPublic,
        }),
      });
    },
    onSuccess: (data: { playlist: Playlist }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      setShowPlaylistForm(false);
      setNewPlaylistName("");
      setNewPlaylistDescription("");
      setNewPlaylistIsPublic(true);
      // Show song selection for the new playlist
      if (data.playlist && songs.length > 0) {
        setPendingPlaylistId(data.playlist.id);
        setShowSongSelection(true);
        setSelectedSongsForPlaylist([]);
      } else {
        toast({ title: "Playlist created" });
      }
    },
  });

  const deletePlaylistMutation = useMutation({
    mutationFn: async (playlistId: string) => {
      const res = await fetch(`/api/playlists/${playlistId}?username=${encodeURIComponent(playerName || "")}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Delete failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      if (currentPlaylist) setCurrentPlaylist(null);
      toast({ title: "Playlist deleted" });
    },
  });

  const addToPlaylistMutation = useMutation({
    mutationFn: async ({ playlistId, songId }: { playlistId: string; songId: string }) => {
      return apiRequest(`/api/playlists/${playlistId}/songs`, {
        method: "POST",
        body: JSON.stringify({ songId, username: playerName }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
    },
  });

  const removeFromPlaylistMutation = useMutation({
    mutationFn: async ({ playlistId, songId }: { playlistId: string; songId: string }) => {
      const res = await fetch(`/api/playlists/${playlistId}/songs/${songId}?username=${encodeURIComponent(playerName || "")}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Remove failed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
    },
  });

  const updatePlaylistMutation = useMutation({
    mutationFn: async ({ playlistId, description }: { playlistId: string; description: string }) => {
      return apiRequest(`/api/playlists/${playlistId}`, {
        method: "PATCH",
        body: JSON.stringify({ description, username: playerName }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/playlists"] });
      toast({ title: "Playlist description updated" });
      setEditingPlaylistId(null);
      setEditingDescription("");
    },
  });

  // Audio setup - only run once
  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    const handleTimeUpdate = () => {
      setProgress(audio.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    const handleEnded = () => {
      const currentRepeatMode = repeatModeRef.current;
      const currentShuffle = shuffleRef.current;
      const currentIdx = currentSongIndexRef.current;
      const totalSongs = songsLengthRef.current;

      if (currentRepeatMode === "one") {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else if (totalSongs > 1) {
        if (currentShuffle) {
          const nextIndex = Math.floor(Math.random() * totalSongs);
          setCurrentSongIndex(nextIndex);
        } else {
          const nextIndex = (currentIdx + 1) % totalSongs;
          if (nextIndex === 0 && currentRepeatMode === "none") {
            // Reached end of playlist with repeat off - stop
            setIsPlaying(false);
            setProgress(0);
          } else {
            // Move to next song
            setCurrentSongIndex(nextIndex);
          }
        }
      } else if (currentRepeatMode === "all") {
        audio.currentTime = 0;
        audio.play().catch(() => {});
      } else {
        setIsPlaying(false);
        setProgress(0);
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", handleTimeUpdate);
    audio.addEventListener("loadedmetadata", handleLoadedMetadata);
    audio.addEventListener("ended", handleEnded);
    audio.addEventListener("play", handlePlay);
    audio.addEventListener("pause", handlePause);

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate);
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
      audio.removeEventListener("ended", handleEnded);
      audio.removeEventListener("play", handlePlay);
      audio.removeEventListener("pause", handlePause);
      audio.pause();
      audio.src = "";
    };
  }, []);

  useEffect(() => {
    if (audioRef.current && currentSong) {
      const wasPlaying = !audioRef.current.paused;
      audioRef.current.src = withApiBase(currentSong.url);
      audioRef.current.load();
      if (wasPlaying || isPlaying) {
        audioRef.current.play().catch(() => setIsPlaying(false));
      }
    }
  }, [currentSong?.url]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume;
    }
  }, [volume, isMuted]);

  const togglePlay = useCallback(() => {
    if (!audioRef.current || !currentSong) return;
    if (audioRef.current.paused) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    } else {
      audioRef.current.pause();
    }
  }, [currentSong]);

  const toggleMute = () => setIsMuted(!isMuted);

  const handlePrevious = () => {
    if (playlistSongs.length === 0) return;
    if (shuffle) {
      setCurrentSongIndex(Math.floor(Math.random() * playlistSongs.length));
    } else {
      setCurrentSongIndex((prev) => (prev - 1 + playlistSongs.length) % playlistSongs.length);
    }
  };

  const handleNext = () => {
    if (playlistSongs.length === 0) return;
    if (shuffle) {
      setCurrentSongIndex(Math.floor(Math.random() * playlistSongs.length));
    } else {
      setCurrentSongIndex((prev) => (prev + 1) % playlistSongs.length);
    }
  };

  const handleProgressChange = (value: number[]) => {
    if (audioRef.current) {
      audioRef.current.currentTime = value[0];
      setProgress(value[0]);
    }
  };

  const formatTime = (time: number) => {
    if (!time || isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const cycleRepeatMode = () => {
    setRepeatMode(prev => {
      if (prev === "none") return "all";
      if (prev === "all") return "one";
      return "none";
    });
  };

  const handleUpload = () => {
    if (!uploadFile || !uploadName || !playerId || !playerName) return;
    const formData = new FormData();
    formData.append("song", uploadFile);
    formData.append("name", uploadName);
    formData.append("uploaderId", playerId);
    formData.append("uploaderName", playerName);
    formData.append("isPublic", String(uploadIsPublic));
    uploadSongMutation.mutate(formData);
  };

  const playSong = (index: number) => {
    setCurrentSongIndex(index);
    if (audioRef.current) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  };

  const playPlaylist = (playlist: Playlist) => {
    setCurrentPlaylist(playlist);
    setCurrentSongIndex(0);
    if (audioRef.current) {
      audioRef.current.play().catch(() => setIsPlaying(false));
    }
  };

  const handleAddSongsToPlaylist = async () => {
    if (!pendingPlaylistId || selectedSongsForPlaylist.length === 0) {
      setShowSongSelection(false);
      setPendingPlaylistId(null);
      setSelectedSongsForPlaylist([]);
      toast({ title: "Playlist created" });
      return;
    }

    for (const songId of selectedSongsForPlaylist) {
      await addToPlaylistMutation.mutateAsync({ playlistId: pendingPlaylistId, songId });
    }
    
    setShowSongSelection(false);
    setPendingPlaylistId(null);
    setSelectedSongsForPlaylist([]);
    toast({ title: `Playlist created with ${selectedSongsForPlaylist.length} songs` });
  };

  const toggleSongSelection = (songId: string) => {
    setSelectedSongsForPlaylist(prev => 
      prev.includes(songId) 
        ? prev.filter(id => id !== songId)
        : [...prev, songId]
    );
  };

  // Dragging functionality
  const handleDragStart = (e: React.MouseEvent) => {
    setIsDragging(true);
    const rect = (e.currentTarget.parentElement as HTMLElement).getBoundingClientRect();
    dragOffset.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const newX = e.clientX - dragOffset.current.x;
      const newY = e.clientY - dragOffset.current.y;
      setMiniPlayerPosition({
        x: Math.max(0, Math.min(window.innerWidth - 300, newX)),
        y: Math.max(0, Math.min(window.innerHeight - 200, newY)),
      });
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging]);

  const closeMiniPlayer = () => {
    if (onMiniPlayerToggle) {
      onMiniPlayerToggle(false);
    }
  };

  const renderMiniPlayer = () => (
    <div 
      className="fixed z-50 bg-card border rounded-lg shadow-lg p-3 min-w-[280px]" 
      style={{ left: miniPlayerPosition.x, top: miniPlayerPosition.y }}
      data-testid="mini-player"
    >
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          className="cursor-grab active:cursor-grabbing"
          onMouseDown={handleDragStart}
          data-testid="button-mini-player-drag"
        >
          <GripHorizontal className="w-4 h-4" />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          onClick={() => setIsMiniPlayerExpanded(!isMiniPlayerExpanded)}
          data-testid="button-mini-player-toggle"
        >
          {isMiniPlayerExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </Button>
        <div className="flex-1 truncate text-sm font-medium">
          {currentSong?.name || "No song playing"}
        </div>
        <Button size="icon" variant="ghost" onClick={handlePrevious} disabled={playlistSongs.length <= 1}>
          <SkipBack className="w-4 h-4" />
        </Button>
        <Button size="icon" variant="default" onClick={togglePlay} disabled={!currentSong}>
          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={handleNext} disabled={playlistSongs.length <= 1}>
          <SkipForward className="w-4 h-4" />
        </Button>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
          <DialogTrigger asChild>
            <Button size="icon" variant="ghost" data-testid="button-open-music-dialog">
              <ListMusic className="w-4 h-4" />
            </Button>
          </DialogTrigger>
          {renderDialogContent()}
        </Dialog>
        <Button 
          size="icon" 
          variant="ghost" 
          onClick={closeMiniPlayer}
          data-testid="button-close-mini-player"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
      {isMiniPlayerExpanded && currentSong && (
        <div className="mt-2 space-y-2">
          <Slider
            value={[progress]}
            max={duration || 100}
            step={1}
            onValueChange={handleProgressChange}
            className="cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" onClick={cycleRepeatMode}>
              {repeatMode === "one" ? (
                <Repeat1 className="w-4 h-4 text-primary" />
              ) : (
                <Repeat className={`w-4 h-4 ${repeatMode === "all" ? "text-primary" : ""}`} />
              )}
            </Button>
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setShuffle(!shuffle)}
            >
              <Shuffle className={`w-4 h-4 ${shuffle ? "text-primary" : ""}`} />
            </Button>
            <div className="flex-1" />
            <Button size="icon" variant="ghost" onClick={toggleMute}>
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </Button>
            <Slider
              value={[isMuted ? 0 : volume * 100]}
              max={100}
              step={1}
              onValueChange={(value) => {
                setVolume(value[0] / 100);
                if (value[0] > 0) setIsMuted(false);
              }}
              className="w-20 cursor-pointer"
            />
          </div>
        </div>
      )}
    </div>
  );

  const renderDialogContent = () => (
    <DialogContent className="max-w-2xl max-h-[80vh]">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Music className="w-5 h-5" />
          Music Player
        </DialogTitle>
      </DialogHeader>
      
      {showSongSelection && pendingPlaylistId ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-lg font-semibold">Add Songs to Playlist</Label>
            <div className="text-sm text-muted-foreground">
              {selectedSongsForPlaylist.length} selected
            </div>
          </div>
          <ScrollArea className="h-[300px] border rounded-md p-2">
            {songs.map((song) => (
              <div
                key={song.id}
                className="flex items-center gap-3 p-2 rounded-md hover-elevate cursor-pointer"
                onClick={() => toggleSongSelection(song.id)}
                data-testid={`select-song-${song.id}`}
              >
                <Checkbox
                  checked={selectedSongsForPlaylist.includes(song.id)}
                  onCheckedChange={() => toggleSongSelection(song.id)}
                />
                <Music className="w-4 h-4 text-muted-foreground" />
                <div className="flex-1">
                  <div className="font-medium">{song.name}</div>
                  <div className="text-xs text-muted-foreground">by {song.uploaderName}</div>
                </div>
              </div>
            ))}
          </ScrollArea>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowSongSelection(false);
                setPendingPlaylistId(null);
                setSelectedSongsForPlaylist([]);
                toast({ title: "Playlist created" });
              }}
              className="flex-1"
            >
              Skip
            </Button>
            <Button
              onClick={handleAddSongsToPlaylist}
              disabled={addToPlaylistMutation.isPending}
              className="flex-1"
            >
              {addToPlaylistMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Check className="w-4 h-4 mr-2" />
              )}
              Add {selectedSongsForPlaylist.length} Songs
            </Button>
          </div>
        </div>
      ) : (
        <Tabs defaultValue="songs" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="songs" data-testid="tab-songs">All Songs</TabsTrigger>
            <TabsTrigger value="playlists" data-testid="tab-playlists">Playlists</TabsTrigger>
          </TabsList>

          <TabsContent value="songs" className="space-y-4">
            {canUpload && (
              <div className="space-y-2">
                {showUploadForm ? (
                  <div className="p-4 border rounded-lg space-y-3">
                    <div className="flex justify-between items-center">
                      <Label>Upload New Song</Label>
                      <Button size="icon" variant="ghost" onClick={() => setShowUploadForm(false)}>
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <Input
                      placeholder="Song name"
                      value={uploadName}
                      onChange={(e) => setUploadName(e.target.value)}
                      data-testid="input-song-name"
                    />
                    <Input
                      type="file"
                      accept="audio/*"
                      onChange={(e) => setUploadFile(e.target.files?.[0] || null)}
                      data-testid="input-song-file"
                    />
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={uploadIsPublic}
                        onCheckedChange={setUploadIsPublic}
                        data-testid="switch-song-public"
                      />
                      <Label>Public</Label>
                    </div>
                    <Button
                      onClick={handleUpload}
                      disabled={!uploadFile || !uploadName || uploadSongMutation.isPending}
                      data-testid="button-upload-song"
                    >
                      {uploadSongMutation.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      ) : (
                        <Upload className="w-4 h-4 mr-2" />
                      )}
                      Upload
                    </Button>
                  </div>
                ) : (
                  <Button variant="outline" onClick={() => setShowUploadForm(true)} data-testid="button-show-upload">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Song
                  </Button>
                )}
              </div>
            )}

            <ScrollArea className="h-[300px]">
              {songsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : songs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No songs available</p>
              ) : (
                <div className="space-y-1">
                  {songs.map((song, index) => (
                    <div
                      key={song.id}
                      className={`flex items-center gap-2 p-2 rounded-md hover-elevate cursor-pointer ${
                        currentSong?.id === song.id && !currentPlaylist ? "bg-primary/10" : ""
                      }`}
                      onClick={() => {
                        setCurrentPlaylist(null);
                        playSong(index);
                      }}
                      data-testid={`song-item-${song.id}`}
                    >
                      <Music className="w-4 h-4 text-muted-foreground" />
                      <div className="flex-1 truncate">
                        <div className="font-medium truncate">{song.name}</div>
                        <div className="text-xs text-muted-foreground">by {song.uploaderName}</div>
                      </div>
                      {currentSong?.id === song.id && !currentPlaylist && isPlaying && (
                        <span className="text-xs text-primary animate-pulse">Playing</span>
                      )}
                      {(isAdmin || song.uploaderName.toLowerCase() === playerName?.toLowerCase()) && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSongMutation.mutate(song.id);
                          }}
                          data-testid={`button-delete-song-${song.id}`}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="playlists" className="space-y-4">
            <ScrollArea className="h-[300px]">
              {playlistsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : playlists.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No playlists available</p>
              ) : (
                <div className="space-y-2">
                  {playlists.map((playlist) => (
                    <div
                      key={playlist.id}
                      className={`p-3 border rounded-lg hover-elevate cursor-pointer ${
                        currentPlaylist?.id === playlist.id ? "bg-primary/10 border-primary" : ""
                      }`}
                      onClick={() => {
                        if (editingPlaylistId !== playlist.id) {
                          playPlaylist(playlist);
                        }
                      }}
                      data-testid={`playlist-item-${playlist.id}`}
                    >
                      <div className="flex items-center gap-2">
                        <ListMusic className="w-4 h-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium">{playlist.name}</div>
                          {editingPlaylistId === playlist.id ? (
                            <div className="flex items-center gap-2 mt-1" onClick={(e) => e.stopPropagation()}>
                              <Input
                                value={editingDescription}
                                onChange={(e) => setEditingDescription(e.target.value)}
                                placeholder="Enter description..."
                                className="text-xs h-7"
                                data-testid={`input-playlist-description-${playlist.id}`}
                              />
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  updatePlaylistMutation.mutate({
                                    playlistId: playlist.id,
                                    description: editingDescription,
                                  });
                                }}
                                disabled={updatePlaylistMutation.isPending}
                                data-testid={`button-save-description-${playlist.id}`}
                              >
                                {updatePlaylistMutation.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Save className="w-4 h-4 text-primary" />
                                )}
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => {
                                  setEditingPlaylistId(null);
                                  setEditingDescription("");
                                }}
                                data-testid={`button-cancel-edit-${playlist.id}`}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          ) : (
                            playlist.description && (
                              <div className="text-xs text-muted-foreground line-clamp-1">{playlist.description}</div>
                            )
                          )}
                          <div className="text-xs text-muted-foreground">
                            {playlist.songIds.length} songs - by {playlist.creatorName}
                          </div>
                        </div>
                        {currentPlaylist?.id === playlist.id && isPlaying && (
                          <span className="text-xs text-primary animate-pulse flex-shrink-0">Playing</span>
                        )}
                        {isAdmin && editingPlaylistId !== playlist.id && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingPlaylistId(playlist.id);
                              setEditingDescription(playlist.description || "");
                            }}
                            data-testid={`button-edit-playlist-${playlist.id}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        {isAdmin && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              deletePlaylistMutation.mutate(playlist.id);
                            }}
                            data-testid={`button-delete-playlist-${playlist.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      )}
    </DialogContent>
  );

  // Show mini player when music is playing or when explicitly shown
  if ((isPlaying || currentSong) && showMiniPlayer !== false) {
    return renderMiniPlayer();
  }

  if (compact) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            variant="ghost"
            className="w-full justify-start gap-2"
            data-testid="button-music-player-toggle"
          >
            <Music className="w-4 h-4" />
            <span>Music Player</span>
            {isPlaying && (
              <span className="ml-auto text-xs text-primary animate-pulse">Playing</span>
            )}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-2 pt-2 px-2">
          {songsLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-4 h-4 animate-spin" />
            </div>
          ) : songs.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-2">
              No songs available
            </p>
          ) : (
            <>
              <div className="text-sm font-medium text-center truncate px-2">
                {currentSong?.name || "Select a song"}
              </div>
              <div className="flex items-center justify-center gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handlePrevious}
                  disabled={playlistSongs.length <= 1}
                  data-testid="button-music-previous"
                >
                  <SkipBack className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="default"
                  onClick={togglePlay}
                  disabled={!currentSong}
                  data-testid="button-music-play"
                >
                  {isPlaying ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={handleNext}
                  disabled={playlistSongs.length <= 1}
                  data-testid="button-music-next"
                >
                  <SkipForward className="w-4 h-4" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={toggleMute}
                  data-testid="button-music-mute"
                >
                  {isMuted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </Button>
              </div>
              <div className="flex items-center justify-center gap-1">
                <Button size="icon" variant="ghost" onClick={cycleRepeatMode}>
                  {repeatMode === "one" ? (
                    <Repeat1 className="w-4 h-4 text-primary" />
                  ) : (
                    <Repeat className={`w-4 h-4 ${repeatMode === "all" ? "text-primary" : ""}`} />
                  )}
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => setShuffle(!shuffle)}
                >
                  <Shuffle className={`w-4 h-4 ${shuffle ? "text-primary" : ""}`} />
                </Button>
                <Dialog open={isDialogOpen} onOpenChange={handleDialogOpenChange}>
                  <DialogTrigger asChild>
                    <Button size="icon" variant="ghost" data-testid="button-open-music-library">
                      <ListMusic className="w-4 h-4" />
                    </Button>
                  </DialogTrigger>
                  {renderDialogContent()}
                </Dialog>
              </div>
              <div className="space-y-1 px-1">
                <Slider
                  value={[progress]}
                  max={duration || 100}
                  step={1}
                  onValueChange={handleProgressChange}
                  className="cursor-pointer"
                  data-testid="slider-music-progress"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{formatTime(progress)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2 px-1">
                <Volume2 className="w-3 h-3 text-muted-foreground" />
                <Slider
                  value={[isMuted ? 0 : volume * 100]}
                  max={100}
                  step={1}
                  onValueChange={(value) => {
                    setVolume(value[0] / 100);
                    if (value[0] > 0) setIsMuted(false);
                  }}
                  className="flex-1 cursor-pointer"
                  data-testid="slider-music-volume"
                />
              </div>
            </>
          )}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return null;
}
