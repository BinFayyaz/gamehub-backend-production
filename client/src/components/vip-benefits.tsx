import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Crown,
  Music,
  MessageCircle,
  Upload,
  Image,
  BookOpen,
  Sparkles,
  Check,
  X,
} from "lucide-react";

interface VipBenefitsProps {
  playerId?: string;
  isVip: boolean;
  compact?: boolean;
}

const VIP_BENEFITS = [
  {
    icon: Music,
    title: "Upload Music",
    description: "Upload your own songs and create playlists to share with everyone",
  },
  {
    icon: MessageCircle,
    title: "Direct Messaging",
    description: "Send private messages to other VIPs and admins",
  },
  {
    icon: Image,
    title: "Media Gallery Access",
    description: "Upload screenshots and images to the media gallery",
  },
  {
    icon: BookOpen,
    title: "Tutorial Creation",
    description: "Create and share tutorials to help other players",
  },
  {
    icon: Sparkles,
    title: "VIP Badge",
    description: "Show off your exclusive VIP status with a special badge",
  },
  {
    icon: Crown,
    title: "Priority Support",
    description: "Get faster responses to your support requests",
  },
];

export function VipBenefits({ playerId, isVip, compact }: VipBenefitsProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasSeenBenefits, setHasSeenBenefits] = useState(true);

  useEffect(() => {
    if (playerId) {
      const key = `vip_benefits_seen_${playerId}`;
      const seen = localStorage.getItem(key);
      if (!seen && !isVip) {
        setHasSeenBenefits(false);
      }
    }
  }, [playerId, isVip]);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open && playerId) {
      // Mark as seen when closing
      const key = `vip_benefits_seen_${playerId}`;
      localStorage.setItem(key, "true");
      setHasSeenBenefits(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant={isVip ? "default" : "outline"}
          size={compact ? "sm" : "default"}
          className={`gap-2 ${isVip ? "bg-amber-500 hover:bg-amber-600 text-white" : ""} ${!hasSeenBenefits ? "animate-pulse" : ""}`}
          data-testid="button-vip-benefits"
        >
          <Crown className="w-4 h-4" />
          {!compact && (isVip ? "VIP Status" : "VIP Benefits")}
          {!hasSeenBenefits && !isVip && (
            <Badge variant="destructive" className="ml-1 text-xs px-1">NEW</Badge>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Crown className="w-6 h-6 text-amber-500" />
            {isVip ? "Your VIP Benefits" : "Become a VIP"}
          </DialogTitle>
          <DialogDescription>
            {isVip 
              ? "Thank you for being a VIP! Here are all your exclusive benefits:"
              : "Unlock exclusive features and enhance your gaming experience!"
            }
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-4 py-4">
            {VIP_BENEFITS.map((benefit, index) => {
              const IconComponent = benefit.icon;
              return (
                <div
                  key={index}
                  className="flex items-start gap-4 p-3 rounded-lg bg-muted/50"
                  data-testid={`vip-benefit-${index}`}
                >
                  <div className={`p-2 rounded-md ${isVip ? "bg-amber-500/20 text-amber-500" : "bg-primary/20 text-primary"}`}>
                    <IconComponent className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{benefit.title}</h4>
                      {isVip && <Check className="w-4 h-4 text-green-500" />}
                    </div>
                    <p className="text-sm text-muted-foreground">{benefit.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>

        <div className="pt-4 border-t">
          {isVip ? (
            <div className="flex items-center justify-center gap-2 text-amber-500">
              <Crown className="w-5 h-5" />
              <span className="font-medium">You have full VIP access!</span>
            </div>
          ) : (
            <div className="text-center space-y-3">
              <p className="text-sm text-muted-foreground">
                Contact an admin to become a VIP and unlock all these features!
              </p>
              <Button onClick={() => handleOpenChange(false)} className="w-full">
                <Sparkles className="w-4 h-4 mr-2" />
                Got it!
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
