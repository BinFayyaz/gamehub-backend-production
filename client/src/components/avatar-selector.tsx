import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { AvatarStyle } from "@shared/schema";

const AVATAR_STYLES: AvatarStyle[] = [
  "avataaars",
  "avataaars-neutral",
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

interface AvatarSelectorProps {
  currentStyle?: AvatarStyle;
  seed: string;
  onSelect: (style: AvatarStyle) => void | Promise<void>;
  onSave?: () => void;
  isSaving?: boolean;
}

export function AvatarSelector({
  currentStyle = "avataaars",
  seed,
  onSelect,
  onSave,
  isSaving = false,
}: AvatarSelectorProps) {
  const [selectedStyle, setSelectedStyle] = useState<AvatarStyle>(currentStyle);
  const [isLocalSaving, setIsLocalSaving] = useState(false);

  useEffect(() => {
    setSelectedStyle(currentStyle);
  }, [currentStyle]);

  const handleSelect = (style: AvatarStyle) => {
    setSelectedStyle(style);
  };

  const handleSave = async () => {
    setIsLocalSaving(true);
    try {
      await Promise.resolve(onSelect(selectedStyle));
      if (onSave) {
        onSave();
      }
    } finally {
      setIsLocalSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4 text-foreground">
        Choose Your Avatar Style
      </h3>
      <div className="mb-6">
        <Avatar className="w-24 h-24">
          <AvatarImage
            src={`https://api.dicebear.com/7.x/${selectedStyle}/svg?seed=${seed}`}
          />
          <AvatarFallback>Avatar</AvatarFallback>
        </Avatar>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-4 gap-2 mb-4">
        {AVATAR_STYLES.map((style) => (
          <Button
            key={style}
            variant={selectedStyle === style ? "default" : "outline"}
            size="sm"
            onClick={() => handleSelect(style)}
            className="text-xs truncate"
            data-testid={`button-avatar-${style}`}
          >
            {style}
          </Button>
        ))}
      </div>
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={isSaving || isLocalSaving || selectedStyle === currentStyle}
          className="flex-1"
          data-testid="button-save-avatar"
        >
          {isSaving || isLocalSaving ? "Saving..." : "Save Avatar"}
        </Button>
      </div>
    </Card>
  );
}
