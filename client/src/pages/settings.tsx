import { useEffect, useState } from "react";
import { useWebSocket } from "@/lib/websocket";
import { useLocation } from "wouter";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Copy } from "lucide-react";
import type { AvatarStyle } from "@shared/schema";

const AVATAR_STYLES: AvatarStyle[] = [
  "avataaars",
  "big-ears",
  "big-smile",
  "bottts",
  "croodles",
  "fun-emoji",
  "icons",
  "identicon",
  "notionists",
  "personas",
  "pixel-art",
];

export default function Settings() {
  const { currentPlayerName, currentPlayerId } = useWebSocket();
  const [, navigate] = useLocation();
  const [selectedStyle, setSelectedStyle] = useState<AvatarStyle>("avataaars");
  const [copied, setCopied] = useState(false);
  const [isSavingStyle, setIsSavingStyle] = useState(false);

  if (!currentPlayerId) return null;

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const res = await fetch(
          `/api/player/profile?playerId=${encodeURIComponent(currentPlayerId)}&username=${encodeURIComponent(currentPlayerName || "")}`,
        );
        if (!res.ok) return;
        const data = await res.json();
        if (data?.profile?.avatarStyle) {
          setSelectedStyle(data.profile.avatarStyle);
        }
      } catch (error) {
        console.error("Failed to load profile style:", error);
      }
    };
    loadProfile();
  }, [currentPlayerId, currentPlayerName]);

  const avatarUrl = `https://api.dicebear.com/7.x/${selectedStyle}/svg?seed=${encodeURIComponent(currentPlayerName || currentPlayerId)}`;

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(avatarUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleStyleSelect = async (style: AvatarStyle) => {
    setSelectedStyle(style);
    setIsSavingStyle(true);
    try {
      await fetch("/api/player/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: currentPlayerId,
          username: currentPlayerName,
          style,
        }),
      });
    } catch (error) {
      console.error("Failed to save avatar style:", error);
    } finally {
      setIsSavingStyle(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/home")}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
        </div>

        {/* Avatar Settings */}
        <Card className="p-6 mb-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Avatar</h2>
          
          <div className="space-y-6">
            {/* Current Avatar Preview */}
            <div className="flex flex-col items-center gap-4 p-6 rounded-lg bg-muted/30 border border-border/50">
              <Avatar className="w-24 h-24">
                <AvatarImage src={avatarUrl} />
                <AvatarFallback>{currentPlayerName?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-2">Current Avatar</p>
                <p className="font-semibold text-foreground">{currentPlayerName}</p>
                <Badge variant="secondary" className="mt-2">{selectedStyle}</Badge>
              </div>
            </div>

            {/* Avatar URL */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Avatar URL</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={avatarUrl}
                  readOnly
                  className="flex-1 px-3 py-2 rounded-md border border-border bg-background text-foreground text-sm"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyUrl}
                  className="gap-2"
                  data-testid="button-copy-avatar"
                >
                  <Copy className="w-4 h-4" />
                  {copied ? "Copied!" : "Copy"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                You can use this URL in your profile or other apps that support avatar images.
              </p>
            </div>

            {/* Style Selection */}
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">Avatar Style</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {AVATAR_STYLES.map((style) => (
                  <button
                    key={style}
                    onClick={() => handleStyleSelect(style)}
                    disabled={isSavingStyle}
                    className={`p-3 rounded-lg border-2 transition-all ${
                      selectedStyle === style
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-border/70"
                    }`}
                    data-testid={`avatar-style-${style}`}
                  >
                    <div className="flex flex-col items-center gap-2">
                      <img
                        src={`https://api.dicebear.com/7.x/${style}/svg?seed=test`}
                        alt={style}
                        className="w-12 h-12 rounded-full"
                      />
                      <span className="text-xs text-center text-foreground truncate w-full">
                        {style}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Account Information */}
        <Card className="p-6">
          <h2 className="text-xl font-semibold text-foreground mb-4">Account Information</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Username</p>
              <p className="font-semibold text-foreground">{currentPlayerName}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Player ID</p>
              <p className="font-mono text-sm text-foreground break-all">{currentPlayerId}</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
