import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useWebSocket } from "@/lib/websocket";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Trophy, Award, Users, LogOut, Settings, ArrowLeft } from "lucide-react";
import { AvatarSelector } from "@/components/avatar-selector";
import { AchievementsDisplay } from "@/components/achievements-display";
import { FriendsList } from "@/components/friends-list";
import type { AvatarStyle, Achievement, Friend } from "@shared/schema";

export default function Profile() {
  const { currentPlayerName, currentPlayerId, logout } = useWebSocket();
  const [location, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<"profile" | "achievements" | "friends">("profile");
  const [showAvatarSelector, setShowAvatarSelector] = useState(false);
  const [selectedAvatarStyle, setSelectedAvatarStyle] = useState<AvatarStyle>("avataaars");
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [wins, setWins] = useState(0);
  const [losses, setLosses] = useState(0);
  const [level, setLevel] = useState(1);

  useEffect(() => {
    if (currentPlayerId && currentPlayerName) {
      loadData();
    }
  }, [currentPlayerId, currentPlayerName]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const playerIdentity = currentPlayerName || currentPlayerId;
      const [achRes, friendRes, pendingRes, outgoingRes, profileRes] = await Promise.all([
        fetch(`/api/achievements/${currentPlayerId}`),
        fetch(`/api/friends/${encodeURIComponent(playerIdentity)}`),
        fetch(`/api/friends/${encodeURIComponent(playerIdentity)}/pending`),
        fetch(`/api/friends/${encodeURIComponent(playerIdentity)}/outgoing`),
        fetch(
          `/api/player/profile?playerId=${encodeURIComponent(currentPlayerId)}&username=${encodeURIComponent(currentPlayerName || "")}`,
        ),
      ]);
      if (achRes.ok) {
        const data = await achRes.json();
        setAchievements(data.achievements || []);
      }
      if (friendRes.ok) {
        const data = await friendRes.json();
        setFriends(data.friends || []);
      }
      if (pendingRes.ok) {
        const data = await pendingRes.json();
        setPendingRequests(data.pending || []);
      }
      if (outgoingRes.ok) {
        const data = await outgoingRes.json();
        setOutgoingRequests(data.outgoing || []);
      }
      if (profileRes.ok) {
        const data = await profileRes.json();
        const profile = data?.profile;
        if (profile?.avatarStyle) {
          setSelectedAvatarStyle(profile.avatarStyle);
        }
        setWins(Number(profile?.wins ?? 0));
        setLosses(Number(profile?.losses ?? 0));
        setLevel(Number(profile?.level ?? 1));
      }
    } catch (error) {
      console.error("Failed to load profile data:", error);
    }
    setIsLoading(false);
  };

  const handleAvatarSelect = async (style: AvatarStyle) => {
    setIsSavingAvatar(true);
    try {
      const response = await fetch("/api/player/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerId: currentPlayerId,
          username: currentPlayerName,
          style,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        setSelectedAvatarStyle(data?.player?.avatarStyle || style);
      }
    } catch (error) {
      console.error("Failed to update avatar:", error);
    } finally {
      setIsSavingAvatar(false);
    }
  };

  const handleSendFriendRequest = async (friendName: string) => {
    try {
      const res = await fetch("/api/friends/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerUsername: currentPlayerName,
          friendUsername: friendName,
        }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error("Failed to send friend request:", error);
    }
  };

  const handleAcceptFriend = async (friendId: string) => {
    try {
      const res = await fetch("/api/friends/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerUsername: currentPlayerName,
          friendUsername: friendId,
        }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error("Failed to accept friend request:", error);
    }
  };

  const handleRemoveFriend = async (friendId: string) => {
    try {
      const res = await fetch(
        `/api/friends/${encodeURIComponent(currentPlayerName || currentPlayerId)}/${encodeURIComponent(friendId)}`,
        {
        method: "DELETE",
      },
      );
      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error("Failed to remove friend:", error);
    }
  };

  const handleRejectRequest = async (friendId: string) => {
    try {
      const res = await fetch("/api/friends/reject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          playerUsername: currentPlayerName,
          friendUsername: friendId,
        }),
      });
      if (res.ok) {
        await loadData();
      }
    } catch (error) {
      console.error("Failed to reject friend request:", error);
    }
  };

  if (!currentPlayerId) return null;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setLocation("/home")}
          className="mb-6 gap-2"
          data-testid="button-back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Home
        </Button>

        {/* Profile Header */}
        <Card className="p-6 mb-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex gap-6">
              <Avatar className="w-24 h-24">
                <AvatarImage
                  src={`https://api.dicebear.com/7.x/${selectedAvatarStyle}/svg?seed=${encodeURIComponent(currentPlayerName || currentPlayerId)}`}
                />
                <AvatarFallback>{currentPlayerName?.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="space-y-2">
                <h1 className="text-3xl font-bold text-foreground">{currentPlayerName}</h1>
                <p className="text-muted-foreground">Player ID: {currentPlayerId}</p>
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="default">Level {level}</Badge>
                  <Badge variant="secondary">{wins} Wins</Badge>
                  <Badge variant="outline">{losses} Losses</Badge>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Button variant="outline" onClick={logout} className="gap-2" data-testid="button-logout">
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAvatarSelector(!showAvatarSelector)}
                className="gap-2"
                data-testid="button-customize"
              >
                <Settings className="w-4 h-4" />
                Customize
              </Button>
            </div>
          </div>
        </Card>

        {/* Avatar Selector */}
        {showAvatarSelector && (
          <Card className="p-6 mb-6">
              <AvatarSelector
                currentStyle={selectedAvatarStyle}
                seed={currentPlayerName || currentPlayerId}
                onSelect={handleAvatarSelect}
                onSave={() => setShowAvatarSelector(false)}
                isSaving={isSavingAvatar}
            />
          </Card>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          <Button
            variant={activeTab === "profile" ? "default" : "outline"}
            onClick={() => setActiveTab("profile")}
            className="gap-2"
            data-testid="tab-profile"
          >
            <Award className="w-4 h-4" />
            Profile
          </Button>
          <Button
            variant={activeTab === "achievements" ? "default" : "outline"}
            onClick={() => setActiveTab("achievements")}
            className="gap-2"
            data-testid="tab-achievements"
          >
            <Trophy className="w-4 h-4" />
            Achievements
          </Button>
          <Button
            variant={activeTab === "friends" ? "default" : "outline"}
            onClick={() => setActiveTab("friends")}
            className="gap-2"
            data-testid="tab-friends"
          >
            <Users className="w-4 h-4" />
            Friends
          </Button>
        </div>

        {/* Profile Tab */}
        {activeTab === "profile" && (
          <div className="space-y-4">
            <Card className="p-6">
              <h2 className="text-2xl font-bold mb-4 text-foreground">Profile Stats</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{wins}</p>
                  <p className="text-sm text-muted-foreground">Total Wins</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{losses}</p>
                  <p className="text-sm text-muted-foreground">Total Losses</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">
                    {wins + losses > 0 ? `${Math.round((wins / (wins + losses)) * 100)}%` : "0%"}
                  </p>
                  <p className="text-sm text-muted-foreground">Win Rate</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-primary">{level}</p>
                  <p className="text-sm text-muted-foreground">Current Level</p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Achievements Tab */}
        {activeTab === "achievements" && (
          <AchievementsDisplay achievements={achievements} isLoading={isLoading} />
        )}

        {/* Friends Tab */}
        {activeTab === "friends" && (
          <FriendsList
            friends={friends}
            pendingRequests={pendingRequests}
            outgoingRequests={outgoingRequests}
            onSendRequest={handleSendFriendRequest}
            onAcceptRequest={handleAcceptFriend}
            onRejectRequest={handleRejectRequest}
            onRemoveFriend={handleRemoveFriend}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
}
