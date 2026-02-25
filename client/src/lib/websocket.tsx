import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";
import type {
  Player,
  Message,
  Challenge,
  TicTacToeGame,
  RPSGame,
  RiddleLobby,
  RiddleGame,
  WordScrambleGame,
  NumberGuessGame,
  QuickMathGame,
  ConnectFourGame,
  MemoryMatchLobby,
  MemoryMatchGame,
  TypingRaceLobby,
  TypingRaceGame,
  WerewolfLobby,
  WerewolfGame,
  WerewolfRole,
  SpyHuntLobby,
  SpyHuntGame,
  FpsGame,
  FpsGameMode,
  FpsGunType,
  WebSocketMessage,
  RPSChoice,
  PointOnPointLobby,
  PointOnPointGame,
  PiratesLobby,
  PiratesGame,
  PiratesClass,
  PiratesTeam,
  OutpostRushLobby,
  OutpostRushGame,
  LobbyCount,
  EmojiChainLobby,
  EmojiChainGame,
  WordAssociationLobby,
  WordAssociationGame,
  HangmanLobby,
  HangmanGame,
  TriviaQuizLobby,
  TriviaQuizGame,
  SquidGameLobby,
  SquidGame,
  TruthOrBluffLobby,
  TruthOrBluffGame,
  SpotTheLiarLobby,
  SpotTheLiarGame,
  DirectMessage,
  EscapeShipLobby,
  EscapeShipGame,
  ReactionRaceLobby,
  ReactionRaceGame,
  ColorClashLobby,
  ColorClashGame,
  CastlesLobby,
  CastlesGame,
  CastlesTeam,
  ShipsBattleGame,
  HideSeekLobby,
  HideSeekGame,
  BattleshipLobby,
  BattleshipGame,
  CTFLobby,
  CTFGame,
  CTFTeam,
  SiegeWarLobby,
  SiegeWarGame,
  SiegeWarTeam,
  SiegeWarUnitType,
  SkyFortressLobby,
  SkyFortressGame,
  SkyFortressTeam,
  TimeRiftLobby,
  TimeRiftGame,
  TimeRiftTeam,
  ShadowOpsLobby,
  ShadowOpsGame,
  ShadowOpsTeam,
  ElementalLobby,
  ElementalGame,
  ElementalTeam,
  MechLobby,
  MechGame,
  MechTeam,
  AssassinLobby,
  AssassinGame,
  AssassinTeam,
  WarzoneRoom,
  WarzonePlayerState,
  WarzoneChatMessage,
  WarzoneTeam,
  WarzoneMap,
} from "@shared/schema";
import { API_BASE_URL } from "@/lib/runtime-config";

interface FpsKillNotification {
  killerId: string;
  killerName: string;
  victimId: string;
  victimName: string;
  gun: FpsGunType;
  timestamp: number;
}

interface OpponentLeftNotification {
  game:
    | "tictactoe"
    | "rps"
    | "wordscramble"
    | "numberguess"
    | "quickmath"
    | "connectfour"
    | "memory"
    | "typing";
  opponentName: string;
  message: string;
}

interface ActiveTTTGame {
  id: string;
  player1Name: string;
  player2Name: string;
  spectatorCount: number;
}

interface ActiveWSGame {
  id: string;
  player1Name: string;
  player2Name: string;
  spectatorCount: number;
}

interface ActiveNGGame {
  id: string;
  player1Name: string;
  player2Name: string;
  spectatorCount: number;
}

interface ActiveQMGame {
  id: string;
  player1Name: string;
  player2Name: string;
  spectatorCount: number;
}

interface ActiveC4Game {
  id: string;
  player1Name: string;
  player2Name: string;
  spectatorCount: number;
}

interface ActiveMemoryGame {
  id: string;
  playerNames: string[];
  spectatorCount: number;
}

interface GameLogEntry {
  id: string;
  gameType: string;
  winnerName: string;
  loserName: string;
  timestamp: number;
  isDraw?: boolean;
}

interface ActiveEmoji {
  id: string;
  emoji: string;
  gameType: string;
  gameId: string;
  senderName: string;
}

interface WarzoneLocalPlayerState {
  position: { x: number; y: number; z: number };
  rotation: { x: number; y: number };
  health: number;
  isDead: boolean;
  currentWeapon: number;
  weaponType: string;
}

interface GameState {
  players: Player[];
  messages: Message[];
  currentPlayerId: string | null;
  currentPlayerName: string | null;
  challenges: Challenge[];
  tttGame: TicTacToeGame | null;
  rpsGame: RPSGame | null;
  riddleLobby: RiddleLobby | null;
  riddleGame: RiddleGame | null;
  wsGame: WordScrambleGame | null;
  ngGame: NumberGuessGame | null;
  qmGame: QuickMathGame | null;
  c4Game: ConnectFourGame | null;
  memoryLobby: MemoryMatchLobby | null;
  memoryGame: MemoryMatchGame | null;
  typingLobby: TypingRaceLobby | null;
  typingGame: TypingRaceGame | null;
  werewolfLobby: WerewolfLobby | null;
  werewolfGame: WerewolfGame | null;
  werewolfRole: WerewolfRole | null;
  werewolfTeammates: string[];
  spyHuntLobby: SpyHuntLobby | null;
  spyHuntGame: SpyHuntGame | null;
  isSpy: boolean;
  spyLocation: string | null;
  fpsGame: FpsGame | null;
  fpsKillFeed: FpsKillNotification[];
  pointOnPointLobby: PointOnPointLobby | null;
  pointOnPointGame: PointOnPointGame | null;
  piratesLobby: PiratesLobby | null;
  piratesGame: PiratesGame | null;
  outpostRushLobby: OutpostRushLobby | null;
  outpostRushGame: OutpostRushGame | null;
  outpostRushChatMessages: Array<{
    sender: string;
    message: string;
    id: string;
  }>;
  pointOnPointChatMessages: Array<{
    sender: string;
    message: string;
    id: string;
  }>;
  emojiChainLobby: EmojiChainLobby | null;
  emojiChainGame: EmojiChainGame | null;
  emojiChainChatMessages: Array<{
    sender: string;
    message: string;
    id: string;
  }>;
  wordAssociationLobby: WordAssociationLobby | null;
  wordAssociationGame: WordAssociationGame | null;
  wordAssociationChatMessages: Array<{
    sender: string;
    message: string;
    id: string;
  }>;
  hangmanLobby: HangmanLobby | null;
  hangmanGame: HangmanGame | null;
  hangmanChatMessages: Array<{ sender: string; message: string; id: string }>;
  triviaQuizLobby: TriviaQuizLobby | null;
  triviaQuizGame: TriviaQuizGame | null;
  triviaQuizChatMessages: Array<{
    sender: string;
    message: string;
    id: string;
  }>;
  squidGameLobby: SquidGameLobby | null;
  squidGame: SquidGame | null;
  squidGameChatMessages: Array<{ sender: string; message: string; id: string }>;
  truthOrBluffLobby: TruthOrBluffLobby | null;
  truthOrBluffGame: TruthOrBluffGame | null;
  truthOrBluffChatMessages: Array<{ sender: string; message: string; id: string }>;
  spotTheLiarLobby: SpotTheLiarLobby | null;
  spotTheLiarGame: (SpotTheLiarGame & { playerWord?: string; isLiar?: boolean; liarCaught?: boolean }) | null;
  spotTheLiarChatMessages: Array<{ sender: string; message: string; id: string }>;
  escapeShipLobby: EscapeShipLobby | null;
  escapeShipGame: EscapeShipGame | null;
  escapeShipChatMessages: Array<{ sender: string; message: string; id: string }>;
  reactionRaceLobby: ReactionRaceLobby | null;
  reactionRaceGame: ReactionRaceGame | null;
  reactionRaceChatMessages: Array<{ sender: string; message: string; id: string }>;
  colorClashLobby: ColorClashLobby | null;
  colorClashGame: ColorClashGame | null;
  colorClashChatMessages: Array<{ sender: string; message: string; id: string }>;
  castlesLobby: CastlesLobby | null;
  castlesGame: CastlesGame | null;
  castlesChatMessages: Array<{ sender: string; message: string; id: string }>;
  shipsBattleLobby: { id: string } | null;
  shipsBattleGame: ShipsBattleGame | null;
  hideSeekLobby: HideSeekLobby | null;
  hideSeekGame: HideSeekGame | null;
  hideSeekChatMessages: Array<{ sender: string; message: string; id: string }>;
  battleshipLobby: BattleshipLobby | null;
  battleshipGame: BattleshipGame | null;
  battleshipChatMessages: Array<{ sender: string; message: string; id: string }>;
  ctfLobby: CTFLobby | null;
  ctfGame: CTFGame | null;
  ctfChatMessages: Array<{ sender: string; message: string; id: string }>;
  siegeWarLobby: SiegeWarLobby | null;
  siegeWarGame: SiegeWarGame | null;
  siegeWarChatMessages: Array<{ sender: string; message: string; id: string }>;
  skyFortressLobby: SkyFortressLobby | null;
  skyFortressGame: SkyFortressGame | null;
  skyFortressChatMessages: Array<{ sender: string; message: string; id: string }>;
  timeRiftLobby: TimeRiftLobby | null;
  timeRiftGame: TimeRiftGame | null;
  timeRiftChatMessages: Array<{ sender: string; message: string; id: string }>;
  shadowOpsLobby: ShadowOpsLobby | null;
  shadowOpsGame: ShadowOpsGame | null;
  shadowOpsChatMessages: Array<{ sender: string; message: string; id: string }>;
  elementalLobby: ElementalLobby | null;
  elementalGame: ElementalGame | null;
  elementalChatMessages: Array<{ sender: string; message: string; id: string }>;
  mechLobby: MechLobby | null;
  mechGame: MechGame | null;
  mechChatMessages: Array<{ sender: string; message: string; id: string }>;
  assassinLobby: AssassinLobby | null;
  assassinGame: AssassinGame | null;
  assassinChatMessages: Array<{ sender: string; message: string; id: string }>;
  warzoneRoom: WarzoneRoom | null;
  warzoneStates: WarzonePlayerState[];
  warzoneChatMessages: WarzoneChatMessage[];
  directMessages: DirectMessage[];
  dmConversations: Map<string, DirectMessage[]>;
  currentDmPartner: string | null;
  dmUnreadCounts: Map<string, number>;
  latestDmMessage: DirectMessage | null;
  lobbyCounts: LobbyCount[];
  isConnected: boolean;
  opponentLeftNotification: OpponentLeftNotification | null;
  unreadChatCount: number;
  latestChatMessage: Message | null;
  activeTTTGames: ActiveTTTGame[];
  activeWSGames: ActiveWSGame[];
  activeNGGames: ActiveNGGame[];
  activeQMGames: ActiveQMGame[];
  activeC4Games: ActiveC4Game[];
  activeMemoryGames: ActiveMemoryGame[];
  isSpectating: boolean;
  spectatingGameType: string | null;
  gameLogs: GameLogEntry[];
  isAdmin: boolean;
  isVip: boolean;
  activeEmojis: ActiveEmoji[];
  vips: string[];
}

interface WebSocketContextType extends GameState {
  joinGame: (username: string) => void;
  sendChatMessage: (content: string) => void;
  sendChallenge: (
    toPlayerId: string,
    gameType:
      | "tictactoe"
      | "rps"
      | "wordscramble"
      | "numberguess"
      | "quickmath"
      | "connectfour",
  ) => void;
  respondToChallenge: (challengeId: string, accepted: boolean) => void;
  makeTTTMove: (position: number) => void;
  requestTTTRematch: () => void;
  leaveTTTGame: () => void;
  makeRPSChoice: (choice: RPSChoice) => void;
  requestRPSNextRound: () => void;
  leaveRPSGame: () => void;
  joinRiddleLobby: (vipOnly?: boolean) => void;
  startRiddleGame: () => void;
  leaveRiddleLobby: () => void;
  submitRiddleAnswer: (answer: string) => void;
  submitWSAnswer: (answer: string) => void;
  requestWSNextRound: () => void;
  leaveWSGame: () => void;
  submitNGGuess: (guess: number) => void;
  requestNGNextRound: () => void;
  leaveNGGame: () => void;
  submitQMAnswer: (answer: number) => void;
  requestQMNextRound: () => void;
  leaveQMGame: () => void;
  makeC4Move: (column: number) => void;
  requestC4Rematch: () => void;
  leaveC4Game: () => void;
  joinMemoryLobby: () => void;
  startMemoryGame: () => void;
  leaveMemoryLobby: () => void;
  flipMemoryCard: (cardId: number) => void;
  joinTypingLobby: () => void;
  startTypingGame: () => void;
  leaveTypingLobby: () => void;
  updateTypingProgress: (progress: number, wpm: number) => void;
  finishTypingRace: () => void;
  dismissChallenge: (challengeId: string) => void;
  dismissOpponentLeftNotification: () => void;
  clearUnreadChat: () => void;
  clearLatestChatMessage: () => void;
  clearLatestDmMessage: () => void;
  clearDmUnreadForPartner: (partnerId: string) => void;
  requestActiveTTTGames: () => void;
  spectateTTTGame: (gameId: string) => void;
  stopSpectatingTTT: () => void;
  requestActiveWSGames: () => void;
  spectateWSGame: (gameId: string) => void;
  stopSpectatingWS: () => void;
  requestActiveNGGames: () => void;
  spectateNGGame: (gameId: string) => void;
  stopSpectatingNG: () => void;
  requestActiveQMGames: () => void;
  spectateQMGame: (gameId: string) => void;
  stopSpectatingQM: () => void;
  requestActiveC4Games: () => void;
  spectateC4Game: (gameId: string) => void;
  stopSpectatingC4: () => void;
  requestActiveMemoryGames: () => void;
  spectateMemoryGame: (gameId: string) => void;
  stopSpectatingMemory: () => void;
  joinWerewolfLobby: (vipOnly?: boolean) => void;
  updateWerewolfSettings: (enableSeer: boolean, enableDoctor: boolean) => void;
  startWerewolfGame: () => void;
  leaveWerewolfLobby: () => void;
  werewolfAction: (
    action: "kill" | "protect" | "inspect",
    targetId: string,
  ) => void;
  werewolfVote: (targetId: string) => void;
  joinSpyHuntLobby: () => void;
  startSpyHuntGame: () => void;
  leaveSpyHuntLobby: () => void;
  spyHuntAsk: (targetId: string, question: string) => void;
  spyHuntAnswer: (answer: string) => void;
  spyHuntAccuse: (accusedId: string) => void;
  spyHuntVote: (targetId: string) => void;
  spyHuntGuessLocation: (location: string) => void;
  createFpsLobby: (mode: FpsGameMode, timeLimit: number) => void;
  joinFpsLobby: (code: string, team?: "A" | "B") => void;
  leaveFpsLobby: () => void;
  startFpsGame: () => void;
  fpsPlayerMove: (
    position: { x: number; y: number; z: number },
    rotation: { x: number; y: number },
  ) => void;
  fpsPlayerShoot: (targetId: string) => void;
  fpsPlayerRespawn: (gun: FpsGunType) => void;
  fpsChangeGun: (gun: FpsGunType) => void;
  adminKick: (targetPlayerId: string) => void;
  adminBan: (targetPlayerId: string) => void;
  adminClearChat: () => void;
  adminForceKick: (targetPlayerId: string) => void;
  adminUnban: (ip: string) => void;
  adminGetBannedList: () => void;
  adminToggleVip: (playerId: string) => void;
  bannedIPs: string[];
  vips: string[];
  sendEmojiReaction: (gameType: string, gameId: string, emoji: string) => void;
  clearEmojiReaction: (id: string) => void;
  joinPointOnPointLobby: () => void;
  startPointOnPointGame: () => void;
  leavePointOnPointLobby: () => void;
  submitPointOnPointSentence: (sentence: string) => void;
  endPointOnPointGame: () => void;
  joinPiratesLobby: () => void;
  selectPiratesTeam: (team: PiratesTeam) => void;
  selectPiratesClass: (playerClass: PiratesClass) => void;
  startPiratesGame: () => void;
  leavePiratesLobby: () => void;
  piratesMove: (x: number, y: number) => void;
  piratesShoot: (targetX: number, targetY: number) => void;
  joinOutpostRushLobby: () => void;
  selectOutpostRushTeam: (team: "alpha" | "beta") => void;
  startOutpostRushGame: () => void;
  leaveOutpostRushLobby: () => void;
  outpostRushMove: (x: number, y: number) => void;
  outpostRushCapture: (outpostId: string) => void;
  outpostRushBuildDefense: (
    type: "wall" | "turret" | "trap",
    x: number,
    y: number,
  ) => void;
  outpostRushUpgradeWeapon: () => void;
  outpostRushAttack: (targetId: string) => void;
  outpostRushRevive: (targetId: string) => void;
  outpostRushCollectResources: (outpostId: string) => void;
  sendOutpostRushChat: (message: string) => void;
  sendPointOnPointChat: (message: string) => void;
  clearOutpostRushChat: () => void;
  clearPointOnPointChat: () => void;
  requestLobbyCounts: () => void;
  joinEmojiChainLobby: () => void;
  startEmojiChainGame: () => void;
  leaveEmojiChainLobby: () => void;
  submitEmojiChainGuess: (guess: string) => void;
  requestEmojiChainHint: () => void;
  sendEmojiChainChat: (message: string) => void;
  clearEmojiChainChat: () => void;
  joinWordAssociationLobby: () => void;
  startWordAssociationGame: () => void;
  leaveWordAssociationLobby: () => void;
  submitWordAssociationWord: (word: string) => void;
  sendWordAssociationChat: (message: string) => void;
  clearWordAssociationChat: () => void;
  joinHangmanLobby: () => void;
  startHangmanGame: () => void;
  leaveHangmanLobby: () => void;
  setHangmanWord: (word: string) => void;
  guessHangmanLetter: (letter: string) => void;
  sendHangmanChat: (message: string) => void;
  clearHangmanChat: () => void;
  joinTriviaQuizLobby: () => void;
  startTriviaQuizGame: () => void;
  leaveTriviaQuizLobby: () => void;
  submitTriviaQuizAnswer: (answerIndex: number) => void;
  sendTriviaQuizChat: (message: string) => void;
  clearTriviaQuizChat: () => void;
  deleteMessage: (messageId: string) => void;
  // Squid Game functions
  joinSquidGameLobby: (vipOnly?: boolean) => void;
  startSquidGame: () => void;
  leaveSquidGameLobby: () => void;
  squidGameAction: (action: string, data: any) => void;
  sendSquidGameChat: (message: string) => void;
  clearSquidGameChat: () => void;
  // Truth or Bluff functions
  joinTruthOrBluffLobby: () => void;
  startTruthOrBluffGame: () => void;
  leaveTruthOrBluffLobby: () => void;
  submitTruthOrBluffStory: (story: string, isTruth: boolean) => void;
  voteTruthOrBluff: (voteTruth: boolean) => void;
  sendTruthOrBluffChat: (message: string) => void;
  clearTruthOrBluffChat: () => void;
  // Spot the Liar functions
  joinSpotTheLiarLobby: () => void;
  startSpotTheLiarGame: () => void;
  leaveSpotTheLiarLobby: () => void;
  submitSpotTheLiarDescription: (description: string) => void;
  voteSpotTheLiar: (votedPlayerId: string) => void;
  sendSpotTheLiarChat: (message: string) => void;
  clearSpotTheLiarChat: () => void;
  // Escape Ship functions
  joinEscapeShipLobby: (vipOnly?: boolean) => void;
  startEscapeShipGame: () => void;
  leaveEscapeShipLobby: () => void;
  escapeShipAction: (action: string, data: any) => void;
  sendEscapeShipChat: (message: string) => void;
  clearEscapeShipChat: () => void;
  // Direct Message functions
  sendDirectMessage: (toPlayerId: string, content: string) => void;
  requestDmHistory: (partnerId: string) => void;
  setCurrentDmPartner: (partnerId: string | null) => void;
  // Reaction Race functions
  joinReactionRaceLobby: () => void;
  leaveReactionRaceLobby: () => void;
  startReactionRaceGame: () => void;
  reactReactionRace: () => void;
  sendReactionRaceChat: (message: string) => void;
  clearReactionRaceChat: () => void;
  // Color Clash functions
  joinColorClashLobby: () => void;
  joinCastlesLobby: (vipOnly?: boolean) => void;
  leaveCastlesLobby: (lobbyId: string) => void;
  setCastlesTeam: (lobbyId: string, team: CastlesTeam) => void;
  setCastlesReady: (lobbyId: string, ready: boolean) => void;
  startCastlesGame: (lobbyId: string) => void;
  sendCastlesCommand: (gameId: string, command: string, options: any) => void;
  sendCastlesChatMessage: (gameId: string, message: string) => void;
  leaveCastlesGame: (gameId: string) => void;
  joinShipsBattleLobby: () => void;
  leaveShipsBattleLobby: () => void;
  startShipsBattleGame: (opponentId: string, opponentName: string) => void;
  placeShipsBattleShip: (gameId: string, shipSize: number, positions: Array<{ x: number; y: number }>) => void;
  setShipsBattleReady: (gameId: string) => void;
  shootShipsBattle: (gameId: string, x: number, y: number) => void;
  leaveShipsBattleGame: (gameId: string) => void;
  rematchShipsBattle: (gameId: string) => void;
  leaveColorClashLobby: () => void;
  startColorClashGame: () => void;
  inputColorClash: (color: string) => void;
  submitColorClash: () => void;
  sendColorClashChat: (message: string) => void;
  clearColorClashChat: () => void;
  // Hide and Seek functions
  joinHideSeekLobby: (vipOnly?: boolean) => void;
  startHideSeekGame: () => void;
  leaveHideSeekLobby: () => void;
  setHideSeekSettings: (seekerMode: "random" | "host") => void;
  hideSeekMove: (x: number, y: number, z: number, rotation: number) => void;
  hideSeekAction: (action: "crouch" | "stand" | "jump" | "eliminate", targetId?: string) => void;
  sendHideSeekChat: (message: string) => void;
  clearHideSeekChat: () => void;
  createWarzoneRoom: (
    displayName: string,
    team: WarzoneTeam,
    map: WarzoneMap,
  ) => void;
  joinWarzoneRoom: (code: string, displayName: string, team: WarzoneTeam) => void;
  leaveWarzoneRoom: () => void;
  startWarzoneGame: () => void;
  updateWarzoneState: (state: WarzoneLocalPlayerState) => void;
  sendWarzoneChat: (message: string) => void;
  // Battleship functions
  joinBattleshipLobby: () => void;
  leaveBattleshipLobby: () => void;
  startBattleshipGame: (lobbyId: string) => void;
  placeBattleshipShip: (gameId: string, size: number, positions: Array<{ x: number; y: number }>) => void;
  readyBattleship: (gameId: string) => void;
  shootBattleship: (gameId: string, x: number, y: number) => void;
  leaveBattleshipGame: (gameId: string) => void;
  sendBattleshipChat: (message: string) => void;
  // CTF functions
  joinCTFLobby: () => void;
  leaveCTFLobby: () => void;
  setCTFTeam: (lobbyId: string, team: CTFTeam) => void;
  setCTFReady: (lobbyId: string, ready: boolean) => void;
  startCTFGame: (lobbyId: string) => void;
  moveCTF: (gameId: string, x: number, y: number) => void;
  tagCTF: (gameId: string, targetId: string) => void;
  leaveCTFGame: (gameId: string) => void;
  sendCTFChat: (message: string) => void;
  // Siege War functions
  joinSiegeWarLobby: () => void;
  leaveSiegeWarLobby: () => void;
  setSiegeWarTeam: (lobbyId: string, team: SiegeWarTeam) => void;
  setSiegeWarReady: (lobbyId: string, ready: boolean) => void;
  startSiegeWarGame: (lobbyId: string) => void;
  spawnSiegeWarUnit: (gameId: string, unitType: SiegeWarUnitType) => void;
  moveSiegeWarUnits: (gameId: string, unitIds: string[], targetX: number, targetY: number) => void;
  attackSiegeWar: (gameId: string, unitIds: string[], targetId: string) => void;
  leaveSiegeWarGame: (gameId: string) => void;
  sendSiegeWarChat: (message: string) => void;
  // Sky Fortress functions
  joinSkyFortressLobby: () => void;
  leaveSkyFortressLobby: () => void;
  setSkyFortressTeam: (lobbyId: string, team: SkyFortressTeam) => void;
  setSkyFortressReady: (lobbyId: string, ready: boolean) => void;
  startSkyFortressGame: (lobbyId: string) => void;
  moveSkyFortress: (gameId: string, y: number) => void;
  fireSkyFortress: (gameId: string, targetX: number, targetY: number, weaponType: "missile" | "drone") => void;
  sendSkyFortressChat: (message: string) => void;
  // Time Rift functions
  joinTimeRiftLobby: () => void;
  leaveTimeRiftLobby: () => void;
  setTimeRiftTeam: (lobbyId: string, team: TimeRiftTeam) => void;
  setTimeRiftReady: (lobbyId: string, ready: boolean) => void;
  startTimeRiftGame: (lobbyId: string) => void;
  moveTimeRift: (gameId: string, x: number, y: number) => void;
  shootTimeRift: (gameId: string, targetX: number, targetY: number) => void;
  sendTimeRiftChat: (message: string) => void;
  // Shadow Ops functions
  joinShadowOpsLobby: () => void;
  leaveShadowOpsLobby: () => void;
  setShadowOpsTeam: (lobbyId: string, team: ShadowOpsTeam) => void;
  setShadowOpsReady: (lobbyId: string, ready: boolean) => void;
  startShadowOpsGame: (lobbyId: string) => void;
  moveShadowOps: (gameId: string, x: number, y: number) => void;
  stealthShadowOps: (gameId: string, stealth: boolean) => void;
  sendShadowOpsChat: (message: string) => void;
  // Elemental Conquest functions
  joinElementalLobby: () => void;
  leaveElementalLobby: () => void;
  setElementalTeam: (lobbyId: string, team: ElementalTeam) => void;
  setElementalReady: (lobbyId: string, ready: boolean) => void;
  startElementalGame: (lobbyId: string) => void;
  moveElemental: (gameId: string, x: number, y: number) => void;
  castElemental: (gameId: string, targetX: number, targetY: number, element: "fire" | "water" | "earth" | "air", isArea: boolean) => void;
  sendElementalChat: (message: string) => void;
  // Mech Arena functions
  joinMechLobby: () => void;
  leaveMechLobby: () => void;
  setMechTeam: (lobbyId: string, team: MechTeam) => void;
  setMechReady: (lobbyId: string, ready: boolean) => void;
  startMechGame: (lobbyId: string) => void;
  moveMech: (gameId: string, x: number, y: number) => void;
  shootMech: (gameId: string, targetX: number, targetY: number) => void;
  upgradeMech: (gameId: string) => void;
  sendMechChat: (message: string) => void;
  // Assassin's Grid functions
  joinAssassinLobby: () => void;
  leaveAssassinLobby: () => void;
  setAssassinTeam: (lobbyId: string, team: AssassinTeam) => void;
  setAssassinReady: (lobbyId: string, ready: boolean) => void;
  startAssassinGame: (lobbyId: string) => void;
  moveAssassin: (gameId: string, gridX: number, gridY: number) => void;
  attackAssassin: (gameId: string, targetId: string) => void;
  hideAssassin: (gameId: string) => void;
  sendAssassinChat: (message: string) => void;
  isVip: boolean;
}

const WebSocketContext = createContext<WebSocketContextType | null>(null);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<GameState>(() => {
    const savedName =
      typeof window !== "undefined"
        ? sessionStorage.getItem("gameHub_username")
        : null;
    return {
      players: [],
      messages: [],
      currentPlayerId: null,
      currentPlayerName: savedName,
      challenges: [],
      tttGame: null,
      rpsGame: null,
      riddleLobby: null,
      riddleGame: null,
      wsGame: null,
      ngGame: null,
      qmGame: null,
      c4Game: null,
      memoryLobby: null,
      memoryGame: null,
      typingLobby: null,
      typingGame: null,
      werewolfLobby: null,
      werewolfGame: null,
      werewolfRole: null,
      werewolfTeammates: [],
      spyHuntLobby: null,
      spyHuntGame: null,
      isSpy: false,
      spyLocation: null,
      fpsGame: null,
      fpsKillFeed: [],
      pointOnPointLobby: null,
      pointOnPointGame: null,
      piratesLobby: null,
      piratesGame: null,
      outpostRushLobby: null,
      outpostRushGame: null,
      outpostRushChatMessages: [],
      pointOnPointChatMessages: [],
      emojiChainLobby: null,
      emojiChainGame: null,
      emojiChainChatMessages: [],
      wordAssociationLobby: null,
      wordAssociationGame: null,
      wordAssociationChatMessages: [],
      hangmanLobby: null,
      hangmanGame: null,
      hangmanChatMessages: [],
      triviaQuizLobby: null,
      triviaQuizGame: null,
      triviaQuizChatMessages: [],
      squidGameLobby: null,
      squidGame: null,
      squidGameChatMessages: [],
      truthOrBluffLobby: null,
      truthOrBluffGame: null,
      truthOrBluffChatMessages: [],
      spotTheLiarLobby: null,
      spotTheLiarGame: null,
      spotTheLiarChatMessages: [],
      escapeShipLobby: null,
      escapeShipGame: null,
      escapeShipChatMessages: [],
      reactionRaceLobby: null,
      reactionRaceGame: null,
      reactionRaceChatMessages: [],
      colorClashLobby: null,
      colorClashGame: null,
      colorClashChatMessages: [],
      castlesLobby: null,
      castlesGame: null,
      castlesChatMessages: [],
      shipsBattleLobby: null,
      shipsBattleGame: null,
      hideSeekLobby: null,
      hideSeekGame: null,
      hideSeekChatMessages: [],
      battleshipLobby: null,
      battleshipGame: null,
      battleshipChatMessages: [],
      ctfLobby: null,
      ctfGame: null,
      ctfChatMessages: [],
      siegeWarLobby: null,
      siegeWarGame: null,
      siegeWarChatMessages: [],
      skyFortressLobby: null,
      skyFortressGame: null,
      skyFortressChatMessages: [],
      timeRiftLobby: null,
      timeRiftGame: null,
      timeRiftChatMessages: [],
      shadowOpsLobby: null,
      shadowOpsGame: null,
      shadowOpsChatMessages: [],
      elementalLobby: null,
      elementalGame: null,
      elementalChatMessages: [],
      mechLobby: null,
      mechGame: null,
      mechChatMessages: [],
      assassinLobby: null,
      assassinGame: null,
      assassinChatMessages: [],
      warzoneRoom: null,
      warzoneStates: [],
      warzoneChatMessages: [],
      directMessages: [],
      dmConversations: new Map(),
      currentDmPartner: null,
      dmUnreadCounts: new Map(),
      latestDmMessage: null,
      lobbyCounts: [],
      isConnected: false,
      opponentLeftNotification: null,
      unreadChatCount: 0,
      latestChatMessage: null,
      activeTTTGames: [],
      activeWSGames: [],
      activeNGGames: [],
      activeQMGames: [],
      activeC4Games: [],
      activeMemoryGames: [],
      isSpectating: false,
      spectatingGameType: null,
      gameLogs: [],
      isAdmin: false,
      isVip: false,
      bannedIPs: [],
      vips: [],
      activeEmojis: [],
    };
  });

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const usernameRef = useRef<string | null>(state.currentPlayerName);
  const pendingJoinRef = useRef<string | null>(null);
  const hasJoinedRef = useRef<boolean>(false);

  useEffect(() => {
    usernameRef.current = state.currentPlayerName;
    if (state.currentPlayerName) {
      sessionStorage.setItem("gameHub_username", state.currentPlayerName);
    }
  }, [state.currentPlayerName]);

  const connect = useCallback(() => {
    const configuredWsUrl = import.meta.env.VITE_WS_URL?.trim() || API_BASE_URL;
    const isVercelHost = window.location.hostname.endsWith(".vercel.app");

    if (!configuredWsUrl && isVercelHost) {
      console.warn(
        "WebSocket disabled on Vercel deployment. Set VITE_WS_URL to an external WebSocket backend.",
      );
      setState((prev) => ({ ...prev, isConnected: false }));
      return;
    }

    let wsUrl: string;
    if (configuredWsUrl) {
      wsUrl = configuredWsUrl.endsWith("/ws")
        ? configuredWsUrl
        : `${configuredWsUrl.replace(/\/+$/, "")}/ws`;
      wsUrl = wsUrl.replace(/^http:\/\//i, "ws://").replace(/^https:\/\//i, "wss://");
    } else {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${protocol}//${window.location.host}/ws`;
    }

    const socket = new WebSocket(wsUrl);

    socket.onopen = () => {
      setState((prev) => ({ ...prev, isConnected: true }));
      const username = pendingJoinRef.current || usernameRef.current;
      if (username && !hasJoinedRef.current) {
        socket.send(JSON.stringify({ type: "join", username }));
        hasJoinedRef.current = true;
      }
    };

    socket.onclose = () => {
      setState((prev) => ({ ...prev, isConnected: false }));
      hasJoinedRef.current = false;
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 2000);
    };

    socket.onerror = () => {
      socket.close();
    };

    socket.onmessage = (event) => {
      const data = JSON.parse(event.data) as WebSocketMessage;

      switch (data.type) {
        case "your_id":
          setState((prev) => ({
            ...prev,
            currentPlayerId: data.playerId,
            isAdmin: data.isAdmin || false,
            isVip: data.isVip || false,
          }));
          break;
        case "players_list":
          setState((prev) => ({ ...prev, players: data.players }));
          break;
        case "player_joined":
          setState((prev) => ({
            ...prev,
            players: [
              ...prev.players.filter((p) => p.id !== data.player.id),
              data.player,
            ],
          }));
          break;
        case "player_left":
          setState((prev) => ({
            ...prev,
            players: prev.players.filter((p) => p.id !== data.playerId),
          }));
          break;
        case "chat_message":
          setState((prev) => ({
            ...prev,
            messages: [...prev.messages, data.message],
            unreadChatCount: prev.unreadChatCount + 1,
            latestChatMessage:
              data.message.playerId !== prev.currentPlayerId
                ? data.message
                : prev.latestChatMessage,
          }));
          break;
        case "chat_history":
          setState((prev) => ({ ...prev, messages: data.messages }));
          break;
        case "chat_cleared":
          setState((prev) => ({ ...prev, messages: [] }));
          break;
        case "kicked":
        case "banned":
          alert(data.message);
          sessionStorage.removeItem("gameHub_username");
          setState((prev) => ({
            ...prev,
            currentPlayerName: null,
            currentPlayerId: null,
          }));
          break;
        case "system_message":
          setState((prev) => ({
            ...prev,
            messages: [
              ...prev.messages,
              {
                id: `system-${Date.now()}`,
                playerId: "system",
                playerName: "System",
                content: data.message,
                timestamp: Date.now(),
              },
            ],
          }));
          break;
        case "challenge_received":
          setState((prev) => ({
            ...prev,
            challenges: [...prev.challenges, data.challenge],
          }));
          break;
        case "challenge_declined":
          setState((prev) => ({
            ...prev,
            challenges: prev.challenges.filter(
              (c) => c.id !== data.challengeId,
            ),
          }));
          break;
        case "game_start_ttt":
        case "game_update_ttt":
          setState((prev) => ({ ...prev, tttGame: data.game }));
          break;
        case "game_start_rps":
        case "game_update_rps":
          setState((prev) => ({ ...prev, rpsGame: data.game }));
          break;
        case "lobby_update_riddle":
          setState((prev) => ({ ...prev, riddleLobby: data.lobby }));
          break;
        case "game_update_riddle":
          setState((prev) => ({
            ...prev,
            riddleGame: data.game,
            riddleLobby:
              data.game.status === "finished" ? null : prev.riddleLobby,
          }));
          break;
        case "error":
          console.error("WebSocket error:", data.message);
          if (data.message.includes("Username already in use")) {
            sessionStorage.removeItem("gameHub_username");
            setState((prev) => ({ ...prev, currentPlayerName: null }));
          }
          break;
        case "opponent_left":
          setState((prev) => ({
            ...prev,
            opponentLeftNotification: {
              game: data.game,
              opponentName: data.opponentName,
              message: data.message,
            },
          }));
          break;
        case "game_start_ws":
        case "game_update_ws":
          setState((prev) => ({ ...prev, wsGame: data.game }));
          break;
        case "game_start_ng":
        case "game_update_ng":
          setState((prev) => ({ ...prev, ngGame: data.game }));
          break;
        case "game_start_qm":
        case "game_update_qm":
          setState((prev) => ({ ...prev, qmGame: data.game }));
          break;
        case "active_games_ttt":
          setState((prev) => ({ ...prev, activeTTTGames: data.games }));
          break;
        case "active_games_ws":
          setState((prev) => ({ ...prev, activeWSGames: data.games }));
          break;
        case "active_games_ng":
          setState((prev) => ({ ...prev, activeNGGames: data.games }));
          break;
        case "active_games_qm":
          setState((prev) => ({ ...prev, activeQMGames: data.games }));
          break;
        case "active_games_c4":
          setState((prev) => ({ ...prev, activeC4Games: data.games }));
          break;
        case "active_games_memory":
          setState((prev) => ({ ...prev, activeMemoryGames: data.games }));
          break;
        case "game_start_c4":
        case "game_update_c4":
          setState((prev) => ({ ...prev, c4Game: data.game }));
          break;
        case "lobby_update_memory":
          setState((prev) => ({ ...prev, memoryLobby: data.lobby }));
          break;
        case "game_update_memory":
          setState((prev) => ({
            ...prev,
            memoryGame: data.game,
            memoryLobby:
              data.game.status === "finished" ? null : prev.memoryLobby,
          }));
          break;
        case "lobby_update_typing":
          setState((prev) => ({ ...prev, typingLobby: data.lobby }));
          break;
        case "game_update_typing":
          setState((prev) => ({
            ...prev,
            typingGame: data.game,
            typingLobby:
              data.game.status === "finished" ? null : prev.typingLobby,
          }));
          break;
        case "game_log":
          setState((prev) => ({
            ...prev,
            gameLogs: [data.log, ...prev.gameLogs].slice(0, 50),
          }));
          break;
        case "banned_list":
          setState((prev) => ({ ...prev, bannedIPs: data.bannedIPs || [] }));
          break;
        case "vip_status_changed":
          setState((prev) => {
            if (data.playerId === prev.currentPlayerId) {
              return { ...prev, isVip: data.isVip };
            }
            return prev;
          });
          break;
        case "message_deleted":
          setState((prev) => ({
            ...prev,
            messages: prev.messages.filter((m) => m.id !== data.messageId),
          }));
          break;
        case "admin_unban_success":
          break;
        case "game_ended_spyhunt":
          setState((prev) => ({
            ...prev,
            spyHuntGame: null,
            spyHuntLobby: null,
            isSpy: false,
            spyLocation: null,
          }));
          break;
        case "lobby_update_werewolf":
          setState((prev) => ({ ...prev, werewolfLobby: data.lobby }));
          break;
        case "game_update_werewolf":
          setState((prev) => ({
            ...prev,
            werewolfGame: data.game,
            werewolfRole: data.playerRole || prev.werewolfRole,
            werewolfTeammates: data.teammates || prev.werewolfTeammates,
            werewolfLobby:
              data.game?.status === "finished" ? null : prev.werewolfLobby,
          }));
          break;
        case "lobby_update_spyhunt":
          setState((prev) => ({ ...prev, spyHuntLobby: data.lobby }));
          break;
        case "game_update_spyhunt":
          setState((prev) => ({
            ...prev,
            spyHuntGame: data.game,
            isSpy: data.isSpy !== undefined ? data.isSpy : prev.isSpy,
            spyLocation:
              data.location !== undefined ? data.location : prev.spyLocation,
            spyHuntLobby:
              data.game?.status === "finished" ? null : prev.spyHuntLobby,
          }));
          break;
        case "fps_lobby_update":
        case "fps_game_update":
          setState((prev) => ({ ...prev, fpsGame: data.game }));
          break;
        case "fps_game_end":
          setState((prev) => ({ ...prev, fpsGame: data.game }));
          break;
        case "fps_kill_notification":
          setState((prev) => ({
            ...prev,
            fpsKillFeed: [
              {
                killerId: data.killerId,
                killerName: data.killerName,
                victimId: data.victimId,
                victimName: data.victimName,
                gun: data.gun,
                timestamp: Date.now(),
              },
              ...prev.fpsKillFeed,
            ].slice(0, 10),
          }));
          break;
        case "fps_player_left":
          break;
        case "lobby_update_pointonpoint":
          setState((prev) => ({ ...prev, pointOnPointLobby: data.lobby }));
          break;
        case "game_update_pointonpoint":
          setState((prev) => ({
            ...prev,
            pointOnPointGame: data.game,
            pointOnPointLobby:
              data.game?.status === "finished" ? null : prev.pointOnPointLobby,
          }));
          break;
        case "game_start_pointonpoint":
          setState((prev) => ({
            ...prev,
            pointOnPointGame: data.game,
            pointOnPointLobby: null,
          }));
          break;
        case "pointonpoint_left":
          setState((prev) => ({
            ...prev,
            pointOnPointLobby: null,
            pointOnPointGame: null,
          }));
          break;
        case "lobby_counts_update":
          setState((prev) => ({ ...prev, lobbyCounts: data.lobbyCounts }));
          break;
        case "lobby_update_pirates":
          setState((prev) => ({ ...prev, piratesLobby: data.lobby }));
          break;
        case "game_update_pirates":
          setState((prev) => ({
            ...prev,
            piratesGame: data.game,
            piratesLobby:
              data.game?.status === "finished" ? null : prev.piratesLobby,
          }));
          break;
        case "lobby_update_outpostrush":
          setState((prev) => ({ ...prev, outpostRushLobby: data.lobby }));
          break;
        case "game_update_outpostrush":
          setState((prev) => ({
            ...prev,
            outpostRushGame: data.game,
            outpostRushLobby:
              data.game?.status === "finished" ? null : prev.outpostRushLobby,
          }));
          break;
        case "outpostrush_left":
          setState((prev) => ({
            ...prev,
            outpostRushLobby: null,
            outpostRushGame: null,
            outpostRushChatMessages: [],
          }));
          break;
        case "outpostrush_chat_message":
          setState((prev) => ({
            ...prev,
            outpostRushChatMessages: [
              ...prev.outpostRushChatMessages,
              {
                sender: data.sender,
                message: data.message,
                id: `${Date.now()}-${Math.random()}`,
              },
            ],
          }));
          break;
        case "pointonpoint_chat_message":
          setState((prev) => ({
            ...prev,
            pointOnPointChatMessages: [
              ...prev.pointOnPointChatMessages,
              {
                sender: data.sender,
                message: data.message,
                id: `${Date.now()}-${Math.random()}`,
              },
            ],
          }));
          break;
        case "lobby_counts":
          setState((prev) => ({ ...prev, lobbyCounts: data.counts }));
          break;
        case "lobby_update_emojichain":
          setState((prev) => ({ ...prev, emojiChainLobby: data.lobby }));
          break;
        case "game_update_emojichain":
          setState((prev) => ({
            ...prev,
            emojiChainGame: data.game,
            emojiChainLobby:
              data.game?.status === "finished" ? null : prev.emojiChainLobby,
          }));
          break;
        case "emojichain_chat_message":
          setState((prev) => ({
            ...prev,
            emojiChainChatMessages: [
              ...prev.emojiChainChatMessages,
              {
                sender: data.sender,
                message: data.message,
                id: `${Date.now()}-${Math.random()}`,
              },
            ],
          }));
          break;
        case "emojichain_left":
          setState((prev) => ({
            ...prev,
            emojiChainLobby: null,
            emojiChainGame: null,
            emojiChainChatMessages: [],
          }));
          break;
        case "lobby_update_wordassociation":
          setState((prev) => ({ ...prev, wordAssociationLobby: data.lobby }));
          break;
        case "game_update_wordassociation":
          setState((prev) => ({
            ...prev,
            wordAssociationGame: data.game,
            wordAssociationLobby:
              data.game?.status === "finished"
                ? null
                : prev.wordAssociationLobby,
          }));
          break;
        case "wordassociation_chat_message":
          setState((prev) => ({
            ...prev,
            wordAssociationChatMessages: [
              ...prev.wordAssociationChatMessages,
              {
                sender: data.sender,
                message: data.message,
                id: `${Date.now()}-${Math.random()}`,
              },
            ],
          }));
          break;
        case "wordassociation_left":
          setState((prev) => ({
            ...prev,
            wordAssociationLobby: null,
            wordAssociationGame: null,
            wordAssociationChatMessages: [],
          }));
          break;
        case "lobby_update_hangman":
          setState((prev) => ({ ...prev, hangmanLobby: data.lobby }));
          break;
        case "game_update_hangman":
          setState((prev) => ({
            ...prev,
            hangmanGame: data.game,
            hangmanLobby:
              data.game?.status === "finished" ? null : prev.hangmanLobby,
          }));
          break;
        case "hangman_chat_message":
          setState((prev) => ({
            ...prev,
            hangmanChatMessages: [
              ...prev.hangmanChatMessages,
              {
                sender: data.sender,
                message: data.message,
                id: `${Date.now()}-${Math.random()}`,
              },
            ],
          }));
          break;
        case "hangman_left":
          setState((prev) => ({
            ...prev,
            hangmanLobby: null,
            hangmanGame: null,
            hangmanChatMessages: [],
          }));
          break;
        case "lobby_update_triviaquiz":
          setState((prev) => ({ ...prev, triviaQuizLobby: data.lobby }));
          break;
        case "game_update_triviaquiz":
          setState((prev) => ({
            ...prev,
            triviaQuizGame: data.game,
            triviaQuizLobby:
              data.game?.status === "finished" ? null : prev.triviaQuizLobby,
          }));
          break;
        case "triviaquiz_chat_message":
          setState((prev) => ({
            ...prev,
            triviaQuizChatMessages: [
              ...prev.triviaQuizChatMessages,
              {
                sender: data.sender,
                message: data.message,
                id: `${Date.now()}-${Math.random()}`,
              },
            ],
          }));
          break;
        case "triviaquiz_left":
          setState((prev) => ({
            ...prev,
            triviaQuizLobby: null,
            triviaQuizGame: null,
            triviaQuizChatMessages: [],
          }));
          break;
        case "lobby_update_squidgame":
          setState((prev) => ({ ...prev, squidGameLobby: data.lobby }));
          break;
        case "game_update_squidgame":
          setState((prev) => ({
            ...prev,
            squidGame: data.game,
            squidGameLobby:
              data.game?.status === "finished" ? null : prev.squidGameLobby,
          }));
          break;
        case "squidgame_chat_message":
          setState((prev) => ({
            ...prev,
            squidGameChatMessages: [
              ...prev.squidGameChatMessages,
              {
                sender: data.sender,
                message: data.message,
                id: `${Date.now()}-${Math.random()}`,
              },
            ],
          }));
          break;
        case "squidgame_left":
          setState((prev) => ({
            ...prev,
            squidGameLobby: null,
            squidGame: null,
            squidGameChatMessages: [],
          }));
          break;
        case "lobby_update_truthorbluff":
          setState((prev) => ({ ...prev, truthOrBluffLobby: data.lobby }));
          break;
        case "game_update_truthorbluff":
          setState((prev) => ({
            ...prev,
            truthOrBluffGame: data.game,
            truthOrBluffLobby:
              data.game?.status === "finished" ? null : prev.truthOrBluffLobby,
          }));
          break;
        case "truthorbluff_chat_message":
          setState((prev) => ({
            ...prev,
            truthOrBluffChatMessages: [
              ...prev.truthOrBluffChatMessages,
              {
                sender: data.sender,
                message: data.message,
                id: `${Date.now()}-${Math.random()}`,
              },
            ],
          }));
          break;
        case "truthorbluff_left":
          setState((prev) => ({
            ...prev,
            truthOrBluffLobby: null,
            truthOrBluffGame: null,
            truthOrBluffChatMessages: [],
          }));
          break;
        case "lobby_update_spottheliar":
          setState((prev) => ({ ...prev, spotTheLiarLobby: data.lobby }));
          break;
        case "game_update_spottheliar":
          setState((prev) => ({
            ...prev,
            spotTheLiarGame: data.game,
            spotTheLiarLobby:
              data.game?.status === "finished" ? null : prev.spotTheLiarLobby,
          }));
          break;
        case "spottheliar_chat_message":
          setState((prev) => ({
            ...prev,
            spotTheLiarChatMessages: [
              ...prev.spotTheLiarChatMessages,
              {
                sender: data.sender,
                message: data.message,
                id: `${Date.now()}-${Math.random()}`,
              },
            ],
          }));
          break;
        case "spottheliar_left":
          setState((prev) => ({
            ...prev,
            spotTheLiarLobby: null,
            spotTheLiarGame: null,
            spotTheLiarChatMessages: [],
          }));
          break;
        case "lobby_update_escapeship":
          setState((prev) => ({ ...prev, escapeShipLobby: data.lobby }));
          break;
        case "game_update_escapeship":
          setState((prev) => ({
            ...prev,
            escapeShipGame: data.game,
            escapeShipLobby:
              data.game?.status === "finished" ? null : prev.escapeShipLobby,
          }));
          break;
        case "escapeship_chat_message":
          setState((prev) => ({
            ...prev,
            escapeShipChatMessages: [
              ...prev.escapeShipChatMessages,
              {
                sender: data.sender,
                message: data.message,
                id: `${Date.now()}-${Math.random()}`,
              },
            ],
          }));
          break;
        case "escapeship_left":
          setState((prev) => ({
            ...prev,
            escapeShipLobby: null,
            escapeShipGame: null,
            escapeShipChatMessages: [],
          }));
          break;
        case "escapeship_game_ended":
          setState((prev) => ({
            ...prev,
            escapeShipLobby: null,
            escapeShipGame: null,
            escapeShipChatMessages: [],
          }));
          break;
        case "lobby_update_reactionrace":
          setState((prev) => ({ ...prev, reactionRaceLobby: data.lobby }));
          break;
        case "game_update_reactionrace":
          setState((prev) => ({
            ...prev,
            reactionRaceGame: data.game,
            reactionRaceLobby:
              data.game?.status === "finished" ? null : prev.reactionRaceLobby,
          }));
          break;
        case "reactionrace_chat_message":
          setState((prev) => ({
            ...prev,
            reactionRaceChatMessages: [
              ...prev.reactionRaceChatMessages,
              {
                sender: data.sender,
                message: data.message,
                id: `${Date.now()}-${Math.random()}`,
              },
            ],
          }));
          break;
        case "reactionrace_left":
          setState((prev) => ({
            ...prev,
            reactionRaceLobby: null,
            reactionRaceGame: null,
            reactionRaceChatMessages: [],
          }));
          break;
        case "reactionrace_game_ended":
          setState((prev) => ({
            ...prev,
            reactionRaceLobby: null,
            reactionRaceGame: null,
            reactionRaceChatMessages: [],
          }));
          break;
        case "lobby_update_colorclash":
          setState((prev) => ({ ...prev, colorClashLobby: data.lobby, colorClashGame: null }));
          break;
        case "lobby_update_castles":
          setState((prev) => ({ ...prev, castlesLobby: data.lobby }));
          break;
        case "castles_left":
          setState((prev) => ({ ...prev, castlesLobby: null, castlesGame: null }));
          break;
        case "game_update_castles":
          setState((prev) => ({ ...prev, castlesGame: data.game, castlesLobby: null }));
          break;
        case "castles_chat_message":
          setState((prev) => ({
            ...prev,
            castlesChatMessages: [...prev.castlesChatMessages, { sender: data.sender, message: data.message, id: Date.now().toString() }]
          }));
          break;
        case "lobby_update_shipsbattle":
          setState((prev) => ({ ...prev, shipsBattleLobby: data.lobby }));
          break;
        case "shipsbattle_left":
          setState((prev) => ({ ...prev, shipsBattleLobby: null, shipsBattleGame: null }));
          break;
        case "game_update_shipsbattle":
          setState((prev) => ({ ...prev, shipsBattleGame: data.game, shipsBattleLobby: null }));
          break;
        case "game_update_colorclash":
          setState((prev) => ({
            ...prev,
            colorClashGame: data.game,
            colorClashLobby:
              data.game?.status === "finished" ? null : prev.colorClashLobby,
          }));
          break;
        case "colorclash_chat_message":
          setState((prev) => ({
            ...prev,
            colorClashChatMessages: [
              ...prev.colorClashChatMessages,
              {
                sender: data.sender,
                message: data.message,
                id: `${Date.now()}-${Math.random()}`,
              },
            ],
          }));
          break;
        case "colorclash_left":
          setState((prev) => ({
            ...prev,
            colorClashLobby: null,
            colorClashGame: null,
            colorClashChatMessages: [],
          }));
          break;
        case "colorclash_game_ended":
          setState((prev) => ({
            ...prev,
            colorClashLobby: null,
            colorClashGame: null,
            colorClashChatMessages: [],
          }));
          break;
        case "lobby_update_hideseek":
          setState((prev) => ({ ...prev, hideSeekLobby: data.lobby }));
          break;
        case "game_update_hideseek":
          setState((prev) => ({
            ...prev,
            hideSeekGame: data.game,
            hideSeekLobby: data.game?.status === "finished" ? null : prev.hideSeekLobby,
          }));
          break;
        case "hideseek_chat_message":
          setState((prev) => ({
            ...prev,
            hideSeekChatMessages: [
              ...prev.hideSeekChatMessages,
              {
                sender: data.sender,
                message: data.message,
                id: `${Date.now()}-${Math.random()}`,
              },
            ],
          }));
          break;
        case "hideseek_left":
          setState((prev) => ({
            ...prev,
            hideSeekLobby: null,
            hideSeekGame: null,
            hideSeekChatMessages: [],
          }));
          break;
        // Battleship handlers
        case "battleship_lobby_update":
          setState((prev) => ({ ...prev, battleshipLobby: data.lobby }));
          break;
        case "battleship_game_update":
          setState((prev) => ({
            ...prev,
            battleshipGame: data.game,
            battleshipLobby: null,
          }));
          break;
        case "battleship_chat_message":
          setState((prev) => ({
            ...prev,
            battleshipChatMessages: [
              ...prev.battleshipChatMessages,
              {
                sender: data.sender,
                message: data.message,
                id: `${Date.now()}-${Math.random()}`,
              },
            ],
          }));
          break;
        case "battleship_left":
          setState((prev) => ({
            ...prev,
            battleshipLobby: null,
            battleshipGame: null,
            battleshipChatMessages: [],
          }));
          break;
        // CTF handlers
        case "ctf_lobby_update":
          setState((prev) => ({ ...prev, ctfLobby: data.lobby }));
          break;
        case "ctf_game_update":
          setState((prev) => ({
            ...prev,
            ctfGame: data.game,
            ctfLobby: null,
          }));
          break;
        case "ctf_chat_message":
          setState((prev) => ({
            ...prev,
            ctfChatMessages: [
              ...prev.ctfChatMessages,
              {
                sender: data.sender,
                message: data.message,
                id: `${Date.now()}-${Math.random()}`,
              },
            ],
          }));
          break;
        case "ctf_left":
          setState((prev) => ({
            ...prev,
            ctfLobby: null,
            ctfGame: null,
            ctfChatMessages: [],
          }));
          break;
        // Siege War handlers
        case "siegewar_lobby_update":
          setState((prev) => ({ ...prev, siegeWarLobby: data.lobby }));
          break;
        case "siegewar_game_update":
          setState((prev) => ({
            ...prev,
            siegeWarGame: data.game,
            siegeWarLobby: null,
          }));
          break;
        case "siegewar_chat_message":
          setState((prev) => ({
            ...prev,
            siegeWarChatMessages: [
              ...prev.siegeWarChatMessages,
              {
                sender: data.sender,
                message: data.message,
                id: `${Date.now()}-${Math.random()}`,
              },
            ],
          }));
          break;
        case "siegewar_left":
          setState((prev) => ({
            ...prev,
            siegeWarLobby: null,
            siegeWarGame: null,
            siegeWarChatMessages: [],
          }));
          break;
        // Sky Fortress handlers
        case "lobby_update_skyfortress":
          setState((prev) => ({ ...prev, skyFortressLobby: data.lobby }));
          break;
        case "game_update_skyfortress":
          setState((prev) => ({ ...prev, skyFortressGame: data.game, skyFortressLobby: null }));
          break;
        case "skyfortress_chat_message":
          setState((prev) => ({
            ...prev,
            skyFortressChatMessages: [...prev.skyFortressChatMessages, { sender: data.sender, message: data.message, id: `${Date.now()}-${Math.random()}` }],
          }));
          break;
        case "skyfortress_left":
          setState((prev) => ({ ...prev, skyFortressLobby: null, skyFortressGame: null, skyFortressChatMessages: [] }));
          break;
        // Time Rift handlers
        case "lobby_update_timerift":
          setState((prev) => ({ ...prev, timeRiftLobby: data.lobby }));
          break;
        case "game_update_timerift":
          setState((prev) => ({ ...prev, timeRiftGame: data.game, timeRiftLobby: null }));
          break;
        case "timerift_chat_message":
          setState((prev) => ({
            ...prev,
            timeRiftChatMessages: [...prev.timeRiftChatMessages, { sender: data.sender, message: data.message, id: `${Date.now()}-${Math.random()}` }],
          }));
          break;
        case "timerift_left":
          setState((prev) => ({ ...prev, timeRiftLobby: null, timeRiftGame: null, timeRiftChatMessages: [] }));
          break;
        // Shadow Ops handlers
        case "lobby_update_shadowops":
          setState((prev) => ({ ...prev, shadowOpsLobby: data.lobby }));
          break;
        case "game_update_shadowops":
          setState((prev) => ({ ...prev, shadowOpsGame: data.game, shadowOpsLobby: null }));
          break;
        case "shadowops_chat_message":
          setState((prev) => ({
            ...prev,
            shadowOpsChatMessages: [...prev.shadowOpsChatMessages, { sender: data.sender, message: data.message, id: `${Date.now()}-${Math.random()}` }],
          }));
          break;
        case "shadowops_left":
          setState((prev) => ({ ...prev, shadowOpsLobby: null, shadowOpsGame: null, shadowOpsChatMessages: [] }));
          break;
        // Elemental Conquest handlers
        case "lobby_update_elemental":
          setState((prev) => ({ ...prev, elementalLobby: data.lobby }));
          break;
        case "game_update_elemental":
          setState((prev) => ({ ...prev, elementalGame: data.game, elementalLobby: null }));
          break;
        case "elemental_chat_message":
          setState((prev) => ({
            ...prev,
            elementalChatMessages: [...prev.elementalChatMessages, { sender: data.sender, message: data.message, id: `${Date.now()}-${Math.random()}` }],
          }));
          break;
        case "elemental_left":
          setState((prev) => ({ ...prev, elementalLobby: null, elementalGame: null, elementalChatMessages: [] }));
          break;
        // Mech Arena handlers
        case "lobby_update_mech":
          setState((prev) => ({ ...prev, mechLobby: data.lobby }));
          break;
        case "game_update_mech":
          setState((prev) => ({ ...prev, mechGame: data.game, mechLobby: null }));
          break;
        case "mech_chat_message":
          setState((prev) => ({
            ...prev,
            mechChatMessages: [...prev.mechChatMessages, { sender: data.sender, message: data.message, id: `${Date.now()}-${Math.random()}` }],
          }));
          break;
        case "mech_left":
          setState((prev) => ({ ...prev, mechLobby: null, mechGame: null, mechChatMessages: [] }));
          break;
        // Assassin's Grid handlers
        case "lobby_update_assassin":
          setState((prev) => ({ ...prev, assassinLobby: data.lobby }));
          break;
        case "game_update_assassin":
          setState((prev) => ({ ...prev, assassinGame: data.game, assassinLobby: null }));
          break;
        case "assassin_chat_message":
          setState((prev) => ({
            ...prev,
            assassinChatMessages: [...prev.assassinChatMessages, { sender: data.sender, message: data.message, id: `${Date.now()}-${Math.random()}` }],
          }));
          break;
        case "assassin_left":
          setState((prev) => ({ ...prev, assassinLobby: null, assassinGame: null, assassinChatMessages: [] }));
          break;
        case "warzone_room_update":
          setState((prev) => ({
            ...prev,
            warzoneRoom: data.room,
            warzoneChatMessages: data.room ? prev.warzoneChatMessages : [],
            warzoneStates: data.room ? prev.warzoneStates : [],
          }));
          break;
        case "warzone_states":
          setState((prev) => ({ ...prev, warzoneStates: data.states || [] }));
          break;
        case "warzone_chat_history":
          setState((prev) => ({
            ...prev,
            warzoneChatMessages: data.messages || [],
          }));
          break;
        case "warzone_chat_message":
          setState((prev) => ({
            ...prev,
            warzoneChatMessages: [...prev.warzoneChatMessages, data.message].slice(-100),
          }));
          break;
        case "dm_received":
        case "direct_message":
          setState((prev) => {
            const newDms = [...prev.directMessages, data.message];
            const newConversations = new Map(prev.dmConversations);
            const newUnread = new Map(prev.dmUnreadCounts);
            const partnerId = data.message.fromPlayerId === prev.currentPlayerId 
              ? data.message.toPlayerId 
              : data.message.fromPlayerId;
            const existing = newConversations.get(partnerId) || [];
            newConversations.set(partnerId, [...existing, data.message]);

            const isIncoming = data.message.toPlayerId === prev.currentPlayerId;
            const dmIsOpenForPartner = prev.currentDmPartner === partnerId;
            let latestDmMessage = prev.latestDmMessage;

            if (isIncoming && !dmIsOpenForPartner) {
              newUnread.set(partnerId, (newUnread.get(partnerId) || 0) + 1);
              latestDmMessage = data.message;
            }

            return {
              ...prev,
              directMessages: newDms,
              dmConversations: newConversations,
              dmUnreadCounts: newUnread,
              latestDmMessage,
            };
          });
          break;
        case "dm_history":
          setState((prev) => {
            const newConversations = new Map(prev.dmConversations);
            const newUnread = new Map(prev.dmUnreadCounts);
            let partnerId = data.partnerId;

            if (!partnerId && data.messages.length > 0) {
              const firstMsg = data.messages[0];
              partnerId =
                firstMsg.fromPlayerId === prev.currentPlayerId
                  ? firstMsg.toPlayerId
                  : firstMsg.fromPlayerId;
            }
            if (partnerId) {
              newConversations.set(partnerId, data.messages);
              newUnread.set(partnerId, 0);
            }
            return {
              ...prev,
              dmConversations: newConversations,
              dmUnreadCounts: newUnread,
              latestDmMessage:
                partnerId && prev.latestDmMessage?.fromPlayerId === partnerId
                  ? null
                  : prev.latestDmMessage,
            };
          });
          break;
        case "emoji_reaction":
          const emojiId = `${Date.now()}-${Math.random()}`;
          setState((prev) => ({
            ...prev,
            activeEmojis: [
              ...prev.activeEmojis,
              {
                id: emojiId,
                emoji: data.emoji,
                gameType: data.gameType,
                gameId: data.gameId,
                senderName: data.senderName || "Someone",
              },
            ],
          }));
          break;
      }
    };

    socketRef.current = socket;
  }, [state.currentPlayerName]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      socketRef.current?.close();
    };
  }, []);

  const send = useCallback((message: object) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(message));
    }
  }, []);

  const joinGame = useCallback((username: string) => {
    pendingJoinRef.current = username;
    usernameRef.current = username;
    hasJoinedRef.current = false;
    setState((prev) => ({
      ...prev,
      currentPlayerName: username,
      currentPlayerId: null,
    }));

    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: "join", username }));
      hasJoinedRef.current = true;
    }
  }, []);

  const sendChatMessage = useCallback(
    (content: string) => {
      send({ type: "chat_message", content });
    },
    [send],
  );

  const sendChallenge = useCallback(
    (
      toPlayerId: string,
      gameType:
        | "tictactoe"
        | "rps"
        | "wordscramble"
        | "numberguess"
        | "quickmath"
        | "connectfour",
    ) => {
      send({ type: "challenge_sent", toPlayerId, gameType });
    },
    [send],
  );

  const respondToChallenge = useCallback(
    (challengeId: string, accepted: boolean) => {
      send({ type: "challenge_response", challengeId, accepted });
      setState((prev) => ({
        ...prev,
        challenges: prev.challenges.filter((c) => c.id !== challengeId),
      }));
    },
    [send],
  );

  const dismissChallenge = useCallback((challengeId: string) => {
    setState((prev) => ({
      ...prev,
      challenges: prev.challenges.filter((c) => c.id !== challengeId),
    }));
  }, []);

  const makeTTTMove = useCallback(
    (position: number) => {
      if (state.tttGame) {
        send({ type: "game_move_ttt", gameId: state.tttGame.id, position });
      }
    },
    [send, state.tttGame],
  );

  const requestTTTRematch = useCallback(() => {
    if (state.tttGame) {
      send({ type: "game_rematch_ttt", gameId: state.tttGame.id });
    }
  }, [send, state.tttGame]);

  const leaveTTTGame = useCallback(() => {
    if (state.tttGame) {
      send({ type: "game_leave_ttt", gameId: state.tttGame.id });
      setState((prev) => ({ ...prev, tttGame: null }));
    }
  }, [send, state.tttGame]);

  const makeRPSChoice = useCallback(
    (choice: RPSChoice) => {
      if (state.rpsGame) {
        send({ type: "game_choice_rps", gameId: state.rpsGame.id, choice });
      }
    },
    [send, state.rpsGame],
  );

  const requestRPSNextRound = useCallback(() => {
    if (state.rpsGame) {
      send({ type: "game_next_round_rps", gameId: state.rpsGame.id });
    }
  }, [send, state.rpsGame]);

  const leaveRPSGame = useCallback(() => {
    if (state.rpsGame) {
      send({ type: "game_leave_rps", gameId: state.rpsGame.id });
      setState((prev) => ({ ...prev, rpsGame: null }));
    }
  }, [send, state.rpsGame]);

  const joinRiddleLobby = useCallback((vipOnly = false) => {
    send({ type: "lobby_join_riddle", vipOnly });
  }, [send]);

  const startRiddleGame = useCallback(() => {
    if (state.riddleLobby) {
      send({ type: "lobby_start_riddle", lobbyId: state.riddleLobby.id });
    }
  }, [send, state.riddleLobby]);

  const leaveRiddleLobby = useCallback(() => {
    if (state.riddleLobby) {
      send({ type: "lobby_leave_riddle", lobbyId: state.riddleLobby.id });
    }
    if (state.riddleGame) {
      send({ type: "lobby_leave_riddle", lobbyId: state.riddleGame.lobbyId });
    }
    setState((prev) => ({ ...prev, riddleLobby: null, riddleGame: null }));
  }, [send, state.riddleLobby, state.riddleGame]);

  const submitRiddleAnswer = useCallback(
    (answer: string) => {
      if (state.riddleGame) {
        send({
          type: "game_answer_riddle",
          gameId: state.riddleGame.id,
          answer,
        });
      }
    },
    [send, state.riddleGame],
  );

  const submitWSAnswer = useCallback(
    (answer: string) => {
      if (state.wsGame) {
        send({ type: "game_answer_ws", gameId: state.wsGame.id, answer });
      }
    },
    [send, state.wsGame],
  );

  const requestWSNextRound = useCallback(() => {
    if (state.wsGame) {
      send({ type: "game_next_round_ws", gameId: state.wsGame.id });
    }
  }, [send, state.wsGame]);

  const leaveWSGame = useCallback(() => {
    if (state.wsGame) {
      send({ type: "game_leave_ws", gameId: state.wsGame.id });
      setState((prev) => ({ ...prev, wsGame: null }));
    }
  }, [send, state.wsGame]);

  const submitNGGuess = useCallback(
    (guess: number) => {
      if (state.ngGame) {
        send({ type: "game_guess_ng", gameId: state.ngGame.id, guess });
      }
    },
    [send, state.ngGame],
  );

  const requestNGNextRound = useCallback(() => {
    if (state.ngGame) {
      send({ type: "game_next_round_ng", gameId: state.ngGame.id });
    }
  }, [send, state.ngGame]);

  const leaveNGGame = useCallback(() => {
    if (state.ngGame) {
      send({ type: "game_leave_ng", gameId: state.ngGame.id });
      setState((prev) => ({ ...prev, ngGame: null }));
    }
  }, [send, state.ngGame]);

  const submitQMAnswer = useCallback(
    (answer: number) => {
      if (state.qmGame) {
        send({ type: "game_answer_qm", gameId: state.qmGame.id, answer });
      }
    },
    [send, state.qmGame],
  );

  const requestQMNextRound = useCallback(() => {
    if (state.qmGame) {
      send({ type: "game_next_round_qm", gameId: state.qmGame.id });
    }
  }, [send, state.qmGame]);

  const leaveQMGame = useCallback(() => {
    if (state.qmGame) {
      send({ type: "game_leave_qm", gameId: state.qmGame.id });
      setState((prev) => ({ ...prev, qmGame: null }));
    }
  }, [send, state.qmGame]);

  const makeC4Move = useCallback(
    (column: number) => {
      if (state.c4Game) {
        send({ type: "game_move_c4", gameId: state.c4Game.id, column });
      }
    },
    [send, state.c4Game],
  );

  const requestC4Rematch = useCallback(() => {
    if (state.c4Game) {
      send({ type: "game_rematch_c4", gameId: state.c4Game.id });
    }
  }, [send, state.c4Game]);

  const leaveC4Game = useCallback(() => {
    if (state.c4Game) {
      send({ type: "game_leave_c4", gameId: state.c4Game.id });
      setState((prev) => ({ ...prev, c4Game: null }));
    }
  }, [send, state.c4Game]);

  const joinMemoryLobby = useCallback(() => {
    send({ type: "lobby_join_memory" });
  }, [send]);

  const startMemoryGame = useCallback(() => {
    if (state.memoryLobby) {
      send({ type: "lobby_start_memory", lobbyId: state.memoryLobby.id });
    }
  }, [send, state.memoryLobby]);

  const leaveMemoryLobby = useCallback(() => {
    if (state.memoryLobby) {
      send({ type: "lobby_leave_memory", lobbyId: state.memoryLobby.id });
    }
    if (state.memoryGame) {
      send({ type: "lobby_leave_memory", lobbyId: state.memoryGame.lobbyId });
    }
    setState((prev) => ({ ...prev, memoryLobby: null, memoryGame: null }));
  }, [send, state.memoryLobby, state.memoryGame]);

  const flipMemoryCard = useCallback(
    (cardId: number) => {
      if (state.memoryGame) {
        send({ type: "game_flip_memory", gameId: state.memoryGame.id, cardId });
      }
    },
    [send, state.memoryGame],
  );

  const joinTypingLobby = useCallback(() => {
    send({ type: "lobby_join_typing" });
  }, [send]);

  const startTypingGame = useCallback(() => {
    if (state.typingLobby) {
      send({ type: "lobby_start_typing", lobbyId: state.typingLobby.id });
    }
  }, [send, state.typingLobby]);

  const leaveTypingLobby = useCallback(() => {
    if (state.typingLobby) {
      send({ type: "lobby_leave_typing", lobbyId: state.typingLobby.id });
    }
    if (state.typingGame) {
      send({ type: "lobby_leave_typing", lobbyId: state.typingGame.lobbyId });
    }
    setState((prev) => ({ ...prev, typingLobby: null, typingGame: null }));
  }, [send, state.typingLobby, state.typingGame]);

  const updateTypingProgress = useCallback(
    (progress: number, wpm: number) => {
      if (state.typingGame) {
        send({
          type: "game_progress_typing",
          gameId: state.typingGame.id,
          progress,
          wpm,
        });
      }
    },
    [send, state.typingGame],
  );

  const finishTypingRace = useCallback(() => {
    if (state.typingGame) {
      send({ type: "game_finish_typing", gameId: state.typingGame.id });
    }
  }, [send, state.typingGame]);

  const dismissOpponentLeftNotification = useCallback(() => {
    setState((prev) => ({ ...prev, opponentLeftNotification: null }));
  }, []);

  const clearUnreadChat = useCallback(() => {
    setState((prev) => ({ ...prev, unreadChatCount: 0 }));
  }, []);

  const clearLatestChatMessage = useCallback(() => {
    setState((prev) => ({ ...prev, latestChatMessage: null }));
  }, []);

  const clearLatestDmMessage = useCallback(() => {
    setState((prev) => ({ ...prev, latestDmMessage: null }));
  }, []);

  const clearDmUnreadForPartner = useCallback((partnerId: string) => {
    setState((prev) => {
      const next = new Map(prev.dmUnreadCounts);
      next.set(partnerId, 0);
      return {
        ...prev,
        dmUnreadCounts: next,
      };
    });
  }, []);

  const requestActiveTTTGames = useCallback(() => {
    send({ type: "request_active_games_ttt" });
  }, [send]);

  const spectateTTTGame = useCallback(
    (gameId: string) => {
      send({ type: "game_spectate_ttt", gameId });
      setState((prev) => ({
        ...prev,
        isSpectating: true,
        spectatingGameType: "tictactoe",
      }));
    },
    [send],
  );

  const stopSpectatingTTT = useCallback(() => {
    if (state.tttGame) {
      send({ type: "game_stop_spectate_ttt", gameId: state.tttGame.id });
      setState((prev) => ({
        ...prev,
        tttGame: null,
        isSpectating: false,
        spectatingGameType: null,
      }));
    }
  }, [send, state.tttGame]);

  const requestActiveWSGames = useCallback(() => {
    send({ type: "request_active_games_ws" });
  }, [send]);

  const spectateWSGame = useCallback(
    (gameId: string) => {
      send({ type: "game_spectate_ws", gameId });
      setState((prev) => ({
        ...prev,
        isSpectating: true,
        spectatingGameType: "wordscramble",
      }));
    },
    [send],
  );

  const stopSpectatingWS = useCallback(() => {
    if (state.wsGame) {
      send({ type: "game_stop_spectate_ws", gameId: state.wsGame.id });
      setState((prev) => ({
        ...prev,
        wsGame: null,
        isSpectating: false,
        spectatingGameType: null,
      }));
    }
  }, [send, state.wsGame]);

  const requestActiveNGGames = useCallback(() => {
    send({ type: "request_active_games_ng" });
  }, [send]);

  const spectateNGGame = useCallback(
    (gameId: string) => {
      send({ type: "game_spectate_ng", gameId });
      setState((prev) => ({
        ...prev,
        isSpectating: true,
        spectatingGameType: "numberguess",
      }));
    },
    [send],
  );

  const stopSpectatingNG = useCallback(() => {
    if (state.ngGame) {
      send({ type: "game_stop_spectate_ng", gameId: state.ngGame.id });
      setState((prev) => ({
        ...prev,
        ngGame: null,
        isSpectating: false,
        spectatingGameType: null,
      }));
    }
  }, [send, state.ngGame]);

  const requestActiveQMGames = useCallback(() => {
    send({ type: "request_active_games_qm" });
  }, [send]);

  const spectateQMGame = useCallback(
    (gameId: string) => {
      send({ type: "game_spectate_qm", gameId });
      setState((prev) => ({
        ...prev,
        isSpectating: true,
        spectatingGameType: "quickmath",
      }));
    },
    [send],
  );

  const stopSpectatingQM = useCallback(() => {
    if (state.qmGame) {
      send({ type: "game_stop_spectate_qm", gameId: state.qmGame.id });
      setState((prev) => ({
        ...prev,
        qmGame: null,
        isSpectating: false,
        spectatingGameType: null,
      }));
    }
  }, [send, state.qmGame]);

  const requestActiveC4Games = useCallback(() => {
    send({ type: "request_active_games_c4" });
  }, [send]);

  const spectateC4Game = useCallback(
    (gameId: string) => {
      send({ type: "game_spectate_c4", gameId });
      setState((prev) => ({
        ...prev,
        isSpectating: true,
        spectatingGameType: "connectfour",
      }));
    },
    [send],
  );

  const stopSpectatingC4 = useCallback(() => {
    if (state.c4Game) {
      send({ type: "game_stop_spectate_c4", gameId: state.c4Game.id });
      setState((prev) => ({
        ...prev,
        c4Game: null,
        isSpectating: false,
        spectatingGameType: null,
      }));
    }
  }, [send, state.c4Game]);

  const requestActiveMemoryGames = useCallback(() => {
    send({ type: "request_active_games_memory" });
  }, [send]);

  const spectateMemoryGame = useCallback(
    (gameId: string) => {
      send({ type: "game_spectate_memory", gameId });
      setState((prev) => ({
        ...prev,
        isSpectating: true,
        spectatingGameType: "memory",
      }));
    },
    [send],
  );

  const stopSpectatingMemory = useCallback(() => {
    if (state.memoryGame) {
      send({ type: "game_stop_spectate_memory", gameId: state.memoryGame.id });
      setState((prev) => ({
        ...prev,
        memoryGame: null,
        isSpectating: false,
        spectatingGameType: null,
      }));
    }
  }, [send, state.memoryGame]);

  const joinWerewolfLobby = useCallback((vipOnly = false) => {
    send({ type: "lobby_join_werewolf", vipOnly });
  }, [send]);

  const updateWerewolfSettings = useCallback(
    (enableSeer: boolean, enableDoctor: boolean) => {
      if (state.werewolfLobby) {
        send({
          type: "lobby_settings_werewolf",
          lobbyId: state.werewolfLobby.id,
          enableSeer,
          enableDoctor,
        });
      }
    },
    [send, state.werewolfLobby],
  );

  const startWerewolfGame = useCallback(() => {
    if (state.werewolfLobby) {
      send({ type: "lobby_start_werewolf", lobbyId: state.werewolfLobby.id });
    }
  }, [send, state.werewolfLobby]);

  const leaveWerewolfLobby = useCallback(() => {
    if (state.werewolfLobby) {
      send({ type: "lobby_leave_werewolf", lobbyId: state.werewolfLobby.id });
    }
    if (state.werewolfGame) {
      send({
        type: "lobby_leave_werewolf",
        lobbyId: state.werewolfGame.lobbyId,
      });
    }
    setState((prev) => ({
      ...prev,
      werewolfLobby: null,
      werewolfGame: null,
      werewolfRole: null,
      werewolfTeammates: [],
    }));
  }, [send, state.werewolfLobby, state.werewolfGame]);

  const werewolfAction = useCallback(
    (action: "kill" | "protect" | "inspect", targetId: string) => {
      if (state.werewolfGame) {
        send({
          type: "game_action_werewolf",
          gameId: state.werewolfGame.id,
          action,
          targetId,
        });
      }
    },
    [send, state.werewolfGame],
  );

  const werewolfVote = useCallback(
    (targetId: string) => {
      if (state.werewolfGame) {
        send({
          type: "game_vote_werewolf",
          gameId: state.werewolfGame.id,
          targetId,
        });
      }
    },
    [send, state.werewolfGame],
  );

  const joinSpyHuntLobby = useCallback(() => {
    send({ type: "lobby_join_spyhunt" });
  }, [send]);

  const startSpyHuntGame = useCallback(() => {
    if (state.spyHuntLobby) {
      send({ type: "lobby_start_spyhunt", lobbyId: state.spyHuntLobby.id });
    }
  }, [send, state.spyHuntLobby]);

  const leaveSpyHuntLobby = useCallback(() => {
    if (state.spyHuntLobby) {
      send({ type: "lobby_leave_spyhunt", lobbyId: state.spyHuntLobby.id });
    }
    if (state.spyHuntGame) {
      send({ type: "lobby_leave_spyhunt", lobbyId: state.spyHuntGame.lobbyId });
    }
    setState((prev) => ({
      ...prev,
      spyHuntLobby: null,
      spyHuntGame: null,
      isSpy: false,
      spyLocation: null,
    }));
  }, [send, state.spyHuntLobby, state.spyHuntGame]);

  const spyHuntAsk = useCallback(
    (targetId: string, question: string) => {
      if (state.spyHuntGame) {
        send({
          type: "game_ask_spyhunt",
          gameId: state.spyHuntGame.id,
          targetId,
          question,
        });
      }
    },
    [send, state.spyHuntGame],
  );

  const spyHuntAnswer = useCallback(
    (answer: string) => {
      if (state.spyHuntGame) {
        send({
          type: "game_answer_spyhunt",
          gameId: state.spyHuntGame.id,
          answer,
        });
      }
    },
    [send, state.spyHuntGame],
  );

  const spyHuntAccuse = useCallback(
    (accusedId: string) => {
      if (state.spyHuntGame) {
        send({
          type: "game_accuse_spyhunt",
          gameId: state.spyHuntGame.id,
          accusedId,
        });
      }
    },
    [send, state.spyHuntGame],
  );

  const spyHuntVote = useCallback(
    (targetId: string) => {
      if (state.spyHuntGame) {
        send({
          type: "game_vote_spyhunt",
          gameId: state.spyHuntGame.id,
          targetId,
        });
      }
    },
    [send, state.spyHuntGame],
  );

  const spyHuntGuessLocation = useCallback(
    (location: string) => {
      if (state.spyHuntGame) {
        send({
          type: "game_guess_location_spyhunt",
          gameId: state.spyHuntGame.id,
          location,
        });
      }
    },
    [send, state.spyHuntGame],
  );

  const createFpsLobby = useCallback(
    (mode: FpsGameMode, timeLimit: number) => {
      send({ type: "fps_create_lobby", mode, timeLimit });
    },
    [send],
  );

  const joinFpsLobby = useCallback(
    (code: string, team?: "A" | "B") => {
      send({ type: "fps_join_lobby", code, team });
    },
    [send],
  );

  const leaveFpsLobby = useCallback(() => {
    if (state.fpsGame) {
      send({ type: "fps_leave_lobby", gameId: state.fpsGame.id });
      setState((prev) => ({ ...prev, fpsGame: null, fpsKillFeed: [] }));
    }
  }, [send, state.fpsGame]);

  const startFpsGame = useCallback(() => {
    if (state.fpsGame) {
      send({ type: "fps_start_game", gameId: state.fpsGame.id });
    }
  }, [send, state.fpsGame]);

  const fpsPlayerMove = useCallback(
    (
      position: { x: number; y: number; z: number },
      rotation: { x: number; y: number },
    ) => {
      if (state.fpsGame) {
        send({
          type: "fps_player_move",
          gameId: state.fpsGame.id,
          position,
          rotation,
        });
      }
    },
    [send, state.fpsGame],
  );

  const fpsPlayerShoot = useCallback(
    (targetId: string) => {
      if (state.fpsGame) {
        send({ type: "fps_player_shoot", gameId: state.fpsGame.id, targetId });
      }
    },
    [send, state.fpsGame],
  );

  const fpsPlayerRespawn = useCallback(
    (gun: FpsGunType) => {
      if (state.fpsGame) {
        send({ type: "fps_player_respawn", gameId: state.fpsGame.id, gun });
      }
    },
    [send, state.fpsGame],
  );

  const fpsChangeGun = useCallback(
    (gun: FpsGunType) => {
      if (state.fpsGame) {
        send({ type: "fps_change_gun", gameId: state.fpsGame.id, gun });
      }
    },
    [send, state.fpsGame],
  );

  const adminKick = useCallback(
    (targetPlayerId: string) => {
      send({ type: "admin_kick", targetPlayerId });
    },
    [send],
  );

  const adminBan = useCallback(
    (targetPlayerId: string) => {
      send({ type: "admin_ban", targetPlayerId });
    },
    [send],
  );

  const adminClearChat = useCallback(() => {
    send({ type: "admin_clear_chat" });
  }, [send]);

  const adminToggleVip = useCallback(
    (playerId: string) => {
      send({ type: "admin_toggle_vip", playerId });
    },
    [send],
  );

  const deleteMessage = useCallback(
    (messageId: string) => {
      send({ type: "delete_message", messageId });
    },
    [send],
  );

  const adminForceKick = useCallback(
    (targetPlayerId: string) => {
      send({ type: "admin_force_kick", targetPlayerId });
    },
    [send],
  );

  const adminUnban = useCallback(
    (ip: string) => {
      send({ type: "admin_unban", ip });
    },
    [send],
  );

  const adminGetBannedList = useCallback(() => {
    send({ type: "admin_get_banned_list" });
  }, [send]);

  const sendEmojiReaction = useCallback(
    (gameType: string, gameId: string, emoji: string) => {
      send({ type: "emoji_reaction", gameType, gameId, emoji });
    },
    [send],
  );

  const clearEmojiReaction = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      activeEmojis: prev.activeEmojis.filter((e) => e.id !== id),
    }));
  }, []);

  const joinPointOnPointLobby = useCallback(() => {
    send({ type: "lobby_join_pointonpoint" });
  }, [send]);

  const startPointOnPointGame = useCallback(() => {
    if (state.pointOnPointLobby) {
      send({
        type: "lobby_start_pointonpoint",
        lobbyId: state.pointOnPointLobby.id,
      });
    }
  }, [send, state.pointOnPointLobby]);

  const leavePointOnPointLobby = useCallback(() => {
    if (state.pointOnPointLobby) {
      send({
        type: "lobby_leave_pointonpoint",
        lobbyId: state.pointOnPointLobby.id,
      });
    }
    if (state.pointOnPointGame) {
      send({
        type: "lobby_leave_pointonpoint",
        lobbyId: state.pointOnPointGame.lobbyId,
      });
    }
    setState((prev) => ({
      ...prev,
      pointOnPointLobby: null,
      pointOnPointGame: null,
    }));
  }, [send, state.pointOnPointLobby, state.pointOnPointGame]);

  const submitPointOnPointSentence = useCallback(
    (sentence: string) => {
      if (state.pointOnPointGame) {
        send({
          type: "game_sentence_pointonpoint",
          gameId: state.pointOnPointGame.id,
          sentence,
        });
      }
    },
    [send, state.pointOnPointGame],
  );

  const endPointOnPointGame = useCallback(() => {
    if (state.pointOnPointGame) {
      send({
        type: "game_end_pointonpoint",
        gameId: state.pointOnPointGame.id,
      });
    }
  }, [send, state.pointOnPointGame]);

  const joinPiratesLobby = useCallback(() => {
    send({ type: "lobby_join_pirates" });
  }, [send]);

  const selectPiratesTeam = useCallback(
    (team: PiratesTeam) => {
      if (state.piratesLobby) {
        send({
          type: "lobby_team_pirates",
          lobbyId: state.piratesLobby.id,
          team,
        });
      }
    },
    [send, state.piratesLobby],
  );

  const selectPiratesClass = useCallback(
    (playerClass: PiratesClass) => {
      if (state.piratesLobby) {
        send({
          type: "lobby_class_pirates",
          lobbyId: state.piratesLobby.id,
          playerClass,
        });
      }
    },
    [send, state.piratesLobby],
  );

  const startPiratesGame = useCallback(() => {
    if (state.piratesLobby) {
      send({ type: "lobby_start_pirates", lobbyId: state.piratesLobby.id });
    }
  }, [send, state.piratesLobby]);

  const leavePiratesLobby = useCallback(() => {
    if (state.piratesLobby) {
      send({ type: "lobby_leave_pirates", lobbyId: state.piratesLobby.id });
    }
    if (state.piratesGame) {
      send({ type: "lobby_leave_pirates", lobbyId: state.piratesGame.lobbyId });
    }
    setState((prev) => ({
      ...prev,
      piratesLobby: null,
      piratesGame: null,
    }));
  }, [send, state.piratesLobby, state.piratesGame]);

  const piratesMove = useCallback(
    (x: number, y: number) => {
      if (state.piratesGame) {
        send({ type: "game_move_pirates", gameId: state.piratesGame.id, x, y });
      }
    },
    [send, state.piratesGame],
  );

  const piratesShoot = useCallback(
    (targetX: number, targetY: number) => {
      if (state.piratesGame) {
        send({
          type: "game_shoot_pirates",
          gameId: state.piratesGame.id,
          targetX,
          targetY,
        });
      }
    },
    [send, state.piratesGame],
  );

  const joinOutpostRushLobby = useCallback(() => {
    send({ type: "lobby_join_outpostrush" });
  }, [send]);

  const selectOutpostRushTeam = useCallback(
    (team: "alpha" | "beta") => {
      if (state.outpostRushLobby) {
        send({
          type: "lobby_team_outpostrush",
          lobbyId: state.outpostRushLobby.id,
          team,
        });
      }
    },
    [send, state.outpostRushLobby],
  );

  const startOutpostRushGame = useCallback(() => {
    if (state.outpostRushLobby) {
      send({
        type: "lobby_start_outpostrush",
        lobbyId: state.outpostRushLobby.id,
      });
    }
  }, [send, state.outpostRushLobby]);

  const leaveOutpostRushLobby = useCallback(() => {
    if (state.outpostRushLobby) {
      send({
        type: "lobby_leave_outpostrush",
        lobbyId: state.outpostRushLobby.id,
      });
    }
    if (state.outpostRushGame) {
      send({
        type: "lobby_leave_outpostrush",
        lobbyId: state.outpostRushGame.lobbyId,
      });
    }
    setState((prev) => ({
      ...prev,
      outpostRushLobby: null,
      outpostRushGame: null,
    }));
  }, [send, state.outpostRushLobby, state.outpostRushGame]);

  const outpostRushMove = useCallback(
    (x: number, y: number) => {
      if (state.outpostRushGame) {
        send({
          type: "game_move_outpostrush",
          gameId: state.outpostRushGame.id,
          x,
          y,
        });
      }
    },
    [send, state.outpostRushGame],
  );

  const outpostRushCapture = useCallback(
    (outpostId: string) => {
      if (state.outpostRushGame) {
        send({
          type: "game_capture_outpostrush",
          gameId: state.outpostRushGame.id,
          outpostId,
        });
      }
    },
    [send, state.outpostRushGame],
  );

  const outpostRushBuildDefense = useCallback(
    (buildType: "wall" | "turret" | "trap", x: number, y: number) => {
      if (state.outpostRushGame) {
        send({
          type: "game_build_outpostrush",
          gameId: state.outpostRushGame.id,
          buildType,
          x,
          y,
        });
      }
    },
    [send, state.outpostRushGame],
  );

  const outpostRushUpgradeWeapon = useCallback(() => {
    if (state.outpostRushGame) {
      send({
        type: "game_upgrade_outpostrush",
        gameId: state.outpostRushGame.id,
      });
    }
  }, [send, state.outpostRushGame]);

  const outpostRushAttack = useCallback(
    (targetId: string) => {
      if (state.outpostRushGame) {
        send({
          type: "game_attack_outpostrush",
          gameId: state.outpostRushGame.id,
          targetId,
        });
      }
    },
    [send, state.outpostRushGame],
  );

  const outpostRushRevive = useCallback(
    (targetId: string) => {
      if (state.outpostRushGame) {
        send({
          type: "game_revive_outpostrush",
          gameId: state.outpostRushGame.id,
          targetId,
        });
      }
    },
    [send, state.outpostRushGame],
  );

  const outpostRushCollectResources = useCallback(
    (outpostId: string) => {
      if (state.outpostRushGame) {
        send({
          type: "game_collect_outpostrush",
          gameId: state.outpostRushGame.id,
          outpostId,
        });
      }
    },
    [send, state.outpostRushGame],
  );

  const sendOutpostRushChat = useCallback(
    (message: string) => {
      const gameId = state.outpostRushGame?.id || state.outpostRushLobby?.id;
      if (gameId) {
        send({ type: "game_chat_outpostrush", gameId, message });
      }
    },
    [send, state.outpostRushGame, state.outpostRushLobby],
  );

  const sendPointOnPointChat = useCallback(
    (message: string) => {
      const gameId = state.pointOnPointGame?.id || state.pointOnPointLobby?.id;
      if (gameId) {
        send({ type: "game_chat_pointonpoint", gameId, message });
      }
    },
    [send, state.pointOnPointGame, state.pointOnPointLobby],
  );

  const clearOutpostRushChat = useCallback(() => {
    setState((prev) => ({ ...prev, outpostRushChatMessages: [] }));
  }, []);

  const clearPointOnPointChat = useCallback(() => {
    setState((prev) => ({ ...prev, pointOnPointChatMessages: [] }));
  }, []);

  const requestLobbyCounts = useCallback(() => {
    send({ type: "request_lobby_counts" });
  }, [send]);

  const joinEmojiChainLobby = useCallback(() => {
    send({ type: "lobby_join_emojichain" });
  }, [send]);

  const startEmojiChainGame = useCallback(() => {
    if (state.emojiChainLobby) {
      send({
        type: "lobby_start_emojichain",
        lobbyId: state.emojiChainLobby.id,
      });
    }
  }, [send, state.emojiChainLobby]);

  const leaveEmojiChainLobby = useCallback(() => {
    const lobbyId = state.emojiChainLobby?.id || state.emojiChainGame?.lobbyId;
    if (lobbyId) {
      send({ type: "lobby_leave_emojichain", lobbyId });
      setState((prev) => ({
        ...prev,
        emojiChainLobby: null,
        emojiChainGame: null,
        emojiChainChatMessages: [],
      }));
    }
  }, [send, state.emojiChainLobby, state.emojiChainGame]);

  const submitEmojiChainGuess = useCallback(
    (guess: string) => {
      if (state.emojiChainGame) {
        send({
          type: "game_guess_emojichain",
          gameId: state.emojiChainGame.id,
          guess,
        });
      }
    },
    [send, state.emojiChainGame],
  );

  const requestEmojiChainHint = useCallback(() => {
    if (state.emojiChainGame) {
      send({ type: "game_hint_emojichain", gameId: state.emojiChainGame.id });
    }
  }, [send, state.emojiChainGame]);

  const sendEmojiChainChat = useCallback(
    (message: string) => {
      const gameId = state.emojiChainGame?.id || state.emojiChainLobby?.id;
      if (gameId) {
        send({ type: "game_chat_emojichain", gameId, message });
      }
    },
    [send, state.emojiChainGame, state.emojiChainLobby],
  );

  const clearEmojiChainChat = useCallback(() => {
    setState((prev) => ({ ...prev, emojiChainChatMessages: [] }));
  }, []);

  const joinWordAssociationLobby = useCallback(() => {
    send({ type: "lobby_join_wordassociation" });
  }, [send]);

  const startWordAssociationGame = useCallback(() => {
    if (state.wordAssociationLobby) {
      send({
        type: "lobby_start_wordassociation",
        lobbyId: state.wordAssociationLobby.id,
      });
    }
  }, [send, state.wordAssociationLobby]);

  const leaveWordAssociationLobby = useCallback(() => {
    const lobbyId =
      state.wordAssociationLobby?.id || state.wordAssociationGame?.lobbyId;
    if (lobbyId) {
      send({ type: "lobby_leave_wordassociation", lobbyId });
      setState((prev) => ({
        ...prev,
        wordAssociationLobby: null,
        wordAssociationGame: null,
        wordAssociationChatMessages: [],
      }));
    }
  }, [send, state.wordAssociationLobby, state.wordAssociationGame]);

  const submitWordAssociationWord = useCallback(
    (word: string) => {
      if (state.wordAssociationGame) {
        send({
          type: "game_word_wordassociation",
          gameId: state.wordAssociationGame.id,
          word,
        });
      }
    },
    [send, state.wordAssociationGame],
  );

  const sendWordAssociationChat = useCallback(
    (message: string) => {
      const gameId =
        state.wordAssociationGame?.id || state.wordAssociationLobby?.id;
      if (gameId) {
        send({ type: "game_chat_wordassociation", gameId, message });
      }
    },
    [send, state.wordAssociationGame, state.wordAssociationLobby],
  );

  const clearWordAssociationChat = useCallback(() => {
    setState((prev) => ({ ...prev, wordAssociationChatMessages: [] }));
  }, []);

  const joinHangmanLobby = useCallback(() => {
    send({ type: "lobby_join_hangman" });
  }, [send]);

  const startHangmanGame = useCallback(() => {
    if (state.hangmanLobby) {
      send({ type: "lobby_start_hangman", lobbyId: state.hangmanLobby.id });
    }
  }, [send, state.hangmanLobby]);

  const leaveHangmanLobby = useCallback(() => {
    if (state.hangmanLobby || state.hangmanGame) {
      send({
        type: "lobby_leave_hangman",
        lobbyId: state.hangmanLobby?.id || state.hangmanGame?.lobbyId || "",
      });
      setState((prev) => ({
        ...prev,
        hangmanLobby: null,
        hangmanGame: null,
        hangmanChatMessages: [],
      }));
    }
  }, [send, state.hangmanLobby, state.hangmanGame]);

  const setHangmanWord = useCallback(
    (word: string) => {
      if (state.hangmanGame) {
        send({
          type: "game_setword_hangman",
          gameId: state.hangmanGame.id,
          word,
        });
      }
    },
    [send, state.hangmanGame],
  );

  const guessHangmanLetter = useCallback(
    (letter: string) => {
      if (state.hangmanGame) {
        send({
          type: "game_guess_hangman",
          gameId: state.hangmanGame.id,
          letter,
        });
      }
    },
    [send, state.hangmanGame],
  );

  const sendHangmanChat = useCallback(
    (message: string) => {
      const gameId = state.hangmanGame?.id || state.hangmanLobby?.id;
      if (gameId) {
        send({ type: "game_chat_hangman", gameId, message });
      }
    },
    [send, state.hangmanGame, state.hangmanLobby],
  );

  const clearHangmanChat = useCallback(() => {
    setState((prev) => ({ ...prev, hangmanChatMessages: [] }));
  }, []);

  const joinTriviaQuizLobby = useCallback(() => {
    send({ type: "lobby_join_triviaquiz" });
  }, [send]);

  const startTriviaQuizGame = useCallback(() => {
    if (state.triviaQuizLobby) {
      send({
        type: "lobby_start_triviaquiz",
        lobbyId: state.triviaQuizLobby.id,
      });
    }
  }, [send, state.triviaQuizLobby]);

  const leaveTriviaQuizLobby = useCallback(() => {
    if (state.triviaQuizLobby || state.triviaQuizGame) {
      send({
        type: "lobby_leave_triviaquiz",
        lobbyId:
          state.triviaQuizLobby?.id || state.triviaQuizGame?.lobbyId || "",
      });
      setState((prev) => ({
        ...prev,
        triviaQuizLobby: null,
        triviaQuizGame: null,
        triviaQuizChatMessages: [],
      }));
    }
  }, [send, state.triviaQuizLobby, state.triviaQuizGame]);

  const submitTriviaQuizAnswer = useCallback(
    (answerIndex: number) => {
      if (state.triviaQuizGame) {
        send({
          type: "game_answer_triviaquiz",
          gameId: state.triviaQuizGame.id,
          answerIndex,
        });
      }
    },
    [send, state.triviaQuizGame],
  );

  const sendTriviaQuizChat = useCallback(
    (message: string) => {
      const gameId = state.triviaQuizGame?.id || state.triviaQuizLobby?.id;
      if (gameId) {
        send({ type: "game_chat_triviaquiz", gameId, message });
      }
    },
    [send, state.triviaQuizGame, state.triviaQuizLobby],
  );

  const clearTriviaQuizChat = useCallback(() => {
    setState((prev) => ({ ...prev, triviaQuizChatMessages: [] }));
  }, []);

  // Squid Game functions
  const joinSquidGameLobby = useCallback((vipOnly = false) => {
    send({ type: "lobby_join_squidgame", vipOnly });
  }, [send]);

  const startSquidGame = useCallback(() => {
    if (state.squidGameLobby) {
      send({ type: "lobby_start_squidgame", lobbyId: state.squidGameLobby.id });
    }
  }, [send, state.squidGameLobby]);

  const leaveSquidGameLobby = useCallback(() => {
    if (state.squidGameLobby || state.squidGame) {
      send({
        type: "lobby_leave_squidgame",
        lobbyId: state.squidGameLobby?.id || state.squidGame?.lobbyId || "",
      });
      setState((prev) => ({
        ...prev,
        squidGameLobby: null,
        squidGame: null,
        squidGameChatMessages: [],
      }));
    }
  }, [send, state.squidGameLobby, state.squidGame]);

  const squidGameAction = useCallback(
    (action: string, data: any) => {
      if (state.squidGame) {
        send({
          type: "game_action_squidgame",
          gameId: state.squidGame.id,
          action,
          data,
        });
      }
    },
    [send, state.squidGame],
  );

  const sendSquidGameChat = useCallback(
    (message: string) => {
      const gameId = state.squidGame?.id || state.squidGameLobby?.id;
      if (gameId) {
        send({ type: "game_chat_squidgame", gameId, message });
      }
    },
    [send, state.squidGame, state.squidGameLobby],
  );

  const clearSquidGameChat = useCallback(() => {
    setState((prev) => ({ ...prev, squidGameChatMessages: [] }));
  }, []);

  // Truth or Bluff functions
  const joinTruthOrBluffLobby = useCallback(() => {
    send({ type: "lobby_join_truthorbluff" });
  }, [send]);

  const startTruthOrBluffGame = useCallback(() => {
    if (state.truthOrBluffLobby) {
      send({ type: "lobby_start_truthorbluff", lobbyId: state.truthOrBluffLobby.id });
    }
  }, [send, state.truthOrBluffLobby]);

  const leaveTruthOrBluffLobby = useCallback(() => {
    if (state.truthOrBluffLobby || state.truthOrBluffGame) {
      send({
        type: "lobby_leave_truthorbluff",
        lobbyId: state.truthOrBluffLobby?.id || state.truthOrBluffGame?.lobbyId || "",
      });
      setState((prev) => ({
        ...prev,
        truthOrBluffLobby: null,
        truthOrBluffGame: null,
        truthOrBluffChatMessages: [],
      }));
    }
  }, [send, state.truthOrBluffLobby, state.truthOrBluffGame]);

  const submitTruthOrBluffStory = useCallback(
    (story: string, isTruth: boolean) => {
      if (state.truthOrBluffGame) {
        send({
          type: "game_submit_story_truthorbluff",
          gameId: state.truthOrBluffGame.id,
          story,
          isTruth,
        });
      }
    },
    [send, state.truthOrBluffGame],
  );

  const voteTruthOrBluff = useCallback(
    (voteTruth: boolean) => {
      if (state.truthOrBluffGame) {
        send({
          type: "game_vote_truthorbluff",
          gameId: state.truthOrBluffGame.id,
          voteTruth,
        });
      }
    },
    [send, state.truthOrBluffGame],
  );

  const sendTruthOrBluffChat = useCallback(
    (message: string) => {
      const gameId = state.truthOrBluffGame?.id || state.truthOrBluffLobby?.id;
      if (gameId) {
        send({ type: "game_chat_truthorbluff", gameId, message });
      }
    },
    [send, state.truthOrBluffGame, state.truthOrBluffLobby],
  );

  const clearTruthOrBluffChat = useCallback(() => {
    setState((prev) => ({ ...prev, truthOrBluffChatMessages: [] }));
  }, []);

  // ========== SPOT THE LIAR FUNCTIONS ==========
  const joinSpotTheLiarLobby = useCallback(() => {
    send({ type: "lobby_join_spottheliar" });
  }, [send]);

  const startSpotTheLiarGame = useCallback(() => {
    if (state.spotTheLiarLobby) {
      send({ type: "lobby_start_spottheliar", lobbyId: state.spotTheLiarLobby.id });
    }
  }, [send, state.spotTheLiarLobby]);

  const leaveSpotTheLiarLobby = useCallback(() => {
    if (state.spotTheLiarLobby || state.spotTheLiarGame) {
      send({
        type: "lobby_leave_spottheliar",
        lobbyId: state.spotTheLiarLobby?.id || state.spotTheLiarGame?.lobbyId || "",
      });
      setState((prev) => ({
        ...prev,
        spotTheLiarLobby: null,
        spotTheLiarGame: null,
        spotTheLiarChatMessages: [],
      }));
    }
  }, [send, state.spotTheLiarLobby, state.spotTheLiarGame]);

  const submitSpotTheLiarDescription = useCallback(
    (description: string) => {
      if (state.spotTheLiarGame) {
        send({
          type: "game_describe_spottheliar",
          gameId: state.spotTheLiarGame.id,
          description,
        });
      }
    },
    [send, state.spotTheLiarGame],
  );

  const voteSpotTheLiar = useCallback(
    (votedPlayerId: string) => {
      if (state.spotTheLiarGame) {
        send({
          type: "game_vote_spottheliar",
          gameId: state.spotTheLiarGame.id,
          votedPlayerId,
        });
      }
    },
    [send, state.spotTheLiarGame],
  );

  const sendSpotTheLiarChat = useCallback(
    (message: string) => {
      const gameId = state.spotTheLiarGame?.id || state.spotTheLiarLobby?.id;
      if (gameId) {
        send({ type: "game_chat_spottheliar", gameId, message });
      }
    },
    [send, state.spotTheLiarGame, state.spotTheLiarLobby],
  );

  const clearSpotTheLiarChat = useCallback(() => {
    setState((prev) => ({ ...prev, spotTheLiarChatMessages: [] }));
  }, []);

  // ========== ESCAPE SHIP FUNCTIONS ==========
  const joinEscapeShipLobby = useCallback((vipOnly = false) => {
    send({ type: "lobby_join_escapeship", vipOnly });
  }, [send]);

  const startEscapeShipGame = useCallback(() => {
    if (state.escapeShipLobby) {
      send({ type: "lobby_start_escapeship", lobbyId: state.escapeShipLobby.id });
    }
  }, [send, state.escapeShipLobby]);

  const leaveEscapeShipLobby = useCallback(() => {
    if (state.escapeShipLobby || state.escapeShipGame) {
      send({
        type: "lobby_leave_escapeship",
        lobbyId: state.escapeShipLobby?.id || state.escapeShipGame?.lobbyId || "",
      });
      setState((prev) => ({
        ...prev,
        escapeShipLobby: null,
        escapeShipGame: null,
        escapeShipChatMessages: [],
      }));
    }
  }, [send, state.escapeShipLobby, state.escapeShipGame]);

  const escapeShipAction = useCallback(
    (action: string, data: any) => {
      if (state.escapeShipGame) {
        send({
          type: "game_action_escapeship",
          action,
          data,
        });
      }
    },
    [send, state.escapeShipGame],
  );

  const sendEscapeShipChat = useCallback(
    (message: string) => {
      const gameId = state.escapeShipGame?.id || state.escapeShipLobby?.id;
      if (gameId) {
        send({ type: "game_chat_escapeship", gameId, message });
      }
    },
    [send, state.escapeShipGame, state.escapeShipLobby],
  );

  const clearEscapeShipChat = useCallback(() => {
    setState((prev) => ({ ...prev, escapeShipChatMessages: [] }));
  }, []);

  // ========== REACTION RACE FUNCTIONS ==========
  const joinReactionRaceLobby = useCallback(() => {
    send({ type: "lobby_join_reactionrace" });
  }, [send]);

  const leaveReactionRaceLobby = useCallback(() => {
    if (state.reactionRaceLobby || state.reactionRaceGame) {
      send({
        type: "lobby_leave_reactionrace",
        lobbyId: state.reactionRaceLobby?.id || state.reactionRaceGame?.lobbyId || "",
      });
      setState((prev) => ({
        ...prev,
        reactionRaceLobby: null,
        reactionRaceGame: null,
        reactionRaceChatMessages: [],
      }));
    }
  }, [send, state.reactionRaceLobby, state.reactionRaceGame]);

  const startReactionRaceGame = useCallback(() => {
    if (state.reactionRaceLobby) {
      send({ type: "lobby_start_reactionrace", lobbyId: state.reactionRaceLobby.id });
    }
  }, [send, state.reactionRaceLobby]);

  const reactReactionRace = useCallback(() => {
    if (state.reactionRaceGame) {
      send({ type: "game_react_reactionrace", gameId: state.reactionRaceGame.id });
    }
  }, [send, state.reactionRaceGame]);

  const sendReactionRaceChat = useCallback(
    (message: string) => {
      const gameId = state.reactionRaceGame?.id || state.reactionRaceLobby?.id;
      if (gameId) {
        send({ type: "game_chat_reactionrace", gameId, message });
      }
    },
    [send, state.reactionRaceGame, state.reactionRaceLobby],
  );

  const clearReactionRaceChat = useCallback(() => {
    setState((prev) => ({ ...prev, reactionRaceChatMessages: [] }));
  }, []);

  // ========== COLOR CLASH FUNCTIONS ==========
  const joinColorClashLobby = useCallback(() => {
    send({ type: "lobby_join_colorclash" });
  }, [send]);

  const joinCastlesLobby = useCallback((vipOnly = false) => {
    send({ type: "lobby_join_castles", vipOnly });
  }, [send]);

  const leaveCastlesLobby = useCallback((lobbyId: string) => {
    send({ type: "lobby_leave_castles", lobbyId });
  }, [send]);

  const setCastlesTeam = useCallback((lobbyId: string, team: CastlesTeam) => {
    send({ type: "lobby_team_castles", lobbyId, team });
  }, [send]);

  const setCastlesReady = useCallback((lobbyId: string, ready: boolean) => {
    send({ type: "lobby_ready_castles", lobbyId, ready });
  }, [send]);

  const startCastlesGame = useCallback((lobbyId: string) => {
    send({ type: "lobby_start_castles", lobbyId });
  }, [send]);

  const sendCastlesCommand = useCallback((gameId: string, command: string, options: any) => {
    send({ type: "game_command_castles", gameId, command, ...options });
  }, [send]);

  const sendCastlesChatMessage = useCallback((gameId: string, message: string) => {
    send({ type: "game_chat_castles", gameId, message });
  }, [send]);

  const leaveCastlesGame = useCallback((gameId: string) => {
    send({ type: "game_leave_castles", gameId });
    setState((prev) => ({ ...prev, castlesGame: null, castlesLobby: null, castlesChatMessages: [] }));
  }, [send]);

  const joinShipsBattleLobby = useCallback(() => {
    send({ type: "lobby_join_shipsbattle" });
  }, [send]);

  const leaveShipsBattleLobby = useCallback(() => {
    send({ type: "lobby_leave_shipsbattle" });
    setState((prev) => ({ ...prev, shipsBattleLobby: null }));
  }, [send]);

  const startShipsBattleGame = useCallback((opponentId: string, opponentName: string) => {
    send({ type: "game_start_shipsbattle", opponentId, opponentName });
  }, [send]);

  const placeShipsBattleShip = useCallback((gameId: string, shipSize: number, positions: Array<{ x: number; y: number }>) => {
    send({ type: "game_place_ship_shipsbattle", gameId, shipSize, positions });
  }, [send]);

  const setShipsBattleReady = useCallback((gameId: string) => {
    send({ type: "game_ready_shipsbattle", gameId });
  }, [send]);

  const shootShipsBattle = useCallback((gameId: string, x: number, y: number) => {
    send({ type: "game_shoot_shipsbattle", gameId, x, y });
  }, [send]);

  const leaveShipsBattleGame = useCallback((gameId: string) => {
    send({ type: "game_leave_shipsbattle", gameId });
    setState((prev) => ({ ...prev, shipsBattleGame: null }));
  }, [send]);

  const rematchShipsBattle = useCallback((gameId: string) => {
    send({ type: "game_rematch_shipsbattle", gameId });
  }, [send]);

  const leaveColorClashLobby = useCallback(() => {
    if (state.colorClashLobby || state.colorClashGame) {
      send({
        type: "lobby_leave_colorclash",
        lobbyId: state.colorClashLobby?.id || state.colorClashGame?.lobbyId || "",
      });
      setState((prev) => ({
        ...prev,
        colorClashLobby: null,
        colorClashGame: null,
        colorClashChatMessages: [],
      }));
    }
  }, [send, state.colorClashLobby, state.colorClashGame]);

  const startColorClashGame = useCallback(() => {
    if (state.colorClashLobby) {
      send({ type: "lobby_start_colorclash", lobbyId: state.colorClashLobby.id });
    }
  }, [send, state.colorClashLobby]);

  const inputColorClash = useCallback(
    (color: string) => {
      if (state.colorClashGame) {
        send({ type: "game_input_colorclash", gameId: state.colorClashGame.id, color });
      }
    },
    [send, state.colorClashGame],
  );

  const submitColorClash = useCallback(() => {
    if (state.colorClashGame) {
      send({ type: "game_submit_colorclash", gameId: state.colorClashGame.id });
    }
  }, [send, state.colorClashGame]);

  const sendColorClashChat = useCallback(
    (message: string) => {
      const gameId = state.colorClashGame?.id || state.colorClashLobby?.id;
      if (gameId) {
        send({ type: "game_chat_colorclash", gameId, message });
      }
    },
    [send, state.colorClashGame, state.colorClashLobby],
  );

  const clearColorClashChat = useCallback(() => {
    setState((prev) => ({ ...prev, colorClashChatMessages: [] }));
  }, []);

  // Hide and Seek functions
  const joinHideSeekLobby = useCallback((vipOnly = false) => {
    send({ type: "lobby_join_hideseek", vipOnly });
  }, [send]);

  const startHideSeekGame = useCallback(() => {
    if (state.hideSeekLobby) {
      send({ type: "lobby_start_hideseek", lobbyId: state.hideSeekLobby.id });
    }
  }, [send, state.hideSeekLobby]);

  const leaveHideSeekLobby = useCallback(() => {
    if (state.hideSeekLobby) {
      send({ type: "lobby_leave_hideseek", lobbyId: state.hideSeekLobby.id });
    }
    setState((prev) => ({
      ...prev,
      hideSeekLobby: null,
      hideSeekGame: null,
      hideSeekChatMessages: [],
    }));
  }, [send, state.hideSeekLobby]);

  const setHideSeekSettings = useCallback(
    (seekerMode: "random" | "host") => {
      if (state.hideSeekLobby) {
        send({ type: "lobby_settings_hideseek", lobbyId: state.hideSeekLobby.id, seekerMode });
      }
    },
    [send, state.hideSeekLobby],
  );

  const hideSeekMove = useCallback(
    (x: number, y: number, z: number, rotation: number) => {
      if (state.hideSeekGame) {
        send({ type: "game_move_hideseek", gameId: state.hideSeekGame.id, x, y, z, rotation });
      }
    },
    [send, state.hideSeekGame],
  );

  const hideSeekAction = useCallback(
    (action: "crouch" | "stand" | "jump" | "eliminate", targetId?: string) => {
      if (state.hideSeekGame) {
        send({ type: "game_action_hideseek", gameId: state.hideSeekGame.id, action, targetId });
      }
    },
    [send, state.hideSeekGame],
  );

  const sendHideSeekChat = useCallback(
    (message: string) => {
      const gameId = state.hideSeekGame?.id || state.hideSeekLobby?.id;
      if (gameId) {
        send({ type: "game_chat_hideseek", gameId, message });
      }
    },
    [send, state.hideSeekGame, state.hideSeekLobby],
  );

  const clearHideSeekChat = useCallback(() => {
    setState((prev) => ({ ...prev, hideSeekChatMessages: [] }));
  }, []);

  // Battleship functions
  const joinBattleshipLobby = useCallback(() => {
    send({ type: "battleship_join_lobby" });
  }, [send]);

  const leaveBattleshipLobby = useCallback(() => {
    if (state.battleshipLobby) {
      send({ type: "battleship_leave_lobby", lobbyId: state.battleshipLobby.id });
    }
    setState((prev) => ({ ...prev, battleshipLobby: null, battleshipChatMessages: [] }));
  }, [send, state.battleshipLobby]);

  const startBattleshipGame = useCallback(
    (lobbyId: string) => {
      send({ type: "battleship_start_game", lobbyId });
    },
    [send],
  );

  const placeBattleshipShip = useCallback(
    (gameId: string, size: number, positions: Array<{ x: number; y: number }>) => {
      send({ type: "battleship_place_ship", gameId, size, positions });
    },
    [send],
  );

  const readyBattleship = useCallback(
    (gameId: string) => {
      send({ type: "battleship_ready", gameId });
    },
    [send],
  );

  const shootBattleship = useCallback(
    (gameId: string, x: number, y: number) => {
      send({ type: "battleship_shoot", gameId, x, y });
    },
    [send],
  );

  const leaveBattleshipGame = useCallback(
    (gameId: string) => {
      send({ type: "battleship_leave_game", gameId });
      setState((prev) => ({ ...prev, battleshipGame: null, battleshipChatMessages: [] }));
    },
    [send],
  );

  const sendBattleshipChat = useCallback(
    (message: string) => {
      const gameId = state.battleshipGame?.id || state.battleshipLobby?.id;
      if (gameId) {
        send({ type: "battleship_chat", gameId, message });
      }
    },
    [send, state.battleshipGame, state.battleshipLobby],
  );

  // CTF functions
  const joinCTFLobby = useCallback(() => {
    send({ type: "ctf_join_lobby" });
  }, [send]);

  const leaveCTFLobby = useCallback(() => {
    if (state.ctfLobby) {
      send({ type: "ctf_leave_lobby", lobbyId: state.ctfLobby.id });
    }
    setState((prev) => ({ ...prev, ctfLobby: null, ctfChatMessages: [] }));
  }, [send, state.ctfLobby]);

  const setCTFTeam = useCallback(
    (lobbyId: string, team: CTFTeam) => {
      send({ type: "ctf_set_team", lobbyId, team });
    },
    [send],
  );

  const setCTFReady = useCallback(
    (lobbyId: string, ready: boolean) => {
      send({ type: "ctf_set_ready", lobbyId, ready });
    },
    [send],
  );

  const startCTFGame = useCallback(
    (lobbyId: string) => {
      send({ type: "ctf_start_game", lobbyId });
    },
    [send],
  );

  const moveCTF = useCallback(
    (gameId: string, x: number, y: number) => {
      send({ type: "ctf_move", gameId, x, y });
    },
    [send],
  );

  const tagCTF = useCallback(
    (gameId: string, targetId: string) => {
      send({ type: "ctf_tag", gameId, targetId });
    },
    [send],
  );

  const leaveCTFGame = useCallback(
    (gameId: string) => {
      send({ type: "ctf_leave_game", gameId });
      setState((prev) => ({ ...prev, ctfGame: null, ctfChatMessages: [] }));
    },
    [send],
  );

  const sendCTFChat = useCallback(
    (message: string) => {
      const gameId = state.ctfGame?.id || state.ctfLobby?.id;
      if (gameId) {
        send({ type: "ctf_chat", gameId, message });
      }
    },
    [send, state.ctfGame, state.ctfLobby],
  );

  // Siege War functions
  const joinSiegeWarLobby = useCallback(() => {
    send({ type: "siegewar_join_lobby" });
  }, [send]);

  const leaveSiegeWarLobby = useCallback(() => {
    if (state.siegeWarLobby) {
      send({ type: "siegewar_leave_lobby", lobbyId: state.siegeWarLobby.id });
    }
    setState((prev) => ({ ...prev, siegeWarLobby: null, siegeWarChatMessages: [] }));
  }, [send, state.siegeWarLobby]);

  const setSiegeWarTeam = useCallback(
    (lobbyId: string, team: SiegeWarTeam) => {
      send({ type: "siegewar_set_team", lobbyId, team });
    },
    [send],
  );

  const setSiegeWarReady = useCallback(
    (lobbyId: string, ready: boolean) => {
      send({ type: "siegewar_set_ready", lobbyId, ready });
    },
    [send],
  );

  const startSiegeWarGame = useCallback(
    (lobbyId: string) => {
      send({ type: "siegewar_start_game", lobbyId });
    },
    [send],
  );

  const spawnSiegeWarUnit = useCallback(
    (gameId: string, unitType: SiegeWarUnitType) => {
      send({ type: "siegewar_spawn_unit", gameId, unitType });
    },
    [send],
  );

  const moveSiegeWarUnits = useCallback(
    (gameId: string, unitIds: string[], targetX: number, targetY: number) => {
      send({ type: "siegewar_move_units", gameId, unitIds, targetX, targetY });
    },
    [send],
  );

  const attackSiegeWar = useCallback(
    (gameId: string, unitIds: string[], targetId: string) => {
      send({ type: "siegewar_attack", gameId, unitIds, targetId });
    },
    [send],
  );

  const leaveSiegeWarGame = useCallback(
    (gameId: string) => {
      send({ type: "siegewar_leave_game", gameId });
      setState((prev) => ({ ...prev, siegeWarGame: null, siegeWarChatMessages: [] }));
    },
    [send],
  );

  const sendSiegeWarChat = useCallback(
    (message: string) => {
      const gameId = state.siegeWarGame?.id || state.siegeWarLobby?.id;
      if (gameId) {
        send({ type: "siegewar_chat", gameId, message });
      }
    },
    [send, state.siegeWarGame, state.siegeWarLobby],
  );

  // Sky Fortress functions
  const joinSkyFortressLobby = useCallback(() => {
    send({ type: "lobby_join_skyfortress" });
  }, [send]);

  const leaveSkyFortressLobby = useCallback(() => {
    if (state.skyFortressLobby) {
      send({ type: "lobby_leave_skyfortress", lobbyId: state.skyFortressLobby.id });
    }
    setState((prev) => ({ ...prev, skyFortressLobby: null, skyFortressChatMessages: [] }));
  }, [send, state.skyFortressLobby]);

  const setSkyFortressTeam = useCallback((lobbyId: string, team: SkyFortressTeam) => {
    send({ type: "lobby_team_skyfortress", lobbyId, team });
  }, [send]);

  const setSkyFortressReady = useCallback((lobbyId: string, ready: boolean) => {
    send({ type: "lobby_ready_skyfortress", lobbyId, ready });
  }, [send]);

  const startSkyFortressGame = useCallback((lobbyId: string) => {
    send({ type: "lobby_start_skyfortress", lobbyId });
  }, [send]);

  const moveSkyFortress = useCallback((gameId: string, y: number) => {
    send({ type: "game_move_skyfortress", gameId, y });
  }, [send]);

  const fireSkyFortress = useCallback((gameId: string, targetX: number, targetY: number, weaponType: "missile" | "drone") => {
    send({ type: "game_fire_skyfortress", gameId, targetX, targetY, weaponType });
  }, [send]);

  const sendSkyFortressChat = useCallback((message: string) => {
    send({ type: "game_chat_skyfortress", message });
  }, [send]);

  // Time Rift functions
  const joinTimeRiftLobby = useCallback(() => {
    send({ type: "lobby_join_timerift" });
  }, [send]);

  const leaveTimeRiftLobby = useCallback(() => {
    if (state.timeRiftLobby) {
      send({ type: "lobby_leave_timerift", lobbyId: state.timeRiftLobby.id });
    }
    setState((prev) => ({ ...prev, timeRiftLobby: null, timeRiftChatMessages: [] }));
  }, [send, state.timeRiftLobby]);

  const setTimeRiftTeam = useCallback((lobbyId: string, team: TimeRiftTeam) => {
    send({ type: "lobby_team_timerift", lobbyId, team });
  }, [send]);

  const setTimeRiftReady = useCallback((lobbyId: string, ready: boolean) => {
    send({ type: "lobby_ready_timerift", lobbyId, ready });
  }, [send]);

  const startTimeRiftGame = useCallback((lobbyId: string) => {
    send({ type: "lobby_start_timerift", lobbyId });
  }, [send]);

  const moveTimeRift = useCallback((gameId: string, x: number, y: number) => {
    send({ type: "game_move_timerift", gameId, x, y });
  }, [send]);

  const shootTimeRift = useCallback((gameId: string, targetX: number, targetY: number) => {
    send({ type: "game_shoot_timerift", gameId, targetX, targetY });
  }, [send]);

  const sendTimeRiftChat = useCallback((message: string) => {
    send({ type: "game_chat_timerift", message });
  }, [send]);

  // Shadow Ops functions
  const joinShadowOpsLobby = useCallback(() => {
    send({ type: "lobby_join_shadowops" });
  }, [send]);

  const leaveShadowOpsLobby = useCallback(() => {
    if (state.shadowOpsLobby) {
      send({ type: "lobby_leave_shadowops", lobbyId: state.shadowOpsLobby.id });
    }
    setState((prev) => ({ ...prev, shadowOpsLobby: null, shadowOpsChatMessages: [] }));
  }, [send, state.shadowOpsLobby]);

  const setShadowOpsTeam = useCallback((lobbyId: string, team: ShadowOpsTeam) => {
    send({ type: "lobby_team_shadowops", lobbyId, team });
  }, [send]);

  const setShadowOpsReady = useCallback((lobbyId: string, ready: boolean) => {
    send({ type: "lobby_ready_shadowops", lobbyId, ready });
  }, [send]);

  const startShadowOpsGame = useCallback((lobbyId: string) => {
    send({ type: "lobby_start_shadowops", lobbyId });
  }, [send]);

  const moveShadowOps = useCallback((gameId: string, x: number, y: number) => {
    send({ type: "game_move_shadowops", gameId, x, y });
  }, [send]);

  const stealthShadowOps = useCallback((gameId: string, stealth: boolean) => {
    send({ type: "game_stealth_shadowops", gameId, stealth });
  }, [send]);

  const sendShadowOpsChat = useCallback((message: string) => {
    send({ type: "game_chat_shadowops", message });
  }, [send]);

  // Elemental Conquest functions
  const joinElementalLobby = useCallback(() => {
    send({ type: "lobby_join_elemental" });
  }, [send]);

  const leaveElementalLobby = useCallback(() => {
    if (state.elementalLobby) {
      send({ type: "lobby_leave_elemental", lobbyId: state.elementalLobby.id });
    }
    setState((prev) => ({ ...prev, elementalLobby: null, elementalChatMessages: [] }));
  }, [send, state.elementalLobby]);

  const setElementalTeam = useCallback((lobbyId: string, team: ElementalTeam) => {
    send({ type: "lobby_team_elemental", lobbyId, team });
  }, [send]);

  const setElementalReady = useCallback((lobbyId: string, ready: boolean) => {
    send({ type: "lobby_ready_elemental", lobbyId, ready });
  }, [send]);

  const startElementalGame = useCallback((lobbyId: string) => {
    send({ type: "lobby_start_elemental", lobbyId });
  }, [send]);

  const moveElemental = useCallback((gameId: string, x: number, y: number) => {
    send({ type: "game_move_elemental", gameId, x, y });
  }, [send]);

  const castElemental = useCallback((gameId: string, targetX: number, targetY: number, element: "fire" | "water" | "earth" | "air", isArea: boolean) => {
    send({ type: "game_cast_elemental", gameId, targetX, targetY, element, isArea });
  }, [send]);

  const sendElementalChat = useCallback((message: string) => {
    send({ type: "game_chat_elemental", message });
  }, [send]);

  // Mech Arena functions
  const joinMechLobby = useCallback(() => {
    send({ type: "lobby_join_mech" });
  }, [send]);

  const leaveMechLobby = useCallback(() => {
    if (state.mechLobby) {
      send({ type: "lobby_leave_mech", lobbyId: state.mechLobby.id });
    }
    setState((prev) => ({ ...prev, mechLobby: null, mechChatMessages: [] }));
  }, [send, state.mechLobby]);

  const setMechTeam = useCallback((lobbyId: string, team: MechTeam) => {
    send({ type: "lobby_team_mech", lobbyId, team });
  }, [send]);

  const setMechReady = useCallback((lobbyId: string, ready: boolean) => {
    send({ type: "lobby_ready_mech", lobbyId, ready });
  }, [send]);

  const startMechGame = useCallback((lobbyId: string) => {
    send({ type: "lobby_start_mech", lobbyId });
  }, [send]);

  const moveMech = useCallback((gameId: string, x: number, y: number) => {
    send({ type: "game_move_mech", gameId, x, y });
  }, [send]);

  const shootMech = useCallback((gameId: string, targetX: number, targetY: number) => {
    send({ type: "game_shoot_mech", gameId, targetX, targetY });
  }, [send]);

  const upgradeMech = useCallback((gameId: string) => {
    send({ type: "game_upgrade_mech", gameId });
  }, [send]);

  const sendMechChat = useCallback((message: string) => {
    send({ type: "game_chat_mech", message });
  }, [send]);

  // Assassin's Grid functions
  const joinAssassinLobby = useCallback(() => {
    send({ type: "lobby_join_assassin" });
  }, [send]);

  const leaveAssassinLobby = useCallback(() => {
    if (state.assassinLobby) {
      send({ type: "lobby_leave_assassin", lobbyId: state.assassinLobby.id });
    }
    setState((prev) => ({ ...prev, assassinLobby: null, assassinChatMessages: [] }));
  }, [send, state.assassinLobby]);

  const setAssassinTeam = useCallback((lobbyId: string, team: AssassinTeam) => {
    send({ type: "lobby_team_assassin", lobbyId, team });
  }, [send]);

  const setAssassinReady = useCallback((lobbyId: string, ready: boolean) => {
    send({ type: "lobby_ready_assassin", lobbyId, ready });
  }, [send]);

  const startAssassinGame = useCallback((lobbyId: string) => {
    send({ type: "lobby_start_assassin", lobbyId });
  }, [send]);

  const moveAssassin = useCallback((gameId: string, gridX: number, gridY: number) => {
    send({ type: "game_move_assassin", gameId, gridX, gridY });
  }, [send]);

  const attackAssassin = useCallback((gameId: string, targetId: string) => {
    send({ type: "game_attack_assassin", gameId, targetId });
  }, [send]);

  const hideAssassin = useCallback((gameId: string) => {
    send({ type: "game_hide_assassin", gameId });
  }, [send]);

  const sendAssassinChat = useCallback((message: string) => {
    send({ type: "game_chat_assassin", message });
  }, [send]);

  // Direct Message functions
  const sendDirectMessage = useCallback(
    (toPlayerId: string, content: string) => {
      send({ type: "dm_send", toPlayerId, content });
    },
    [send],
  );

  const createWarzoneRoom = useCallback(
    (displayName: string, team: WarzoneTeam, map: WarzoneMap) => {
      send({ type: "warzone_create_room", displayName, team, map });
    },
    [send],
  );

  const joinWarzoneRoom = useCallback(
    (code: string, displayName: string, team: WarzoneTeam) => {
      send({ type: "warzone_join_room", code, displayName, team });
    },
    [send],
  );

  const leaveWarzoneRoom = useCallback(() => {
    send({ type: "warzone_leave_room" });
    setState((prev) => ({
      ...prev,
      warzoneRoom: null,
      warzoneStates: [],
      warzoneChatMessages: [],
    }));
  }, [send]);

  const startWarzoneGame = useCallback(() => {
    if (!state.warzoneRoom) return;
    send({ type: "warzone_start_game", code: state.warzoneRoom.code });
  }, [send, state.warzoneRoom]);

  const updateWarzoneState = useCallback(
    (nextState: WarzoneLocalPlayerState) => {
      if (!state.warzoneRoom) return;
      send({
        type: "warzone_state_update",
        code: state.warzoneRoom.code,
        state: nextState,
      });
    },
    [send, state.warzoneRoom],
  );

  const sendWarzoneChat = useCallback(
    (message: string) => {
      if (!state.warzoneRoom) return;
      send({ type: "warzone_chat_send", code: state.warzoneRoom.code, message });
    },
    [send, state.warzoneRoom],
  );

  const requestDmHistory = useCallback(
    (partnerId: string) => {
      send({ type: "dm_request", toPlayerId: partnerId });
    },
    [send],
  );

  const setCurrentDmPartner = useCallback((partnerId: string | null) => {
    setState((prev) => {
      if (!partnerId) {
        return { ...prev, currentDmPartner: null };
      }
      const nextUnread = new Map(prev.dmUnreadCounts);
      nextUnread.set(partnerId, 0);
      return {
        ...prev,
        currentDmPartner: partnerId,
        dmUnreadCounts: nextUnread,
        latestDmMessage:
          prev.latestDmMessage?.fromPlayerId === partnerId
            ? null
            : prev.latestDmMessage,
      };
    });
    if (partnerId) {
      send({ type: "dm_request", toPlayerId: partnerId });
    }
  }, [send]);

  return (
    <WebSocketContext.Provider
      value={{
        ...state,
        joinGame,
        sendChatMessage,
        sendChallenge,
        respondToChallenge,
        makeTTTMove,
        requestTTTRematch,
        leaveTTTGame,
        makeRPSChoice,
        requestRPSNextRound,
        leaveRPSGame,
        joinRiddleLobby,
        startRiddleGame,
        leaveRiddleLobby,
        submitRiddleAnswer,
        submitWSAnswer,
        requestWSNextRound,
        leaveWSGame,
        submitNGGuess,
        requestNGNextRound,
        leaveNGGame,
        submitQMAnswer,
        requestQMNextRound,
        leaveQMGame,
        makeC4Move,
        requestC4Rematch,
        leaveC4Game,
        joinMemoryLobby,
        startMemoryGame,
        leaveMemoryLobby,
        flipMemoryCard,
        joinTypingLobby,
        startTypingGame,
        leaveTypingLobby,
        updateTypingProgress,
        finishTypingRace,
        dismissChallenge,
        dismissOpponentLeftNotification,
        clearUnreadChat,
        clearLatestChatMessage,
        clearLatestDmMessage,
        clearDmUnreadForPartner,
        requestActiveTTTGames,
        spectateTTTGame,
        stopSpectatingTTT,
        requestActiveWSGames,
        spectateWSGame,
        stopSpectatingWS,
        requestActiveNGGames,
        spectateNGGame,
        stopSpectatingNG,
        requestActiveQMGames,
        spectateQMGame,
        stopSpectatingQM,
        requestActiveC4Games,
        spectateC4Game,
        stopSpectatingC4,
        requestActiveMemoryGames,
        spectateMemoryGame,
        stopSpectatingMemory,
        joinWerewolfLobby,
        updateWerewolfSettings,
        startWerewolfGame,
        leaveWerewolfLobby,
        werewolfAction,
        werewolfVote,
        joinSpyHuntLobby,
        startSpyHuntGame,
        leaveSpyHuntLobby,
        spyHuntAsk,
        spyHuntAnswer,
        spyHuntAccuse,
        spyHuntVote,
        spyHuntGuessLocation,
        createFpsLobby,
        joinFpsLobby,
        leaveFpsLobby,
        startFpsGame,
        fpsPlayerMove,
        fpsPlayerShoot,
        fpsPlayerRespawn,
        fpsChangeGun,
        adminKick,
        adminBan,
        adminClearChat,
        adminForceKick,
        adminUnban,
        adminGetBannedList,
        adminToggleVip,
        deleteMessage,
        sendEmojiReaction,
        clearEmojiReaction,
        joinPointOnPointLobby,
        startPointOnPointGame,
        leavePointOnPointLobby,
        submitPointOnPointSentence,
        endPointOnPointGame,
        joinPiratesLobby,
        selectPiratesTeam,
        selectPiratesClass,
        startPiratesGame,
        leavePiratesLobby,
        piratesMove,
        piratesShoot,
        joinOutpostRushLobby,
        selectOutpostRushTeam,
        startOutpostRushGame,
        leaveOutpostRushLobby,
        outpostRushMove,
        outpostRushCapture,
        outpostRushBuildDefense,
        outpostRushUpgradeWeapon,
        outpostRushAttack,
        outpostRushRevive,
        outpostRushCollectResources,
        sendOutpostRushChat,
        sendPointOnPointChat,
        clearOutpostRushChat,
        clearPointOnPointChat,
        requestLobbyCounts,
        joinEmojiChainLobby,
        startEmojiChainGame,
        leaveEmojiChainLobby,
        submitEmojiChainGuess,
        requestEmojiChainHint,
        sendEmojiChainChat,
        clearEmojiChainChat,
        joinWordAssociationLobby,
        startWordAssociationGame,
        leaveWordAssociationLobby,
        submitWordAssociationWord,
        sendWordAssociationChat,
        clearWordAssociationChat,
        joinHangmanLobby,
        startHangmanGame,
        leaveHangmanLobby,
        setHangmanWord,
        guessHangmanLetter,
        sendHangmanChat,
        clearHangmanChat,
        joinTriviaQuizLobby,
        startTriviaQuizGame,
        leaveTriviaQuizLobby,
        submitTriviaQuizAnswer,
        sendTriviaQuizChat,
        clearTriviaQuizChat,
        joinSquidGameLobby,
        startSquidGame,
        leaveSquidGameLobby,
        squidGameAction,
        sendSquidGameChat,
        clearSquidGameChat,
        joinTruthOrBluffLobby,
        startTruthOrBluffGame,
        leaveTruthOrBluffLobby,
        submitTruthOrBluffStory,
        voteTruthOrBluff,
        sendTruthOrBluffChat,
        clearTruthOrBluffChat,
        joinSpotTheLiarLobby,
        startSpotTheLiarGame,
        leaveSpotTheLiarLobby,
        submitSpotTheLiarDescription,
        voteSpotTheLiar,
        sendSpotTheLiarChat,
        clearSpotTheLiarChat,
        joinEscapeShipLobby,
        startEscapeShipGame,
        leaveEscapeShipLobby,
        escapeShipAction,
        sendEscapeShipChat,
        clearEscapeShipChat,
        joinReactionRaceLobby,
        leaveReactionRaceLobby,
        startReactionRaceGame,
        reactReactionRace,
        sendReactionRaceChat,
        clearReactionRaceChat,
        joinColorClashLobby,
        leaveColorClashLobby,
        startColorClashGame,
        inputColorClash,
        submitColorClash,
        sendColorClashChat,
        clearColorClashChat,
        joinCastlesLobby,
        leaveCastlesLobby,
        setCastlesTeam,
        setCastlesReady,
        startCastlesGame,
        sendCastlesCommand,
        sendCastlesChatMessage,
        leaveCastlesGame,
        joinShipsBattleLobby,
        leaveShipsBattleLobby,
        startShipsBattleGame,
        placeShipsBattleShip,
        setShipsBattleReady,
        shootShipsBattle,
        leaveShipsBattleGame,
        rematchShipsBattle,
        sendDirectMessage,
        createWarzoneRoom,
        joinWarzoneRoom,
        leaveWarzoneRoom,
        startWarzoneGame,
        updateWarzoneState,
        sendWarzoneChat,
        requestDmHistory,
        setCurrentDmPartner,
        joinHideSeekLobby,
        startHideSeekGame,
        leaveHideSeekLobby,
        setHideSeekSettings,
        hideSeekMove,
        hideSeekAction,
        sendHideSeekChat,
        clearHideSeekChat,
        joinBattleshipLobby,
        leaveBattleshipLobby,
        startBattleshipGame,
        placeBattleshipShip,
        readyBattleship,
        shootBattleship,
        leaveBattleshipGame,
        sendBattleshipChat,
        joinCTFLobby,
        leaveCTFLobby,
        setCTFTeam,
        setCTFReady,
        startCTFGame,
        moveCTF,
        tagCTF,
        leaveCTFGame,
        sendCTFChat,
        joinSiegeWarLobby,
        leaveSiegeWarLobby,
        setSiegeWarTeam,
        setSiegeWarReady,
        startSiegeWarGame,
        spawnSiegeWarUnit,
        moveSiegeWarUnits,
        attackSiegeWar,
        leaveSiegeWarGame,
        sendSiegeWarChat,
      }}
    >
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error("useWebSocket must be used within a WebSocketProvider");
  }
  return context;
}
