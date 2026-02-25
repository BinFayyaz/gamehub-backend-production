import { z } from "zod";

export const userSchema = z.object({
  id: z.string(),
  username: z.string().min(2).max(20),
  passwordHash: z.string(),
});

export type User = z.infer<typeof userSchema>;
export type InsertUser = Omit<User, "id">;

export const insertUserSchema = userSchema.omit({ id: true });

export const loginSchema = z.object({
  username: z.string().min(2).max(20),
  password: z.string().min(6),
});

export const registerSchema = z.object({
  username: z.string().min(2).max(20),
  password: z.string().min(6),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;

export const screenshotSchema = z.object({
  id: z.string(),
  uploaderId: z.string(),
  uploaderName: z.string(),
  filename: z.string(),
  gameName: z.string(),
  timestamp: z.number(),
});

export type Screenshot = z.infer<typeof screenshotSchema>;

export const tutorialSchema = z.object({
  id: z.string(),
  gameType: z.string(),
  title: z.string(),
  description: z.string(),
  videoFilename: z.string(),
  uploaderId: z.string(),
  uploaderName: z.string(),
  timestamp: z.number(),
});

export type Tutorial = z.infer<typeof tutorialSchema>;

export const avatarStyleSchema = z.enum([
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
]);

export type AvatarStyle = z.infer<typeof avatarStyleSchema>;

export const playerSchema = z.object({
  id: z.string(),
  username: z.string().min(1).max(20),
  status: z.enum(["online", "in_game", "away"]),
  currentGame: z.string().nullable(),
  avatar: z.string().nullable().optional(),
  avatarStyle: avatarStyleSchema.optional(),
  achievements: z.array(z.string()).optional(),
  badges: z.array(z.string()).optional(),
  friends: z.array(z.string()).optional(),
  isVip: z.boolean().optional(),
  level: z.number().default(1).optional(),
  wins: z.number().default(0).optional(),
  losses: z.number().default(0).optional(),
});

export type Player = z.infer<typeof playerSchema>;
export type InsertPlayer = Omit<Player, "id">;

export const insertPlayerSchema = playerSchema.omit({ id: true });

export const badgeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
});

export type Badge = z.infer<typeof badgeSchema>;

export const achievementSchema = z.object({
  id: z.string(),
  playerId: z.string(),
  achievementType: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  unlockedAt: z.number(),
  rarity: z.enum(["common", "rare", "epic", "legendary"]).optional(),
});

export type Achievement = z.infer<typeof achievementSchema>;
export type InsertAchievement = Omit<Achievement, "id">;

export const friendSchema = z.object({
  id: z.string(),
  playerId: z.string(),
  friendId: z.string(),
  friendName: z.string(),
  status: z.enum(["pending", "accepted", "blocked"]),
  addedAt: z.number(),
});

export type Friend = z.infer<typeof friendSchema>;
export type InsertFriend = Omit<Friend, "id">;

export const spectatorSchema = z.object({
  playerId: z.string(),
  playerName: z.string(),
  joinedAt: z.number(),
});

export type Spectator = z.infer<typeof spectatorSchema>;

export const messageSchema = z.object({
  id: z.string(),
  playerId: z.string(),
  playerName: z.string(),
  content: z.string(),
  timestamp: z.number(),
  isAdmin: z.boolean().optional(),
  isVip: z.boolean().optional(),
});

export type Message = z.infer<typeof messageSchema>;
export type InsertMessage = Omit<Message, "id">;

export const challengeSchema = z.object({
  id: z.string(),
  fromPlayerId: z.string(),
  fromPlayerName: z.string(),
  toPlayerId: z.string(),
  toPlayerName: z.string(),
  gameType: z.enum(["tictactoe", "rps", "wordscramble", "numberguess", "quickmath", "connectfour"]),
  status: z.enum(["pending", "accepted", "declined", "expired"]),
  timestamp: z.number(),
});

export type Challenge = z.infer<typeof challengeSchema>;

export const ticTacToeGameSchema = z.object({
  id: z.string(),
  player1Id: z.string(),
  player1Name: z.string(),
  player2Id: z.string(),
  player2Name: z.string(),
  board: z.array(z.string().nullable()),
  currentTurn: z.string(),
  winner: z.string().nullable(),
  isDraw: z.boolean(),
  status: z.enum(["playing", "finished"]),
  player1Score: z.number(),
  player2Score: z.number(),
  spectators: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })),
});

export type TicTacToeGame = z.infer<typeof ticTacToeGameSchema>;

export const rpsGameSchema = z.object({
  id: z.string(),
  player1Id: z.string(),
  player1Name: z.string(),
  player2Id: z.string(),
  player2Name: z.string(),
  player1Choice: z.enum(["rock", "paper", "scissors"]).nullable(),
  player2Choice: z.enum(["rock", "paper", "scissors"]).nullable(),
  roundWinner: z.string().nullable(),
  player1Score: z.number(),
  player2Score: z.number(),
  round: z.number(),
  status: z.enum(["choosing", "revealing", "finished"]),
});

export type RPSGame = z.infer<typeof rpsGameSchema>;
export type RPSChoice = "rock" | "paper" | "scissors";

export const riddleLobbySchema = z.object({
  id: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    score: z.number(),
    hasAnswered: z.boolean(),
  })),
  hostId: z.string(),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
  vipOnly: z.boolean(),
});

export type RiddleLobby = z.infer<typeof riddleLobbySchema>;

export const riddleGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    score: z.number(),
    hasAnswered: z.boolean(),
    totalTime: z.number(),
  })),
  currentRiddle: z.object({
    question: z.string(),
    answer: z.string(),
    hint: z.string().optional(),
  }).nullable(),
  riddleIndex: z.number(),
  totalRiddles: z.number(),
  status: z.enum(["question", "reveal", "finished"]),
  roundStartTime: z.number(),
  correctAnswers: z.array(z.string()),
});

export type RiddleGame = z.infer<typeof riddleGameSchema>;

export const wordScrambleGameSchema = z.object({
  id: z.string(),
  player1Id: z.string(),
  player1Name: z.string(),
  player2Id: z.string(),
  player2Name: z.string(),
  originalWord: z.string().optional(),
  scrambledWord: z.string(),
  player1Answer: z.string().nullable(),
  player2Answer: z.string().nullable(),
  player1Time: z.number().nullable(),
  player2Time: z.number().nullable(),
  player1Correct: z.boolean().optional(),
  player2Correct: z.boolean().optional(),
  roundWinner: z.string().nullable(),
  player1Score: z.number(),
  player2Score: z.number(),
  round: z.number(),
  roundStartTime: z.number(),
  status: z.enum(["playing", "revealing", "finished"]),
  spectators: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).optional(),
});

export type WordScrambleGame = z.infer<typeof wordScrambleGameSchema>;

export const numberGuessGameSchema = z.object({
  id: z.string(),
  player1Id: z.string(),
  player1Name: z.string(),
  player2Id: z.string(),
  player2Name: z.string(),
  targetNumber: z.number(),
  player1Guesses: z.array(z.object({
    guess: z.number(),
    hint: z.enum(["higher", "lower", "correct"]),
  })),
  player2Guesses: z.array(z.object({
    guess: z.number(),
    hint: z.enum(["higher", "lower", "correct"]),
  })),
  winner: z.string().nullable(),
  player1Score: z.number(),
  player2Score: z.number(),
  round: z.number(),
  status: z.enum(["playing", "finished"]),
  spectators: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).optional(),
});

export type NumberGuessGame = z.infer<typeof numberGuessGameSchema>;

export const quickMathGameSchema = z.object({
  id: z.string(),
  player1Id: z.string(),
  player1Name: z.string(),
  player2Id: z.string(),
  player2Name: z.string(),
  problem: z.string(),
  answer: z.number().optional(),
  player1Answer: z.number().nullable(),
  player2Answer: z.number().nullable(),
  player1Time: z.number().nullable(),
  player2Time: z.number().nullable(),
  player1Correct: z.boolean().optional(),
  player2Correct: z.boolean().optional(),
  roundWinner: z.string().nullable(),
  player1Score: z.number(),
  player2Score: z.number(),
  round: z.number(),
  roundStartTime: z.number(),
  status: z.enum(["playing", "revealing", "finished"]),
  spectators: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).optional(),
});

export type QuickMathGame = z.infer<typeof quickMathGameSchema>;

export const connectFourGameSchema = z.object({
  id: z.string(),
  player1Id: z.string(),
  player1Name: z.string(),
  player2Id: z.string(),
  player2Name: z.string(),
  board: z.array(z.array(z.string().nullable())),
  currentTurn: z.string(),
  winner: z.string().nullable(),
  winningCells: z.array(z.object({ row: z.number(), col: z.number() })).optional(),
  isDraw: z.boolean(),
  status: z.enum(["playing", "finished"]),
  player1Score: z.number(),
  player2Score: z.number(),
  spectators: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).optional(),
});

export type ConnectFourGame = z.infer<typeof connectFourGameSchema>;

export const memoryMatchLobbySchema = z.object({
  id: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    score: z.number(),
    pairs: z.number(),
  })),
  hostId: z.string(),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
});

export type MemoryMatchLobby = z.infer<typeof memoryMatchLobbySchema>;

export const memoryMatchGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    score: z.number(),
    pairs: z.number(),
  })),
  cards: z.array(z.object({
    id: z.number(),
    symbol: z.string(),
    isFlipped: z.boolean(),
    isMatched: z.boolean(),
  })),
  currentTurn: z.string(),
  flippedCards: z.array(z.number()),
  status: z.enum(["playing", "checking", "finished"]),
  totalPairs: z.number(),
  matchedPairs: z.number(),
  spectators: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })).optional(),
});

export type MemoryMatchGame = z.infer<typeof memoryMatchGameSchema>;

export const typingRaceLobbySchema = z.object({
  id: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    progress: z.number(),
    wpm: z.number(),
    finished: z.boolean(),
    finishTime: z.number().nullable(),
  })),
  hostId: z.string(),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
});

export type TypingRaceLobby = z.infer<typeof typingRaceLobbySchema>;

export const typingRaceGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    progress: z.number(),
    wpm: z.number(),
    finished: z.boolean(),
    finishTime: z.number().nullable(),
  })),
  text: z.string(),
  startTime: z.number(),
  status: z.enum(["countdown", "racing", "finished"]),
  winner: z.string().nullable(),
});

export type TypingRaceGame = z.infer<typeof typingRaceGameSchema>;

export const werewolfRoleSchema = z.enum(["villager", "werewolf", "seer", "doctor"]);
export type WerewolfRole = z.infer<typeof werewolfRoleSchema>;

export const werewolfPhaseSchema = z.enum(["night", "morning", "discussion", "voting"]);
export type WerewolfPhase = z.infer<typeof werewolfPhaseSchema>;

export const werewolfPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: werewolfRoleSchema,
  isAlive: z.boolean(),
  votes: z.number(),
});

export type WerewolfPlayer = z.infer<typeof werewolfPlayerSchema>;

export const werewolfLobbySchema = z.object({
  id: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })),
  hostId: z.string(),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
  maxPlayers: z.number(),
  enableSeer: z.boolean(),
  enableDoctor: z.boolean(),
  vipOnly: z.boolean(),
});

export type WerewolfLobby = z.infer<typeof werewolfLobbySchema>;

export const werewolfGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(werewolfPlayerSchema),
  phase: werewolfPhaseSchema,
  phaseEndTime: z.number(),
  day: z.number(),
  werewolfTarget: z.string().nullable(),
  doctorProtect: z.string().nullable(),
  seerInspect: z.string().nullable(),
  seerResult: z.string().nullable(),
  votes: z.record(z.string(), z.string()),
  eliminatedTonight: z.string().nullable(),
  lastNightVictim: z.string().nullable(),
  lastVoteResult: z.enum(["werewolf_eliminated", "villager_safe", "tie"]).nullable(),
  lastVoteSuspect: z.string().nullable(),
  winner: z.enum(["villagers", "werewolves"]).nullable(),
  status: z.enum(["playing", "finished"]),
  actionsSubmitted: z.object({
    werewolves: z.boolean(),
    doctor: z.boolean(),
    seer: z.boolean(),
  }),
});

export type WerewolfGame = z.infer<typeof werewolfGameSchema>;

export const spyHuntLobbySchema = z.object({
  id: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })),
  hostId: z.string(),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
  maxPlayers: z.number(),
});

export type SpyHuntLobby = z.infer<typeof spyHuntLobbySchema>;

export const spyHuntGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    hasVoted: z.boolean(),
  })),
  spyId: z.string(),
  location: z.string(),
  currentTurn: z.string(),
  questionHistory: z.array(z.object({
    askerId: z.string(),
    askerName: z.string(),
    targetId: z.string(),
    targetName: z.string(),
    question: z.string(),
    answer: z.string().nullable(),
  })),
  votes: z.record(z.string(), z.string()),
  votingActive: z.boolean(),
  accuserId: z.string().nullable(),
  accusedId: z.string().nullable(),
  roundTimer: z.number(),
  status: z.enum(["questioning", "voting", "finished"]),
  winner: z.enum(["spy", "players"]).nullable(),
  winReason: z.string().nullable(),
});

export type SpyHuntGame = z.infer<typeof spyHuntGameSchema>;

// FPS Game Types
export const fpsGunTypeSchema = z.enum(["sniper", "ak47", "rpg"]);
export type FpsGunType = z.infer<typeof fpsGunTypeSchema>;

export const fpsGameModeSchema = z.enum(["team", "ffa"]);
export type FpsGameMode = z.infer<typeof fpsGameModeSchema>;

export const fpsPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  team: z.enum(["A", "B"]).optional(),
  gun: fpsGunTypeSchema,
  kills: z.number(),
  deaths: z.number(),
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  rotation: z.object({ x: z.number(), y: z.number() }),
  health: z.number(),
  isAlive: z.boolean(),
});

export type FpsPlayer = z.infer<typeof fpsPlayerSchema>;

export const fpsGameSchema = z.object({
  id: z.string(),
  code: z.string(),
  hostId: z.string(),
  mode: fpsGameModeSchema,
  status: z.enum(["lobby", "playing", "finished"]),
  players: z.array(fpsPlayerSchema),
  teamAScore: z.number(),
  teamBScore: z.number(),
  timeLimit: z.number(),
  startTime: z.number().optional(),
  endTime: z.number().optional(),
});

export type FpsGame = z.infer<typeof fpsGameSchema>;

// Point on Point Game Types
export const pointOnPointLobbySchema = z.object({
  id: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })),
  hostId: z.string(),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
  maxPlayers: z.number(),
  showSentence: z.boolean(),
});

export type PointOnPointLobby = z.infer<typeof pointOnPointLobbySchema>;

export const pointOnPointGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })),
  hostId: z.string(),
  sentences: z.array(z.object({
    playerId: z.string(),
    playerName: z.string(),
    sentence: z.string(),
    round: z.number(),
  })),
  currentTurn: z.string(),
  turnOrder: z.array(z.string()),
  currentRound: z.number(),
  initialSentence: z.string().nullable(),
  status: z.enum(["playing", "finished"]),
});

export type PointOnPointGame = z.infer<typeof pointOnPointGameSchema>;

// Pirates Game Types
export const piratesClassSchema = z.enum(["archer", "bomber", "defender", "hookraider"]);
export type PiratesClass = z.infer<typeof piratesClassSchema>;

export const piratesTeamSchema = z.enum(["red", "green"]);
export type PiratesTeam = z.infer<typeof piratesTeamSchema>;

export const piratesPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  team: piratesTeamSchema,
  playerClass: piratesClassSchema,
  x: z.number(),
  y: z.number(),
  health: z.number(),
  isAlive: z.boolean(),
  kills: z.number(),
  deaths: z.number(),
});

export type PiratesPlayer = z.infer<typeof piratesPlayerSchema>;

export const piratesLobbySchema = z.object({
  id: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    team: piratesTeamSchema.nullable(),
    playerClass: piratesClassSchema.nullable(),
  })),
  hostId: z.string(),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
  maxPlayers: z.number(),
});

export type PiratesLobby = z.infer<typeof piratesLobbySchema>;

export const piratesGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(piratesPlayerSchema),
  spectators: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })),
  redShipHealth: z.number(),
  greenShipHealth: z.number(),
  projectiles: z.array(z.object({
    id: z.string(),
    ownerId: z.string(),
    x: z.number(),
    y: z.number(),
    vx: z.number(),
    vy: z.number(),
    type: z.enum(["arrow", "bomb", "hook"]),
  })),
  hazards: z.array(z.object({
    id: z.string(),
    type: z.enum(["wave", "barrel", "bird"]),
    x: z.number(),
    y: z.number(),
  })),
  winner: piratesTeamSchema.nullable(),
  status: z.enum(["playing", "finished"]),
});

export type PiratesGame = z.infer<typeof piratesGameSchema>;

// Outpost Rush Game Types
export const outpostRushLobbySchema = z.object({
  id: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    team: z.enum(["alpha", "beta"]).nullable(),
  })),
  hostId: z.string(),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
  maxPlayers: z.number(),
});

export type OutpostRushLobby = z.infer<typeof outpostRushLobbySchema>;

export const outpostRushPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  team: z.enum(["alpha", "beta"]),
  x: z.number(),
  y: z.number(),
  health: z.number(),
  isAlive: z.boolean(),
  resources: z.number(),
  weaponLevel: z.number(),
  kills: z.number(),
  deaths: z.number(),
});

export type OutpostRushPlayer = z.infer<typeof outpostRushPlayerSchema>;

export const outpostSchema = z.object({
  id: z.string(),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  owner: z.enum(["alpha", "beta", "neutral"]),
  captureProgress: z.number(),
  resourceRate: z.number(),
  storedResources: z.number().default(0),
});

export type Outpost = z.infer<typeof outpostSchema>;

export const outpostRushGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(outpostRushPlayerSchema),
  outposts: z.array(outpostSchema),
  alphaBaseHealth: z.number(),
  betaBaseHealth: z.number(),
  alphaHoldTime: z.number(),
  betaHoldTime: z.number(),
  defenses: z.array(z.object({
    id: z.string(),
    team: z.enum(["alpha", "beta"]),
    type: z.enum(["wall", "turret", "trap"]),
    x: z.number(),
    y: z.number(),
    health: z.number(),
  })),
  events: z.array(z.object({
    id: z.string(),
    type: z.enum(["sandstorm", "treasure", "boss"]),
    x: z.number(),
    y: z.number(),
    active: z.boolean(),
  })),
  boss: z.object({
    active: z.boolean(),
    x: z.number(),
    y: z.number(),
    health: z.number(),
    target: z.enum(["alpha", "beta"]).nullable(),
  }).nullable(),
  startTime: z.number(),
  winner: z.enum(["alpha", "beta"]).nullable(),
  winReason: z.string().nullable(),
  status: z.enum(["playing", "finished"]),
});

export type OutpostRushGame = z.infer<typeof outpostRushGameSchema>;

// Emoji Chain Game Types
export const emojiChainLobbySchema = z.object({
  id: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    score: z.number(),
  })),
  hostId: z.string(),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
  maxPlayers: z.number(),
});

export type EmojiChainLobby = z.infer<typeof emojiChainLobbySchema>;

export const emojiChainGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    score: z.number(),
    hasGuessed: z.boolean(),
    isEliminated: z.boolean(),
  })),
  currentEmojis: z.string(),
  currentAnswer: z.string(),
  currentHint: z.string().nullable(),
  roundIndex: z.number(),
  totalRounds: z.number(),
  roundStartTime: z.number(),
  correctGuessers: z.array(z.string()),
  status: z.enum(["playing", "reveal", "finished"]),
});

export type EmojiChainGame = z.infer<typeof emojiChainGameSchema>;

// Word Association Game Types
export const wordAssociationLobbySchema = z.object({
  id: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    score: z.number(),
  })),
  hostId: z.string(),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
  maxPlayers: z.number(),
});

export type WordAssociationLobby = z.infer<typeof wordAssociationLobbySchema>;

export const wordAssociationGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    score: z.number(),
    isEliminated: z.boolean(),
  })),
  currentWord: z.string(),
  wordChain: z.array(z.object({
    word: z.string(),
    playerId: z.string(),
    playerName: z.string(),
  })),
  currentTurn: z.string(),
  turnOrder: z.array(z.string()),
  turnStartTime: z.number(),
  roundNumber: z.number(),
  status: z.enum(["playing", "finished"]),
  winner: z.string().nullable(),
});

export type WordAssociationGame = z.infer<typeof wordAssociationGameSchema>;

// Hangman Game Types
export const hangmanLobbySchema = z.object({
  id: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    score: z.number(),
  })),
  hostId: z.string(),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
  maxPlayers: z.number(),
});

export type HangmanLobby = z.infer<typeof hangmanLobbySchema>;

export const hangmanGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    score: z.number(),
  })),
  wordSetter: z.string(),
  word: z.string(),
  revealedWord: z.string(),
  guessedLetters: z.array(z.string()),
  wrongGuesses: z.number(),
  maxWrongGuesses: z.number(),
  currentGuesser: z.string(),
  turnOrder: z.array(z.string()),
  roundNumber: z.number(),
  status: z.enum(["setting_word", "guessing", "round_end", "finished"]),
  winner: z.string().nullable(),
  lastGuess: z.object({
    letter: z.string(),
    playerId: z.string(),
    playerName: z.string(),
    correct: z.boolean(),
  }).nullable(),
});

export type HangmanGame = z.infer<typeof hangmanGameSchema>;

// Trivia Quiz Game Types
export const triviaQuizLobbySchema = z.object({
  id: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    score: z.number(),
  })),
  hostId: z.string(),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
  maxPlayers: z.number(),
});

export type TriviaQuizLobby = z.infer<typeof triviaQuizLobbySchema>;

export const triviaQuizGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    score: z.number(),
    hasAnswered: z.boolean(),
    lastAnswerCorrect: z.boolean().nullable(),
  })),
  currentQuestion: z.object({
    question: z.string(),
    options: z.array(z.string()),
    correctIndex: z.number(),
    category: z.string(),
  }).nullable(),
  questionIndex: z.number(),
  totalQuestions: z.number(),
  questionStartTime: z.number(),
  timeLimit: z.number(),
  status: z.enum(["question", "reveal", "finished"]),
  correctAnswers: z.array(z.object({
    playerId: z.string(),
    playerName: z.string(),
    timeMs: z.number(),
  })),
});

export type TriviaQuizGame = z.infer<typeof triviaQuizGameSchema>;

// Squid Game Types
export const squidGameMiniGame = z.enum(["red_light_green_light", "cookie_cutter", "marbles", "glass_bridge", "tug_of_war"]);
export type SquidGameMiniGame = z.infer<typeof squidGameMiniGame>;

export const squidGameLobbySchema = z.object({
  id: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })),
  hostId: z.string(),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
  maxPlayers: z.number(),
  vipOnly: z.boolean(),
});

export type SquidGameLobby = z.infer<typeof squidGameLobbySchema>;

export const squidGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    isAlive: z.boolean(),
    score: z.number(),
    position: z.number(),
    lastAction: z.number(),
  })),
  currentRound: z.number(),
  totalRounds: z.number(),
  currentMiniGame: squidGameMiniGame,
  miniGameState: z.object({
    isGreenLight: z.boolean().optional(),
    lightChangeTime: z.number().optional(),
    cookieShape: z.string().optional(),
    cookieProgress: z.record(z.string(), z.number()).optional(),
    glassPath: z.array(z.boolean()).optional(),
    playerPositions: z.record(z.string(), z.number()).optional(),
    marblePairs: z.array(z.object({
      player1: z.string(),
      player2: z.string(),
      player1Marbles: z.number(),
      player2Marbles: z.number(),
      currentBet: z.number(),
      currentGuesser: z.string(),
      betAmount: z.number().optional(),
      guessOddOrEven: z.string().optional(),
    })).optional(),
    tugOfWarTeams: z.object({
      team1: z.array(z.string()),
      team2: z.array(z.string()),
      team1Strength: z.number(),
      team2Strength: z.number(),
      ropePosition: z.number(),
    }).optional(),
  }),
  roundStartTime: z.number(),
  roundTimeLimit: z.number(),
  survivors: z.array(z.string()),
  eliminated: z.array(z.string()),
  winners: z.array(z.string()),
  status: z.enum(["playing", "between_rounds", "finished"]),
});

export type SquidGame = z.infer<typeof squidGameSchema>;

// Truth or Bluff Game Types
export const truthOrBluffLobbySchema = z.object({
  id: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    score: z.number(),
  })),
  hostId: z.string(),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
  maxPlayers: z.number(),
});

export type TruthOrBluffLobby = z.infer<typeof truthOrBluffLobbySchema>;

export const truthOrBluffGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    score: z.number(),
    isReady: z.boolean(),
  })),
  currentStoryteller: z.string(),
  currentStory: z.string().nullable(),
  storyIsTruth: z.boolean().nullable(),
  votes: z.record(z.string(), z.boolean()),
  voteResults: z.array(z.object({
    playerId: z.string(),
    playerName: z.string(),
    votedTruth: z.boolean(),
    wasCorrect: z.boolean(),
  })),
  turnOrder: z.array(z.string()),
  currentTurnIndex: z.number(),
  roundNumber: z.number(),
  totalRounds: z.number(),
  status: z.enum(["waiting_story", "voting", "reveal", "finished"]),
  storyHistory: z.array(z.object({
    storytellerId: z.string(),
    storytellerName: z.string(),
    story: z.string(),
    wasTruth: z.boolean(),
    votes: z.record(z.string(), z.boolean()),
  })),
});

export type TruthOrBluffGame = z.infer<typeof truthOrBluffGameSchema>;

// Spot the Liar Game Types
export const spotTheLiarLobbySchema = z.object({
  id: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    score: z.number(),
  })),
  hostId: z.string(),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
  maxPlayers: z.number(),
});

export type SpotTheLiarLobby = z.infer<typeof spotTheLiarLobbySchema>;

export const spotTheLiarGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    score: z.number(),
  })),
  liarId: z.string(),
  realWord: z.string(),
  fakeWord: z.string(),
  category: z.string(),
  currentDescriber: z.string(),
  descriptions: z.array(z.object({
    playerId: z.string(),
    playerName: z.string(),
    description: z.string(),
  })),
  describerOrder: z.array(z.string()),
  currentDescriberIndex: z.number(),
  votes: z.record(z.string(), z.string()),
  status: z.enum(["describing", "voting", "reveal", "finished"]),
  roundNumber: z.number(),
  totalRounds: z.number(),
  roundHistory: z.array(z.object({
    liarId: z.string(),
    liarName: z.string(),
    realWord: z.string(),
    fakeWord: z.string(),
    liarCaught: z.boolean(),
    votes: z.record(z.string(), z.string()),
  })),
  timer: z.number().nullable(),
});

export type SpotTheLiarGame = z.infer<typeof spotTheLiarGameSchema>;

// Song and Playlist Types
export const songSchema = z.object({
  id: z.string(),
  name: z.string(),
  filename: z.string(),
  uploaderId: z.string(),
  uploaderName: z.string(),
  isPublic: z.boolean(),
  timestamp: z.number(),
});

export type Song = z.infer<typeof songSchema>;

export const playlistSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  songIds: z.array(z.string()),
  creatorId: z.string(),
  creatorName: z.string(),
  isPublic: z.boolean(),
  timestamp: z.number(),
});

export type Playlist = z.infer<typeof playlistSchema>;

// Direct Message Types
export const directMessageSchema = z.object({
  id: z.string(),
  fromPlayerId: z.string(),
  fromPlayerName: z.string(),
  toPlayerId: z.string(),
  toPlayerName: z.string(),
  content: z.string(),
  timestamp: z.number(),
  isRead: z.boolean(),
});

export type DirectMessage = z.infer<typeof directMessageSchema>;

// Escape Ship Game Types
export const escapeShipRoomType = z.enum(["engine", "bridge", "cargo", "lab", "airlock", "escape_pod"]);
export type EscapeShipRoomType = z.infer<typeof escapeShipRoomType>;

export const escapeShipLobbySchema = z.object({
  id: z.string(),
  hostId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })),
  minPlayers: z.number(),
  maxPlayers: z.number(),
  status: z.enum(["waiting", "starting", "in_game"]),
  vipOnly: z.boolean(),
});

export type EscapeShipLobby = z.infer<typeof escapeShipLobbySchema>;

export const escapeShipGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    currentRoom: escapeShipRoomType,
    hasKey: z.boolean(),
    hasFuel: z.boolean(),
    hasCode: z.boolean(),
    isStunned: z.boolean(),
    stunEndTime: z.number().nullable(),
    escaped: z.boolean(),
    finishTime: z.number().nullable(),
    position: z.number(),
  })),
  roomPuzzles: z.record(escapeShipRoomType, z.object({
    solved: z.boolean(),
    solvedBy: z.string().nullable(),
    puzzleType: z.string(),
    answer: z.string(),
    hint: z.string(),
    trapActive: z.boolean(),
    trapType: z.string().nullable(),
  })),
  gameTimer: z.number(),
  startTime: z.number(),
  status: z.enum(["playing", "finished"]),
  rankings: z.array(z.object({
    playerId: z.string(),
    playerName: z.string(),
    time: z.number(),
    position: z.number(),
  })),
  events: z.array(z.object({
    type: z.string(),
    playerId: z.string(),
    playerName: z.string(),
    message: z.string(),
    timestamp: z.number(),
  })),
});

export type EscapeShipGame = z.infer<typeof escapeShipGameSchema>;

// Reaction Race - Fast-paced reaction time game
export const reactionRaceLobbySchema = z.object({
  id: z.string(),
  hostId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })),
  minPlayers: z.number(),
  maxPlayers: z.number(),
  status: z.enum(["waiting", "starting", "in_game"]),
});

export type ReactionRaceLobby = z.infer<typeof reactionRaceLobbySchema>;

export const reactionRaceGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    score: z.number(),
    lastReactionTime: z.number().nullable(),
    falseStart: z.boolean(),
  })),
  currentRound: z.number(),
  totalRounds: z.number(),
  roundStartTime: z.number().nullable(),
  signalTime: z.number().nullable(),
  roundStatus: z.enum(["waiting", "ready", "signal", "complete"]),
  status: z.enum(["playing", "finished"]),
  winner: z.string().nullable(),
  roundResults: z.array(z.object({
    round: z.number(),
    winnerId: z.string().nullable(),
    winnerName: z.string().nullable(),
    reactionTime: z.number().nullable(),
  })),
});

export type ReactionRaceGame = z.infer<typeof reactionRaceGameSchema>;

// Color Clash - Memory-based color sequence game
export const colorClashLobbySchema = z.object({
  id: z.string(),
  hostId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })),
  minPlayers: z.number(),
  maxPlayers: z.number(),
  status: z.enum(["waiting", "starting", "in_game"]),
});

export type ColorClashLobby = z.infer<typeof colorClashLobbySchema>;

export const colorClashGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    isEliminated: z.boolean(),
    currentInput: z.array(z.string()),
    hasSubmitted: z.boolean(),
  })),
  colorSequence: z.array(z.string()),
  currentRound: z.number(),
  roundStatus: z.enum(["showing", "input", "results"]),
  status: z.enum(["playing", "finished"]),
  winner: z.string().nullable(),
  winnerName: z.string().nullable(),
  showingIndex: z.number(),
  roundStartTime: z.number().nullable(),
});

export type ColorClashGame = z.infer<typeof colorClashGameSchema>;

// Active lobby counts for display
export const lobbyCountSchema = z.object({
  gameType: z.string(),
  current: z.number(),
  capacity: z.number(),
});

export type LobbyCount = z.infer<typeof lobbyCountSchema>;

// Castles: Siege Dominion Types
export const castlesTeamSchema = z.enum(["red", "blue"]);
export type CastlesTeam = z.infer<typeof castlesTeamSchema>;

export const castlesUnitTypeSchema = z.enum(["worker", "soldier", "archer", "catapult"]);
export type CastlesUnitType = z.infer<typeof castlesUnitTypeSchema>;

export const castlesBuildingTypeSchema = z.enum(["castle_center", "wall", "barracks", "catapult_factory", "farm"]);
export type CastlesBuildingType = z.infer<typeof castlesBuildingTypeSchema>;

export const castlesUnitSchema = z.object({
  id: z.string(),
  type: castlesUnitTypeSchema,
  team: castlesTeamSchema,
  ownerId: z.string(),
  x: z.number(),
  y: z.number(),
  health: z.number(),
  maxHealth: z.number(),
  targetX: z.number().nullable(),
  targetY: z.number().nullable(),
  attackTarget: z.string().nullable(),
  isGathering: z.boolean(),
  gatherType: z.enum(["wood", "food"]).nullable(),
  carryingAmount: z.number(),
});

export type CastlesUnit = z.infer<typeof castlesUnitSchema>;

export const castlesBuildingSchema = z.object({
  id: z.string(),
  type: castlesBuildingTypeSchema,
  team: castlesTeamSchema,
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  health: z.number(),
  maxHealth: z.number(),
});

export type CastlesBuilding = z.infer<typeof castlesBuildingSchema>;

export const castlesTreeSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  wood: z.number(),
});

export type CastlesTree = z.infer<typeof castlesTreeSchema>;

export const castlesPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  team: castlesTeamSchema,
  wood: z.number(),
  food: z.number(),
  isReady: z.boolean(),
});

export type CastlesPlayer = z.infer<typeof castlesPlayerSchema>;

export const castlesLobbySchema = z.object({
  id: z.string(),
  hostId: z.string(),
  players: z.array(castlesPlayerSchema),
  status: z.enum(["waiting", "starting", "in_game"]),
  minPlayers: z.number(),
  maxPlayers: z.number(),
  vipOnly: z.boolean(),
});

export type CastlesLobby = z.infer<typeof castlesLobbySchema>;

export const castlesGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(castlesPlayerSchema),
  units: z.array(castlesUnitSchema),
  buildings: z.array(castlesBuildingSchema),
  trees: z.array(castlesTreeSchema),
  mapWidth: z.number(),
  mapHeight: z.number(),
  status: z.enum(["playing", "finished"]),
  winner: castlesTeamSchema.nullable(),
  tickCount: z.number(),
  lastTickTime: z.number(),
});

export type CastlesGame = z.infer<typeof castlesGameSchema>;

// Ships Battle (Battleship) Types
export const shipsBattleShipSchema = z.object({
  id: z.string(),
  size: z.number(),
  positions: z.array(z.object({ x: z.number(), y: z.number() })),
  hits: z.array(z.object({ x: z.number(), y: z.number() })),
  isSunk: z.boolean(),
});

export type ShipsBattleShip = z.infer<typeof shipsBattleShipSchema>;

export const shipsBattlePlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  ships: z.array(shipsBattleShipSchema),
  shots: z.array(z.object({ x: z.number(), y: z.number(), hit: z.boolean() })),
  isReady: z.boolean(),
});

export type ShipsBattlePlayer = z.infer<typeof shipsBattlePlayerSchema>;

export const shipsBattleGameSchema = z.object({
  id: z.string(),
  player1: shipsBattlePlayerSchema,
  player2: shipsBattlePlayerSchema,
  currentTurn: z.string(),
  gridSize: z.number(),
  status: z.enum(["placing", "playing", "finished"]),
  winner: z.string().nullable(),
  winnerName: z.string().nullable(),
  spectators: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })),
});

export type ShipsBattleGame = z.infer<typeof shipsBattleGameSchema>;

// Hide and Seek Game Types
export const hideSeekPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  x: z.number(),
  y: z.number(),
  z: z.number(),
  rotation: z.number(),
  isCrouching: z.boolean(),
  isRunning: z.boolean(),
  isEliminated: z.boolean(),
  isSeeker: z.boolean(),
});

export type HideSeekPlayer = z.infer<typeof hideSeekPlayerSchema>;

export const hideSeekLobbySchema = z.object({
  id: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })),
  hostId: z.string(),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
  maxPlayers: z.number(),
  seekerMode: z.enum(["random", "host"]),
  vipOnly: z.boolean(),
});

export type HideSeekLobby = z.infer<typeof hideSeekLobbySchema>;

export const hideSeekGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(hideSeekPlayerSchema),
  seekerId: z.string(),
  phase: z.enum(["hiding", "seeking", "finished"]),
  hidingTimeRemaining: z.number(),
  gameTimeRemaining: z.number(),
  startTime: z.number(),
  eliminatedPlayers: z.array(z.string()),
  winner: z.enum(["seeker", "hiders"]).nullable(),
  status: z.enum(["playing", "finished"]),
});

export type HideSeekGame = z.infer<typeof hideSeekGameSchema>;

// Support Request Types
export const supportRequestSchema = z.object({
  id: z.string(),
  type: z.enum(["bug", "feature"]),
  title: z.string(),
  description: z.string(),
  submitterId: z.string(),
  submitterName: z.string(),
  likes: z.array(z.string()),
  isDone: z.boolean(),
  timestamp: z.number(),
});

export type SupportRequest = z.infer<typeof supportRequestSchema>;

// ========== NEW MULTIPLAYER GAMES ==========

// Battleship - Naval Strategy Game
export const battleshipLobbySchema = z.object({
  id: z.string(),
  hostId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
  })),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
  maxPlayers: z.number(),
});

export type BattleshipLobby = z.infer<typeof battleshipLobbySchema>;

export const battleshipShipSchema = z.object({
  id: z.string(),
  size: z.number(),
  positions: z.array(z.object({ x: z.number(), y: z.number() })),
  hits: z.array(z.object({ x: z.number(), y: z.number() })),
  isSunk: z.boolean(),
});

export type BattleshipShip = z.infer<typeof battleshipShipSchema>;

export const battleshipGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    ships: z.array(battleshipShipSchema),
    shots: z.array(z.object({ x: z.number(), y: z.number(), hit: z.boolean() })),
    isReady: z.boolean(),
  })),
  currentTurn: z.string(),
  gridSize: z.number(),
  status: z.enum(["setup", "playing", "finished"]),
  winner: z.string().nullable(),
  winnerName: z.string().nullable(),
  turnTimeRemaining: z.number(),
});

export type BattleshipGame = z.infer<typeof battleshipGameSchema>;

// Capture the Flag - Team Action Game
export const ctfTeamSchema = z.enum(["red", "blue"]);
export type CTFTeam = z.infer<typeof ctfTeamSchema>;

export const ctfLobbySchema = z.object({
  id: z.string(),
  hostId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    team: ctfTeamSchema,
    isReady: z.boolean(),
  })),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
  maxPlayers: z.number(),
});

export type CTFLobby = z.infer<typeof ctfLobbySchema>;

export const ctfPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  team: ctfTeamSchema,
  x: z.number(),
  y: z.number(),
  hasFlag: z.boolean(),
  isStunned: z.boolean(),
  stunEndTime: z.number().nullable(),
  captures: z.number(),
  tags: z.number(),
});

export type CTFPlayer = z.infer<typeof ctfPlayerSchema>;

export const ctfGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(ctfPlayerSchema),
  redFlagPosition: z.object({ x: z.number(), y: z.number() }),
  blueFlagPosition: z.object({ x: z.number(), y: z.number() }),
  redFlagCarrier: z.string().nullable(),
  blueFlagCarrier: z.string().nullable(),
  redScore: z.number(),
  blueScore: z.number(),
  scoreLimit: z.number(),
  mapWidth: z.number(),
  mapHeight: z.number(),
  gameTimeRemaining: z.number(),
  status: z.enum(["playing", "finished"]),
  winner: ctfTeamSchema.nullable(),
});

export type CTFGame = z.infer<typeof ctfGameSchema>;

// Sky Fortress Siege - Aerial Fortress Battles
export const skyFortressTeamSchema = z.enum(["red", "blue"]);
export type SkyFortressTeam = z.infer<typeof skyFortressTeamSchema>;

export const skyFortressLobbySchema = z.object({
  id: z.string(),
  hostId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    team: skyFortressTeamSchema,
    isReady: z.boolean(),
  })),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
  maxPlayers: z.number(),
});

export type SkyFortressLobby = z.infer<typeof skyFortressLobbySchema>;

export const skyFortressPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  team: skyFortressTeamSchema,
  fortressX: z.number(),
  fortressY: z.number(),
  fortressHealth: z.number(),
  shield: z.number(),
  missiles: z.number(),
  drones: z.number(),
  score: z.number(),
});

export type SkyFortressPlayer = z.infer<typeof skyFortressPlayerSchema>;

export const skyFortressGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(skyFortressPlayerSchema),
  projectiles: z.array(z.object({
    id: z.string(),
    ownerId: z.string(),
    x: z.number(),
    y: z.number(),
    vx: z.number(),
    vy: z.number(),
    type: z.enum(["missile", "drone"]),
  })),
  mapWidth: z.number(),
  mapHeight: z.number(),
  status: z.enum(["playing", "finished"]),
  winner: skyFortressTeamSchema.nullable(),
});

export type SkyFortressGame = z.infer<typeof skyFortressGameSchema>;

// Time Rift Tactics - Time Manipulation Combat
export const timeRiftTeamSchema = z.enum(["chrono", "temporal"]);
export type TimeRiftTeam = z.infer<typeof timeRiftTeamSchema>;

export const timeRiftLobbySchema = z.object({
  id: z.string(),
  hostId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    team: timeRiftTeamSchema,
    isReady: z.boolean(),
  })),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
  maxPlayers: z.number(),
});

export type TimeRiftLobby = z.infer<typeof timeRiftLobbySchema>;

export const timeRiftPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  team: timeRiftTeamSchema,
  x: z.number(),
  y: z.number(),
  health: z.number(),
  timeEnergy: z.number(),
  kills: z.number(),
  deaths: z.number(),
});

export type TimeRiftPlayer = z.infer<typeof timeRiftPlayerSchema>;

export const timeRiftGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(timeRiftPlayerSchema),
  projectiles: z.array(z.object({
    id: z.string(),
    ownerId: z.string(),
    x: z.number(),
    y: z.number(),
    vx: z.number(),
    vy: z.number(),
  })),
  chronoScore: z.number(),
  temporalScore: z.number(),
  scoreLimit: z.number(),
  mapWidth: z.number(),
  mapHeight: z.number(),
  status: z.enum(["playing", "finished"]),
  winner: timeRiftTeamSchema.nullable(),
});

export type TimeRiftGame = z.infer<typeof timeRiftGameSchema>;

// Shadow Ops: Urban Warfare - Stealth Team Infiltration
export const shadowOpsTeamSchema = z.enum(["infiltrators", "defenders"]);
export type ShadowOpsTeam = z.infer<typeof shadowOpsTeamSchema>;

export const shadowOpsLobbySchema = z.object({
  id: z.string(),
  hostId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    team: shadowOpsTeamSchema,
    isReady: z.boolean(),
  })),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
  maxPlayers: z.number(),
});

export type ShadowOpsLobby = z.infer<typeof shadowOpsLobbySchema>;

export const shadowOpsPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  team: shadowOpsTeamSchema,
  x: z.number(),
  y: z.number(),
  health: z.number(),
  ammo: z.number(),
  isStealthed: z.boolean(),
  detectionLevel: z.number(),
  kills: z.number(),
  deaths: z.number(),
});

export type ShadowOpsPlayer = z.infer<typeof shadowOpsPlayerSchema>;

export const shadowOpsGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(shadowOpsPlayerSchema),
  objectives: z.array(z.object({
    id: z.string(),
    x: z.number(),
    y: z.number(),
    type: z.enum(["intel", "sabotage", "extract"]),
    completed: z.boolean(),
    completedBy: z.string().nullable(),
  })),
  infiltratorsScore: z.number(),
  defendersScore: z.number(),
  mapWidth: z.number(),
  mapHeight: z.number(),
  roundTimeRemaining: z.number(),
  status: z.enum(["playing", "finished"]),
  winner: shadowOpsTeamSchema.nullable(),
});

export type ShadowOpsGame = z.infer<typeof shadowOpsGameSchema>;

// Elemental Conquest - Elemental Powers Strategy
export const elementalTeamSchema = z.enum(["fire", "water"]);
export type ElementalTeam = z.infer<typeof elementalTeamSchema>;

export const elementTypeSchema = z.enum(["fire", "water", "earth", "air"]);
export type ElementType = z.infer<typeof elementTypeSchema>;

export const elementalLobbySchema = z.object({
  id: z.string(),
  hostId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    team: elementalTeamSchema,
    isReady: z.boolean(),
  })),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
  maxPlayers: z.number(),
});

export type ElementalLobby = z.infer<typeof elementalLobbySchema>;

export const elementalPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  team: elementalTeamSchema,
  x: z.number(),
  y: z.number(),
  health: z.number(),
  mana: z.number(),
  currentElement: elementTypeSchema,
  kills: z.number(),
  deaths: z.number(),
});

export type ElementalPlayer = z.infer<typeof elementalPlayerSchema>;

export const elementalGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(elementalPlayerSchema),
  projectiles: z.array(z.object({
    id: z.string(),
    ownerId: z.string(),
    x: z.number(),
    y: z.number(),
    vx: z.number(),
    vy: z.number(),
    element: elementTypeSchema,
  })),
  areaEffects: z.array(z.object({
    id: z.string(),
    x: z.number(),
    y: z.number(),
    radius: z.number(),
    element: elementTypeSchema,
    duration: z.number(),
  })),
  fireScore: z.number(),
  waterScore: z.number(),
  scoreLimit: z.number(),
  mapWidth: z.number(),
  mapHeight: z.number(),
  status: z.enum(["playing", "finished"]),
  winner: elementalTeamSchema.nullable(),
});

export type ElementalGame = z.infer<typeof elementalGameSchema>;

// Mech Arena: Resource Wars
export const mechTeamSchema = z.enum(["alpha", "omega"]);
export type MechTeam = z.infer<typeof mechTeamSchema>;

export const mechLobbySchema = z.object({
  id: z.string(),
  hostId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    team: mechTeamSchema,
    isReady: z.boolean(),
  })),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
  maxPlayers: z.number(),
});

export type MechLobby = z.infer<typeof mechLobbySchema>;

export const mechPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  team: mechTeamSchema,
  x: z.number(),
  y: z.number(),
  health: z.number(),
  armor: z.number(),
  energy: z.number(),
  resources: z.number(),
  weaponLevel: z.number(),
  kills: z.number(),
  deaths: z.number(),
});

export type MechPlayer = z.infer<typeof mechPlayerSchema>;

export const mechGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(mechPlayerSchema),
  resourceNodes: z.array(z.object({
    id: z.string(),
    x: z.number(),
    y: z.number(),
    amount: z.number(),
    type: z.enum(["energy", "metal", "tech"]),
  })),
  projectiles: z.array(z.object({
    id: z.string(),
    ownerId: z.string(),
    x: z.number(),
    y: z.number(),
    vx: z.number(),
    vy: z.number(),
    damage: z.number(),
  })),
  alphaScore: z.number(),
  omegaScore: z.number(),
  scoreLimit: z.number(),
  mapWidth: z.number(),
  mapHeight: z.number(),
  status: z.enum(["playing", "finished"]),
  winner: mechTeamSchema.nullable(),
});

export type MechGame = z.infer<typeof mechGameSchema>;

// Assassin's Grid - Grid-based Assassin Stealth Game
export const assassinTeamSchema = z.enum(["shadow", "blade"]);
export type AssassinTeam = z.infer<typeof assassinTeamSchema>;

export const assassinLobbySchema = z.object({
  id: z.string(),
  hostId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    team: assassinTeamSchema,
    isReady: z.boolean(),
  })),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
  maxPlayers: z.number(),
});

export type AssassinLobby = z.infer<typeof assassinLobbySchema>;

export const assassinPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  team: assassinTeamSchema,
  gridX: z.number(),
  gridY: z.number(),
  health: z.number(),
  energy: z.number(),
  isHidden: z.boolean(),
  kills: z.number(),
  deaths: z.number(),
});

export type AssassinPlayer = z.infer<typeof assassinPlayerSchema>;

export const assassinGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(assassinPlayerSchema),
  grid: z.array(z.array(z.object({
    type: z.enum(["floor", "wall", "shadow", "trap"]),
    occupiedBy: z.string().nullable(),
  }))),
  targets: z.array(z.object({
    id: z.string(),
    gridX: z.number(),
    gridY: z.number(),
    eliminatedBy: z.string().nullable(),
  })),
  shadowScore: z.number(),
  bladeScore: z.number(),
  scoreLimit: z.number(),
  gridWidth: z.number(),
  gridHeight: z.number(),
  currentTurn: z.string(),
  turnTimeRemaining: z.number(),
  status: z.enum(["playing", "finished"]),
  winner: assassinTeamSchema.nullable(),
});

export type AssassinGame = z.infer<typeof assassinGameSchema>;

export const warzoneModeSchema = z.enum(["bot", "multiplayer"]);
export type WarzoneMode = z.infer<typeof warzoneModeSchema>;

export const warzoneMapSchema = z.enum([
  "urban",
  "desert",
  "forest",
  "industrial",
  "arctic",
]);
export type WarzoneMap = z.infer<typeof warzoneMapSchema>;

export const warzoneTeamSchema = z.enum(["blue", "red"]);
export type WarzoneTeam = z.infer<typeof warzoneTeamSchema>;

export const warzonePlayerLobbySchema = z.object({
  playerId: z.string(),
  name: z.string(),
  team: warzoneTeamSchema,
});
export type WarzonePlayerLobby = z.infer<typeof warzonePlayerLobbySchema>;

export const warzoneRoomSchema = z.object({
  code: z.string(),
  hostPlayerId: z.string(),
  mode: warzoneModeSchema,
  map: warzoneMapSchema,
  started: z.boolean(),
  players: z.array(warzonePlayerLobbySchema),
});
export type WarzoneRoom = z.infer<typeof warzoneRoomSchema>;

export const warzonePlayerStateSchema = z.object({
  playerId: z.string(),
  name: z.string(),
  team: warzoneTeamSchema,
  position: z.object({ x: z.number(), y: z.number(), z: z.number() }),
  rotation: z.object({ x: z.number(), y: z.number() }),
  health: z.number(),
  isDead: z.boolean(),
  currentWeapon: z.number(),
  weaponType: z.string(),
  timestamp: z.number(),
});
export type WarzonePlayerState = z.infer<typeof warzonePlayerStateSchema>;

export const warzoneChatMessageSchema = z.object({
  id: z.string(),
  playerId: z.string(),
  sender: z.string(),
  content: z.string(),
  timestamp: z.number(),
});
export type WarzoneChatMessage = z.infer<typeof warzoneChatMessageSchema>;

// Siege War - Strategic Tower Defense Game
export const siegeWarTeamSchema = z.enum(["attackers", "defenders"]);
export type SiegeWarTeam = z.infer<typeof siegeWarTeamSchema>;

export const siegeWarUnitTypeSchema = z.enum(["infantry", "archer", "cavalry", "siege_tower", "catapult"]);
export type SiegeWarUnitType = z.infer<typeof siegeWarUnitTypeSchema>;

export const siegeWarBuildingTypeSchema = z.enum(["wall", "tower", "gate", "barracks", "archery_range"]);
export type SiegeWarBuildingType = z.infer<typeof siegeWarBuildingTypeSchema>;

export const siegeWarLobbySchema = z.object({
  id: z.string(),
  hostId: z.string(),
  players: z.array(z.object({
    id: z.string(),
    name: z.string(),
    team: siegeWarTeamSchema,
    isReady: z.boolean(),
  })),
  status: z.enum(["waiting", "playing", "finished"]),
  minPlayers: z.number(),
  maxPlayers: z.number(),
});

export type SiegeWarLobby = z.infer<typeof siegeWarLobbySchema>;

export const siegeWarUnitSchema = z.object({
  id: z.string(),
  type: siegeWarUnitTypeSchema,
  ownerId: z.string(),
  team: siegeWarTeamSchema,
  x: z.number(),
  y: z.number(),
  health: z.number(),
  maxHealth: z.number(),
  targetX: z.number().nullable(),
  targetY: z.number().nullable(),
  attackTarget: z.string().nullable(),
});

export type SiegeWarUnit = z.infer<typeof siegeWarUnitSchema>;

export const siegeWarBuildingSchema = z.object({
  id: z.string(),
  type: siegeWarBuildingTypeSchema,
  team: siegeWarTeamSchema,
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
  health: z.number(),
  maxHealth: z.number(),
});

export type SiegeWarBuilding = z.infer<typeof siegeWarBuildingSchema>;

export const siegeWarPlayerSchema = z.object({
  id: z.string(),
  name: z.string(),
  team: siegeWarTeamSchema,
  gold: z.number(),
  unitsSpawned: z.number(),
});

export type SiegeWarPlayer = z.infer<typeof siegeWarPlayerSchema>;

export const siegeWarGameSchema = z.object({
  id: z.string(),
  lobbyId: z.string(),
  players: z.array(siegeWarPlayerSchema),
  units: z.array(siegeWarUnitSchema),
  buildings: z.array(siegeWarBuildingSchema),
  mapWidth: z.number(),
  mapHeight: z.number(),
  castleHealth: z.number(),
  castleMaxHealth: z.number(),
  gameTimeRemaining: z.number(),
  waveNumber: z.number(),
  status: z.enum(["playing", "finished"]),
  winner: siegeWarTeamSchema.nullable(),
});

export type SiegeWarGame = z.infer<typeof siegeWarGameSchema>;

export type WebSocketMessage = 
  | { type: "join"; username: string }
  | { type: "player_joined"; player: Player }
  | { type: "player_left"; playerId: string }
  | { type: "players_list"; players: Player[] }
  | { type: "chat_message"; message: Message }
  | { type: "chat_history"; messages: Message[] }
  | { type: "challenge_sent"; challenge: Challenge }
  | { type: "challenge_received"; challenge: Challenge }
  | { type: "challenge_response"; challengeId: string; accepted: boolean }
  | { type: "challenge_declined"; challengeId: string }
  | { type: "game_start_ttt"; game: TicTacToeGame }
  | { type: "game_update_ttt"; game: TicTacToeGame }
  | { type: "game_move_ttt"; gameId: string; position: number }
  | { type: "game_rematch_ttt"; gameId: string }
  | { type: "game_leave_ttt"; gameId: string }
  | { type: "game_spectate_ttt"; gameId: string }
  | { type: "game_stop_spectate_ttt"; gameId: string }
  | { type: "active_games_ttt"; games: Array<{ id: string; player1Name: string; player2Name: string; spectatorCount: number }> }
  | { type: "request_active_games_ttt" }
  | { type: "game_start_rps"; game: RPSGame }
  | { type: "game_update_rps"; game: RPSGame }
  | { type: "game_choice_rps"; gameId: string; choice: RPSChoice }
  | { type: "game_next_round_rps"; gameId: string }
  | { type: "game_leave_rps"; gameId: string }
  | { type: "lobby_join_riddle"; lobbyId?: string; vipOnly?: boolean }
  | { type: "lobby_update_riddle"; lobby: RiddleLobby }
  | { type: "lobby_start_riddle"; lobbyId: string }
  | { type: "lobby_leave_riddle"; lobbyId: string }
  | { type: "game_update_riddle"; game: RiddleGame }
  | { type: "game_answer_riddle"; gameId: string; answer: string }
  | { type: "error"; message: string }
  | { type: "your_id"; playerId: string }
  | { type: "opponent_left"; game: "tictactoe" | "rps" | "wordscramble" | "numberguess" | "quickmath" | "connectfour"; opponentName: string; message: string }
  | { type: "game_start_ws"; game: WordScrambleGame }
  | { type: "game_update_ws"; game: WordScrambleGame }
  | { type: "game_answer_ws"; gameId: string; answer: string }
  | { type: "game_next_round_ws"; gameId: string }
  | { type: "game_leave_ws"; gameId: string }
  | { type: "game_spectate_ws"; gameId: string }
  | { type: "game_stop_spectate_ws"; gameId: string }
  | { type: "request_active_games_ws" }
  | { type: "active_games_ws"; games: Array<{ id: string; player1Name: string; player2Name: string; spectatorCount: number; gameType: string }> }
  | { type: "game_start_ng"; game: NumberGuessGame }
  | { type: "game_update_ng"; game: NumberGuessGame }
  | { type: "game_guess_ng"; gameId: string; guess: number }
  | { type: "game_next_round_ng"; gameId: string }
  | { type: "game_leave_ng"; gameId: string }
  | { type: "game_spectate_ng"; gameId: string }
  | { type: "game_stop_spectate_ng"; gameId: string }
  | { type: "request_active_games_ng" }
  | { type: "active_games_ng"; games: Array<{ id: string; player1Name: string; player2Name: string; spectatorCount: number; gameType: string }> }
  | { type: "game_start_qm"; game: QuickMathGame }
  | { type: "game_update_qm"; game: QuickMathGame }
  | { type: "game_answer_qm"; gameId: string; answer: number }
  | { type: "game_next_round_qm"; gameId: string }
  | { type: "game_leave_qm"; gameId: string }
  | { type: "game_spectate_qm"; gameId: string }
  | { type: "game_stop_spectate_qm"; gameId: string }
  | { type: "request_active_games_qm" }
  | { type: "active_games_qm"; games: Array<{ id: string; player1Name: string; player2Name: string; spectatorCount: number; gameType: string }> }
  | { type: "game_start_c4"; game: ConnectFourGame }
  | { type: "game_update_c4"; game: ConnectFourGame }
  | { type: "game_move_c4"; gameId: string; column: number }
  | { type: "game_rematch_c4"; gameId: string }
  | { type: "game_leave_c4"; gameId: string }
  | { type: "game_spectate_c4"; gameId: string }
  | { type: "game_stop_spectate_c4"; gameId: string }
  | { type: "request_active_games_c4" }
  | { type: "active_games_c4"; games: Array<{ id: string; player1Name: string; player2Name: string; spectatorCount: number; gameType: string }> }
  | { type: "lobby_join_memory"; lobbyId?: string }
  | { type: "lobby_update_memory"; lobby: MemoryMatchLobby }
  | { type: "lobby_start_memory"; lobbyId: string }
  | { type: "lobby_leave_memory"; lobbyId: string }
  | { type: "game_update_memory"; game: MemoryMatchGame }
  | { type: "game_flip_memory"; gameId: string; cardId: number }
  | { type: "game_spectate_memory"; gameId: string }
  | { type: "game_stop_spectate_memory"; gameId: string }
  | { type: "request_active_games_memory" }
  | { type: "active_games_memory"; games: Array<{ id: string; playerNames: string[]; spectatorCount: number; gameType: string }> }
  | { type: "lobby_join_typing"; lobbyId?: string }
  | { type: "lobby_update_typing"; lobby: TypingRaceLobby }
  | { type: "lobby_start_typing"; lobbyId: string }
  | { type: "lobby_leave_typing"; lobbyId: string }
  | { type: "game_update_typing"; game: TypingRaceGame }
  | { type: "game_progress_typing"; gameId: string; progress: number; wpm: number }
  | { type: "game_finish_typing"; gameId: string }
  | { type: "request_active_games_all" }
  | { type: "active_games_all"; games: Array<{ id: string; gameType: string; playerNames: string[]; spectatorCount: number }> }
  | { type: "lobby_join_werewolf"; lobbyId?: string; vipOnly?: boolean }
  | { type: "lobby_update_werewolf"; lobby: WerewolfLobby }
  | { type: "lobby_settings_werewolf"; lobbyId: string; enableSeer: boolean; enableDoctor: boolean }
  | { type: "lobby_start_werewolf"; lobbyId: string }
  | { type: "lobby_leave_werewolf"; lobbyId: string }
  | { type: "game_update_werewolf"; game: WerewolfGame; playerRole?: WerewolfRole; teammates?: string[] }
  | { type: "game_action_werewolf"; gameId: string; action: "kill" | "protect" | "inspect"; targetId: string }
  | { type: "game_vote_werewolf"; gameId: string; targetId: string }
  | { type: "game_chat_werewolf"; gameId: string; message: string; isWerewolfChat: boolean }
  | { type: "werewolf_chat_message"; sender: string; message: string; isWerewolfChat: boolean }
  | { type: "lobby_join_spyhunt"; lobbyId?: string }
  | { type: "lobby_update_spyhunt"; lobby: SpyHuntLobby }
  | { type: "lobby_start_spyhunt"; lobbyId: string }
  | { type: "lobby_leave_spyhunt"; lobbyId: string }
  | { type: "game_update_spyhunt"; game: SpyHuntGame; isSpy?: boolean; location?: string }
  | { type: "game_ask_spyhunt"; gameId: string; targetId: string; question: string }
  | { type: "game_answer_spyhunt"; gameId: string; answer: string }
  | { type: "game_accuse_spyhunt"; gameId: string; accusedId: string }
  | { type: "game_vote_spyhunt"; gameId: string; targetId: string }
  | { type: "game_guess_location_spyhunt"; gameId: string; location: string }
  | { type: "fps_create_lobby"; mode: FpsGameMode; timeLimit: number }
  | { type: "fps_join_lobby"; code: string; team?: "A" | "B" }
  | { type: "fps_lobby_update"; game: FpsGame }
  | { type: "fps_leave_lobby"; gameId: string }
  | { type: "fps_start_game"; gameId: string }
  | { type: "fps_game_update"; game: FpsGame }
  | { type: "fps_player_move"; gameId: string; position: { x: number; y: number; z: number }; rotation: { x: number; y: number } }
  | { type: "fps_player_shoot"; gameId: string; targetId: string }
  | { type: "fps_player_respawn"; gameId: string; gun: FpsGunType }
  | { type: "fps_change_gun"; gameId: string; gun: FpsGunType }
  | { type: "fps_game_end"; game: FpsGame }
  | { type: "lobby_join_pointonpoint"; lobbyId?: string }
  | { type: "lobby_update_pointonpoint"; lobby: PointOnPointLobby }
  | { type: "lobby_settings_pointonpoint"; lobbyId: string; showSentence: boolean }
  | { type: "lobby_start_pointonpoint"; lobbyId: string; initialSentence?: string }
  | { type: "lobby_leave_pointonpoint"; lobbyId: string }
  | { type: "game_update_pointonpoint"; game: PointOnPointGame }
  | { type: "game_sentence_pointonpoint"; gameId: string; sentence: string }
  | { type: "game_end_pointonpoint"; gameId: string }
  | { type: "lobby_join_pirates"; lobbyId?: string }
  | { type: "lobby_update_pirates"; lobby: PiratesLobby }
  | { type: "lobby_team_pirates"; lobbyId: string; team: PiratesTeam }
  | { type: "lobby_class_pirates"; lobbyId: string; playerClass: PiratesClass }
  | { type: "lobby_start_pirates"; lobbyId: string }
  | { type: "lobby_leave_pirates"; lobbyId: string }
  | { type: "game_update_pirates"; game: PiratesGame }
  | { type: "game_move_pirates"; gameId: string; x: number; y: number }
  | { type: "game_shoot_pirates"; gameId: string; targetX: number; targetY: number }
  | { type: "game_ability_pirates"; gameId: string; ability: string }
  | { type: "lobby_join_outpostrush"; lobbyId?: string }
  | { type: "lobby_update_outpostrush"; lobby: OutpostRushLobby }
  | { type: "lobby_team_outpostrush"; lobbyId: string; team: "alpha" | "beta" }
  | { type: "lobby_start_outpostrush"; lobbyId: string }
  | { type: "lobby_leave_outpostrush"; lobbyId: string }
  | { type: "game_update_outpostrush"; game: OutpostRushGame }
  | { type: "game_move_outpostrush"; gameId: string; x: number; y: number }
  | { type: "game_attack_outpostrush"; gameId: string; targetId: string }
  | { type: "game_build_outpostrush"; gameId: string; buildType: "wall" | "turret" | "trap"; x: number; y: number }
  | { type: "game_upgrade_outpostrush"; gameId: string }
  | { type: "game_capture_outpostrush"; gameId: string; outpostId: string }
  | { type: "game_chat_outpostrush"; gameId: string; message: string }
  | { type: "outpostrush_chat_message"; sender: string; message: string }
  | { type: "outpostrush_left" }
  | { type: "game_chat_pointonpoint"; gameId: string; message: string }
  | { type: "pointonpoint_chat_message"; sender: string; message: string }
  | { type: "lobby_join_emojichain"; lobbyId?: string }
  | { type: "lobby_update_emojichain"; lobby: EmojiChainLobby }
  | { type: "lobby_start_emojichain"; lobbyId: string }
  | { type: "lobby_leave_emojichain"; lobbyId: string }
  | { type: "game_update_emojichain"; game: EmojiChainGame }
  | { type: "game_guess_emojichain"; gameId: string; guess: string }
  | { type: "game_chat_emojichain"; gameId: string; message: string }
  | { type: "emojichain_chat_message"; sender: string; message: string }
  | { type: "lobby_join_wordassociation"; lobbyId?: string }
  | { type: "lobby_update_wordassociation"; lobby: WordAssociationLobby }
  | { type: "lobby_start_wordassociation"; lobbyId: string }
  | { type: "lobby_leave_wordassociation"; lobbyId: string }
  | { type: "game_update_wordassociation"; game: WordAssociationGame }
  | { type: "game_word_wordassociation"; gameId: string; word: string }
  | { type: "game_chat_wordassociation"; gameId: string; message: string }
  | { type: "wordassociation_chat_message"; sender: string; message: string }
  | { type: "lobby_counts"; counts: LobbyCount[] }
  | { type: "lobby_join_hangman"; lobbyId?: string }
  | { type: "lobby_update_hangman"; lobby: HangmanLobby }
  | { type: "lobby_start_hangman"; lobbyId: string }
  | { type: "lobby_leave_hangman"; lobbyId: string }
  | { type: "game_update_hangman"; game: HangmanGame }
  | { type: "game_setword_hangman"; gameId: string; word: string }
  | { type: "game_guess_hangman"; gameId: string; letter: string }
  | { type: "game_chat_hangman"; gameId: string; message: string }
  | { type: "hangman_chat_message"; sender: string; message: string }
  | { type: "lobby_join_triviaquiz"; lobbyId?: string }
  | { type: "lobby_update_triviaquiz"; lobby: TriviaQuizLobby }
  | { type: "lobby_start_triviaquiz"; lobbyId: string }
  | { type: "lobby_leave_triviaquiz"; lobbyId: string }
  | { type: "game_update_triviaquiz"; game: TriviaQuizGame }
  | { type: "game_answer_triviaquiz"; gameId: string; answerIndex: number }
  | { type: "game_chat_triviaquiz"; gameId: string; message: string }
  | { type: "triviaquiz_chat_message"; sender: string; message: string }
  // Squid Game messages
  | { type: "lobby_join_squidgame"; lobbyId?: string; vipOnly?: boolean }
  | { type: "lobby_update_squidgame"; lobby: SquidGameLobby }
  | { type: "lobby_start_squidgame"; lobbyId: string }
  | { type: "lobby_leave_squidgame"; lobbyId: string }
  | { type: "game_update_squidgame"; game: SquidGame }
  | { type: "game_action_squidgame"; gameId: string; action: string; data?: any }
  | { type: "game_chat_squidgame"; gameId: string; message: string }
  | { type: "squidgame_chat_message"; sender: string; message: string }
  // Truth or Bluff messages
  | { type: "lobby_join_truthorbluff"; lobbyId?: string }
  | { type: "lobby_update_truthorbluff"; lobby: TruthOrBluffLobby }
  | { type: "lobby_start_truthorbluff"; lobbyId: string }
  | { type: "lobby_leave_truthorbluff"; lobbyId: string }
  | { type: "game_update_truthorbluff"; game: TruthOrBluffGame }
  | { type: "game_submit_story_truthorbluff"; gameId: string; story: string; isTruth: boolean }
  | { type: "game_vote_truthorbluff"; gameId: string; voteTruth: boolean }
  | { type: "game_chat_truthorbluff"; gameId: string; message: string }
  | { type: "truthorbluff_chat_message"; sender: string; message: string }
  // Direct Message messages
  | { type: "dm_send"; toPlayerId: string; content: string }
  | { type: "dm_received"; message: DirectMessage }
  | { type: "dm_history"; partnerId?: string; messages: DirectMessage[] }
  | { type: "dm_request"; toPlayerId: string }
  // Song and Playlist messages
  | { type: "song_uploaded"; song: Song }
  | { type: "song_deleted"; songId: string }
  | { type: "playlist_created"; playlist: Playlist }
  | { type: "playlist_updated"; playlist: Playlist }
  | { type: "playlist_deleted"; playlistId: string }
  // Escape Ship messages
  | { type: "lobby_join_escapeship"; lobbyId?: string; vipOnly?: boolean }
  | { type: "lobby_update_escapeship"; lobby: EscapeShipLobby }
  | { type: "lobby_start_escapeship"; lobbyId: string }
  | { type: "lobby_leave_escapeship"; lobbyId: string }
  | { type: "game_update_escapeship"; game: EscapeShipGame }
  | { type: "game_action_escapeship"; gameId: string; action: string; data?: any }
  | { type: "game_chat_escapeship"; gameId: string; message: string }
  | { type: "escapeship_chat_message"; sender: string; message: string }
  | { type: "escapeship_left" }
  | { type: "escapeship_game_ended" }
  // Reaction Race messages
  | { type: "lobby_join_reactionrace"; lobbyId?: string }
  | { type: "lobby_update_reactionrace"; lobby: ReactionRaceLobby }
  | { type: "lobby_start_reactionrace"; lobbyId: string }
  | { type: "lobby_leave_reactionrace"; lobbyId: string }
  | { type: "game_update_reactionrace"; game: ReactionRaceGame }
  | { type: "game_react_reactionrace"; gameId: string }
  | { type: "game_chat_reactionrace"; gameId: string; message: string }
  | { type: "reactionrace_chat_message"; sender: string; message: string }
  | { type: "reactionrace_left" }
  | { type: "reactionrace_game_ended" }
  // Color Clash messages
  | { type: "lobby_join_colorclash"; lobbyId?: string }
  | { type: "lobby_update_colorclash"; lobby: ColorClashLobby }
  | { type: "lobby_start_colorclash"; lobbyId: string }
  | { type: "lobby_leave_colorclash"; lobbyId: string }
  | { type: "game_update_colorclash"; game: ColorClashGame }
  | { type: "game_input_colorclash"; gameId: string; color: string }
  | { type: "game_submit_colorclash"; gameId: string }
  | { type: "game_chat_colorclash"; gameId: string; message: string }
  | { type: "colorclash_chat_message"; sender: string; message: string }
  | { type: "colorclash_left" }
  | { type: "colorclash_game_ended" }
  // Castles: Siege Dominion messages
  | { type: "lobby_join_castles"; lobbyId?: string; vipOnly?: boolean }
  | { type: "lobby_update_castles"; lobby: CastlesLobby }
  | { type: "lobby_team_castles"; lobbyId: string; team: CastlesTeam }
  | { type: "lobby_ready_castles"; lobbyId: string; ready: boolean }
  | { type: "lobby_start_castles"; lobbyId: string }
  | { type: "lobby_leave_castles"; lobbyId: string }
  | { type: "game_update_castles"; game: CastlesGame }
  | { type: "game_command_castles"; gameId: string; command: "move" | "attack" | "gather" | "build" | "train"; unitIds?: string[]; targetX?: number; targetY?: number; buildingType?: CastlesBuildingType; unitType?: CastlesUnitType; buildingId?: string; resourceType?: "wood" | "food" }
  | { type: "game_chat_castles"; gameId: string; message: string }
  | { type: "castles_chat_message"; sender: string; message: string }
  | { type: "castles_left" }
  | { type: "castles_game_ended"; winner: CastlesTeam }
  // Ships Battle messages
  | { type: "game_start_shipsbattle"; game: ShipsBattleGame }
  | { type: "game_update_shipsbattle"; game: ShipsBattleGame }
  | { type: "game_place_ship_shipsbattle"; gameId: string; shipSize: number; positions: Array<{ x: number; y: number }> }
  | { type: "game_ready_shipsbattle"; gameId: string }
  | { type: "game_shoot_shipsbattle"; gameId: string; x: number; y: number }
  | { type: "game_leave_shipsbattle"; gameId: string }
  | { type: "game_rematch_shipsbattle"; gameId: string }
  // Hide and Seek messages
  | { type: "lobby_join_hideseek"; lobbyId?: string; vipOnly?: boolean }
  | { type: "lobby_update_hideseek"; lobby: HideSeekLobby }
  | { type: "lobby_start_hideseek"; lobbyId: string }
  | { type: "lobby_leave_hideseek"; lobbyId: string }
  | { type: "lobby_settings_hideseek"; lobbyId: string; seekerMode: "random" | "host" }
  | { type: "game_update_hideseek"; game: HideSeekGame }
  | { type: "game_move_hideseek"; gameId: string; x: number; y: number; z: number; rotation: number }
  | { type: "game_action_hideseek"; gameId: string; action: "crouch" | "stand" | "jump" | "eliminate"; targetId?: string }
  | { type: "game_chat_hideseek"; gameId: string; message: string }
  | { type: "hideseek_chat_message"; sender: string; message: string }
  | { type: "hideseek_left" }
  // Battleship messages
  | { type: "lobby_join_battleship"; lobbyId?: string }
  | { type: "lobby_update_battleship"; lobby: BattleshipLobby }
  | { type: "lobby_start_battleship"; lobbyId: string }
  | { type: "lobby_leave_battleship"; lobbyId: string }
  | { type: "game_update_battleship"; game: BattleshipGame }
  | { type: "game_place_ship_battleship"; gameId: string; shipSize: number; positions: Array<{ x: number; y: number }> }
  | { type: "game_ready_battleship"; gameId: string }
  | { type: "game_shoot_battleship"; gameId: string; x: number; y: number }
  | { type: "game_chat_battleship"; gameId: string; message: string }
  | { type: "battleship_chat_message"; sender: string; message: string }
  | { type: "battleship_left" }
  | { type: "battleship_game_ended" }
  // Capture the Flag messages
  | { type: "lobby_join_ctf"; lobbyId?: string }
  | { type: "lobby_update_ctf"; lobby: CTFLobby }
  | { type: "lobby_team_ctf"; lobbyId: string; team: CTFTeam }
  | { type: "lobby_ready_ctf"; lobbyId: string; ready: boolean }
  | { type: "lobby_start_ctf"; lobbyId: string }
  | { type: "lobby_leave_ctf"; lobbyId: string }
  | { type: "game_update_ctf"; game: CTFGame }
  | { type: "game_move_ctf"; gameId: string; x: number; y: number }
  | { type: "game_tag_ctf"; gameId: string; targetId: string }
  | { type: "game_chat_ctf"; gameId: string; message: string }
  | { type: "ctf_chat_message"; sender: string; message: string }
  | { type: "ctf_left" }
  | { type: "ctf_game_ended"; winner: CTFTeam }
  // Siege War messages
  | { type: "lobby_join_siegewar"; lobbyId?: string }
  | { type: "lobby_update_siegewar"; lobby: SiegeWarLobby }
  | { type: "lobby_team_siegewar"; lobbyId: string; team: SiegeWarTeam }
  | { type: "lobby_ready_siegewar"; lobbyId: string; ready: boolean }
  | { type: "lobby_start_siegewar"; lobbyId: string }
  | { type: "lobby_leave_siegewar"; lobbyId: string }
  | { type: "game_update_siegewar"; game: SiegeWarGame }
  | { type: "game_spawn_unit_siegewar"; gameId: string; unitType: SiegeWarUnitType }
  | { type: "game_move_units_siegewar"; gameId: string; unitIds: string[]; targetX: number; targetY: number }
  | { type: "game_attack_siegewar"; gameId: string; unitIds: string[]; targetId: string }
  | { type: "game_chat_siegewar"; gameId: string; message: string }
  | { type: "siegewar_chat_message"; sender: string; message: string }
  | { type: "siegewar_left" }
  | { type: "siegewar_game_ended"; winner: SiegeWarTeam }
  // Sky Fortress Siege messages
  | { type: "lobby_join_skyfortress"; lobbyId?: string }
  | { type: "lobby_update_skyfortress"; lobby: SkyFortressLobby }
  | { type: "lobby_team_skyfortress"; lobbyId: string; team: SkyFortressTeam }
  | { type: "lobby_ready_skyfortress"; lobbyId: string; ready: boolean }
  | { type: "lobby_start_skyfortress"; lobbyId: string }
  | { type: "lobby_leave_skyfortress"; lobbyId: string }
  | { type: "game_update_skyfortress"; game: SkyFortressGame }
  | { type: "game_move_skyfortress"; gameId: string; y: number }
  | { type: "game_fire_skyfortress"; gameId: string; targetX: number; targetY: number; weaponType: "missile" | "drone" }
  | { type: "game_chat_skyfortress"; gameId: string; message: string }
  | { type: "skyfortress_chat_message"; sender: string; message: string }
  | { type: "skyfortress_left" }
  | { type: "skyfortress_game_ended"; winner: SkyFortressTeam }
  // Time Rift Tactics messages
  | { type: "lobby_join_timerift"; lobbyId?: string }
  | { type: "lobby_update_timerift"; lobby: TimeRiftLobby }
  | { type: "lobby_team_timerift"; lobbyId: string; team: TimeRiftTeam }
  | { type: "lobby_ready_timerift"; lobbyId: string; ready: boolean }
  | { type: "lobby_start_timerift"; lobbyId: string }
  | { type: "lobby_leave_timerift"; lobbyId: string }
  | { type: "game_update_timerift"; game: TimeRiftGame }
  | { type: "game_move_timerift"; gameId: string; x: number; y: number }
  | { type: "game_shoot_timerift"; gameId: string; targetX: number; targetY: number }
  | { type: "game_ability_timerift"; gameId: string; ability: "freeze" | "slow" | "rewind" }
  | { type: "game_chat_timerift"; gameId: string; message: string }
  | { type: "timerift_chat_message"; sender: string; message: string }
  | { type: "timerift_left" }
  | { type: "timerift_game_ended"; winner: TimeRiftTeam }
  // Shadow Ops messages
  | { type: "lobby_join_shadowops"; lobbyId?: string }
  | { type: "lobby_update_shadowops"; lobby: ShadowOpsLobby }
  | { type: "lobby_team_shadowops"; lobbyId: string; team: ShadowOpsTeam }
  | { type: "lobby_ready_shadowops"; lobbyId: string; ready: boolean }
  | { type: "lobby_start_shadowops"; lobbyId: string }
  | { type: "lobby_leave_shadowops"; lobbyId: string }
  | { type: "game_update_shadowops"; game: ShadowOpsGame }
  | { type: "game_move_shadowops"; gameId: string; x: number; y: number }
  | { type: "game_shoot_shadowops"; gameId: string; targetX: number; targetY: number }
  | { type: "game_stealth_shadowops"; gameId: string; stealth: boolean }
  | { type: "game_chat_shadowops"; gameId: string; message: string }
  | { type: "shadowops_chat_message"; sender: string; message: string }
  | { type: "shadowops_left" }
  | { type: "shadowops_game_ended"; winner: ShadowOpsTeam }
  // Elemental Conquest messages
  | { type: "lobby_join_elemental"; lobbyId?: string }
  | { type: "lobby_update_elemental"; lobby: ElementalLobby }
  | { type: "lobby_team_elemental"; lobbyId: string; team: ElementalTeam }
  | { type: "lobby_ready_elemental"; lobbyId: string; ready: boolean }
  | { type: "lobby_start_elemental"; lobbyId: string }
  | { type: "lobby_leave_elemental"; lobbyId: string }
  | { type: "game_update_elemental"; game: ElementalGame }
  | { type: "game_move_elemental"; gameId: string; x: number; y: number }
  | { type: "game_cast_elemental"; gameId: string; targetX: number; targetY: number; element: ElementType; isArea: boolean }
  | { type: "game_chat_elemental"; gameId: string; message: string }
  | { type: "elemental_chat_message"; sender: string; message: string }
  | { type: "elemental_left" }
  | { type: "elemental_game_ended"; winner: ElementalTeam }
  // Mech Arena messages
  | { type: "lobby_join_mech"; lobbyId?: string }
  | { type: "lobby_update_mech"; lobby: MechLobby }
  | { type: "lobby_team_mech"; lobbyId: string; team: MechTeam }
  | { type: "lobby_ready_mech"; lobbyId: string; ready: boolean }
  | { type: "lobby_start_mech"; lobbyId: string }
  | { type: "lobby_leave_mech"; lobbyId: string }
  | { type: "game_update_mech"; game: MechGame }
  | { type: "game_move_mech"; gameId: string; x: number; y: number }
  | { type: "game_shoot_mech"; gameId: string; targetX: number; targetY: number }
  | { type: "game_upgrade_mech"; gameId: string }
  | { type: "game_chat_mech"; gameId: string; message: string }
  | { type: "mech_chat_message"; sender: string; message: string }
  | { type: "mech_left" }
  | { type: "mech_game_ended"; winner: MechTeam }
  // Assassin's Grid messages
  | { type: "lobby_join_assassin"; lobbyId?: string }
  | { type: "lobby_update_assassin"; lobby: AssassinLobby }
  | { type: "lobby_team_assassin"; lobbyId: string; team: AssassinTeam }
  | { type: "lobby_ready_assassin"; lobbyId: string; ready: boolean }
  | { type: "lobby_start_assassin"; lobbyId: string }
  | { type: "lobby_leave_assassin"; lobbyId: string }
  | { type: "game_update_assassin"; game: AssassinGame }
  | { type: "game_move_assassin"; gameId: string; gridX: number; gridY: number }
  | { type: "game_attack_assassin"; gameId: string; targetId: string }
  | { type: "game_hide_assassin"; gameId: string }
  | { type: "game_chat_assassin"; gameId: string; message: string }
  | { type: "assassin_chat_message"; sender: string; message: string }
  | { type: "assassin_left" }
  | { type: "assassin_game_ended"; winner: AssassinTeam }
  // Warzone Arena
  | {
      type: "warzone_create_room";
      displayName: string;
      team: WarzoneTeam;
      map: WarzoneMap;
    }
  | {
      type: "warzone_join_room";
      code: string;
      displayName: string;
      team: WarzoneTeam;
    }
  | { type: "warzone_leave_room" }
  | { type: "warzone_start_game"; code: string }
  | { type: "warzone_room_update"; room: WarzoneRoom | null }
  | { type: "warzone_state_update"; code: string; state: WarzonePlayerState }
  | { type: "warzone_states"; states: WarzonePlayerState[] }
  | { type: "warzone_chat_send"; code: string; message: string }
  | { type: "warzone_chat_message"; message: WarzoneChatMessage }
  | { type: "warzone_chat_history"; messages: WarzoneChatMessage[] };
