import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useWebSocket } from "@/lib/websocket";
import { GameCard } from "@/components/game-card";
import { OnlinePlayers } from "@/components/online-players";
import { ChatContainer } from "@/components/chat-container";
import { DmPanel } from "@/components/dm-panel";
import { ChallengeNotifications } from "@/components/challenge-notification";
import { OpponentLeftNotification } from "@/components/opponent-left-notification";
import { ChatNotification } from "@/components/chat-notification";
import { DmNotification } from "@/components/dm-notification";
import { PlayerSelectDialog } from "@/components/player-select-dialog";
import { SpectateDialog } from "@/components/spectate-dialog";
import { GameLogs } from "@/components/game-logs";
import { TicTacToe } from "@/components/games/tic-tac-toe";
import { RockPaperScissors } from "@/components/games/rock-paper-scissors";
import { RiddleLobby, RiddleGame } from "@/components/games/riddles";
import { WordScramble } from "@/components/games/word-scramble";
import { NumberGuess } from "@/components/games/number-guess";
import { QuickMath } from "@/components/games/quick-math";
import { ConnectFour } from "@/components/games/connect-four";
import { MemoryMatch } from "@/components/games/memory-match";
import { TypingRace } from "@/components/games/typing-race";
import { Werewolf } from "@/components/games/werewolf";
import { SpyHunt } from "@/components/games/spy-hunt";
import { WarzoneArena } from "@/components/games/warzone-arena";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  PointOnPointLobby,
  PointOnPointGame,
} from "@/components/games/point-on-point";
import {
  OutpostRushLobby,
  OutpostRushGame,
} from "@/components/games/outpost-rush";
import { EmojiChain } from "@/components/games/emoji-chain";
import { WordAssociation } from "@/components/games/word-association";
import { Hangman } from "@/components/games/hangman";
import { TriviaQuiz } from "@/components/games/trivia-quiz";
import { SquidGameLobby, SquidGame } from "@/components/games/squid-game";
import { HideSeekLobby, HideSeekGame } from "@/components/games/hide-seek";
import {
  TruthOrBluffLobby,
  TruthOrBluffGame,
} from "@/components/games/truth-or-bluff";
import {
  SpotTheLiarLobby,
  SpotTheLiarGame,
} from "@/components/games/spot-the-liar";
import {
  EscapeShipLobby,
  EscapeShipGame,
} from "@/components/games/escape-ship";
import {
  ReactionRaceLobby,
  ReactionRaceGame,
} from "@/components/games/reaction-race";
import {
  ColorClashLobby,
  ColorClashGame,
} from "@/components/games/color-clash";
import {
  CastlesSiegeLobby,
  CastlesSiegeGame,
} from "@/components/games/castles-siege";
import { ShipsBattle } from "@/components/games/ships-battle";
import { BattleshipLobby, BattleshipGame } from "@/components/games/battleship";
import { CTFLobby, CTFGameComponent } from "@/components/games/capture-flag";
import { SiegeWarLobby, SiegeWarGameComponent } from "@/components/games/siege-war";
import { TankBattle } from "@/components/games/tank-battle";
import { TowerDefense } from "@/components/games/tower-defense";
import { ZombieSurvival } from "@/components/games/zombie-survival";
import { TreasureHunt } from "@/components/games/treasure-hunt";
import { DodgeArena } from "@/components/games/dodge-arena";
import { CaptureZone } from "@/components/games/capture-zone";
import { SkyFortress } from "@/components/games/sky-fortress";
import { TimeRift } from "@/components/games/time-rift";
import { ShadowOps } from "@/components/games/shadow-ops";
import { ElementalConquest } from "@/components/games/elemental-conquest";
import { MechArena } from "@/components/games/mech-arena";
import { VipBenefits } from "@/components/vip-benefits";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Input } from "@/components/ui/input";
import {
  Gamepad2,
  Users,
  MessageCircle,
  Grid3X3,
  Hand,
  Lightbulb,
  Menu,
  Wifi,
  WifiOff,
  Shuffle,
  Calculator,
  Hash,
  Eye,
  Circle,
  Grid2X2,
  Keyboard,
  Moon,
  Search,
  Target,
  MessageCircle as MessageCircleIcon,
  Castle,
  Smile,
  Link2,
  Pencil,
  HelpCircle,
  Skull,
  BookOpen,
  Rocket,
  Zap,
  Palette,
  Castle as CastleIcon,
  Ship,
  Gem,
  Flag,
  Users as UsersIcon,
  Anchor,
  Swords,
  Search as SearchIcon,
} from "lucide-react";

type GameType =
  | "tictactoe"
  | "rps"
  | "wordscramble"
  | "numberguess"
  | "quickmath"
  | "connectfour";

type GameCategory = "all" | "1v1" | "lobbybparty" | "singleplayer" | "viplobby";

const gameTitles: Record<GameType, string> = {
  tictactoe: "Tic Tac Toe",
  rps: "Rock Paper Scissors",
  wordscramble: "Word Scramble",
  numberguess: "Number Guess",
  quickmath: "Quick Math",
  connectfour: "Connect Four",
};

const GAME_CATEGORIES: Record<string, GameCategory> = {
  // 1v1 Games
  "Tic Tac Toe": "1v1",
  "Rock Paper Scissors": "1v1",
  "Word Scramble": "1v1",
  "Number Guess": "1v1",
  "Quick Math": "1v1",
  "Connect Four": "1v1",
  "Ships Battle": "1v1",
  "Battleship": "1v1",
  // Lobby/Party Games
  "Riddles": "lobbybparty",
  "Memory Match": "lobbybparty",
  "Typing Race": "lobbybparty",
  "Werewolf": "lobbybparty",
  "Spy Hunt": "lobbybparty",
  "Point on Point": "lobbybparty",
  "Outpost Rush": "lobbybparty",
  "Emoji Chain": "lobbybparty",
  "Word Association": "lobbybparty",
  "Hangman": "lobbybparty",
  "Trivia Quiz": "lobbybparty",
  "Squid Game": "lobbybparty",
  "Truth or Bluff": "lobbybparty",
  "Spot the Liar": "lobbybparty",
  "Escape from Ship": "lobbybparty",
  "Reaction Race": "lobbybparty",
  "Color Clash": "lobbybparty",
  "Castles: Siege Dominion": "lobbybparty",
  "Capture the Flag": "lobbybparty",
  "Siege War": "lobbybparty",
  "Hide and Seek 3D": "lobbybparty",
  // Single Player Games
  "Warzone Arena": "singleplayer",
  "Tank Battle": "singleplayer",
  "Tower Defense": "singleplayer",
  "Zombie Survival": "singleplayer",
  "Treasure Hunt": "singleplayer",
  "Dodge Arena": "singleplayer",
  "Capture Zone": "singleplayer",
  "Sky Fortress Siege": "singleplayer",
  "Time Rift Tactics": "singleplayer",
  "Shadow Ops": "singleplayer",
  "Elemental Conquest": "singleplayer",
  "Mech Arena": "singleplayer",
};

export default function Home() {
  const {
    currentPlayerName,
    players,
    isConnected,
    tttGame,
    rpsGame,
    riddleLobby,
    riddleGame,
    wsGame,
    ngGame,
    qmGame,
    c4Game,
    memoryLobby,
    memoryGame,
    typingLobby,
    typingGame,
    werewolfLobby,
    werewolfGame,
    spyHuntLobby,
    spyHuntGame,
    fpsGame,
    pointOnPointLobby,
    pointOnPointGame,
    outpostRushLobby,
    outpostRushGame,
    emojiChainLobby,
    emojiChainGame,
    wordAssociationLobby,
    wordAssociationGame,
    hangmanLobby,
    hangmanGame,
    triviaQuizLobby,
    triviaQuizGame,
    squidGameLobby,
    squidGame,
    truthOrBluffLobby,
    truthOrBluffGame,
    spotTheLiarLobby,
    spotTheLiarGame,
    escapeShipLobby,
    escapeShipGame,

    lobbyCounts,
    joinRiddleLobby,
    joinMemoryLobby,
    joinTypingLobby,
    joinWerewolfLobby,
    joinSpyHuntLobby,
    joinPointOnPointLobby,
    joinOutpostRushLobby,
    joinEmojiChainLobby,
    joinWordAssociationLobby,
    joinHangmanLobby,
    joinTriviaQuizLobby,
    joinSquidGameLobby,
    joinTruthOrBluffLobby,
    joinSpotTheLiarLobby,
    joinEscapeShipLobby,
    reactionRaceLobby,
    reactionRaceGame,
    joinReactionRaceLobby,
    colorClashLobby,
    colorClashGame,
    joinColorClashLobby,
    castlesLobby,
    castlesGame,
    joinCastlesLobby,

    // Ships Battle Logic
    shipsBattleLobby,
    shipsBattleGame,
    joinShipsBattleLobby,

    // Battleship Logic
    battleshipLobby,
    battleshipGame,
    joinBattleshipLobby,

    // CTF Logic
    ctfLobby,
    ctfGame,
    joinCTFLobby,

    // Siege War Logic
    siegeWarLobby,
    siegeWarGame,
    joinSiegeWarLobby,

    // Hide and Seek Logic
    hideSeekLobby,
    hideSeekGame,
    joinHideSeekLobby,

    currentPlayerId,
    isVip,
    isAdmin,
  } = useWebSocket();
  const [, navigate] = useLocation();
  const [isChatOpen, setIsChatOpen] = useState(true);
  const [isChatMinimized, setIsChatMinimized] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [playerSelectOpen, setPlayerSelectOpen] = useState(false);
  const [selectedGameType, setSelectedGameType] =
    useState<GameType>("tictactoe");
  const [spectateDialogOpen, setSpectateDialogOpen] = useState(false);
  const [showWarzoneArena, setShowWarzoneArena] = useState(false);
  const [showTankBattle, setShowTankBattle] = useState(false);
  const [showTowerDefense, setShowTowerDefense] = useState(false);
  const [showZombieSurvival, setShowZombieSurvival] = useState(false);
  const [showTreasureHunt, setShowTreasureHunt] = useState(false);
  const [showDodgeArena, setShowDodgeArena] = useState(false);
  const [showCaptureZone, setShowCaptureZone] = useState(false);
  const [showSkyFortress, setShowSkyFortress] = useState(false);
  const [showTimeRift, setShowTimeRift] = useState(false);
  const [showShadowOps, setShowShadowOps] = useState(false);
  const [showElementalConquest, setShowElementalConquest] = useState(false);
  const [showMechArena, setShowMechArena] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<GameCategory>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showVipLobby, setShowVipLobby] = useState(false);

  useEffect(() => {
    if (!currentPlayerName && !currentPlayerId) {
      navigate("/");
    }
  }, [currentPlayerName, currentPlayerId, navigate]);

  const otherPlayers = players.filter((p) => p.id !== currentPlayerId);
  const availablePlayers = otherPlayers.filter((p) => p.status === "online");
  const onlineCount = otherPlayers.length;

  // Check if any game is currently active to hide the header
  const isInGame = !!(
    tttGame ||
    rpsGame ||
    riddleLobby ||
    riddleGame ||
    wsGame ||
    ngGame ||
    qmGame ||
    c4Game ||
    memoryLobby ||
    memoryGame ||
    typingLobby ||
    typingGame ||
    werewolfLobby ||
    werewolfGame ||
    spyHuntLobby ||
    spyHuntGame ||
    fpsGame ||
    pointOnPointLobby ||
    pointOnPointGame ||
    outpostRushLobby ||
    outpostRushGame ||
    emojiChainLobby ||
    emojiChainGame ||
    wordAssociationLobby ||
    wordAssociationGame ||
    hangmanLobby ||
    hangmanGame ||
    triviaQuizLobby ||
    triviaQuizGame ||
    squidGameLobby ||
    squidGame ||
    truthOrBluffLobby ||
    truthOrBluffGame ||
    spotTheLiarLobby ||
    spotTheLiarGame ||
    escapeShipLobby ||
    escapeShipGame ||
    reactionRaceLobby ||
    reactionRaceGame ||
    colorClashLobby ||
    colorClashGame ||
    castlesLobby ||
    castlesGame ||
    shipsBattleLobby ||
    shipsBattleGame ||
    battleshipLobby ||
    battleshipGame ||
    ctfLobby ||
    ctfGame ||
    siegeWarLobby ||
    siegeWarGame ||
    hideSeekLobby ||
    hideSeekGame ||
    showTankBattle ||
    showTowerDefense ||
    showZombieSurvival ||
    showTreasureHunt ||
    showDodgeArena ||
    showCaptureZone ||
    showSkyFortress ||
    showTimeRift ||
    showShadowOps ||
    showElementalConquest ||
    showMechArena
  );

  const openPlayerSelect = (gameType: GameType) => {
    setSelectedGameType(gameType);
    setPlayerSelectOpen(true);
  };

  const handlePlayTicTacToe = () => openPlayerSelect("tictactoe");
  const handlePlayRPS = () => openPlayerSelect("rps");
  const handlePlayWordScramble = () => openPlayerSelect("wordscramble");
  const handlePlayNumberGuess = () => openPlayerSelect("numberguess");
  const handlePlayQuickMath = () => openPlayerSelect("quickmath");
  const handlePlayConnectFour = () => openPlayerSelect("connectfour");
  const handlePlayRiddles = () => joinRiddleLobby();
  const handlePlayMemoryMatch = () => joinMemoryLobby();
  const handlePlayTypingRace = () => joinTypingLobby();
  const handlePlayWerewolf = () => joinWerewolfLobby();
  const handlePlaySpyHunt = () => joinSpyHuntLobby();
  const handlePlayWarzoneArena = () => setShowWarzoneArena(true);
  const handlePlayPointOnPoint = () => joinPointOnPointLobby();
  const handlePlayOutpostRush = () => joinOutpostRushLobby();
  const handlePlayEmojiChain = () => joinEmojiChainLobby();
  const handlePlayWordAssociation = () => joinWordAssociationLobby();
  const handlePlayHangman = () => joinHangmanLobby();
  const handlePlayTriviaQuiz = () => joinTriviaQuizLobby();
  const handlePlaySquidGame = () => joinSquidGameLobby();
  const handlePlayTruthOrBluff = () => joinTruthOrBluffLobby();
  const handlePlaySpotTheLiar = () => joinSpotTheLiarLobby();
  const handlePlayEscapeShip = () => joinEscapeShipLobby();
  const handlePlayReactionRace = () => joinReactionRaceLobby();
  const handlePlayColorClash = () => joinColorClashLobby();
  const handlePlayCastles = () => joinCastlesLobby();
  const handlePlayShipsBattle = () => joinShipsBattleLobby();
  const handlePlayBattleship = () => joinBattleshipLobby();
  const handlePlayCTF = () => joinCTFLobby();
  const handlePlaySiegeWar = () => joinSiegeWarLobby();
  const handlePlayTankBattle = () => setShowTankBattle(true);
  const handlePlayTowerDefense = () => setShowTowerDefense(true);
  const handlePlayZombieSurvival = () => setShowZombieSurvival(true);
  const handlePlayTreasureHunt = () => setShowTreasureHunt(true);
  const handlePlayDodgeArena = () => setShowDodgeArena(true);
  const handlePlayCaptureZone = () => setShowCaptureZone(true);
  const handlePlayHideSeek = () => joinHideSeekLobby();
  const handlePlayVipRiddles = () => joinRiddleLobby(true);
  const handlePlayVipWerewolf = () => joinWerewolfLobby(true);
  const handlePlayVipEscapeShip = () => joinEscapeShipLobby(true);
  const handlePlayVipSquidGame = () => joinSquidGameLobby(true);
  const handlePlayVipCastles = () => joinCastlesLobby(true);
  const handlePlayVipHideSeek = () => joinHideSeekLobby(true);
  const handlePlaySkyFortress = () => setShowSkyFortress(true);
  const handlePlayTimeRift = () => setShowTimeRift(true);
  const handlePlayShadowOps = () => setShowShadowOps(true);
  const handlePlayElementalConquest = () => setShowElementalConquest(true);
  const handlePlayMechArena = () => setShowMechArena(true);

  const popLobbyCount = lobbyCounts?.find(
    (c: { gameType: string }) => c.gameType === "pointonpoint",
  );
  const outpostRushLobbyCount = lobbyCounts?.find(
    (c: { gameType: string }) => c.gameType === "outpostrush",
  );
  const riddleLobbyCount = lobbyCounts?.find(
    (c: { gameType: string }) => c.gameType === "riddles",
  );
  const memoryLobbyCount = lobbyCounts?.find(
    (c: { gameType: string }) => c.gameType === "memory",
  );
  const typingLobbyCount = lobbyCounts?.find(
    (c: { gameType: string }) => c.gameType === "typing",
  );
  const werewolfLobbyCount = lobbyCounts?.find(
    (c: { gameType: string }) => c.gameType === "werewolf",
  );
  const spyHuntLobbyCount = lobbyCounts?.find(
    (c: { gameType: string }) => c.gameType === "spyhunt",
  );
  const emojiChainLobbyCount = lobbyCounts?.find(
    (c: { gameType: string }) => c.gameType === "emojichain",
  );
  const wordAssociationLobbyCount = lobbyCounts?.find(
    (c: { gameType: string }) => c.gameType === "wordassociation",
  );
  const hangmanLobbyCount = lobbyCounts?.find(
    (c: { gameType: string }) => c.gameType === "hangman",
  );
  const triviaQuizLobbyCount = lobbyCounts?.find(
    (c: { gameType: string }) => c.gameType === "triviaquiz",
  );
  const squidGameLobbyCount = lobbyCounts?.find(
    (c: { gameType: string }) => c.gameType === "squidgame",
  );
  const truthOrBluffLobbyCount = lobbyCounts?.find(
    (c: { gameType: string }) => c.gameType === "truthorbluff",
  );
  const spotTheLiarLobbyCount = lobbyCounts?.find(
    (c: { gameType: string }) => c.gameType === "spottheliar",
  );
  const escapeShipLobbyCount = lobbyCounts?.find(
    (c: { gameType: string }) => c.gameType === "escapeship",
  );
  const reactionRaceLobbyCount = lobbyCounts?.find(
    (c: { gameType: string }) => c.gameType === "reactionrace",
  );
  const colorClashLobbyCount = lobbyCounts?.find(
    (c: { gameType: string }) => c.gameType === "colorclash",
  );
  const shipsBattleLobbyCount = lobbyCounts?.find(
    (c: { gameType: string }) => c.gameType === "shipsbattle",
  );
  const hideSeekLobbyCount = lobbyCounts?.find(
    (c: { gameType: string }) => c.gameType === "hideseek",
  );

  const matchesSearch = (title: string) => {
    if (!searchQuery) return true;
    return title.toLowerCase().includes(searchQuery.toLowerCase());
  };

  return (
    <div className="min-h-screen bg-background flex">
      <div className="hidden lg:block w-72 border-r border-sidebar-border">
        <OnlinePlayers />
      </div>

      <div className="flex-1 flex flex-col min-h-screen">
        {!isInGame && (
          <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between gap-4 px-4 py-3">
              <div className="flex items-center gap-3">
                <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
                  <SheetTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="lg:hidden"
                      data-testid="button-open-sidebar"
                    >
                      <Menu className="w-5 h-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="w-80 p-0">
                    <VisuallyHidden>
                      <SheetTitle>Online Players</SheetTitle>
                      <SheetDescription>
                        View and challenge online players
                      </SheetDescription>
                    </VisuallyHidden>
                    <OnlinePlayers
                      onClose={() => setIsSidebarOpen(false)}
                      isMobile
                    />
                  </SheetContent>
                </Sheet>

                <div className="flex items-center gap-2">
                  <Gamepad2 className="w-6 h-6 text-primary" />
                  <h1 className="text-xl font-bold text-foreground">
                    Game<span className="text-primary">Hub</span>
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="relative hidden md:block w-64">
                  <SearchIcon className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="search"
                    placeholder="Search games..."
                    className="pl-8 h-9"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    data-testid="input-game-search"
                  />
                </div>

                <VipBenefits playerId={currentPlayerId} isVip={isVip} compact />

                <GameLogs />

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate("/profile")}
                  className="hidden sm:flex gap-2 items-center"
                  data-testid="button-profile"
                >
                  <BookOpen className="w-4 h-4" />
                  Profile
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSpectateDialogOpen(true)}
                  className="hidden sm:flex gap-2 items-center"
                  data-testid="button-watch-games"
                >
                  <Eye className="w-4 h-4" />
                  Watch Live
                </Button>

                <Badge
                  variant="outline"
                  className="hidden sm:flex gap-2 items-center"
                >
                  <Users className="w-3 h-3" />
                  <span>{onlineCount} online</span>
                </Badge>

                <div className="flex items-center gap-2">
                  {isConnected ? (
                    <Badge variant="secondary" className="gap-1.5">
                      <Wifi className="w-3 h-3 text-success" />
                      <span className="hidden sm:inline">
                        {currentPlayerName}
                      </span>
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1.5">
                      <WifiOff className="w-3 h-3" />
                      <span className="hidden sm:inline">Disconnected</span>
                    </Badge>
                  )}
                </div>

                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  onClick={() => setIsChatOpen(!isChatOpen)}
                  data-testid="button-toggle-chat-mobile"
                >
                  <MessageCircle className="w-5 h-5" />
                </Button>
              </div>
            </div>
          </header>
        )}

        <main className="flex-1 p-4 md:p-6 lg:p-8">
          <div className="max-w-5xl mx-auto space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                Choose Your Game
              </h2>
              <p className="text-muted-foreground">
                Challenge friends or join a lobby to start playing
              </p>
            </div>

            <Tabs value={selectedCategory} onValueChange={(val) => setSelectedCategory(val as GameCategory)} className="w-full">
              <TabsList className="grid w-full grid-cols-4 md:grid-cols-5 mb-6">
                <TabsTrigger value="all" data-testid="tab-all">All</TabsTrigger>
                <TabsTrigger value="1v1" data-testid="tab-1v1">1v1</TabsTrigger>
                <TabsTrigger value="lobbybparty" data-testid="tab-lobby">Lobby/Party</TabsTrigger>
                <TabsTrigger value="singleplayer" data-testid="tab-singleplayer">Singleplayer</TabsTrigger>
                {(isVip || isAdmin) && <TabsTrigger value="viplobby" data-testid="tab-viplobby">VIP Lobby</TabsTrigger>}
              </TabsList>

              <TabsContent value="all" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {matchesSearch("Tic Tac Toe") && (
                <GameCard
                  title="Tic Tac Toe"
                  description="Classic 3x3 grid game. Challenge a friend and take turns placing X's and O's. First to get three in a row wins!"
                  icon={Grid3X3}
                  playerCount="2 Players"
                  onPlay={handlePlayTicTacToe}
                  disabled={availablePlayers.length === 0}
                  status={
                    availablePlayers.length > 0
                      ? `${availablePlayers.length} available`
                      : undefined
                  }
                  testId="game-tictactoe"
                />
              )}

              {matchesSearch("Rock Paper Scissors") && (
                <GameCard
                  title="Rock Paper Scissors"
                  description="The timeless hand game! Rock beats scissors, scissors beats paper, paper beats rock. Best of 5 rounds!"
                  icon={Hand}
                  playerCount="2 Players"
                  onPlay={handlePlayRPS}
                  disabled={availablePlayers.length === 0}
                  status={
                    availablePlayers.length > 0
                      ? `${availablePlayers.length} available`
                      : undefined
                  }
                  testId="game-rps"
                />
              )}

              {matchesSearch("Riddles") && (
                <GameCard
                  title="Riddles"
                  description="Test your wit! Join a lobby, answer riddles as fast as you can, and compete for the highest score."
                  icon={Lightbulb}
                  playerCount="2+ Players"
                  onPlay={handlePlayRiddles}
                  lobbyCount={
                    riddleLobbyCount
                      ? {
                          current: riddleLobbyCount.current,
                          max: riddleLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !riddleLobbyCount || riddleLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-riddles"
                />
              )}

              {matchesSearch("Word Scramble") && (
                <GameCard
                  title="Word Scramble"
                  description="Unscramble the letters to find the hidden word! First to 3 wins. Speed matters when both get it right!"
                  icon={Shuffle}
                  playerCount="2 Players"
                  onPlay={handlePlayWordScramble}
                  disabled={availablePlayers.length === 0}
                  status={
                    availablePlayers.length > 0
                      ? `${availablePlayers.length} available`
                      : undefined
                  }
                  testId="game-wordscramble"
                />
              )}

              {matchesSearch("Number Guess") && (
                <GameCard
                  title="Number Guess"
                  description="Race to find the secret number between 1-100! Get hints after each guess. First to guess correctly wins!"
                  icon={Hash}
                  playerCount="2 Players"
                  onPlay={handlePlayNumberGuess}
                  disabled={availablePlayers.length === 0}
                  status={
                    availablePlayers.length > 0
                      ? `${availablePlayers.length} available`
                      : undefined
                  }
                  testId="game-numberguess"
                />
              )}

              {matchesSearch("Quick Math") && (
                <GameCard
                  title="Quick Math"
                  description="Solve math problems faster than your opponent! First to 3 correct answers wins. Speed is everything!"
                  icon={Calculator}
                  playerCount="2 Players"
                  onPlay={handlePlayQuickMath}
                  disabled={availablePlayers.length === 0}
                  status={
                    availablePlayers.length > 0
                      ? `${availablePlayers.length} available`
                      : undefined
                  }
                  testId="game-quickmath"
                />
              )}

              {matchesSearch("Connect Four") && (
                <GameCard
                  title="Connect Four"
                  description="Drop colored discs into the grid! Get four in a row horizontally, vertically, or diagonally to win!"
                  icon={Circle}
                  playerCount="2 Players"
                  onPlay={handlePlayConnectFour}
                  disabled={availablePlayers.length === 0}
                  status={
                    availablePlayers.length > 0
                      ? `${availablePlayers.length} available`
                      : undefined
                  }
                  testId="game-connectfour"
                />
              )}

              {matchesSearch("Trivia Quiz") && (
                <GameCard
                  title="Trivia Quiz"
                  description="Test your general knowledge! Compete against others to answer questions correctly and quickly."
                  icon={HelpCircle}
                  playerCount="2-8 Players"
                  onPlay={handlePlayTriviaQuiz}
                  lobbyCount={
                    triviaQuizLobbyCount
                      ? {
                          current: triviaQuizLobbyCount.current,
                          max: triviaQuizLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !triviaQuizLobbyCount || triviaQuizLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-triviaquiz"
                />
              )}

              {matchesSearch("Hangman") && (
                <GameCard
                  title="Hangman"
                  description="Guess the hidden word letter by letter! Don't run out of wrong guesses. Team up to beat the Word Setter!"
                  icon={Pencil}
                  playerCount="2-8 Players"
                  onPlay={handlePlayHangman}
                  lobbyCount={
                    hangmanLobbyCount
                      ? {
                          current: hangmanLobbyCount.current,
                          max: hangmanLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !hangmanLobbyCount || hangmanLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-hangman"
                />
              )}

              {matchesSearch("Memory Match") && (
                <GameCard
                  title="Memory Match"
                  description="Find matching pairs! Take turns flipping cards and remember where each symbol is located. Most pairs wins!"
                  icon={Grid2X2}
                  playerCount="2-4 Players"
                  onPlay={handlePlayMemoryMatch}
                  lobbyCount={
                    memoryLobbyCount
                      ? {
                          current: memoryLobbyCount.current,
                          max: memoryLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !memoryLobbyCount || memoryLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-memory"
                />
              )}

              {matchesSearch("Typing Race") && (
                <GameCard
                  title="Typing Race"
                  description="Race to type the given text! Be fast and accurate. First to finish wins. Watch your WPM!"
                  icon={Keyboard}
                  playerCount="2-6 Players"
                  onPlay={handlePlayTypingRace}
                  lobbyCount={
                    typingLobbyCount
                      ? {
                          current: typingLobbyCount.current,
                          max: typingLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !typingLobbyCount || typingLobbyCount.current === 0
                      ? "Join Race"
                      : undefined
                  }
                  testId="game-typing"
                />
              )}

              {matchesSearch("Werewolf") && (
                <GameCard
                  title="Werewolf"
                  description="Social deduction game! Villagers hunt werewolves by day, werewolves eliminate villagers by night. Trust no one!"
                  icon={Moon}
                  playerCount="5-20 Players"
                  onPlay={handlePlayWerewolf}
                  lobbyCount={
                    werewolfLobbyCount
                      ? {
                          current: werewolfLobbyCount.current,
                          max: werewolfLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !werewolfLobbyCount || werewolfLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-werewolf"
                />
              )}

              {matchesSearch("Spy Hunt") && (
                <GameCard
                  title="Spy Hunt"
                  description="Find the spy! Everyone knows the location except one person. Ask questions to find who doesn't belong!"
                  icon={Search}
                  playerCount="4-12 Players"
                  onPlay={handlePlaySpyHunt}
                  lobbyCount={
                    spyHuntLobbyCount
                      ? {
                          current: spyHuntLobbyCount.current,
                          max: spyHuntLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !spyHuntLobbyCount || spyHuntLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-spyhunt"
                />
              )}

              {matchesSearch("Warzone Arena") && (
                <GameCard
                  title="Warzone Arena"
                  description="Intense multiplayer battle arena! Drop in, loot weapons, and be the last one standing in epic combat!"
                  icon={Target}
                  playerCount="2-100 Players"
                  onPlay={handlePlayWarzoneArena}
                  status="Play Now"
                  testId="game-warzone"
                />
              )}

              {matchesSearch("Point on Point") && (
                <GameCard
                  title="Point on Point"
                  description="Collaborative storytelling! Take turns adding sentences to build a story together. See where your creativity leads!"
                  icon={MessageCircleIcon}
                  playerCount="2-6 Players"
                  onPlay={handlePlayPointOnPoint}
                  lobbyCount={
                    popLobbyCount
                      ? {
                          current: popLobbyCount.current,
                          max: popLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !popLobbyCount || popLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-pointonpoint"
                />
              )}

              {matchesSearch("Outpost Rush") && (
                <GameCard
                  title="Outpost Rush"
                  description="Team-based battle! Capture outposts, upgrade weapons, and defend your base. Hold 2 outposts for 5 minutes or destroy the enemy base to win!"
                  icon={Castle}
                  playerCount="2-8 Players"
                  onPlay={handlePlayOutpostRush}
                  lobbyCount={
                    outpostRushLobbyCount
                      ? {
                          current: outpostRushLobbyCount.current,
                          max: outpostRushLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !outpostRushLobbyCount || outpostRushLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-outpostrush"
                />
              )}

              {matchesSearch("Emoji Chain") && (
                <GameCard
                  title="Emoji Chain"
                  description="Guess the phrase from emoji clues! Race to decode emoji combinations before time runs out."
                  icon={Smile}
                  playerCount="2-5 Players"
                  onPlay={handlePlayEmojiChain}
                  lobbyCount={
                    emojiChainLobbyCount
                      ? {
                          current: emojiChainLobbyCount.current,
                          max: emojiChainLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !emojiChainLobbyCount || emojiChainLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-emojichain"
                />
              )}

              {matchesSearch("Word Association") && (
                <GameCard
                  title="Word Association"
                  description="Chain related words together! Say a word connected to the previous one. Don't repeat or hesitate!"
                  icon={Link2}
                  playerCount="2-5 Players"
                  onPlay={handlePlayWordAssociation}
                  lobbyCount={
                    wordAssociationLobbyCount
                      ? {
                          current: wordAssociationLobbyCount.current,
                          max: wordAssociationLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !wordAssociationLobbyCount ||
                    wordAssociationLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-wordassociation"
                />
              )}

              {matchesSearch("Squid Game") && (
                <GameCard
                  title="Squid Game"
                  description="Survive 3 deadly mini-games! Red Light Green Light, Cookie Cutter, and Glass Bridge. Only the strongest survive!"
                  icon={Skull}
                  playerCount="5+ Players"
                  onPlay={handlePlaySquidGame}
                  lobbyCount={
                    squidGameLobbyCount
                      ? {
                          current: squidGameLobbyCount.current,
                          max: squidGameLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !squidGameLobbyCount || squidGameLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-squidgame"
                />
              )}

              {matchesSearch("Truth or Bluff") && (
                <GameCard
                  title="Truth or Bluff"
                  description="Tell a story and mark it true or fake. Can others spot the lies? Score points by fooling or detecting!"
                  icon={BookOpen}
                  playerCount="3+ Players"
                  onPlay={handlePlayTruthOrBluff}
                  lobbyCount={
                    truthOrBluffLobbyCount
                      ? {
                          current: truthOrBluffLobbyCount.current,
                          max: truthOrBluffLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !truthOrBluffLobbyCount ||
                    truthOrBluffLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-truthorbluff"
                />
              )}

              {matchesSearch("Spot the Liar") && (
                <GameCard
                  title="Spot the Liar"
                  description="One player has a different word! Describe your word and vote to find the liar. Social deduction at its finest!"
                  icon={Eye}
                  playerCount="3-6 Players"
                  onPlay={handlePlaySpotTheLiar}
                  lobbyCount={
                    spotTheLiarLobbyCount
                      ? {
                          current: spotTheLiarLobbyCount.current,
                          max: spotTheLiarLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !spotTheLiarLobbyCount || spotTheLiarLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-spottheliar"
                />
              )}

              {matchesSearch("Escape from Ship") && (
                <GameCard
                  title="Escape from Ship"
                  description="The ship is sinking! Race through rooms, solve puzzles, collect 3 items (key, fuel, code), and escape to the pod first!"
                  icon={Rocket}
                  playerCount="3-8 Players"
                  onPlay={handlePlayEscapeShip}
                  lobbyCount={
                    escapeShipLobbyCount
                      ? {
                          current: escapeShipLobbyCount.current,
                          max: escapeShipLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !escapeShipLobbyCount || escapeShipLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-escapeship"
                />
              )}

              {matchesSearch("Reaction Race") && (
                <GameCard
                  title="Reaction Race"
                  description="Test your reflexes! Wait for the signal, then tap as fast as you can. Fastest reaction wins!"
                  icon={Zap}
                  playerCount="2-8 Players"
                  onPlay={handlePlayReactionRace}
                  lobbyCount={
                    reactionRaceLobbyCount
                      ? {
                          current: reactionRaceLobbyCount.current,
                          max: reactionRaceLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !reactionRaceLobbyCount ||
                    reactionRaceLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-reactionrace"
                />
              )}

              {matchesSearch("Color Clash") && (
                <GameCard
                  title="Color Clash"
                  description="Memory challenge! Watch the color sequence and repeat it perfectly. Last player standing wins!"
                  icon={Palette}
                  playerCount="2-8 Players"
                  onPlay={handlePlayColorClash}
                  lobbyCount={
                    colorClashLobbyCount
                      ? {
                          current: colorClashLobbyCount.current,
                          max: colorClashLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !colorClashLobbyCount || colorClashLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-colorclash"
                />
              )}

              {matchesSearch("Castles: Siege Dominion") && (
                <GameCard
                  title="Castles: Siege Dominion"
                  description="Real-time strategy! Build your army, gather resources, and destroy the enemy castle. Team-based warfare!"
                  icon={CastleIcon}
                  playerCount="2-16 Players"
                  onPlay={handlePlayCastles}
                  status="Join Lobby"
                  testId="game-castles"
                />
              )}

              {matchesSearch("Ships Battle") && (
                <GameCard
                  title="Ships Battle"
                  description="Naval Warfare! Position your fleet on the grid and guess opponent coordinates. Sink all their ships to win!"
                  icon={Ship}
                  playerCount="2 Players"
                  onPlay={handlePlayShipsBattle}
                  lobbyCount={
                    shipsBattleLobbyCount
                      ? {
                          current: shipsBattleLobbyCount.current,
                          max: shipsBattleLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !shipsBattleLobbyCount || shipsBattleLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-shipsbattle"
                />
              )}

              {matchesSearch("Battleship") && (
                <GameCard
                  title="Battleship"
                  description="Classic naval strategy! Place your fleet on a 10x10 grid and take turns firing at enemy waters. Sink all ships to win!"
                  icon={Anchor}
                  playerCount="2 Players"
                  onPlay={handlePlayBattleship}
                  status="Join Lobby"
                  testId="game-battleship"
                />
              )}

              {matchesSearch("Capture the Flag") && (
                <GameCard
                  title="Capture the Flag"
                  description="Team-based action! Capture the enemy flag and return it to your base. Tag enemies to stun them!"
                  icon={Flag}
                  playerCount="2-8 Players"
                  onPlay={handlePlayCTF}
                  status="Join Lobby"
                  testId="game-ctf"
                />
              )}

              {matchesSearch("Siege War") && (
                <GameCard
                  title="Siege War"
                  description="Strategic warfare! Attackers spawn units to destroy the castle, defenders protect it. Command infantry, archers, and catapults!"
                  icon={Swords}
                  playerCount="2-6 Players"
                  onPlay={handlePlaySiegeWar}
                  status="Join Lobby"
                  testId="game-siegewar"
                />
              )}

              {matchesSearch("Hide and Seek 3D") && (
                <GameCard
                  title="Hide and Seek 3D"
                  description="3D multiplayer! One seeker, others hide in a neighborhood. Crouch, run, jump, and use roofs strategically!"
                  icon={UsersIcon}
                  playerCount="3+ Players"
                  onPlay={handlePlayHideSeek}
                  lobbyCount={
                    hideSeekLobbyCount
                      ? {
                          current: hideSeekLobbyCount.current,
                          max: hideSeekLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !hideSeekLobbyCount || hideSeekLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-hideseek"
                />
              )}

              {matchesSearch("Tank Battle") && (
                <GameCard
                  title="Tank Battle"
                  description="Command your tank in wave-based combat! Destroy enemy tanks using WASD to move and SPACE to fire."
                  icon={Target}
                  playerCount="Single Player"
                  onPlay={handlePlayTankBattle}
                  status="Play Now"
                  testId="game-tankbattle"
                />
              )}

              {matchesSearch("Tower Defense") && (
                <GameCard
                  title="Tower Defense"
                  description="Build towers to defend against waves of enemies! Place arrow, cannon, and magic towers strategically."
                  icon={Castle}
                  playerCount="Single Player"
                  onPlay={handlePlayTowerDefense}
                  status="Play Now"
                  testId="game-towerdefense"
                />
              )}

              {matchesSearch("Zombie Survival") && (
                <GameCard
                  title="Zombie Survival"
                  description="Survive endless waves of zombies! Move with WASD, aim with mouse, shoot to survive!"
                  icon={Skull}
                  playerCount="Single Player"
                  onPlay={handlePlayZombieSurvival}
                  status="Play Now"
                  testId="game-zombiesurvival"
                />
              )}

              {matchesSearch("Treasure Hunt") && (
                <GameCard
                  title="Treasure Hunt"
                  description="Explore and collect hidden treasures! Avoid traps and race against time. Fog of war adds challenge!"
                  icon={Gem}
                  playerCount="Single Player"
                  onPlay={handlePlayTreasureHunt}
                  status="Play Now"
                  testId="game-treasurehunt"
                />
              )}

              {matchesSearch("Dodge Arena") && (
                <GameCard
                  title="Dodge Arena"
                  description="Survive against waves of projectiles! Dodge, collect power-ups, and see how long you can last!"
                  icon={Zap}
                  playerCount="Single Player"
                  onPlay={handlePlayDodgeArena}
                  status="Play Now"
                  testId="game-dodgearena"
                />
              )}

              {matchesSearch("Capture Zone") && (
                <GameCard
                  title="Capture Zone"
                  description="Team-based zone control! Capture and hold zones to earn points. First team to win controls the battlefield!"
                  icon={Flag}
                  playerCount="Single Player"
                  onPlay={handlePlayCaptureZone}
                  status="Play Now"
                  testId="game-capturezone"
                />
              )}

              {matchesSearch("Sky Fortress Siege") && (
                <GameCard
                  title="Sky Fortress Siege"
                  description="Control floating fortresses in the sky! Attack enemy fortresses while defending your own. Manage resources, upgrade weapons, and plan strategic flight paths."
                  icon={Rocket}
                  playerCount="2-8 Players"
                  onPlay={handlePlaySkyFortress}
                  status="Play Now"
                  testId="game-skyfortress"
                />
              )}

              {matchesSearch("Time Rift Tactics") && (
                <GameCard
                  title="Time Rift Tactics"
                  description="Manipulate time to gain advantage! Freeze, rewind, or fast-forward time to outmaneuver opponents. Real-time combat where timing is everything!"
                  icon={Zap}
                  playerCount="2-4 Players"
                  onPlay={handlePlayTimeRift}
                  status="Play Now"
                  testId="game-timerift"
                />
              )}

              {matchesSearch("Shadow Ops: Urban Warfare") && (
                <GameCard
                  title="Shadow Ops: Urban Warfare"
                  description="Infiltrate the city with your team! Complete objectives while defending against enemies. Coordinate stealth, traps, and diversions in fast-paced combat."
                  icon={Target}
                  playerCount="2-6 Players"
                  onPlay={handlePlayShadowOps}
                  status="Play Now"
                  testId="game-shadowops"
                />
              )}

              {matchesSearch("Elemental Conquest") && (
                <GameCard
                  title="Elemental Conquest"
                  description="Command units with elemental powers! Combine fire, water, earth, and air attacks to exploit weaknesses. Strategic positioning and spell timing are crucial!"
                  icon={Palette}
                  playerCount="2-4 Players"
                  onPlay={handlePlayElementalConquest}
                  status="Play Now"
                  testId="game-elementalconquest"
                />
              )}

              {matchesSearch("Mech Arena: Resource Wars") && (
                <GameCard
                  title="Mech Arena: Resource Wars"
                  description="Giant customizable mechs in destructive arenas! Secure resources and upgrade your mech for offense or defense. Explosive combat with boosters and grapples!"
                  icon={Swords}
                  playerCount="2-6 Players"
                  onPlay={handlePlayMechArena}
                  status="Play Now"
                  testId="game-mecharena"
                />
              )}

              {matchesSearch("Outpost Rush") && (
                <GameCard
                  title="Outpost Rush"
                  description="Team-based battle! Capture outposts, upgrade weapons, and defend your base. Hold 2 outposts for 5 minutes or destroy the enemy base to win!"
                  icon={Castle}
                  playerCount="2-8 Players"
                  onPlay={handlePlayOutpostRush}
                  lobbyCount={
                    outpostRushLobbyCount
                      ? {
                          current: outpostRushLobbyCount.current,
                          max: outpostRushLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !outpostRushLobbyCount || outpostRushLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-outpostrush"
                />
              )}

              {matchesSearch("Emoji Chain") && (
                <GameCard
                  title="Emoji Chain"
                  description="Guess the phrase from emoji clues! Race to decode emoji combinations before time runs out."
                  icon={Smile}
                  playerCount="2-5 Players"
                  onPlay={handlePlayEmojiChain}
                  lobbyCount={
                    emojiChainLobbyCount
                      ? {
                          current: emojiChainLobbyCount.current,
                          max: emojiChainLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !emojiChainLobbyCount || emojiChainLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-emojichain"
                />
              )}

              {matchesSearch("Word Association") && (
                <GameCard
                  title="Word Association"
                  description="Chain related words together! Say a word connected to the previous one. Don't repeat or hesitate!"
                  icon={Link2}
                  playerCount="2-5 Players"
                  onPlay={handlePlayWordAssociation}
                  lobbyCount={
                    wordAssociationLobbyCount
                      ? {
                          current: wordAssociationLobbyCount.current,
                          max: wordAssociationLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !wordAssociationLobbyCount ||
                    wordAssociationLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-wordassociation"
                />
              )}

              {matchesSearch("Squid Game") && (
                <GameCard
                  title="Squid Game"
                  description="Survive 3 deadly mini-games! Red Light Green Light, Cookie Cutter, and Glass Bridge. Only the strongest survive!"
                  icon={Skull}
                  playerCount="5+ Players"
                  onPlay={handlePlaySquidGame}
                  lobbyCount={
                    squidGameLobbyCount
                      ? {
                          current: squidGameLobbyCount.current,
                          max: squidGameLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !squidGameLobbyCount || squidGameLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-squidgame"
                />
              )}

              {matchesSearch("Truth or Bluff") && (
                <GameCard
                  title="Truth or Bluff"
                  description="Tell a story and mark it true or fake. Can others spot the lies? Score points by fooling or detecting!"
                  icon={BookOpen}
                  playerCount="3+ Players"
                  onPlay={handlePlayTruthOrBluff}
                  lobbyCount={
                    truthOrBluffLobbyCount
                      ? {
                          current: truthOrBluffLobbyCount.current,
                          max: truthOrBluffLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !truthOrBluffLobbyCount ||
                    truthOrBluffLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-truthorbluff"
                />
              )}

              {matchesSearch("Spot the Liar") && (
                <GameCard
                  title="Spot the Liar"
                  description="One player has a different word! Describe your word and vote to find the liar. Social deduction at its finest!"
                  icon={Eye}
                  playerCount="3-6 Players"
                  onPlay={handlePlaySpotTheLiar}
                  lobbyCount={
                    spotTheLiarLobbyCount
                      ? {
                          current: spotTheLiarLobbyCount.current,
                          max: spotTheLiarLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !spotTheLiarLobbyCount || spotTheLiarLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-spottheliar"
                />
              )}

              {matchesSearch("Escape from Ship") && (
                <GameCard
                  title="Escape from Ship"
                  description="The ship is sinking! Race through rooms, solve puzzles, collect 3 items (key, fuel, code), and escape to the pod first!"
                  icon={Rocket}
                  playerCount="3-8 Players"
                  onPlay={handlePlayEscapeShip}
                  lobbyCount={
                    escapeShipLobbyCount
                      ? {
                          current: escapeShipLobbyCount.current,
                          max: escapeShipLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !escapeShipLobbyCount || escapeShipLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-escapeship"
                />
              )}

              {matchesSearch("Reaction Race") && (
                <GameCard
                  title="Reaction Race"
                  description="Test your reflexes! Wait for the signal, then tap as fast as you can. Fastest reaction wins!"
                  icon={Zap}
                  playerCount="2-8 Players"
                  onPlay={handlePlayReactionRace}
                  lobbyCount={
                    reactionRaceLobbyCount
                      ? {
                          current: reactionRaceLobbyCount.current,
                          max: reactionRaceLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !reactionRaceLobbyCount ||
                    reactionRaceLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-reactionrace"
                />
              )}

              {matchesSearch("Color Clash") && (
                <GameCard
                  title="Color Clash"
                  description="Memory challenge! Watch the color sequence and repeat it perfectly. Last player standing wins!"
                  icon={Palette}
                  playerCount="2-8 Players"
                  onPlay={handlePlayColorClash}
                  lobbyCount={
                    colorClashLobbyCount
                      ? {
                          current: colorClashLobbyCount.current,
                          max: colorClashLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !colorClashLobbyCount || colorClashLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-colorclash"
                />
              )}

              {matchesSearch("Castles: Siege Dominion") && (
                <GameCard
                  title="Castles: Siege Dominion"
                  description="Real-time strategy! Build your army, gather resources, and destroy the enemy castle. Team-based warfare!"
                  icon={CastleIcon}
                  playerCount="2-16 Players"
                  onPlay={handlePlayCastles}
                  status="Join Lobby"
                  testId="game-castles"
                />
              )}

              {matchesSearch("Ships Battle") && (
                <GameCard
                  title="Ships Battle"
                  description="Naval Warfare! Position your fleet on the grid and guess opponent coordinates. Sink all their ships to win!"
                  icon={Ship}
                  playerCount="2 Players"
                  onPlay={handlePlayShipsBattle}
                  lobbyCount={
                    shipsBattleLobbyCount
                      ? {
                          current: shipsBattleLobbyCount.current,
                          max: shipsBattleLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !shipsBattleLobbyCount || shipsBattleLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-shipsbattle"
                />
              )}

              {matchesSearch("Battleship") && (
                <GameCard
                  title="Battleship"
                  description="Classic naval strategy! Place your fleet on a 10x10 grid and take turns firing at enemy waters. Sink all ships to win!"
                  icon={Anchor}
                  playerCount="2 Players"
                  onPlay={handlePlayBattleship}
                  status="Join Lobby"
                  testId="game-battleship"
                />
              )}

              {matchesSearch("Capture the Flag") && (
                <GameCard
                  title="Capture the Flag"
                  description="Team-based action! Capture the enemy flag and return it to your base. Tag enemies to stun them!"
                  icon={Flag}
                  playerCount="2-8 Players"
                  onPlay={handlePlayCTF}
                  status="Join Lobby"
                  testId="game-ctf"
                />
              )}

              {matchesSearch("Siege War") && (
                <GameCard
                  title="Siege War"
                  description="Strategic warfare! Attackers spawn units to destroy the castle, defenders protect it. Command infantry, archers, and catapults!"
                  icon={Swords}
                  playerCount="2-6 Players"
                  onPlay={handlePlaySiegeWar}
                  status="Join Lobby"
                  testId="game-siegewar"
                />
              )}

              {matchesSearch("Hide and Seek 3D") && (
                <GameCard
                  title="Hide and Seek 3D"
                  description="3D multiplayer! One seeker, others hide in a neighborhood. Crouch, run, jump, and use roofs strategically!"
                  icon={UsersIcon}
                  playerCount="3+ Players"
                  onPlay={handlePlayHideSeek}
                  lobbyCount={
                    hideSeekLobbyCount
                      ? {
                          current: hideSeekLobbyCount.current,
                          max: hideSeekLobbyCount.max,
                        }
                      : undefined
                  }
                  status={
                    !hideSeekLobbyCount || hideSeekLobbyCount.current === 0
                      ? "Join Lobby"
                      : undefined
                  }
                  testId="game-hideseek"
                />
              )}

              {matchesSearch("Tank Battle") && (
                <GameCard
                  title="Tank Battle"
                  description="Command your tank in wave-based combat! Destroy enemy tanks using WASD to move and SPACE to fire."
                  icon={Target}
                  playerCount="Single Player"
                  onPlay={handlePlayTankBattle}
                  status="Play Now"
                  testId="game-tankbattle"
                />
              )}

              {matchesSearch("Tower Defense") && (
                <GameCard
                  title="Tower Defense"
                  description="Build towers to defend against waves of enemies! Place arrow, cannon, and magic towers strategically."
                  icon={Castle}
                  playerCount="Single Player"
                  onPlay={handlePlayTowerDefense}
                  status="Play Now"
                  testId="game-towerdefense"
                />
              )}

              {matchesSearch("Zombie Survival") && (
                <GameCard
                  title="Zombie Survival"
                  description="Survive endless waves of zombies! Move with WASD, aim with mouse, shoot to survive!"
                  icon={Skull}
                  playerCount="Single Player"
                  onPlay={handlePlayZombieSurvival}
                  status="Play Now"
                  testId="game-zombiesurvival"
                />
              )}

              {matchesSearch("Treasure Hunt") && (
                <GameCard
                  title="Treasure Hunt"
                  description="Explore and collect hidden treasures! Avoid traps and race against time. Fog of war adds challenge!"
                  icon={Gem}
                  playerCount="Single Player"
                  onPlay={handlePlayTreasureHunt}
                  status="Play Now"
                  testId="game-treasurehunt"
                />
              )}

              {matchesSearch("Dodge Arena") && (
                <GameCard
                  title="Dodge Arena"
                  description="Survive against waves of projectiles! Dodge, collect power-ups, and see how long you can last!"
                  icon={Zap}
                  playerCount="Single Player"
                  onPlay={handlePlayDodgeArena}
                  status="Play Now"
                  testId="game-dodgearena"
                />
              )}

              {matchesSearch("Capture Zone") && (
                <GameCard
                  title="Capture Zone"
                  description="Team-based zone control! Capture and hold zones to earn points. First team to win controls the battlefield!"
                  icon={Flag}
                  playerCount="Single Player"
                  onPlay={handlePlayCaptureZone}
                  status="Play Now"
                  testId="game-capturezone"
                />
              )}

              {matchesSearch("Sky Fortress Siege") && (
                <GameCard
                  title="Sky Fortress Siege"
                  description="Control floating fortresses in the sky! Attack enemy fortresses while defending your own. Manage resources, upgrade weapons, and plan strategic flight paths."
                  icon={Rocket}
                  playerCount="2-8 Players"
                  onPlay={handlePlaySkyFortress}
                  status="Play Now"
                  testId="game-skyfortress"
                />
              )}

              {matchesSearch("Time Rift Tactics") && (
                <GameCard
                  title="Time Rift Tactics"
                  description="Manipulate time to gain advantage! Freeze, rewind, or fast-forward time to outmaneuver opponents. Real-time combat where timing is everything!"
                  icon={Zap}
                  playerCount="2-4 Players"
                  onPlay={handlePlayTimeRift}
                  status="Play Now"
                  testId="game-timerift"
                />
              )}

              {matchesSearch("Shadow Ops: Urban Warfare") && (
                <GameCard
                  title="Shadow Ops: Urban Warfare"
                  description="Infiltrate the city with your team! Complete objectives while defending against enemies. Coordinate stealth, traps, and diversions in fast-paced combat."
                  icon={Target}
                  playerCount="2-6 Players"
                  onPlay={handlePlayShadowOps}
                  status="Play Now"
                  testId="game-shadowops"
                />
              )}

              {matchesSearch("Elemental Conquest") && (
                <GameCard
                  title="Elemental Conquest"
                  description="Command units with elemental powers! Combine fire, water, earth, and air attacks to exploit weaknesses. Strategic positioning and spell timing are crucial!"
                  icon={Palette}
                  playerCount="2-4 Players"
                  onPlay={handlePlayElementalConquest}
                  status="Play Now"
                  testId="game-elementalconquest"
                />
              )}

              {matchesSearch("Mech Arena: Resource Wars") && (
                <GameCard
                  title="Mech Arena: Resource Wars"
                  description="Giant customizable mechs in destructive arenas! Secure resources and upgrade your mech for offense or defense. Explosive combat with boosters and grapples!"
                  icon={Swords}
                  playerCount="2-6 Players"
                  onPlay={handlePlayMechArena}
                  status="Play Now"
                  testId="game-mecharena"
                />
              )}
              <GameCard
                title="Outpost Rush"
                description="Team-based battle! Capture outposts, upgrade weapons, and defend your base. Hold 2 outposts for 5 minutes or destroy the enemy base to win!"
                icon={Castle}
                playerCount="2-8 Players"
                onPlay={handlePlayOutpostRush}
                lobbyCount={
                  outpostRushLobbyCount
                    ? {
                        current: outpostRushLobbyCount.current,
                        max: outpostRushLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !outpostRushLobbyCount || outpostRushLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-outpostrush"
              />

              <GameCard
                title="Emoji Chain"
                description="Guess the phrase from emoji clues! Race to decode emoji combinations before time runs out."
                icon={Smile}
                playerCount="2-5 Players"
                onPlay={handlePlayEmojiChain}
                lobbyCount={
                  emojiChainLobbyCount
                    ? {
                        current: emojiChainLobbyCount.current,
                        max: emojiChainLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !emojiChainLobbyCount || emojiChainLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-emojichain"
              />

              <GameCard
                title="Word Association"
                description="Chain related words together! Say a word connected to the previous one. Don't repeat or hesitate!"
                icon={Link2}
                playerCount="2-5 Players"
                onPlay={handlePlayWordAssociation}
                lobbyCount={
                  wordAssociationLobbyCount
                    ? {
                        current: wordAssociationLobbyCount.current,
                        max: wordAssociationLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !wordAssociationLobbyCount ||
                  wordAssociationLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-wordassociation"
              />

              <GameCard
                title="Squid Game"
                description="Survive 3 deadly mini-games! Red Light Green Light, Cookie Cutter, and Glass Bridge. Only the strongest survive!"
                icon={Skull}
                playerCount="5+ Players"
                onPlay={handlePlaySquidGame}
                lobbyCount={
                  squidGameLobbyCount
                    ? {
                        current: squidGameLobbyCount.current,
                        max: squidGameLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !squidGameLobbyCount || squidGameLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-squidgame"
              />

              <GameCard
                title="Truth or Bluff"
                description="Tell a story and mark it true or fake. Can others spot the lies? Score points by fooling or detecting!"
                icon={BookOpen}
                playerCount="3+ Players"
                onPlay={handlePlayTruthOrBluff}
                lobbyCount={
                  truthOrBluffLobbyCount
                    ? {
                        current: truthOrBluffLobbyCount.current,
                        max: truthOrBluffLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !truthOrBluffLobbyCount ||
                  truthOrBluffLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-truthorbluff"
              />

              <GameCard
                title="Spot the Liar"
                description="One player has a different word! Describe your word and vote to find the liar. Social deduction at its finest!"
                icon={Eye}
                playerCount="3-6 Players"
                onPlay={handlePlaySpotTheLiar}
                lobbyCount={
                  spotTheLiarLobbyCount
                    ? {
                        current: spotTheLiarLobbyCount.current,
                        max: spotTheLiarLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !spotTheLiarLobbyCount || spotTheLiarLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-spottheliar"
              />

              <GameCard
                title="Escape from Ship"
                description="The ship is sinking! Race through rooms, solve puzzles, collect 3 items (key, fuel, code), and escape to the pod first!"
                icon={Rocket}
                playerCount="3-8 Players"
                onPlay={handlePlayEscapeShip}
                lobbyCount={
                  escapeShipLobbyCount
                    ? {
                        current: escapeShipLobbyCount.current,
                        max: escapeShipLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !escapeShipLobbyCount || escapeShipLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-escapeship"
              />

              <GameCard
                title="Reaction Race"
                description="Test your reflexes! Wait for the signal, then tap as fast as you can. Fastest reaction wins!"
                icon={Zap}
                playerCount="2-8 Players"
                onPlay={handlePlayReactionRace}
                lobbyCount={
                  reactionRaceLobbyCount
                    ? {
                        current: reactionRaceLobbyCount.current,
                        max: reactionRaceLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !reactionRaceLobbyCount ||
                  reactionRaceLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-reactionrace"
              />

              <GameCard
                title="Color Clash"
                description="Memory challenge! Watch the color sequence and repeat it perfectly. Last player standing wins!"
                icon={Palette}
                playerCount="2-8 Players"
                onPlay={handlePlayColorClash}
                lobbyCount={
                  colorClashLobbyCount
                    ? {
                        current: colorClashLobbyCount.current,
                        max: colorClashLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !colorClashLobbyCount || colorClashLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-colorclash"
              />

              <GameCard
                title="Castles: Siege Dominion"
                description="Real-time strategy! Build your army, gather resources, and destroy the enemy castle. Team-based warfare!"
                icon={CastleIcon}
                playerCount="2-16 Players"
                onPlay={handlePlayCastles}
                status="Join Lobby"
                testId="game-castles"
              />

              <GameCard
                title="Ships Battle"
                description="Naval Warfare! Position your fleet on the grid and guess opponent coordinates. Sink all their ships to win!"
                icon={Ship}
                playerCount="2 Players"
                onPlay={handlePlayShipsBattle}
                lobbyCount={
                  shipsBattleLobbyCount
                    ? {
                        current: shipsBattleLobbyCount.current,
                        max: shipsBattleLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !shipsBattleLobbyCount || shipsBattleLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-shipsbattle"
              />

              <GameCard
                title="Battleship"
                description="Classic naval strategy! Place your fleet on a 10x10 grid and take turns firing at enemy waters. Sink all ships to win!"
                icon={Anchor}
                playerCount="2 Players"
                onPlay={handlePlayBattleship}
                status="Join Lobby"
                testId="game-battleship"
              />

              <GameCard
                title="Capture the Flag"
                description="Team-based action! Capture the enemy flag and return it to your base. Tag enemies to stun them!"
                icon={Flag}
                playerCount="2-8 Players"
                onPlay={handlePlayCTF}
                status="Join Lobby"
                testId="game-ctf"
              />

              <GameCard
                title="Siege War"
                description="Strategic warfare! Attackers spawn units to destroy the castle, defenders protect it. Command infantry, archers, and catapults!"
                icon={Swords}
                playerCount="2-6 Players"
                onPlay={handlePlaySiegeWar}
                status="Join Lobby"
                testId="game-siegewar"
              />

              <GameCard
                title="Hide and Seek 3D"
                description="3D multiplayer! One seeker, others hide in a neighborhood. Crouch, run, jump, and use roofs strategically!"
                icon={UsersIcon}
                playerCount="3+ Players"
                onPlay={handlePlayHideSeek}
                lobbyCount={
                  hideSeekLobbyCount
                    ? {
                        current: hideSeekLobbyCount.current,
                        max: hideSeekLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !hideSeekLobbyCount || hideSeekLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-hideseek"
              />

              <GameCard
                title="Tank Battle"
                description="Command your tank in wave-based combat! Destroy enemy tanks using WASD to move and SPACE to fire."
                icon={Target}
                playerCount="Single Player"
                onPlay={handlePlayTankBattle}
                status="Play Now"
                testId="game-tankbattle"
              />

              <GameCard
                title="Tower Defense"
                description="Build towers to defend against waves of enemies! Place arrow, cannon, and magic towers strategically."
                icon={Castle}
                playerCount="Single Player"
                onPlay={handlePlayTowerDefense}
                status="Play Now"
                testId="game-towerdefense"
              />

              <GameCard
                title="Zombie Survival"
                description="Survive endless waves of zombies! Move with WASD, aim with mouse, shoot to survive!"
                icon={Skull}
                playerCount="Single Player"
                onPlay={handlePlayZombieSurvival}
                status="Play Now"
                testId="game-zombiesurvival"
              />

              <GameCard
                title="Treasure Hunt"
                description="Explore and collect hidden treasures! Avoid traps and race against time. Fog of war adds challenge!"
                icon={Gem}
                playerCount="Single Player"
                onPlay={handlePlayTreasureHunt}
                status="Play Now"
                testId="game-treasurehunt"
              />

              <GameCard
                title="Dodge Arena"
                description="Survive against waves of projectiles! Dodge, collect power-ups, and see how long you can last!"
                icon={Zap}
                playerCount="Single Player"
                onPlay={handlePlayDodgeArena}
                status="Play Now"
                testId="game-dodgearena"
              />

              <GameCard
                title="Capture Zone"
                description="Team-based zone control! Capture and hold zones to earn points. First team to win controls the battlefield!"
                icon={Flag}
                playerCount="Single Player"
                onPlay={handlePlayCaptureZone}
                status="Play Now"
                testId="game-capturezone"
              />

              <GameCard
                title="Sky Fortress Siege"
                description="Control floating fortresses in the sky! Attack enemy fortresses while defending your own. Manage resources, upgrade weapons, and plan strategic flight paths."
                icon={Rocket}
                playerCount="2-8 Players"
                onPlay={handlePlaySkyFortress}
                status="Play Now"
                testId="game-skyfortress"
              />

              <GameCard
                title="Time Rift Tactics"
                description="Manipulate time to gain advantage! Freeze, rewind, or fast-forward time to outmaneuver opponents. Real-time combat where timing is everything!"
                icon={Zap}
                playerCount="2-4 Players"
                onPlay={handlePlayTimeRift}
                status="Play Now"
                testId="game-timerift"
              />

              <GameCard
                title="Shadow Ops: Urban Warfare"
                description="Infiltrate the city with your team! Complete objectives while defending against enemies. Coordinate stealth, traps, and diversions in fast-paced combat."
                icon={Target}
                playerCount="2-6 Players"
                onPlay={handlePlayShadowOps}
                status="Play Now"
                testId="game-shadowops"
              />

              <GameCard
                title="Elemental Conquest"
                description="Command units with elemental powers! Combine fire, water, earth, and air attacks to exploit weaknesses. Strategic positioning and spell timing are crucial!"
                icon={Palette}
                playerCount="2-4 Players"
                onPlay={handlePlayElementalConquest}
                status="Play Now"
                testId="game-elementalconquest"
              />

              <GameCard
                title="Mech Arena: Resource Wars"
                description="Giant customizable mechs in destructive arenas! Secure resources and upgrade your mech for offense or defense. Explosive combat with boosters and grapples!"
                icon={Swords}
                playerCount="2-6 Players"
                onPlay={handlePlayMechArena}
                status="Play Now"
                testId="game-mecharena"
              />
            </div>
              </TabsContent>

              <TabsContent value="1v1" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <GameCard
                title="Tic Tac Toe"
                description="Classic 3x3 grid game. Challenge a friend and take turns placing X's and O's. First to get three in a row wins!"
                icon={Grid3X3}
                playerCount="2 Players"
                onPlay={handlePlayTicTacToe}
                disabled={availablePlayers.length === 0}
                status={
                  availablePlayers.length > 0
                    ? `${availablePlayers.length} available`
                    : undefined
                }
                testId="game-tictactoe"
              />

              <GameCard
                title="Rock Paper Scissors"
                description="The timeless hand game! Rock beats scissors, scissors beats paper, paper beats rock. Best of 5 rounds!"
                icon={Hand}
                playerCount="2 Players"
                onPlay={handlePlayRPS}
                disabled={availablePlayers.length === 0}
                status={
                  availablePlayers.length > 0
                    ? `${availablePlayers.length} available`
                    : undefined
                }
                testId="game-rps"
              />

              <GameCard
                title="Word Scramble"
                description="Unscramble the letters to find the hidden word! First to 3 wins. Speed matters when both get it right!"
                icon={Shuffle}
                playerCount="2 Players"
                onPlay={handlePlayWordScramble}
                disabled={availablePlayers.length === 0}
                status={
                  availablePlayers.length > 0
                    ? `${availablePlayers.length} available`
                    : undefined
                }
                testId="game-wordscramble"
              />

              <GameCard
                title="Number Guess"
                description="Race to find the secret number between 1-100! Get hints after each guess. First to guess correctly wins!"
                icon={Hash}
                playerCount="2 Players"
                onPlay={handlePlayNumberGuess}
                disabled={availablePlayers.length === 0}
                status={
                  availablePlayers.length > 0
                    ? `${availablePlayers.length} available`
                    : undefined
                }
                testId="game-numberguess"
              />

              <GameCard
                title="Quick Math"
                description="Solve math problems faster than your opponent! First to 3 correct answers wins. Speed is everything!"
                icon={Calculator}
                playerCount="2 Players"
                onPlay={handlePlayQuickMath}
                disabled={availablePlayers.length === 0}
                status={
                  availablePlayers.length > 0
                    ? `${availablePlayers.length} available`
                    : undefined
                }
                testId="game-quickmath"
              />

              <GameCard
                title="Connect Four"
                description="Drop colored discs into the grid! Get four in a row horizontally, vertically, or diagonally to win!"
                icon={Circle}
                playerCount="2 Players"
                onPlay={handlePlayConnectFour}
                disabled={availablePlayers.length === 0}
                status={
                  availablePlayers.length > 0
                    ? `${availablePlayers.length} available`
                    : undefined
                }
                testId="game-connectfour"
              />

              <GameCard
                title="Ships Battle"
                description="Naval Warfare! Position your fleet on the grid and guess opponent coordinates. Sink all their ships to win!"
                icon={Ship}
                playerCount="2 Players"
                onPlay={handlePlayShipsBattle}
                lobbyCount={
                  shipsBattleLobbyCount
                    ? {
                        current: shipsBattleLobbyCount.current,
                        max: shipsBattleLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !shipsBattleLobbyCount || shipsBattleLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-shipsbattle"
              />

              <GameCard
                title="Battleship"
                description="Classic naval strategy! Place your fleet on a 10x10 grid and take turns firing at enemy waters. Sink all ships to win!"
                icon={Anchor}
                playerCount="2 Players"
                onPlay={handlePlayBattleship}
                status="Join Lobby"
                testId="game-battleship"
              />
            </div>
              </TabsContent>

              <TabsContent value="lobbybparty" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <GameCard
                title="Riddles"
                description="Test your wit! Join a lobby, answer riddles as fast as you can, and compete for the highest score."
                icon={Lightbulb}
                playerCount="2+ Players"
                onPlay={handlePlayRiddles}
                lobbyCount={
                  riddleLobbyCount
                    ? {
                        current: riddleLobbyCount.current,
                        max: riddleLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !riddleLobbyCount || riddleLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-riddles"
              />

              <GameCard
                title="Memory Match"
                description="Find matching pairs! Take turns flipping cards and remember where each symbol is located. Most pairs wins!"
                icon={Grid2X2}
                playerCount="2-4 Players"
                onPlay={handlePlayMemoryMatch}
                lobbyCount={
                  memoryLobbyCount
                    ? {
                        current: memoryLobbyCount.current,
                        max: memoryLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !memoryLobbyCount || memoryLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-memory"
              />

              <GameCard
                title="Typing Race"
                description="Race to type the given text! Be fast and accurate. First to finish wins. Watch your WPM!"
                icon={Keyboard}
                playerCount="2-6 Players"
                onPlay={handlePlayTypingRace}
                lobbyCount={
                  typingLobbyCount
                    ? {
                        current: typingLobbyCount.current,
                        max: typingLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !typingLobbyCount || typingLobbyCount.current === 0
                    ? "Join Race"
                    : undefined
                }
                testId="game-typing"
              />

              <GameCard
                title="Werewolf"
                description="Social deduction game! Villagers hunt werewolves by day, werewolves eliminate villagers by night. Trust no one!"
                icon={Moon}
                playerCount="5-20 Players"
                onPlay={handlePlayWerewolf}
                lobbyCount={
                  werewolfLobbyCount
                    ? {
                        current: werewolfLobbyCount.current,
                        max: werewolfLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !werewolfLobbyCount || werewolfLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-werewolf"
              />

              <GameCard
                title="Spy Hunt"
                description="Find the spy! Everyone knows the location except one person. Ask questions to find who doesn't belong!"
                icon={Search}
                playerCount="4-12 Players"
                onPlay={handlePlaySpyHunt}
                lobbyCount={
                  spyHuntLobbyCount
                    ? {
                        current: spyHuntLobbyCount.current,
                        max: spyHuntLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !spyHuntLobbyCount || spyHuntLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-spyhunt"
              />

              <GameCard
                title="Point on Point"
                description="Collaborative storytelling! Take turns adding sentences to build a story together. See where your creativity leads!"
                icon={MessageCircleIcon}
                playerCount="2-6 Players"
                onPlay={handlePlayPointOnPoint}
                lobbyCount={
                  popLobbyCount
                    ? {
                        current: popLobbyCount.current,
                        max: popLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !popLobbyCount || popLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-pointonpoint"
              />

              <GameCard
                title="Outpost Rush"
                description="Team-based battle! Capture outposts, upgrade weapons, and defend your base. Hold 2 outposts for 5 minutes or destroy the enemy base to win!"
                icon={Castle}
                playerCount="2-8 Players"
                onPlay={handlePlayOutpostRush}
                lobbyCount={
                  outpostRushLobbyCount
                    ? {
                        current: outpostRushLobbyCount.current,
                        max: outpostRushLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !outpostRushLobbyCount || outpostRushLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-outpostrush"
              />

              <GameCard
                title="Emoji Chain"
                description="Guess the phrase from emoji clues! Race to decode emoji combinations before time runs out."
                icon={Smile}
                playerCount="2-5 Players"
                onPlay={handlePlayEmojiChain}
                lobbyCount={
                  emojiChainLobbyCount
                    ? {
                        current: emojiChainLobbyCount.current,
                        max: emojiChainLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !emojiChainLobbyCount || emojiChainLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-emojichain"
              />

              <GameCard
                title="Word Association"
                description="Chain related words together! Say a word connected to the previous one. Don't repeat or hesitate!"
                icon={Link2}
                playerCount="2-5 Players"
                onPlay={handlePlayWordAssociation}
                lobbyCount={
                  wordAssociationLobbyCount
                    ? {
                        current: wordAssociationLobbyCount.current,
                        max: wordAssociationLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !wordAssociationLobbyCount ||
                  wordAssociationLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-wordassociation"
              />

              <GameCard
                title="Hangman"
                description="Guess the hidden word letter by letter! Don't run out of wrong guesses. Team up to beat the Word Setter!"
                icon={Pencil}
                playerCount="2-8 Players"
                onPlay={handlePlayHangman}
                lobbyCount={
                  hangmanLobbyCount
                    ? {
                        current: hangmanLobbyCount.current,
                        max: hangmanLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !hangmanLobbyCount || hangmanLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-hangman"
              />

              <GameCard
                title="Trivia Quiz"
                description="Test your general knowledge! Compete against others to answer questions correctly and quickly."
                icon={HelpCircle}
                playerCount="2-8 Players"
                onPlay={handlePlayTriviaQuiz}
                lobbyCount={
                  triviaQuizLobbyCount
                    ? {
                        current: triviaQuizLobbyCount.current,
                        max: triviaQuizLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !triviaQuizLobbyCount || triviaQuizLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-triviaquiz"
              />

              <GameCard
                title="Squid Game"
                description="Survive 3 deadly mini-games! Red Light Green Light, Cookie Cutter, and Glass Bridge. Only the strongest survive!"
                icon={Skull}
                playerCount="5+ Players"
                onPlay={handlePlaySquidGame}
                lobbyCount={
                  squidGameLobbyCount
                    ? {
                        current: squidGameLobbyCount.current,
                        max: squidGameLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !squidGameLobbyCount || squidGameLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-squidgame"
              />

              <GameCard
                title="Truth or Bluff"
                description="Tell a story and mark it true or fake. Can others spot the lies? Score points by fooling or detecting!"
                icon={BookOpen}
                playerCount="3+ Players"
                onPlay={handlePlayTruthOrBluff}
                lobbyCount={
                  truthOrBluffLobbyCount
                    ? {
                        current: truthOrBluffLobbyCount.current,
                        max: truthOrBluffLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !truthOrBluffLobbyCount ||
                  truthOrBluffLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-truthorbluff"
              />

              <GameCard
                title="Spot the Liar"
                description="One player has a different word! Describe your word and vote to find the liar. Social deduction at its finest!"
                icon={Eye}
                playerCount="3-6 Players"
                onPlay={handlePlaySpotTheLiar}
                lobbyCount={
                  spotTheLiarLobbyCount
                    ? {
                        current: spotTheLiarLobbyCount.current,
                        max: spotTheLiarLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !spotTheLiarLobbyCount || spotTheLiarLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-spottheliar"
              />

              <GameCard
                title="Escape from Ship"
                description="The ship is sinking! Race through rooms, solve puzzles, collect 3 items (key, fuel, code), and escape to the pod first!"
                icon={Rocket}
                playerCount="3-8 Players"
                onPlay={handlePlayEscapeShip}
                lobbyCount={
                  escapeShipLobbyCount
                    ? {
                        current: escapeShipLobbyCount.current,
                        max: escapeShipLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !escapeShipLobbyCount || escapeShipLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-escapeship"
              />

              <GameCard
                title="Reaction Race"
                description="Test your reflexes! Wait for the signal, then tap as fast as you can. Fastest reaction wins!"
                icon={Zap}
                playerCount="2-8 Players"
                onPlay={handlePlayReactionRace}
                lobbyCount={
                  reactionRaceLobbyCount
                    ? {
                        current: reactionRaceLobbyCount.current,
                        max: reactionRaceLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !reactionRaceLobbyCount ||
                  reactionRaceLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-reactionrace"
              />

              <GameCard
                title="Color Clash"
                description="Memory challenge! Watch the color sequence and repeat it perfectly. Last player standing wins!"
                icon={Palette}
                playerCount="2-8 Players"
                onPlay={handlePlayColorClash}
                lobbyCount={
                  colorClashLobbyCount
                    ? {
                        current: colorClashLobbyCount.current,
                        max: colorClashLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !colorClashLobbyCount || colorClashLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-colorclash"
              />

              <GameCard
                title="Castles: Siege Dominion"
                description="Real-time strategy! Build your army, gather resources, and destroy the enemy castle. Team-based warfare!"
                icon={CastleIcon}
                playerCount="2-16 Players"
                onPlay={handlePlayCastles}
                status="Join Lobby"
                testId="game-castles"
              />

              <GameCard
                title="Capture the Flag"
                description="Team-based action! Capture the enemy flag and return it to your base. Tag enemies to stun them!"
                icon={Flag}
                playerCount="2-8 Players"
                onPlay={handlePlayCTF}
                status="Join Lobby"
                testId="game-ctf"
              />

              <GameCard
                title="Siege War"
                description="Strategic warfare! Attackers spawn units to destroy the castle, defenders protect it. Command infantry, archers, and catapults!"
                icon={Swords}
                playerCount="2-6 Players"
                onPlay={handlePlaySiegeWar}
                status="Join Lobby"
                testId="game-siegewar"
              />

              <GameCard
                title="Hide and Seek 3D"
                description="3D multiplayer! One seeker, others hide in a neighborhood. Crouch, run, jump, and use roofs strategically!"
                icon={UsersIcon}
                playerCount="3+ Players"
                onPlay={handlePlayHideSeek}
                lobbyCount={
                  hideSeekLobbyCount
                    ? {
                        current: hideSeekLobbyCount.current,
                        max: hideSeekLobbyCount.max,
                      }
                    : undefined
                }
                status={
                  !hideSeekLobbyCount || hideSeekLobbyCount.current === 0
                    ? "Join Lobby"
                    : undefined
                }
                testId="game-hideseek"
              />
            </div>
              </TabsContent>

              <TabsContent value="singleplayer" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <GameCard
                title="Warzone Arena"
                description="Intense multiplayer battle arena! Drop in, loot weapons, and be the last one standing in epic combat!"
                icon={Target}
                playerCount="2-100 Players"
                onPlay={handlePlayWarzoneArena}
                status="Play Now"
                testId="game-warzone"
              />

              <GameCard
                title="Tank Battle"
                description="Command your tank in wave-based combat! Destroy enemy tanks using WASD to move and SPACE to fire."
                icon={Target}
                playerCount="Single Player"
                onPlay={handlePlayTankBattle}
                status="Play Now"
                testId="game-tankbattle"
              />

              <GameCard
                title="Tower Defense"
                description="Build and upgrade towers to defend against waves of enemies. Strategic placement and resource management are key!"
                icon={Castle}
                playerCount="Single Player"
                onPlay={handlePlayTowerDefense}
                status="Play Now"
                testId="game-towerdefense"
              />

              <GameCard
                title="Zombie Survival"
                description="Survive endless waves of zombies! Craft weapons, build barricades, and outlast the undead hordes."
                icon={Skull}
                playerCount="Single Player"
                onPlay={handlePlayZombieSurvival}
                status="Play Now"
                testId="game-zombie"
              />

              <GameCard
                title="Treasure Hunt"
                description="Search the island for hidden treasure! Solve puzzles, collect items, and unlock the final chest."
                icon={Gem}
                playerCount="Single Player"
                onPlay={handlePlayTreasureHunt}
                status="Play Now"
                testId="game-treasurehunt"
              />

              <GameCard
                title="Dodge Arena"
                description="Test your reflexes in neon-filled arenas! Dodge obstacles and survive as long as you can."
                icon={Circle}
                playerCount="Single Player"
                onPlay={handlePlayDodgeArena}
                status="Play Now"
                testId="game-dodgearena"
              />

              <GameCard
                title="Capture Zone"
                description="Control the central zone to score points! Defeat enemies to maintain control and win!"
                icon={Flag}
                playerCount="Single Player"
                onPlay={handlePlayCaptureZone}
                status="Play Now"
                testId="game-capturezone"
              />

              <GameCard
                title="Sky Fortress Siege"
                description="Storm a sky fortress! Navigate vertical platforms, defeat guardians, and reach the top to claim victory!"
                icon={Rocket}
                playerCount="Single Player"
                onPlay={handlePlaySkyFortress}
                status="Play Now"
                testId="game-skyfortress"
              />

              <GameCard
                title="Time Rift Tactics"
                description="Manipulate time itself! Slow, rewind, and freeze time to solve puzzles and defeat enemies strategically."
                icon={Zap}
                playerCount="Single Player"
                onPlay={handlePlayTimeRift}
                status="Play Now"
                testId="game-timerift"
              />

              <GameCard
                title="Shadow Ops: Urban Warfare"
                description="Infiltrate the city with your team! Complete objectives while defending against enemies. Coordinate stealth, traps, and diversions in fast-paced combat."
                icon={Target}
                playerCount="2-6 Players"
                onPlay={handlePlayShadowOps}
                status="Play Now"
                testId="game-shadowops"
              />

              <GameCard
                title="Elemental Conquest"
                description="Command units with elemental powers! Combine fire, water, earth, and air attacks to exploit weaknesses. Strategic positioning and spell timing are crucial!"
                icon={Palette}
                playerCount="2-4 Players"
                onPlay={handlePlayElementalConquest}
                status="Play Now"
                testId="game-elementalconquest"
              />

              <GameCard
                title="Mech Arena: Resource Wars"
                description="Giant customizable mechs in destructive arenas! Secure resources and upgrade your mech for offense or defense. Explosive combat with boosters and grapples!"
                icon={Swords}
                playerCount="2-6 Players"
                onPlay={handlePlayMechArena}
                status="Play Now"
                testId="game-mecharena"
              />
            </div>
              </TabsContent>

              {(isVip || isAdmin) && (
                <TabsContent value="viplobby" className="space-y-6">
                  <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 mb-6">
                    <div className="flex items-center gap-2 mb-2">
                      <Gem className="w-5 h-5 text-primary" />
                      <h3 className="font-semibold text-foreground">VIP & Admin Exclusive Lobbies</h3>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      These lobbies are exclusive to VIP members and administrators. Enjoy premium gaming experiences!
                    </p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <GameCard
                      title="VIP Riddles"
                      description="Exclusive VIP riddle competition with harder challenges and premium rewards!"
                      icon={Lightbulb}
                      playerCount="2+ VIP Players"
                      onPlay={handlePlayVipRiddles}
                      status="VIP Only"
                      testId="game-vip-riddles"
                    />
                    <GameCard
                      title="VIP Werewolf"
                      description="Elite social deduction game for VIP members only. Higher stakes, better rewards!"
                      icon={Moon}
                      playerCount="5-20 VIP Players"
                      onPlay={handlePlayVipWerewolf}
                      status="VIP Only"
                      testId="game-vip-werewolf"
                    />
                    <GameCard
                      title="VIP Escape Ship"
                      description="Premium escape room experience designed exclusively for VIP members!"
                      icon={Rocket}
                      playerCount="3-8 VIP Players"
                      onPlay={handlePlayVipEscapeShip}
                      status="VIP Only"
                      testId="game-vip-escape"
                    />
                    <GameCard
                      title="VIP Squid Game"
                      description="Exclusive VIP version with enhanced graphics and premium gameplay!"
                      icon={Skull}
                      playerCount="5+ VIP Players"
                      onPlay={handlePlayVipSquidGame}
                      status="VIP Only"
                      testId="game-vip-squid"
                    />
                    <GameCard
                      title="VIP Castles"
                      description="Premium strategy warfare reserved for VIP members with exclusive units!"
                      icon={CastleIcon}
                      playerCount="2-16 VIP Players"
                      onPlay={handlePlayVipCastles}
                      status="VIP Only"
                      testId="game-vip-castles"
                    />
                    <GameCard
                      title="VIP Hide and Seek"
                      description="Enhanced 3D experience with special features only available to VIPs!"
                      icon={UsersIcon}
                      playerCount="3+ VIP Players"
                      onPlay={handlePlayVipHideSeek}
                      status="VIP Only"
                      testId="game-vip-hideseek"
                    />
                  </div>
                </TabsContent>
              )}
            </Tabs>

            {onlineCount === 0 && (
              <div className="text-center p-8 rounded-xl bg-muted/30 border border-border/50">
                <Users className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
                <h3 className="text-lg font-medium text-foreground mb-2">
                  Waiting for players
                </h3>
                <p className="text-muted-foreground text-sm max-w-md mx-auto">
                  Share this page with friends to start playing together! Tic
                  Tac Toe and Rock Paper Scissors require at least one other
                  player online.
                </p>
              </div>
            )}
          </div>
        </main>
      </div>

      <div
        className="hidden lg:block fixed bottom-4 left-4 z-20"
        style={{ width: "320px" }}
      >
        {isChatMinimized ? (
          <ChatContainer
            isMinimized
            onToggleMinimize={() => setIsChatMinimized(false)}
          />
        ) : (
          <ChatContainer
            className="h-[400px]"
            onToggleMinimize={() => setIsChatMinimized(true)}
          />
        )}
      </div>

      <Sheet open={isChatOpen && !isSidebarOpen} onOpenChange={setIsChatOpen}>
        <SheetContent side="bottom" className="h-[70vh] p-0 lg:hidden">
          <VisuallyHidden>
            <SheetTitle>Chat</SheetTitle>
            <SheetDescription>Chat with other players</SheetDescription>
          </VisuallyHidden>
          <ChatContainer
            className="h-full rounded-none border-0"
            onClose={() => setIsChatOpen(false)}
          />
        </SheetContent>
      </Sheet>

      <DmPanel />
      <ChallengeNotifications />
      <OpponentLeftNotification />
      <DmNotification />
      <ChatNotification
        isChatOpen={isChatOpen || !isChatMinimized}
        onOpenChat={() => {
          setIsChatOpen(true);
          setIsChatMinimized(false);
        }}
      />

      {tttGame && <TicTacToe />}
      {rpsGame && <RockPaperScissors />}
      {riddleLobby && !riddleGame && <RiddleLobby />}
      {riddleGame && <RiddleGame />}
      {wsGame && <WordScramble />}
      {ngGame && <NumberGuess />}
      {qmGame && <QuickMath />}
      {c4Game && <ConnectFour />}
      {(memoryLobby || memoryGame) && <MemoryMatch />}
      {(typingLobby || typingGame) && <TypingRace />}
      {(werewolfLobby || werewolfGame) && <Werewolf />}
      {(spyHuntLobby || spyHuntGame) && <SpyHunt />}
      {showWarzoneArena && (
        <WarzoneArena onClose={() => setShowWarzoneArena(false)} />
      )}
      {pointOnPointLobby && !pointOnPointGame && <PointOnPointLobby />}
      {pointOnPointGame && <PointOnPointGame />}
      {outpostRushLobby && !outpostRushGame && <OutpostRushLobby />}
      {outpostRushGame && <OutpostRushGame />}
      {(emojiChainLobby || emojiChainGame) && <EmojiChain />}
      {(wordAssociationLobby || wordAssociationGame) && <WordAssociation />}
      {(hangmanLobby || hangmanGame) && <Hangman />}
      {(triviaQuizLobby || triviaQuizGame) && <TriviaQuiz />}
      {squidGameLobby && !squidGame && <SquidGameLobby />}
      {squidGame && <SquidGame />}
      {truthOrBluffLobby && !truthOrBluffGame && <TruthOrBluffLobby />}
      {truthOrBluffGame && <TruthOrBluffGame />}
      {spotTheLiarLobby && !spotTheLiarGame && <SpotTheLiarLobby />}
      {spotTheLiarGame && <SpotTheLiarGame />}
      {escapeShipLobby && !escapeShipGame && <EscapeShipLobby />}
      {escapeShipGame && <EscapeShipGame />}
      {reactionRaceLobby && !reactionRaceGame && <ReactionRaceLobby />}
      {reactionRaceGame && <ReactionRaceGame />}
      {colorClashLobby && !colorClashGame && <ColorClashLobby />}
      {colorClashGame && <ColorClashGame />}
      {castlesLobby && !castlesGame && <CastlesSiegeLobby />}
      {castlesGame && <CastlesSiegeGame />}
      {(shipsBattleLobby || shipsBattleGame) && <ShipsBattle />}
      {battleshipLobby && !battleshipGame && <BattleshipLobby />}
      {battleshipGame && <BattleshipGame />}
      {ctfLobby && !ctfGame && <CTFLobby />}
      {ctfGame && <CTFGameComponent />}
      {siegeWarLobby && !siegeWarGame && <SiegeWarLobby />}
      {siegeWarGame && <SiegeWarGameComponent />}
      {hideSeekLobby && !hideSeekGame && <HideSeekLobby />}
      {hideSeekGame && <HideSeekGame />}
      {showTankBattle && <TankBattle onClose={() => setShowTankBattle(false)} />}
      {showTowerDefense && <TowerDefense onClose={() => setShowTowerDefense(false)} />}
      {showZombieSurvival && <ZombieSurvival onClose={() => setShowZombieSurvival(false)} />}
      {showTreasureHunt && <TreasureHunt onClose={() => setShowTreasureHunt(false)} />}
      {showDodgeArena && <DodgeArena onClose={() => setShowDodgeArena(false)} />}
      {showCaptureZone && <CaptureZone onClose={() => setShowCaptureZone(false)} />}
      {showSkyFortress && <SkyFortress onClose={() => setShowSkyFortress(false)} />}
      {showTimeRift && <TimeRift onClose={() => setShowTimeRift(false)} />}
      {showShadowOps && <ShadowOps onClose={() => setShowShadowOps(false)} />}
      {showElementalConquest && <ElementalConquest onClose={() => setShowElementalConquest(false)} />}
      {showMechArena && <MechArena onClose={() => setShowMechArena(false)} />}

      <PlayerSelectDialog
        open={playerSelectOpen}
        onOpenChange={setPlayerSelectOpen}
        gameType={selectedGameType}
        gameTitle={gameTitles[selectedGameType]}
      />

      <SpectateDialog
        open={spectateDialogOpen}
        onOpenChange={setSpectateDialogOpen}
      />
    </div>
  );
}
