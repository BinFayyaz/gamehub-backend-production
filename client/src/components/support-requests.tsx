import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MessageSquarePlus, Bug, Lightbulb, ThumbsUp, CheckCircle, Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { SupportRequest } from "@shared/schema";

interface SupportRequestsProps {
  currentPlayerId: string;
  currentPlayerName: string;
  isAdmin: boolean;
}

export function SupportRequests({ currentPlayerId, currentPlayerName, isAdmin }: SupportRequestsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<"bug" | "feature">("bug");
  const { toast } = useToast();

  const { data, isLoading, refetch } = useQuery<{ requests: SupportRequest[] }>({
    queryKey: ["/api/support-requests"],
    enabled: isOpen,
  });

  const requests = data?.requests || [];

  const createMutation = useMutation({
    mutationFn: async (data: { type: string; title: string; description: string; submitterId: string; submitterName: string }) => {
      return apiRequest("POST", "/api/support-requests", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support-requests"] });
      toast({ title: "Request submitted!" });
      setTitle("");
      setDescription("");
    },
    onError: () => {
      toast({ title: "Failed to submit request", variant: "destructive" });
    },
  });

  const likeMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiRequest("POST", `/api/support-requests/${requestId}/like`, { playerId: currentPlayerId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support-requests"] });
    },
  });

  const doneMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiRequest("POST", `/api/support-requests/${requestId}/done`, { username: currentPlayerName });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support-requests"] });
      toast({ title: "Status updated!" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (requestId: string) => {
      return apiRequest("DELETE", `/api/support-requests/${requestId}?username=${encodeURIComponent(currentPlayerName)}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/support-requests"] });
      toast({ title: "Request deleted!" });
    },
  });

  const handleSubmit = () => {
    if (!title.trim() || !description.trim()) {
      toast({ title: "Please fill in all fields", variant: "destructive" });
      return;
    }
    createMutation.mutate({
      type,
      title: title.trim(),
      description: description.trim(),
      submitterId: currentPlayerId,
      submitterName: currentPlayerName,
    });
  };

  const bugRequests = requests.filter(r => r.type === "bug");
  const featureRequests = requests.filter(r => r.type === "feature");

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2"
          data-testid="button-support-requests"
        >
          <MessageSquarePlus className="w-4 h-4" />
          <span>Support Requests</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Support Requests</DialogTitle>
        </DialogHeader>
        
        <div className="border rounded-lg p-4 space-y-3 bg-card">
          <h3 className="font-medium text-sm">Submit New Request</h3>
          <div className="flex gap-2">
            <Select value={type} onValueChange={(v) => setType(v as "bug" | "feature")}>
              <SelectTrigger className="w-36" data-testid="select-request-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bug">
                  <div className="flex items-center gap-2">
                    <Bug className="w-4 h-4 text-destructive" />
                    Bug Report
                  </div>
                </SelectItem>
                <SelectItem value="feature">
                  <div className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4 text-warning" />
                    Feature Request
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="Title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1"
              data-testid="input-request-title"
            />
          </div>
          <Textarea
            placeholder="Description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="min-h-[60px]"
            data-testid="input-request-description"
          />
          <Button 
            onClick={handleSubmit} 
            disabled={createMutation.isPending}
            className="w-full"
            data-testid="button-submit-request"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Submit Request
          </Button>
        </div>

        <Tabs defaultValue="bugs" className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="bugs" data-testid="tab-bugs">
              <Bug className="w-4 h-4 mr-2" />
              Bugs ({bugRequests.length})
            </TabsTrigger>
            <TabsTrigger value="features" data-testid="tab-features">
              <Lightbulb className="w-4 h-4 mr-2" />
              Features ({featureRequests.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="bugs" className="flex-1 overflow-hidden mt-2">
            <ScrollArea className="h-[250px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : bugRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No bug reports yet</p>
              ) : (
                <div className="space-y-2 pr-4">
                  {bugRequests.map(req => (
                    <RequestItem
                      key={req.id}
                      request={req}
                      currentPlayerId={currentPlayerId}
                      isAdmin={isAdmin}
                      onLike={() => likeMutation.mutate(req.id)}
                      onDone={() => doneMutation.mutate(req.id)}
                      onDelete={() => deleteMutation.mutate(req.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
          
          <TabsContent value="features" className="flex-1 overflow-hidden mt-2">
            <ScrollArea className="h-[250px]">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin" />
                </div>
              ) : featureRequests.length === 0 ? (
                <p className="text-center text-muted-foreground py-8 text-sm">No feature requests yet</p>
              ) : (
                <div className="space-y-2 pr-4">
                  {featureRequests.map(req => (
                    <RequestItem
                      key={req.id}
                      request={req}
                      currentPlayerId={currentPlayerId}
                      isAdmin={isAdmin}
                      onLike={() => likeMutation.mutate(req.id)}
                      onDone={() => doneMutation.mutate(req.id)}
                      onDelete={() => deleteMutation.mutate(req.id)}
                    />
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface RequestItemProps {
  request: SupportRequest;
  currentPlayerId: string;
  isAdmin: boolean;
  onLike: () => void;
  onDone: () => void;
  onDelete: () => void;
}

function RequestItem({ request, currentPlayerId, isAdmin, onLike, onDone, onDelete }: RequestItemProps) {
  const hasLiked = request.likes.includes(currentPlayerId);
  const date = new Date(request.timestamp).toLocaleDateString();

  return (
    <div 
      className={`border rounded-lg p-3 space-y-2 ${request.isDone ? 'bg-muted/50 opacity-70' : 'bg-card'}`}
      data-testid={`request-item-${request.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className={`font-medium text-sm ${request.isDone ? 'line-through' : ''}`}>{request.title}</h4>
            {request.isDone && (
              <Badge variant="secondary" className="text-xs">
                <CheckCircle className="w-3 h-3 mr-1" />
                Done
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            by {request.submitterName} • {date}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant={hasLiked ? "default" : "outline"}
            className="h-7 px-2"
            onClick={onLike}
            data-testid={`button-like-${request.id}`}
          >
            <ThumbsUp className="w-3 h-3 mr-1" />
            {request.likes.length}
          </Button>
          {isAdmin && (
            <>
              <Button
                size="icon"
                variant={request.isDone ? "secondary" : "outline"}
                className="h-7 w-7"
                onClick={onDone}
                data-testid={`button-done-${request.id}`}
              >
                <CheckCircle className="w-3 h-3" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive"
                onClick={onDelete}
                data-testid={`button-delete-${request.id}`}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </>
          )}
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{request.description}</p>
    </div>
  );
}
