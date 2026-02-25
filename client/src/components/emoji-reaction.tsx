import { useEffect, useState } from "react";

interface EmojiReactionProps {
  emoji: string;
  senderName?: string;
  onComplete: () => void;
}

function FlyingEmoji({ emoji, delay, onComplete }: { emoji: string; delay: number; onComplete: () => void }) {
  const [style, setStyle] = useState({
    left: `${Math.random() * 80 + 10}%`,
    opacity: 0,
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setStyle({
        left: `${Math.random() * 80 + 10}%`,
        opacity: 1,
      });
    }, delay);

    const completeTimer = setTimeout(() => {
      onComplete();
    }, 2000 + delay);

    return () => {
      clearTimeout(timer);
      clearTimeout(completeTimer);
    };
  }, [delay, onComplete]);

  return (
    <div
      className="absolute bottom-0 text-4xl pointer-events-none animate-fly-up"
      style={{
        left: style.left,
        opacity: style.opacity,
        animation: `fly-up 2s ease-out forwards`,
        animationDelay: `${delay}ms`,
      }}
    >
      {emoji}
    </div>
  );
}

export function EmojiReaction({ emoji, senderName, onComplete }: EmojiReactionProps) {
  const [clones, setClones] = useState<number[]>([]);
  const [showBanner, setShowBanner] = useState(!!senderName);

  useEffect(() => {
    const count = Math.floor(Math.random() * 4) + 5;
    setClones(Array.from({ length: count }, (_, i) => i));
    
    if (senderName) {
      const bannerTimer = setTimeout(() => {
        setShowBanner(false);
      }, 2500);
      return () => clearTimeout(bannerTimer);
    }
  }, [emoji, senderName]);

  const handleCloneComplete = (index: number) => {
    setClones(prev => prev.filter(i => i !== index));
  };

  useEffect(() => {
    if (clones.length === 0 && !showBanner) {
      onComplete();
    }
  }, [clones, showBanner, onComplete]);

  return (
    <>
      {showBanner && senderName && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-background/90 backdrop-blur-sm px-3 py-1 rounded-full border border-border/50 text-sm font-medium animate-slide-down">
          <span className="text-primary">{senderName}</span> reacted {emoji}
        </div>
      )}
      {clones.map(index => (
        <FlyingEmoji
          key={index}
          emoji={emoji}
          delay={index * 100}
          onComplete={() => handleCloneComplete(index)}
        />
      ))}
    </>
  );
}
