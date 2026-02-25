import { randomUUID, createHash } from "crypto";
import { appendFileSync, existsSync, writeFileSync, readFileSync } from "fs";
import type {
  Player,
  Message,
  Challenge,
  TicTacToeGame,
  RPSGame,
  RiddleLobby,
  RiddleGame,
  RPSChoice,
  User,
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
  WerewolfPlayer,
  SpyHuntLobby,
  SpyHuntGame,
  FpsGame,
  FpsPlayer,
  FpsGameMode,
  FpsGunType,
  PointOnPointLobby,
  PointOnPointGame,
  OutpostRushLobby,
  OutpostRushGame,
  OutpostRushPlayer,
  Outpost,
  EmojiChainLobby,
  EmojiChainGame,
  WordAssociationLobby,
  WordAssociationGame,
  Screenshot,
  SupportRequest,
  HangmanLobby,
  HangmanGame,
  TriviaQuizLobby,
  TriviaQuizGame,
  Tutorial,
  SquidGameLobby,
  SquidGame,
  TruthOrBluffLobby,
  TruthOrBluffGame,
  SpotTheLiarLobby,
  SpotTheLiarGame,
  DirectMessage,
  Song,
  Playlist,
  EscapeShipLobby,
  EscapeShipGame,
  EscapeShipRoomType,
  ReactionRaceLobby,
  ReactionRaceGame,
  ColorClashLobby,
  ColorClashGame,
  HideSeekLobby,
  HideSeekGame,
  CastlesLobby,
  CastlesGame,
  CastlesTeam,
  CastlesPlayer,
  CastlesUnit,
  CastlesBuilding,
  CastlesTree,
  CastlesUnitType,
  CastlesBuildingType,
  ShipsBattleLobby,
  ShipsBattleGame,
  ShipsBattlePlayer,
  ShipsBattleShip,
  BattleshipLobby,
  BattleshipGame,
  BattleshipShip,
  CTFLobby,
  CTFGame,
  CTFPlayer,
  CTFTeam,
  SiegeWarLobby,
  SiegeWarGame,
  SiegeWarPlayer,
  SiegeWarUnit,
  SiegeWarBuilding,
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
} from "@shared/schema";

const LOGIN_FILE = "Login.txt";
const GAME_LOG_FILE = "GameLog.txt";
const CHAT_FILE = "chats.txt";
const BANNED_FILE = "Banned.txt";
const REGISTERED_FILE = "Registered.txt";
const PROFILES_FILE = "Profiles.txt";
const FRIENDS_FILE = "Friends.txt";
const DIRECT_MESSAGES_FILE = "DirectMessages.txt";
const REQUESTS_FILE = "Requests.txt";
const SCREENSHOTS_FILE = "Screenshots.txt";
const VIP_FILE = "VIPs.txt";
const TUTORIALS_FILE = "Tutorials.txt";
const SONGS_FILE = "Songs.txt";
const PLAYLISTS_FILE = "Playlists.txt";

function appendToLoginFile(username: string): void {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] New registration: ${username}\n`;
  try {
    appendFileSync(LOGIN_FILE, entry);
  } catch (error) {
    console.error("Failed to write to Login.txt:", error);
  }
}

function appendToRegisteredFile(username: string, passwordHash: string): void {
  const entry = `${username}:${passwordHash}\n`;
  try {
    appendFileSync(REGISTERED_FILE, entry);
  } catch (error) {
    console.error("Failed to write to Registered.txt:", error);
  }
}

function loadRegisteredUsersFromFile(): Map<
  string,
  { username: string; passwordHash: string }
> {
  const users = new Map<string, { username: string; passwordHash: string }>();
  try {
    if (existsSync(REGISTERED_FILE)) {
      const content = readFileSync(REGISTERED_FILE, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());
      lines.forEach((line) => {
        const [username, passwordHash] = line.split(":");
        if (username && passwordHash) {
          users.set(username.toLowerCase(), { username, passwordHash });
        }
      });
    }
  } catch (error) {
    console.error("Failed to load registered users from file:", error);
  }
  return users;
}

type PersistedProfile = {
  username: string;
  avatarStyle?: string;
  wins: number;
  losses: number;
  level: number;
};

function loadProfilesFromFile(): Map<string, PersistedProfile> {
  const profiles = new Map<string, PersistedProfile>();
  try {
    if (existsSync(PROFILES_FILE)) {
      const content = readFileSync(PROFILES_FILE, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());
      lines.forEach((line) => {
        const [username, avatarStyleRaw, winsRaw, lossesRaw, levelRaw] =
          line.split("|");
        if (!username) return;
        const wins = Number.parseInt(winsRaw || "0", 10);
        const losses = Number.parseInt(lossesRaw || "0", 10);
        const level = Number.parseInt(levelRaw || "1", 10);
        profiles.set(username.toLowerCase(), {
          username,
          avatarStyle: avatarStyleRaw || undefined,
          wins: Number.isFinite(wins) ? wins : 0,
          losses: Number.isFinite(losses) ? losses : 0,
          level: Number.isFinite(level) && level > 0 ? level : 1,
        });
      });
    }
  } catch (error) {
    console.error("Failed to load profiles from file:", error);
  }
  return profiles;
}

function saveProfilesToFile(profiles: Map<string, PersistedProfile>): void {
  try {
    const entries = Array.from(profiles.values()).map((profile) => {
      return [
        profile.username,
        profile.avatarStyle || "",
        profile.wins ?? 0,
        profile.losses ?? 0,
        profile.level ?? 1,
      ].join("|");
    });
    writeFileSync(PROFILES_FILE, entries.length > 0 ? `${entries.join("\n")}\n` : "");
  } catch (error) {
    console.error("Failed to save profiles to file:", error);
  }
}

function loadFriendsFromFile(): Map<string, Friend> {
  const friends = new Map<string, Friend>();
  try {
    if (existsSync(FRIENDS_FILE)) {
      const content = readFileSync(FRIENDS_FILE, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());
      lines.forEach((line) => {
        const [id, playerId, friendId, friendName, status, addedAtRaw] =
          line.split("|");
        if (!id || !playerId || !friendId || !friendName || !status) return;
        if (
          status !== "pending" &&
          status !== "accepted" &&
          status !== "blocked"
        ) {
          return;
        }
        const key = `${playerId.toLowerCase()}:${friendId.toLowerCase()}`;
        friends.set(key, {
          id,
          playerId,
          friendId,
          friendName,
          status,
          addedAt: Number.parseInt(addedAtRaw || "0", 10) || Date.now(),
        });
      });
    }
  } catch (error) {
    console.error("Failed to load friends from file:", error);
  }
  return friends;
}

function saveFriendsToFile(friends: Map<string, Friend>): void {
  try {
    const entries = Array.from(friends.values()).map((friend) =>
      [
        friend.id,
        friend.playerId,
        friend.friendId,
        friend.friendName,
        friend.status,
        friend.addedAt,
      ].join("|"),
    );
    writeFileSync(FRIENDS_FILE, entries.length > 0 ? `${entries.join("\n")}\n` : "");
  } catch (error) {
    console.error("Failed to save friends to file:", error);
  }
}

function loadDirectMessagesFromFile(): Map<string, DirectMessage[]> {
  const conversations = new Map<string, DirectMessage[]>();
  try {
    if (existsSync(DIRECT_MESSAGES_FILE)) {
      const content = readFileSync(DIRECT_MESSAGES_FILE, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());
      for (const line of lines) {
        const [id, fromId, fromName, toId, toName, msg, tsRaw, isReadRaw] =
          line.split("|");
        if (!id || !fromId || !toId || !msg) continue;
        const timestamp = Number.parseInt(tsRaw || "0", 10) || Date.now();
        const isRead = isReadRaw === "1";
        const message: DirectMessage = {
          id,
          fromPlayerId: fromId,
          fromPlayerName: fromName || "Unknown",
          toPlayerId: toId,
          toPlayerName: toName || "Unknown",
          content: msg.replace(/\\n/g, "\n"),
          timestamp,
          isRead,
        };
        const key = [fromId, toId].sort().join(":");
        const existing = conversations.get(key) || [];
        existing.push(message);
        conversations.set(key, existing);
      }
    }
  } catch (error) {
    console.error("Failed to load direct messages from file:", error);
  }
  return conversations;
}

function saveDirectMessagesToFile(conversations: Map<string, DirectMessage[]>): void {
  try {
    const entries: string[] = [];
    conversations.forEach((messages) => {
      messages.forEach((m) => {
        entries.push(
          [
            m.id,
            m.fromPlayerId,
            m.fromPlayerName,
            m.toPlayerId,
            m.toPlayerName,
            m.content.replace(/\n/g, "\\n"),
            m.timestamp,
            m.isRead ? "1" : "0",
          ].join("|"),
        );
      });
    });
    writeFileSync(
      DIRECT_MESSAGES_FILE,
      entries.length > 0 ? `${entries.join("\n")}\n` : "",
    );
  } catch (error) {
    console.error("Failed to save direct messages to file:", error);
  }
}

function appendToGameLogFile(
  gameType: string,
  winnerName: string,
  loserName: string,
  isDraw: boolean,
): void {
  const timestamp = new Date().toISOString();
  let entry: string;
  if (isDraw) {
    entry = `[${timestamp}] ${gameType}: Draw between ${winnerName} and ${loserName}\n`;
  } else {
    entry = `[${timestamp}] ${gameType}: ${winnerName} defeated ${loserName}\n`;
  }
  try {
    appendFileSync(GAME_LOG_FILE, entry);
  } catch (error) {
    console.error("Failed to write to GameLog.txt:", error);
  }
}

function appendToChatFile(playerName: string, content: string): void {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] ${playerName}: ${content}\n`;
  try {
    appendFileSync(CHAT_FILE, entry);
  } catch (error) {
    console.error("Failed to write to chats.txt:", error);
  }
}

function loadChatsFromFile(): Message[] {
  const messages: Message[] = [];
  try {
    if (existsSync(CHAT_FILE)) {
      const content = readFileSync(CHAT_FILE, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());
      const recentLines = lines.slice(-100);
      recentLines.forEach((line) => {
        const match = line.match(/\[(.+?)\] (.+?): (.+)/);
        if (match) {
          const [, timestampStr, playerName, messageContent] = match;
          messages.push({
            id: randomUUID(),
            playerId: "restored",
            playerName,
            content: messageContent,
            timestamp: new Date(timestampStr).getTime(),
          });
        }
      });
    }
  } catch (error) {
    console.error("Failed to load chats from file:", error);
  }
  return messages;
}

function appendToBannedFile(ip: string): void {
  const timestamp = new Date().toISOString();
  const entry = `[${timestamp}] Banned: ${ip}\n`;
  try {
    appendFileSync(BANNED_FILE, entry);
  } catch (error) {
    console.error("Failed to write to Banned.txt:", error);
  }
}

function rewriteBannedFile(bannedIPs: Set<string>): void {
  try {
    const timestamp = new Date().toISOString();
    const entries = Array.from(bannedIPs)
      .map((ip) => `[${timestamp}] Banned: ${ip}`)
      .join("\n");
    writeFileSync(BANNED_FILE, entries ? entries + "\n" : "");
  } catch (error) {
    console.error("Failed to rewrite Banned.txt:", error);
  }
}

function loadBannedIPsFromFile(): Set<string> {
  const bannedIPs = new Set<string>();
  try {
    if (existsSync(BANNED_FILE)) {
      const content = readFileSync(BANNED_FILE, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());
      lines.forEach((line) => {
        const match = line.match(/\[.+?\] Banned: (.+)/);
        if (match) {
          bannedIPs.add(match[1]);
        }
      });
    }
  } catch (error) {
    console.error("Failed to load banned IPs from file:", error);
  }
  return bannedIPs;
}

function loadGameLogsFromFile(): {
  id: string;
  gameType: string;
  winnerName: string;
  loserName: string;
  timestamp: number;
  isDraw: boolean;
}[] {
  const logs: {
    id: string;
    gameType: string;
    winnerName: string;
    loserName: string;
    timestamp: number;
    isDraw: boolean;
  }[] = [];
  try {
    if (existsSync(GAME_LOG_FILE)) {
      const content = readFileSync(GAME_LOG_FILE, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());
      const recentLines = lines.slice(-50);
      recentLines.forEach((line) => {
        const drawMatch = line.match(
          /\[(.+?)\] (.+?): Draw between (.+?) and (.+)/,
        );
        const winMatch = line.match(/\[(.+?)\] (.+?): (.+?) defeated (.+)/);
        if (drawMatch) {
          const [, timestampStr, gameType, player1, player2] = drawMatch;
          logs.push({
            id: randomUUID(),
            gameType,
            winnerName: player1,
            loserName: player2,
            timestamp: new Date(timestampStr).getTime(),
            isDraw: true,
          });
        } else if (winMatch) {
          const [, timestampStr, gameType, winner, loser] = winMatch;
          logs.push({
            id: randomUUID(),
            gameType,
            winnerName: winner,
            loserName: loser,
            timestamp: new Date(timestampStr).getTime(),
            isDraw: false,
          });
        }
      });
    }
  } catch (error) {
    console.error("Failed to load game logs from file:", error);
  }
  return logs;
}

// Support Request Persistence Helpers
function saveRequestsToFile(requests: Map<string, SupportRequest>): void {
  try {
    const data = Array.from(requests.values())
      .map((r) => JSON.stringify(r))
      .join("\n");
    writeFileSync(REQUESTS_FILE, data);
  } catch (error) {
    console.error("Failed to write to Requests.txt:", error);
  }
}

function loadRequestsFromFile(): Map<string, SupportRequest> {
  const requests = new Map<string, SupportRequest>();
  try {
    if (existsSync(REQUESTS_FILE)) {
      const content = readFileSync(REQUESTS_FILE, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());
      lines.forEach((line) => {
        try {
          const request = JSON.parse(line) as SupportRequest;
          if (request && request.id) {
            requests.set(request.id, request);
          }
        } catch (parseError) {
          console.error("Failed to parse request line:", parseError);
        }
      });
    }
  } catch (error) {
    console.error("Failed to load requests from file:", error);
  }
  return requests;
}

// Screenshot Persistence Helpers
function saveScreenshotsToFile(screenshots: Map<string, Screenshot>): void {
  try {
    const data = Array.from(screenshots.values())
      .map((s) => JSON.stringify(s))
      .join("\n");
    writeFileSync(SCREENSHOTS_FILE, data);
  } catch (error) {
    console.error("Failed to write to Screenshots.txt:", error);
  }
}

function loadScreenshotsFromFile(): Map<string, Screenshot> {
  const screenshots = new Map<string, Screenshot>();
  try {
    if (existsSync(SCREENSHOTS_FILE)) {
      const content = readFileSync(SCREENSHOTS_FILE, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());
      lines.forEach((line) => {
        try {
          const screenshot = JSON.parse(line) as Screenshot;
          if (screenshot && screenshot.id) {
            screenshots.set(screenshot.id, screenshot);
          }
        } catch (parseError) {
          console.error("Failed to parse screenshot line:", parseError);
        }
      });
    }
  } catch (error) {
    console.error("Failed to load screenshots from file:", error);
  }
  return screenshots;
}

function loadVipsFromFile(): Set<string> {
  const vips = new Set<string>();
  try {
    if (existsSync(VIP_FILE)) {
      const content = readFileSync(VIP_FILE, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());
      lines.forEach((line) => {
        vips.add(line.trim().toLowerCase());
      });
    }
  } catch (error) {
    console.error("Failed to load VIPs from file:", error);
  }
  return vips;
}

function saveVipsToFile(vips: Set<string>): void {
  try {
    const entries = Array.from(vips).join("\n");
    writeFileSync(VIP_FILE, entries ? entries + "\n" : "");
  } catch (error) {
    console.error("Failed to write to VIPs.txt:", error);
  }
}

// Tutorial Persistence Helpers
function saveTutorialsToFile(tutorials: Map<string, Tutorial>): void {
  try {
    const data = Array.from(tutorials.values())
      .map((t) => JSON.stringify(t))
      .join("\n");
    writeFileSync(TUTORIALS_FILE, data);
  } catch (error) {
    console.error("Failed to write to Tutorials.txt:", error);
  }
}

function loadTutorialsFromFile(): Map<string, Tutorial> {
  const tutorials = new Map<string, Tutorial>();
  try {
    if (existsSync(TUTORIALS_FILE)) {
      const content = readFileSync(TUTORIALS_FILE, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());
      lines.forEach((line) => {
        try {
          const tutorial = JSON.parse(line) as Tutorial;
          if (tutorial && tutorial.id) {
            tutorials.set(tutorial.id, tutorial);
          }
        } catch (parseError) {
          console.error("Failed to parse tutorial line:", parseError);
        }
      });
    }
  } catch (error) {
    console.error("Failed to load tutorials from file:", error);
  }
  return tutorials;
}

function saveSongsToFile(songs: Map<string, Song>): void {
  try {
    const data = Array.from(songs.values())
      .map((s) => JSON.stringify(s))
      .join("\n");
    writeFileSync(SONGS_FILE, data);
  } catch (error) {
    console.error("Failed to write to Songs.txt:", error);
  }
}

function loadSongsFromFile(): Map<string, Song> {
  const songs = new Map<string, Song>();
  try {
    if (existsSync(SONGS_FILE)) {
      const content = readFileSync(SONGS_FILE, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());
      lines.forEach((line) => {
        try {
          const song = JSON.parse(line) as Song;
          if (song && song.id) {
            songs.set(song.id, song);
          }
        } catch (parseError) {
          console.error("Failed to parse song line:", parseError);
        }
      });
    }
  } catch (error) {
    console.error("Failed to load songs from file:", error);
  }
  return songs;
}

function savePlaylistsToFile(playlists: Map<string, Playlist>): void {
  try {
    const data = Array.from(playlists.values())
      .map((p) => JSON.stringify(p))
      .join("\n");
    writeFileSync(PLAYLISTS_FILE, data);
  } catch (error) {
    console.error("Failed to write to Playlists.txt:", error);
  }
}

function loadPlaylistsFromFile(): Map<string, Playlist> {
  const playlists = new Map<string, Playlist>();
  try {
    if (existsSync(PLAYLISTS_FILE)) {
      const content = readFileSync(PLAYLISTS_FILE, "utf-8");
      const lines = content.split("\n").filter((line) => line.trim());
      lines.forEach((line) => {
        try {
          const playlist = JSON.parse(line) as Playlist;
          if (playlist && playlist.id) {
            playlists.set(playlist.id, playlist);
          }
        } catch (parseError) {
          console.error("Failed to parse playlist line:", parseError);
        }
      });
    }
  } catch (error) {
    console.error("Failed to load playlists from file:", error);
  }
  return playlists;
}

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

const WORDS = [
  "puzzle",
  "gaming",
  "player",
  "challenge",
  "victory",
  "battle",
  "quest",
  "knight",
  "wizard",
  "dragon",
  "castle",
  "treasure",
  "magic",
  "sword",
  "shield",
  "adventure",
  "hero",
  "mystery",
  "legend",
  "champion",
  "trophy",
  "arcade",
  "joystick",
  "console",
  "computer",
  "keyboard",
  "mouse",
  "monitor",
  "headset",
  "graphics",
  "controller",
  "pixels",
  "avatar",
  "level",
  "fahham",
  "ukkasha",
  "apple",
  "banana",
  "cherry",
  "grape",
  "orange",
];

function scrambleWord(word: string): string {
  const arr = word.split("");
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  const scrambled = arr.join("");
  return scrambled === word ? scrambleWord(word) : scrambled;
}

function generateMathProblem(): { problem: string; answer: number } {
  const ops = ["+", "-", "*"];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;

  switch (op) {
    case "+":
      a = Math.floor(Math.random() * 50) + 10;
      b = Math.floor(Math.random() * 50) + 10;
      answer = a + b;
      break;
    case "-":
      a = Math.floor(Math.random() * 50) + 30;
      b = Math.floor(Math.random() * 30) + 1;
      answer = a - b;
      break;
    case "*":
      a = Math.floor(Math.random() * 12) + 2;
      b = Math.floor(Math.random() * 12) + 2;
      answer = a * b;
      break;
    default:
      a = 10;
      b = 5;
      answer = 15;
  }

  return { problem: `${a} ${op} ${b}`, answer };
}

const RIDDLES = [
  {
    question:
      "I have cities but no houses, mountains but no trees, and water but no fish. What am I?",
    answer: "map",
    hint: "A flat representation of something larger",
  },
  {
    question: "The more you take, the more you leave behind. What am I?",
    answer: "footsteps",
    hint: "They mark where you've been",
  },
  {
    question:
      "I speak without a mouth and hear without ears. I have no body, but I come alive with sound. What am I?",
    answer: "echo",
    hint: "You may meet me in large empty spaces",
  },
  {
    question: "I can be cracked, made, told, and played. What am I?",
    answer: "joke",
    hint: "Often used to brighten the mood",
  },
  {
    question:
      "What has keys but no locks, space but no room, and allows you to enter but not go inside?",
    answer: "keyboard",
    hint: "It's easy",
  },
  {
    question: "I have hands but cannot clap. What am I?",
    answer: "clock",
    hint: "Always moving",
  },
  {
    question: "What gets wetter the more it dries?",
    answer: "towel",
    hint: "Its job is the opposite of what happens to it",
  },
  {
    question:
      "I can fly without wings and cry without eyes. Wherever I go, darkness follows me. What am I?",
    answer: "cloud",
    hint: "Seen above",
  },
  {
    question: "What has a heart that doesn’t beat?",
    answer: "artichoke",
    hint: "A vegetable",
  },
  {
    question: "I have a neck but no head. What am I?",
    answer: "bottle",
    hint: "Someting related to drink",
  },
  {
    question: "What has one eye but cannot see?",
    answer: "needle",
    hint: "Used in sewing",
  },
  {
    question: "What begins with T, ends with T, and has T inside?",
    answer: "teapot",
    hint: "Found in the kitchen",
  },
  {
    question: "What has many teeth but cannot bite?",
    answer: "comb",
    hint: "You have this in your room",
  },
  {
    question:
      "What can travel around the world while staying in the same place?",
    answer: "stamp",
    hint: "Attached to letters",
  },
  {
    question: "What has ears but cannot hear?",
    answer: "corn",
    hint: "Grows in fields",
  },
  {
    question: "What has a ring but no finger?",
    answer: "telephone",
    hint: "Used to communicate",
  },
  {
    question: "I have branches but no trunk or leaves. What am I?",
    answer: "bank",
    hint: "You might have its app in your phone",
  },
  {
    question: "What comes down but never goes up?",
    answer: "rain",
    hint: "Part of the weather",
  },
  {
    question: "What has a bed but never sleeps?",
    answer: "river",
    hint: "Water flows through it",
  },
  {
    question: "What can fill a room but takes up no space?",
    answer: "light",
    hint: "Allows you to see",
  },
  {
    question: "What has legs but cannot walk?",
    answer: "table",
    hint: "Used daily",
  },
  {
    question: "What has a thumb and four fingers but is not alive?",
    answer: "glove",
    hint: "You wear it",
  },
  {
    question: "What invention lets you look right through a wall?",
    answer: "window",
    hint: "Transparent",
  },
  {
    question: "What has a spine but no bones?",
    answer: "book",
    hint: "You can read it",
  },
  {
    question: "What can't talk but can reply when spoken to?",
    answer: "echo",
    hint: "Appears in certain environments",
  },
  {
    question: "What has an eye but cannot see, and is often found in storms?",
    answer: "hurricane",
    hint: "A strong natural phenomenon",
  },
  {
    question: "The more of me there is, the less you see. What am I?",
    answer: "darkness",
    hint: "It's easy",
  },
  {
    question: "I am full of holes, but I can still hold water. What am I?",
    answer: "sponge",
    hint: "Used for cleaning",
  },
  {
    question:
      "I follow you all day long, but when the night or rain comes, I am all gone. What am I?",
    answer: "shadow",
    hint: "Always attached during sunlight",
  },
  {
    question: "What goes up but never comes down?",
    answer: "age",
    hint: "It increases every birthday",
  },
  {
    question: "I shrink smaller every time I take a bath. What am I?",
    answer: "soap",
    hint: "Used for cleaning",
  },
  {
    question: "I’m tall when I’m young and short when I’m old. What am I?",
    answer: "candle",
    hint: "I melt as I burn",
  },
  {
    question: "The more you have of me, the less you see. What am I?",
    answer: "fog",
    hint: "Common near water in the morning",
  },
  {
    question: "What tastes better than it smells?",
    answer: "tongue",
    hint: "Inside your mouth",
  },
  {
    question: "What building has the most stories?",
    answer: "library",
    hint: "Filled with books",
  },
  {
    question: "What begins with an e and only contains one letter?",
    answer: "envelope",
    hint: "Used to send letters",
  },
  {
    question: "What has to be broken before you can use it?",
    answer: "egg",
    hint: "Often eaten for breakfast",
  },
  {
    question: "I have one head, one foot, and four legs. What am I?",
    answer: "bed",
    hint: "You lie on me",
  },
  {
    question: "What runs, but never walks; has a mouth, but never talks?",
    answer: "river",
    hint: "Flows continuously",
  },
  {
    question:
      "I travel all over the world but always stay in a corner. What am I?",
    answer: "stamp",
    hint: "You stick me on envelopes",
  },
  {
    question: "What can you catch, but not throw?",
    answer: "cold",
    hint: "A common illness",
  },
  {
    question: "I have a face and two hands but no arms or legs. What am I?",
    answer: "clock",
    hint: "Tells the time",
  },
  {
    question: "What can you break, even if you never pick it up or touch it?",
    answer: "promise",
    hint: "A spoken commitment",
  },
  {
    question: "What goes through cities and fields, but never moves?",
    answer: "road",
    hint: "Used for travel",
  },
  {
    question:
      "I’m sometimes full, sometimes empty; I hold clothes and sometimes secrets. What am I?",
    answer: "drawer",
    hint: "Found in furniture",
  },
  {
    question: "I’m always in front of you but can’t be seen. What am I?",
    answer: "future",
    hint: "Comes after today",
  },
  {
    question: "What has a head, a tail, is brown, and has no legs?",
    answer: "penny",
    hint: "A coin",
  },
  {
    question: "What gets bigger the more you take away?",
    answer: "hole",
    hint: "Made by removing material",
  },
  {
    question:
      "I can be long or short; I can be grown or bought; I can be painted or left bare. What am I?",
    answer: "hair",
    hint: "On your head",
  },
  {
    question: "What goes up and down without moving?",
    answer: "stairs",
    hint: "Used to change floors",
  },
  {
    question:
      "I have words but never speak. I have pages but no leaves. What am I?",
    answer: "book",
    hint: "You read me",
  },
  {
    question: "What is easy to lift but hard to throw?",
    answer: "feather",
    hint: "Light and soft",
  },
  {
    question: "I have a tail and a head, but no body. What am I?",
    answer: "coin",
    hint: "You flip me",
  },
  {
    question:
      "What comes once in a minute, twice in a moment, but never in a thousand years?",
    answer: "m",
    hint: "A letter",
  },
  {
    question:
      "I am not alive, but I grow; I don’t have lungs, but I need air; I don’t have a mouth, but water kills me. What am I?",
    answer: "fire",
    hint: "Produces heat and light",
  },
  {
    question: "I go up and down the stairs without moving. What am I?",
    answer: "carpet",
    hint: "Covers the floor",
  },
  {
    question:
      "I’m lighter than what I’m made of and more of me is hidden than seen. What am I?",
    answer: "iceberg",
    hint: "Most of me is underwater",
  },
  {
    question: "What has many keys but can’t open a single lock?",
    answer: "piano",
    hint: "A musical instrument",
  },
];

export interface IStorage {
  createUser(
    username: string,
    password: string,
    isNewRegistration?: boolean,
  ): User;
  getUserByUsername(username: string): User | undefined;
  userExists(username: string): boolean;

  addPlayer(id: string, username: string): Player;
  removePlayer(id: string): void;
  getPlayer(id: string): Player | undefined;
  getPlayerByUsername(username: string): Player | undefined;
  getAllPlayers(): Player[];
  updatePlayerStatus(
    id: string,
    status: Player["status"],
    currentGame?: string | null,
  ): void;

  addMessage(playerId: string, playerName: string, content: string): Message;
  getMessages(): Message[];
  clearMessages(): void;
  deleteMessage(messageId: string): boolean;

  isAdmin(username: string): boolean;
  isVip(username: string): boolean;
  addVip(username: string): void;
  removeVip(username: string): void;
  getVips(): string[];
  banIP(ip: string): void;
  unbanIP(ip: string): void;
  isIPBanned(ip: string): boolean;
  getBannedIPs(): string[];

  createChallenge(
    fromPlayerId: string,
    fromPlayerName: string,
    toPlayerId: string,
    toPlayerName: string,
    gameType:
      | "tictactoe"
      | "rps"
      | "wordscramble"
      | "numberguess"
      | "quickmath",
  ): Challenge;
  getChallenge(id: string): Challenge | undefined;
  updateChallengeStatus(id: string, status: Challenge["status"]): void;

  createTTTGame(
    player1Id: string,
    player1Name: string,
    player2Id: string,
    player2Name: string,
  ): TicTacToeGame;
  getTTTGame(id: string): TicTacToeGame | undefined;
  getTTTGameByPlayerId(playerId: string): TicTacToeGame | undefined;
  updateTTTGame(
    id: string,
    updates: Partial<TicTacToeGame>,
  ): TicTacToeGame | undefined;
  deleteTTTGame(id: string): void;

  createRPSGame(
    player1Id: string,
    player1Name: string,
    player2Id: string,
    player2Name: string,
  ): RPSGame;
  getRPSGame(id: string): RPSGame | undefined;
  getRPSGameByPlayerId(playerId: string): RPSGame | undefined;
  updateRPSGame(id: string, updates: Partial<RPSGame>): RPSGame | undefined;
  deleteRPSGame(id: string): void;

  getOrCreateRiddleLobby(
    playerId: string,
    playerName: string,
    vipOnly?: boolean,
  ): RiddleLobby;
  getRiddleLobby(id: string): RiddleLobby | undefined;
  getRiddleLobbyByPlayerId(playerId: string): RiddleLobby | undefined;
  addPlayerToRiddleLobby(
    lobbyId: string,
    playerId: string,
    playerName: string,
  ): RiddleLobby | undefined;
  removePlayerFromRiddleLobby(lobbyId: string, playerId: string): void;
  updateRiddleLobbyStatus(id: string, status: RiddleLobby["status"]): void;

  createRiddleGame(lobby: RiddleLobby): RiddleGame;
  getRiddleGame(id: string): RiddleGame | undefined;
  getRiddleGameByPlayerId(playerId: string): RiddleGame | undefined;
  updateRiddleGame(
    id: string,
    updates: Partial<RiddleGame>,
  ): RiddleGame | undefined;
  deleteRiddleGame(id: string): void;

  createWSGame(
    player1Id: string,
    player1Name: string,
    player2Id: string,
    player2Name: string,
  ): WordScrambleGame;
  getWSGame(id: string): WordScrambleGame | undefined;
  getWSGameByPlayerId(playerId: string): WordScrambleGame | undefined;
  updateWSGame(
    id: string,
    updates: Partial<WordScrambleGame>,
  ): WordScrambleGame | undefined;
  deleteWSGame(id: string): void;

  createNGGame(
    player1Id: string,
    player1Name: string,
    player2Id: string,
    player2Name: string,
  ): NumberGuessGame;
  getNGGame(id: string): NumberGuessGame | undefined;
  getNGGameByPlayerId(playerId: string): NumberGuessGame | undefined;
  updateNGGame(
    id: string,
    updates: Partial<NumberGuessGame>,
  ): NumberGuessGame | undefined;
  deleteNGGame(id: string): void;

  createQMGame(
    player1Id: string,
    player1Name: string,
    player2Id: string,
    player2Name: string,
  ): QuickMathGame;
  getQMGame(id: string): QuickMathGame | undefined;
  getQMGameByPlayerId(playerId: string): QuickMathGame | undefined;
  updateQMGame(
    id: string,
    updates: Partial<QuickMathGame>,
  ): QuickMathGame | undefined;
  deleteQMGame(id: string): void;

  addGameLog(
    gameType: string,
    winnerName: string,
    loserName: string,
    isDraw?: boolean,
  ): GameLog;
  getGameLogs(): GameLog[];

  getOrCreateWerewolfLobby(
    playerId: string,
    playerName: string,
    vipOnly?: boolean,
  ): WerewolfLobby;
  getWerewolfLobby(id: string): WerewolfLobby | undefined;
  getWerewolfLobbyByPlayerId(playerId: string): WerewolfLobby | undefined;
  addPlayerToWerewolfLobby(
    lobbyId: string,
    playerId: string,
    playerName: string,
  ): WerewolfLobby | undefined;
  removePlayerFromWerewolfLobby(lobbyId: string, playerId: string): void;
  updateWerewolfLobbySettings(
    id: string,
    enableSeer: boolean,
    enableDoctor: boolean,
  ): WerewolfLobby | undefined;
  updateWerewolfLobbyStatus(id: string, status: WerewolfLobby["status"]): void;
  deleteWerewolfLobby(id: string): void;

  createWerewolfGame(lobby: WerewolfLobby): WerewolfGame;
  getWerewolfGame(id: string): WerewolfGame | undefined;
  getWerewolfGameByPlayerId(playerId: string): WerewolfGame | undefined;
  updateWerewolfGame(
    id: string,
    updates: Partial<WerewolfGame>,
  ): WerewolfGame | undefined;
  deleteWerewolfGame(id: string): void;
  // New method for handling player drops in active game
  removePlayerFromWerewolfGame(
    gameId: string,
    playerId: string,
  ): WerewolfGame | undefined;

  getOrCreateSpyHuntLobby(playerId: string, playerName: string): SpyHuntLobby;
  getSpyHuntLobby(id: string): SpyHuntLobby | undefined;
  getSpyHuntLobbyByPlayerId(playerId: string): SpyHuntLobby | undefined;
  addPlayerToSpyHuntLobby(
    lobbyId: string,
    playerId: string,
    playerName: string,
  ): SpyHuntLobby | undefined;
  removePlayerFromSpyHuntLobby(lobbyId: string, playerId: string): void;
  updateSpyHuntLobbyStatus(id: string, status: SpyHuntLobby["status"]): void;
  deleteSpyHuntLobby(id: string): void;

  createSpyHuntGame(lobby: SpyHuntLobby): SpyHuntGame;
  getSpyHuntGame(id: string): SpyHuntGame | undefined;
  getSpyHuntGameByPlayerId(playerId: string): SpyHuntGame | undefined;
  updateSpyHuntGame(
    id: string,
    updates: Partial<SpyHuntGame>,
  ): SpyHuntGame | undefined;
  deleteSpyHuntGame(id: string): void;

  // FPS Game
  createFpsGame(
    hostId: string,
    hostName: string,
    mode: FpsGameMode,
    timeLimit: number,
  ): FpsGame;
  getFpsGame(id: string): FpsGame | undefined;
  getFpsGameByCode(code: string): FpsGame | undefined;
  getFpsGameByPlayerId(playerId: string): FpsGame | undefined;
  joinFpsGame(
    gameId: string,
    playerId: string,
    playerName: string,
    team?: "A" | "B",
  ): FpsGame | undefined;
  leaveFpsGame(gameId: string, playerId: string): FpsGame | undefined;
  startFpsGame(gameId: string): FpsGame | undefined;
  updateFpsPlayerPosition(
    gameId: string,
    playerId: string,
    position: { x: number; y: number; z: number },
    rotation: { x: number; y: number },
  ): FpsGame | undefined;
  fpsPlayerShoot(
    gameId: string,
    shooterId: string,
    targetId: string,
  ): { hit: boolean; killed: boolean; game: FpsGame } | undefined;
  respawnFpsPlayer(
    gameId: string,
    playerId: string,
    gun: FpsGunType,
  ): FpsGame | undefined;
  changeFpsPlayerGun(
    gameId: string,
    playerId: string,
    gun: FpsGunType,
  ): FpsGame | undefined;
  endFpsGame(gameId: string): FpsGame | undefined;
  deleteFpsGame(id: string): void;
  getAllFpsGames(): FpsGame[];

  // Point on Point Game
  getOrCreatePointOnPointLobby(
    playerId: string,
    playerName: string,
  ): PointOnPointLobby;
  getPointOnPointLobby(id: string): PointOnPointLobby | undefined;
  getPointOnPointLobbyByPlayerId(
    playerId: string,
  ): PointOnPointLobby | undefined;
  addPlayerToPointOnPointLobby(
    lobbyId: string,
    playerId: string,
    playerName: string,
  ): PointOnPointLobby | undefined;
  removePlayerFromPointOnPointLobby(lobbyId: string, playerId: string): void;
  updatePointOnPointLobbyStatus(
    id: string,
    status: PointOnPointLobby["status"],
  ): void;
  deletePointOnPointLobby(id: string): void;
  createPointOnPointGame(lobby: PointOnPointLobby): PointOnPointGame;
  getPointOnPointGame(id: string): PointOnPointGame | undefined;
  getPointOnPointGameByPlayerId(playerId: string): PointOnPointGame | undefined;
  updatePointOnPointGame(
    id: string,
    updates: Partial<PointOnPointGame>,
  ): PointOnPointGame | undefined;
  deletePointOnPointGame(id: string): void;
  getAllPointOnPointLobbies(): PointOnPointLobby[];
  getAllRiddleLobbies(): RiddleLobby[];
  getAllMemoryLobbies(): MemoryMatchLobby[];
  getAllTypingLobbies(): TypingRaceLobby[];
  getAllWerewolfLobbies(): WerewolfLobby[];
  getAllSpyHuntLobbies(): SpyHuntLobby[];

  // Outpost Rush Game
  getOrCreateOutpostRushLobby(
    playerId: string,
    playerName: string,
  ): OutpostRushLobby;
  getOutpostRushLobby(id: string): OutpostRushLobby | undefined;
  getOutpostRushLobbyByPlayerId(playerId: string): OutpostRushLobby | undefined;
  addPlayerToOutpostRushLobby(
    lobbyId: string,
    playerId: string,
    playerName: string,
  ): OutpostRushLobby | undefined;
  removePlayerFromOutpostRushLobby(lobbyId: string, playerId: string): void;
  updateOutpostRushPlayerTeam(
    lobbyId: string,
    playerId: string,
    team: "alpha" | "beta",
  ): OutpostRushLobby | undefined;
  updateOutpostRushLobbyStatus(
    id: string,
    status: OutpostRushLobby["status"],
  ): void;
  deleteOutpostRushLobby(id: string): void;
  createOutpostRushGame(lobby: OutpostRushLobby): OutpostRushGame;
  getOutpostRushGame(id: string): OutpostRushGame | undefined;
  getOutpostRushGameByPlayerId(playerId: string): OutpostRushGame | undefined;
  updateOutpostRushGame(
    id: string,
    updates: Partial<OutpostRushGame>,
  ): OutpostRushGame | undefined;
  deleteOutpostRushGame(id: string): void;
  getAllOutpostRushLobbies(): OutpostRushLobby[];

  // Emoji Chain Game
  getOrCreateEmojiChainLobby(
    playerId: string,
    playerName: string,
  ): EmojiChainLobby;
  getEmojiChainLobby(id: string): EmojiChainLobby | undefined;
  getEmojiChainLobbyByPlayerId(playerId: string): EmojiChainLobby | undefined;
  removePlayerFromEmojiChainLobby(lobbyId: string, playerId: string): void;
  updateEmojiChainLobbyStatus(
    id: string,
    status: EmojiChainLobby["status"],
  ): void;
  deleteEmojiChainLobby(id: string): void;
  createEmojiChainGame(
    lobby: EmojiChainLobby,
    emojis: string,
    answer: string,
    hint: string,
  ): EmojiChainGame;
  getEmojiChainGame(id: string): EmojiChainGame | undefined;
  getEmojiChainGameByPlayerId(playerId: string): EmojiChainGame | undefined;
  updateEmojiChainGame(
    id: string,
    updates: Partial<EmojiChainGame>,
  ): EmojiChainGame | undefined;
  deleteEmojiChainGame(id: string): void;
  getAllEmojiChainLobbies(): EmojiChainLobby[];

  // Word Association Game
  getOrCreateWordAssociationLobby(
    playerId: string,
    playerName: string,
  ): WordAssociationLobby;
  getWordAssociationLobby(id: string): WordAssociationLobby | undefined;
  getWordAssociationLobbyByPlayerId(
    playerId: string,
  ): WordAssociationLobby | undefined;
  removePlayerFromWordAssociationLobby(lobbyId: string, playerId: string): void;
  updateWordAssociationLobbyStatus(
    id: string,
    status: WordAssociationLobby["status"],
  ): void;
  deleteWordAssociationLobby(id: string): void;
  createWordAssociationGame(
    lobby: WordAssociationLobby,
    starterWord: string,
  ): WordAssociationGame;
  getWordAssociationGame(id: string): WordAssociationGame | undefined;
  getWordAssociationGameByPlayerId(
    playerId: string,
  ): WordAssociationGame | undefined;
  updateWordAssociationGame(
    id: string,
    updates: Partial<WordAssociationGame>,
  ): WordAssociationGame | undefined;
  deleteWordAssociationGame(id: string): void;
  getAllWordAssociationLobbies(): WordAssociationLobby[];

  // Hangman Game
  getOrCreateHangmanLobby(playerId: string, playerName: string): HangmanLobby;
  getHangmanLobby(id: string): HangmanLobby | undefined;
  getHangmanLobbyByPlayerId(playerId: string): HangmanLobby | undefined;
  removePlayerFromHangmanLobby(lobbyId: string, playerId: string): void;
  updateHangmanLobbyStatus(id: string, status: HangmanLobby["status"]): void;
  deleteHangmanLobby(id: string): void;
  createHangmanGame(lobby: HangmanLobby): HangmanGame;
  getHangmanGame(id: string): HangmanGame | undefined;
  getHangmanGameByPlayerId(playerId: string): HangmanGame | undefined;
  updateHangmanGame(
    id: string,
    updates: Partial<HangmanGame>,
  ): HangmanGame | undefined;
  deleteHangmanGame(id: string): void;
  getAllHangmanLobbies(): HangmanLobby[];

  // Trivia Quiz Game
  getOrCreateTriviaQuizLobby(
    playerId: string,
    playerName: string,
  ): TriviaQuizLobby;
  getTriviaQuizLobby(id: string): TriviaQuizLobby | undefined;
  getTriviaQuizLobbyByPlayerId(playerId: string): TriviaQuizLobby | undefined;
  removePlayerFromTriviaQuizLobby(lobbyId: string, playerId: string): void;
  updateTriviaQuizLobbyStatus(
    id: string,
    status: TriviaQuizLobby["status"],
  ): void;
  deleteTriviaQuizLobby(id: string): void;
  createTriviaQuizGame(
    lobby: TriviaQuizLobby,
    question: {
      question: string;
      options: string[];
      correctIndex: number;
      category: string;
    },
  ): TriviaQuizGame;
  getTriviaQuizGame(id: string): TriviaQuizGame | undefined;
  getTriviaQuizGameByPlayerId(playerId: string): TriviaQuizGame | undefined;
  updateTriviaQuizGame(
    id: string,
    updates: Partial<TriviaQuizGame>,
  ): TriviaQuizGame | undefined;
  deleteTriviaQuizGame(id: string): void;
  getAllTriviaQuizLobbies(): TriviaQuizLobby[];
  getAllHangmanLobbies(): HangmanLobby[];

  // Squid Game
  getOrCreateSquidGameLobby(
    playerId: string,
    playerName: string,
    vipOnly?: boolean,
  ): SquidGameLobby;
  getSquidGameLobby(id: string): SquidGameLobby | undefined;
  getSquidGameLobbyByPlayerId(playerId: string): SquidGameLobby | undefined;
  removePlayerFromSquidGameLobby(lobbyId: string, playerId: string): void;
  deleteSquidGameLobby(id: string): void;
  createSquidGame(lobby: SquidGameLobby): SquidGame;
  getSquidGame(id: string): SquidGame | undefined;
  getSquidGameByPlayerId(playerId: string): SquidGame | undefined;
  updateSquidGame(
    id: string,
    updates: Partial<SquidGame>,
  ): SquidGame | undefined;
  deleteSquidGame(id: string): void;
  getAllSquidGameLobbies(): SquidGameLobby[];

  // Truth or Bluff
  getOrCreateTruthOrBluffLobby(
    playerId: string,
    playerName: string,
  ): TruthOrBluffLobby;
  getTruthOrBluffLobby(id: string): TruthOrBluffLobby | undefined;
  getTruthOrBluffLobbyByPlayerId(
    playerId: string,
  ): TruthOrBluffLobby | undefined;
  removePlayerFromTruthOrBluffLobby(lobbyId: string, playerId: string): void;
  deleteTruthOrBluffLobby(id: string): void;
  createTruthOrBluffGame(lobby: TruthOrBluffLobby): TruthOrBluffGame;
  getTruthOrBluffGame(id: string): TruthOrBluffGame | undefined;
  getTruthOrBluffGameByPlayerId(playerId: string): TruthOrBluffGame | undefined;
  updateTruthOrBluffGame(
    id: string,
    updates: Partial<TruthOrBluffGame>,
  ): TruthOrBluffGame | undefined;
  deleteTruthOrBluffGame(id: string): void;
  getAllTruthOrBluffLobbies(): TruthOrBluffLobby[];

  // Spot the Liar
  getOrCreateSpotTheLiarLobby(
    playerId: string,
    playerName: string,
  ): SpotTheLiarLobby;
  getSpotTheLiarLobby(id: string): SpotTheLiarLobby | undefined;
  getSpotTheLiarLobbyByPlayerId(playerId: string): SpotTheLiarLobby | undefined;
  removePlayerFromSpotTheLiarLobby(lobbyId: string, playerId: string): void;
  deleteSpotTheLiarLobby(id: string): void;
  createSpotTheLiarGame(lobby: SpotTheLiarLobby): SpotTheLiarGame;
  getSpotTheLiarGame(id: string): SpotTheLiarGame | undefined;
  getSpotTheLiarGameByPlayerId(playerId: string): SpotTheLiarGame | undefined;
  updateSpotTheLiarGame(
    id: string,
    updates: Partial<SpotTheLiarGame>,
  ): SpotTheLiarGame | undefined;
  deleteSpotTheLiarGame(id: string): void;
  getAllSpotTheLiarLobbies(): SpotTheLiarLobby[];

  // Escape Ship
  getOrCreateEscapeShipLobby(
    playerId: string,
    playerName: string,
    vipOnly?: boolean,
  ): EscapeShipLobby;
  getEscapeShipLobby(id: string): EscapeShipLobby | undefined;
  getEscapeShipLobbyByPlayerId(playerId: string): EscapeShipLobby | undefined;
  removePlayerFromEscapeShipLobby(lobbyId: string, playerId: string): void;
  deleteEscapeShipLobby(id: string): void;
  createEscapeShipGame(lobby: EscapeShipLobby): EscapeShipGame;
  getEscapeShipGame(id: string): EscapeShipGame | undefined;
  getEscapeShipGameByPlayerId(playerId: string): EscapeShipGame | undefined;
  updateEscapeShipGame(
    id: string,
    updates: Partial<EscapeShipGame>,
  ): EscapeShipGame | undefined;
  deleteEscapeShipGame(id: string): void;
  getAllEscapeShipLobbies(): EscapeShipLobby[];

  // Reaction Race
  getOrCreateReactionRaceLobby(
    playerId: string,
    playerName: string,
  ): ReactionRaceLobby;
  getReactionRaceLobby(id: string): ReactionRaceLobby | undefined;
  getReactionRaceLobbyByPlayerId(
    playerId: string,
  ): ReactionRaceLobby | undefined;
  removePlayerFromReactionRaceLobby(lobbyId: string, playerId: string): void;
  deleteReactionRaceLobby(id: string): void;
  createReactionRaceGame(lobby: ReactionRaceLobby): ReactionRaceGame;
  getReactionRaceGame(id: string): ReactionRaceGame | undefined;
  getReactionRaceGameByPlayerId(playerId: string): ReactionRaceGame | undefined;
  updateReactionRaceGame(
    id: string,
    updates: Partial<ReactionRaceGame>,
  ): ReactionRaceGame | undefined;
  deleteReactionRaceGame(id: string): void;
  getAllReactionRaceLobbies(): ReactionRaceLobby[];

  // Color Clash
  getOrCreateColorClashLobby(
    playerId: string,
    playerName: string,
  ): ColorClashLobby;
  getColorClashLobby(id: string): ColorClashLobby | undefined;
  getColorClashLobbyByPlayerId(playerId: string): ColorClashLobby | undefined;
  removePlayerFromColorClashLobby(lobbyId: string, playerId: string): void;
  deleteColorClashLobby(id: string): void;
  createColorClashGame(lobby: ColorClashLobby): ColorClashGame;
  getColorClashGame(id: string): ColorClashGame | undefined;
  getColorClashGameByPlayerId(playerId: string): ColorClashGame | undefined;
  updateColorClashGame(
    id: string,
    updates: Partial<ColorClashGame>,
  ): ColorClashGame | undefined;
  deleteColorClashGame(id: string): void;
  getAllColorClashLobbies(): ColorClashLobby[];

  // Hide and Seek
  getOrCreateHideSeekLobby(
    playerId: string,
    playerName: string,
    vipOnly?: boolean,
  ): HideSeekLobby;
  getHideSeekLobby(id: string): HideSeekLobby | undefined;
  getHideSeekLobbyByPlayerId(playerId: string): HideSeekLobby | undefined;
  removePlayerFromHideSeekLobby(lobbyId: string, playerId: string): void;
  deleteHideSeekLobby(id: string): void;
  updateHideSeekLobby(id: string, updates: Partial<HideSeekLobby>): HideSeekLobby | undefined;
  createHideSeekGame(lobby: HideSeekLobby): HideSeekGame;
  getHideSeekGame(id: string): HideSeekGame | undefined;
  getHideSeekGameByPlayerId(playerId: string): HideSeekGame | undefined;
  updateHideSeekGame(
    id: string,
    updates: Partial<HideSeekGame>,
  ): HideSeekGame | undefined;
  deleteHideSeekGame(id: string): void;
  getAllHideSeekLobbies(): HideSeekLobby[];

  // Direct Messages
  addDirectMessage(
    fromId: string,
    fromName: string,
    toId: string,
    toName: string,
    content: string,
  ): DirectMessage;
  getDirectMessages(userId1: string, userId2: string): DirectMessage[];
  getUnreadMessagesForUser(userId: string): DirectMessage[];
  markMessagesAsRead(userId1: string, userId2: string): void;

  addScreenshot(
    uploaderId: string,
    uploaderName: string,
    filename: string,
    gameName: string,
  ): Screenshot;
  getScreenshots(): Screenshot[];
  deleteScreenshot(id: string): boolean;

  // Support Requests
  addSupportRequest(
    type: "bug" | "feature",
    title: string,
    description: string,
    submitterId: string,
    submitterName: string,
  ): SupportRequest;
  getSupportRequests(): SupportRequest[];
  toggleSupportRequestLike(
    requestId: string,
    playerId: string,
  ): SupportRequest | undefined;
  markSupportRequestDone(requestId: string): SupportRequest | undefined;
  deleteSupportRequest(requestId: string): boolean;

  // Tutorials
  addTutorial(
    gameType: string,
    title: string,
    description: string,
    videoFilename: string,
    uploaderId: string,
    uploaderName: string,
  ): Tutorial;
  getTutorials(): Tutorial[];
  getTutorialByGameType(gameType: string): Tutorial | undefined;
  deleteTutorial(id: string): boolean;

  // Ships Battle Lobbies
  getOrCreateShipsBattleLobby(
    playerId: string,
    playerName: string,
  ): ShipsBattleLobby;
  getShipsBattleLobby(id: string): ShipsBattleLobby | undefined;
  getShipsBattleLobbyByPlayerId(playerId: string): ShipsBattleLobby | undefined;
  removePlayerFromShipsBattleLobby(lobbyId: string, playerId: string): void;
  deleteShipsBattleLobby(id: string): void;
  getAllShipsBattleLobbies(): ShipsBattleLobby[];

  // Achievements & Badges
  addAchievement(achievement: Achievement): Achievement;
  getPlayerAchievements(playerId: string): Achievement[];
  removeAchievement(achievementId: string): boolean;
  getAllBadges(): Badge[];
  addBadgeToPlayer(playerId: string, badgeId: string): void;
  getPlayerBadges(playerId: string): Badge[];

  // Friends System
  sendFriendRequest(playerUsername: string, friendUsername: string): Friend;
  acceptFriendRequest(playerUsername: string, friendUsername: string): void;
  rejectFriendRequest(playerUsername: string, friendUsername: string): void;
  getPlayerFriends(playerUsername: string): Friend[];
  getPendingRequests(playerUsername: string): Friend[];
  getOutgoingRequests(playerUsername: string): Friend[];
  removeFriend(playerUsername: string, friendUsername: string): void;
  areFriends(playerUsername: string, friendUsername: string): boolean;
  blockPlayer(playerId: string, blockedId: string): void;

  // Player Profile Updates
  updatePlayerAvatar(playerId: string, avatar: string, style: string): void;
  updatePlayerStats(playerId: string, wins: number, losses: number, level: number): void;
  getPersistedProfileByUsername(
    username: string,
  ): {
    username: string;
    avatarStyle?: string;
    wins: number;
    losses: number;
    level: number;
  } | undefined;

  // Spectator Mode
  addSpectator(gameId: string, playerId: string, playerName: string): void;
  removeSpectator(gameId: string, playerId: string): void;
  getGameSpectators(gameId: string): Spectator[];
}

export interface GameLog {
  id: string;
  gameType: string;
  winnerName: string;
  loserName: string;
  timestamp: number;
  isDraw: boolean;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private persistedProfiles: Map<string, PersistedProfile> = new Map();
  private players: Map<string, Player> = new Map();
  private messages: Message[] = [];
  private challenges: Map<string, Challenge> = new Map();
  private tttGames: Map<string, TicTacToeGame> = new Map();
  private rpsGames: Map<string, RPSGame> = new Map();
  private riddleLobbies: Map<string, RiddleLobby> = new Map();
  private riddleGames: Map<string, RiddleGame> = new Map();
  private wsGames: Map<string, WordScrambleGame> = new Map();
  private ngGames: Map<string, NumberGuessGame> = new Map();
  private qmGames: Map<string, QuickMathGame> = new Map();
  private c4Games: Map<string, ConnectFourGame> = new Map();
  private memoryLobbies: Map<string, MemoryMatchLobby> = new Map();
  private memoryGames: Map<string, MemoryMatchGame> = new Map();
  private typingLobbies: Map<string, TypingRaceLobby> = new Map();
  private typingGames: Map<string, TypingRaceGame> = new Map();
  private gameLogs: GameLog[] = [];
  private werewolfLobbies: Map<string, WerewolfLobby> = new Map();
  private werewolfGames: Map<string, WerewolfGame> = new Map();
  private spyHuntLobbies: Map<string, SpyHuntLobby> = new Map();
  private spyHuntGames: Map<string, SpyHuntGame> = new Map();
  private fpsGames: Map<string, FpsGame> = new Map();
  private pointOnPointLobbies: Map<string, PointOnPointLobby> = new Map();
  private pointOnPointGames: Map<string, PointOnPointGame> = new Map();
  private outpostRushLobbies: Map<string, OutpostRushLobby> = new Map();
  private outpostRushGames: Map<string, OutpostRushGame> = new Map();
  private emojiChainLobbies: Map<string, EmojiChainLobby> = new Map();
  private emojiChainGames: Map<string, EmojiChainGame> = new Map();
  private wordAssociationLobbies: Map<string, WordAssociationLobby> = new Map();
  private wordAssociationGames: Map<string, WordAssociationGame> = new Map();
  private hangmanLobbies: Map<string, HangmanLobby> = new Map();
  private hangmanGames: Map<string, HangmanGame> = new Map();
  private triviaQuizLobbies: Map<string, TriviaQuizLobby> = new Map();
  private triviaQuizGames: Map<string, TriviaQuizGame> = new Map();
  private squidGameLobbies: Map<string, SquidGameLobby> = new Map();
  private squidGames: Map<string, SquidGame> = new Map();
  private truthOrBluffLobbies: Map<string, TruthOrBluffLobby> = new Map();
  private truthOrBluffGames: Map<string, TruthOrBluffGame> = new Map();
  private escapeShipLobbies: Map<string, EscapeShipLobby> = new Map();
  private escapeShipGames: Map<string, EscapeShipGame> = new Map();
  private spotTheLiarLobbies: Map<string, SpotTheLiarLobby> = new Map();
  private spotTheLiarGames: Map<string, SpotTheLiarGame> = new Map();
  private reactionRaceLobbies: Map<string, ReactionRaceLobby> = new Map();
  private reactionRaceGames: Map<string, ReactionRaceGame> = new Map();
  private colorClashLobbies: Map<string, ColorClashLobby> = new Map();
  private colorClashGames: Map<string, ColorClashGame> = new Map();
  private hideSeekLobbies: Map<string, HideSeekLobby> = new Map();
  private hideSeekGames: Map<string, HideSeekGame> = new Map();
  private directMessages: Map<string, DirectMessage[]> = new Map();
  private bannedIPs: Set<string> = new Set();
  private vips: Set<string> = new Set();
  private supportRequests: Map<string, SupportRequest> = new Map();
  private screenshots: Map<string, Screenshot> = new Map();
  private tutorials: Map<string, Tutorial> = new Map();
  private songs: Map<string, Song> = new Map();
  private playlists: Map<string, Playlist> = new Map();
  private castlesLobbies = new Map<string, CastlesLobby>();
  private castlesGames = new Map<string, CastlesGame>();
  private shipsBattleLobbies = new Map<string, ShipsBattleLobby>();
  private shipsBattleGames = new Map<string, ShipsBattleGame>();
  private castlesEngines = new Map<string, CastlesGameEngine>();
  private battleshipLobbies = new Map<string, BattleshipLobby>();
  private battleshipGames = new Map<string, BattleshipGame>();
  private ctfLobbies = new Map<string, CTFLobby>();
  private ctfGames = new Map<string, CTFGame>();
  private siegeWarLobbies = new Map<string, SiegeWarLobby>();
  private siegeWarGames = new Map<string, SiegeWarGame>();
  private skyFortressLobbies = new Map<string, SkyFortressLobby>();
  private skyFortressGames = new Map<string, SkyFortressGame>();
  private timeRiftLobbies = new Map<string, TimeRiftLobby>();
  private timeRiftGames = new Map<string, TimeRiftGame>();
  private shadowOpsLobbies = new Map<string, ShadowOpsLobby>();
  private shadowOpsGames = new Map<string, ShadowOpsGame>();
  private elementalLobbies = new Map<string, ElementalLobby>();
  private elementalGames = new Map<string, ElementalGame>();
  private mechLobbies = new Map<string, MechLobby>();
  private mechGames = new Map<string, MechGame>();
  private assassinLobbies = new Map<string, AssassinLobby>();
  private vipLobbies = new Map<string, any>();
  private achievements = new Map<string, Achievement>();
  private friends = new Map<string, Friend>();
  private badges = new Map<string, Badge>();
  private spectators = new Map<string, Spectator[]>();
  private assassinGames = new Map<string, AssassinGame>();
  constructor() {
    this.persistedProfiles = loadProfilesFromFile();
    this.friends = loadFriendsFromFile();
    this.directMessages = loadDirectMessagesFromFile();

    // Load registered users from file first
    const registeredUsers = loadRegisteredUsersFromFile();
    registeredUsers.forEach((userData) => {
      const user: User = {
        id: randomUUID(),
        username: userData.username,
        passwordHash: userData.passwordHash,
      };
      this.users.set(userData.username.toLowerCase(), user);
    });
    console.log(`Restored ${registeredUsers.size} registered users from file`);
    console.log(`Restored ${this.persistedProfiles.size} persisted profiles from file`);

    // Create default users only if not already registered
    const defaultUsers = [
      { username: "Fahham", password: "Fahham@321" },
      { username: "Ukkasha", password: "Uk@123" },
      { username: "jinx", password: "sara@345" },
      { username: "Taesha", password: "Tea#321" },
      { username: "ABI", password: "Abi@333" },
      { username: "Adeel", password: "AdeelBro123" },
      { username: "Ahmad", password: "Ahmad@123" },
      { username: "Ayana", password: "Ayana@123" },
      { username: "Arshuman", password: "Arsh#321" },
      { username: "IsXypher", password: "xypher2008" },
      { username: "Hammad", password: "Ham@123" },
      { username: "Nabeeha", password: "GAME_HUB1" },
      { username: "LXV_GHOST", password: "GHOST3321" },
      { username: "Hidden", password: "Hide321" },
    ];

    defaultUsers.forEach(({ username, password }) => {
      if (!this.userExists(username)) {
        this.createUser(username, password, false);
      }
    });

    this.messages = loadChatsFromFile();
    this.bannedIPs = loadBannedIPsFromFile();
    this.vips = loadVipsFromFile();
    this.gameLogs = loadGameLogsFromFile();
    this.supportRequests = loadRequestsFromFile();
    this.screenshots = loadScreenshotsFromFile();
    this.tutorials = loadTutorialsFromFile();
    this.songs = loadSongsFromFile();
    this.playlists = loadPlaylistsFromFile();

    // Create default playlists if they don't exist
    this.ensureDefaultPlaylists();

    console.log(`Restored ${this.messages.length} chat messages from file`);
    console.log(`Restored ${this.friends.size} friend relations from file`);
    console.log(`Restored ${this.directMessages.size} DM conversations from file`);
    console.log(`Restored ${this.bannedIPs.size} banned IPs from file`);
    console.log(`Restored ${this.vips.size} VIPs from file`);
    console.log(`Restored ${this.gameLogs.length} game logs from file`);
    console.log(
      `Restored ${this.supportRequests.size} support requests from file`,
    );
    console.log(`Restored ${this.screenshots.size} screenshots from file`);
    console.log(`Restored ${this.tutorials.size} tutorials from file`);
    console.log(`Restored ${this.songs.size} songs from file`);
    console.log(`Restored ${this.playlists.size} playlists from file`);
  }

  createUser(
    username: string,
    password: string,
    isNewRegistration: boolean = false,
  ): User {
    const passwordHash = hashPassword(password);
    const user: User = {
      id: randomUUID(),
      username,
      passwordHash,
    };
    this.users.set(username.toLowerCase(), user);
    if (!this.persistedProfiles.has(username.toLowerCase())) {
      this.persistedProfiles.set(username.toLowerCase(), {
        username,
        wins: 0,
        losses: 0,
        level: 1,
      });
      saveProfilesToFile(this.persistedProfiles);
    }
    if (isNewRegistration) {
      appendToLoginFile(username);
      appendToRegisteredFile(username, passwordHash);
    }
    return user;
  }

  getUserByUsername(username: string): User | undefined {
    return this.users.get(username.toLowerCase());
  }

  userExists(username: string): boolean {
    return this.users.has(username.toLowerCase());
  }

  private buildAvatarUrl(style: string, username: string): string {
    return `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(username)}`;
  }

  addPlayer(id: string, username: string): Player {
    const persisted = this.persistedProfiles.get(username.toLowerCase());
    const avatarStyle = persisted?.avatarStyle as Player["avatarStyle"] | undefined;
    const player: Player = {
      id,
      username,
      status: "online",
      currentGame: null,
      avatar: avatarStyle ? this.buildAvatarUrl(avatarStyle, username) : null,
      avatarStyle,
      wins: persisted?.wins ?? 0,
      losses: persisted?.losses ?? 0,
      level: persisted?.level ?? 1,
    };
    this.players.set(id, player);
    return player;
  }

  removePlayer(id: string): void {
    this.players.delete(id);
  }

  getPlayer(id: string): Player | undefined {
    return this.players.get(id);
  }

  getPlayerByUsername(username: string): Player | undefined {
    return Array.from(this.players.values()).find(
      (p) => p.username.toLowerCase() === username.toLowerCase(),
    );
  }

  getAllPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  updatePlayerStatus(
    id: string,
    status: Player["status"],
    currentGame?: string | null,
  ): void {
    const player = this.players.get(id);
    if (player) {
      player.status = status;
      if (currentGame !== undefined) {
        player.currentGame = currentGame;
      }
      this.players.set(id, player);
    }
  }

  updatePlayerAvatar(playerId: string, avatar: string, style: string): void {
    const player = this.players.get(playerId);
    if (player) {
      player.avatar = avatar || this.buildAvatarUrl(style, player.username);
      player.avatarStyle = style as any;
      this.players.set(playerId, player);
      this.persistedProfiles.set(player.username.toLowerCase(), {
        username: player.username,
        avatarStyle: style,
        wins: player.wins ?? 0,
        losses: player.losses ?? 0,
        level: player.level ?? 1,
      });
      saveProfilesToFile(this.persistedProfiles);
    }
  }

  updatePlayerStats(playerId: string, wins: number, losses: number, level: number): void {
    const player = this.players.get(playerId);
    if (player) {
      player.wins = (player.wins || 0) + wins;
      player.losses = (player.losses || 0) + losses;
      player.level = level;
      this.players.set(playerId, player);
      this.persistedProfiles.set(player.username.toLowerCase(), {
        username: player.username,
        avatarStyle: player.avatarStyle,
        wins: player.wins ?? 0,
        losses: player.losses ?? 0,
        level: player.level ?? 1,
      });
      saveProfilesToFile(this.persistedProfiles);
    }
  }

  getPersistedProfileByUsername(username: string):
    | {
        username: string;
        avatarStyle?: string;
        wins: number;
        losses: number;
        level: number;
      }
    | undefined {
    return this.persistedProfiles.get(username.toLowerCase());
  }

  addAchievement(achievement: Achievement): Achievement {
    this.achievements.set(achievement.id, achievement);
    const player = this.players.get(achievement.playerId);
    if (player) {
      if (!player.achievements) player.achievements = [];
      player.achievements.push(achievement.id);
      this.players.set(achievement.playerId, player);
    }
    return achievement;
  }

  getPlayerAchievements(playerId: string): Achievement[] {
    return Array.from(this.achievements.values()).filter(
      (a) => a.playerId === playerId,
    );
  }

  removeAchievement(achievementId: string): boolean {
    const achievement = this.achievements.get(achievementId);
    if (achievement) {
      const player = this.players.get(achievement.playerId);
      if (player && player.achievements) {
        player.achievements = player.achievements.filter((id) => id !== achievementId);
        this.players.set(achievement.playerId, player);
      }
      this.achievements.delete(achievementId);
      return true;
    }
    return false;
  }

  getAllBadges(): Badge[] {
    return Array.from(this.badges.values());
  }

  addBadgeToPlayer(playerId: string, badgeId: string): void {
    const player = this.players.get(playerId);
    if (player) {
      if (!player.badges) player.badges = [];
      if (!player.badges.includes(badgeId)) {
        player.badges.push(badgeId);
        this.players.set(playerId, player);
      }
    }
  }

  getPlayerBadges(playerId: string): Badge[] {
    const player = this.players.get(playerId);
    if (!player || !player.badges) return [];
    return player.badges
      .map((badgeId) => this.badges.get(badgeId))
      .filter((b): b is Badge => b !== undefined);
  }

  private normalizeUsername(username: string): string {
    return username.trim().toLowerCase();
  }

  private canonicalUsername(username: string): string {
    const user = this.getUserByUsername(username);
    return user?.username || username.trim();
  }

  private friendKey(playerUsername: string, friendUsername: string): string {
    return `${this.normalizeUsername(playerUsername)}:${this.normalizeUsername(friendUsername)}`;
  }

  sendFriendRequest(playerUsername: string, friendUsername: string): Friend {
    const fromCanonical = this.canonicalUsername(playerUsername);
    const toCanonical = this.canonicalUsername(friendUsername);
    const from = this.normalizeUsername(fromCanonical);
    const to = this.normalizeUsername(toCanonical);

    if (!this.userExists(fromCanonical) || !this.userExists(toCanonical)) {
      throw new Error("One or both users do not exist");
    }
    if (from === to) {
      throw new Error("You cannot send a friend request to yourself");
    }

    const existingOutgoing = this.friends.get(this.friendKey(fromCanonical, toCanonical));
    const existingIncoming = this.friends.get(this.friendKey(toCanonical, fromCanonical));

    if (existingOutgoing?.status === "pending") {
      throw new Error("Friend request already sent");
    }
    if (existingIncoming?.status === "pending") {
      throw new Error("This player already sent you a friend request");
    }
    if (
      existingOutgoing?.status === "accepted" ||
      existingIncoming?.status === "accepted"
    ) {
      throw new Error("You are already friends");
    }

    // Pending entries are stored for the recipient inbox.
    const pending: Friend = {
      id: randomUUID(),
      playerId: toCanonical,
      friendId: fromCanonical,
      friendName: fromCanonical,
      status: "pending",
      addedAt: Date.now(),
    };
    this.friends.set(this.friendKey(toCanonical, fromCanonical), pending);
    saveFriendsToFile(this.friends);
    return pending;
  }

  acceptFriendRequest(playerUsername: string, friendUsername: string): void {
    const playerCanonical = this.canonicalUsername(playerUsername);
    const friendCanonical = this.canonicalUsername(friendUsername);
    const incomingKey = this.friendKey(playerCanonical, friendCanonical);
    const incoming = this.friends.get(incomingKey);

    if (!incoming || incoming.status !== "pending") {
      throw new Error("Friend request not found");
    }

    incoming.status = "accepted";
    incoming.friendName = friendCanonical;
    this.friends.set(incomingKey, incoming);

    const reciprocalKey = this.friendKey(friendCanonical, playerCanonical);
    const reciprocal: Friend = {
      id: randomUUID(),
      playerId: friendCanonical,
      friendId: playerCanonical,
      friendName: playerCanonical,
      status: "accepted",
      addedAt: incoming.addedAt,
    };
    this.friends.set(reciprocalKey, reciprocal);
    saveFriendsToFile(this.friends);
  }

  rejectFriendRequest(playerUsername: string, friendUsername: string): void {
    const key = this.friendKey(playerUsername, friendUsername);
    const existing = this.friends.get(key);
    if (!existing || existing.status !== "pending") {
      throw new Error("Friend request not found");
    }
    this.friends.delete(key);
    saveFriendsToFile(this.friends);
  }

  getPlayerFriends(playerUsername: string): Friend[] {
    const player = this.normalizeUsername(playerUsername);
    return Array.from(this.friends.values()).filter(
      (f) => this.normalizeUsername(f.playerId) === player && f.status === "accepted",
    );
  }

  getPendingRequests(playerUsername: string): Friend[] {
    const player = this.normalizeUsername(playerUsername);
    return Array.from(this.friends.values()).filter(
      (f) => this.normalizeUsername(f.playerId) === player && f.status === "pending",
    );
  }

  getOutgoingRequests(playerUsername: string): Friend[] {
    const player = this.normalizeUsername(playerUsername);
    return Array.from(this.friends.values()).filter(
      (f) => this.normalizeUsername(f.friendId) === player && f.status === "pending",
    );
  }

  removeFriend(playerUsername: string, friendUsername: string): void {
    const keyA = this.friendKey(playerUsername, friendUsername);
    const keyB = this.friendKey(friendUsername, playerUsername);
    const hadAny = this.friends.has(keyA) || this.friends.has(keyB);
    if (!hadAny) {
      throw new Error("Friend relation not found");
    }
    this.friends.delete(keyA);
    this.friends.delete(keyB);
    saveFriendsToFile(this.friends);
  }

  areFriends(playerUsername: string, friendUsername: string): boolean {
    const forward = this.friends.get(this.friendKey(playerUsername, friendUsername));
    const reverse = this.friends.get(this.friendKey(friendUsername, playerUsername));
    return forward?.status === "accepted" || reverse?.status === "accepted";
  }

  blockPlayer(playerId: string, blockedId: string): void {
    const key = `${playerId}:${blockedId}`;
    const friend: Friend = {
      id: randomUUID(),
      playerId,
      friendId: blockedId,
      friendName: "",
      status: "blocked",
      addedAt: Date.now(),
    };
    this.friends.set(key, friend);
  }

  addSpectator(gameId: string, playerId: string, playerName: string): void {
    if (!this.spectators.has(gameId)) {
      this.spectators.set(gameId, []);
    }
    const spectators = this.spectators.get(gameId)!;
    if (!spectators.find((s) => s.playerId === playerId)) {
      spectators.push({
        playerId,
        playerName,
        joinedAt: Date.now(),
      });
    }
  }

  removeSpectator(gameId: string, playerId: string): void {
    const spectators = this.spectators.get(gameId);
    if (spectators) {
      const index = spectators.findIndex((s) => s.playerId === playerId);
      if (index !== -1) {
        spectators.splice(index, 1);
      }
    }
  }

  getGameSpectators(gameId: string): Spectator[] {
    return this.spectators.get(gameId) || [];
  }

  addMessage(playerId: string, playerName: string, content: string): Message {
    const message: Message = {
      id: randomUUID(),
      playerId,
      playerName,
      content,
      timestamp: Date.now(),
    };
    this.messages.push(message);
    if (this.messages.length > 100) {
      this.messages = this.messages.slice(-100);
    }
    appendToChatFile(playerName, content);
    return message;
  }

  getMessages(): Message[] {
    return this.messages;
  }

  clearMessages(): void {
    this.messages = [];
  }

  deleteMessage(messageId: string): boolean {
    const index = this.messages.findIndex((m) => m.id === messageId);
    if (index !== -1) {
      this.messages.splice(index, 1);
      return true;
    }
    return false;
  }

  isAdmin(username: string): boolean {
    return username.toLowerCase() === "fahham";
  }

  isVip(username: string): boolean {
    return this.vips.has(username.toLowerCase());
  }

  addVip(username: string): void {
    this.vips.add(username.toLowerCase());
    saveVipsToFile(this.vips);
  }

  removeVip(username: string): void {
    this.vips.delete(username.toLowerCase());
    saveVipsToFile(this.vips);
  }

  getVips(): string[] {
    return Array.from(this.vips);
  }

  banIP(ip: string): void {
    this.bannedIPs.add(ip);
    appendToBannedFile(ip);
  }

  unbanIP(ip: string): void {
    this.bannedIPs.delete(ip);
    rewriteBannedFile(this.bannedIPs);
  }

  isIPBanned(ip: string): boolean {
    return this.bannedIPs.has(ip);
  }

  getBannedIPs(): string[] {
    return Array.from(this.bannedIPs);
  }

  createChallenge(
    fromPlayerId: string,
    fromPlayerName: string,
    toPlayerId: string,
    toPlayerName: string,
    gameType:
      | "tictactoe"
      | "rps"
      | "wordscramble"
      | "numberguess"
      | "quickmath",
  ): Challenge {
    const challenge: Challenge = {
      id: randomUUID(),
      fromPlayerId,
      fromPlayerName,
      toPlayerId,
      toPlayerName,
      gameType,
      status: "pending",
      timestamp: Date.now(),
    };
    this.challenges.set(challenge.id, challenge);
    return challenge;
  }

  getChallenge(id: string): Challenge | undefined {
    return this.challenges.get(id);
  }

  updateChallengeStatus(id: string, status: Challenge["status"]): void {
    const challenge = this.challenges.get(id);
    if (challenge) {
      challenge.status = status;
      this.challenges.set(id, challenge);
    }
  }

  createTTTGame(
    player1Id: string,
    player1Name: string,
    player2Id: string,
    player2Name: string,
  ): TicTacToeGame {
    const game: TicTacToeGame = {
      id: randomUUID(),
      player1Id,
      player1Name,
      player2Id,
      player2Name,
      board: Array(9).fill(null),
      currentTurn: player1Id,
      winner: null,
      isDraw: false,
      status: "playing",
      player1Score: 0,
      player2Score: 0,
      spectators: [],
    };
    this.tttGames.set(game.id, game);
    return game;
  }

  getAllTTTGames(): TicTacToeGame[] {
    return Array.from(this.tttGames.values());
  }

  addSpectatorToTTTGame(
    gameId: string,
    spectatorId: string,
    spectatorName: string,
  ): TicTacToeGame | undefined {
    const game = this.tttGames.get(gameId);
    if (game) {
      const alreadySpectating = game.spectators.find(
        (s) => s.id === spectatorId,
      );
      if (!alreadySpectating) {
        game.spectators.push({ id: spectatorId, name: spectatorName });
        this.tttGames.set(gameId, game);
      }
      return game;
    }
    return undefined;
  }

  removeSpectatorFromTTTGame(
    gameId: string,
    spectatorId: string,
  ): TicTacToeGame | undefined {
    const game = this.tttGames.get(gameId);
    if (game) {
      game.spectators = game.spectators.filter((s) => s.id !== spectatorId);
      this.tttGames.set(gameId, game);
      return game;
    }
    return undefined;
  }

  getSpectatingGame(spectatorId: string): TicTacToeGame | undefined {
    return Array.from(this.tttGames.values()).find((g) =>
      g.spectators.some((s) => s.id === spectatorId),
    );
  }

  getTTTGame(id: string): TicTacToeGame | undefined {
    return this.tttGames.get(id);
  }

  getTTTGameByPlayerId(playerId: string): TicTacToeGame | undefined {
    return Array.from(this.tttGames.values()).find(
      (g) => g.player1Id === playerId || g.player2Id === playerId,
    );
  }

  updateTTTGame(
    id: string,
    updates: Partial<TicTacToeGame>,
  ): TicTacToeGame | undefined {
    const game = this.tttGames.get(id);
    if (game) {
      const updated = { ...game, ...updates };
      this.tttGames.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteTTTGame(id: string): void {
    this.tttGames.delete(id);
  }

  createRPSGame(
    player1Id: string,
    player1Name: string,
    player2Id: string,
    player2Name: string,
  ): RPSGame {
    const game: RPSGame = {
      id: randomUUID(),
      player1Id,
      player1Name,
      player2Id,
      player2Name,
      player1Choice: null,
      player2Choice: null,
      roundWinner: null,
      player1Score: 0,
      player2Score: 0,
      round: 1,
      status: "choosing",
    };
    this.rpsGames.set(game.id, game);
    return game;
  }

  getRPSGame(id: string): RPSGame | undefined {
    return this.rpsGames.get(id);
  }

  getRPSGameByPlayerId(playerId: string): RPSGame | undefined {
    return Array.from(this.rpsGames.values()).find(
      (g) => g.player1Id === playerId || g.player2Id === playerId,
    );
  }

  updateRPSGame(id: string, updates: Partial<RPSGame>): RPSGame | undefined {
    const game = this.rpsGames.get(id);
    if (game) {
      const updated = { ...game, ...updates };
      this.rpsGames.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteRPSGame(id: string): void {
    this.rpsGames.delete(id);
  }

  getOrCreateRiddleLobby(
    playerId: string,
    playerName: string,
    vipOnly = false,
  ): RiddleLobby {
    const existing = Array.from(this.riddleLobbies.values()).find(
      (l) =>
        l.status === "waiting" &&
        l.players.length < 8 &&
        (l.vipOnly ?? false) === vipOnly,
    );

    if (existing) {
      const alreadyIn = existing.players.find((p) => p.id === playerId);
      if (!alreadyIn) {
        existing.players.push({
          id: playerId,
          name: playerName,
          score: 0,
          hasAnswered: false,
        });
        this.riddleLobbies.set(existing.id, existing);
      }
      return existing;
    }

    const lobby: RiddleLobby = {
      id: randomUUID(),
      players: [
        { id: playerId, name: playerName, score: 0, hasAnswered: false },
      ],
      hostId: playerId,
      status: "waiting",
      minPlayers: 2,
      vipOnly,
    };
    this.riddleLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getRiddleLobby(id: string): RiddleLobby | undefined {
    return this.riddleLobbies.get(id);
  }

  getRiddleLobbyByPlayerId(playerId: string): RiddleLobby | undefined {
    return Array.from(this.riddleLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId),
    );
  }

  addPlayerToRiddleLobby(
    lobbyId: string,
    playerId: string,
    playerName: string,
  ): RiddleLobby | undefined {
    const lobby = this.riddleLobbies.get(lobbyId);
    if (lobby && lobby.status === "waiting") {
      if (!lobby.players.find((p) => p.id === playerId)) {
        lobby.players.push({
          id: playerId,
          name: playerName,
          score: 0,
          hasAnswered: false,
        });
        this.riddleLobbies.set(lobbyId, lobby);
      }
      return lobby;
    }
    return undefined;
  }

  removePlayerFromRiddleLobby(lobbyId: string, playerId: string): void {
    const lobby = this.riddleLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.riddleLobbies.delete(lobbyId);
      } else {
        if (lobby.hostId === playerId) {
          lobby.hostId = lobby.players[0].id;
        }
        this.riddleLobbies.set(lobbyId, lobby);
      }
    }
  }

  updateRiddleLobbyStatus(id: string, status: RiddleLobby["status"]): void {
    const lobby = this.riddleLobbies.get(id);
    if (lobby) {
      lobby.status = status;
      this.riddleLobbies.set(id, lobby);
    }
  }

  createRiddleGame(lobby: RiddleLobby): RiddleGame {
    const shuffledRiddles = [...RIDDLES]
      .sort(() => Math.random() - 0.5)
      .slice(0, 5);

    const game: RiddleGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p) => ({
        ...p,
        score: 0,
        hasAnswered: false,
        totalTime: 0,
      })),
      currentRiddle: shuffledRiddles[0],
      riddleIndex: 0,
      totalRiddles: shuffledRiddles.length,
      status: "question",
      roundStartTime: Date.now(),
      correctAnswers: [],
    };

    (game as any)._riddles = shuffledRiddles;

    this.riddleGames.set(game.id, game);
    this.riddleLobbies.delete(lobby.id);
    return game;
  }

  getRiddleGame(id: string): RiddleGame | undefined {
    return this.riddleGames.get(id);
  }

  getRiddleGameByPlayerId(playerId: string): RiddleGame | undefined {
    return Array.from(this.riddleGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId),
    );
  }

  updateRiddleGame(
    id: string,
    updates: Partial<RiddleGame>,
  ): RiddleGame | undefined {
    const game = this.riddleGames.get(id);
    if (game) {
      const updated = { ...game, ...updates };
      this.riddleGames.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteRiddleGame(id: string): void {
    this.riddleGames.delete(id);
  }

  createWSGame(
    player1Id: string,
    player1Name: string,
    player2Id: string,
    player2Name: string,
  ): WordScrambleGame {
    const word = WORDS[Math.floor(Math.random() * WORDS.length)];
    const game: WordScrambleGame = {
      id: randomUUID(),
      player1Id,
      player1Name,
      player2Id,
      player2Name,
      originalWord: word,
      scrambledWord: scrambleWord(word),
      player1Answer: null,
      player2Answer: null,
      player1Time: null,
      player2Time: null,
      roundWinner: null,
      player1Score: 0,
      player2Score: 0,
      round: 1,
      roundStartTime: Date.now(),
      status: "playing",
      spectators: [],
    };
    this.wsGames.set(game.id, game);
    return game;
  }

  getAllWSGames(): WordScrambleGame[] {
    return Array.from(this.wsGames.values());
  }

  addSpectatorToWSGame(
    gameId: string,
    spectatorId: string,
    spectatorName: string,
  ): WordScrambleGame | undefined {
    const game = this.wsGames.get(gameId);
    if (game) {
      if (!game.spectators) game.spectators = [];
      const alreadySpectating = game.spectators.find(
        (s) => s.id === spectatorId,
      );
      if (!alreadySpectating) {
        game.spectators.push({ id: spectatorId, name: spectatorName });
        this.wsGames.set(gameId, game);
      }
      return game;
    }
    return undefined;
  }

  removeSpectatorFromWSGame(
    gameId: string,
    spectatorId: string,
  ): WordScrambleGame | undefined {
    const game = this.wsGames.get(gameId);
    if (game && game.spectators) {
      game.spectators = game.spectators.filter((s) => s.id !== spectatorId);
      this.wsGames.set(gameId, game);
      return game;
    }
    return undefined;
  }

  getWSGame(id: string): WordScrambleGame | undefined {
    return this.wsGames.get(id);
  }

  getWSGameByPlayerId(playerId: string): WordScrambleGame | undefined {
    return Array.from(this.wsGames.values()).find(
      (g) => g.player1Id === playerId || g.player2Id === playerId,
    );
  }

  updateWSGame(
    id: string,
    updates: Partial<WordScrambleGame>,
  ): WordScrambleGame | undefined {
    const game = this.wsGames.get(id);
    if (game) {
      const updated = { ...game, ...updates };
      this.wsGames.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteWSGame(id: string): void {
    this.wsGames.delete(id);
  }

  createNGGame(
    player1Id: string,
    player1Name: string,
    player2Id: string,
    player2Name: string,
  ): NumberGuessGame {
    const game: NumberGuessGame = {
      id: randomUUID(),
      player1Id,
      player1Name,
      player2Id,
      player2Name,
      targetNumber: Math.floor(Math.random() * 100) + 1,
      player1Guesses: [],
      player2Guesses: [],
      winner: null,
      player1Score: 0,
      player2Score: 0,
      round: 1,
      status: "playing",
      spectators: [],
    };
    this.ngGames.set(game.id, game);
    return game;
  }

  getAllNGGames(): NumberGuessGame[] {
    return Array.from(this.ngGames.values());
  }

  addSpectatorToNGGame(
    gameId: string,
    spectatorId: string,
    spectatorName: string,
  ): NumberGuessGame | undefined {
    const game = this.ngGames.get(gameId);
    if (game) {
      if (!game.spectators) game.spectators = [];
      const alreadySpectating = game.spectators.find(
        (s) => s.id === spectatorId,
      );
      if (!alreadySpectating) {
        game.spectators.push({ id: spectatorId, name: spectatorName });
        this.ngGames.set(gameId, game);
      }
      return game;
    }
    return undefined;
  }

  removeSpectatorFromNGGame(
    gameId: string,
    spectatorId: string,
  ): NumberGuessGame | undefined {
    const game = this.ngGames.get(gameId);
    if (game && game.spectators) {
      game.spectators = game.spectators.filter((s) => s.id !== spectatorId);
      this.ngGames.set(gameId, game);
      return game;
    }
    return undefined;
  }

  getNGGame(id: string): NumberGuessGame | undefined {
    return this.ngGames.get(id);
  }

  getNGGameByPlayerId(playerId: string): NumberGuessGame | undefined {
    return Array.from(this.ngGames.values()).find(
      (g) => g.player1Id === playerId || g.player2Id === playerId,
    );
  }

  updateNGGame(
    id: string,
    updates: Partial<NumberGuessGame>,
  ): NumberGuessGame | undefined {
    const game = this.ngGames.get(id);
    if (game) {
      const updated = { ...game, ...updates };
      this.ngGames.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteNGGame(id: string): void {
    this.ngGames.delete(id);
  }

  createQMGame(
    player1Id: string,
    player1Name: string,
    player2Id: string,
    player2Name: string,
  ): QuickMathGame {
    const { problem, answer } = generateMathProblem();
    const game: QuickMathGame = {
      id: randomUUID(),
      player1Id,
      player1Name,
      player2Id,
      player2Name,
      problem,
      answer,
      player1Answer: null,
      player2Answer: null,
      player1Time: null,
      player2Time: null,
      roundWinner: null,
      player1Score: 0,
      player2Score: 0,
      round: 1,
      roundStartTime: Date.now(),
      status: "playing",
      spectators: [],
    };
    this.qmGames.set(game.id, game);
    return game;
  }

  getAllQMGames(): QuickMathGame[] {
    return Array.from(this.qmGames.values());
  }

  addSpectatorToQMGame(
    gameId: string,
    spectatorId: string,
    spectatorName: string,
  ): QuickMathGame | undefined {
    const game = this.qmGames.get(gameId);
    if (game) {
      if (!game.spectators) game.spectators = [];
      const alreadySpectating = game.spectators.find(
        (s) => s.id === spectatorId,
      );
      if (!alreadySpectating) {
        game.spectators.push({ id: spectatorId, name: spectatorName });
        this.qmGames.set(gameId, game);
      }
      return game;
    }
    return undefined;
  }

  removeSpectatorFromQMGame(
    gameId: string,
    spectatorId: string,
  ): QuickMathGame | undefined {
    const game = this.qmGames.get(gameId);
    if (game && game.spectators) {
      game.spectators = game.spectators.filter((s) => s.id !== spectatorId);
      this.qmGames.set(gameId, game);
      return game;
    }
    return undefined;
  }

  getQMGame(id: string): QuickMathGame | undefined {
    return this.qmGames.get(id);
  }

  getQMGameByPlayerId(playerId: string): QuickMathGame | undefined {
    return Array.from(this.qmGames.values()).find(
      (g) => g.player1Id === playerId || g.player2Id === playerId,
    );
  }

  updateQMGame(
    id: string,
    updates: Partial<QuickMathGame>,
  ): QuickMathGame | undefined {
    const game = this.qmGames.get(id);
    if (game) {
      const updated = { ...game, ...updates };
      this.qmGames.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteQMGame(id: string): void {
    this.qmGames.delete(id);
  }

  newWSRound(id: string): WordScrambleGame | undefined {
    const game = this.wsGames.get(id);
    if (game) {
      const word = WORDS[Math.floor(Math.random() * WORDS.length)];
      return this.updateWSGame(id, {
        originalWord: word,
        scrambledWord: scrambleWord(word),
        player1Answer: null,
        player2Answer: null,
        player1Time: null,
        player2Time: null,
        roundWinner: null,
        round: game.round + 1,
        roundStartTime: Date.now(),
        status: "playing",
      });
    }
    return undefined;
  }

  newNGRound(id: string): NumberGuessGame | undefined {
    const game = this.ngGames.get(id);
    if (game) {
      return this.updateNGGame(id, {
        targetNumber: Math.floor(Math.random() * 100) + 1,
        player1Guesses: [],
        player2Guesses: [],
        winner: null,
        round: game.round + 1,
        status: "playing",
      });
    }
    return undefined;
  }

  newQMRound(id: string): QuickMathGame | undefined {
    const game = this.qmGames.get(id);
    if (game) {
      const { problem, answer } = generateMathProblem();
      return this.updateQMGame(id, {
        problem,
        answer,
        player1Answer: null,
        player2Answer: null,
        player1Time: null,
        player2Time: null,
        roundWinner: null,
        round: game.round + 1,
        roundStartTime: Date.now(),
        status: "playing",
      });
    }
    return undefined;
  }

  createC4Game(
    player1Id: string,
    player1Name: string,
    player2Id: string,
    player2Name: string,
  ): ConnectFourGame {
    const game: ConnectFourGame = {
      id: randomUUID(),
      player1Id,
      player1Name,
      player2Id,
      player2Name,
      board: Array(6)
        .fill(null)
        .map(() => Array(7).fill(null)),
      currentTurn: player1Id,
      winner: null,
      winningCells: [],
      isDraw: false,
      status: "playing",
      player1Score: 0,
      player2Score: 0,
      spectators: [],
    };
    this.c4Games.set(game.id, game);
    return game;
  }

  getAllC4Games(): ConnectFourGame[] {
    return Array.from(this.c4Games.values());
  }

  addSpectatorToC4Game(
    gameId: string,
    spectatorId: string,
    spectatorName: string,
  ): ConnectFourGame | undefined {
    const game = this.c4Games.get(gameId);
    if (game) {
      if (!game.spectators) game.spectators = [];
      const alreadySpectating = game.spectators.find(
        (s) => s.id === spectatorId,
      );
      if (!alreadySpectating) {
        game.spectators.push({ id: spectatorId, name: spectatorName });
        this.c4Games.set(gameId, game);
      }
      return game;
    }
    return undefined;
  }

  removeSpectatorFromC4Game(
    gameId: string,
    spectatorId: string,
  ): ConnectFourGame | undefined {
    const game = this.c4Games.get(gameId);
    if (game && game.spectators) {
      game.spectators = game.spectators.filter((s) => s.id !== spectatorId);
      this.c4Games.set(gameId, game);
      return game;
    }
    return undefined;
  }

  getC4Game(id: string): ConnectFourGame | undefined {
    return this.c4Games.get(id);
  }

  getC4GameByPlayerId(playerId: string): ConnectFourGame | undefined {
    return Array.from(this.c4Games.values()).find(
      (g) => g.player1Id === playerId || g.player2Id === playerId,
    );
  }

  getC4GameBySpectatorId(spectatorId: string): ConnectFourGame | undefined {
    return Array.from(this.c4Games.values()).find((g) =>
      g.spectators?.some((s) => s.id === spectatorId),
    );
  }

  updateC4Game(
    id: string,
    updates: Partial<ConnectFourGame>,
  ): ConnectFourGame | undefined {
    const game = this.c4Games.get(id);
    if (game) {
      const updated = { ...game, ...updates };
      this.c4Games.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteC4Game(id: string): void {
    this.c4Games.delete(id);
  }

  getOrCreateMemoryLobby(
    playerId: string,
    playerName: string,
  ): MemoryMatchLobby {
    const existing = Array.from(this.memoryLobbies.values()).find(
      (l) => l.status === "waiting" && l.players.length < 4,
    );

    if (existing) {
      const alreadyIn = existing.players.find((p) => p.id === playerId);
      if (!alreadyIn) {
        existing.players.push({
          id: playerId,
          name: playerName,
          score: 0,
          pairs: 0,
        });
        this.memoryLobbies.set(existing.id, existing);
      }
      return existing;
    }

    const lobby: MemoryMatchLobby = {
      id: randomUUID(),
      players: [{ id: playerId, name: playerName, score: 0, pairs: 0 }],
      hostId: playerId,
      status: "waiting",
      minPlayers: 2,
    };
    this.memoryLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getMemoryLobby(id: string): MemoryMatchLobby | undefined {
    return this.memoryLobbies.get(id);
  }

  getMemoryLobbyByPlayerId(playerId: string): MemoryMatchLobby | undefined {
    return Array.from(this.memoryLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId),
    );
  }

  removePlayerFromMemoryLobby(lobbyId: string, playerId: string): void {
    const lobby = this.memoryLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.memoryLobbies.delete(lobbyId);
      } else {
        if (lobby.hostId === playerId) {
          lobby.hostId = lobby.players[0].id;
        }
        this.memoryLobbies.set(lobbyId, lobby);
      }
    }
  }

  createMemoryGame(lobby: MemoryMatchLobby): MemoryMatchGame {
    const symbols = [
      "star",
      "heart",
      "moon",
      "sun",
      "bolt",
      "gem",
      "flame",
      "leaf",
    ];
    const pairs = symbols.slice(0, 8);
    const cards = [...pairs, ...pairs]
      .sort(() => Math.random() - 0.5)
      .map((symbol, index) => ({
        id: index,
        symbol,
        isFlipped: false,
        isMatched: false,
      }));

    const game: MemoryMatchGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p) => ({
        ...p,
        score: 0,
        pairs: 0,
      })),
      cards,
      currentTurn: lobby.players[0].id,
      flippedCards: [],
      status: "playing",
      totalPairs: 8,
      matchedPairs: 0,
      spectators: [],
    };

    this.memoryGames.set(game.id, game);
    this.memoryLobbies.delete(lobby.id);
    return game;
  }

  getAllMemoryGames(): MemoryMatchGame[] {
    return Array.from(this.memoryGames.values());
  }

  addSpectatorToMemoryGame(
    gameId: string,
    spectatorId: string,
    spectatorName: string,
  ): MemoryMatchGame | undefined {
    const game = this.memoryGames.get(gameId);
    if (game) {
      if (!game.spectators) game.spectators = [];
      const alreadySpectating = game.spectators.find(
        (s) => s.id === spectatorId,
      );
      if (!alreadySpectating) {
        game.spectators.push({ id: spectatorId, name: spectatorName });
        this.memoryGames.set(gameId, game);
      }
      return game;
    }
    return undefined;
  }

  removeSpectatorFromMemoryGame(
    gameId: string,
    spectatorId: string,
  ): MemoryMatchGame | undefined {
    const game = this.memoryGames.get(gameId);
    if (game && game.spectators) {
      game.spectators = game.spectators.filter((s) => s.id !== spectatorId);
      this.memoryGames.set(gameId, game);
      return game;
    }
    return undefined;
  }

  getMemoryGame(id: string): MemoryMatchGame | undefined {
    return this.memoryGames.get(id);
  }

  getMemoryGameByPlayerId(playerId: string): MemoryMatchGame | undefined {
    return Array.from(this.memoryGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId),
    );
  }

  updateMemoryGame(
    id: string,
    updates: Partial<MemoryMatchGame>,
  ): MemoryMatchGame | undefined {
    const game = this.memoryGames.get(id);
    if (game) {
      const updated = { ...game, ...updates };
      this.memoryGames.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteMemoryGame(id: string): void {
    this.memoryGames.delete(id);
  }

  getOrCreateTypingLobby(
    playerId: string,
    playerName: string,
  ): TypingRaceLobby {
    const existing = Array.from(this.typingLobbies.values()).find(
      (l) => l.status === "waiting" && l.players.length < 6,
    );

    if (existing) {
      const alreadyIn = existing.players.find((p) => p.id === playerId);
      if (!alreadyIn) {
        existing.players.push({
          id: playerId,
          name: playerName,
          progress: 0,
          wpm: 0,
          finished: false,
          finishTime: null,
        });
        this.typingLobbies.set(existing.id, existing);
      }
      return existing;
    }

    const lobby: TypingRaceLobby = {
      id: randomUUID(),
      players: [
        {
          id: playerId,
          name: playerName,
          progress: 0,
          wpm: 0,
          finished: false,
          finishTime: null,
        },
      ],
      hostId: playerId,
      status: "waiting",
      minPlayers: 2,
    };
    this.typingLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getTypingLobby(id: string): TypingRaceLobby | undefined {
    return this.typingLobbies.get(id);
  }

  getTypingLobbyByPlayerId(playerId: string): TypingRaceLobby | undefined {
    return Array.from(this.typingLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId),
    );
  }

  removePlayerFromTypingLobby(lobbyId: string, playerId: string): void {
    const lobby = this.typingLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.typingLobbies.delete(lobbyId);
      } else {
        if (lobby.hostId === playerId) {
          lobby.hostId = lobby.players[0].id;
        }
        this.typingLobbies.set(lobbyId, lobby);
      }
    }
  }

  createTypingGame(lobby: TypingRaceLobby): TypingRaceGame {
    const texts = [
      "The quick brown fox jumps over the lazy dog near the riverbank.",
      "Programming is the art of telling a computer what to do step by step.",
      "Practice makes perfect when learning to type faster and more accurately.",
      "Speed and accuracy are both important when competing in a typing race.",
      "The best way to improve typing is consistent daily practice sessions.",
    ];
    const text = texts[Math.floor(Math.random() * texts.length)];

    const game: TypingRaceGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p) => ({
        ...p,
        progress: 0,
        wpm: 0,
        finished: false,
        finishTime: null,
      })),
      text,
      startTime: Date.now() + 3000,
      status: "countdown",
      winner: null,
    };

    this.typingGames.set(game.id, game);
    this.typingLobbies.delete(lobby.id);
    return game;
  }

  getTypingGame(id: string): TypingRaceGame | undefined {
    return this.typingGames.get(id);
  }

  getTypingGameByPlayerId(playerId: string): TypingRaceGame | undefined {
    return Array.from(this.typingGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId),
    );
  }

  updateTypingGame(
    id: string,
    updates: Partial<TypingRaceGame>,
  ): TypingRaceGame | undefined {
    const game = this.typingGames.get(id);
    if (game) {
      const updated = { ...game, ...updates };
      this.typingGames.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteTypingGame(id: string): void {
    this.typingGames.delete(id);
  }

  addGameLog(
    gameType: string,
    winnerName: string,
    loserName: string,
    isDraw: boolean = false,
  ): GameLog {
    const log: GameLog = {
      id: randomUUID(),
      gameType,
      winnerName,
      loserName,
      timestamp: Date.now(),
      isDraw,
    };
    this.gameLogs.unshift(log);
    if (this.gameLogs.length > 50) {
      this.gameLogs = this.gameLogs.slice(0, 50);
    }
    appendToGameLogFile(gameType, winnerName, loserName, isDraw);
    return log;
  }

  getGameLogs(): GameLog[] {
    return this.gameLogs;
  }

  getOrCreateWerewolfLobby(
    playerId: string,
    playerName: string,
    vipOnly = false,
  ): WerewolfLobby {
    const existingLobby = this.getWerewolfLobbyByPlayerId(playerId);
    if (existingLobby) return existingLobby;

    const waitingLobby = Array.from(this.werewolfLobbies.values()).find(
      (l) =>
        l.status === "waiting" &&
        l.players.length < l.maxPlayers &&
        (l.vipOnly ?? false) === vipOnly,
    );

    if (waitingLobby) {
      waitingLobby.players.push({ id: playerId, name: playerName });
      this.werewolfLobbies.set(waitingLobby.id, waitingLobby);
      return waitingLobby;
    }

    const lobby: WerewolfLobby = {
      id: randomUUID(),
      players: [{ id: playerId, name: playerName }],
      hostId: playerId,
      status: "waiting",
      minPlayers: 5,
      maxPlayers: 20,
      enableSeer: true,
      enableDoctor: true,
      vipOnly,
    };
    this.werewolfLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getWerewolfLobby(id: string): WerewolfLobby | undefined {
    return this.werewolfLobbies.get(id);
  }

  getWerewolfLobbyByPlayerId(playerId: string): WerewolfLobby | undefined {
    return Array.from(this.werewolfLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId),
    );
  }

  addPlayerToWerewolfLobby(
    lobbyId: string,
    playerId: string,
    playerName: string,
  ): WerewolfLobby | undefined {
    const lobby = this.werewolfLobbies.get(lobbyId);
    if (lobby && lobby.players.length < lobby.maxPlayers) {
      lobby.players.push({ id: playerId, name: playerName });
      this.werewolfLobbies.set(lobbyId, lobby);
      return lobby;
    }
    return undefined;
  }

  removePlayerFromWerewolfLobby(lobbyId: string, playerId: string): void {
    const lobby = this.werewolfLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.werewolfLobbies.delete(lobbyId);
      } else {
        if (lobby.hostId === playerId) {
          lobby.hostId = lobby.players[0].id;
        }
        this.werewolfLobbies.set(lobbyId, lobby);
      }
    }
  }

  updateWerewolfLobbySettings(
    id: string,
    enableSeer: boolean,
    enableDoctor: boolean,
  ): WerewolfLobby | undefined {
    const lobby = this.werewolfLobbies.get(id);
    if (lobby) {
      lobby.enableSeer = enableSeer;
      lobby.enableDoctor = enableDoctor;
      this.werewolfLobbies.set(id, lobby);
      return lobby;
    }
    return undefined;
  }

  updateWerewolfLobbyStatus(id: string, status: WerewolfLobby["status"]): void {
    const lobby = this.werewolfLobbies.get(id);
    if (lobby) {
      lobby.status = status;
      this.werewolfLobbies.set(id, lobby);
    }
  }

  deleteWerewolfLobby(id: string): void {
    this.werewolfLobbies.delete(id);
  }

  createWerewolfGame(lobby: WerewolfLobby): WerewolfGame {
    const playerCount = lobby.players.length;
    const werewolfCount = Math.max(1, Math.floor(playerCount / 4));

    const roles: WerewolfRole[] = [];
    for (let i = 0; i < werewolfCount; i++) {
      roles.push("werewolf");
    }
    if (lobby.enableSeer && playerCount >= 6) {
      roles.push("seer");
    }
    if (lobby.enableDoctor && playerCount >= 7) {
      roles.push("doctor");
    }
    while (roles.length < playerCount) {
      roles.push("villager");
    }

    for (let i = roles.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [roles[i], roles[j]] = [roles[j], roles[i]];
    }

    const players: WerewolfPlayer[] = lobby.players.map((p, idx) => ({
      id: p.id,
      name: p.name,
      role: roles[idx],
      isAlive: true,
      votes: 0,
    }));

    const hasSeer = players.some((p) => p.role === "seer");
    const hasDoctor = players.some((p) => p.role === "doctor");

    const game: WerewolfGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players,
      phase: "night",
      phaseEndTime: Date.now() + 45000,
      day: 1,
      werewolfTarget: null,
      doctorProtect: null,
      seerInspect: null,
      seerResult: null,
      votes: {},
      eliminatedTonight: null,
      lastNightVictim: null,
      lastVoteResult: null,
      lastVoteSuspect: null,
      winner: null,
      status: "playing",
      actionsSubmitted: {
        werewolves: false,
        doctor: !hasDoctor,
        seer: !hasSeer,
      },
    };

    this.werewolfGames.set(game.id, game);
    this.werewolfLobbies.delete(lobby.id);
    return game;
  }

  getWerewolfGame(id: string): WerewolfGame | undefined {
    return this.werewolfGames.get(id);
  }

  getWerewolfGameByPlayerId(playerId: string): WerewolfGame | undefined {
    return Array.from(this.werewolfGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId),
    );
  }

  updateWerewolfGame(
    id: string,
    updates: Partial<WerewolfGame>,
  ): WerewolfGame | undefined {
    const game = this.werewolfGames.get(id);
    if (game) {
      const updated = { ...game, ...updates };
      this.werewolfGames.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteWerewolfGame(id: string): void {
    this.werewolfGames.delete(id);
  }

  removePlayerFromWerewolfGame(
    gameId: string,
    playerId: string,
  ): WerewolfGame | undefined {
    const game = this.werewolfGames.get(gameId);
    if (!game) return undefined;

    // Remove the player from the list
    game.players = game.players.filter((p) => p.id !== playerId);

    // If no players left, delete the game
    if (game.players.length === 0) {
      this.werewolfGames.delete(gameId);
      return undefined;
    }

    // Check win conditions
    const alivePlayers = game.players.filter((p) => p.isAlive);
    const aliveWolves = alivePlayers.filter((p) => p.role === "werewolf");
    const aliveVillagers = alivePlayers.filter((p) => p.role !== "werewolf");

    if (aliveWolves.length === 0) {
      // All werewolves are gone (dead or left)
      game.status = "finished";
      game.winner = "villagers";
    } else if (aliveWolves.length >= aliveVillagers.length) {
      // Werewolves overpower villagers
      game.status = "finished";
      game.winner = "werewolves";
    }

    this.werewolfGames.set(gameId, game);
    return game;
  }

  getOrCreateSpyHuntLobby(playerId: string, playerName: string): SpyHuntLobby {
    const existingLobby = this.getSpyHuntLobbyByPlayerId(playerId);
    if (existingLobby) return existingLobby;

    const waitingLobby = Array.from(this.spyHuntLobbies.values()).find(
      (l) => l.status === "waiting" && l.players.length < l.maxPlayers,
    );

    if (waitingLobby) {
      waitingLobby.players.push({ id: playerId, name: playerName });
      this.spyHuntLobbies.set(waitingLobby.id, waitingLobby);
      return waitingLobby;
    }

    const lobby: SpyHuntLobby = {
      id: randomUUID(),
      players: [{ id: playerId, name: playerName }],
      hostId: playerId,
      status: "waiting",
      minPlayers: 4,
      maxPlayers: 12,
    };
    this.spyHuntLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getSpyHuntLobby(id: string): SpyHuntLobby | undefined {
    return this.spyHuntLobbies.get(id);
  }

  getSpyHuntLobbyByPlayerId(playerId: string): SpyHuntLobby | undefined {
    return Array.from(this.spyHuntLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId),
    );
  }

  addPlayerToSpyHuntLobby(
    lobbyId: string,
    playerId: string,
    playerName: string,
  ): SpyHuntLobby | undefined {
    const lobby = this.spyHuntLobbies.get(lobbyId);
    if (lobby && lobby.players.length < lobby.maxPlayers) {
      lobby.players.push({ id: playerId, name: playerName });
      this.spyHuntLobbies.set(lobbyId, lobby);
      return lobby;
    }
    return undefined;
  }

  removePlayerFromSpyHuntLobby(lobbyId: string, playerId: string): void {
    const lobby = this.spyHuntLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.spyHuntLobbies.delete(lobbyId);
      } else {
        if (lobby.hostId === playerId) {
          lobby.hostId = lobby.players[0].id;
        }
        this.spyHuntLobbies.set(lobbyId, lobby);
      }
    }
  }

  updateSpyHuntLobbyStatus(id: string, status: SpyHuntLobby["status"]): void {
    const lobby = this.spyHuntLobbies.get(id);
    if (lobby) {
      lobby.status = status;
      this.spyHuntLobbies.set(id, lobby);
    }
  }

  deleteSpyHuntLobby(id: string): void {
    this.spyHuntLobbies.delete(id);
  }

  createSpyHuntGame(lobby: SpyHuntLobby): SpyHuntGame {
    const locations = [
      "Airport",
      "Bank",
      "Beach",
      "Casino",
      "Church",
      "Circus",
      "Hospital",
      "Hotel",
      "Library",
      "Movie Theater",
      "Museum",
      "Police Station",
      "Restaurant",
      "School",
      "Space Station",
      "Submarine",
      "Supermarket",
      "Train Station",
      "University",
      "Zoo",
      "Bakery",
      "Gym",
      "Prison",
      "Theater",
      "Amusement Park",
      "Art Gallery",
      "Brewery",
      "Farm",
    ];

    const location = locations[Math.floor(Math.random() * locations.length)];
    const spyIndex = Math.floor(Math.random() * lobby.players.length);
    const spyId = lobby.players[spyIndex].id;
    const firstPlayerId =
      lobby.players[Math.floor(Math.random() * lobby.players.length)].id;

    const game: SpyHuntGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p) => ({
        id: p.id,
        name: p.name,
        hasVoted: false,
      })),
      spyId,
      location,
      currentTurn: firstPlayerId,
      questionHistory: [],
      votes: {},
      votingActive: false,
      accuserId: null,
      accusedId: null,
      roundTimer: Date.now() + 300000,
      status: "questioning",
      winner: null,
      winReason: null,
    };

    this.spyHuntGames.set(game.id, game);
    this.spyHuntLobbies.delete(lobby.id);
    return game;
  }

  getSpyHuntGame(id: string): SpyHuntGame | undefined {
    return this.spyHuntGames.get(id);
  }

  getSpyHuntGameByPlayerId(playerId: string): SpyHuntGame | undefined {
    return Array.from(this.spyHuntGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId),
    );
  }

  updateSpyHuntGame(
    id: string,
    updates: Partial<SpyHuntGame>,
  ): SpyHuntGame | undefined {
    const game = this.spyHuntGames.get(id);
    if (game) {
      const updated = { ...game, ...updates };
      this.spyHuntGames.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteSpyHuntGame(id: string): void {
    this.spyHuntGames.delete(id);
  }

  // FPS Game Methods
  private generateGameCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  createFpsGame(
    hostId: string,
    hostName: string,
    mode: FpsGameMode,
    timeLimit: number,
  ): FpsGame {
    const clampedTime = Math.min(10, Math.max(2, timeLimit));
    const hostPlayer: FpsPlayer = {
      id: hostId,
      name: hostName,
      team: mode === "team" ? "A" : undefined,
      gun: "ak47",
      kills: 0,
      deaths: 0,
      position: { x: 0, y: 1, z: 0 },
      rotation: { x: 0, y: 0 },
      health: 100,
      isAlive: true,
    };

    const game: FpsGame = {
      id: randomUUID(),
      code: this.generateGameCode(),
      hostId,
      mode,
      status: "lobby",
      players: [hostPlayer],
      teamAScore: 0,
      teamBScore: 0,
      timeLimit: clampedTime,
    };

    this.fpsGames.set(game.id, game);
    return game;
  }

  getFpsGame(id: string): FpsGame | undefined {
    return this.fpsGames.get(id);
  }

  getFpsGameByCode(code: string): FpsGame | undefined {
    return Array.from(this.fpsGames.values()).find(
      (g) =>
        g.code.toUpperCase() === code.toUpperCase() && g.status === "lobby",
    );
  }

  getFpsGameByPlayerId(playerId: string): FpsGame | undefined {
    return Array.from(this.fpsGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId),
    );
  }

  joinFpsGame(
    gameId: string,
    playerId: string,
    playerName: string,
    team?: "A" | "B",
  ): FpsGame | undefined {
    const game = this.fpsGames.get(gameId);
    if (!game || game.status !== "lobby") return undefined;
    if (game.players.some((p) => p.id === playerId)) return game;

    let assignedTeam: "A" | "B" | undefined = undefined;
    if (game.mode === "team") {
      const teamACount = game.players.filter((p) => p.team === "A").length;
      const teamBCount = game.players.filter((p) => p.team === "B").length;
      if (team) {
        assignedTeam = team;
      } else {
        assignedTeam = teamACount <= teamBCount ? "A" : "B";
      }
    }

    const player = this.getPlayer(playerId);
    if (!player) return undefined; // Should not happen in practice, but good for type safety

    const newPlayer: FpsPlayer = {
      id: playerId,
      name: playerName,
      team: assignedTeam,
      gun: "ak47",
      kills: 0,
      deaths: 0,
      position: { x: 0, y: 3.0, z: 0 }, // Spawn higher to let gravity settle player
      rotation: { x: 0, y: 0 },
      health: 100,
      isAlive: true,
    };

    game.players.push(newPlayer);
    this.fpsGames.set(gameId, game);
    return game;
  }

  leaveFpsGame(gameId: string, playerId: string): FpsGame | undefined {
    const game = this.fpsGames.get(gameId);
    if (!game) return undefined;

    game.players = game.players.filter((p) => p.id !== playerId);

    if (game.players.length === 0) {
      this.fpsGames.delete(gameId);
      return undefined;
    }

    if (game.hostId === playerId) {
      game.hostId = game.players[0].id;
    }

    this.fpsGames.set(gameId, game);
    return game;
  }

  startFpsGame(gameId: string): FpsGame | undefined {
    const game = this.fpsGames.get(gameId);
    if (!game || game.status !== "lobby") return undefined;

    if (game.mode === "team") {
      const teamA = game.players.filter((p) => p.team === "A");
      const teamB = game.players.filter((p) => p.team === "B");
      if (teamA.length < 1 || teamB.length < 1) return undefined;
    } else {
      if (game.players.length < 2) return undefined;
    }

    game.status = "playing";
    game.startTime = Date.now();
    game.endTime = Date.now() + game.timeLimit * 60 * 1000;

    const spawnPoints = [
      { x: -10, y: 1, z: -10 },
      { x: 10, y: 1, z: -10 },
      { x: -10, y: 1, z: 10 },
      { x: 10, y: 1, z: 10 },
      { x: 0, y: 1, z: -15 },
      { x: 0, y: 1, z: 15 },
      { x: -15, y: 1, z: 0 },
      { x: 15, y: 1, z: 0 },
    ];

    game.players.forEach((player, index) => {
      const spawn = spawnPoints[index % spawnPoints.length];
      player.position = { ...spawn };
      player.health = 100;
      player.isAlive = true;
    });

    this.fpsGames.set(gameId, game);
    return game;
  }

  updateFpsPlayerPosition(
    gameId: string,
    playerId: string,
    position: { x: number; y: number; z: number },
    rotation: { x: number; y: number },
  ): FpsGame | undefined {
    const game = this.fpsGames.get(gameId);
    if (!game || game.status !== "playing") return undefined;

    const player = game.players.find((p) => p.id === playerId);
    if (!player || !player.isAlive) return undefined;

    player.position = position;
    player.rotation = rotation;
    this.fpsGames.set(gameId, game);
    return game;
  }

  fpsPlayerShoot(
    gameId: string,
    shooterId: string,
    targetId: string,
  ): { hit: boolean; killed: boolean; game: FpsGame } | undefined {
    const game = this.fpsGames.get(gameId);
    if (!game || game.status !== "playing") return undefined;

    const shooter = game.players.find((p) => p.id === shooterId);
    const target = game.players.find((p) => p.id === targetId);
    if (!shooter || !target || !shooter.isAlive || !target.isAlive)
      return undefined;

    if (game.mode === "team" && shooter.team === target.team) {
      return { hit: false, killed: false, game };
    }

    let damage = 0;
    switch (shooter.gun) {
      case "sniper":
        damage = 100;
        break;
      case "ak47":
        damage = 25;
        break;
      case "rpg":
        damage = 75;
        break;
    }

    target.health -= damage;
    const killed = target.health <= 0;

    if (killed) {
      target.health = 0;
      target.isAlive = false;
      target.deaths++;
      shooter.kills++;

      if (game.mode === "team") {
        if (shooter.team === "A") {
          game.teamAScore++;
        } else if (shooter.team === "B") {
          game.teamBScore++;
        }
      }
    }

    this.fpsGames.set(gameId, game);
    return { hit: true, killed, game };
  }

  respawnFpsPlayer(
    gameId: string,
    playerId: string,
    gun: FpsGunType,
  ): FpsGame | undefined {
    const game = this.fpsGames.get(gameId);
    if (!game || game.status !== "playing") return undefined;

    const player = game.players.find((p) => p.id === playerId);
    if (!player) return undefined;

    const spawnPoints = [
      { x: -10, y: 3.0, z: -10 }, // Spawn higher to let gravity settle player
      { x: 10, y: 3.0, z: -10 }, // Spawn higher to let gravity settle player
      { x: -10, y: 3.0, z: 10 }, // Spawn higher to let gravity settle player
      { x: 10, y: 3.0, z: 10 }, // Spawn higher to let gravity settle player
    ];

    const randomSpawn =
      spawnPoints[Math.floor(Math.random() * spawnPoints.length)];

    player.position = { ...randomSpawn };
    player.rotation = { x: 0, y: 0 };
    player.health = 100;
    player.isAlive = true;
    player.gun = gun;

    this.fpsGames.set(gameId, game);
    return game;
  }

  changeFpsPlayerGun(
    gameId: string,
    playerId: string,
    gun: FpsGunType,
  ): FpsGame | undefined {
    const game = this.fpsGames.get(gameId);
    if (!game) return undefined;
    if (game.status === "finished") return undefined;

    const player = game.players.find((p) => p.id === playerId);
    if (!player) return undefined;

    player.gun = gun;
    this.fpsGames.set(gameId, game);
    return game;
  }

  endFpsGame(gameId: string): FpsGame | undefined {
    const game = this.fpsGames.get(gameId);
    if (!game) return undefined;

    game.status = "finished";
    game.endTime = Date.now();
    this.fpsGames.set(gameId, game);
    return game;
  }

  deleteFpsGame(id: string): void {
    this.fpsGames.delete(id);
  }

  getAllFpsGames(): FpsGame[] {
    return Array.from(this.fpsGames.values());
  }

  // Point on Point Methods
  getOrCreatePointOnPointLobby(
    playerId: string,
    playerName: string,
  ): PointOnPointLobby {
    const existingLobby = this.getPointOnPointLobbyByPlayerId(playerId);
    if (existingLobby) return existingLobby;

    const waitingLobby = Array.from(this.pointOnPointLobbies.values()).find(
      (l) => l.status === "waiting" && l.players.length < l.maxPlayers,
    );

    if (waitingLobby) {
      waitingLobby.players.push({ id: playerId, name: playerName });
      this.pointOnPointLobbies.set(waitingLobby.id, waitingLobby);
      return waitingLobby;
    }

    const lobby: PointOnPointLobby = {
      id: randomUUID(),
      players: [{ id: playerId, name: playerName }],
      hostId: playerId,
      status: "waiting",
      minPlayers: 2,
      maxPlayers: 6,
      showSentence: false,
    };

    this.pointOnPointLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getPointOnPointLobby(id: string): PointOnPointLobby | undefined {
    return this.pointOnPointLobbies.get(id);
  }

  getPointOnPointLobbyByPlayerId(
    playerId: string,
  ): PointOnPointLobby | undefined {
    return Array.from(this.pointOnPointLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId),
    );
  }

  addPlayerToPointOnPointLobby(
    lobbyId: string,
    playerId: string,
    playerName: string,
  ): PointOnPointLobby | undefined {
    const lobby = this.pointOnPointLobbies.get(lobbyId);
    if (lobby && lobby.players.length < lobby.maxPlayers) {
      const alreadyIn = lobby.players.find((p) => p.id === playerId);
      if (!alreadyIn) {
        lobby.players.push({ id: playerId, name: playerName });
        this.pointOnPointLobbies.set(lobbyId, lobby);
      }
      return lobby;
    }
    return undefined;
  }

  removePlayerFromPointOnPointLobby(lobbyId: string, playerId: string): void {
    const lobby = this.pointOnPointLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.pointOnPointLobbies.delete(lobbyId);
      } else {
        if (lobby.hostId === playerId) {
          lobby.hostId = lobby.players[0].id;
        }
        this.pointOnPointLobbies.set(lobbyId, lobby);
      }
    }
  }

  updatePointOnPointLobbyStatus(
    id: string,
    status: PointOnPointLobby["status"],
  ): void {
    const lobby = this.pointOnPointLobbies.get(id);
    if (lobby) {
      lobby.status = status;
      this.pointOnPointLobbies.set(id, lobby);
    }
  }

  deletePointOnPointLobby(id: string): void {
    this.pointOnPointLobbies.delete(id);
  }

  createPointOnPointGame(lobby: PointOnPointLobby): PointOnPointGame {
    const turnOrder = lobby.players.map((p) => p.id);
    const startingSentences = [
      "Once upon a time in a land far away...",
      "The mysterious package arrived at midnight...",
      "Nobody expected what happened next...",
      "In the heart of the ancient forest...",
      "The last message read simply...",
      "It all started with a single question...",
      "The clock struck thirteen...",
      "Behind the old bookshelf was...",
    ];
    const initialSentence =
      startingSentences[Math.floor(Math.random() * startingSentences.length)];

    const game: PointOnPointGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p) => ({ id: p.id, name: p.name })),
      hostId: lobby.hostId,
      sentences: [],
      currentTurn: turnOrder[0],
      turnOrder,
      currentRound: 1,
      initialSentence,
      status: "playing",
    };

    this.pointOnPointGames.set(game.id, game);
    this.pointOnPointLobbies.delete(lobby.id);
    return game;
  }

  getPointOnPointGame(id: string): PointOnPointGame | undefined {
    return this.pointOnPointGames.get(id);
  }

  getPointOnPointGameByPlayerId(
    playerId: string,
  ): PointOnPointGame | undefined {
    return Array.from(this.pointOnPointGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId),
    );
  }

  updatePointOnPointGame(
    id: string,
    updates: Partial<PointOnPointGame>,
  ): PointOnPointGame | undefined {
    const game = this.pointOnPointGames.get(id);
    if (game) {
      const updated = { ...game, ...updates };
      this.pointOnPointGames.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deletePointOnPointGame(id: string): void {
    this.pointOnPointGames.delete(id);
  }

  getAllPointOnPointLobbies(): PointOnPointLobby[] {
    return Array.from(this.pointOnPointLobbies.values());
  }

  getAllRiddleLobbies(): RiddleLobby[] {
    return Array.from(this.riddleLobbies.values());
  }

  getAllMemoryLobbies(): MemoryMatchLobby[] {
    return Array.from(this.memoryLobbies.values());
  }

  getAllTypingLobbies(): TypingRaceLobby[] {
    return Array.from(this.typingLobbies.values());
  }

  getAllWerewolfLobbies(): WerewolfLobby[] {
    return Array.from(this.werewolfLobbies.values());
  }

  getAllSpyHuntLobbies(): SpyHuntLobby[] {
    return Array.from(this.spyHuntLobbies.values());
  }

  // Outpost Rush Methods
  getOrCreateOutpostRushLobby(
    playerId: string,
    playerName: string,
  ): OutpostRushLobby {
    const existingLobby = this.getOutpostRushLobbyByPlayerId(playerId);
    if (existingLobby) return existingLobby;

    const waitingLobby = Array.from(this.outpostRushLobbies.values()).find(
      (l) => l.status === "waiting" && l.players.length < l.maxPlayers,
    );

    if (waitingLobby) {
      waitingLobby.players.push({ id: playerId, name: playerName, team: null });
      this.outpostRushLobbies.set(waitingLobby.id, waitingLobby);
      return waitingLobby;
    }

    const lobby: OutpostRushLobby = {
      id: randomUUID(),
      players: [{ id: playerId, name: playerName, team: null }],
      hostId: playerId,
      status: "waiting",
      minPlayers: 2,
      maxPlayers: 8,
    };

    this.outpostRushLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getOutpostRushLobby(id: string): OutpostRushLobby | undefined {
    return this.outpostRushLobbies.get(id);
  }

  getOutpostRushLobbyByPlayerId(
    playerId: string,
  ): OutpostRushLobby | undefined {
    return Array.from(this.outpostRushLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId),
    );
  }

  addPlayerToOutpostRushLobby(
    lobbyId: string,
    playerId: string,
    playerName: string,
  ): OutpostRushLobby | undefined {
    const lobby = this.outpostRushLobbies.get(lobbyId);
    if (lobby && lobby.players.length < lobby.maxPlayers) {
      const alreadyIn = lobby.players.find((p) => p.id === playerId);
      if (!alreadyIn) {
        lobby.players.push({ id: playerId, name: playerName, team: null });
        this.outpostRushLobbies.set(lobbyId, lobby);
      }
      return lobby;
    }
    return undefined;
  }

  removePlayerFromOutpostRushLobby(lobbyId: string, playerId: string): void {
    const lobby = this.outpostRushLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.outpostRushLobbies.delete(lobbyId);
      } else {
        if (lobby.hostId === playerId) {
          lobby.hostId = lobby.players[0].id;
        }
        this.outpostRushLobbies.set(lobbyId, lobby);
      }
    }
  }

  updateOutpostRushPlayerTeam(
    lobbyId: string,
    playerId: string,
    team: "alpha" | "beta",
  ): OutpostRushLobby | undefined {
    const lobby = this.outpostRushLobbies.get(lobbyId);
    if (lobby) {
      const player = lobby.players.find((p) => p.id === playerId);
      if (player) {
        player.team = team;
        this.outpostRushLobbies.set(lobbyId, lobby);
        return lobby;
      }
    }
    return undefined;
  }

  updateOutpostRushLobbyStatus(
    id: string,
    status: OutpostRushLobby["status"],
  ): void {
    const lobby = this.outpostRushLobbies.get(id);
    if (lobby) {
      lobby.status = status;
      this.outpostRushLobbies.set(id, lobby);
    }
  }

  deleteOutpostRushLobby(id: string): void {
    this.outpostRushLobbies.delete(id);
  }

  createOutpostRushGame(lobby: OutpostRushLobby): OutpostRushGame {
    const alphaPlayers = lobby.players.filter((p) => p.team === "alpha");
    const betaPlayers = lobby.players.filter((p) => p.team === "beta");
    const unassigned = lobby.players.filter((p) => !p.team);

    unassigned.forEach((p, i) => {
      if (alphaPlayers.length <= betaPlayers.length) {
        p.team = "alpha";
        alphaPlayers.push(p);
      } else {
        p.team = "beta";
        betaPlayers.push(p);
      }
    });

    const players: OutpostRushPlayer[] = lobby.players.map((p, i) => ({
      id: p.id,
      name: p.name,
      team: p.team || (i % 2 === 0 ? "alpha" : "beta"),
      x: p.team === "alpha" ? 600 : 11400,
      y: 2400 + ((i * 200) % 1200),
      health: 100,
      isAlive: true,
      resources: 50,
      weaponLevel: 1,
      kills: 0,
      deaths: 0,
    }));

    const outposts: Outpost[] = [
      {
        id: "outpost-1",
        name: "Alpha Base",
        x: 1500,
        y: 1500,
        owner: "neutral",
        captureProgress: 0,
        resourceRate: 10,
        storedResources: 0,
      },
      {
        id: "outpost-2",
        name: "Northern Fort",
        x: 4000,
        y: 1000,
        owner: "neutral",
        captureProgress: 0,
        resourceRate: 12,
        storedResources: 0,
      },
      {
        id: "outpost-3",
        name: "Western Outpost",
        x: 2500,
        y: 3000,
        owner: "neutral",
        captureProgress: 0,
        resourceRate: 10,
        storedResources: 0,
      },
      {
        id: "outpost-4",
        name: "Central Citadel",
        x: 6000,
        y: 3000,
        owner: "neutral",
        captureProgress: 0,
        resourceRate: 15,
        storedResources: 0,
      },
      {
        id: "outpost-5",
        name: "Eastern Outpost",
        x: 9500,
        y: 3000,
        owner: "neutral",
        captureProgress: 0,
        resourceRate: 10,
        storedResources: 0,
      },
      {
        id: "outpost-6",
        name: "Southern Fort",
        x: 8000,
        y: 5000,
        owner: "neutral",
        captureProgress: 0,
        resourceRate: 12,
        storedResources: 0,
      },
      {
        id: "outpost-7",
        name: "Beta Base",
        x: 10500,
        y: 4500,
        owner: "neutral",
        captureProgress: 0,
        resourceRate: 10,
        storedResources: 0,
      },
    ];

    const game: OutpostRushGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players,
      outposts,
      alphaBaseHealth: 1000,
      betaBaseHealth: 1000,
      alphaHoldTime: 0,
      betaHoldTime: 0,
      defenses: [],
      events: [],
      boss: null,
      startTime: Date.now(),
      winner: null,
      winReason: null,
      status: "playing",
    };

    this.outpostRushGames.set(game.id, game);
    this.outpostRushLobbies.delete(lobby.id);
    return game;
  }

  getOutpostRushGame(id: string): OutpostRushGame | undefined {
    return this.outpostRushGames.get(id);
  }

  getOutpostRushGameByPlayerId(playerId: string): OutpostRushGame | undefined {
    return Array.from(this.outpostRushGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId),
    );
  }

  updateOutpostRushGame(
    id: string,
    updates: Partial<OutpostRushGame>,
  ): OutpostRushGame | undefined {
    const game = this.outpostRushGames.get(id);
    if (game) {
      const updated = { ...game, ...updates };
      this.outpostRushGames.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteOutpostRushGame(id: string): void {
    this.outpostRushGames.delete(id);
  }

  getAllOutpostRushLobbies(): OutpostRushLobby[] {
    return Array.from(this.outpostRushLobbies.values());
  }

  // Emoji Chain Game Methods
  getOrCreateEmojiChainLobby(
    playerId: string,
    playerName: string,
  ): EmojiChainLobby {
    const existingLobby = this.getEmojiChainLobbyByPlayerId(playerId);
    if (existingLobby) return existingLobby;

    const waitingLobby = Array.from(this.emojiChainLobbies.values()).find(
      (l) => l.status === "waiting" && l.players.length < l.maxPlayers,
    );

    if (waitingLobby) {
      waitingLobby.players.push({ id: playerId, name: playerName, score: 0 });
      return waitingLobby;
    }

    const lobby: EmojiChainLobby = {
      id: randomUUID(),
      players: [{ id: playerId, name: playerName, score: 0 }],
      hostId: playerId,
      status: "waiting",
      minPlayers: 2,
      maxPlayers: 5,
    };
    this.emojiChainLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getEmojiChainLobby(id: string): EmojiChainLobby | undefined {
    return this.emojiChainLobbies.get(id);
  }

  getEmojiChainLobbyByPlayerId(playerId: string): EmojiChainLobby | undefined {
    return Array.from(this.emojiChainLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId),
    );
  }

  removePlayerFromEmojiChainLobby(lobbyId: string, playerId: string): void {
    const lobby = this.emojiChainLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.emojiChainLobbies.delete(lobbyId);
      } else if (lobby.hostId === playerId) {
        lobby.hostId = lobby.players[0].id;
      }
    }
  }

  updateEmojiChainLobbyStatus(
    id: string,
    status: EmojiChainLobby["status"],
  ): void {
    const lobby = this.emojiChainLobbies.get(id);
    if (lobby) {
      lobby.status = status;
    }
  }

  deleteEmojiChainLobby(id: string): void {
    this.emojiChainLobbies.delete(id);
  }

  createEmojiChainGame(
    lobby: EmojiChainLobby,
    emojis: string,
    answer: string,
    hint: string,
  ): EmojiChainGame {
    const game: EmojiChainGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p) => ({
        id: p.id,
        name: p.name,
        score: 0,
        hasGuessed: false,
        isEliminated: false,
      })),
      currentEmojis: emojis,
      currentAnswer: answer,
      currentHint: hint,
      roundIndex: 0,
      totalRounds: 10,
      roundStartTime: Date.now(),
      correctGuessers: [],
      status: "playing",
    };
    this.emojiChainGames.set(game.id, game);
    this.emojiChainLobbies.delete(lobby.id);
    return game;
  }

  getEmojiChainGame(id: string): EmojiChainGame | undefined {
    return this.emojiChainGames.get(id);
  }

  getEmojiChainGameByPlayerId(playerId: string): EmojiChainGame | undefined {
    return Array.from(this.emojiChainGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId),
    );
  }

  updateEmojiChainGame(
    id: string,
    updates: Partial<EmojiChainGame>,
  ): EmojiChainGame | undefined {
    const game = this.emojiChainGames.get(id);
    if (game) {
      const updated = { ...game, ...updates };
      this.emojiChainGames.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteEmojiChainGame(id: string): void {
    this.emojiChainGames.delete(id);
  }

  getAllEmojiChainLobbies(): EmojiChainLobby[] {
    return Array.from(this.emojiChainLobbies.values());
  }

  // Word Association Game Methods
  getOrCreateWordAssociationLobby(
    playerId: string,
    playerName: string,
  ): WordAssociationLobby {
    const existingLobby = this.getWordAssociationLobbyByPlayerId(playerId);
    if (existingLobby) return existingLobby;

    const waitingLobby = Array.from(this.wordAssociationLobbies.values()).find(
      (l) => l.status === "waiting" && l.players.length < l.maxPlayers,
    );

    if (waitingLobby) {
      waitingLobby.players.push({ id: playerId, name: playerName, score: 0 });
      return waitingLobby;
    }

    const lobby: WordAssociationLobby = {
      id: randomUUID(),
      players: [{ id: playerId, name: playerName, score: 0 }],
      hostId: playerId,
      status: "waiting",
      minPlayers: 2,
      maxPlayers: 5,
    };
    this.wordAssociationLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getWordAssociationLobby(id: string): WordAssociationLobby | undefined {
    return this.wordAssociationLobbies.get(id);
  }

  getWordAssociationLobbyByPlayerId(
    playerId: string,
  ): WordAssociationLobby | undefined {
    return Array.from(this.wordAssociationLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId),
    );
  }

  removePlayerFromWordAssociationLobby(
    lobbyId: string,
    playerId: string,
  ): void {
    const lobby = this.wordAssociationLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.wordAssociationLobbies.delete(lobbyId);
      } else if (lobby.hostId === playerId) {
        lobby.hostId = lobby.players[0].id;
      }
    }
  }

  updateWordAssociationLobbyStatus(
    id: string,
    status: WordAssociationLobby["status"],
  ): void {
    const lobby = this.wordAssociationLobbies.get(id);
    if (lobby) {
      lobby.status = status;
    }
  }

  deleteWordAssociationLobby(id: string): void {
    this.wordAssociationLobbies.delete(id);
  }

  createWordAssociationGame(
    lobby: WordAssociationLobby,
    starterWord: string,
  ): WordAssociationGame {
    const turnOrder = lobby.players.map((p) => p.id);
    const game: WordAssociationGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p) => ({
        id: p.id,
        name: p.name,
        score: 0,
        isEliminated: false,
      })),
      currentWord: starterWord,
      wordChain: [
        { word: starterWord, playerId: "system", playerName: "Game" },
      ],
      currentTurn: turnOrder[0],
      turnOrder,
      turnStartTime: Date.now(),
      roundNumber: 1,
      status: "playing",
      winner: null,
    };
    this.wordAssociationGames.set(game.id, game);
    this.wordAssociationLobbies.delete(lobby.id);
    return game;
  }

  getWordAssociationGame(id: string): WordAssociationGame | undefined {
    return this.wordAssociationGames.get(id);
  }

  getWordAssociationGameByPlayerId(
    playerId: string,
  ): WordAssociationGame | undefined {
    return Array.from(this.wordAssociationGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId),
    );
  }

  updateWordAssociationGame(
    id: string,
    updates: Partial<WordAssociationGame>,
  ): WordAssociationGame | undefined {
    const game = this.wordAssociationGames.get(id);
    if (game) {
      const updated = { ...game, ...updates };
      this.wordAssociationGames.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteWordAssociationGame(id: string): void {
    this.wordAssociationGames.delete(id);
  }

  getAllWordAssociationLobbies(): WordAssociationLobby[] {
    return Array.from(this.wordAssociationLobbies.values());
  }

  // Hangman Game Methods
  getOrCreateHangmanLobby(playerId: string, playerName: string): HangmanLobby {
    const existingLobby = this.getHangmanLobbyByPlayerId(playerId);
    if (existingLobby) return existingLobby;

    for (const lobby of this.hangmanLobbies.values()) {
      if (
        lobby.status === "waiting" &&
        lobby.players.length < lobby.maxPlayers
      ) {
        lobby.players.push({ id: playerId, name: playerName, score: 0 });
        return lobby;
      }
    }

    const lobby: HangmanLobby = {
      id: randomUUID(),
      players: [{ id: playerId, name: playerName, score: 0 }],
      hostId: playerId,
      status: "waiting",
      minPlayers: 2,
      maxPlayers: 8,
    };
    this.hangmanLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getHangmanLobby(id: string): HangmanLobby | undefined {
    return this.hangmanLobbies.get(id);
  }

  getHangmanLobbyByPlayerId(playerId: string): HangmanLobby | undefined {
    return Array.from(this.hangmanLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId),
    );
  }

  removePlayerFromHangmanLobby(lobbyId: string, playerId: string): void {
    const lobby = this.hangmanLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.hangmanLobbies.delete(lobbyId);
      } else if (lobby.hostId === playerId) {
        lobby.hostId = lobby.players[0].id;
      }
    }
  }

  updateHangmanLobbyStatus(id: string, status: HangmanLobby["status"]): void {
    const lobby = this.hangmanLobbies.get(id);
    if (lobby) {
      lobby.status = status;
    }
  }

  deleteHangmanLobby(id: string): void {
    this.hangmanLobbies.delete(id);
  }

  createHangmanGame(lobby: HangmanLobby): HangmanGame {
    const turnOrder = lobby.players.map((p) => p.id);
    const game: HangmanGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p) => ({
        id: p.id,
        name: p.name,
        score: p.score,
      })),
      wordSetter: turnOrder[0],
      word: "",
      revealedWord: "",
      guessedLetters: [],
      wrongGuesses: 0,
      maxWrongGuesses: 6,
      currentGuesser: turnOrder[1] || turnOrder[0],
      turnOrder,
      roundNumber: 1,
      status: "setting_word",
      winner: null,
      lastGuess: null,
    };
    this.hangmanGames.set(game.id, game);
    this.hangmanLobbies.delete(lobby.id);
    return game;
  }

  getHangmanGame(id: string): HangmanGame | undefined {
    return this.hangmanGames.get(id);
  }

  getHangmanGameByPlayerId(playerId: string): HangmanGame | undefined {
    return Array.from(this.hangmanGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId),
    );
  }

  updateHangmanGame(
    id: string,
    updates: Partial<HangmanGame>,
  ): HangmanGame | undefined {
    const game = this.hangmanGames.get(id);
    if (game) {
      const updated = { ...game, ...updates };
      this.hangmanGames.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteHangmanGame(id: string): void {
    this.hangmanGames.delete(id);
  }

  getAllHangmanLobbies(): HangmanLobby[] {
    return Array.from(this.hangmanLobbies.values());
  }

  // Trivia Quiz Game Methods
  getOrCreateTriviaQuizLobby(
    playerId: string,
    playerName: string,
  ): TriviaQuizLobby {
    const existingLobby = this.getTriviaQuizLobbyByPlayerId(playerId);
    if (existingLobby) return existingLobby;

    for (const lobby of this.triviaQuizLobbies.values()) {
      if (
        lobby.status === "waiting" &&
        lobby.players.length < lobby.maxPlayers
      ) {
        lobby.players.push({ id: playerId, name: playerName, score: 0 });
        return lobby;
      }
    }

    const lobby: TriviaQuizLobby = {
      id: randomUUID(),
      players: [{ id: playerId, name: playerName, score: 0 }],
      hostId: playerId,
      status: "waiting",
      minPlayers: 2,
      maxPlayers: 8,
    };
    this.triviaQuizLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getTriviaQuizLobby(id: string): TriviaQuizLobby | undefined {
    return this.triviaQuizLobbies.get(id);
  }

  getTriviaQuizLobbyByPlayerId(playerId: string): TriviaQuizLobby | undefined {
    return Array.from(this.triviaQuizLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId),
    );
  }

  removePlayerFromTriviaQuizLobby(lobbyId: string, playerId: string): void {
    const lobby = this.triviaQuizLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.triviaQuizLobbies.delete(lobbyId);
      } else if (lobby.hostId === playerId) {
        lobby.hostId = lobby.players[0].id;
      }
    }
  }

  updateTriviaQuizLobbyStatus(
    id: string,
    status: TriviaQuizLobby["status"],
  ): void {
    const lobby = this.triviaQuizLobbies.get(id);
    if (lobby) {
      lobby.status = status;
    }
  }

  deleteTriviaQuizLobby(id: string): void {
    this.triviaQuizLobbies.delete(id);
  }

  createTriviaQuizGame(
    lobby: TriviaQuizLobby,
    question: {
      question: string;
      options: string[];
      correctIndex: number;
      category: string;
    },
  ): TriviaQuizGame {
    const game: TriviaQuizGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p) => ({
        id: p.id,
        name: p.name,
        score: 0,
        hasAnswered: false,
        lastAnswerCorrect: null,
      })),
      currentQuestion: {
        question: question.question,
        options: question.options,
        correctIndex: question.correctIndex,
        category: question.category,
      },
      questionIndex: 0,
      totalQuestions: 10,
      questionStartTime: Date.now(),
      timeLimit: 15,
      status: "question",
      correctAnswers: [],
    };
    this.triviaQuizGames.set(game.id, game);
    this.triviaQuizLobbies.delete(lobby.id);
    return game;
  }

  getTriviaQuizGame(id: string): TriviaQuizGame | undefined {
    return this.triviaQuizGames.get(id);
  }

  getTriviaQuizGameByPlayerId(playerId: string): TriviaQuizGame | undefined {
    return Array.from(this.triviaQuizGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId),
    );
  }

  updateTriviaQuizGame(
    id: string,
    updates: Partial<TriviaQuizGame>,
  ): TriviaQuizGame | undefined {
    const game = this.triviaQuizGames.get(id);
    if (game) {
      const updated = { ...game, ...updates };
      this.triviaQuizGames.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteTriviaQuizGame(id: string): void {
    this.triviaQuizGames.delete(id);
  }

  getAllTriviaQuizLobbies(): TriviaQuizLobby[] {
    return Array.from(this.triviaQuizLobbies.values());
  }

  getAllHangmanLobbies(): HangmanLobby[] {
    return Array.from(this.hangmanLobbies.values());
  }

  // ========== SQUID GAME STORAGE ==========
  getOrCreateSquidGameLobby(
    playerId: string,
    playerName: string,
    vipOnly = false,
  ): SquidGameLobby {
    const existingLobby = this.getSquidGameLobbyByPlayerId(playerId);
    if (existingLobby) return existingLobby;

    const waitingLobby = Array.from(this.squidGameLobbies.values()).find(
      (l) =>
        l.status === "waiting" &&
        l.players.length < l.maxPlayers &&
        (l.vipOnly ?? false) === vipOnly,
    );

    if (waitingLobby) {
      waitingLobby.players.push({
        id: playerId,
        name: playerName,
        isAlive: true,
        score: 0,
        position: 0,
      });
      this.squidGameLobbies.set(waitingLobby.id, waitingLobby);
      return waitingLobby;
    }

    const lobby: SquidGameLobby = {
      id: randomUUID(),
      players: [
        {
          id: playerId,
          name: playerName,
          isAlive: true,
          score: 0,
          position: 0,
        },
      ],
      hostId: playerId,
      status: "waiting",
      minPlayers: 5,
      maxPlayers: 20,
      vipOnly,
    };
    this.squidGameLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getSquidGameLobby(id: string): SquidGameLobby | undefined {
    return this.squidGameLobbies.get(id);
  }

  getSquidGameLobbyByPlayerId(playerId: string): SquidGameLobby | undefined {
    return Array.from(this.squidGameLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId),
    );
  }

  removePlayerFromSquidGameLobby(lobbyId: string, playerId: string): void {
    const lobby = this.squidGameLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.squidGameLobbies.delete(lobbyId);
      } else if (lobby.hostId === playerId) {
        lobby.hostId = lobby.players[0].id;
      }
    }
  }

  deleteSquidGameLobby(id: string): void {
    this.squidGameLobbies.delete(id);
  }

  createSquidGame(lobby: SquidGameLobby): SquidGame {
    const miniGames: Array<
      "red_light_green_light" | "cookie_cutter" | "glass_bridge"
    > = ["red_light_green_light", "cookie_cutter", "glass_bridge"];
    const cookieShapes = ["circle", "triangle", "square", "star"];
    const glassPath = Array.from({ length: 10 }, () => Math.random() > 0.5);

    const game: SquidGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p) => ({
        id: p.id,
        name: p.name,
        isAlive: true,
        score: 0,
        position: 0,
        lastAction: Date.now(),
      })),
      currentRound: 1,
      totalRounds: 3,
      currentMiniGame: miniGames[0],
      miniGameState: {
        isGreenLight: true,
        lightChangeTime: Date.now() + 3000,
        cookieShape:
          cookieShapes[Math.floor(Math.random() * cookieShapes.length)],
        cookieProgress: {},
        glassPath,
        playerPositions: {},
      },
      status: "playing",
      roundStartTime: Date.now(),
      roundTimeLimit: 60,
      eliminated: [],
      survivors: [],
      winners: [],
    };
    this.squidGames.set(game.id, game);
    return game;
  }

  getSquidGame(id: string): SquidGame | undefined {
    return this.squidGames.get(id);
  }

  getSquidGameByPlayerId(playerId: string): SquidGame | undefined {
    return Array.from(this.squidGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId),
    );
  }

  updateSquidGame(
    id: string,
    updates: Partial<SquidGame>,
  ): SquidGame | undefined {
    const game = this.squidGames.get(id);
    if (game) {
      const updated = { ...game, ...updates };
      this.squidGames.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteSquidGame(id: string): void {
    this.squidGames.delete(id);
  }

  getAllSquidGameLobbies(): SquidGameLobby[] {
    return Array.from(this.squidGameLobbies.values());
  }

  // ========== ESCAPE SHIP STORAGE ==========
  private static ESCAPE_SHIP_PUZZLES = [
    {
      type: "math",
      question: "7 x 8 = ?",
      answer: "56",
      hint: "Multiply these numbers",
    },
    {
      type: "math",
      question: "144 / 12 = ?",
      answer: "12",
      hint: "Divide to find the answer",
    },
    {
      type: "math",
      question: "25 + 37 = ?",
      answer: "62",
      hint: "Add these numbers",
    },
    {
      type: "word",
      question: "Unscramble: CPAES",
      answer: "SPACE",
      hint: "Where astronauts work",
    },
    {
      type: "word",
      question: "Unscramble: IRHPS",
      answer: "SHIPS",
      hint: "Vessels that sail",
    },
    {
      type: "word",
      question: "Unscramble: ATSR",
      answer: "STAR",
      hint: "Twinkle in the sky",
    },
    {
      type: "sequence",
      question: "2, 4, 8, 16, ?",
      answer: "32",
      hint: "Double each time",
    },
    {
      type: "sequence",
      question: "3, 6, 9, 12, ?",
      answer: "15",
      hint: "Add 3 each time",
    },
  ];

  getOrCreateEscapeShipLobby(
    playerId: string,
    playerName: string,
    vipOnly = false,
  ): EscapeShipLobby {
    const existingLobby = this.getEscapeShipLobbyByPlayerId(playerId);
    if (existingLobby) return existingLobby;

    const waitingLobby = Array.from(this.escapeShipLobbies.values()).find(
      (l) =>
        l.status === "waiting" &&
        l.players.length < l.maxPlayers &&
        (l.vipOnly ?? false) === vipOnly,
    );

    if (waitingLobby) {
      waitingLobby.players.push({ id: playerId, name: playerName });
      this.escapeShipLobbies.set(waitingLobby.id, waitingLobby);
      return waitingLobby;
    }

    const lobby: EscapeShipLobby = {
      id: randomUUID(),
      players: [{ id: playerId, name: playerName }],
      hostId: playerId,
      status: "waiting",
      minPlayers: 3,
      maxPlayers: 8,
      vipOnly,
    };
    this.escapeShipLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getEscapeShipLobby(id: string): EscapeShipLobby | undefined {
    return this.escapeShipLobbies.get(id);
  }

  getEscapeShipLobbyByPlayerId(playerId: string): EscapeShipLobby | undefined {
    return Array.from(this.escapeShipLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId),
    );
  }

  removePlayerFromEscapeShipLobby(lobbyId: string, playerId: string): void {
    const lobby = this.escapeShipLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.escapeShipLobbies.delete(lobbyId);
      } else if (lobby.hostId === playerId) {
        lobby.hostId = lobby.players[0].id;
      }
    }
  }

  deleteEscapeShipLobby(id: string): void {
    this.escapeShipLobbies.delete(id);
  }

  createEscapeShipGame(lobby: EscapeShipLobby): EscapeShipGame {
    const rooms: EscapeShipRoomType[] = [
      "engine",
      "bridge",
      "cargo",
      "lab",
      "airlock",
      "escape_pod",
    ];
    const roomPuzzles: Record<string, any> = {};

    const shuffledPuzzles = [...MemStorage.ESCAPE_SHIP_PUZZLES].sort(
      () => Math.random() - 0.5,
    );

    rooms.forEach((room, index) => {
      const puzzle = shuffledPuzzles[index % shuffledPuzzles.length];
      roomPuzzles[room] = {
        solved: false,
        solvedBy: null,
        puzzleType: puzzle.type,
        answer: puzzle.answer,
        hint: puzzle.hint,
        trapActive: Math.random() < 0.3,
        trapType: Math.random() < 0.5 ? "stun" : "teleport",
      };
    });

    const game: EscapeShipGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p) => ({
        id: p.id,
        name: p.name,
        currentRoom: "cargo" as EscapeShipRoomType,
        hasKey: false,
        hasFuel: false,
        hasCode: false,
        isStunned: false,
        stunEndTime: null,
        escaped: false,
        finishTime: null,
        position: 0,
      })),
      roomPuzzles: roomPuzzles as any,
      gameTimer: 180,
      startTime: Date.now(),
      status: "playing",
      rankings: [],
      events: [
        {
          type: "game_start",
          playerId: "system",
          playerName: "System",
          message:
            "The ship is going down! Find the key, fuel, and access code, then escape!",
          timestamp: Date.now(),
        },
      ],
    };
    this.escapeShipGames.set(game.id, game);
    return game;
  }

  getEscapeShipGame(id: string): EscapeShipGame | undefined {
    return this.escapeShipGames.get(id);
  }

  getEscapeShipGameByPlayerId(playerId: string): EscapeShipGame | undefined {
    return Array.from(this.escapeShipGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId),
    );
  }

  updateEscapeShipGame(
    id: string,
    updates: Partial<EscapeShipGame>,
  ): EscapeShipGame | undefined {
    const game = this.escapeShipGames.get(id);
    if (game) {
      const updated = { ...game, ...updates };
      this.escapeShipGames.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteEscapeShipGame(id: string): void {
    this.escapeShipGames.delete(id);
  }

  getAllEscapeShipLobbies(): EscapeShipLobby[] {
    return Array.from(this.escapeShipLobbies.values());
  }

  // ========== REACTION RACE STORAGE ==========
  getOrCreateReactionRaceLobby(
    playerId: string,
    playerName: string,
  ): ReactionRaceLobby {
    const existingLobby = this.getReactionRaceLobbyByPlayerId(playerId);
    if (existingLobby) return existingLobby;

    const waitingLobby = Array.from(this.reactionRaceLobbies.values()).find(
      (l) => l.status === "waiting" && l.players.length < l.maxPlayers,
    );

    if (waitingLobby) {
      waitingLobby.players.push({ id: playerId, name: playerName });
      this.reactionRaceLobbies.set(waitingLobby.id, waitingLobby);
      return waitingLobby;
    }

    const lobby: ReactionRaceLobby = {
      id: randomUUID(),
      players: [{ id: playerId, name: playerName }],
      hostId: playerId,
      status: "waiting",
      minPlayers: 2,
      maxPlayers: 8,
    };
    this.reactionRaceLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getReactionRaceLobby(id: string): ReactionRaceLobby | undefined {
    return this.reactionRaceLobbies.get(id);
  }

  getReactionRaceLobbyByPlayerId(
    playerId: string,
  ): ReactionRaceLobby | undefined {
    return Array.from(this.reactionRaceLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId),
    );
  }

  removePlayerFromReactionRaceLobby(lobbyId: string, playerId: string): void {
    const lobby = this.reactionRaceLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.reactionRaceLobbies.delete(lobbyId);
      } else {
        if (lobby.hostId === playerId) {
          lobby.hostId = lobby.players[0].id;
        }
        this.reactionRaceLobbies.set(lobbyId, lobby);
      }
    }
  }

  deleteReactionRaceLobby(id: string): void {
    this.reactionRaceLobbies.delete(id);
  }

  createReactionRaceGame(lobby: ReactionRaceLobby): ReactionRaceGame {
    const game: ReactionRaceGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p) => ({
        id: p.id,
        name: p.name,
        score: 0,
        lastReactionTime: null,
        falseStart: false,
      })),
      currentRound: 1,
      totalRounds: 5,
      roundStartTime: null,
      signalTime: null,
      roundStatus: "waiting",
      status: "playing",
      winner: null,
      roundResults: [],
    };
    this.reactionRaceGames.set(game.id, game);
    return game;
  }

  getReactionRaceGame(id: string): ReactionRaceGame | undefined {
    return this.reactionRaceGames.get(id);
  }

  getReactionRaceGameByPlayerId(
    playerId: string,
  ): ReactionRaceGame | undefined {
    return Array.from(this.reactionRaceGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId),
    );
  }

  updateReactionRaceGame(
    id: string,
    updates: Partial<ReactionRaceGame>,
  ): ReactionRaceGame | undefined {
    const game = this.reactionRaceGames.get(id);
    if (game) {
      const updated = { ...game, ...updates };
      this.reactionRaceGames.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteReactionRaceGame(id: string): void {
    this.reactionRaceGames.delete(id);
  }

  getAllReactionRaceLobbies(): ReactionRaceLobby[] {
    return Array.from(this.reactionRaceLobbies.values());
  }

  // ========== COLOR CLASH STORAGE ==========
  private static readonly COLORS = ["red", "blue", "green", "yellow"];

  getOrCreateColorClashLobby(
    playerId: string,
    playerName: string,
  ): ColorClashLobby {
    const existingLobby = this.getColorClashLobbyByPlayerId(playerId);
    if (existingLobby) return existingLobby;

    const waitingLobby = Array.from(this.colorClashLobbies.values()).find(
      (l) => l.status === "waiting" && l.players.length < l.maxPlayers,
    );

    if (waitingLobby) {
      waitingLobby.players.push({ id: playerId, name: playerName });
      this.colorClashLobbies.set(waitingLobby.id, waitingLobby);
      return waitingLobby;
    }

    const lobby: ColorClashLobby = {
      id: randomUUID(),
      players: [{ id: playerId, name: playerName }],
      hostId: playerId,
      status: "waiting",
      minPlayers: 2,
      maxPlayers: 8,
    };
    this.colorClashLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getColorClashLobby(id: string): ColorClashLobby | undefined {
    return this.colorClashLobbies.get(id);
  }

  getColorClashLobbyByPlayerId(playerId: string): ColorClashLobby | undefined {
    return Array.from(this.colorClashLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId),
    );
  }

  removePlayerFromColorClashLobby(lobbyId: string, playerId: string): void {
    const lobby = this.colorClashLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.colorClashLobbies.delete(lobbyId);
      } else {
        if (lobby.hostId === playerId) {
          lobby.hostId = lobby.players[0].id;
        }
        this.colorClashLobbies.set(lobbyId, lobby);
      }
    }
  }

  deleteColorClashLobby(id: string): void {
    this.colorClashLobbies.delete(id);
  }

  createColorClashGame(lobby: ColorClashLobby): ColorClashGame {
    const initialSequence = [
      MemStorage.COLORS[Math.floor(Math.random() * MemStorage.COLORS.length)],
    ];

    const game: ColorClashGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p) => ({
        id: p.id,
        name: p.name,
        isEliminated: false,
        currentInput: [],
        hasSubmitted: false,
      })),
      colorSequence: initialSequence,
      currentRound: 1,
      roundStatus: "showing",
      status: "playing",
      winner: null,
      winnerName: null,
      showingIndex: 0,
      roundStartTime: Date.now(),
    };
    this.colorClashGames.set(game.id, game);
    return game;
  }

  getColorClashGame(id: string): ColorClashGame | undefined {
    return this.colorClashGames.get(id);
  }

  getColorClashGameByPlayerId(playerId: string): ColorClashGame | undefined {
    return Array.from(this.colorClashGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId),
    );
  }

  updateColorClashGame(
    id: string,
    updates: Partial<ColorClashGame>,
  ): ColorClashGame | undefined {
    const game = this.colorClashGames.get(id);
    if (game) {
      const updated = { ...game, ...updates };
      this.colorClashGames.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteColorClashGame(id: string): void {
    this.colorClashGames.delete(id);
  }

  getAllColorClashLobbies(): ColorClashLobby[] {
    return Array.from(this.colorClashLobbies.values());
  }

  // ========== HIDE AND SEEK STORAGE ==========
  getOrCreateHideSeekLobby(
    playerId: string,
    playerName: string,
    vipOnly = false,
  ): HideSeekLobby {
    const existingLobby = this.getHideSeekLobbyByPlayerId(playerId);
    if (existingLobby) return existingLobby;

    const waitingLobby = Array.from(this.hideSeekLobbies.values()).find(
      (l) =>
        l.status === "waiting" &&
        l.players.length < l.maxPlayers &&
        (l.vipOnly ?? false) === vipOnly,
    );

    if (waitingLobby) {
      waitingLobby.players.push({ id: playerId, name: playerName });
      this.hideSeekLobbies.set(waitingLobby.id, waitingLobby);
      return waitingLobby;
    }

    const lobby: HideSeekLobby = {
      id: randomUUID(),
      players: [{ id: playerId, name: playerName }],
      hostId: playerId,
      status: "waiting",
      minPlayers: 3,
      maxPlayers: 10,
      seekerMode: "random",
      vipOnly,
    };
    this.hideSeekLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getHideSeekLobby(id: string): HideSeekLobby | undefined {
    return this.hideSeekLobbies.get(id);
  }

  getHideSeekLobbyByPlayerId(playerId: string): HideSeekLobby | undefined {
    return Array.from(this.hideSeekLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId),
    );
  }

  removePlayerFromHideSeekLobby(lobbyId: string, playerId: string): void {
    const lobby = this.hideSeekLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.hideSeekLobbies.delete(lobbyId);
      } else {
        if (lobby.hostId === playerId) {
          lobby.hostId = lobby.players[0].id;
        }
        this.hideSeekLobbies.set(lobbyId, lobby);
      }
    }
  }

  deleteHideSeekLobby(id: string): void {
    this.hideSeekLobbies.delete(id);
  }

  updateHideSeekLobby(id: string, updates: Partial<HideSeekLobby>): HideSeekLobby | undefined {
    const lobby = this.hideSeekLobbies.get(id);
    if (lobby) {
      const updated = { ...lobby, ...updates };
      this.hideSeekLobbies.set(id, updated);
      return updated;
    }
    return undefined;
  }

  createHideSeekGame(lobby: HideSeekLobby): HideSeekGame {
    const seekerId = lobby.seekerMode === "host" 
      ? lobby.hostId 
      : lobby.players[Math.floor(Math.random() * lobby.players.length)].id;
    
    const game: HideSeekGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p) => ({
        id: p.id,
        name: p.name,
        x: 0,
        y: 0,
        z: 0,
        rotation: 0,
        isCrouching: false,
        isRunning: false,
        isEliminated: false,
        isSeeker: p.id === seekerId,
      })),
      seekerId,
      phase: "hiding",
      hidingTimeRemaining: 30,
      gameTimeRemaining: 180,
      startTime: Date.now(),
      eliminatedPlayers: [],
      winner: null,
      status: "playing",
    };
    this.hideSeekGames.set(game.id, game);
    return game;
  }

  getHideSeekGame(id: string): HideSeekGame | undefined {
    return this.hideSeekGames.get(id);
  }

  getHideSeekGameByPlayerId(playerId: string): HideSeekGame | undefined {
    return Array.from(this.hideSeekGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId),
    );
  }

  updateHideSeekGame(
    id: string,
    updates: Partial<HideSeekGame>,
  ): HideSeekGame | undefined {
    const game = this.hideSeekGames.get(id);
    if (game) {
      const updated = { ...game, ...updates };
      this.hideSeekGames.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteHideSeekGame(id: string): void {
    this.hideSeekGames.delete(id);
  }

  getAllHideSeekLobbies(): HideSeekLobby[] {
    return Array.from(this.hideSeekLobbies.values());
  }

  // ========== TRUTH OR BLUFF STORAGE ==========
  getOrCreateTruthOrBluffLobby(
    playerId: string,
    playerName: string,
  ): TruthOrBluffLobby {
    const existingLobby = this.getTruthOrBluffLobbyByPlayerId(playerId);
    if (existingLobby) return existingLobby;

    const waitingLobby = Array.from(this.truthOrBluffLobbies.values()).find(
      (l) => l.status === "waiting" && l.players.length < l.maxPlayers,
    );

    if (waitingLobby) {
      waitingLobby.players.push({ id: playerId, name: playerName, score: 0 });
      this.truthOrBluffLobbies.set(waitingLobby.id, waitingLobby);
      return waitingLobby;
    }

    const lobby: TruthOrBluffLobby = {
      id: randomUUID(),
      players: [{ id: playerId, name: playerName, score: 0 }],
      hostId: playerId,
      status: "waiting",
      minPlayers: 3,
      maxPlayers: 10,
    };
    this.truthOrBluffLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getTruthOrBluffLobby(id: string): TruthOrBluffLobby | undefined {
    return this.truthOrBluffLobbies.get(id);
  }

  getTruthOrBluffLobbyByPlayerId(
    playerId: string,
  ): TruthOrBluffLobby | undefined {
    return Array.from(this.truthOrBluffLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId),
    );
  }

  removePlayerFromTruthOrBluffLobby(lobbyId: string, playerId: string): void {
    const lobby = this.truthOrBluffLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.truthOrBluffLobbies.delete(lobbyId);
      } else if (lobby.hostId === playerId) {
        lobby.hostId = lobby.players[0].id;
      }
    }
  }

  deleteTruthOrBluffLobby(id: string): void {
    this.truthOrBluffLobbies.delete(id);
  }

  createTruthOrBluffGame(lobby: TruthOrBluffLobby): TruthOrBluffGame {
    const game: TruthOrBluffGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p) => ({
        id: p.id,
        name: p.name,
        score: 0,
      })),
      currentStoryteller: lobby.players[0].id,
      currentStory: "",
      storyIsTruth: null,
      votes: {},
      voteResults: [],
      roundNumber: 1,
      totalRounds: 2,
      currentTurnIndex: 0,
      status: "waiting_story",
    };
    this.truthOrBluffGames.set(game.id, game);
    return game;
  }

  getTruthOrBluffGame(id: string): TruthOrBluffGame | undefined {
    return this.truthOrBluffGames.get(id);
  }

  getTruthOrBluffGameByPlayerId(
    playerId: string,
  ): TruthOrBluffGame | undefined {
    return Array.from(this.truthOrBluffGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId),
    );
  }

  updateTruthOrBluffGame(
    id: string,
    updates: Partial<TruthOrBluffGame>,
  ): TruthOrBluffGame | undefined {
    const game = this.truthOrBluffGames.get(id);
    if (game) {
      const updated = { ...game, ...updates };
      this.truthOrBluffGames.set(id, updated);
      return updated;
    }
    return undefined;
  }

  deleteTruthOrBluffGame(id: string): void {
    this.truthOrBluffGames.delete(id);
  }

  getAllTruthOrBluffLobbies(): TruthOrBluffLobby[] {
    return Array.from(this.truthOrBluffLobbies.values());
  }

  // ========== SPOT THE LIAR ==========
  private static SPOT_THE_LIAR_WORDS: {
    category: string;
    realWord: string;
    fakeWord: string;
  }[] = [
    { category: "Animals", realWord: "Elephant", fakeWord: "Giraffe" },
    { category: "Animals", realWord: "Penguin", fakeWord: "Flamingo" },
    { category: "Animals", realWord: "Tiger", fakeWord: "Lion" },
    { category: "Food", realWord: "Pizza", fakeWord: "Burger" },
    { category: "Food", realWord: "Sushi", fakeWord: "Ramen" },
    { category: "Food", realWord: "Tacos", fakeWord: "Burritos" },
    { category: "Places", realWord: "Beach", fakeWord: "Mountain" },
    { category: "Places", realWord: "Library", fakeWord: "Museum" },
    { category: "Places", realWord: "Airport", fakeWord: "Train Station" },
    { category: "Jobs", realWord: "Doctor", fakeWord: "Nurse" },
    { category: "Jobs", realWord: "Chef", fakeWord: "Waiter" },
    { category: "Jobs", realWord: "Teacher", fakeWord: "Professor" },
    { category: "Sports", realWord: "Soccer", fakeWord: "Basketball" },
    { category: "Sports", realWord: "Tennis", fakeWord: "Badminton" },
    { category: "Sports", realWord: "Swimming", fakeWord: "Diving" },
    { category: "Hobbies", realWord: "Painting", fakeWord: "Drawing" },
    { category: "Hobbies", realWord: "Gaming", fakeWord: "Streaming" },
    { category: "Hobbies", realWord: "Cooking", fakeWord: "Baking" },
    { category: "Movies", realWord: "Comedy", fakeWord: "Drama" },
    { category: "Movies", realWord: "Horror", fakeWord: "Thriller" },
  ];

  getOrCreateSpotTheLiarLobby(
    playerId: string,
    playerName: string,
  ): SpotTheLiarLobby {
    const existingLobby = this.getSpotTheLiarLobbyByPlayerId(playerId);
    if (existingLobby) return existingLobby;

    // Find a lobby with space
    for (const lobby of this.spotTheLiarLobbies.values()) {
      if (
        lobby.status === "waiting" &&
        lobby.players.length < lobby.maxPlayers
      ) {
        lobby.players.push({ id: playerId, name: playerName, score: 0 });
        return lobby;
      }
    }

    // Create new lobby
    const lobby: SpotTheLiarLobby = {
      id: randomUUID(),
      players: [{ id: playerId, name: playerName, score: 0 }],
      hostId: playerId,
      status: "waiting",
      minPlayers: 3,
      maxPlayers: 6,
    };
    this.spotTheLiarLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getSpotTheLiarLobby(id: string): SpotTheLiarLobby | undefined {
    return this.spotTheLiarLobbies.get(id);
  }

  getSpotTheLiarLobbyByPlayerId(
    playerId: string,
  ): SpotTheLiarLobby | undefined {
    for (const lobby of this.spotTheLiarLobbies.values()) {
      if (lobby.players.some((p) => p.id === playerId)) return lobby;
    }
    return undefined;
  }

  removePlayerFromSpotTheLiarLobby(lobbyId: string, playerId: string): void {
    const lobby = this.spotTheLiarLobbies.get(lobbyId);
    if (!lobby) return;
    lobby.players = lobby.players.filter((p) => p.id !== playerId);
    if (lobby.players.length === 0) {
      this.spotTheLiarLobbies.delete(lobbyId);
    } else if (lobby.hostId === playerId) {
      lobby.hostId = lobby.players[0].id;
    }
  }

  deleteSpotTheLiarLobby(id: string): void {
    this.spotTheLiarLobbies.delete(id);
  }

  createSpotTheLiarGame(lobby: SpotTheLiarLobby): SpotTheLiarGame {
    const wordSet =
      MemStorage.SPOT_THE_LIAR_WORDS[
        Math.floor(Math.random() * MemStorage.SPOT_THE_LIAR_WORDS.length)
      ];
    const playerIds = lobby.players.map((p) => p.id);
    const liarId = playerIds[Math.floor(Math.random() * playerIds.length)];
    const shuffledOrder = [...playerIds].sort(() => Math.random() - 0.5);

    const game: SpotTheLiarGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p) => ({ ...p, score: 0 })),
      liarId,
      realWord: wordSet.realWord,
      fakeWord: wordSet.fakeWord,
      category: wordSet.category,
      currentDescriber: shuffledOrder[0],
      descriptions: [],
      describerOrder: shuffledOrder,
      currentDescriberIndex: 0,
      votes: {},
      status: "describing",
      roundNumber: 1,
      totalRounds: lobby.players.length,
      roundHistory: [],
      timer: null,
    };
    this.spotTheLiarGames.set(game.id, game);
    this.deleteSpotTheLiarLobby(lobby.id);
    return game;
  }

  getSpotTheLiarGame(id: string): SpotTheLiarGame | undefined {
    return this.spotTheLiarGames.get(id);
  }

  getSpotTheLiarGameByPlayerId(playerId: string): SpotTheLiarGame | undefined {
    for (const game of this.spotTheLiarGames.values()) {
      if (game.players.some((p) => p.id === playerId)) return game;
    }
    return undefined;
  }

  updateSpotTheLiarGame(
    id: string,
    updates: Partial<SpotTheLiarGame>,
  ): SpotTheLiarGame | undefined {
    const game = this.spotTheLiarGames.get(id);
    if (!game) return undefined;
    Object.assign(game, updates);
    return game;
  }

  deleteSpotTheLiarGame(id: string): void {
    this.spotTheLiarGames.delete(id);
  }

  getAllSpotTheLiarLobbies(): SpotTheLiarLobby[] {
    return Array.from(this.spotTheLiarLobbies.values());
  }

  // ========== DIRECT MESSAGES ==========
  addDirectMessage(
    fromId: string,
    fromName: string,
    toId: string,
    toName: string,
    content: string,
  ): DirectMessage {
    const message: DirectMessage = {
      id: randomUUID(),
      fromPlayerId: fromId,
      fromPlayerName: fromName,
      toPlayerId: toId,
      toPlayerName: toName,
      content,
      timestamp: Date.now(),
      isRead: false,
    };

    const key1 = [fromId, toId].sort().join(":");
    const existing = this.directMessages.get(key1) || [];
    existing.push(message);
    this.directMessages.set(key1, existing);
    saveDirectMessagesToFile(this.directMessages);
    return message;
  }

  getDirectMessages(userId1: string, userId2: string): DirectMessage[] {
    const key = [userId1, userId2].sort().join(":");
    return this.directMessages.get(key) || [];
  }

  getUnreadMessagesForUser(userId: string): DirectMessage[] {
    const unread: DirectMessage[] = [];
    this.directMessages.forEach((messages) => {
      messages.forEach((msg) => {
        if (msg.toPlayerId === userId && !msg.isRead) {
          unread.push(msg);
        }
      });
    });
    return unread;
  }

  markMessagesAsRead(userId1: string, userId2: string): void {
    const key = [userId1, userId2].sort().join(":");
    const messages = this.directMessages.get(key);
    let changed = false;
    if (messages) {
      messages.forEach((msg) => {
        // Only mark messages addressed to the reader as read.
        if (msg.toPlayerId === userId1) {
          msg.isRead = true;
          changed = true;
        }
      });
      this.directMessages.set(key, messages);
      if (changed) {
        saveDirectMessagesToFile(this.directMessages);
      }
    }
  }

  addScreenshot(
    uploaderId: string,
    uploaderName: string,
    filename: string,
    gameName: string,
  ): Screenshot {
    const screenshot: Screenshot = {
      id: randomUUID(),
      uploaderId,
      uploaderName,
      filename,
      gameName,
      timestamp: Date.now(),
    };
    this.screenshots.set(screenshot.id, screenshot);
    saveScreenshotsToFile(this.screenshots);
    return screenshot;
  }

  getScreenshots(): Screenshot[] {
    return Array.from(this.screenshots.values()).sort(
      (a, b) => b.timestamp - a.timestamp,
    );
  }

  deleteScreenshot(id: string): boolean {
    const deleted = this.screenshots.delete(id);
    if (deleted) {
      saveScreenshotsToFile(this.screenshots);
    }
    return deleted;
  }

  addTutorial(
    gameType: string,
    title: string,
    description: string,
    videoFilename: string,
    uploaderId: string,
    uploaderName: string,
  ): Tutorial {
    const tutorial: Tutorial = {
      id: randomUUID(),
      gameType,
      title,
      description,
      videoFilename,
      uploaderId,
      uploaderName,
      timestamp: Date.now(),
    };
    this.tutorials.set(tutorial.id, tutorial);
    saveTutorialsToFile(this.tutorials);
    return tutorial;
  }

  getTutorials(): Tutorial[] {
    return Array.from(this.tutorials.values()).sort(
      (a, b) => b.timestamp - a.timestamp,
    );
  }

  getTutorialByGameType(gameType: string): Tutorial | undefined {
    return Array.from(this.tutorials.values()).find(
      (t) => t.gameType === gameType,
    );
  }

  deleteTutorial(id: string): boolean {
    const deleted = this.tutorials.delete(id);
    if (deleted) {
      saveTutorialsToFile(this.tutorials);
    }
    return deleted;
  }

  addSupportRequest(
    type: "bug" | "feature",
    title: string,
    description: string,
    submitterId: string,
    submitterName: string,
  ): SupportRequest {
    const request: SupportRequest = {
      id: randomUUID(),
      type,
      title,
      description,
      submitterId,
      submitterName,
      likes: [],
      isDone: false,
      timestamp: Date.now(),
    };
    this.supportRequests.set(request.id, request);
    saveRequestsToFile(this.supportRequests);
    return request;
  }

  getSupportRequests(): SupportRequest[] {
    return Array.from(this.supportRequests.values()).sort(
      (a, b) => b.timestamp - a.timestamp,
    );
  }

  toggleSupportRequestLike(
    requestId: string,
    playerId: string,
  ): SupportRequest | undefined {
    const request = this.supportRequests.get(requestId);
    if (request) {
      const likeIndex = request.likes.indexOf(playerId);
      if (likeIndex === -1) {
        request.likes.push(playerId);
      } else {
        request.likes.splice(likeIndex, 1);
      }
      saveRequestsToFile(this.supportRequests);
      return request;
    }
    return undefined;
  }

  markSupportRequestDone(requestId: string): SupportRequest | undefined {
    const request = this.supportRequests.get(requestId);
    if (request) {
      request.isDone = !request.isDone;
      saveRequestsToFile(this.supportRequests);
      return request;
    }
    return undefined;
  }

  deleteSupportRequest(requestId: string): boolean {
    const deleted = this.supportRequests.delete(requestId);
    if (deleted) {
      saveRequestsToFile(this.supportRequests);
    }
    return deleted;
  }

  addSong(
    name: string,
    filename: string,
    uploaderId: string,
    uploaderName: string,
    isPublic: boolean,
  ): Song {
    const song: Song = {
      id: randomUUID(),
      name,
      filename,
      uploaderId,
      uploaderName,
      isPublic,
      timestamp: Date.now(),
    };
    this.songs.set(song.id, song);
    saveSongsToFile(this.songs);
    return song;
  }

  getSongs(username: string): Song[] {
    const isAdminUser = this.isAdmin(username);
    const isVipUser = this.isVip(username);
    return Array.from(this.songs.values())
      .filter((song) => {
        if (song.isPublic) return true;
        if (isAdminUser) return true;
        if (song.uploaderName.toLowerCase() === username.toLowerCase())
          return true;
        return false;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getAllSongs(): Song[] {
    return Array.from(this.songs.values()).sort(
      (a, b) => b.timestamp - a.timestamp,
    );
  }

  getSong(id: string): Song | undefined {
    return this.songs.get(id);
  }

  deleteSong(id: string): boolean {
    const deleted = this.songs.delete(id);
    if (deleted) {
      saveSongsToFile(this.songs);
    }
    return deleted;
  }

  private ensureDefaultPlaylists(): void {
    const defaultPlaylists = [
      {
        id: "default-fun-vibes",
        name: "Fun Vibes",
        description: "Upbeat and energetic songs to keep the party going!",
        songIds: [],
        creatorId: "system",
        creatorName: "System",
        isPublic: true,
        timestamp: Date.now(),
      },
      {
        id: "default-sad-songs",
        name: "Sad Songs",
        description:
          "Emotional and melancholic tracks for those reflective moments.",
        songIds: [],
        creatorId: "system",
        creatorName: "System",
        isPublic: true,
        timestamp: Date.now(),
      },
    ];

    for (const defaultPlaylist of defaultPlaylists) {
      if (!this.playlists.has(defaultPlaylist.id)) {
        this.playlists.set(defaultPlaylist.id, defaultPlaylist);
      }
    }
    savePlaylistsToFile(this.playlists);
  }

  createPlaylist(
    name: string,
    description: string | null,
    creatorId: string,
    creatorName: string,
    isPublic: boolean,
  ): Playlist {
    const playlist: Playlist = {
      id: randomUUID(),
      name,
      description,
      songIds: [],
      creatorId,
      creatorName,
      isPublic,
      timestamp: Date.now(),
    };
    this.playlists.set(playlist.id, playlist);
    savePlaylistsToFile(this.playlists);
    return playlist;
  }

  getPlaylists(username: string): Playlist[] {
    const isAdminUser = this.isAdmin(username);
    return Array.from(this.playlists.values())
      .filter((playlist) => {
        if (playlist.isPublic) return true;
        if (isAdminUser) return true;
        if (playlist.creatorName.toLowerCase() === username.toLowerCase())
          return true;
        return false;
      })
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  getPlaylist(id: string): Playlist | undefined {
    return this.playlists.get(id);
  }

  updatePlaylist(id: string, updates: Partial<Playlist>): Playlist | undefined {
    const playlist = this.playlists.get(id);
    if (playlist) {
      const updated = { ...playlist, ...updates };
      this.playlists.set(id, updated);
      savePlaylistsToFile(this.playlists);
      return updated;
    }
    return undefined;
  }

  addSongToPlaylist(playlistId: string, songId: string): Playlist | undefined {
    const playlist = this.playlists.get(playlistId);
    if (playlist && !playlist.songIds.includes(songId)) {
      playlist.songIds.push(songId);
      this.playlists.set(playlistId, playlist);
      savePlaylistsToFile(this.playlists);
      return playlist;
    }
    return playlist;
  }

  removeSongFromPlaylist(
    playlistId: string,
    songId: string,
  ): Playlist | undefined {
    const playlist = this.playlists.get(playlistId);
    if (playlist) {
      playlist.songIds = playlist.songIds.filter((id) => id !== songId);
      this.playlists.set(playlistId, playlist);
      savePlaylistsToFile(this.playlists);
      return playlist;
    }
    return undefined;
  }

  deletePlaylist(id: string): boolean {
    const deleted = this.playlists.delete(id);
    if (deleted) {
      savePlaylistsToFile(this.playlists);
    }
    return deleted;
  }

  // Castles: Siege Dominion methods

  getCastlesLobby(vipOnly = false): CastlesLobby | undefined {
    return Array.from(this.castlesLobbies.values()).find(
      (l) => l.status === "waiting" && (l.vipOnly ?? false) === vipOnly,
    );
  }

  getCastlesLobbyById(id: string): CastlesLobby | undefined {
    return this.castlesLobbies.get(id);
  }

  createCastlesLobby(
    hostId: string,
    hostName: string,
    vipOnly = false,
  ): CastlesLobby {
    const lobby: CastlesLobby = {
      id: randomUUID(),
      hostId,
      players: [
        {
          id: hostId,
          name: hostName,
          team: "red",
          wood: 200,
          food: 200,
          isReady: false,
        },
      ],
      status: "waiting",
      minPlayers: 2,
      maxPlayers: 16,
      vipOnly,
    };
    this.castlesLobbies.set(lobby.id, lobby);
    return lobby;
  }

  joinCastlesLobby(
    lobbyId: string,
    playerId: string,
    playerName: string,
  ): CastlesLobby | undefined {
    const lobby = this.castlesLobbies.get(lobbyId);
    if (!lobby || lobby.status !== "waiting") return undefined;
    if (lobby.players.length >= lobby.maxPlayers) return undefined;
    if (lobby.players.find((p) => p.id === playerId)) return lobby;

    const redCount = lobby.players.filter((p) => p.team === "red").length;
    const blueCount = lobby.players.filter((p) => p.team === "blue").length;
    const team: CastlesTeam = redCount <= blueCount ? "red" : "blue";

    lobby.players.push({
      id: playerId,
      name: playerName,
      team,
      wood: 200,
      food: 200,
      isReady: false,
    });
    return lobby;
  }

  leaveCastlesLobby(
    lobbyId: string,
    playerId: string,
  ): CastlesLobby | undefined {
    const lobby = this.castlesLobbies.get(lobbyId);
    if (!lobby) return undefined;

    lobby.players = lobby.players.filter((p) => p.id !== playerId);

    if (lobby.players.length === 0) {
      this.castlesLobbies.delete(lobbyId);
      return undefined;
    }

    if (lobby.hostId === playerId) {
      lobby.hostId = lobby.players[0].id;
    }

    return lobby;
  }

  setCastlesTeam(
    lobbyId: string,
    playerId: string,
    team: CastlesTeam,
  ): CastlesLobby | undefined {
    const lobby = this.castlesLobbies.get(lobbyId);
    if (!lobby) return undefined;

    const player = lobby.players.find((p) => p.id === playerId);
    if (player) {
      player.team = team;
    }
    return lobby;
  }

  setCastlesReady(
    lobbyId: string,
    playerId: string,
    ready: boolean,
  ): CastlesLobby | undefined {
    const lobby = this.castlesLobbies.get(lobbyId);
    if (!lobby) return undefined;

    const player = lobby.players.find((p) => p.id === playerId);
    if (player) {
      player.isReady = ready;
    }
    return lobby;
  }

  startCastlesGame(lobbyId: string): CastlesGame | undefined {
    const lobby = this.castlesLobbies.get(lobbyId);
    if (!lobby || lobby.status !== "waiting") return undefined;

    const redPlayers = lobby.players.filter((p) => p.team === "red");
    const bluePlayers = lobby.players.filter((p) => p.team === "blue");

    lobby.status = "in_game";

    const mapWidth = 3000;
    const mapHeight = 2000;
    const units: CastlesUnit[] = [];
    const buildings: CastlesBuilding[] = [];
    const trees: CastlesTree[] = [];

    // --- MAP GENERATION ---
    const createBase = (team: CastlesTeam, cx: number, cy: number) => {
      // 1. Castle Center
      buildings.push({
        id: randomUUID(),
        type: "castle_center",
        team,
        x: cx,
        y: cy - 50,
        width: 120,
        height: 120,
        health: 5000,
        maxHealth: 5000,
      });

      // 2. Walls (Big 600x600 Square)
      const size = 600;
      const startX = cx - size / 2;
      const startY = cy - size / 2;
      const step = 40;

      const addBlock = (
        bx: number,
        by: number,
        type: "wall" | "gate" = "wall",
      ) => {
        buildings.push({
          id: randomUUID(),
          type,
          team,
          x: bx,
          y: by,
          width: 40,
          height: 40,
          health: type === "gate" ? 3000 : 2000,
          maxHealth: type === "gate" ? 3000 : 2000,
        });
      };

      // Draw Walls
      for (let x = startX; x <= startX + size; x += step) {
        addBlock(x, startY); // Top
        addBlock(x, startY + size); // Bottom
      }
      for (let y = startY + step; y < startY + size; y += step) {
        // Gates: Left Wall (Blue Gate), Right Wall (Red Gate)
        const isBlueGate = team === "blue" && Math.abs(y - cy) < 60;
        const isRedGate = team === "red" && Math.abs(y - cy) < 60;

        if (isBlueGate) addBlock(startX, y, "gate");
        else addBlock(startX, y);

        if (isRedGate) addBlock(startX + size, y, "gate");
        else addBlock(startX + size, y);
      }

      // 3. Trees Inside Castle - Spawn exactly 20 trees in 4 clusters of 5 trees
      const numClusters = 4;
      const treesPerCluster = 5;

      // Pre-define cluster positions to guarantee valid placement
      const clusterPositions = [
        { x: startX + size * 0.25, y: startY + size * 0.25 },
        { x: startX + size * 0.75, y: startY + size * 0.25 },
        { x: startX + size * 0.25, y: startY + size * 0.75 },
        { x: startX + size * 0.75, y: startY + size * 0.75 },
      ];

      for (let c = 0; c < numClusters; c++) {
        const clusterCenterX = clusterPositions[c].x;
        const clusterCenterY = clusterPositions[c].y;

        for (let i = 0; i < treesPerCluster; i++) {
          // Spawn trees close together within the cluster (within 40px radius)
          const angle =
            (i / treesPerCluster) * Math.PI * 2 + Math.random() * 0.5;
          const distance = 15 + Math.random() * 25; // 15-40px from cluster center
          const tx = clusterCenterX + Math.cos(angle) * distance;
          const ty = clusterCenterY + Math.sin(angle) * distance;

          trees.push({
            id: randomUUID(),
            x: tx,
            y: ty,
            wood: 500,
            // @ts-ignore
            maxWood: 500,
            isDepleted: false,
            respawnTime: 0,
          });
        }
      }
    };

    createBase("red", 400, mapHeight / 2);
    createBase("blue", mapWidth - 400, mapHeight / 2);

    // --- SPAWN WORKERS ---
    const spawnWorkers = (players: any[], baseX: number) => {
      players.forEach((player, idx) => {
        player.wood = 200;
        player.food = 200;
        for (let w = 0; w < 3; w++) {
          units.push({
            id: randomUUID(),
            type: "worker",
            team: player.team,
            ownerId: player.id,
            x: baseX + (Math.random() * 50 - 25),
            y: mapHeight / 2 + idx * 30 + w * 10,
            health: 50,
            maxHealth: 50,
            targetX: null,
            targetY: null,
            attackTarget: null,
            isGathering: false,
            gatherType: null,
            // @ts-ignore
            gatherTarget: null,
            carryingAmount: 0,
            lastActionTime: 0,
          });
        }
      });
    };

    spawnWorkers(redPlayers, 450);
    spawnWorkers(bluePlayers, mapWidth - 450);

    const game: CastlesGame = {
      id: randomUUID(),
      lobbyId,
      players: lobby.players.map((p) => ({ ...p, isReady: true })),
      units,
      buildings,
      trees,
      mapWidth,
      mapHeight,
      status: "playing",
      winner: null,
      tickCount: 0,
      lastTickTime: Date.now(),
    };

    this.castlesGames.set(game.id, game);

    // Start Engine
    const engine = new CastlesGameEngine(game, this);
    this.castlesEngines.set(game.id, engine);
    engine.startGame();

    return game;
  }

  getCastlesGame(gameId: string): CastlesGame | undefined {
    return this.castlesGames.get(gameId);
  }

  // --- ADD THIS METHOD ---
  updateCastlesGame(game: CastlesGame): void {
    this.castlesGames.set(game.id, game);
  }

  // Handle Commands from Client
  handleCastlesCommand(
    gameId: string,
    playerId: string,
    type: string,
    payload: any,
  ) {
    const game = this.castlesGames.get(gameId);
    if (!game || game.status !== "playing") return;

    const player = game.players.find((p) => p.id === playerId);
    if (!player) return;

    if (type === "move") {
      game.units
        .filter((u) => payload.unitIds.includes(u.id) && u.ownerId === playerId)
        .forEach((u) => {
          u.targetX = payload.targetX;
          u.targetY = payload.targetY;
          u.attackTarget = null;
          u.isGathering = false;
        });
    }

    if (type === "attack") {
      game.units
        .filter((u) => payload.unitIds.includes(u.id) && u.ownerId === playerId)
        .forEach((u) => {
          if (u.type !== "worker") {
            // Workers cannot attack
            u.attackTarget = payload.buildingId;
          }
        });
    }

    if (type === "gather") {
      // Payload: { unitIds, resourceType, targetId }
      // targetId is the ID of the tree or farm
      game.units
        .filter((u) => payload.unitIds.includes(u.id) && u.ownerId === playerId)
        .forEach((u) => {
          if (u.type === "worker") {
            const target =
              game.trees.find((t) => t.id === payload.targetId) ||
              game.buildings.find((b) => b.id === payload.targetId);

            if (target) {
              u.isGathering = true;
              u.gatherType = payload.resourceType;
              (u as any).gatherTarget = payload.targetId; // Store target ID
              u.attackTarget = null;
              u.targetX = target.x;
              u.targetY = target.y;
            }
          }
        });
    }

    if (type === "build") {
      const COSTS = {
        farm: 50,
        barracks: 100,
        catapult_factory: 150,
        wall: 20,
        gate: 50,
      };
      const STATS = {
        farm: { w: 60, h: 60, hp: 400 },
        barracks: { w: 80, h: 80, hp: 800 },
        catapult_factory: { w: 90, h: 90, hp: 1000 },
        wall: { w: 40, h: 40, hp: 2000 },
        gate: { w: 40, h: 40, hp: 3000 },
      };
      const cost = COSTS[payload.buildingType as keyof typeof COSTS];
      const stat = STATS[payload.buildingType as keyof typeof STATS];

      if (cost && player.wood >= cost) {
        const mapMidX = game.mapWidth / 2;
        const buildX = payload.targetX + stat.w / 2;

        const isRedTeamArea = buildX < mapMidX;
        const isBlueTeamArea = buildX >= mapMidX;

        const canBuild =
          (player.team === "red" && isRedTeamArea) ||
          (player.team === "blue" && isBlueTeamArea);

        if (canBuild) {
          player.wood -= cost;
          game.buildings.push({
            id: randomUUID(),
            type: payload.buildingType,
            team: player.team,
            x: payload.targetX,
            y: payload.targetY,
            width: stat.w,
            height: stat.h,
            health: stat.hp,
            maxHealth: stat.hp,
          });
        }
      }
    }

    if (type === "train") {
      const COSTS = {
        worker: { w: 50, f: 25 },
        soldier: { w: 0, f: 75 },
        archer: { w: 50, f: 50 },
        catapult: { w: 150, f: 0 },
      };
      const TRAIN_TIMES = {
        worker: 5000,
        soldier: 10000,
        archer: 10000,
        catapult: 60000,
      };
      const cost = COSTS[payload.unitType as keyof typeof COSTS];
      const trainTime =
        TRAIN_TIMES[payload.unitType as keyof typeof TRAIN_TIMES] || 10000;
      const building = game.buildings.find((b) => b.id === payload.buildingId);

      if (cost && building && player.wood >= cost.w && player.food >= cost.f) {
        player.wood -= cost.w;
        player.food -= cost.f;

        if (!(game as any).trainingQueue) {
          (game as any).trainingQueue = [];
        }

        (game as any).trainingQueue.push({
          id: randomUUID(),
          unitType: payload.unitType,
          team: player.team,
          ownerId: playerId,
          buildingId: building.id,
          completeTime: Date.now() + trainTime,
          rallyX: (building as any).rallyX ?? null,
          rallyY: (building as any).rallyY ?? null,
        });
      }
    }

    if (type === "destroy_building") {
      const building = game.buildings.find(
        (b) => b.id === payload.buildingId && b.team === player.team,
      );
      if (building && building.type !== "castle_center") {
        building.health = 0;
      }
    }

    if (type === "set_rally") {
      const building = game.buildings.find(
        (b) => b.id === payload.buildingId && b.team === player.team,
      );
      if (building) {
        (building as any).rallyX = payload.rallyX;
        (building as any).rallyY = payload.rallyY;
      }
    }
  }

  deleteCastlesGame(gameId: string): void {
    const engine = this.castlesEngines.get(gameId);
    if (engine) engine.stopGame();
    this.castlesEngines.delete(gameId);

    const game = this.castlesGames.get(gameId);
    if (game) {
      this.castlesLobbies.delete(game.lobbyId);
      this.castlesGames.delete(gameId);
    }
  }

  // =======================================================
  // Ships Battle Lobby & Game Methods
  // =======================================================

  getOrCreateShipsBattleLobby(
    playerId: string,
    playerName: string,
  ): ShipsBattleLobby {
    const existingLobby = this.getShipsBattleLobbyByPlayerId(playerId);
    if (existingLobby) return existingLobby;

    const waitingLobby = Array.from(this.shipsBattleLobbies.values()).find(
      (l) => l.status === "waiting" && l.players.length < l.maxPlayers,
    );

    if (waitingLobby) {
      waitingLobby.players.push({ id: playerId, name: playerName });
      this.shipsBattleLobbies.set(waitingLobby.id, waitingLobby);
      return waitingLobby;
    }

    const lobby: ShipsBattleLobby = {
      id: randomUUID(),
      players: [{ id: playerId, name: playerName }],
      hostId: playerId,
      status: "waiting",
      minPlayers: 2,
      maxPlayers: 2,
    };
    this.shipsBattleLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getShipsBattleLobby(id: string): ShipsBattleLobby | undefined {
    return this.shipsBattleLobbies.get(id);
  }

  getShipsBattleLobbyByPlayerId(
    playerId: string,
  ): ShipsBattleLobby | undefined {
    return Array.from(this.shipsBattleLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId),
    );
  }

  removePlayerFromShipsBattleLobby(lobbyId: string, playerId: string): void {
    const lobby = this.shipsBattleLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.shipsBattleLobbies.delete(lobbyId);
      } else {
        if (lobby.hostId === playerId) {
          lobby.hostId = lobby.players[0].id;
        }
        this.shipsBattleLobbies.set(lobbyId, lobby);
      }
    }
  }

  deleteShipsBattleLobby(id: string): void {
    this.shipsBattleLobbies.delete(id);
  }

  getAllShipsBattleLobbies(): ShipsBattleLobby[] {
    return Array.from(this.shipsBattleLobbies.values());
  }

  // Simple waiting list for matchmaking
  private shipsBattleWaitingList: Array<{
    id: string;
    playerId: string;
    playerName: string;
  }> = [];

  getWaitingShipsBattleLobby():
    | { id: string; playerId: string; playerName: string }
    | undefined {
    return this.shipsBattleWaitingList[0];
  }

  addShipsBattleLobby(playerId: string, playerName: string): string {
    const id = randomUUID();
    this.shipsBattleWaitingList.push({ id, playerId, playerName });
    return id;
  }

  removeShipsBattleLobby(lobbyId: string): void {
    this.shipsBattleWaitingList = this.shipsBattleWaitingList.filter(
      (l) => l.id !== lobbyId,
    );
  }

  removePlayerFromShipsBattleLobby(playerId: string): void {
    this.shipsBattleWaitingList = this.shipsBattleWaitingList.filter(
      (l) => l.playerId !== playerId,
    );
  }

  // Ships Battle Game Methods

  createShipsBattleGame(
    player1Id: string,
    player1Name: string,
    player2Id: string,
    player2Name: string,
  ): ShipsBattleGame {
    const game: ShipsBattleGame = {
      id: randomUUID(),
      player1: {
        id: player1Id,
        name: player1Name,
        ships: [],
        shots: [],
        isReady: false,
      },
      player2: {
        id: player2Id,
        name: player2Name,
        ships: [],
        shots: [],
        isReady: false,
      },
      currentTurn: player1Id,
      gridSize: 10,
      status: "placing",
      winner: null,
      winnerName: null,
      spectators: [],
    };
    this.shipsBattleGames.set(game.id, game);
    return game;
  }

  getShipsBattleGame(gameId: string): ShipsBattleGame | undefined {
    return this.shipsBattleGames.get(gameId);
  }

  placeShipsBattleShip(
    gameId: string,
    playerId: string,
    shipSize: number,
    positions: Array<{ x: number; y: number }>,
  ): ShipsBattleGame | undefined {
    const game = this.shipsBattleGames.get(gameId);
    if (!game || game.status !== "placing") return undefined;

    const player =
      game.player1.id === playerId
        ? game.player1
        : game.player2.id === playerId
          ? game.player2
          : null;
    if (!player) return undefined;

    const existingShipIndex = player.ships.findIndex(
      (s) => s.size === shipSize,
    );
    if (existingShipIndex !== -1) {
      player.ships.splice(existingShipIndex, 1);
    }

    const ship: ShipsBattleShip = {
      id: randomUUID(),
      size: shipSize,
      positions,
      hits: [],
      isSunk: false,
    };
    player.ships.push(ship);

    return game;
  }

  setShipsBattleReady(
    gameId: string,
    playerId: string,
  ): ShipsBattleGame | undefined {
    const game = this.shipsBattleGames.get(gameId);
    if (!game || game.status !== "placing") return undefined;

    const player =
      game.player1.id === playerId
        ? game.player1
        : game.player2.id === playerId
          ? game.player2
          : null;
    if (!player) return undefined;

    const requiredShips = [5, 4, 3, 3, 2];
    if (player.ships.length !== requiredShips.length) return undefined;

    player.isReady = true;

    if (game.player1.isReady && game.player2.isReady) {
      game.status = "playing";
    }

    return game;
  }

  shootShipsBattle(
    gameId: string,
    playerId: string,
    x: number,
    y: number,
  ):
    | {
        game: ShipsBattleGame;
        hit: boolean;
        sunk: boolean;
        shipSunk?: ShipsBattleShip;
      }
    | undefined {
    const game = this.shipsBattleGames.get(gameId);
    if (!game || game.status !== "playing") return undefined;
    if (game.currentTurn !== playerId) return undefined;

    const shooter = game.player1.id === playerId ? game.player1 : game.player2;
    const target = game.player1.id === playerId ? game.player2 : game.player1;

    if (shooter.shots.some((s) => s.x === x && s.y === y)) return undefined;

    let hit = false;
    let sunk = false;
    let shipSunk: ShipsBattleShip | undefined;

    for (const ship of target.ships) {
      const hitPos = ship.positions.find((p) => p.x === x && p.y === y);
      if (hitPos) {
        hit = true;
        ship.hits.push({ x, y });
        if (ship.hits.length === ship.positions.length) {
          ship.isSunk = true;
          sunk = true;
          shipSunk = ship;
        }
        break;
      }
    }

    shooter.shots.push({ x, y, hit });

    const allSunk = target.ships.every((s) => s.isSunk);
    if (allSunk) {
      game.status = "finished";
      game.winner = shooter.id;
      game.winnerName = shooter.name;
      appendToGameLogFile("Ships Battle", shooter.name, target.name, false);
    } else {
      game.currentTurn = target.id;
    }

    return { game, hit, sunk, shipSunk };
  }

  leaveShipsBattleGame(
    gameId: string,
    playerId: string,
  ): ShipsBattleGame | undefined {
    const game = this.shipsBattleGames.get(gameId);
    if (!game) return undefined;

    if (game.status !== "finished") {
      const winner = game.player1.id === playerId ? game.player2 : game.player1;
      game.status = "finished";
      game.winner = winner.id;
      game.winnerName = winner.name;
    }

    return game;
  }

  deleteShipsBattleGame(gameId: string): void {
    this.shipsBattleGames.delete(gameId);
  }

  // ========== BATTLESHIP STORAGE ==========
  getOrCreateBattleshipLobby(playerId: string, playerName: string): BattleshipLobby {
    const existing = Array.from(this.battleshipLobbies.values()).find(
      (l) => l.status === "waiting" && l.players.length < 2
    );

    if (existing) {
      if (!existing.players.find((p) => p.id === playerId)) {
        existing.players.push({ id: playerId, name: playerName });
      }
      return existing;
    }

    const lobby: BattleshipLobby = {
      id: randomUUID(),
      hostId: playerId,
      players: [{ id: playerId, name: playerName }],
      status: "waiting",
      minPlayers: 2,
      maxPlayers: 2,
    };
    this.battleshipLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getBattleshipLobby(id: string): BattleshipLobby | undefined {
    return this.battleshipLobbies.get(id);
  }

  getBattleshipLobbyByPlayerId(playerId: string): BattleshipLobby | undefined {
    return Array.from(this.battleshipLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId)
    );
  }

  removePlayerFromBattleshipLobby(lobbyId: string, playerId: string): void {
    const lobby = this.battleshipLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.battleshipLobbies.delete(lobbyId);
      } else {
        if (lobby.hostId === playerId) {
          lobby.hostId = lobby.players[0].id;
        }
      }
    }
  }

  createBattleshipGame(lobby: BattleshipLobby): BattleshipGame {
    const game: BattleshipGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p) => ({
        id: p.id,
        name: p.name,
        ships: [],
        shots: [],
        isReady: false,
      })),
      currentTurn: lobby.players[0].id,
      gridSize: 10,
      status: "setup",
      winner: null,
      winnerName: null,
      turnTimeRemaining: 30,
    };
    this.battleshipGames.set(game.id, game);
    this.battleshipLobbies.delete(lobby.id);
    return game;
  }

  getBattleshipGame(id: string): BattleshipGame | undefined {
    return this.battleshipGames.get(id);
  }

  getBattleshipGameByPlayerId(playerId: string): BattleshipGame | undefined {
    return Array.from(this.battleshipGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId)
    );
  }

  updateBattleshipGame(id: string, updates: Partial<BattleshipGame>): BattleshipGame | undefined {
    const game = this.battleshipGames.get(id);
    if (game) {
      Object.assign(game, updates);
      return game;
    }
    return undefined;
  }

  deleteBattleshipGame(id: string): void {
    this.battleshipGames.delete(id);
  }

  getAllBattleshipLobbies(): BattleshipLobby[] {
    return Array.from(this.battleshipLobbies.values());
  }

  // ========== CAPTURE THE FLAG STORAGE ==========
  getOrCreateCTFLobby(playerId: string, playerName: string): CTFLobby {
    const existing = Array.from(this.ctfLobbies.values()).find(
      (l) => l.status === "waiting" && l.players.length < 8
    );

    if (existing) {
      if (!existing.players.find((p) => p.id === playerId)) {
        const redCount = existing.players.filter((p) => p.team === "red").length;
        const blueCount = existing.players.filter((p) => p.team === "blue").length;
        const team: CTFTeam = redCount <= blueCount ? "red" : "blue";
        existing.players.push({ id: playerId, name: playerName, team, isReady: false });
      }
      return existing;
    }

    const lobby: CTFLobby = {
      id: randomUUID(),
      hostId: playerId,
      players: [{ id: playerId, name: playerName, team: "red", isReady: false }],
      status: "waiting",
      minPlayers: 2,
      maxPlayers: 8,
    };
    this.ctfLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getCTFLobby(id: string): CTFLobby | undefined {
    return this.ctfLobbies.get(id);
  }

  getCTFLobbyByPlayerId(playerId: string): CTFLobby | undefined {
    return Array.from(this.ctfLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId)
    );
  }

  setCTFTeam(lobbyId: string, playerId: string, team: CTFTeam): CTFLobby | undefined {
    const lobby = this.ctfLobbies.get(lobbyId);
    if (lobby) {
      const player = lobby.players.find((p) => p.id === playerId);
      if (player) {
        player.team = team;
      }
      return lobby;
    }
    return undefined;
  }

  setCTFReady(lobbyId: string, playerId: string, ready: boolean): CTFLobby | undefined {
    const lobby = this.ctfLobbies.get(lobbyId);
    if (lobby) {
      const player = lobby.players.find((p) => p.id === playerId);
      if (player) {
        player.isReady = ready;
      }
      return lobby;
    }
    return undefined;
  }

  removePlayerFromCTFLobby(lobbyId: string, playerId: string): void {
    const lobby = this.ctfLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.ctfLobbies.delete(lobbyId);
      } else {
        if (lobby.hostId === playerId) {
          lobby.hostId = lobby.players[0].id;
        }
      }
    }
  }

  createCTFGame(lobby: CTFLobby): CTFGame {
    const mapWidth = 800;
    const mapHeight = 500;
    
    const game: CTFGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p) => ({
        id: p.id,
        name: p.name,
        team: p.team,
        x: p.team === "red" ? 50 : mapWidth - 50,
        y: mapHeight / 2,
        hasFlag: false,
        isStunned: false,
        stunEndTime: null,
        captures: 0,
        tags: 0,
      })),
      redFlagPosition: { x: 50, y: mapHeight / 2 },
      blueFlagPosition: { x: mapWidth - 50, y: mapHeight / 2 },
      redFlagCarrier: null,
      blueFlagCarrier: null,
      redScore: 0,
      blueScore: 0,
      scoreLimit: 3,
      mapWidth,
      mapHeight,
      gameTimeRemaining: 300,
      status: "playing",
      winner: null,
    };
    this.ctfGames.set(game.id, game);
    this.ctfLobbies.delete(lobby.id);
    return game;
  }

  getCTFGame(id: string): CTFGame | undefined {
    return this.ctfGames.get(id);
  }

  getCTFGameByPlayerId(playerId: string): CTFGame | undefined {
    return Array.from(this.ctfGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId)
    );
  }

  updateCTFGame(id: string, updates: Partial<CTFGame>): CTFGame | undefined {
    const game = this.ctfGames.get(id);
    if (game) {
      Object.assign(game, updates);
      return game;
    }
    return undefined;
  }

  deleteCTFGame(id: string): void {
    this.ctfGames.delete(id);
  }

  getAllCTFLobbies(): CTFLobby[] {
    return Array.from(this.ctfLobbies.values());
  }

  // ========== SIEGE WAR STORAGE ==========
  getOrCreateSiegeWarLobby(playerId: string, playerName: string): SiegeWarLobby {
    const existing = Array.from(this.siegeWarLobbies.values()).find(
      (l) => l.status === "waiting" && l.players.length < 6
    );

    if (existing) {
      if (!existing.players.find((p) => p.id === playerId)) {
        const attackerCount = existing.players.filter((p) => p.team === "attackers").length;
        const defenderCount = existing.players.filter((p) => p.team === "defenders").length;
        const team: SiegeWarTeam = attackerCount <= defenderCount ? "attackers" : "defenders";
        existing.players.push({ id: playerId, name: playerName, team, isReady: false });
      }
      return existing;
    }

    const lobby: SiegeWarLobby = {
      id: randomUUID(),
      hostId: playerId,
      players: [{ id: playerId, name: playerName, team: "attackers", isReady: false }],
      status: "waiting",
      minPlayers: 2,
      maxPlayers: 6,
    };
    this.siegeWarLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getSiegeWarLobby(id: string): SiegeWarLobby | undefined {
    return this.siegeWarLobbies.get(id);
  }

  getSiegeWarLobbyByPlayerId(playerId: string): SiegeWarLobby | undefined {
    return Array.from(this.siegeWarLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId)
    );
  }

  setSiegeWarTeam(lobbyId: string, playerId: string, team: SiegeWarTeam): SiegeWarLobby | undefined {
    const lobby = this.siegeWarLobbies.get(lobbyId);
    if (lobby) {
      const player = lobby.players.find((p) => p.id === playerId);
      if (player) {
        player.team = team;
      }
      return lobby;
    }
    return undefined;
  }

  setSiegeWarReady(lobbyId: string, playerId: string, ready: boolean): SiegeWarLobby | undefined {
    const lobby = this.siegeWarLobbies.get(lobbyId);
    if (lobby) {
      const player = lobby.players.find((p) => p.id === playerId);
      if (player) {
        player.isReady = ready;
      }
      return lobby;
    }
    return undefined;
  }

  removePlayerFromSiegeWarLobby(lobbyId: string, playerId: string): void {
    const lobby = this.siegeWarLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.siegeWarLobbies.delete(lobbyId);
      } else {
        if (lobby.hostId === playerId) {
          lobby.hostId = lobby.players[0].id;
        }
      }
    }
  }

  createSiegeWarGame(lobby: SiegeWarLobby): SiegeWarGame {
    const mapWidth = 1000;
    const mapHeight = 600;
    
    const buildings: SiegeWarBuilding[] = [
      { id: randomUUID(), type: "wall", team: "defenders", x: 700, y: 100, width: 40, height: 100, health: 1000, maxHealth: 1000 },
      { id: randomUUID(), type: "wall", team: "defenders", x: 700, y: 400, width: 40, height: 100, health: 1000, maxHealth: 1000 },
      { id: randomUUID(), type: "gate", team: "defenders", x: 700, y: 250, width: 40, height: 100, health: 1500, maxHealth: 1500 },
      { id: randomUUID(), type: "tower", team: "defenders", x: 750, y: 50, width: 60, height: 60, health: 800, maxHealth: 800 },
      { id: randomUUID(), type: "tower", team: "defenders", x: 750, y: 450, width: 60, height: 60, health: 800, maxHealth: 800 },
    ];

    const game: SiegeWarGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p) => ({
        id: p.id,
        name: p.name,
        team: p.team,
        gold: 100,
        unitsSpawned: 0,
      })),
      units: [],
      buildings,
      mapWidth,
      mapHeight,
      castleHealth: 5000,
      castleMaxHealth: 5000,
      gameTimeRemaining: 600,
      waveNumber: 1,
      status: "playing",
      winner: null,
    };
    this.siegeWarGames.set(game.id, game);
    this.siegeWarLobbies.delete(lobby.id);
    return game;
  }

  getSiegeWarGame(id: string): SiegeWarGame | undefined {
    return this.siegeWarGames.get(id);
  }

  getSiegeWarGameByPlayerId(playerId: string): SiegeWarGame | undefined {
    return Array.from(this.siegeWarGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId)
    );
  }

  updateSiegeWarGame(id: string, updates: Partial<SiegeWarGame>): SiegeWarGame | undefined {
    const game = this.siegeWarGames.get(id);
    if (game) {
      Object.assign(game, updates);
      return game;
    }
    return undefined;
  }

  deleteSiegeWarGame(id: string): void {
    this.siegeWarGames.delete(id);
  }

  getAllSiegeWarLobbies(): SiegeWarLobby[] {
    return Array.from(this.siegeWarLobbies.values());
  }

  // ========== SKY FORTRESS SIEGE STORAGE ==========
  getOrCreateSkyFortressLobby(playerId: string, playerName: string): SkyFortressLobby {
    const existing = Array.from(this.skyFortressLobbies.values()).find(
      (l) => l.status === "waiting" && l.players.length < 6
    );
    if (existing) {
      if (!existing.players.find((p) => p.id === playerId)) {
        const redCount = existing.players.filter((p) => p.team === "red").length;
        const blueCount = existing.players.filter((p) => p.team === "blue").length;
        const team: SkyFortressTeam = redCount <= blueCount ? "red" : "blue";
        existing.players.push({ id: playerId, name: playerName, team, isReady: false });
      }
      return existing;
    }
    const lobby: SkyFortressLobby = {
      id: randomUUID(),
      hostId: playerId,
      players: [{ id: playerId, name: playerName, team: "red", isReady: false }],
      status: "waiting",
      minPlayers: 2,
      maxPlayers: 6,
    };
    this.skyFortressLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getSkyFortressLobby(id: string): SkyFortressLobby | undefined {
    return this.skyFortressLobbies.get(id);
  }

  getSkyFortressLobbyByPlayerId(playerId: string): SkyFortressLobby | undefined {
    return Array.from(this.skyFortressLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId)
    );
  }

  setSkyFortressTeam(lobbyId: string, playerId: string, team: SkyFortressTeam): SkyFortressLobby | undefined {
    const lobby = this.skyFortressLobbies.get(lobbyId);
    if (lobby) {
      const player = lobby.players.find((p) => p.id === playerId);
      if (player) player.team = team;
      return lobby;
    }
    return undefined;
  }

  setSkyFortressReady(lobbyId: string, playerId: string, ready: boolean): SkyFortressLobby | undefined {
    const lobby = this.skyFortressLobbies.get(lobbyId);
    if (lobby) {
      const player = lobby.players.find((p) => p.id === playerId);
      if (player) player.isReady = ready;
      return lobby;
    }
    return undefined;
  }

  removePlayerFromSkyFortressLobby(lobbyId: string, playerId: string): void {
    const lobby = this.skyFortressLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.skyFortressLobbies.delete(lobbyId);
      } else if (lobby.hostId === playerId) {
        lobby.hostId = lobby.players[0].id;
      }
    }
  }

  deleteSkyFortressLobby(id: string): void {
    this.skyFortressLobbies.delete(id);
  }

  createSkyFortressGame(lobby: SkyFortressLobby): SkyFortressGame {
    const game: SkyFortressGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p, i) => ({
        id: p.id,
        name: p.name,
        team: p.team,
        fortressX: p.team === "red" ? 100 : 700,
        fortressY: 150 + (i * 100),
        fortressHealth: 1000,
        shield: 100,
        missiles: 10,
        drones: 5,
        score: 0,
      })),
      projectiles: [],
      mapWidth: 800,
      mapHeight: 600,
      status: "playing",
      winner: null,
    };
    this.skyFortressGames.set(game.id, game);
    this.skyFortressLobbies.delete(lobby.id);
    return game;
  }

  getSkyFortressGame(id: string): SkyFortressGame | undefined {
    return this.skyFortressGames.get(id);
  }

  getSkyFortressGameByPlayerId(playerId: string): SkyFortressGame | undefined {
    return Array.from(this.skyFortressGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId)
    );
  }

  updateSkyFortressGame(id: string, updates: Partial<SkyFortressGame>): SkyFortressGame | undefined {
    const game = this.skyFortressGames.get(id);
    if (game) {
      Object.assign(game, updates);
      return game;
    }
    return undefined;
  }

  deleteSkyFortressGame(id: string): void {
    this.skyFortressGames.delete(id);
  }

  getAllSkyFortressLobbies(): SkyFortressLobby[] {
    return Array.from(this.skyFortressLobbies.values());
  }

  // ========== TIME RIFT TACTICS STORAGE ==========
  getOrCreateTimeRiftLobby(playerId: string, playerName: string): TimeRiftLobby {
    const existing = Array.from(this.timeRiftLobbies.values()).find(
      (l) => l.status === "waiting" && l.players.length < 6
    );
    if (existing) {
      if (!existing.players.find((p) => p.id === playerId)) {
        const chronoCount = existing.players.filter((p) => p.team === "chrono").length;
        const temporalCount = existing.players.filter((p) => p.team === "temporal").length;
        const team: TimeRiftTeam = chronoCount <= temporalCount ? "chrono" : "temporal";
        existing.players.push({ id: playerId, name: playerName, team, isReady: false });
      }
      return existing;
    }
    const lobby: TimeRiftLobby = {
      id: randomUUID(),
      hostId: playerId,
      players: [{ id: playerId, name: playerName, team: "chrono", isReady: false }],
      status: "waiting",
      minPlayers: 2,
      maxPlayers: 6,
    };
    this.timeRiftLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getTimeRiftLobby(id: string): TimeRiftLobby | undefined {
    return this.timeRiftLobbies.get(id);
  }

  getTimeRiftLobbyByPlayerId(playerId: string): TimeRiftLobby | undefined {
    return Array.from(this.timeRiftLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId)
    );
  }

  setTimeRiftTeam(lobbyId: string, playerId: string, team: TimeRiftTeam): TimeRiftLobby | undefined {
    const lobby = this.timeRiftLobbies.get(lobbyId);
    if (lobby) {
      const player = lobby.players.find((p) => p.id === playerId);
      if (player) player.team = team;
      return lobby;
    }
    return undefined;
  }

  setTimeRiftReady(lobbyId: string, playerId: string, ready: boolean): TimeRiftLobby | undefined {
    const lobby = this.timeRiftLobbies.get(lobbyId);
    if (lobby) {
      const player = lobby.players.find((p) => p.id === playerId);
      if (player) player.isReady = ready;
      return lobby;
    }
    return undefined;
  }

  removePlayerFromTimeRiftLobby(lobbyId: string, playerId: string): void {
    const lobby = this.timeRiftLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.timeRiftLobbies.delete(lobbyId);
      } else if (lobby.hostId === playerId) {
        lobby.hostId = lobby.players[0].id;
      }
    }
  }

  deleteTimeRiftLobby(id: string): void {
    this.timeRiftLobbies.delete(id);
  }

  createTimeRiftGame(lobby: TimeRiftLobby): TimeRiftGame {
    const game: TimeRiftGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p, i) => ({
        id: p.id,
        name: p.name,
        team: p.team,
        x: p.team === "chrono" ? 100 : 700,
        y: 150 + (i * 80),
        health: 100,
        timeEnergy: 100,
        kills: 0,
        deaths: 0,
      })),
      projectiles: [],
      chronoScore: 0,
      temporalScore: 0,
      scoreLimit: 10,
      mapWidth: 800,
      mapHeight: 600,
      status: "playing",
      winner: null,
    };
    this.timeRiftGames.set(game.id, game);
    this.timeRiftLobbies.delete(lobby.id);
    return game;
  }

  getTimeRiftGame(id: string): TimeRiftGame | undefined {
    return this.timeRiftGames.get(id);
  }

  getTimeRiftGameByPlayerId(playerId: string): TimeRiftGame | undefined {
    return Array.from(this.timeRiftGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId)
    );
  }

  updateTimeRiftGame(id: string, updates: Partial<TimeRiftGame>): TimeRiftGame | undefined {
    const game = this.timeRiftGames.get(id);
    if (game) {
      Object.assign(game, updates);
      return game;
    }
    return undefined;
  }

  deleteTimeRiftGame(id: string): void {
    this.timeRiftGames.delete(id);
  }

  getAllTimeRiftLobbies(): TimeRiftLobby[] {
    return Array.from(this.timeRiftLobbies.values());
  }

  // ========== SHADOW OPS STORAGE ==========
  getOrCreateShadowOpsLobby(playerId: string, playerName: string): ShadowOpsLobby {
    const existing = Array.from(this.shadowOpsLobbies.values()).find(
      (l) => l.status === "waiting" && l.players.length < 8
    );
    if (existing) {
      if (!existing.players.find((p) => p.id === playerId)) {
        const infiltratorsCount = existing.players.filter((p) => p.team === "infiltrators").length;
        const defendersCount = existing.players.filter((p) => p.team === "defenders").length;
        const team: ShadowOpsTeam = infiltratorsCount <= defendersCount ? "infiltrators" : "defenders";
        existing.players.push({ id: playerId, name: playerName, team, isReady: false });
      }
      return existing;
    }
    const lobby: ShadowOpsLobby = {
      id: randomUUID(),
      hostId: playerId,
      players: [{ id: playerId, name: playerName, team: "infiltrators", isReady: false }],
      status: "waiting",
      minPlayers: 2,
      maxPlayers: 8,
    };
    this.shadowOpsLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getShadowOpsLobby(id: string): ShadowOpsLobby | undefined {
    return this.shadowOpsLobbies.get(id);
  }

  getShadowOpsLobbyByPlayerId(playerId: string): ShadowOpsLobby | undefined {
    return Array.from(this.shadowOpsLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId)
    );
  }

  setShadowOpsTeam(lobbyId: string, playerId: string, team: ShadowOpsTeam): ShadowOpsLobby | undefined {
    const lobby = this.shadowOpsLobbies.get(lobbyId);
    if (lobby) {
      const player = lobby.players.find((p) => p.id === playerId);
      if (player) player.team = team;
      return lobby;
    }
    return undefined;
  }

  setShadowOpsReady(lobbyId: string, playerId: string, ready: boolean): ShadowOpsLobby | undefined {
    const lobby = this.shadowOpsLobbies.get(lobbyId);
    if (lobby) {
      const player = lobby.players.find((p) => p.id === playerId);
      if (player) player.isReady = ready;
      return lobby;
    }
    return undefined;
  }

  removePlayerFromShadowOpsLobby(lobbyId: string, playerId: string): void {
    const lobby = this.shadowOpsLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.shadowOpsLobbies.delete(lobbyId);
      } else if (lobby.hostId === playerId) {
        lobby.hostId = lobby.players[0].id;
      }
    }
  }

  deleteShadowOpsLobby(id: string): void {
    this.shadowOpsLobbies.delete(id);
  }

  createShadowOpsGame(lobby: ShadowOpsLobby): ShadowOpsGame {
    const game: ShadowOpsGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p, i) => ({
        id: p.id,
        name: p.name,
        team: p.team,
        x: p.team === "infiltrators" ? 50 : 750,
        y: 100 + (i * 60),
        health: 100,
        ammo: 30,
        isStealthed: false,
        detectionLevel: 0,
        kills: 0,
        deaths: 0,
      })),
      objectives: [
        { id: randomUUID(), x: 400, y: 150, type: "intel", completed: false, completedBy: null },
        { id: randomUUID(), x: 600, y: 300, type: "sabotage", completed: false, completedBy: null },
        { id: randomUUID(), x: 500, y: 500, type: "extract", completed: false, completedBy: null },
      ],
      infiltratorsScore: 0,
      defendersScore: 0,
      mapWidth: 800,
      mapHeight: 600,
      roundTimeRemaining: 180,
      status: "playing",
      winner: null,
    };
    this.shadowOpsGames.set(game.id, game);
    this.shadowOpsLobbies.delete(lobby.id);
    return game;
  }

  getShadowOpsGame(id: string): ShadowOpsGame | undefined {
    return this.shadowOpsGames.get(id);
  }

  getShadowOpsGameByPlayerId(playerId: string): ShadowOpsGame | undefined {
    return Array.from(this.shadowOpsGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId)
    );
  }

  updateShadowOpsGame(id: string, updates: Partial<ShadowOpsGame>): ShadowOpsGame | undefined {
    const game = this.shadowOpsGames.get(id);
    if (game) {
      Object.assign(game, updates);
      return game;
    }
    return undefined;
  }

  deleteShadowOpsGame(id: string): void {
    this.shadowOpsGames.delete(id);
  }

  getAllShadowOpsLobbies(): ShadowOpsLobby[] {
    return Array.from(this.shadowOpsLobbies.values());
  }

  // ========== ELEMENTAL CONQUEST STORAGE ==========
  getOrCreateElementalLobby(playerId: string, playerName: string): ElementalLobby {
    const existing = Array.from(this.elementalLobbies.values()).find(
      (l) => l.status === "waiting" && l.players.length < 6
    );
    if (existing) {
      if (!existing.players.find((p) => p.id === playerId)) {
        const fireCount = existing.players.filter((p) => p.team === "fire").length;
        const waterCount = existing.players.filter((p) => p.team === "water").length;
        const team: ElementalTeam = fireCount <= waterCount ? "fire" : "water";
        existing.players.push({ id: playerId, name: playerName, team, isReady: false });
      }
      return existing;
    }
    const lobby: ElementalLobby = {
      id: randomUUID(),
      hostId: playerId,
      players: [{ id: playerId, name: playerName, team: "fire", isReady: false }],
      status: "waiting",
      minPlayers: 2,
      maxPlayers: 6,
    };
    this.elementalLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getElementalLobby(id: string): ElementalLobby | undefined {
    return this.elementalLobbies.get(id);
  }

  getElementalLobbyByPlayerId(playerId: string): ElementalLobby | undefined {
    return Array.from(this.elementalLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId)
    );
  }

  setElementalTeam(lobbyId: string, playerId: string, team: ElementalTeam): ElementalLobby | undefined {
    const lobby = this.elementalLobbies.get(lobbyId);
    if (lobby) {
      const player = lobby.players.find((p) => p.id === playerId);
      if (player) player.team = team;
      return lobby;
    }
    return undefined;
  }

  setElementalReady(lobbyId: string, playerId: string, ready: boolean): ElementalLobby | undefined {
    const lobby = this.elementalLobbies.get(lobbyId);
    if (lobby) {
      const player = lobby.players.find((p) => p.id === playerId);
      if (player) player.isReady = ready;
      return lobby;
    }
    return undefined;
  }

  removePlayerFromElementalLobby(lobbyId: string, playerId: string): void {
    const lobby = this.elementalLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.elementalLobbies.delete(lobbyId);
      } else if (lobby.hostId === playerId) {
        lobby.hostId = lobby.players[0].id;
      }
    }
  }

  deleteElementalLobby(id: string): void {
    this.elementalLobbies.delete(id);
  }

  createElementalGame(lobby: ElementalLobby): ElementalGame {
    const game: ElementalGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p, i) => ({
        id: p.id,
        name: p.name,
        team: p.team,
        x: p.team === "fire" ? 100 : 700,
        y: 150 + (i * 80),
        health: 100,
        mana: 100,
        currentElement: p.team === "fire" ? "fire" : "water",
        kills: 0,
        deaths: 0,
      })),
      projectiles: [],
      areaEffects: [],
      fireScore: 0,
      waterScore: 0,
      scoreLimit: 10,
      mapWidth: 800,
      mapHeight: 600,
      status: "playing",
      winner: null,
    };
    this.elementalGames.set(game.id, game);
    this.elementalLobbies.delete(lobby.id);
    return game;
  }

  getElementalGame(id: string): ElementalGame | undefined {
    return this.elementalGames.get(id);
  }

  getElementalGameByPlayerId(playerId: string): ElementalGame | undefined {
    return Array.from(this.elementalGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId)
    );
  }

  updateElementalGame(id: string, updates: Partial<ElementalGame>): ElementalGame | undefined {
    const game = this.elementalGames.get(id);
    if (game) {
      Object.assign(game, updates);
      return game;
    }
    return undefined;
  }

  deleteElementalGame(id: string): void {
    this.elementalGames.delete(id);
  }

  getAllElementalLobbies(): ElementalLobby[] {
    return Array.from(this.elementalLobbies.values());
  }

  // ========== MECH ARENA STORAGE ==========
  getOrCreateMechLobby(playerId: string, playerName: string): MechLobby {
    const existing = Array.from(this.mechLobbies.values()).find(
      (l) => l.status === "waiting" && l.players.length < 6
    );
    if (existing) {
      if (!existing.players.find((p) => p.id === playerId)) {
        const alphaCount = existing.players.filter((p) => p.team === "alpha").length;
        const omegaCount = existing.players.filter((p) => p.team === "omega").length;
        const team: MechTeam = alphaCount <= omegaCount ? "alpha" : "omega";
        existing.players.push({ id: playerId, name: playerName, team, isReady: false });
      }
      return existing;
    }
    const lobby: MechLobby = {
      id: randomUUID(),
      hostId: playerId,
      players: [{ id: playerId, name: playerName, team: "alpha", isReady: false }],
      status: "waiting",
      minPlayers: 2,
      maxPlayers: 6,
    };
    this.mechLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getMechLobby(id: string): MechLobby | undefined {
    return this.mechLobbies.get(id);
  }

  getMechLobbyByPlayerId(playerId: string): MechLobby | undefined {
    return Array.from(this.mechLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId)
    );
  }

  setMechTeam(lobbyId: string, playerId: string, team: MechTeam): MechLobby | undefined {
    const lobby = this.mechLobbies.get(lobbyId);
    if (lobby) {
      const player = lobby.players.find((p) => p.id === playerId);
      if (player) player.team = team;
      return lobby;
    }
    return undefined;
  }

  setMechReady(lobbyId: string, playerId: string, ready: boolean): MechLobby | undefined {
    const lobby = this.mechLobbies.get(lobbyId);
    if (lobby) {
      const player = lobby.players.find((p) => p.id === playerId);
      if (player) player.isReady = ready;
      return lobby;
    }
    return undefined;
  }

  removePlayerFromMechLobby(lobbyId: string, playerId: string): void {
    const lobby = this.mechLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.mechLobbies.delete(lobbyId);
      } else if (lobby.hostId === playerId) {
        lobby.hostId = lobby.players[0].id;
      }
    }
  }

  deleteMechLobby(id: string): void {
    this.mechLobbies.delete(id);
  }

  createMechGame(lobby: MechLobby): MechGame {
    const game: MechGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p, i) => ({
        id: p.id,
        name: p.name,
        team: p.team,
        x: p.team === "alpha" ? 100 : 700,
        y: 150 + (i * 80),
        health: 200,
        armor: 50,
        energy: 100,
        resources: 0,
        weaponLevel: 1,
        kills: 0,
        deaths: 0,
      })),
      resourceNodes: [
        { id: randomUUID(), x: 400, y: 150, amount: 100, type: "energy" },
        { id: randomUUID(), x: 300, y: 300, amount: 100, type: "metal" },
        { id: randomUUID(), x: 500, y: 450, amount: 100, type: "tech" },
      ],
      projectiles: [],
      alphaScore: 0,
      omegaScore: 0,
      scoreLimit: 10,
      mapWidth: 800,
      mapHeight: 600,
      status: "playing",
      winner: null,
    };
    this.mechGames.set(game.id, game);
    this.mechLobbies.delete(lobby.id);
    return game;
  }

  getMechGame(id: string): MechGame | undefined {
    return this.mechGames.get(id);
  }

  getMechGameByPlayerId(playerId: string): MechGame | undefined {
    return Array.from(this.mechGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId)
    );
  }

  updateMechGame(id: string, updates: Partial<MechGame>): MechGame | undefined {
    const game = this.mechGames.get(id);
    if (game) {
      Object.assign(game, updates);
      return game;
    }
    return undefined;
  }

  deleteMechGame(id: string): void {
    this.mechGames.delete(id);
  }

  getAllMechLobbies(): MechLobby[] {
    return Array.from(this.mechLobbies.values());
  }

  // ========== ASSASSIN'S GRID STORAGE ==========
  getOrCreateAssassinLobby(playerId: string, playerName: string): AssassinLobby {
    const existing = Array.from(this.assassinLobbies.values()).find(
      (l) => l.status === "waiting" && l.players.length < 6
    );
    if (existing) {
      if (!existing.players.find((p) => p.id === playerId)) {
        const shadowCount = existing.players.filter((p) => p.team === "shadow").length;
        const bladeCount = existing.players.filter((p) => p.team === "blade").length;
        const team: AssassinTeam = shadowCount <= bladeCount ? "shadow" : "blade";
        existing.players.push({ id: playerId, name: playerName, team, isReady: false });
      }
      return existing;
    }
    const lobby: AssassinLobby = {
      id: randomUUID(),
      hostId: playerId,
      players: [{ id: playerId, name: playerName, team: "shadow", isReady: false }],
      status: "waiting",
      minPlayers: 2,
      maxPlayers: 6,
    };
    this.assassinLobbies.set(lobby.id, lobby);
    return lobby;
  }

  getAssassinLobby(id: string): AssassinLobby | undefined {
    return this.assassinLobbies.get(id);
  }

  getAssassinLobbyByPlayerId(playerId: string): AssassinLobby | undefined {
    return Array.from(this.assassinLobbies.values()).find((l) =>
      l.players.some((p) => p.id === playerId)
    );
  }

  setAssassinTeam(lobbyId: string, playerId: string, team: AssassinTeam): AssassinLobby | undefined {
    const lobby = this.assassinLobbies.get(lobbyId);
    if (lobby) {
      const player = lobby.players.find((p) => p.id === playerId);
      if (player) player.team = team;
      return lobby;
    }
    return undefined;
  }

  setAssassinReady(lobbyId: string, playerId: string, ready: boolean): AssassinLobby | undefined {
    const lobby = this.assassinLobbies.get(lobbyId);
    if (lobby) {
      const player = lobby.players.find((p) => p.id === playerId);
      if (player) player.isReady = ready;
      return lobby;
    }
    return undefined;
  }

  removePlayerFromAssassinLobby(lobbyId: string, playerId: string): void {
    const lobby = this.assassinLobbies.get(lobbyId);
    if (lobby) {
      lobby.players = lobby.players.filter((p) => p.id !== playerId);
      if (lobby.players.length === 0) {
        this.assassinLobbies.delete(lobbyId);
      } else if (lobby.hostId === playerId) {
        lobby.hostId = lobby.players[0].id;
      }
    }
  }

  deleteAssassinLobby(id: string): void {
    this.assassinLobbies.delete(id);
  }

  createAssassinGame(lobby: AssassinLobby): AssassinGame {
    const gridWidth = 16;
    const gridHeight = 12;
    const grid: Array<Array<{ type: "floor" | "wall" | "shadow" | "trap"; occupiedBy: string | null }>> = [];
    for (let y = 0; y < gridHeight; y++) {
      const row: Array<{ type: "floor" | "wall" | "shadow" | "trap"; occupiedBy: string | null }> = [];
      for (let x = 0; x < gridWidth; x++) {
        let type: "floor" | "wall" | "shadow" | "trap" = "floor";
        if (Math.random() < 0.1) type = "wall";
        else if (Math.random() < 0.15) type = "shadow";
        row.push({ type, occupiedBy: null });
      }
      grid.push(row);
    }

    const game: AssassinGame = {
      id: randomUUID(),
      lobbyId: lobby.id,
      players: lobby.players.map((p, i) => ({
        id: p.id,
        name: p.name,
        team: p.team,
        gridX: p.team === "shadow" ? 1 : gridWidth - 2,
        gridY: 2 + (i * 2),
        health: 100,
        energy: 100,
        isHidden: false,
        kills: 0,
        deaths: 0,
      })),
      grid,
      targets: [
        { id: randomUUID(), gridX: 8, gridY: 3, eliminatedBy: null },
        { id: randomUUID(), gridX: 8, gridY: 8, eliminatedBy: null },
      ],
      shadowScore: 0,
      bladeScore: 0,
      scoreLimit: 5,
      gridWidth,
      gridHeight,
      currentTurn: lobby.players[0].id,
      turnTimeRemaining: 30,
      status: "playing",
      winner: null,
    };
    this.assassinGames.set(game.id, game);
    this.assassinLobbies.delete(lobby.id);
    return game;
  }

  getAssassinGame(id: string): AssassinGame | undefined {
    return this.assassinGames.get(id);
  }

  getAssassinGameByPlayerId(playerId: string): AssassinGame | undefined {
    return Array.from(this.assassinGames.values()).find((g) =>
      g.players.some((p) => p.id === playerId)
    );
  }

  updateAssassinGame(id: string, updates: Partial<AssassinGame>): AssassinGame | undefined {
    const game = this.assassinGames.get(id);
    if (game) {
      Object.assign(game, updates);
      return game;
    }
    return undefined;
  }

  deleteAssassinGame(id: string): void {
    this.assassinGames.delete(id);
  }

  getAllAssassinLobbies(): AssassinLobby[] {
    return Array.from(this.assassinLobbies.values());
  }
}

export const storage = new MemStorage();

// --- REPLACE THE CASTLES GAME ENGINE CLASS AT THE BOTTOM OF SERVER/STORAGE.TS ---

class CastlesGameEngine {
  game: CastlesGame;
  private interval: NodeJS.Timeout | null = null;
  private storage: MemStorage;

  constructor(game: CastlesGame, storage: MemStorage) {
    this.game = game;
    this.storage = storage;
  }

  startGame() {
    // Run game loop at 10 ticks per second (100ms)
    this.interval = setInterval(() => this.tick(), 100);
  }

  stopGame() {
    if (this.interval) clearInterval(this.interval);
  }

  private tick() {
    if (this.game.status !== "playing") return;
    const now = Date.now();

    // 0. PROCESS TRAINING QUEUE
    const trainingQueue = (this.game as any).trainingQueue || [];
    const completedUnits: any[] = [];

    for (let i = trainingQueue.length - 1; i >= 0; i--) {
      const queueItem = trainingQueue[i];
      if (now >= queueItem.completeTime) {
        const building = this.game.buildings.find(
          (b) => b.id === queueItem.buildingId,
        );
        if (building && building.health > 0) {
          const UNIT_HEALTH = {
            worker: 50,
            soldier: 100,
            archer: 75,
            catapult: 150,
          };
          const health =
            UNIT_HEALTH[queueItem.unitType as keyof typeof UNIT_HEALTH] || 100;

          const newUnit = {
            id: randomUUID(),
            type: queueItem.unitType,
            team: queueItem.team,
            ownerId: queueItem.ownerId,
            x: building.x + building.width / 2,
            y: building.y + building.height + 20,
            health: health,
            maxHealth: health,
            targetX: queueItem.rallyX,
            targetY: queueItem.rallyY,
            attackTarget: null,
            isGathering: false,
            gatherType: null,
            carryingAmount: 0,
            lastActionTime: 0,
          };
          this.game.units.push(newUnit as any);
        }
        trainingQueue.splice(i, 1);
      }
    }
    (this.game as any).trainingQueue = trainingQueue;

    // 1. UNIT LOGIC
    this.game.units.forEach((unit) => {
      if (!unit.health || unit.health <= 0) return;

      // --- A. MOVEMENT & PHYSICS ---
      // Only move if we have a target
      if (unit.targetX !== null && unit.targetY !== null) {
        const dx = unit.targetX - unit.x;
        const dy = unit.targetY - unit.y;
        const dist = Math.hypot(dx, dy);
        const speed = unit.type === "catapult" ? 3 : 6;

        // If very close to target, snap to it
        if (dist <= speed) {
          unit.x = unit.targetX;
          unit.y = unit.targetY;

          // Stop moving if we just wanted to move there (not gathering/attacking)
          if (!unit.isGathering && !unit.attackTarget) {
            unit.targetX = null;
            unit.targetY = null;
          }
        } else {
          // Calculate next theoretical position
          const moveX = (dx / dist) * speed;
          const moveY = (dy / dist) * speed;
          const nextX = unit.x + moveX;
          const nextY = unit.y + moveY;

          // --- STRICT COLLISION CHECK ---
          let collision = false;

          for (const b of this.game.buildings) {
            if (b.health <= 0) continue; // Ignore destroyed buildings

            // Collision Box (Building Rect + Unit Radius Buffer)
            // Walls are 40x40, Gates are 40x40. We add a 15px buffer for the unit size.
            const buffer = 15;
            if (
              nextX > b.x - buffer &&
              nextX < b.x + b.width + buffer &&
              nextY > b.y - buffer &&
              nextY < b.y + b.height + buffer
            ) {
              // GATE LOGIC:
              // If it is a gate AND it belongs to MY team, I can pass.
              if (b.type === "gate" && b.team === unit.team) {
                continue; // Safe to pass
              }

              // Otherwise (Wall, Enemy Gate, Enemy Building) -> BLOCKED
              collision = true;
              break;
            }
          }

          if (!collision) {
            unit.x = nextX;
            unit.y = nextY;
          } else {
            // Try to move around the obstacle by going left or right
            const tryAlternativeMovements = [
              { x: unit.x + speed, y: unit.y }, // Try right
              { x: unit.x - speed, y: unit.y }, // Try left
              { x: unit.x, y: unit.y + speed }, // Try down
              { x: unit.x, y: unit.y - speed }, // Try up
            ];

            let foundPath = false;
            for (const alt of tryAlternativeMovements) {
              let altCollision = false;
              for (const b of this.game.buildings) {
                if (b.health <= 0) continue;
                const buffer = 15;
                if (
                  alt.x > b.x - buffer &&
                  alt.x < b.x + b.width + buffer &&
                  alt.y > b.y - buffer &&
                  alt.y < b.y + b.height + buffer
                ) {
                  if (b.type === "gate" && b.team === unit.team) {
                    continue;
                  }
                  altCollision = true;
                  break;
                }
              }

              if (
                !altCollision &&
                alt.x > 0 &&
                alt.x < this.game.mapWidth &&
                alt.y > 0 &&
                alt.y < this.game.mapHeight
              ) {
                unit.x = alt.x;
                unit.y = alt.y;
                foundPath = true;
                break;
              }
            }

            // If no alternative path found and not attacking/gathering, clear target
            if (!foundPath && !unit.attackTarget && !unit.isGathering) {
              // Don't clear target immediately - keep trying to find a path
              // unit.targetX = null;
              // unit.targetY = null;
            }
          }
        }
      }

      // --- B. GATHERING (Workers Only) ---
      if (unit.type === "worker") {
        // If worker is idle (not gathering, not attacking, not moving), try to auto-assign to nearest resource
        if (
          !unit.isGathering &&
          !unit.attackTarget &&
          unit.targetX === null &&
          unit.targetY === null
        ) {
          // Auto-assign to nearest tree within the team's castle area
          let nearestTree = null;
          let minTreeDist = Infinity;

          this.game.trees.forEach((t: any) => {
            if (!t.isDepleted) {
              const d = Math.hypot(t.x - unit.x, t.y - unit.y);
              if (d < minTreeDist && d < 400) {
                // Only trees within 400px
                minTreeDist = d;
                nearestTree = t;
              }
            }
          });

          if (nearestTree) {
            unit.isGathering = true;
            unit.gatherType = "wood";
            (unit as any).gatherTarget = (nearestTree as any).id;
            unit.targetX = (nearestTree as any).x;
            unit.targetY = (nearestTree as any).y;
          }
        }

        // Process gathering if worker is in gathering mode
        if (unit.isGathering) {
          // Cooldown check: 1 second (1000ms)
          // Rate: 25 Resources per second
          if (now - (unit.lastActionTime || 0) > 1000) {
            // 1. Gather Wood
            if (unit.gatherType === "wood") {
              // Find the specific tree by ID
              // @ts-ignore
              let tree = this.game.trees.find(
                (t) => t.id === unit.gatherTarget,
              );

              // Check if tree exists, has wood, and we are close enough (60px)
              // @ts-ignore
              if (
                tree &&
                !tree.isDepleted &&
                Math.hypot(tree.x - unit.x, tree.y - unit.y) < 60
              ) {
                unit.lastActionTime = now;

                // ADD RESOURCES TO PLAYER
                const player = this.game.players.find(
                  (p) => p.id === unit.ownerId,
                );
                if (player) {
                  player.wood = (player.wood || 0) + 25; // 25 Wood per second
                }

                // DEPLETE TREE
                // @ts-ignore
                tree.wood -= 25;
                // @ts-ignore
                if (tree.wood <= 0) {
                  // Tree Finished
                  // @ts-ignore
                  tree.isDepleted = true;
                  // @ts-ignore
                  tree.respawnTime = now + 10000; // 10 sec respawn

                  // --- AUTO CHAINING LOGIC ---
                  // Find nearest non-depleted tree to move to next
                  let nearestTree = null;
                  let minDist = Infinity;

                  this.game.trees.forEach((t: any) => {
                    if (!t.isDepleted) {
                      const d = Math.hypot(t.x - unit.x, t.y - unit.y);
                      if (d < minDist) {
                        minDist = d;
                        nearestTree = t;
                      }
                    }
                  });

                  if (nearestTree) {
                    // Move to next tree
                    // @ts-ignore
                    unit.gatherTarget = nearestTree.id;
                    // @ts-ignore
                    unit.targetX = nearestTree.x;
                    // @ts-ignore
                    unit.targetY = nearestTree.y;
                  } else {
                    unit.isGathering = false; // No trees left
                  }
                }
              } else if (tree && !tree.isDepleted) {
                // Tree exists but we are too far, keep moving towards it
                unit.targetX = tree.x;
                unit.targetY = tree.y;
              } else {
                // Tree is gone or invalid - find a new tree
                let nearestTree = null;
                let minDist = Infinity;

                this.game.trees.forEach((t: any) => {
                  if (!t.isDepleted) {
                    const d = Math.hypot(t.x - unit.x, t.y - unit.y);
                    if (d < minDist) {
                      minDist = d;
                      nearestTree = t;
                    }
                  }
                });

                if (nearestTree) {
                  (unit as any).gatherTarget = (nearestTree as any).id;
                  unit.targetX = (nearestTree as any).x;
                  unit.targetY = (nearestTree as any).y;
                } else {
                  unit.isGathering = false;
                }
              }
            }

            // 2. Gather Food (Farms)
            if (unit.gatherType === "food") {
              // @ts-ignore
              const farm = this.game.buildings.find(
                (b) => b.id === unit.gatherTarget,
              );
              if (
                farm &&
                farm.health > 0 &&
                Math.hypot(
                  farm.x + farm.width / 2 - unit.x,
                  farm.y + farm.height / 2 - unit.y,
                ) < 50
              ) {
                unit.lastActionTime = now;
                const player = this.game.players.find(
                  (p) => p.id === unit.ownerId,
                );
                if (player) {
                  player.food = (player.food || 0) + 25;
                }
              } else if (farm && farm.health > 0) {
                // Too far, move closer to center of farm
                unit.targetX = farm.x + farm.width / 2;
                unit.targetY = farm.y + farm.height / 2;
              } else {
                // Farm destroyed or invalid - find another farm
                const newFarm = this.game.buildings.find(
                  (b) =>
                    b.type === "farm" && b.team === unit.team && b.health > 0,
                );
                if (newFarm) {
                  (unit as any).gatherTarget = newFarm.id;
                  unit.targetX = newFarm.x + newFarm.width / 2;
                  unit.targetY = newFarm.y + newFarm.height / 2;
                } else {
                  unit.isGathering = false;
                }
              }
            }
          }
        }
      }

      // --- C. COMBAT (Non-Workers) ---
      if (unit.type !== "worker") {
        // Auto-Attack: If idle, scan for enemies
        if (!unit.attackTarget) {
          const range = 250;
          const enemy = this.game.units.find(
            (u) =>
              u.team !== unit.team &&
              u.health > 0 &&
              Math.hypot(u.x - unit.x, u.y - unit.y) < range,
          );
          // Also scan for enemy buildings if no unit found? (Optional, usually units prio units)
          if (enemy) unit.attackTarget = enemy.id;
        }

        // Execute Attack
        if (unit.attackTarget) {
          const targetUnit = this.game.units.find(
            (u) => u.id === unit.attackTarget,
          );
          const targetBuilding = this.game.buildings.find(
            (b) => b.id === unit.attackTarget,
          );
          const target = targetUnit || targetBuilding;

          if (target && target.health > 0) {
            const attackRange =
              unit.type === "catapult"
                ? 350
                : unit.type === "archer"
                  ? 200
                  : 60;
            const dist = Math.hypot(target.x - unit.x, target.y - unit.y);

            if (dist <= attackRange) {
              // Stop moving to attack
              unit.targetX = null;
              unit.targetY = null;

              if (now - (unit.lastActionTime || 0) > 1000) {
                unit.lastActionTime = now;
                let dmg =
                  unit.type === "catapult"
                    ? 80
                    : unit.type === "soldier"
                      ? 25
                      : 15;

                // Catapult Bonus vs Buildings (Walls/Gates)
                if (unit.type === "catapult" && targetBuilding) dmg *= 4; // Massive damage to walls

                target.health -= dmg;

                // Check Death
                if (target.health <= 0) {
                  unit.attackTarget = null;
                  // Win Condition
                  if (
                    targetBuilding &&
                    targetBuilding.type === "castle_center"
                  ) {
                    this.game.status = "finished";
                    this.game.winner = unit.team;
                    this.stopGame();
                  }
                }
              }
            } else {
              // Move closer
              unit.targetX = target.x;
              unit.targetY = target.y;
            }
          } else {
            unit.attackTarget = null; // Target dead
          }
        }
      }
    });

    // 2. TREE REGENERATION
    this.game.trees.forEach((tree: any) => {
      if (tree.isDepleted && now > tree.respawnTime) {
        tree.isDepleted = false;
        tree.wood = 500; // Reset to 500 wood
      }
    });

    // 3. CLEANUP
    this.game.units = this.game.units.filter((u) => u.health > 0);
    this.game.buildings = this.game.buildings.filter((b) => b.health > 0);
  }
}
