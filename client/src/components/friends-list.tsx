import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import type { Friend } from "@shared/schema";
import { Plus, X, Check, UserPlus } from "lucide-react";

interface FriendsListProps {
  friends: Friend[];
  pendingRequests: Friend[];
  outgoingRequests?: Friend[];
  isLoading?: boolean;
  onSendRequest?: (friendName: string) => void;
  onAcceptRequest?: (friendId: string) => void;
  onRejectRequest?: (friendId: string) => void;
  onRemoveFriend?: (friendId: string) => void;
}

export function FriendsList({
  friends,
  pendingRequests,
  outgoingRequests = [],
  isLoading = false,
  onSendRequest,
  onAcceptRequest,
  onRejectRequest,
  onRemoveFriend,
}: FriendsListProps) {
  const [searchInput, setSearchInput] = useState("");

  return (
    <div className="space-y-6">
      {/* Add Friend Section */}
      {onSendRequest && (
        <Card className="p-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search player to add..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              data-testid="input-friend-search"
            />
            <Button
              onClick={() => {
                if (searchInput.trim()) {
                  onSendRequest(searchInput);
                  setSearchInput("");
                }
              }}
              className="gap-2"
              data-testid="button-add-friend"
            >
              <Plus className="w-4 h-4" />
              Add
            </Button>
          </div>
        </Card>
      )}

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-foreground">
            Friend Requests ({pendingRequests.length})
          </h3>
          <div className="space-y-2">
            {pendingRequests.map((request) => (
              <Card key={request.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${request.friendId}`}
                    />
                    <AvatarFallback>
                      {request.friendName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">
                      {request.friendName}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      Pending
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  {onAcceptRequest && (
                    <Button
                      size="icon"
                      variant="default"
                      onClick={() => onAcceptRequest(request.friendId)}
                      data-testid={`button-accept-${request.friendId}`}
                    >
                      <Check className="w-4 h-4" />
                    </Button>
                  )}
                  {onRejectRequest && (
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => onRejectRequest(request.friendId)}
                      data-testid={`button-reject-${request.friendId}`}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Outgoing Requests */}
      {outgoingRequests.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-foreground">
            Outgoing Requests ({outgoingRequests.length})
          </h3>
          <div className="space-y-2">
            {outgoingRequests.map((request) => (
              <Card key={request.id} className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${request.playerId}`}
                    />
                    <AvatarFallback>
                      {request.playerId.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">
                      {request.playerId}
                    </p>
                    <Badge variant="outline" className="text-xs">
                      Sent
                    </Badge>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Friends List */}
      <div>
        <h3 className="text-lg font-semibold mb-3 text-foreground">
          Friends ({friends.length})
        </h3>
        {friends.length === 0 && pendingRequests.length === 0 && outgoingRequests.length === 0 ? (
          <Card className="p-8 text-center">
            <UserPlus className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
            <p className="text-muted-foreground">No friends yet. Start adding!</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {friends.map((friend) => (
              <Card
                key={friend.id}
                className="p-4 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="w-10 h-10">
                    <AvatarImage
                      src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.friendId}`}
                    />
                    <AvatarFallback>
                      {friend.friendName.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold text-foreground">
                      {friend.friendName}
                    </p>
                    <Badge variant="secondary" className="text-xs">
                      Friends
                    </Badge>
                  </div>
                </div>
                {onRemoveFriend && (
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => onRemoveFriend(friend.friendId)}
                    data-testid={`button-remove-${friend.friendId}`}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
