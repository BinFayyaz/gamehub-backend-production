import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage, verifyPassword } from "./storage";
import type {
  RPSChoice,
  WerewolfGame,
  ReactionRaceLobby,
  ReactionRaceGame,
  ColorClashLobby,
  ColorClashGame,
  AvatarStyle,
  WarzoneRoom,
  WarzonePlayerState,
  WarzoneChatMessage,
  WarzoneTeam,
  WarzoneMap,
} from "@shared/schema";
import { loginSchema, registerSchema } from "@shared/schema";
import { randomUUID } from "crypto";
import * as fs from "fs";
import * as path from "path";
import multer from "multer";

const screenshotStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), "uploads", "screenshots");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage: screenshotStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

const tutorialStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), "uploads", "tutorials");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const tutorialUpload = multer({
  storage: tutorialStorage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["video/mp4", "video/webm", "video/ogg", "video/quicktime"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only video files are allowed"));
    }
  },
});

const songStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(process.cwd(), "Songs");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const songUpload = multer({
  storage: songStorage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp3", "audio/x-wav"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only audio files are allowed (mp3, wav, ogg)"));
    }
  },
});

interface ExtendedWebSocket extends WebSocket {
  playerId?: string;
  playerName?: string;
  isAlive?: boolean;
}

// Track games scheduled for cleanup to avoid duplicate deletions
const escapeShipCleanupScheduled = new Set<string>();
const colorClashCleanupScheduled = new Set<string>();

// Color Clash constants
const COLOR_CLASH_COLORS = ["red", "blue", "green", "yellow"];

function checkWerewolfWinCondition(game: WerewolfGame): void {
  const aliveWerewolves = game.players.filter(
    (p) => p.isAlive && p.role === "werewolf",
  );
  const aliveVillagers = game.players.filter(
    (p) => p.isAlive && p.role !== "werewolf",
  );

  if (aliveWerewolves.length === 0) {
    game.winner = "villagers";
    game.status = "finished";
  } else if (aliveWerewolves.length >= aliveVillagers.length) {
    game.winner = "werewolves";
    game.status = "finished";
  }
}

export async function registerRoutes(
  httpServer: Server,
  app: Express,
): Promise<Server> {
  app.post("/api/register", (req, res) => {
    try {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({
          error:
            "Invalid input. Username must be 2-20 characters, password at least 6 characters.",
        });
      }

      const { username, password } = result.data;

      if (storage.userExists(username)) {
        return res.status(409).json({ error: "Username already taken" });
      }

      const user = storage.createUser(username, password, true);
      res.json({ success: true, username: user.username });
    } catch (error) {
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/login", (req, res) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid input" });
      }

      const { username, password } = result.data;
      const user = storage.getUserByUsername(username);

      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      if (!verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      res.json({ success: true, username: user.username });
    } catch (error) {
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/songs", (req, res) => {
    try {
      const username = req.query.username as string;
      const storageSongs = username ? storage.getSongs(username) : storage.getAllSongs();
      const songsWithUrl = storageSongs.map(song => ({
        ...song,
        url: `/songs/${encodeURIComponent(song.filename)}`,
      }));

      const songsDir = path.join(process.cwd(), "Songs");
      if (fs.existsSync(songsDir)) {
        const files = fs.readdirSync(songsDir);
        const diskSongs = files
          .filter(f => (f.endsWith(".mp3") || f.endsWith(".wav") || f.endsWith(".ogg")) && 
                       !storageSongs.some(s => s.filename === f))
          .map(f => ({
            id: f,
            name: f.replace(/\.(mp3|wav|ogg)$/, "").replace(/_/g, " "),
            filename: f,
            url: `/songs/${encodeURIComponent(f)}`,
            uploaderId: "system",
            uploaderName: "System",
            isPublic: true,
            timestamp: Date.now(),
          }));
        songsWithUrl.push(...diskSongs);
      }

      res.json({ songs: songsWithUrl });
    } catch (error) {
      res.status(500).json({ error: "Failed to load songs" });
    }
  });

  app.post("/api/songs", songUpload.single("song"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const { uploaderId, uploaderName, name, isPublic } = req.body;
      if (!uploaderId || !uploaderName || !name) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!storage.isAdmin(uploaderName) && !storage.isVip(uploaderName)) {
        return res.status(403).json({ error: "Only VIPs and admin can upload songs" });
      }

      const song = storage.addSong(
        name,
        req.file.filename,
        uploaderId,
        uploaderName,
        isPublic === "true" || isPublic === true,
      );
      res.json({ song: { ...song, url: `/songs/${encodeURIComponent(song.filename)}` } });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload song" });
    }
  });

  app.delete("/api/songs/:id", (req, res) => {
    try {
      const { username } = req.query;
      const song = storage.getSong(req.params.id);
      if (!song) {
        return res.status(404).json({ error: "Song not found" });
      }

      const isOwner = song.uploaderName.toLowerCase() === (username as string).toLowerCase();
      const isAdminUser = storage.isAdmin(username as string);

      if (!isOwner && !isAdminUser) {
        return res.status(403).json({ error: "Not authorized to delete this song" });
      }

      const filePath = path.join(process.cwd(), "Songs", song.filename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      storage.deleteSong(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete song" });
    }
  });

  app.get("/songs/:filename", (req, res) => {
    try {
      const filename = decodeURIComponent(req.params.filename);
      const filePath = path.join(process.cwd(), "Songs", filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Song not found" });
      }
      res.sendFile(filePath);
    } catch (error) {
      res.status(500).json({ error: "Failed to serve song" });
    }
  });

  app.get("/api/playlists", (req, res) => {
    try {
      const username = req.query.username as string;
      const playlists = username ? storage.getPlaylists(username) : [];
      res.json({ playlists });
    } catch (error) {
      res.status(500).json({ error: "Failed to load playlists" });
    }
  });

  app.post("/api/playlists", (req, res) => {
    try {
      const { name, description, creatorId, creatorName, isPublic } = req.body;
      if (!name || !creatorId || !creatorName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!storage.isAdmin(creatorName) && !storage.isVip(creatorName)) {
        return res.status(403).json({ error: "Only VIPs and admin can create playlists" });
      }

      const playlist = storage.createPlaylist(
        name,
        description || null,
        creatorId,
        creatorName,
        isPublic === true || isPublic === "true",
      );
      res.json({ playlist });
    } catch (error) {
      res.status(500).json({ error: "Failed to create playlist" });
    }
  });

  app.post("/api/playlists/:id/songs", (req, res) => {
    try {
      const { songId, username } = req.body;
      const playlist = storage.getPlaylist(req.params.id);
      if (!playlist) {
        return res.status(404).json({ error: "Playlist not found" });
      }

      const isOwner = playlist.creatorName.toLowerCase() === username.toLowerCase();
      const isAdminUser = storage.isAdmin(username);

      if (!isOwner && !isAdminUser) {
        return res.status(403).json({ error: "Not authorized to modify this playlist" });
      }

      const updated = storage.addSongToPlaylist(req.params.id, songId);
      res.json({ playlist: updated });
    } catch (error) {
      res.status(500).json({ error: "Failed to add song to playlist" });
    }
  });

  app.delete("/api/playlists/:id/songs/:songId", (req, res) => {
    try {
      const { username } = req.query;
      const playlist = storage.getPlaylist(req.params.id);
      if (!playlist) {
        return res.status(404).json({ error: "Playlist not found" });
      }

      const isOwner = playlist.creatorName.toLowerCase() === (username as string).toLowerCase();
      const isAdminUser = storage.isAdmin(username as string);

      if (!isOwner && !isAdminUser) {
        return res.status(403).json({ error: "Not authorized to modify this playlist" });
      }

      const updated = storage.removeSongFromPlaylist(req.params.id, req.params.songId);
      res.json({ playlist: updated });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove song from playlist" });
    }
  });

  app.patch("/api/playlists/:id", (req, res) => {
    try {
      const { description, username } = req.body;
      const playlist = storage.getPlaylist(req.params.id);
      if (!playlist) {
        return res.status(404).json({ error: "Playlist not found" });
      }

      // Only admin can edit playlist descriptions
      const isAdminUser = storage.isAdmin(username as string);
      if (!isAdminUser) {
        return res.status(403).json({ error: "Only admin can edit playlist descriptions" });
      }

      const updated = storage.updatePlaylist(req.params.id, { description });
      res.json({ playlist: updated });
    } catch (error) {
      res.status(500).json({ error: "Failed to update playlist" });
    }
  });

  app.delete("/api/playlists/:id", (req, res) => {
    try {
      const { username } = req.query;
      const playlist = storage.getPlaylist(req.params.id);
      if (!playlist) {
        return res.status(404).json({ error: "Playlist not found" });
      }

      const isOwner = playlist.creatorName.toLowerCase() === (username as string).toLowerCase();
      const isAdminUser = storage.isAdmin(username as string);

      if (!isOwner && !isAdminUser) {
        return res.status(403).json({ error: "Not authorized to delete this playlist" });
      }

      storage.deletePlaylist(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete playlist" });
    }
  });

  app.get("/api/screenshots", (req, res) => {
    try {
      const screenshots = storage.getScreenshots();
      res.json({ screenshots });
    } catch (error) {
      res.status(500).json({ error: "Failed to load screenshots" });
    }
  });

  app.post("/api/screenshots", upload.single("screenshot"), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }
      const { uploaderId, uploaderName, gameName } = req.body;
      if (!uploaderId || !uploaderName || !gameName) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      if (!storage.isAdmin(uploaderName) && !storage.isVip(uploaderName)) {
        return res.status(403).json({ error: "Only VIPs and admin can upload screenshots" });
      }

      const screenshot = storage.addScreenshot(
        uploaderId,
        uploaderName,
        req.file.filename,
        gameName,
      );
      res.json({ screenshot });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload screenshot" });
    }
  });

  app.delete("/api/screenshots/:id", (req, res) => {
    try {
      const { username } = req.query;
      if (!username || !storage.isAdmin(username as string)) {
        return res
          .status(403)
          .json({ error: "Only admin can delete screenshots" });
      }
      const screenshots = storage.getScreenshots();
      const screenshot = screenshots.find((s) => s.id === req.params.id);
      if (screenshot) {
        const filePath = path.join(
          process.cwd(),
          "uploads",
          "screenshots",
          screenshot.filename,
        );
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      const deleted = storage.deleteScreenshot(req.params.id);
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Screenshot not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete screenshot" });
    }
  });

  app.get("/uploads/screenshots/:filename", (req, res) => {
    try {
      const filename = decodeURIComponent(req.params.filename);
      const filePath = path.join(
        process.cwd(),
        "uploads",
        "screenshots",
        filename,
      );
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Image not found" });
      }
      res.sendFile(filePath);
    } catch (error) {
      res.status(500).json({ error: "Failed to serve image" });
    }
  });

  // Tutorial endpoints
  app.get("/api/tutorials", (req, res) => {
    try {
      const tutorials = storage.getTutorials();
      res.json({ tutorials });
    } catch (error) {
      res.status(500).json({ error: "Failed to load tutorials" });
    }
  });

  app.get("/api/tutorials/:gameType", (req, res) => {
    try {
      const tutorial = storage.getTutorialByGameType(req.params.gameType);
      if (tutorial) {
        res.json({ tutorial });
      } else {
        res.status(404).json({ error: "Tutorial not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to load tutorial" });
    }
  });

  app.post("/api/tutorials", tutorialUpload.single("video"), (req, res) => {
    try {
      const { username } = req.body;
      if (!username || (!storage.isAdmin(username) && !storage.isVip(username))) {
        return res.status(403).json({ error: "Only VIPs and admin can upload tutorials" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "No video file uploaded" });
      }
      const { gameType, title, description, uploaderId, uploaderName } = req.body;
      if (!gameType || !title || !description || !uploaderId || !uploaderName) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const tutorial = storage.addTutorial(
        gameType,
        title,
        description,
        req.file.filename,
        uploaderId,
        uploaderName,
      );
      res.json({ tutorial });
    } catch (error) {
      res.status(500).json({ error: "Failed to upload tutorial" });
    }
  });

  app.delete("/api/tutorials/:id", (req, res) => {
    try {
      const { username } = req.query;
      if (!username || !storage.isAdmin(username as string)) {
        return res.status(403).json({ error: "Only admin can delete tutorials" });
      }
      const tutorials = storage.getTutorials();
      const tutorial = tutorials.find((t) => t.id === req.params.id);
      if (tutorial) {
        const filePath = path.join(
          process.cwd(),
          "uploads",
          "tutorials",
          tutorial.videoFilename,
        );
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath);
        }
      }
      const deleted = storage.deleteTutorial(req.params.id);
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Tutorial not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete tutorial" });
    }
  });

  app.get("/uploads/tutorials/:filename", (req, res) => {
    try {
      const filename = decodeURIComponent(req.params.filename);
      const filePath = path.join(
        process.cwd(),
        "uploads",
        "tutorials",
        filename,
      );
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: "Video not found" });
      }
      res.sendFile(filePath);
    } catch (error) {
      res.status(500).json({ error: "Failed to serve video" });
    }
  });

  // Support Request endpoints
  app.get("/api/support-requests", (req, res) => {
    try {
      const requests = storage.getSupportRequests();
      res.json({ requests });
    } catch (error) {
      res.status(500).json({ error: "Failed to load support requests" });
    }
  });

  app.post("/api/support-requests", (req, res) => {
    try {
      const { type, title, description, submitterId, submitterName } = req.body;
      if (!type || !title || !description || !submitterId || !submitterName) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      if (type !== "bug" && type !== "feature") {
        return res.status(400).json({ error: "Invalid type" });
      }
      const request = storage.addSupportRequest(
        type,
        title,
        description,
        submitterId,
        submitterName,
      );
      res.json({ request });
    } catch (error) {
      res.status(500).json({ error: "Failed to create support request" });
    }
  });

  app.post("/api/support-requests/:id/like", (req, res) => {
    try {
      const { playerId } = req.body;
      if (!playerId) {
        return res.status(400).json({ error: "Missing playerId" });
      }
      const request = storage.toggleSupportRequestLike(req.params.id, playerId);
      if (request) {
        res.json({ request });
      } else {
        res.status(404).json({ error: "Request not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to toggle like" });
    }
  });

  app.post("/api/support-requests/:id/done", (req, res) => {
    try {
      const { username } = req.body;
      if (!username || !storage.isAdmin(username)) {
        return res.status(403).json({ error: "Only admin can mark as done" });
      }
      const request = storage.markSupportRequestDone(req.params.id);
      if (request) {
        res.json({ request });
      } else {
        res.status(404).json({ error: "Request not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to mark as done" });
    }
  });

  app.delete("/api/support-requests/:id", (req, res) => {
    try {
      const { username } = req.query;
      if (!username || !storage.isAdmin(username as string)) {
        return res
          .status(403)
          .json({ error: "Only admin can delete requests" });
      }
      const deleted = storage.deleteSupportRequest(req.params.id);
      if (deleted) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Request not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to delete request" });
    }
  });

  app.get("/api/player/profile", (req, res) => {
    try {
      const playerId = req.query.playerId as string | undefined;
      const usernameQuery = req.query.username as string | undefined;

      let player = playerId ? storage.getPlayer(playerId) : undefined;
      if (!player && usernameQuery) {
        player = storage.getPlayerByUsername(usernameQuery);
      }

      if (player) {
        return res.json({
          profile: {
            playerId: player.id,
            username: player.username,
            avatar: player.avatar ?? null,
            avatarStyle: player.avatarStyle ?? "avataaars",
            wins: player.wins ?? 0,
            losses: player.losses ?? 0,
            level: player.level ?? 1,
          },
        });
      }

      if (usernameQuery) {
        const persisted = storage.getPersistedProfileByUsername(usernameQuery);
        if (persisted) {
          return res.json({
            profile: {
              playerId: null,
              username: persisted.username,
              avatar: persisted.avatarStyle
                ? `https://api.dicebear.com/7.x/${persisted.avatarStyle}/svg?seed=${encodeURIComponent(persisted.username)}`
                : null,
              avatarStyle: persisted.avatarStyle ?? "avataaars",
              wins: persisted.wins ?? 0,
              losses: persisted.losses ?? 0,
              level: persisted.level ?? 1,
            },
          });
        }
      }

      return res.status(404).json({ error: "Profile not found" });
    } catch (error) {
      return res.status(500).json({ error: "Failed to load profile" });
    }
  });

  // Avatar endpoint
  app.post("/api/player/avatar", (req, res) => {
    try {
      const { playerId, username, style } = req.body;
      if (!style || (!playerId && !username)) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const targetPlayer = playerId
        ? storage.getPlayer(playerId)
        : storage.getPlayerByUsername(username);
      if (!targetPlayer) {
        return res.status(404).json({ error: "Player not found or offline" });
      }

      const avatarUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(targetPlayer.username)}`;
      storage.updatePlayerAvatar(targetPlayer.id, avatarUrl, style);
      const player = storage.getPlayer(targetPlayer.id);
      res.json({ player });
    } catch (error) {
      res.status(500).json({ error: "Failed to update avatar" });
    }
  });

  // Friends endpoints
  app.post("/api/friends/request", (req, res) => {
    try {
      const { playerId, playerUsername, friendUsername } = req.body;
      const fromById =
        typeof playerId === "string" ? storage.getPlayer(playerId)?.username : null;
      const fromByUsername =
        typeof playerUsername === "string" && playerUsername.trim()
          ? playerUsername.trim()
          : null;
      if (fromById && fromByUsername && fromById.toLowerCase() !== fromByUsername.toLowerCase()) {
        return res.status(400).json({ error: "playerId and playerUsername do not match" });
      }
      const fromUsername = fromByUsername || fromById;

      if (!fromUsername || !friendUsername) {
        return res.status(400).json({ error: "Missing parameters" });
      }

      if (!storage.userExists(friendUsername)) {
        return res.status(404).json({ error: "Friend not found" });
      }

      const friend = storage.sendFriendRequest(fromUsername, friendUsername);
      res.json({ friend });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to send friend request";
      res.status(400).json({ error: message });
    }
  });

  app.get("/api/friends/:playerId", (req, res) => {
    try {
      const raw = req.params.playerId;
      const username = storage.getPlayer(raw)?.username || raw;
      if (!storage.userExists(username)) {
        return res.status(404).json({ error: "Player not found" });
      }
      const friends = storage.getPlayerFriends(username);
      res.json({ friends });
    } catch (error) {
      res.status(500).json({ error: "Failed to get friends" });
    }
  });

  app.get("/api/friends/:playerId/pending", (req, res) => {
    try {
      const raw = req.params.playerId;
      const username = storage.getPlayer(raw)?.username || raw;
      if (!storage.userExists(username)) {
        return res.status(404).json({ error: "Player not found" });
      }
      const pending = storage.getPendingRequests(username);
      res.json({ pending });
    } catch (error) {
      res.status(500).json({ error: "Failed to get pending requests" });
    }
  });

  app.get("/api/friends/:playerId/outgoing", (req, res) => {
    try {
      const raw = req.params.playerId;
      const username = storage.getPlayer(raw)?.username || raw;
      if (!storage.userExists(username)) {
        return res.status(404).json({ error: "Player not found" });
      }
      const outgoing = storage.getOutgoingRequests(username);
      res.json({ outgoing });
    } catch (error) {
      res.status(500).json({ error: "Failed to get outgoing requests" });
    }
  });

  app.post("/api/friends/accept", (req, res) => {
    try {
      const { playerId, playerUsername, friendId, friendUsername } = req.body;
      const fromById =
        typeof playerId === "string" ? storage.getPlayer(playerId)?.username : null;
      const fromByUsername =
        typeof playerUsername === "string" && playerUsername.trim()
          ? playerUsername.trim()
          : null;
      if (fromById && fromByUsername && fromById.toLowerCase() !== fromByUsername.toLowerCase()) {
        return res.status(400).json({ error: "playerId and playerUsername do not match" });
      }
      const username = fromByUsername || fromById;
      const friend =
        (typeof friendUsername === "string" && friendUsername.trim()) ||
        friendId ||
        null;

      if (!username || !friend) {
        return res.status(400).json({ error: "Missing player or friend" });
      }
      storage.acceptFriendRequest(username, friend);
      res.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to accept friend request";
      res.status(400).json({ error: message });
    }
  });

  app.post("/api/friends/reject", (req, res) => {
    try {
      const { playerId, playerUsername, friendId, friendUsername } = req.body;
      const fromById =
        typeof playerId === "string" ? storage.getPlayer(playerId)?.username : null;
      const fromByUsername =
        typeof playerUsername === "string" && playerUsername.trim()
          ? playerUsername.trim()
          : null;
      if (fromById && fromByUsername && fromById.toLowerCase() !== fromByUsername.toLowerCase()) {
        return res.status(400).json({ error: "playerId and playerUsername do not match" });
      }
      const username = fromByUsername || fromById;
      const friend =
        (typeof friendUsername === "string" && friendUsername.trim()) ||
        friendId ||
        null;

      if (!username || !friend) {
        return res.status(400).json({ error: "Missing player or friend" });
      }
      storage.rejectFriendRequest(username, friend);
      res.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to reject friend request";
      res.status(400).json({ error: message });
    }
  });

  app.delete("/api/friends/:playerId/:friendId", (req, res) => {
    try {
      const playerRaw = req.params.playerId;
      const friendRaw = req.params.friendId;
      const playerUsername = storage.getPlayer(playerRaw)?.username || playerRaw;
      const friendUsername = storage.getPlayer(friendRaw)?.username || friendRaw;
      storage.removeFriend(playerUsername, friendUsername);
      res.json({ success: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to remove friend";
      res.status(400).json({ error: message });
    }
  });

  // Achievements endpoints
  app.post("/api/achievements", (req, res) => {
    try {
      const { playerId, name, description, icon, rarity } = req.body;
      const achievement = storage.addAchievement({
        id: randomUUID(),
        playerId,
        achievementType: name.toLowerCase().replace(/\s+/g, "_"),
        name,
        description,
        icon,
        unlockedAt: Date.now(),
        rarity,
      });
      res.json({ achievement });
    } catch (error) {
      res.status(500).json({ error: "Failed to add achievement" });
    }
  });

  app.get("/api/achievements/:playerId", (req, res) => {
    try {
      const achievements = storage.getPlayerAchievements(req.params.playerId);
      res.json({ achievements });
    } catch (error) {
      res.status(500).json({ error: "Failed to get achievements" });
    }
  });
  
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });

  const clients = new Map<string, ExtendedWebSocket>();

  function broadcast(message: object, excludeId?: string) {
    const data = JSON.stringify(message);
    clients.forEach((client, id) => {
      if (id !== excludeId && client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  }

  function getLobbyCountsForBroadcast() {
    const popLobbies = storage.getAllPointOnPointLobbies();
    const popLobbyCount = popLobbies.reduce(
      (acc, l) => acc + l.players.length,
      0,
    );

    const riddleLobbies = storage.getAllRiddleLobbies();
    const riddleLobbyCount = riddleLobbies.reduce(
      (acc, l) => acc + ((l as any).vipOnly ? 0 : l.players.length),
      0,
    );

    const memoryLobbies = storage.getAllMemoryLobbies();
    const memoryLobbyCount = memoryLobbies.reduce(
      (acc, l) => acc + l.players.length,
      0,
    );

    const typingLobbies = storage.getAllTypingLobbies();
    const typingLobbyCount = typingLobbies.reduce(
      (acc, l) => acc + l.players.length,
      0,
    );

    const werewolfLobbies = storage.getAllWerewolfLobbies();
    const werewolfLobbyCount = werewolfLobbies.reduce(
      (acc, l) => acc + ((l as any).vipOnly ? 0 : l.players.length),
      0,
    );

    const spyHuntLobbies = storage.getAllSpyHuntLobbies();
    const spyHuntLobbyCount = spyHuntLobbies.reduce(
      (acc, l) => acc + l.players.length,
      0,
    );

    const outpostRushLobbies = storage.getAllOutpostRushLobbies();
    const outpostRushLobbyCount = outpostRushLobbies.reduce(
      (acc, l) => acc + l.players.length,
      0,
    );

    const emojiChainLobbies = storage.getAllEmojiChainLobbies();
    const emojiChainLobbyCount = emojiChainLobbies.reduce(
      (acc, l) => acc + l.players.length,
      0,
    );

    const wordAssociationLobbies = storage.getAllWordAssociationLobbies();
    const wordAssociationLobbyCount = wordAssociationLobbies.reduce(
      (acc, l) => acc + l.players.length,
      0,
    );

    const hangmanLobbies = storage.getAllHangmanLobbies();
    const hangmanLobbyCount = hangmanLobbies.reduce(
      (acc, l) => acc + l.players.length,
      0,
    );

    const triviaQuizLobbies = storage.getAllTriviaQuizLobbies();
    const triviaQuizLobbyCount = triviaQuizLobbies.reduce(
      (acc, l) => acc + l.players.length,
      0,
    );

    const squidGameLobbies = storage.getAllSquidGameLobbies();
    const squidGameLobbyCount = squidGameLobbies.reduce(
      (acc, l) => acc + ((l as any).vipOnly ? 0 : l.players.length),
      0,
    );

    const truthOrBluffLobbies = storage.getAllTruthOrBluffLobbies();
    const truthOrBluffLobbyCount = truthOrBluffLobbies.reduce(
      (acc, l) => acc + l.players.length,
      0,
    );

    const spotTheLiarLobbies = storage.getAllSpotTheLiarLobbies();
    const spotTheLiarLobbyCount = spotTheLiarLobbies.reduce(
      (acc, l) => acc + l.players.length,
      0,
    );

    const escapeShipLobbies = storage.getAllEscapeShipLobbies();
    const escapeShipLobbyCount = escapeShipLobbies.reduce(
      (acc, l) => acc + ((l as any).vipOnly ? 0 : l.players.length),
      0,
    );

    const reactionRaceLobbies = storage.getAllReactionRaceLobbies();
    const reactionRaceLobbyCount = reactionRaceLobbies.reduce(
      (acc, l) => acc + l.players.length,
      0,
    );

    const colorClashLobbies = storage.getAllColorClashLobbies();
    const colorClashLobbyCount = colorClashLobbies.reduce(
      (acc, l) => acc + l.players.length,
      0,
    );

    const hideSeekLobbies = storage.getAllHideSeekLobbies();
    const hideSeekLobbyCount = hideSeekLobbies.reduce(
      (acc, l) => acc + ((l as any).vipOnly ? 0 : l.players.length),
      0,
    );

    return [
      { gameType: "pointonpoint", current: popLobbyCount, max: 6 },
      { gameType: "riddles", current: riddleLobbyCount, max: 8 },
      { gameType: "memory", current: memoryLobbyCount, max: 4 },
      { gameType: "typing", current: typingLobbyCount, max: 6 },
      { gameType: "werewolf", current: werewolfLobbyCount, max: 20 },
      { gameType: "spyhunt", current: spyHuntLobbyCount, max: 12 },
      { gameType: "outpostrush", current: outpostRushLobbyCount, max: 8 },
      { gameType: "emojichain", current: emojiChainLobbyCount, max: 5 },
      {
        gameType: "wordassociation",
        current: wordAssociationLobbyCount,
        max: 5,
      },
      { gameType: "hangman", current: hangmanLobbyCount, max: 8 },
      { gameType: "triviaquiz", current: triviaQuizLobbyCount, max: 8 },
      { gameType: "squidgame", current: squidGameLobbyCount, max: 20 },
      { gameType: "truthorbluff", current: truthOrBluffLobbyCount, max: 10 },
      { gameType: "spottheliar", current: spotTheLiarLobbyCount, max: 6 },
      { gameType: "escapeship", current: escapeShipLobbyCount, max: 8 },
      { gameType: "reactionrace", current: reactionRaceLobbyCount, max: 8 },
      { gameType: "colorclash", current: colorClashLobbyCount, max: 8 },
      { gameType: "hideseek", current: hideSeekLobbyCount, max: 10 },
    ];
  }

  function sendTo(playerId: string, message: object) {
    const client = clients.get(playerId);
    if (client && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(message));
    }
  }

  type WarzoneRoomRuntime = {
    code: string;
    hostPlayerId: string;
    mode: "bot" | "multiplayer";
    map: WarzoneMap;
    started: boolean;
    players: Map<string, { name: string; team: WarzoneTeam }>;
    states: Map<string, WarzonePlayerState>;
    chat: WarzoneChatMessage[];
  };

  const warzoneRooms = new Map<string, WarzoneRoomRuntime>();

  function generateWarzoneCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  function toWarzoneRoomPayload(room: WarzoneRoomRuntime): WarzoneRoom {
    return {
      code: room.code,
      hostPlayerId: room.hostPlayerId,
      mode: room.mode,
      map: room.map,
      started: room.started,
      players: Array.from(room.players.entries()).map(([playerId, info]) => ({
        playerId,
        name: info.name,
        team: info.team,
      })),
    };
  }

  function getWarzoneRoomByPlayerId(
    playerId: string,
  ): WarzoneRoomRuntime | undefined {
    for (const room of warzoneRooms.values()) {
      if (room.players.has(playerId)) {
        return room;
      }
    }
    return undefined;
  }

  function emitWarzoneRoomUpdate(room: WarzoneRoomRuntime | null): void {
    if (!room) return;
    const payload = toWarzoneRoomPayload(room);
    room.players.forEach((_v, playerId) => {
      sendTo(playerId, { type: "warzone_room_update", room: payload });
    });
  }

  function emitWarzoneStates(room: WarzoneRoomRuntime): void {
    const states = Array.from(room.states.values());
    room.players.forEach((_v, playerId) => {
      sendTo(playerId, { type: "warzone_states", states });
    });
  }

  function leaveWarzoneRoom(playerId: string): void {
    const room = getWarzoneRoomByPlayerId(playerId);
    if (!room) return;

    room.players.delete(playerId);
    room.states.delete(playerId);

    if (room.players.size === 0) {
      warzoneRooms.delete(room.code);
      sendTo(playerId, { type: "warzone_room_update", room: null });
      sendTo(playerId, { type: "warzone_states", states: [] });
      sendTo(playerId, { type: "warzone_chat_history", messages: [] });
      return;
    }

    if (room.hostPlayerId === playerId) {
      const nextHost = room.players.keys().next().value as string | undefined;
      room.hostPlayerId = nextHost || room.hostPlayerId;
    }
    room.started = room.players.size > 1 ? room.started : false;

    emitWarzoneRoomUpdate(room);
    emitWarzoneStates(room);
    sendTo(playerId, { type: "warzone_room_update", room: null });
    sendTo(playerId, { type: "warzone_states", states: [] });
    sendTo(playerId, { type: "warzone_chat_history", messages: [] });
  }

  function sendToGame(playerIds: string[], message: object) {
    playerIds.forEach((id) => sendTo(id, message));
  }

  function sendToTTTGameAll(
    game: {
      player1Id: string;
      player2Id: string;
      spectators: Array<{ id: string }>;
    },
    message: object,
  ) {
    sendTo(game.player1Id, message);
    sendTo(game.player2Id, message);
    game.spectators.forEach((s) => sendTo(s.id, message));
  }

  function sendToGameWithSpectators(
    game: {
      player1Id: string;
      player2Id: string;
      spectators?: Array<{ id: string }>;
    },
    message: object,
  ) {
    sendTo(game.player1Id, message);
    sendTo(game.player2Id, message);
    if (game.spectators) {
      game.spectators.forEach((s) => sendTo(s.id, message));
    }
  }

  function sendToMemoryGameAll(
    game: {
      players: Array<{ id: string }>;
      spectators?: Array<{ id: string }>;
    },
    message: object,
  ) {
    game.players.forEach((p) => sendTo(p.id, message));
    if (game.spectators) {
      game.spectators.forEach((s) => sendTo(s.id, message));
    }
  }

  // Castles: Siege Dominion helper functions
  const castlesGameLoops = new Map<string, NodeJS.Timeout>();
  const CASTLES_TICK_RATE = 200; // ms between ticks
  const UNIT_SPEEDS: Record<string, number> = {
    worker: 2,
    soldier: 2.5,
    archer: 2,
    catapult: 1,
  };
  const UNIT_DAMAGE: Record<string, number> = {
    worker: 5,
    soldier: 15,
    archer: 12,
    catapult: 30,
  };
  const UNIT_RANGE: Record<string, number> = {
    worker: 30,
    soldier: 25,
    archer: 150,
    catapult: 200,
  };
  const UNIT_COSTS: Record<string, { wood: number; food: number }> = {
    worker: { wood: 50, food: 25 },
    soldier: { wood: 0, food: 75 },
    archer: { wood: 50, food: 50 },
    catapult: { wood: 150, food: 0 },
  };
  const BUILDING_COSTS: Record<string, { wood: number; food: number }> = {
    barracks: { wood: 200, food: 0 },
    catapult_factory: { wood: 300, food: 0 },
    farm: { wood: 100, food: 0 },
    wall: { wood: 75, food: 0 },
  };

  function startCastlesGameLoop(
    gameId: string,
    sendTo: (playerId: string, message: object) => void,
  ) {
    if (castlesGameLoops.has(gameId)) return;

    const interval = setInterval(() => {
      const game = storage.getCastlesGame(gameId);
      if (!game || game.status !== "playing") {
        clearInterval(interval);
        castlesGameLoops.delete(gameId);
        return;
      }

      processCastlesTick(game);
      storage.updateCastlesGame(game);

      // Check win condition
      const redCastle = game.buildings.find(
        (b) => b.type === "castle_center" && b.team === "red",
      );
      const blueCastle = game.buildings.find(
        (b) => b.type === "castle_center" && b.team === "blue",
      );

      if (!redCastle || redCastle.health <= 0) {
        game.status = "finished";
        game.winner = "blue";
        clearInterval(interval);
        castlesGameLoops.delete(gameId);
      } else if (!blueCastle || blueCastle.health <= 0) {
        game.status = "finished";
        game.winner = "red";
        clearInterval(interval);
        castlesGameLoops.delete(gameId);
      }

      game.tickCount++;
      game.lastTickTime = Date.now();

      game.players.forEach((p) => {
        sendTo(p.id, { type: "game_update_castles", game });
      });
    }, CASTLES_TICK_RATE);

    castlesGameLoops.set(gameId, interval);
  }

  function processCastlesTick(game: any) {
    // Process each unit
    for (const unit of game.units) {
      if (unit.health <= 0) continue;

      // Handle resource gathering
      if (unit.type === "worker" && unit.isGathering && unit.gatherType) {
        if (unit.gatherType === "wood") {
          const nearestTree = game.trees.find(
            (t: any) =>
              t.wood > 0 && Math.hypot(t.x - unit.x, t.y - unit.y) < 40,
          );
          if (nearestTree) {
            const gatherAmount = Math.min(5, nearestTree.wood);
            nearestTree.wood -= gatherAmount;
            unit.carryingAmount += gatherAmount;
            if (unit.carryingAmount >= 20) {
              // Return to castle
              const castle = game.buildings.find(
                (b: any) => b.type === "castle_center" && b.team === unit.team,
              );
              if (
                castle &&
                Math.hypot(castle.x - unit.x, castle.y - unit.y) < 60
              ) {
                const player = game.players.find(
                  (p: any) => p.id === unit.ownerId,
                );
                if (player) {
                  player.wood += unit.carryingAmount;
                  unit.carryingAmount = 0;
                }
              }
            }
          }
        } else if (unit.gatherType === "food") {
          const nearestFarm = game.buildings.find(
            (b: any) =>
              b.type === "farm" &&
              b.team === unit.team &&
              Math.hypot(b.x - unit.x, b.y - unit.y) < 50,
          );
          if (nearestFarm) {
            unit.carryingAmount += 3;
            if (unit.carryingAmount >= 15) {
              const player = game.players.find(
                (p: any) => p.id === unit.ownerId,
              );
              if (player) {
                player.food += unit.carryingAmount;
                unit.carryingAmount = 0;
              }
            }
          }
        }
      }

      // Handle movement
      if (unit.targetX !== null && unit.targetY !== null) {
        const dx = unit.targetX - unit.x;
        const dy = unit.targetY - unit.y;
        const dist = Math.hypot(dx, dy);
        const speed = UNIT_SPEEDS[unit.type] || 2;

        if (dist > speed) {
          unit.x += (dx / dist) * speed;
          unit.y += (dy / dist) * speed;
        } else {
          unit.x = unit.targetX;
          unit.y = unit.targetY;
          unit.targetX = null;
          unit.targetY = null;
        }
      }

      // Handle combat
      if (unit.attackTarget) {
        const target =
          game.units.find((u: any) => u.id === unit.attackTarget) ||
          game.buildings.find((b: any) => b.id === unit.attackTarget);
        if (target && target.health > 0) {
          const dist = Math.hypot(target.x - unit.x, target.y - unit.y);
          const range = UNIT_RANGE[unit.type] || 30;

          if (dist <= range) {
            target.health -= UNIT_DAMAGE[unit.type] || 5;
            if (target.health <= 0) {
              unit.attackTarget = null;
            }
          } else {
            // Move towards target
            unit.targetX = target.x;
            unit.targetY = target.y;
          }
        } else {
          unit.attackTarget = null;
        }
      }
    }

    // Remove dead units
    game.units = game.units.filter((u: any) => u.health > 0);

    // Remove destroyed buildings (except castle center which ends the game)
    game.buildings = game.buildings.filter(
      (b: any) => b.health > 0 || b.type === "castle_center",
    );

    // Remove depleted trees
    game.trees = game.trees.filter((t: any) => t.wood > 0);
  }

  function processCastlesCommand(
    game: any,
    playerId: string,
    command: string,
    unitIds?: string[],
    targetX?: number,
    targetY?: number,
    buildingType?: string,
    unitType?: string,
    buildingId?: string,
    resourceType?: string,
  ) {
    const player = game.players.find((p: any) => p.id === playerId);
    if (!player) return;

    switch (command) {
      case "move":
        if (!unitIds || targetX === undefined || targetY === undefined) return;
        for (const unitId of unitIds) {
          const unit = game.units.find(
            (u: any) => u.id === unitId && u.ownerId === playerId,
          );
          if (unit) {
            unit.targetX = targetX;
            unit.targetY = targetY;
            unit.attackTarget = null;
            unit.isGathering = false;
          }
        }
        break;

      case "attack":
        if (!unitIds || !buildingId) return;
        for (const unitId of unitIds) {
          const unit = game.units.find(
            (u: any) => u.id === unitId && u.ownerId === playerId,
          );
          if (unit) {
            unit.attackTarget = buildingId;
            unit.isGathering = false;
          }
        }
        break;

      case "gather":
        if (!unitIds || !resourceType) return;
        for (const unitId of unitIds) {
          const unit = game.units.find(
            (u: any) =>
              u.id === unitId && u.ownerId === playerId && u.type === "worker",
          );
          if (unit) {
            unit.isGathering = true;
            unit.gatherType = resourceType as "wood" | "food";
            unit.attackTarget = null;
          }
        }
        break;

      case "build":
        if (!buildingType || targetX === undefined || targetY === undefined)
          return;
        
        // Server-side 50% team area restriction
        const mapMidpoint = game.mapWidth / 2;
        if (player.team === "red" && targetX > mapMidpoint) return;
        if (player.team === "blue" && targetX < mapMidpoint) return;
        
        const buildCost = BUILDING_COSTS[buildingType];
        if (
          !buildCost ||
          player.wood < buildCost.wood ||
          player.food < buildCost.food
        )
          return;

        player.wood -= buildCost.wood;
        player.food -= buildCost.food;

        const healthMap: Record<string, number> = {
          barracks: 300,
          catapult_factory: 400,
          farm: 150,
          wall: 200,
        };
        const sizeMap: Record<string, { w: number; h: number }> = {
          barracks: { w: 60, h: 60 },
          catapult_factory: { w: 70, h: 70 },
          farm: { w: 50, h: 50 },
          wall: { w: 20, h: 100 },
        };

        game.buildings.push({
          id: Math.random().toString(36).substr(2, 9),
          type: buildingType,
          team: player.team,
          x: targetX,
          y: targetY,
          width: sizeMap[buildingType]?.w || 50,
          height: sizeMap[buildingType]?.h || 50,
          health: healthMap[buildingType] || 200,
          maxHealth: healthMap[buildingType] || 200,
        });
        break;

      case "train":
        if (!unitType || !buildingId) return;
        const building = game.buildings.find(
          (b: any) => b.id === buildingId && b.team === player.team,
        );
        if (!building) return;

        // Check if correct building
        if (unitType === "soldier" && building.type !== "barracks") return;
        if (unitType === "archer" && building.type !== "barracks") return;
        if (unitType === "catapult" && building.type !== "catapult_factory")
          return;
        if (unitType === "worker" && building.type !== "castle_center") return;

        const trainCost = UNIT_COSTS[unitType];
        if (
          !trainCost ||
          player.wood < trainCost.wood ||
          player.food < trainCost.food
        )
          return;

        player.wood -= trainCost.wood;
        player.food -= trainCost.food;

        const healthMapUnit: Record<string, number> = {
          worker: 50,
          soldier: 100,
          archer: 60,
          catapult: 80,
        };

        game.units.push({
          id: Math.random().toString(36).substr(2, 9),
          type: unitType,
          team: player.team,
          ownerId: playerId,
          x: building.x + building.width / 2,
          y: building.y + building.height + 20,
          health: healthMapUnit[unitType] || 50,
          maxHealth: healthMapUnit[unitType] || 50,
          targetX: null,
          targetY: null,
          attackTarget: null,
          isGathering: false,
          gatherType: null,
          carryingAmount: 0,
        });
        break;
    }
  }

  // Color Clash helper functions
  function startColorClashRound(
    gameId: string,
    sendTo: (playerId: string, message: object) => void,
  ) {
    const game = storage.getColorClashGame(gameId);
    if (!game || game.status !== "playing") return;

    // Reset players for new round
    game.players.forEach((p) => {
      p.currentInput = [];
      p.hasSubmitted = false;
    });

    // Add a new color to the sequence
    const randomColor =
      COLOR_CLASH_COLORS[Math.floor(Math.random() * COLOR_CLASH_COLORS.length)];
    game.colorSequence.push(randomColor);
    game.showingIndex = 0;
    game.roundStatus = "showing";
    game.roundStartTime = Date.now();
    storage.updateColorClashGame(gameId, game);

    // Send initial update
    game.players.forEach((p) => {
      sendTo(p.id, { type: "game_update_colorclash", game });
    });

    // Show colors one at a time with 700ms delay
    function showNextColor(index: number) {
      const gameCheck = storage.getColorClashGame(gameId);
      if (
        !gameCheck ||
        gameCheck.status !== "playing" ||
        gameCheck.roundStatus !== "showing"
      )
        return;

      if (index < gameCheck.colorSequence.length) {
        gameCheck.showingIndex = index;
        storage.updateColorClashGame(gameId, gameCheck);

        gameCheck.players.forEach((p) => {
          sendTo(p.id, { type: "game_update_colorclash", game: gameCheck });
        });

        // Show next color after 700ms
        setTimeout(() => showNextColor(index + 1), 700);
      } else {
        // Done showing - transition to input phase
        gameCheck.roundStatus = "input";
        gameCheck.showingIndex = -1;
        storage.updateColorClashGame(gameId, gameCheck);

        gameCheck.players.forEach((p) => {
          sendTo(p.id, { type: "game_update_colorclash", game: gameCheck });
        });
      }
    }

    // Start showing after a brief pause
    setTimeout(() => showNextColor(0), 500);
  }

  function completeColorClashRound(
    gameId: string,
    sendTo: (playerId: string, message: object) => void,
  ) {
    const game = storage.getColorClashGame(gameId);
    if (!game || game.status !== "playing") return;

    game.roundStatus = "results";
    game.currentRound += 1;
    storage.updateColorClashGame(gameId, game);

    // Send results to all players
    game.players.forEach((p) => {
      sendTo(p.id, { type: "game_update_colorclash", game });
    });

    // Check if game is over (1 or 0 players left)
    const activePlayers = game.players.filter((p) => !p.isEliminated);

    if (activePlayers.length <= 1) {
      // Game over
      game.status = "finished";
      if (activePlayers.length === 1) {
        game.winner = activePlayers[0].id;
        game.winnerName = activePlayers[0].name;
      }
      storage.updateColorClashGame(gameId, game);

      game.players.forEach((p) => {
        storage.updatePlayerStatus(p.id, "online", null);
        sendTo(p.id, { type: "game_update_colorclash", game });
      });

      // Schedule cleanup after 30 seconds
      if (!colorClashCleanupScheduled.has(gameId)) {
        colorClashCleanupScheduled.add(gameId);
        setTimeout(() => {
          storage.deleteColorClashGame(gameId);
          colorClashCleanupScheduled.delete(gameId);
        }, 30000);
      }
    } else {
      // Start next round after 3 seconds
      setTimeout(() => {
        const gameCheck = storage.getColorClashGame(gameId);
        if (gameCheck && gameCheck.status === "playing") {
          startColorClashRound(gameId, sendTo);
        }
      }, 3000);
    }
  }

  // Reaction Race helper functions
  const reactionRaceCleanupScheduled = new Set<string>();

  function startReactionRaceRound(gameId: string) {
    const game = storage.getReactionRaceGame(gameId);
    if (!game || game.status !== "playing") return;

    // Reset players for new round
    game.players.forEach((p) => {
      p.lastReactionTime = null;
      p.falseStart = false;
    });
    game.roundStatus = "ready";
    game.signalTime = null;
    game.roundStartTime = Date.now();
    storage.updateReactionRaceGame(gameId, game);

    // Send update to all players
    game.players.forEach((p) => {
      sendTo(p.id, { type: "game_update_reactionrace", game });
    });

    // Schedule signal after random delay (1-3 seconds)
    const delay = 1000 + Math.random() * 2000;
    setTimeout(() => {
      const gameCheck = storage.getReactionRaceGame(gameId);
      if (
        !gameCheck ||
        gameCheck.status !== "playing" ||
        gameCheck.roundStatus !== "ready"
      )
        return;

      gameCheck.roundStatus = "signal";
      gameCheck.signalTime = Date.now();
      storage.updateReactionRaceGame(gameId, gameCheck);

      gameCheck.players.forEach((p) => {
        sendTo(p.id, { type: "game_update_reactionrace", game: gameCheck });
      });

      // Timeout for slow players (5 seconds after signal)
      setTimeout(() => {
        const gameTimeout = storage.getReactionRaceGame(gameId);
        if (
          !gameTimeout ||
          gameTimeout.status !== "playing" ||
          gameTimeout.roundStatus !== "signal"
        )
          return;

        // Mark any players who haven't responded as having no reaction
        const allResponded = gameTimeout.players.every(
          (p) => p.lastReactionTime !== null || p.falseStart,
        );

        if (!allResponded) {
          completeReactionRaceRound(gameId);
        }
      }, 5000);
    }, delay);
  }

  function completeReactionRaceRound(gameId: string) {
    const game = storage.getReactionRaceGame(gameId);
    if (!game || game.status !== "playing") return;

    game.roundStatus = "complete";

    // Find the winner - fastest reaction time (excluding false starts and non-responders)
    const validPlayers = game.players.filter(
      (p) => p.lastReactionTime !== null && !p.falseStart,
    );

    let winnerId: string | null = null;
    let winnerName: string | null = null;
    let fastestTime: number | null = null;

    if (validPlayers.length > 0) {
      const fastest = validPlayers.reduce((prev, curr) =>
        curr.lastReactionTime! < prev.lastReactionTime! ? curr : prev,
      );
      winnerId = fastest.id;
      winnerName = fastest.name;
      fastestTime = fastest.lastReactionTime;
      fastest.score += 1;
    }

    // Record round result
    game.roundResults.push({
      round: game.currentRound,
      winnerId,
      winnerName,
      reactionTime: fastestTime,
    });

    storage.updateReactionRaceGame(gameId, game);

    // Send update to all players
    game.players.forEach((p) => {
      sendTo(p.id, { type: "game_update_reactionrace", game });
    });

    // Check if game is over (5 rounds)
    if (game.currentRound >= game.totalRounds) {
      // Game over - find winner
      const sortedPlayers = [...game.players].sort((a, b) => b.score - a.score);
      game.winner = sortedPlayers[0].id;
      game.status = "finished";
      storage.updateReactionRaceGame(gameId, game);

      game.players.forEach((p) => {
        storage.updatePlayerStatus(p.id, "online", null);
        sendTo(p.id, { type: "game_update_reactionrace", game });
      });

      // Schedule cleanup after 30 seconds
      if (!reactionRaceCleanupScheduled.has(gameId)) {
        reactionRaceCleanupScheduled.add(gameId);
        setTimeout(() => {
          storage.deleteReactionRaceGame(gameId);
          reactionRaceCleanupScheduled.delete(gameId);
        }, 30000);
      }
    } else {
      // Start next round after 2 seconds
      game.currentRound += 1;
      storage.updateReactionRaceGame(gameId, game);

      setTimeout(() => {
        startReactionRaceRound(gameId);
      }, 2000);
    }
  }

  function checkTTTWinner(board: (string | null)[]): string | null {
    const lines = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    for (const [a, b, c] of lines) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a];
      }
    }
    return null;
  }

  function getRPSWinner(
    choice1: RPSChoice,
    choice2: RPSChoice,
  ): "player1" | "player2" | "draw" {
    if (choice1 === choice2) return "draw";
    if (
      (choice1 === "rock" && choice2 === "scissors") ||
      (choice1 === "scissors" && choice2 === "paper") ||
      (choice1 === "paper" && choice2 === "rock")
    ) {
      return "player1";
    }
    return "player2";
  }

  function processWerewolfVote(gameId: string) {
    const game = storage.getWerewolfGame(gameId);
    if (!game || game.phase !== "voting") return;

    const alivePlayers = game.players.filter((p) => p.isAlive);
    const voteCounts: Record<string, number> = {};

    Object.values(game.votes).forEach((targetId) => {
      voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
    });

    let maxVotes = 0;
    let eliminatedId: string | null = null;
    let isTie = false;

    // Determine who had the most votes
    Object.entries(voteCounts).forEach(([id, count]) => {
      if (count > maxVotes) {
        maxVotes = count;
        eliminatedId = id;
        isTie = false;
      } else if (count === maxVotes) {
        isTie = true;
      }
    });

    // Apply elimination if not a tie and someone received votes
    if (!isTie && eliminatedId) {
      const suspect = game.players.find((p) => p.id === eliminatedId);
      if (suspect) {
        suspect.isAlive = false;
        game.lastVoteSuspect = eliminatedId;
        game.eliminatedTonight = eliminatedId; // repurposing this or use a specific field
        if (suspect.role === "werewolf") {
          game.lastVoteResult = "werewolf_eliminated";
        } else {
          game.lastVoteResult = "villager_safe"; // Innocent person died
        }
      }
    } else {
      game.lastVoteResult = "tie";
      game.lastVoteSuspect = null;
      game.eliminatedTonight = null;
    }

    // Check if game ended due to this vote
    checkWerewolfWinCondition(game);

    if (game.status === "finished") {
      storage.updateWerewolfGame(game.id, game);
      game.players.forEach((p) => {
        const playerData = game.players.find((gp) => gp.id === p.id);
        sendTo(p.id, {
          type: "game_update_werewolf",
          game,
          playerRole: playerData?.role,
        });
      });
    } else {
      // Transition to a "result" state briefly so players can see who died
      // We'll keep phase as 'voting' but send the results, then wait 5s to switch to 'night'
      storage.updateWerewolfGame(game.id, game);

      game.players.forEach((p) => {
        const playerData = game.players.find((gp) => gp.id === p.id);
        sendTo(p.id, {
          type: "game_update_werewolf",
          game,
          playerRole: playerData?.role,
        });
      });

      // Wait 5 seconds to show results, then go to Night
      setTimeout(() => {
        const currentGame = storage.getWerewolfGame(gameId);
        if (!currentGame || currentGame.status === "finished") return;

        // Reset for Night Phase
        currentGame.phase = "night";
        currentGame.votes = {};
        currentGame.day += 1;
        currentGame.phaseEndTime = Date.now() + 45000;
        currentGame.lastVoteResult = null; // Clear result display
        currentGame.lastVoteSuspect = null;

        const hasSeer = currentGame.players.some(
          (p) => p.role === "seer" && p.isAlive,
        );
        const hasDoctor = currentGame.players.some(
          (p) => p.role === "doctor" && p.isAlive,
        );
        currentGame.actionsSubmitted = {
          werewolves: false,
          doctor: !hasDoctor,
          seer: !hasSeer,
        };

        storage.updateWerewolfGame(currentGame.id, currentGame);

        currentGame.players.forEach((p) => {
          const playerData = currentGame.players.find((gp) => gp.id === p.id);
          sendTo(p.id, {
            type: "game_update_werewolf",
            game: currentGame,
            playerRole: playerData?.role,
          });
        });
      }, 5000); // 5 Seconds delay
    }
  }

  function handleSpyHuntPlayerExit(
    gameId: string,
    playerId: string,
    reason: "left" | "disconnected" | "kicked" = "left",
  ) {
    const game = storage.getSpyHuntGame(gameId);
    if (!game) return;

    const leavingPlayer = game.players.find((p) => p.id === playerId);
    if (!leavingPlayer) return;

    const wasSpy = game.spyId === playerId;
    const previousOrder = game.players.map((p) => p.id);
    const removedTurn = game.currentTurn === playerId;

    game.players = game.players.filter((p) => p.id !== playerId);

    delete game.votes[playerId];
    Object.keys(game.votes).forEach((voterId) => {
      if (game.votes[voterId] === playerId) {
        delete game.votes[voterId];
      }
    });

    if (game.status === "voting") {
      if (game.accuserId === playerId || game.accusedId === playerId) {
        game.status = "questioning";
        game.votingActive = false;
        game.votes = {};
        game.accuserId = null;
        game.accusedId = null;
        game.players.forEach((p) => {
          p.hasVoted = false;
        });
      } else {
        game.players.forEach((p) => {
          p.hasVoted = Object.prototype.hasOwnProperty.call(game.votes, p.id);
        });
      }
    } else {
      game.players.forEach((p) => {
        p.hasVoted = false;
      });
    }

    if (removedTurn) {
      const removedIdx = previousOrder.indexOf(playerId);
      let nextTurn: string | null = null;
      for (let step = 1; step <= previousOrder.length; step++) {
        const idx = (removedIdx + step) % previousOrder.length;
        const candidate = previousOrder[idx];
        if (game.players.some((p) => p.id === candidate)) {
          nextTurn = candidate;
          break;
        }
      }
      game.currentTurn = nextTurn || game.players[0]?.id || "";
    } else if (!game.players.some((p) => p.id === game.currentTurn)) {
      game.currentTurn = game.players[0]?.id || "";
    }

    const actionWord =
      reason === "kicked"
        ? "was removed"
        : reason === "disconnected"
          ? "disconnected"
          : "left";

    if (wasSpy) {
      game.status = "finished";
      game.winner = "players";
      game.winReason = `${leavingPlayer.name} ${actionWord}. The spy is out, so players win!`;
    } else if (game.players.length <= 2) {
      game.status = "finished";
      game.winner = "spy";
      game.winReason = `Only ${game.players.length} players remain. The spy wins!`;
    } else {
      game.winner = null;
      game.winReason = null;
    }

    if (game.status === "finished") {
      const spyPlayer = wasSpy
        ? leavingPlayer
        : game.players.find((p) => p.id === game.spyId);
      const log = storage.addGameLog(
        "Spy Hunt",
        game.winner === "players" ? "Players" : spyPlayer?.name || "Spy",
        game.winner === "players" ? spyPlayer?.name || "Spy" : "Players",
        false,
      );
      broadcast({ type: "game_log", log });

      storage.updateSpyHuntGame(game.id, game);
      game.players.forEach((p) => {
        storage.updatePlayerStatus(p.id, "online", null);
        sendTo(p.id, {
          type: "game_update_spyhunt",
          game,
          isSpy: p.id === game.spyId,
          location: game.location,
        });
      });
      storage.deleteSpyHuntGame(game.id);
      return;
    }

    storage.updateSpyHuntGame(game.id, game);
    game.players.forEach((p) => {
      sendTo(p.id, {
        type: "game_update_spyhunt",
        game,
        isSpy: p.id === game.spyId,
        location: p.id === game.spyId ? undefined : game.location,
      });
    });
  }

  function canUseVipAdminDM(fromName: string, toName: string): boolean {
    const fromIsAdmin = storage.isAdmin(fromName);
    const fromIsVip = storage.isVip(fromName);
    const toIsAdmin = storage.isAdmin(toName);
    const toIsVip = storage.isVip(toName);
    return (fromIsAdmin && toIsVip) || (fromIsVip && toIsAdmin);
  }

  function isVipOrAdmin(username: string): boolean {
    return storage.isAdmin(username) || storage.isVip(username);
  }

  const heartbeatInterval = setInterval(() => {
    wss.clients.forEach((ws) => {
      const extWs = ws as ExtendedWebSocket;
      if (extWs.isAlive === false) {
        return ws.terminate();
      }
      extWs.isAlive = false;
      ws.ping();
    });
  }, 30000);

  wss.on("close", () => {
    clearInterval(heartbeatInterval);
  });

  wss.on("connection", (ws: ExtendedWebSocket) => {
    ws.isAlive = true;

    ws.on("pong", () => {
      ws.isAlive = true;
    });

    ws.on("message", (rawData) => {
      try {
        const data = JSON.parse(rawData.toString());

        switch (data.type) {
          case "join": {
            const existingPlayer = storage.getPlayerByUsername(data.username);
            if (existingPlayer) {
              const existingClient = clients.get(existingPlayer.id);
              if (
                existingClient &&
                existingClient.readyState === WebSocket.OPEN &&
                existingClient !== ws
              ) {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    message:
                      "Username already in use. Please choose a different name or wait for them to leave.",
                  }),
                );
                ws.close();
                return;
              }
              storage.removePlayer(existingPlayer.id);
              clients.delete(existingPlayer.id);
              broadcast({ type: "player_left", playerId: existingPlayer.id });
            }

            const playerId = Math.random().toString(36).substring(2, 15);
            ws.playerId = playerId;
            ws.playerName = data.username;
            clients.set(playerId, ws);

            const player = storage.addPlayer(playerId, data.username);

            ws.send(
              JSON.stringify({
                type: "your_id",
                playerId,
                isAdmin: storage.isAdmin(data.username),
                isVip: storage.isVip(data.username),
              }),
            );
            ws.send(
              JSON.stringify({
                type: "players_list",
                players: storage.getAllPlayers(),
              }),
            );
            ws.send(
              JSON.stringify({
                type: "chat_history",
                messages: storage.getMessages().map((message) => ({
                  ...message,
                  // Rebind own history messages to current session id so they render on the right after refresh.
                  playerId:
                    message.playerName === data.username
                      ? playerId
                      : message.playerId,
                  // Ensure role skin is present for restored/legacy messages.
                  isAdmin:
                    message.isAdmin ?? storage.isAdmin(message.playerName),
                  isVip: message.isVip ?? storage.isVip(message.playerName),
                })),
              }),
            );

            broadcast({ type: "player_joined", player }, playerId);
            broadcast({
              type: "players_list",
              players: storage.getAllPlayers(),
            });
            break;
          }

          case "chat_message": {
            if (!ws.playerId || !ws.playerName) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Please join first before sending messages.",
                }),
              );
              return;
            }
            const message = storage.addMessage(
              ws.playerId,
              ws.playerName,
              data.content,
            );
            const isMessageAdmin = storage.isAdmin(ws.playerName);
            const isMessageVip = storage.isVip(ws.playerName);
            broadcast({
              type: "chat_message",
              message: {
                ...message,
                isAdmin: isMessageAdmin,
                isVip: isMessageVip,
              },
            });
            break;
          }

          case "admin_kick": {
            if (!ws.playerId || !ws.playerName) return;
            if (!storage.isAdmin(ws.playerName)) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "You don't have permission to kick players.",
                }),
              );
              return;
            }
            const targetPlayer = storage.getPlayer(data.targetPlayerId);
            if (!targetPlayer) return;
            const targetClient = clients.get(data.targetPlayerId);
            if (targetClient && targetClient.readyState === WebSocket.OPEN) {
              targetClient.send(
                JSON.stringify({
                  type: "kicked",
                  message: "You have been kicked by an admin.",
                }),
              );
              targetClient.close();
            }
            storage.removePlayer(data.targetPlayerId);
            clients.delete(data.targetPlayerId);
            broadcast({ type: "player_left", playerId: data.targetPlayerId });
            broadcast({
              type: "players_list",
              players: storage.getAllPlayers(),
            });
            broadcast({
              type: "system_message",
              message: `${targetPlayer.username} was kicked by admin.`,
            });
            break;
          }

          case "admin_ban": {
            if (!ws.playerId || !ws.playerName) return;
            if (!storage.isAdmin(ws.playerName)) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "You don't have permission to ban players.",
                }),
              );
              return;
            }
            const banTarget = storage.getPlayer(data.targetPlayerId);
            if (!banTarget) return;
            storage.banIP(data.targetPlayerId);
            const banClient = clients.get(data.targetPlayerId);
            if (banClient && banClient.readyState === WebSocket.OPEN) {
              banClient.send(
                JSON.stringify({
                  type: "banned",
                  message: "You have been banned by an admin.",
                }),
              );
              banClient.close();
            }
            storage.removePlayer(data.targetPlayerId);
            clients.delete(data.targetPlayerId);
            broadcast({ type: "player_left", playerId: data.targetPlayerId });
            broadcast({
              type: "players_list",
              players: storage.getAllPlayers(),
            });
            broadcast({
              type: "system_message",
              message: `${banTarget.username} was banned by admin.`,
            });
            break;
          }

          case "admin_clear_chat": {
            if (!ws.playerId || !ws.playerName) return;
            if (!storage.isAdmin(ws.playerName)) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "You don't have permission to clear chat.",
                }),
              );
              return;
            }
            storage.clearMessages();
            broadcast({ type: "chat_cleared" });
            broadcast({
              type: "system_message",
              message: "Chat was cleared by admin.",
            });
            break;
          }

          case "admin_toggle_vip": {
            if (!ws.playerId || !ws.playerName) return;
            if (!storage.isAdmin(ws.playerName)) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "You don't have permission to toggle VIP status.",
                }),
              );
              return;
            }
            const targetPlayer = storage.getPlayer(data.playerId);
            if (!targetPlayer) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Player not found.",
                }),
              );
              return;
            }
            const isCurrentlyVip = storage.isVip(targetPlayer.username);
            if (isCurrentlyVip) {
              storage.removeVip(targetPlayer.username);
            } else {
              storage.addVip(targetPlayer.username);
            }
            const newVipStatus = storage.isVip(targetPlayer.username);
            broadcast({
              type: "vip_status_changed",
              playerId: data.playerId,
              playerName: targetPlayer.username,
              isVip: newVipStatus,
            });
            broadcast({
              type: "system_message",
              message: `${targetPlayer.username} is now ${newVipStatus ? "a VIP" : "no longer a VIP"}.`,
            });
            break;
          }

          case "delete_message": {
            if (!ws.playerId || !ws.playerName) return;
            const isAdminUser = storage.isAdmin(ws.playerName);
            const isVipUser = storage.isVip(ws.playerName);
            const messageToDelete = storage
              .getMessages()
              .find((m) => m.id === data.messageId);

            if (!messageToDelete) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Message not found.",
                }),
              );
              return;
            }

            const canDelete =
              isAdminUser ||
              (isVipUser && messageToDelete.playerId === ws.playerId);

            if (!canDelete) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "You don't have permission to delete this message.",
                }),
              );
              return;
            }

            const deleted = storage.deleteMessage(data.messageId);
            if (deleted) {
              broadcast({
                type: "message_deleted",
                messageId: data.messageId,
              });
            }
            break;
          }

          case "admin_force_kick": {
            if (!ws.playerId || !ws.playerName) return;
            if (!storage.isAdmin(ws.playerName)) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "You don't have permission to force kick players.",
                }),
              );
              return;
            }
            const forceKickTarget = storage.getPlayer(data.targetPlayerId);
            if (!forceKickTarget) return;

            const targetId = data.targetPlayerId;
            const targetName = forceKickTarget.username;

            const tttGame = storage.getTTTGameByPlayerId(targetId);
            if (tttGame) {
              const otherId =
                tttGame.player1Id === targetId
                  ? tttGame.player2Id
                  : tttGame.player1Id;
              tttGame.spectators.forEach((s) => {
                sendTo(s.id, { type: "game_update_ttt", game: null });
              });
              storage.deleteTTTGame(tttGame.id);
              storage.updatePlayerStatus(tttGame.player1Id, "online", null);
              storage.updatePlayerStatus(tttGame.player2Id, "online", null);
              sendTo(otherId, {
                type: "opponent_left",
                game: "tictactoe",
                opponentName: targetName,
                message: `${targetName} was kicked by admin. You win!`,
              });
              sendTo(otherId, { type: "game_update_ttt", game: null });
            }

            const rpsGame = storage.getRPSGameByPlayerId(targetId);
            if (rpsGame) {
              const otherId =
                rpsGame.player1Id === targetId
                  ? rpsGame.player2Id
                  : rpsGame.player1Id;
              storage.deleteRPSGame(rpsGame.id);
              storage.updatePlayerStatus(rpsGame.player1Id, "online", null);
              storage.updatePlayerStatus(rpsGame.player2Id, "online", null);
              sendTo(otherId, {
                type: "opponent_left",
                game: "rps",
                opponentName: targetName,
                message: `${targetName} was kicked by admin.`,
              });
              sendTo(otherId, { type: "game_update_rps", game: null });
            }

            const wsGame = storage.getWSGameByPlayerId(targetId);
            if (wsGame) {
              const otherId =
                wsGame.player1Id === targetId
                  ? wsGame.player2Id
                  : wsGame.player1Id;
              storage.deleteWSGame(wsGame.id);
              storage.updatePlayerStatus(wsGame.player1Id, "online", null);
              storage.updatePlayerStatus(wsGame.player2Id, "online", null);
              sendTo(otherId, {
                type: "opponent_left",
                game: "wordscramble",
                opponentName: targetName,
                message: `${targetName} was kicked by admin.`,
              });
              sendTo(otherId, { type: "game_update_ws", game: null });
            }

            const ngGame = storage.getNGGameByPlayerId(targetId);
            if (ngGame) {
              const otherId =
                ngGame.player1Id === targetId
                  ? ngGame.player2Id
                  : ngGame.player1Id;
              storage.deleteNGGame(ngGame.id);
              storage.updatePlayerStatus(ngGame.player1Id, "online", null);
              storage.updatePlayerStatus(ngGame.player2Id, "online", null);
              sendTo(otherId, {
                type: "opponent_left",
                game: "numberguess",
                opponentName: targetName,
                message: `${targetName} was kicked by admin.`,
              });
              sendTo(otherId, { type: "game_update_ng", game: null });
            }

            const qmGame = storage.getQMGameByPlayerId(targetId);
            if (qmGame) {
              const otherId =
                qmGame.player1Id === targetId
                  ? qmGame.player2Id
                  : qmGame.player1Id;
              storage.deleteQMGame(qmGame.id);
              storage.updatePlayerStatus(qmGame.player1Id, "online", null);
              storage.updatePlayerStatus(qmGame.player2Id, "online", null);
              sendTo(otherId, {
                type: "opponent_left",
                game: "quickmath",
                opponentName: targetName,
                message: `${targetName} was kicked by admin.`,
              });
              sendTo(otherId, { type: "game_update_qm", game: null });
            }

            const c4Game = storage.getC4GameByPlayerId(targetId);
            if (c4Game) {
              const otherId =
                c4Game.player1Id === targetId
                  ? c4Game.player2Id
                  : c4Game.player1Id;
              if (c4Game.spectators) {
                c4Game.spectators.forEach((s) => {
                  sendTo(s.id, { type: "game_update_c4", game: null });
                });
              }
              storage.deleteC4Game(c4Game.id);
              storage.updatePlayerStatus(c4Game.player1Id, "online", null);
              storage.updatePlayerStatus(c4Game.player2Id, "online", null);
              sendTo(otherId, {
                type: "opponent_left",
                game: "connectfour",
                opponentName: targetName,
                message: `${targetName} was kicked by admin. You win!`,
              });
              sendTo(otherId, { type: "game_update_c4", game: null });
            }

            const riddleLobby = storage.getRiddleLobbyByPlayerId(targetId);
            if (riddleLobby) {
              storage.removePlayerFromRiddleLobby(riddleLobby.id, targetId);
              const updatedRiddleLobby = storage.getRiddleLobby(riddleLobby.id);
              if (updatedRiddleLobby && updatedRiddleLobby.players.length > 0) {
                updatedRiddleLobby.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_riddle",
                    lobby: updatedRiddleLobby,
                  });
                });
              }
            }

            const riddleGame = storage.getRiddleGameByPlayerId(targetId);
            if (riddleGame) {
              riddleGame.players = riddleGame.players.filter(
                (p) => p.id !== targetId,
              );
              storage.updateRiddleGame(riddleGame.id, {
                players: riddleGame.players,
              });
              if (riddleGame.players.length === 0) {
                storage.deleteRiddleGame(riddleGame.id);
              } else {
                const updatedRiddleGame = storage.getRiddleGame(riddleGame.id);
                riddleGame.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_update_riddle",
                    game: updatedRiddleGame,
                  });
                });
              }
            }

            const werewolfLobby = storage.getWerewolfLobbyByPlayerId(targetId);
            if (werewolfLobby) {
              storage.removePlayerFromWerewolfLobby(werewolfLobby.id, targetId);
              const updatedWerewolfLobby = storage.getWerewolfLobby(
                werewolfLobby.id,
              );
              if (
                updatedWerewolfLobby &&
                updatedWerewolfLobby.players.length > 0
              ) {
                updatedWerewolfLobby.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_werewolf",
                    lobby: updatedWerewolfLobby,
                  });
                });
              }
            }

            const werewolfGame = storage.getWerewolfGameByPlayerId(targetId);
            if (werewolfGame) {
              const updatedGame = storage.removePlayerFromWerewolfGame(
                werewolfGame.id,
                targetId,
              );
              if (updatedGame) {
                updatedGame.players.forEach((p) => {
                  const playerData = updatedGame.players.find(
                    (gp) => gp.id === p.id,
                  );
                  sendTo(p.id, {
                    type: "game_update_werewolf",
                    game: updatedGame,
                    playerRole: playerData?.role,
                  });
                });
              }
            }

            const spyhuntLobby = storage.getSpyHuntLobbyByPlayerId(targetId);
            if (spyhuntLobby) {
              storage.removePlayerFromSpyHuntLobby(spyhuntLobby.id, targetId);
              const updatedSpyHuntLobby = storage.getSpyHuntLobby(
                spyhuntLobby.id,
              );
              if (
                updatedSpyHuntLobby &&
                updatedSpyHuntLobby.players.length > 0
              ) {
                updatedSpyHuntLobby.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_spyhunt",
                    lobby: updatedSpyHuntLobby,
                  });
                });
              }
            }

            const spyhuntGame = storage.getSpyHuntGameByPlayerId(targetId);
            if (spyhuntGame) {
              handleSpyHuntPlayerExit(spyhuntGame.id, targetId, "kicked");
            }

            leaveWarzoneRoom(targetId);

            const memoryLobby = storage.getMemoryLobbyByPlayerId(targetId);
            if (memoryLobby) {
              storage.removePlayerFromMemoryLobby(memoryLobby.id, targetId);
              const updatedMemoryLobby = storage.getMemoryLobby(memoryLobby.id);
              if (updatedMemoryLobby && updatedMemoryLobby.players.length > 0) {
                updatedMemoryLobby.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_memory",
                    lobby: updatedMemoryLobby,
                  });
                });
              }
            }

            const memoryGame = storage.getMemoryGameByPlayerId(targetId);
            if (memoryGame) {
              memoryGame.players = memoryGame.players.filter(
                (p) => p.id !== targetId,
              );
              storage.updateMemoryGame(memoryGame.id, {
                players: memoryGame.players,
              });
              if (memoryGame.players.length === 0) {
                storage.deleteMemoryGame(memoryGame.id);
              } else {
                const updatedMemoryGame = storage.getMemoryGame(memoryGame.id);
                memoryGame.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_update_memory",
                    game: updatedMemoryGame,
                  });
                });
                if (memoryGame.spectators) {
                  memoryGame.spectators.forEach((s) => {
                    sendTo(s.id, {
                      type: "game_update_memory",
                      game: updatedMemoryGame,
                    });
                  });
                }
              }
            }

            const typingLobby = storage.getTypingLobbyByPlayerId(targetId);
            if (typingLobby) {
              storage.removePlayerFromTypingLobby(typingLobby.id, targetId);
              const updatedTypingLobby = storage.getTypingLobby(typingLobby.id);
              if (updatedTypingLobby && updatedTypingLobby.players.length > 0) {
                updatedTypingLobby.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_typing",
                    lobby: updatedTypingLobby,
                  });
                });
              }
            }

            const typingGame = storage.getTypingGameByPlayerId(targetId);
            if (typingGame) {
              typingGame.players = typingGame.players.filter(
                (p) => p.id !== targetId,
              );
              storage.updateTypingGame(typingGame.id, {
                players: typingGame.players,
              });
              if (typingGame.players.length === 0) {
                storage.deleteTypingGame(typingGame.id);
              } else {
                const updatedTypingGame = storage.getTypingGame(typingGame.id);
                typingGame.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_update_typing",
                    game: updatedTypingGame,
                  });
                });
              }
            }

            const pointOnPointLobby =
              storage.getPointOnPointLobbyByPlayerId(targetId);
            if (pointOnPointLobby) {
              storage.removePlayerFromPointOnPointLobby(
                pointOnPointLobby.id,
                targetId,
              );
              const updatedPOPLobby = storage.getPointOnPointLobby(
                pointOnPointLobby.id,
              );
              if (updatedPOPLobby && updatedPOPLobby.players.length > 0) {
                updatedPOPLobby.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_pointonpoint",
                    lobby: updatedPOPLobby,
                  });
                });
              }
            }

            const pointOnPointGame =
              storage.getPointOnPointGameByPlayerId(targetId);
            if (pointOnPointGame) {
              pointOnPointGame.players = pointOnPointGame.players.filter(
                (p) => p.id !== targetId,
              );
              if (pointOnPointGame.players.length === 0) {
                storage.deletePointOnPointGame(pointOnPointGame.id);
              } else {
                if (pointOnPointGame.hostId === targetId) {
                  pointOnPointGame.hostId = pointOnPointGame.players[0].id;
                }
                storage.updatePointOnPointGame(
                  pointOnPointGame.id,
                  pointOnPointGame,
                );
                pointOnPointGame.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_update_pointonpoint",
                    game: pointOnPointGame,
                  });
                });
              }
            }

            const outpostRushLobby =
              storage.getOutpostRushLobbyByPlayerId(targetId);
            if (outpostRushLobby) {
              storage.removePlayerFromOutpostRushLobby(
                outpostRushLobby.id,
                targetId,
              );
              const updatedORLobby = storage.getOutpostRushLobby(
                outpostRushLobby.id,
              );
              if (updatedORLobby && updatedORLobby.players.length > 0) {
                updatedORLobby.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_outpostrush",
                    lobby: updatedORLobby,
                  });
                });
              }
            }

            const outpostRushGame =
              storage.getOutpostRushGameByPlayerId(targetId);
            if (outpostRushGame) {
              outpostRushGame.players = outpostRushGame.players.filter(
                (p) => p.id !== targetId,
              );
              if (outpostRushGame.players.length < 2) {
                storage.deleteOutpostRushGame(outpostRushGame.id);
                outpostRushGame.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_ended_outpostrush",
                    message: "Game ended - not enough players after kick.",
                  });
                });
              } else {
                storage.updateOutpostRushGame(
                  outpostRushGame.id,
                  outpostRushGame,
                );
                outpostRushGame.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_update_outpostrush",
                    game: outpostRushGame,
                  });
                });
              }
            }

            const emojiChainLobby =
              storage.getEmojiChainLobbyByPlayerId(targetId);
            if (emojiChainLobby) {
              storage.removePlayerFromEmojiChainLobby(
                emojiChainLobby.id,
                targetId,
              );
              const updatedECLobby = storage.getEmojiChainLobby(
                emojiChainLobby.id,
              );
              if (updatedECLobby && updatedECLobby.players.length > 0) {
                updatedECLobby.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_emojichain",
                    lobby: updatedECLobby,
                  });
                });
              }
            }

            const emojiChainGame =
              storage.getEmojiChainGameByPlayerId(targetId);
            if (emojiChainGame) {
              emojiChainGame.players = emojiChainGame.players.filter(
                (p) => p.id !== targetId,
              );
              if (emojiChainGame.players.length < 2) {
                storage.deleteEmojiChainGame(emojiChainGame.id);
                emojiChainGame.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_ended_emojichain",
                    message: "Game ended - not enough players after kick.",
                  });
                });
              } else {
                storage.updateEmojiChainGame(emojiChainGame.id, emojiChainGame);
                emojiChainGame.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_update_emojichain",
                    game: emojiChainGame,
                  });
                });
              }
            }

            const wordAssocLobby =
              storage.getWordAssociationLobbyByPlayerId(targetId);
            if (wordAssocLobby) {
              storage.removePlayerFromWordAssociationLobby(
                wordAssocLobby.id,
                targetId,
              );
              const updatedWALobby = storage.getWordAssociationLobby(
                wordAssocLobby.id,
              );
              if (updatedWALobby && updatedWALobby.players.length > 0) {
                updatedWALobby.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_wordassoc",
                    lobby: updatedWALobby,
                  });
                });
              }
            }

            const wordAssocGame =
              storage.getWordAssociationGameByPlayerId(targetId);
            if (wordAssocGame) {
              wordAssocGame.players = wordAssocGame.players.filter(
                (p) => p.id !== targetId,
              );
              if (wordAssocGame.players.length < 2) {
                storage.deleteWordAssociationGame(wordAssocGame.id);
                wordAssocGame.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_ended_wordassoc",
                    message: "Game ended - not enough players after kick.",
                  });
                });
              } else {
                storage.updateWordAssociationGame(
                  wordAssocGame.id,
                  wordAssocGame,
                );
                wordAssocGame.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_update_wordassoc",
                    game: wordAssocGame,
                  });
                });
              }
            }

            const hangmanLobby = storage.getHangmanLobbyByPlayerId(targetId);
            if (hangmanLobby) {
              storage.removePlayerFromHangmanLobby(hangmanLobby.id, targetId);
              const updatedHMLobby = storage.getHangmanLobby(hangmanLobby.id);
              if (updatedHMLobby && updatedHMLobby.players.length > 0) {
                updatedHMLobby.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_hangman",
                    lobby: updatedHMLobby,
                  });
                });
              }
            }

            const hangmanGame = storage.getHangmanGameByPlayerId(targetId);
            if (hangmanGame) {
              hangmanGame.players = hangmanGame.players.filter(
                (p) => p.id !== targetId,
              );
              if (hangmanGame.players.length < 2) {
                storage.deleteHangmanGame(hangmanGame.id);
                hangmanGame.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_ended_hangman",
                    message: "Game ended - not enough players after kick.",
                  });
                });
              } else {
                storage.updateHangmanGame(hangmanGame.id, hangmanGame);
                hangmanGame.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_update_hangman",
                    game: hangmanGame,
                  });
                });
              }
            }

            const triviaQuizLobby =
              storage.getTriviaQuizLobbyByPlayerId(targetId);
            if (triviaQuizLobby) {
              storage.removePlayerFromTriviaQuizLobby(
                triviaQuizLobby.id,
                targetId,
              );
              const updatedTQLobby = storage.getTriviaQuizLobby(
                triviaQuizLobby.id,
              );
              if (updatedTQLobby && updatedTQLobby.players.length > 0) {
                updatedTQLobby.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_triviaquiz",
                    lobby: updatedTQLobby,
                  });
                });
              }
            }

            const triviaQuizGame =
              storage.getTriviaQuizGameByPlayerId(targetId);
            if (triviaQuizGame) {
              triviaQuizGame.players = triviaQuizGame.players.filter(
                (p) => p.id !== targetId,
              );
              if (triviaQuizGame.players.length === 0) {
                storage.deleteTriviaQuizGame(triviaQuizGame.id);
              } else {
                storage.updateTriviaQuizGame(triviaQuizGame.id, triviaQuizGame);
                triviaQuizGame.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_update_triviaquiz",
                    game: triviaQuizGame,
                  });
                });
              }
            }

            const forceKickClient = clients.get(targetId);
            if (
              forceKickClient &&
              forceKickClient.readyState === WebSocket.OPEN
            ) {
              forceKickClient.send(
                JSON.stringify({
                  type: "kicked",
                  message: "You have been force-kicked by an admin.",
                }),
              );
              forceKickClient.close();
            }
            storage.removePlayer(targetId);
            clients.delete(targetId);
            broadcast({ type: "player_left", playerId: targetId });
            broadcast({
              type: "players_list",
              players: storage.getAllPlayers(),
            });
            broadcast({
              type: "system_message",
              message: `${targetName} was force-kicked by admin.`,
            });
            break;
          }

          case "admin_unban": {
            if (!ws.playerId || !ws.playerName) return;
            if (!storage.isAdmin(ws.playerName)) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "You don't have permission to unban.",
                }),
              );
              return;
            }
            storage.unbanIP(data.ip);
            ws.send(
              JSON.stringify({ type: "admin_unban_success", ip: data.ip }),
            );
            ws.send(
              JSON.stringify({
                type: "banned_list",
                bannedIPs: storage.getBannedIPs(),
              }),
            );
            break;
          }

          case "admin_get_banned_list": {
            if (!ws.playerId || !ws.playerName) return;
            if (!storage.isAdmin(ws.playerName)) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "You don't have permission to view banned list.",
                }),
              );
              return;
            }
            ws.send(
              JSON.stringify({
                type: "banned_list",
                bannedIPs: storage.getBannedIPs(),
              }),
            );
            break;
          }

          case "dm_send": {
            if (!ws.playerId || !ws.playerName) return;
            const { toPlayerId, content } = data;
            if (!toPlayerId || !content) return;

            const toPlayer = storage.getPlayer(toPlayerId);
            if (!toPlayer) {
              ws.send(
                JSON.stringify({ type: "error", message: "Player not found" }),
              );
              return;
            }

            if (!canUseVipAdminDM(ws.playerName, toPlayer.username)) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "DM is only allowed between admin and VIP users.",
                }),
              );
              return;
            }

            const message = storage.addDirectMessage(
              ws.playerId,
              ws.playerName,
              toPlayerId,
              toPlayer.username,
              content,
            );

            ws.send(JSON.stringify({ type: "direct_message", message }));
            sendTo(toPlayerId, { type: "direct_message", message });
            break;
          }

          case "dm_request": {
            if (!ws.playerId || !ws.playerName) return;
            const { toPlayerId } = data;
            if (!toPlayerId) {
              ws.send(JSON.stringify({ type: "error", message: "Missing DM partner" }));
              return;
            }
            const toPlayer = storage.getPlayer(toPlayerId);
            if (!toPlayer) {
              ws.send(JSON.stringify({ type: "error", message: "Player not found" }));
              return;
            }

            if (!canUseVipAdminDM(ws.playerName, toPlayer.username)) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "DM is only allowed between admin and VIP users.",
                }),
              );
              return;
            }

            const messages = storage.getDirectMessages(ws.playerId, toPlayerId);
            storage.markMessagesAsRead(ws.playerId, toPlayerId);
            ws.send(JSON.stringify({ type: "dm_history", partnerId: toPlayerId, messages }));
            break;
          }

          case "warzone_create_room": {
            if (!ws.playerId || !ws.playerName) return;
            const displayNameRaw =
              typeof data.displayName === "string" ? data.displayName : "";
            const displayName = displayNameRaw.trim().slice(0, 20);
            if (!displayName) {
              sendTo(ws.playerId, {
                type: "error",
                message: "Enter a valid in-game name for Warzone.",
              });
              return;
            }

            const team: WarzoneTeam = data.team === "red" ? "red" : "blue";
            const map: WarzoneMap =
              data.map === "desert" ||
              data.map === "forest" ||
              data.map === "industrial" ||
              data.map === "arctic"
                ? data.map
                : "urban";

            leaveWarzoneRoom(ws.playerId);

            let code = generateWarzoneCode();
            while (warzoneRooms.has(code)) {
              code = generateWarzoneCode();
            }

            const room: WarzoneRoomRuntime = {
              code,
              hostPlayerId: ws.playerId,
              mode: "multiplayer",
              map,
              started: false,
              players: new Map([[ws.playerId, { name: displayName, team }]]),
              states: new Map(),
              chat: [],
            };
            warzoneRooms.set(code, room);

            sendTo(ws.playerId, { type: "warzone_room_update", room: toWarzoneRoomPayload(room) });
            sendTo(ws.playerId, { type: "warzone_states", states: [] });
            sendTo(ws.playerId, { type: "warzone_chat_history", messages: [] });
            break;
          }

          case "warzone_join_room": {
            if (!ws.playerId || !ws.playerName) return;
            const codeRaw = typeof data.code === "string" ? data.code : "";
            const code = codeRaw.trim().toUpperCase();
            const room = warzoneRooms.get(code);
            if (!room) {
              sendTo(ws.playerId, { type: "error", message: "Warzone room not found." });
              return;
            }
            const displayNameRaw =
              typeof data.displayName === "string" ? data.displayName : "";
            const displayName = displayNameRaw.trim().slice(0, 20);
            if (!displayName) {
              sendTo(ws.playerId, {
                type: "error",
                message: "Enter a valid in-game name for Warzone.",
              });
              return;
            }

            leaveWarzoneRoom(ws.playerId);

            const team: WarzoneTeam = data.team === "red" ? "red" : "blue";
            room.players.set(ws.playerId, { name: displayName, team });
            if (!room.hostPlayerId || !room.players.has(room.hostPlayerId)) {
              room.hostPlayerId = ws.playerId;
            }

            emitWarzoneRoomUpdate(room);
            emitWarzoneStates(room);
            sendTo(ws.playerId, { type: "warzone_chat_history", messages: room.chat });
            break;
          }

          case "warzone_leave_room": {
            if (!ws.playerId) return;
            leaveWarzoneRoom(ws.playerId);
            break;
          }

          case "warzone_start_game": {
            if (!ws.playerId) return;
            const room = getWarzoneRoomByPlayerId(ws.playerId);
            if (!room) return;
            if (room.hostPlayerId !== ws.playerId) return;
            if (room.players.size < 2) {
              sendTo(ws.playerId, {
                type: "error",
                message: "Need at least 2 players to start Warzone multiplayer.",
              });
              return;
            }
            room.started = true;
            room.mode = "multiplayer";
            emitWarzoneRoomUpdate(room);
            break;
          }

          case "warzone_state_update": {
            if (!ws.playerId) return;
            const room = getWarzoneRoomByPlayerId(ws.playerId);
            if (!room) return;
            if (typeof data.code !== "string" || data.code !== room.code) return;
            const player = room.players.get(ws.playerId);
            if (!player) return;
            const incoming = data.state as WarzonePlayerState | undefined;
            if (!incoming) return;

            const safeState: WarzonePlayerState = {
              playerId: ws.playerId,
              name: player.name,
              team: player.team,
              position: {
                x: Number(incoming.position?.x ?? 0),
                y: Number(incoming.position?.y ?? 0),
                z: Number(incoming.position?.z ?? 0),
              },
              rotation: {
                x: Number(incoming.rotation?.x ?? 0),
                y: Number(incoming.rotation?.y ?? 0),
              },
              health: Number(incoming.health ?? 100),
              isDead: Boolean(incoming.isDead),
              currentWeapon: Number(incoming.currentWeapon ?? 1),
              weaponType: String(incoming.weaponType ?? "ak47"),
              timestamp: Date.now(),
            };

            room.states.set(ws.playerId, safeState);
            emitWarzoneStates(room);
            break;
          }

          case "warzone_chat_send": {
            if (!ws.playerId) return;
            const room = getWarzoneRoomByPlayerId(ws.playerId);
            if (!room) return;
            if (typeof data.code !== "string" || data.code !== room.code) return;
            const player = room.players.get(ws.playerId);
            if (!player) return;
            const raw = typeof data.message === "string" ? data.message : "";
            const content = raw.trim().slice(0, 240);
            if (!content) return;

            const message: WarzoneChatMessage = {
              id: randomUUID(),
              playerId: ws.playerId,
              sender: player.name,
              content,
              timestamp: Date.now(),
            };
            room.chat.push(message);
            if (room.chat.length > 100) {
              room.chat = room.chat.slice(-100);
            }
            room.players.forEach((_v, playerId) => {
              sendTo(playerId, { type: "warzone_chat_message", message });
            });
            break;
          }

          case "challenge_sent": {
            if (!ws.playerId || !ws.playerName) return;
            const toPlayer = storage.getPlayer(data.toPlayerId);
            if (!toPlayer || toPlayer.status !== "online") return;

            const challenge = storage.createChallenge(
              ws.playerId,
              ws.playerName,
              data.toPlayerId,
              toPlayer.username,
              data.gameType,
            );

            sendTo(data.toPlayerId, { type: "challenge_received", challenge });
            break;
          }

          case "challenge_response": {
            if (!ws.playerId) return;
            const challenge = storage.getChallenge(data.challengeId);
            if (!challenge || challenge.toPlayerId !== ws.playerId) return;

            if (data.accepted) {
              storage.updateChallengeStatus(data.challengeId, "accepted");

              if (challenge.gameType === "tictactoe") {
                const game = storage.createTTTGame(
                  challenge.fromPlayerId,
                  challenge.fromPlayerName,
                  challenge.toPlayerId,
                  challenge.toPlayerName,
                );

                storage.updatePlayerStatus(
                  challenge.fromPlayerId,
                  "in_game",
                  game.id,
                );
                storage.updatePlayerStatus(
                  challenge.toPlayerId,
                  "in_game",
                  game.id,
                );

                sendToGame([challenge.fromPlayerId, challenge.toPlayerId], {
                  type: "game_start_ttt",
                  game,
                });

                broadcast({
                  type: "players_list",
                  players: storage.getAllPlayers(),
                });
              } else if (challenge.gameType === "rps") {
                const game = storage.createRPSGame(
                  challenge.fromPlayerId,
                  challenge.fromPlayerName,
                  challenge.toPlayerId,
                  challenge.toPlayerName,
                );

                storage.updatePlayerStatus(
                  challenge.fromPlayerId,
                  "in_game",
                  game.id,
                );
                storage.updatePlayerStatus(
                  challenge.toPlayerId,
                  "in_game",
                  game.id,
                );

                sendToGame([challenge.fromPlayerId, challenge.toPlayerId], {
                  type: "game_start_rps",
                  game,
                });

                broadcast({
                  type: "players_list",
                  players: storage.getAllPlayers(),
                });
              } else if (challenge.gameType === "wordscramble") {
                const game = storage.createWSGame(
                  challenge.fromPlayerId,
                  challenge.fromPlayerName,
                  challenge.toPlayerId,
                  challenge.toPlayerName,
                );

                storage.updatePlayerStatus(
                  challenge.fromPlayerId,
                  "in_game",
                  game.id,
                );
                storage.updatePlayerStatus(
                  challenge.toPlayerId,
                  "in_game",
                  game.id,
                );

                const sanitizedGame = { ...game };
                delete (sanitizedGame as any).originalWord;

                sendToGame([challenge.fromPlayerId, challenge.toPlayerId], {
                  type: "game_start_ws",
                  game: sanitizedGame,
                });

                broadcast({
                  type: "players_list",
                  players: storage.getAllPlayers(),
                });
              } else if (challenge.gameType === "numberguess") {
                const game = storage.createNGGame(
                  challenge.fromPlayerId,
                  challenge.fromPlayerName,
                  challenge.toPlayerId,
                  challenge.toPlayerName,
                );

                storage.updatePlayerStatus(
                  challenge.fromPlayerId,
                  "in_game",
                  game.id,
                );
                storage.updatePlayerStatus(
                  challenge.toPlayerId,
                  "in_game",
                  game.id,
                );

                sendToGame([challenge.fromPlayerId, challenge.toPlayerId], {
                  type: "game_start_ng",
                  game,
                });

                broadcast({
                  type: "players_list",
                  players: storage.getAllPlayers(),
                });
              } else if (challenge.gameType === "quickmath") {
                const game = storage.createQMGame(
                  challenge.fromPlayerId,
                  challenge.fromPlayerName,
                  challenge.toPlayerId,
                  challenge.toPlayerName,
                );

                storage.updatePlayerStatus(
                  challenge.fromPlayerId,
                  "in_game",
                  game.id,
                );
                storage.updatePlayerStatus(
                  challenge.toPlayerId,
                  "in_game",
                  game.id,
                );

                const sanitizedGame = { ...game };
                delete (sanitizedGame as any).answer;

                sendToGame([challenge.fromPlayerId, challenge.toPlayerId], {
                  type: "game_start_qm",
                  game: sanitizedGame,
                });

                broadcast({
                  type: "players_list",
                  players: storage.getAllPlayers(),
                });
              } else if (challenge.gameType === "connectfour") {
                const game = storage.createC4Game(
                  challenge.fromPlayerId,
                  challenge.fromPlayerName,
                  challenge.toPlayerId,
                  challenge.toPlayerName,
                );

                storage.updatePlayerStatus(
                  challenge.fromPlayerId,
                  "in_game",
                  game.id,
                );
                storage.updatePlayerStatus(
                  challenge.toPlayerId,
                  "in_game",
                  game.id,
                );

                sendToGame([challenge.fromPlayerId, challenge.toPlayerId], {
                  type: "game_start_c4",
                  game,
                });

                broadcast({
                  type: "players_list",
                  players: storage.getAllPlayers(),
                });
              }
            } else {
              storage.updateChallengeStatus(data.challengeId, "declined");
              sendTo(challenge.fromPlayerId, {
                type: "challenge_declined",
                challengeId: data.challengeId,
              });
            }
            break;
          }

          case "game_move_ttt": {
            if (!ws.playerId) return;
            const game = storage.getTTTGame(data.gameId);
            if (
              !game ||
              game.currentTurn !== ws.playerId ||
              game.status !== "playing"
            )
              return;
            if (game.board[data.position] !== null) return;

            const symbol = ws.playerId === game.player1Id ? "X" : "O";
            const newBoard = [...game.board];
            newBoard[data.position] = symbol;

            const winnerSymbol = checkTTTWinner(newBoard);
            let updates: any = { board: newBoard };

            if (winnerSymbol) {
              const winnerId =
                winnerSymbol === "X" ? game.player1Id : game.player2Id;
              updates.winner = winnerId;
              updates.status = "finished";
              if (winnerId === game.player1Id) {
                updates.player1Score = game.player1Score + 1;
              } else {
                updates.player2Score = game.player2Score + 1;
              }
              const winnerName =
                winnerId === game.player1Id
                  ? game.player1Name
                  : game.player2Name;
              const loserName =
                winnerId === game.player1Id
                  ? game.player2Name
                  : game.player1Name;
              const log = storage.addGameLog(
                "Tic Tac Toe",
                winnerName,
                loserName,
                false,
              );
              broadcast({ type: "game_log", log });
            } else if (newBoard.every((cell) => cell !== null)) {
              updates.isDraw = true;
              updates.status = "finished";
              const log = storage.addGameLog(
                "Tic Tac Toe",
                game.player1Name,
                game.player2Name,
                true,
              );
              broadcast({ type: "game_log", log });
            } else {
              updates.currentTurn =
                ws.playerId === game.player1Id
                  ? game.player2Id
                  : game.player1Id;
            }

            const updatedGame = storage.updateTTTGame(data.gameId, updates);
            if (updatedGame) {
              sendToTTTGameAll(updatedGame, {
                type: "game_update_ttt",
                game: updatedGame,
              });
            }
            break;
          }

          case "game_rematch_ttt": {
            if (!ws.playerId) return;
            const game = storage.getTTTGame(data.gameId);
            if (!game || game.status !== "finished") return;

            const updatedGame = storage.updateTTTGame(data.gameId, {
              board: Array(9).fill(null),
              currentTurn: game.winner || game.player1Id,
              winner: null,
              isDraw: false,
              status: "playing",
            });

            if (updatedGame) {
              sendToTTTGameAll(updatedGame, {
                type: "game_update_ttt",
                game: updatedGame,
              });
            }
            break;
          }

          case "game_leave_ttt": {
            if (!ws.playerId) return;
            const game = storage.getTTTGame(data.gameId);
            if (!game) return;

            const isPlayer =
              ws.playerId === game.player1Id || ws.playerId === game.player2Id;
            const isSpectator = game.spectators.some(
              (s) => s.id === ws.playerId,
            );

            if (isSpectator) {
              const updatedGame = storage.removeSpectatorFromTTTGame(
                data.gameId,
                ws.playerId,
              );
              if (updatedGame) {
                sendToTTTGameAll(updatedGame, {
                  type: "game_update_ttt",
                  game: updatedGame,
                });
              }
              return;
            }

            if (!isPlayer) return;

            const otherId =
              game.player1Id === ws.playerId ? game.player2Id : game.player1Id;
            const leavingPlayerName =
              game.player1Id === ws.playerId
                ? game.player1Name
                : game.player2Name;

            game.spectators.forEach((s) => {
              sendTo(s.id, { type: "game_update_ttt", game: null });
            });

            storage.deleteTTTGame(data.gameId);
            storage.updatePlayerStatus(game.player1Id, "online", null);
            storage.updatePlayerStatus(game.player2Id, "online", null);

            sendTo(otherId, {
              type: "opponent_left",
              game: "tictactoe",
              opponentName: leavingPlayerName,
              message: `${leavingPlayerName} left the game. You win!`,
            });
            sendTo(otherId, { type: "game_update_ttt", game: null });

            broadcast({
              type: "players_list",
              players: storage.getAllPlayers(),
            });
            break;
          }

          case "request_active_games_ttt": {
            if (!ws.playerId) return;
            const allGames = storage.getAllTTTGames();
            const activeGames = allGames.map((g) => ({
              id: g.id,
              player1Name: g.player1Name,
              player2Name: g.player2Name,
              spectatorCount: g.spectators.length,
            }));
            sendTo(ws.playerId, {
              type: "active_games_ttt",
              games: activeGames,
            });
            break;
          }

          case "game_spectate_ttt": {
            if (!ws.playerId || !ws.playerName) return;
            const game = storage.getTTTGame(data.gameId);
            if (!game) return;

            if (
              game.player1Id === ws.playerId ||
              game.player2Id === ws.playerId
            )
              return;

            const updatedGame = storage.addSpectatorToTTTGame(
              data.gameId,
              ws.playerId,
              ws.playerName,
            );
            if (updatedGame) {
              sendTo(ws.playerId, {
                type: "game_update_ttt",
                game: updatedGame,
              });
              sendToTTTGameAll(updatedGame, {
                type: "game_update_ttt",
                game: updatedGame,
              });
            }
            break;
          }

          case "game_stop_spectate_ttt": {
            if (!ws.playerId) return;
            const game = storage.getTTTGame(data.gameId);
            if (!game) return;

            storage.removeSpectatorFromTTTGame(data.gameId, ws.playerId);
            sendTo(ws.playerId, { type: "game_update_ttt", game: null });
            break;
          }

          case "game_choice_rps": {
            if (!ws.playerId) return;
            const game = storage.getRPSGame(data.gameId);
            if (!game || game.status !== "choosing") return;

            const isPlayer1 = ws.playerId === game.player1Id;
            const updates: any = isPlayer1
              ? { player1Choice: data.choice }
              : { player2Choice: data.choice };

            let updatedGame = storage.updateRPSGame(data.gameId, updates);
            if (!updatedGame) return;

            if (updatedGame.player1Choice && updatedGame.player2Choice) {
              const result = getRPSWinner(
                updatedGame.player1Choice,
                updatedGame.player2Choice,
              );

              let roundWinner: string | null = null;
              let newP1Score = updatedGame.player1Score;
              let newP2Score = updatedGame.player2Score;

              if (result === "player1") {
                roundWinner = updatedGame.player1Id;
                newP1Score++;
              } else if (result === "player2") {
                roundWinner = updatedGame.player2Id;
                newP2Score++;
              }

              const isFinished = newP1Score >= 3 || newP2Score >= 3;

              updatedGame = storage.updateRPSGame(data.gameId, {
                roundWinner,
                player1Score: newP1Score,
                player2Score: newP2Score,
                status: isFinished ? "finished" : "revealing",
              });

              if (isFinished) {
                const winnerName =
                  newP1Score >= 3
                    ? updatedGame?.player1Name
                    : updatedGame?.player2Name;
                const loserName =
                  newP1Score >= 3
                    ? updatedGame?.player2Name
                    : updatedGame?.player1Name;
                if (winnerName && loserName) {
                  const log = storage.addGameLog(
                    "Rock Paper Scissors",
                    winnerName,
                    loserName,
                    false,
                  );
                  broadcast({ type: "game_log", log });
                }
              }
            }

            if (updatedGame) {
              sendToGame([game.player1Id, game.player2Id], {
                type: "game_update_rps",
                game: updatedGame,
              });
            }
            break;
          }

          case "game_next_round_rps": {
            if (!ws.playerId) return;
            const game = storage.getRPSGame(data.gameId);
            if (!game) return;

            if (game.status === "finished") {
              const updatedGame = storage.updateRPSGame(data.gameId, {
                player1Choice: null,
                player2Choice: null,
                roundWinner: null,
                player1Score: 0,
                player2Score: 0,
                round: 1,
                status: "choosing",
              });

              if (updatedGame) {
                sendToGame([game.player1Id, game.player2Id], {
                  type: "game_update_rps",
                  game: updatedGame,
                });
              }
            } else if (game.status === "revealing") {
              const updatedGame = storage.updateRPSGame(data.gameId, {
                player1Choice: null,
                player2Choice: null,
                roundWinner: null,
                round: game.round + 1,
                status: "choosing",
              });

              if (updatedGame) {
                sendToGame([game.player1Id, game.player2Id], {
                  type: "game_update_rps",
                  game: updatedGame,
                });
              }
            }
            break;
          }

          case "game_leave_rps": {
            if (!ws.playerId) return;
            const game = storage.getRPSGame(data.gameId);
            if (!game) return;

            const otherId =
              game.player1Id === ws.playerId ? game.player2Id : game.player1Id;
            const leavingPlayerName =
              game.player1Id === ws.playerId
                ? game.player1Name
                : game.player2Name;

            storage.deleteRPSGame(data.gameId);
            storage.updatePlayerStatus(game.player1Id, "online", null);
            storage.updatePlayerStatus(game.player2Id, "online", null);

            sendTo(otherId, {
              type: "opponent_left",
              game: "rps",
              opponentName: leavingPlayerName,
              message: `${leavingPlayerName} left the game. You win!`,
            });
            sendTo(otherId, { type: "game_update_rps", game: null });

            broadcast({
              type: "players_list",
              players: storage.getAllPlayers(),
            });
            break;
          }

          case "request_active_games_ws": {
            if (!ws.playerId) return;
            const allGames = storage.getAllWSGames();
            const activeGames = allGames.map((g) => ({
              id: g.id,
              player1Name: g.player1Name,
              player2Name: g.player2Name,
              spectatorCount: g.spectators?.length || 0,
            }));
            sendTo(ws.playerId, {
              type: "active_games_ws",
              games: activeGames,
            });
            break;
          }

          case "game_spectate_ws": {
            if (!ws.playerId || !ws.playerName) return;
            const game = storage.getWSGame(data.gameId);
            if (!game) return;

            if (
              game.player1Id === ws.playerId ||
              game.player2Id === ws.playerId
            )
              return;

            const updatedGame = storage.addSpectatorToWSGame(
              data.gameId,
              ws.playerId,
              ws.playerName,
            );
            if (updatedGame) {
              sendTo(ws.playerId, {
                type: "game_update_ws",
                game: updatedGame,
              });
              sendToGameWithSpectators(updatedGame, {
                type: "game_update_ws",
                game: updatedGame,
              });
            }
            break;
          }

          case "game_stop_spectate_ws": {
            if (!ws.playerId) return;
            const game = storage.getWSGame(data.gameId);
            if (!game) return;

            storage.removeSpectatorFromWSGame(data.gameId, ws.playerId);
            sendTo(ws.playerId, { type: "game_update_ws", game: null });
            break;
          }

          case "request_active_games_ng": {
            if (!ws.playerId) return;
            const allGames = storage.getAllNGGames();
            const activeGames = allGames.map((g) => ({
              id: g.id,
              player1Name: g.player1Name,
              player2Name: g.player2Name,
              spectatorCount: g.spectators?.length || 0,
            }));
            sendTo(ws.playerId, {
              type: "active_games_ng",
              games: activeGames,
            });
            break;
          }

          case "game_spectate_ng": {
            if (!ws.playerId || !ws.playerName) return;
            const game = storage.getNGGame(data.gameId);
            if (!game) return;

            if (
              game.player1Id === ws.playerId ||
              game.player2Id === ws.playerId
            )
              return;

            const updatedGame = storage.addSpectatorToNGGame(
              data.gameId,
              ws.playerId,
              ws.playerName,
            );
            if (updatedGame) {
              sendTo(ws.playerId, {
                type: "game_update_ng",
                game: updatedGame,
              });
              sendToGameWithSpectators(updatedGame, {
                type: "game_update_ng",
                game: updatedGame,
              });
            }
            break;
          }

          case "game_stop_spectate_ng": {
            if (!ws.playerId) return;
            const game = storage.getNGGame(data.gameId);
            if (!game) return;

            storage.removeSpectatorFromNGGame(data.gameId, ws.playerId);
            sendTo(ws.playerId, { type: "game_update_ng", game: null });
            break;
          }

          case "request_active_games_qm": {
            if (!ws.playerId) return;
            const allGames = storage.getAllQMGames();
            const activeGames = allGames.map((g) => ({
              id: g.id,
              player1Name: g.player1Name,
              player2Name: g.player2Name,
              spectatorCount: g.spectators?.length || 0,
            }));
            sendTo(ws.playerId, {
              type: "active_games_qm",
              games: activeGames,
            });
            break;
          }

          case "game_spectate_qm": {
            if (!ws.playerId || !ws.playerName) return;
            const game = storage.getQMGame(data.gameId);
            if (!game) return;

            if (
              game.player1Id === ws.playerId ||
              game.player2Id === ws.playerId
            )
              return;

            const updatedGame = storage.addSpectatorToQMGame(
              data.gameId,
              ws.playerId,
              ws.playerName,
            );
            if (updatedGame) {
              sendTo(ws.playerId, {
                type: "game_update_qm",
                game: updatedGame,
              });
              sendToGameWithSpectators(updatedGame, {
                type: "game_update_qm",
                game: updatedGame,
              });
            }
            break;
          }

          case "game_stop_spectate_qm": {
            if (!ws.playerId) return;
            const game = storage.getQMGame(data.gameId);
            if (!game) return;

            storage.removeSpectatorFromQMGame(data.gameId, ws.playerId);
            sendTo(ws.playerId, { type: "game_update_qm", game: null });
            break;
          }

          case "request_active_games_c4": {
            if (!ws.playerId) return;
            const allGames = storage.getAllC4Games();
            const activeGames = allGames.map((g) => ({
              id: g.id,
              player1Name: g.player1Name,
              player2Name: g.player2Name,
              spectatorCount: g.spectators?.length || 0,
            }));
            sendTo(ws.playerId, {
              type: "active_games_c4",
              games: activeGames,
            });
            break;
          }

          case "game_spectate_c4": {
            if (!ws.playerId || !ws.playerName) return;
            const game = storage.getC4Game(data.gameId);
            if (!game) return;

            if (
              game.player1Id === ws.playerId ||
              game.player2Id === ws.playerId
            )
              return;

            const updatedGame = storage.addSpectatorToC4Game(
              data.gameId,
              ws.playerId,
              ws.playerName,
            );
            if (updatedGame) {
              sendTo(ws.playerId, {
                type: "game_update_c4",
                game: updatedGame,
              });
              sendToGameWithSpectators(updatedGame, {
                type: "game_update_c4",
                game: updatedGame,
              });
            }
            break;
          }

          case "game_stop_spectate_c4": {
            if (!ws.playerId) return;
            const game = storage.getC4Game(data.gameId);
            if (!game) return;

            storage.removeSpectatorFromC4Game(data.gameId, ws.playerId);
            sendTo(ws.playerId, { type: "game_update_c4", game: null });
            break;
          }

          case "request_active_games_memory": {
            if (!ws.playerId) return;
            const allGames = storage.getAllMemoryGames();
            const activeGames = allGames.map((g) => ({
              id: g.id,
              playerNames: g.players.map((p) => p.name),
              spectatorCount: g.spectators?.length || 0,
            }));
            sendTo(ws.playerId, {
              type: "active_games_memory",
              games: activeGames,
            });
            break;
          }

          case "game_spectate_memory": {
            if (!ws.playerId || !ws.playerName) return;
            const game = storage.getMemoryGame(data.gameId);
            if (!game) return;

            const isPlayer = game.players.some((p) => p.id === ws.playerId);
            if (isPlayer) return;

            const updatedGame = storage.addSpectatorToMemoryGame(
              data.gameId,
              ws.playerId,
              ws.playerName,
            );
            if (updatedGame) {
              sendTo(ws.playerId, {
                type: "game_update_memory",
                game: updatedGame,
              });
              sendToMemoryGameAll(updatedGame, {
                type: "game_update_memory",
                game: updatedGame,
              });
            }
            break;
          }

          case "game_stop_spectate_memory": {
            if (!ws.playerId) return;
            const game = storage.getMemoryGame(data.gameId);
            if (!game) return;

            storage.removeSpectatorFromMemoryGame(data.gameId, ws.playerId);
            sendTo(ws.playerId, { type: "game_update_memory", game: null });
            break;
          }

          case "emoji_reaction": {
            if (!ws.playerId) return;
            const { gameId, gameType, emoji } = data;

            const emojiMessage = {
              type: "emoji_reaction",
              gameId,
              gameType,
              emoji,
              senderName: ws.playerName,
            };

            // Broadcast to all players and spectators in the game
            if (gameType === "tictactoe") {
              const game = storage.getTTTGame(gameId);
              if (game) {
                sendToGameWithSpectators(game, emojiMessage);
              }
            } else if (gameType === "rps") {
              const game = storage.getRPSGame(gameId);
              if (game) {
                sendToGameWithSpectators(game, emojiMessage);
              }
            } else if (gameType === "connectfour") {
              const game = storage.getC4Game(gameId);
              if (game) {
                sendToGameWithSpectators(game, emojiMessage);
              }
            } else if (gameType === "memory") {
              const game = storage.getMemoryGame(gameId);
              if (game) {
                sendToMemoryGameAll(game, emojiMessage);
              }
            } else if (gameType === "wordscramble") {
              const game = storage.getWSGame(gameId);
              if (game) {
                sendToGameWithSpectators(game, emojiMessage);
              }
            } else if (gameType === "numberguess") {
              const game = storage.getNGGame(gameId);
              if (game) {
                sendToGameWithSpectators(game, emojiMessage);
              }
            } else if (gameType === "quickmath") {
              const game = storage.getQMGame(gameId);
              if (game) {
                sendToGameWithSpectators(game, emojiMessage);
              }
            } else if (gameType === "riddles") {
              const game = storage.getRiddleGame(gameId);
              if (game) {
                game.players.forEach((p) => {
                  sendTo(p.id, emojiMessage);
                });
              }
            } else if (gameType === "typing") {
              const game = storage.getTypingGame(gameId);
              if (game) {
                game.players.forEach((p) => {
                  sendTo(p.id, emojiMessage);
                });
              }
            } else if (gameType === "werewolf") {
              const game = storage.getWerewolfGame(gameId);
              if (game) {
                game.players.forEach((p) => {
                  sendTo(p.id, emojiMessage);
                });
              }
            } else if (gameType === "spyhunt") {
              const game = storage.getSpyHuntGame(gameId);
              if (game) {
                game.players.forEach((p) => {
                  sendTo(p.id, emojiMessage);
                });
              }
            } else if (gameType === "pointonpoint") {
              const game = storage.getPointOnPointGame(gameId);
              if (game) {
                game.players.forEach((p) => {
                  sendTo(p.id, emojiMessage);
                });
              }
            }
            break;
          }

          case "lobby_join_riddle": {
            if (!ws.playerId || !ws.playerName) return;
            const requestedVipOnly = Boolean(data.vipOnly);
            if (requestedVipOnly && !isVipOrAdmin(ws.playerName)) {
              sendTo(ws.playerId, {
                type: "error",
                message: "VIP lobby is only for VIP or admin users.",
              });
              return;
            }

            const lobby = storage.getOrCreateRiddleLobby(
              ws.playerId,
              ws.playerName,
              requestedVipOnly,
            );
            storage.updatePlayerStatus(ws.playerId, "in_game", lobby.id);

            lobby.players.forEach((p) => {
              sendTo(p.id, { type: "lobby_update_riddle", lobby });
            });

            broadcast({
              type: "players_list",
              players: storage.getAllPlayers(),
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_start_riddle": {
            if (!ws.playerId) return;
            const lobby = storage.getRiddleLobby(data.lobbyId);
            if (!lobby || lobby.hostId !== ws.playerId) return;
            if (lobby.players.length < lobby.minPlayers) return;

            storage.updateRiddleLobbyStatus(data.lobbyId, "playing");
            const game = storage.createRiddleGame(lobby);

            game.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_riddle", game });
            });
            break;
          }

          case "lobby_leave_riddle": {
            if (!ws.playerId) return;
            const lobby = storage.getRiddleLobbyByPlayerId(ws.playerId);
            const game = storage.getRiddleGameByPlayerId(ws.playerId);

            if (lobby) {
              storage.removePlayerFromRiddleLobby(lobby.id, ws.playerId);
              storage.updatePlayerStatus(ws.playerId, "online", null);

              const updatedLobby = storage.getRiddleLobby(lobby.id);
              if (updatedLobby) {
                updatedLobby.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_riddle",
                    lobby: updatedLobby,
                  });
                });
              }
            }

            if (game) {
              game.players = game.players.filter((p) => p.id !== ws.playerId);
              storage.updateRiddleGame(game.id, { players: game.players });
              storage.updatePlayerStatus(ws.playerId, "online", null);

              if (game.players.length < 2) {
                game.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_update_riddle",
                    game: { ...game, status: "finished" },
                  });
                });
                storage.deleteRiddleGame(game.id);
              }
            }

            broadcast({
              type: "players_list",
              players: storage.getAllPlayers(),
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "game_answer_riddle": {
            if (!ws.playerId) return;
            const game = storage.getRiddleGame(data.gameId);
            if (!game || game.status !== "question") return;

            const player = game.players.find((p) => p.id === ws.playerId);
            if (!player || player.hasAnswered) return;

            const answer = data.answer.toLowerCase().trim();
            const correctAnswer = game.currentRiddle?.answer
              .toLowerCase()
              .trim();
            const isCorrect = answer === correctAnswer;

            const answerTime = Date.now() - game.roundStartTime;
            player.hasAnswered = true;
            player.totalTime += answerTime;

            if (isCorrect) {
              player.score += 10;
              game.correctAnswers.push(ws.playerId);
            }

            storage.updateRiddleGame(game.id, {
              players: game.players,
              correctAnswers: game.correctAnswers,
            });

            game.players.forEach((p) => {
              const updatedGame = storage.getRiddleGame(game.id);
              if (updatedGame) {
                sendTo(p.id, { type: "game_update_riddle", game: updatedGame });
              }
            });

            // Check if all players have answered OR if someone got it correct
            const allPlayersAnswered = game.players.every((p) => p.hasAnswered);
            const shouldReveal = isCorrect || allPlayersAnswered;

            if (shouldReveal) {
              storage.updateRiddleGame(game.id, { status: "reveal" });

              const revealGame = storage.getRiddleGame(game.id);
              if (revealGame) {
                game.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_update_riddle",
                    game: revealGame,
                  });
                });
              }

              setTimeout(() => {
                const currentGame = storage.getRiddleGame(game.id);
                if (!currentGame || currentGame.status !== "reveal") return;

                const riddles = (currentGame as any)._riddles || [];
                const nextIndex = currentGame.riddleIndex + 1;

                if (nextIndex >= currentGame.totalRiddles) {
                  const finishedGame = storage.updateRiddleGame(game.id, {
                    status: "finished",
                  });
                  if (finishedGame) {
                    currentGame.players.forEach((p) => {
                      sendTo(p.id, {
                        type: "game_update_riddle",
                        game: finishedGame,
                      });
                      storage.updatePlayerStatus(p.id, "online", null);
                    });
                    storage.deleteRiddleGame(game.id);
                  }
                } else {
                  const resetPlayers = currentGame.players.map((p) => ({
                    ...p,
                    hasAnswered: false,
                  }));

                  const nextGame = storage.updateRiddleGame(game.id, {
                    currentRiddle: riddles[nextIndex],
                    riddleIndex: nextIndex,
                    status: "question",
                    correctAnswers: [],
                    players: resetPlayers,
                    roundStartTime: Date.now(),
                  });

                  if (nextGame) {
                    (nextGame as any)._riddles = riddles;
                    currentGame.players.forEach((p) => {
                      sendTo(p.id, {
                        type: "game_update_riddle",
                        game: nextGame,
                      });
                    });
                  }
                }
              }, 2000);
            }
            break;
          }

          case "game_answer_ws": {
            if (!ws.playerId) return;
            const game = storage.getWSGame(data.gameId);
            if (!game || game.status !== "playing") return;

            const isPlayer1 = ws.playerId === game.player1Id;
            const currentAnswer = isPlayer1
              ? game.player1Answer
              : game.player2Answer;
            if (currentAnswer !== null) return;

            const answerTime = Date.now() - game.roundStartTime;

            const updates: any = isPlayer1
              ? { player1Answer: data.answer, player1Time: answerTime }
              : { player2Answer: data.answer, player2Time: answerTime };

            let updatedGame = storage.updateWSGame(data.gameId, updates);
            if (!updatedGame) return;

            const sanitizeWSGame = (g: any, showAnswer: boolean) => {
              const sanitized = { ...g };
              if (!showAnswer) {
                delete sanitized.originalWord;
              }
              return sanitized;
            };

            if (
              updatedGame.player1Answer !== null &&
              updatedGame.player2Answer !== null
            ) {
              const p1Correct =
                updatedGame.player1Answer.toLowerCase() ===
                game.originalWord.toLowerCase();
              const p2Correct =
                updatedGame.player2Answer.toLowerCase() ===
                game.originalWord.toLowerCase();

              let roundWinner: string | null = null;
              let newP1Score = updatedGame.player1Score;
              let newP2Score = updatedGame.player2Score;

              if (p1Correct && p2Correct) {
                roundWinner =
                  (updatedGame.player1Time || 0) <
                  (updatedGame.player2Time || 0)
                    ? updatedGame.player1Id
                    : updatedGame.player2Id;
              } else if (p1Correct) {
                roundWinner = updatedGame.player1Id;
              } else if (p2Correct) {
                roundWinner = updatedGame.player2Id;
              }

              if (roundWinner === updatedGame.player1Id) newP1Score++;
              else if (roundWinner === updatedGame.player2Id) newP2Score++;

              const isFinished = newP1Score >= 3 || newP2Score >= 3;

              updatedGame = storage.updateWSGame(data.gameId, {
                roundWinner,
                player1Score: newP1Score,
                player2Score: newP2Score,
                status: isFinished ? "finished" : "revealing",
                player1Correct: p1Correct,
                player2Correct: p2Correct,
              });

              if (isFinished && updatedGame) {
                const winnerName =
                  newP1Score >= 3
                    ? updatedGame.player1Name
                    : updatedGame.player2Name;
                const loserName =
                  newP1Score >= 3
                    ? updatedGame.player2Name
                    : updatedGame.player1Name;
                const log = storage.addGameLog(
                  "Word Scramble",
                  winnerName,
                  loserName,
                  false,
                );
                broadcast({ type: "game_log", log });
              }

              if (updatedGame) {
                sendToGame([game.player1Id, game.player2Id], {
                  type: "game_update_ws",
                  game: sanitizeWSGame(updatedGame, true),
                });
              }
            } else {
              sendToGame([game.player1Id, game.player2Id], {
                type: "game_update_ws",
                game: sanitizeWSGame(updatedGame, false),
              });
            }
            break;
          }

          case "game_next_round_ws": {
            if (!ws.playerId) return;
            const game = storage.getWSGame(data.gameId);
            if (!game) return;

            const updatedGame = (storage as any).newWSRound(data.gameId);
            if (updatedGame) {
              const sanitizedGame = { ...updatedGame };
              delete sanitizedGame.originalWord;
              sendToGame([game.player1Id, game.player2Id], {
                type: "game_update_ws",
                game: sanitizedGame,
              });
            }
            break;
          }

          case "game_leave_ws": {
            if (!ws.playerId) return;
            const game = storage.getWSGame(data.gameId);
            if (!game) return;

            const otherId =
              game.player1Id === ws.playerId ? game.player2Id : game.player1Id;
            const leavingPlayerName =
              game.player1Id === ws.playerId
                ? game.player1Name
                : game.player2Name;

            storage.deleteWSGame(data.gameId);
            storage.updatePlayerStatus(game.player1Id, "online", null);
            storage.updatePlayerStatus(game.player2Id, "online", null);

            sendTo(otherId, {
              type: "opponent_left",
              game: "wordscramble",
              opponentName: leavingPlayerName,
              message: `${leavingPlayerName} left the game. You win!`,
            });
            sendTo(otherId, { type: "game_update_ws", game: null });

            broadcast({
              type: "players_list",
              players: storage.getAllPlayers(),
            });
            break;
          }

          case "game_guess_ng": {
            if (!ws.playerId) return;
            const game = storage.getNGGame(data.gameId);
            if (!game || game.status !== "playing") return;

            const isPlayer1 = ws.playerId === game.player1Id;
            const guesses = isPlayer1
              ? game.player1Guesses
              : game.player2Guesses;

            const guess = data.guess;
            let hint: "higher" | "lower" | "correct";

            if (guess === game.targetNumber) {
              hint = "correct";
            } else if (guess < game.targetNumber) {
              hint = "higher";
            } else {
              hint = "lower";
            }

            const newGuesses = [...guesses, { guess, hint }];

            const updates: any = isPlayer1
              ? { player1Guesses: newGuesses }
              : { player2Guesses: newGuesses };

            if (hint === "correct") {
              updates.winner = ws.playerId;
              updates.status = "finished";
              if (isPlayer1) {
                updates.player1Score = game.player1Score + 1;
              } else {
                updates.player2Score = game.player2Score + 1;
              }
              const winnerName = isPlayer1
                ? game.player1Name
                : game.player2Name;
              const loserName = isPlayer1 ? game.player2Name : game.player1Name;
              const log = storage.addGameLog(
                "Number Guess",
                winnerName,
                loserName,
                false,
              );
              broadcast({ type: "game_log", log });
            }

            const updatedGame = storage.updateNGGame(data.gameId, updates);
            if (updatedGame) {
              sendToGame([game.player1Id, game.player2Id], {
                type: "game_update_ng",
                game: updatedGame,
              });
            }
            break;
          }

          case "game_next_round_ng": {
            if (!ws.playerId) return;
            const game = storage.getNGGame(data.gameId);
            if (!game) return;

            const updatedGame = (storage as any).newNGRound(data.gameId);
            if (updatedGame) {
              sendToGame([game.player1Id, game.player2Id], {
                type: "game_update_ng",
                game: updatedGame,
              });
            }
            break;
          }

          case "game_leave_ng": {
            if (!ws.playerId) return;
            const game = storage.getNGGame(data.gameId);
            if (!game) return;

            const otherId =
              game.player1Id === ws.playerId ? game.player2Id : game.player1Id;
            const leavingPlayerName =
              game.player1Id === ws.playerId
                ? game.player1Name
                : game.player2Name;

            storage.deleteNGGame(data.gameId);
            storage.updatePlayerStatus(game.player1Id, "online", null);
            storage.updatePlayerStatus(game.player2Id, "online", null);

            sendTo(otherId, {
              type: "opponent_left",
              game: "numberguess",
              opponentName: leavingPlayerName,
              message: `${leavingPlayerName} left the game. You win!`,
            });
            sendTo(otherId, { type: "game_update_ng", game: null });

            broadcast({
              type: "players_list",
              players: storage.getAllPlayers(),
            });
            break;
          }

          case "game_answer_qm": {
            if (!ws.playerId) return;
            const game = storage.getQMGame(data.gameId);
            if (!game || game.status !== "playing") return;

            const isPlayer1 = ws.playerId === game.player1Id;
            const currentAnswer = isPlayer1
              ? game.player1Answer
              : game.player2Answer;
            if (currentAnswer !== null) return;

            const answerTime = Date.now() - game.roundStartTime;

            const updates: any = isPlayer1
              ? { player1Answer: data.answer, player1Time: answerTime }
              : { player2Answer: data.answer, player2Time: answerTime };

            let updatedGame = storage.updateQMGame(data.gameId, updates);
            if (!updatedGame) return;

            const sanitizeQMGame = (g: any, showAnswer: boolean) => {
              const sanitized = { ...g };
              if (!showAnswer) {
                delete sanitized.answer;
              }
              return sanitized;
            };

            if (
              updatedGame.player1Answer !== null &&
              updatedGame.player2Answer !== null
            ) {
              const p1Correct = updatedGame.player1Answer === game.answer;
              const p2Correct = updatedGame.player2Answer === game.answer;

              let roundWinner: string | null = null;
              let newP1Score = updatedGame.player1Score;
              let newP2Score = updatedGame.player2Score;

              if (p1Correct && p2Correct) {
                roundWinner =
                  (updatedGame.player1Time || 0) <
                  (updatedGame.player2Time || 0)
                    ? updatedGame.player1Id
                    : updatedGame.player2Id;
              } else if (p1Correct) {
                roundWinner = updatedGame.player1Id;
              } else if (p2Correct) {
                roundWinner = updatedGame.player2Id;
              }

              if (roundWinner === updatedGame.player1Id) newP1Score++;
              else if (roundWinner === updatedGame.player2Id) newP2Score++;

              const isFinished = newP1Score >= 3 || newP2Score >= 3;

              updatedGame = storage.updateQMGame(data.gameId, {
                roundWinner,
                player1Score: newP1Score,
                player2Score: newP2Score,
                status: isFinished ? "finished" : "revealing",
                player1Correct: p1Correct,
                player2Correct: p2Correct,
              });

              if (isFinished && updatedGame) {
                const winnerName =
                  newP1Score >= 3
                    ? updatedGame.player1Name
                    : updatedGame.player2Name;
                const loserName =
                  newP1Score >= 3
                    ? updatedGame.player2Name
                    : updatedGame.player1Name;
                const log = storage.addGameLog(
                  "Quick Math",
                  winnerName,
                  loserName,
                  false,
                );
                broadcast({ type: "game_log", log });
              }

              if (updatedGame) {
                sendToGame([game.player1Id, game.player2Id], {
                  type: "game_update_qm",
                  game: sanitizeQMGame(updatedGame, true),
                });
              }
            } else {
              sendToGame([game.player1Id, game.player2Id], {
                type: "game_update_qm",
                game: sanitizeQMGame(updatedGame, false),
              });
            }
            break;
          }

          case "game_next_round_qm": {
            if (!ws.playerId) return;
            const game = storage.getQMGame(data.gameId);
            if (!game) return;

            const updatedGame = (storage as any).newQMRound(data.gameId);
            if (updatedGame) {
              const sanitizedGame = { ...updatedGame };
              delete sanitizedGame.answer;
              sendToGame([game.player1Id, game.player2Id], {
                type: "game_update_qm",
                game: sanitizedGame,
              });
            }
            break;
          }

          case "game_leave_qm": {
            if (!ws.playerId) return;
            const game = storage.getQMGame(data.gameId);
            if (!game) return;

            const otherId =
              game.player1Id === ws.playerId ? game.player2Id : game.player1Id;
            const leavingPlayerName =
              game.player1Id === ws.playerId
                ? game.player1Name
                : game.player2Name;

            storage.deleteQMGame(data.gameId);
            storage.updatePlayerStatus(game.player1Id, "online", null);
            storage.updatePlayerStatus(game.player2Id, "online", null);

            sendTo(otherId, {
              type: "opponent_left",
              game: "quickmath",
              opponentName: leavingPlayerName,
              message: `${leavingPlayerName} left the game. You win!`,
            });
            sendTo(otherId, { type: "game_update_qm", game: null });

            broadcast({
              type: "players_list",
              players: storage.getAllPlayers(),
            });
            break;
          }

          case "game_move_c4": {
            if (!ws.playerId) return;
            const game = storage.getC4Game(data.gameId);
            if (
              !game ||
              game.currentTurn !== ws.playerId ||
              game.status !== "playing"
            )
              return;

            const col = data.column;
            if (col < 0 || col >= 7) return;

            let row = -1;
            for (let r = 5; r >= 0; r--) {
              if (game.board[r][col] === null) {
                row = r;
                break;
              }
            }
            if (row === -1) return;

            const symbol = ws.playerId === game.player1Id ? "R" : "Y";
            const newBoard = game.board.map((r) => [...r]);
            newBoard[row][col] = symbol;

            const checkC4Winner = (
              board: (string | null)[][],
              r: number,
              c: number,
              sym: string,
            ): { row: number; col: number }[] | null => {
              const directions = [
                [0, 1],
                [1, 0],
                [1, 1],
                [1, -1],
              ];
              for (const [dr, dc] of directions) {
                const cells: { row: number; col: number }[] = [
                  { row: r, col: c },
                ];
                for (let i = 1; i < 4; i++) {
                  const nr = r + dr * i,
                    nc = c + dc * i;
                  if (
                    nr >= 0 &&
                    nr < 6 &&
                    nc >= 0 &&
                    nc < 7 &&
                    board[nr][nc] === sym
                  ) {
                    cells.push({ row: nr, col: nc });
                  } else break;
                }
                for (let i = 1; i < 4; i++) {
                  const nr = r - dr * i,
                    nc = c - dc * i;
                  if (
                    nr >= 0 &&
                    nr < 6 &&
                    nc >= 0 &&
                    nc < 7 &&
                    board[nr][nc] === sym
                  ) {
                    cells.push({ row: nr, col: nc });
                  } else break;
                }
                if (cells.length >= 4) return cells;
              }
              return null;
            };

            const winCells = checkC4Winner(newBoard, row, col, symbol);
            let updates: Partial<typeof game> = { board: newBoard };

            if (winCells) {
              updates.winner = ws.playerId;
              updates.winningCells = winCells;
              updates.status = "finished";
              if (ws.playerId === game.player1Id) {
                updates.player1Score = game.player1Score + 1;
              } else {
                updates.player2Score = game.player2Score + 1;
              }
              const winnerName =
                ws.playerId === game.player1Id
                  ? game.player1Name
                  : game.player2Name;
              const loserName =
                ws.playerId === game.player1Id
                  ? game.player2Name
                  : game.player1Name;
              const log = storage.addGameLog(
                "Connect Four",
                winnerName,
                loserName,
                false,
              );
              broadcast({ type: "game_log", log });
            } else if (newBoard.every((r) => r.every((c) => c !== null))) {
              updates.isDraw = true;
              updates.status = "finished";
              const log = storage.addGameLog(
                "Connect Four",
                game.player1Name,
                game.player2Name,
                true,
              );
              broadcast({ type: "game_log", log });
            } else {
              updates.currentTurn =
                ws.playerId === game.player1Id
                  ? game.player2Id
                  : game.player1Id;
            }

            const updatedGame = storage.updateC4Game(data.gameId, updates);
            if (updatedGame) {
              sendToGameWithSpectators(updatedGame, {
                type: "game_update_c4",
                game: updatedGame,
              });
            }
            break;
          }

          case "game_rematch_c4": {
            if (!ws.playerId) return;
            const game = storage.getC4Game(data.gameId);
            if (!game || game.status !== "finished") return;

            const updatedGame = storage.updateC4Game(data.gameId, {
              board: Array(6)
                .fill(null)
                .map(() => Array(7).fill(null)),
              currentTurn: game.winner || game.player1Id,
              winner: null,
              winningCells: [],
              isDraw: false,
              status: "playing",
            });

            if (updatedGame) {
              sendToGameWithSpectators(updatedGame, {
                type: "game_update_c4",
                game: updatedGame,
              });
            }
            break;
          }

          case "game_leave_c4": {
            if (!ws.playerId) return;
            const game = storage.getC4Game(data.gameId);
            if (!game) return;

            const otherId =
              game.player1Id === ws.playerId ? game.player2Id : game.player1Id;
            const leavingPlayerName =
              game.player1Id === ws.playerId
                ? game.player1Name
                : game.player2Name;

            if (game.spectators) {
              game.spectators.forEach((s) => {
                sendTo(s.id, { type: "game_update_c4", game: null });
              });
            }

            storage.deleteC4Game(data.gameId);
            storage.updatePlayerStatus(game.player1Id, "online", null);
            storage.updatePlayerStatus(game.player2Id, "online", null);

            sendTo(otherId, {
              type: "opponent_left",
              game: "connectfour",
              opponentName: leavingPlayerName,
              message: `${leavingPlayerName} left the game. You win!`,
            });
            sendTo(otherId, { type: "game_update_c4", game: null });

            broadcast({
              type: "players_list",
              players: storage.getAllPlayers(),
            });
            break;
          }

          case "lobby_join_memory": {
            if (!ws.playerId || !ws.playerName) return;

            const lobby = storage.getOrCreateMemoryLobby(
              ws.playerId,
              ws.playerName,
            );
            storage.updatePlayerStatus(ws.playerId, "in_game", lobby.id);

            lobby.players.forEach((p) => {
              sendTo(p.id, { type: "lobby_update_memory", lobby });
            });

            broadcast({
              type: "players_list",
              players: storage.getAllPlayers(),
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_start_memory": {
            if (!ws.playerId) return;
            const lobby = storage.getMemoryLobby(data.lobbyId);
            if (!lobby || lobby.hostId !== ws.playerId) return;
            if (lobby.players.length < lobby.minPlayers) return;

            const game = storage.createMemoryGame(lobby);

            game.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_memory", game });
            });
            break;
          }

          case "lobby_leave_memory": {
            if (!ws.playerId) return;
            const lobby = storage.getMemoryLobbyByPlayerId(ws.playerId);
            const game = storage.getMemoryGameByPlayerId(ws.playerId);

            if (lobby) {
              storage.removePlayerFromMemoryLobby(lobby.id, ws.playerId);
              storage.updatePlayerStatus(ws.playerId, "online", null);

              const updatedLobby = storage.getMemoryLobby(lobby.id);
              if (updatedLobby) {
                updatedLobby.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_memory",
                    lobby: updatedLobby,
                  });
                });
              }
            }

            if (game) {
              game.players = game.players.filter((p) => p.id !== ws.playerId);
              if (game.players.length < 2) {
                const finishedGame = { ...game, status: "finished" as const };
                sendToMemoryGameAll(finishedGame, {
                  type: "game_update_memory",
                  game: finishedGame,
                });
                game.players.forEach((p) => {
                  storage.updatePlayerStatus(p.id, "online", null);
                });
                storage.deleteMemoryGame(game.id);
              } else {
                storage.updateMemoryGame(game.id, { players: game.players });
              }
            }

            broadcast({
              type: "players_list",
              players: storage.getAllPlayers(),
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "game_flip_memory": {
            if (!ws.playerId) return;
            const game = storage.getMemoryGame(data.gameId);
            if (
              !game ||
              game.status !== "playing" ||
              game.currentTurn !== ws.playerId
            )
              return;

            const cardId = data.cardId;
            const card = game.cards.find((c) => c.id === cardId);
            if (!card || card.isFlipped || card.isMatched) return;

            card.isFlipped = true;
            const flippedCards = [...game.flippedCards, cardId];

            if (flippedCards.length === 2) {
              const card1 = game.cards.find((c) => c.id === flippedCards[0])!;
              const card2 = game.cards.find((c) => c.id === flippedCards[1])!;

              if (card1.symbol === card2.symbol) {
                card1.isMatched = true;
                card2.isMatched = true;
                const player = game.players.find((p) => p.id === ws.playerId)!;
                player.pairs += 1;
                player.score += 10;

                const matchedPairs = game.matchedPairs + 1;

                if (matchedPairs >= game.totalPairs) {
                  storage.updateMemoryGame(game.id, {
                    cards: game.cards,
                    flippedCards: [],
                    matchedPairs,
                    players: game.players,
                    status: "finished",
                  });
                  const finishedGame = storage.getMemoryGame(game.id);
                  if (finishedGame) {
                    const sortedPlayers = [...finishedGame.players].sort(
                      (a, b) => b.pairs - a.pairs,
                    );
                    if (sortedPlayers.length >= 2) {
                      if (sortedPlayers[0].pairs === sortedPlayers[1].pairs) {
                        const log = storage.addGameLog(
                          "Memory Match",
                          sortedPlayers[0].name,
                          sortedPlayers[1].name,
                          true,
                        );
                        broadcast({ type: "game_log", log });
                      } else {
                        const log = storage.addGameLog(
                          "Memory Match",
                          sortedPlayers[0].name,
                          sortedPlayers[sortedPlayers.length - 1].name,
                          false,
                        );
                        broadcast({ type: "game_log", log });
                      }
                    }
                    sendToMemoryGameAll(finishedGame, {
                      type: "game_update_memory",
                      game: finishedGame,
                    });
                    game.players.forEach((p) => {
                      storage.updatePlayerStatus(p.id, "online", null);
                    });
                    storage.deleteMemoryGame(game.id);
                  }
                } else {
                  storage.updateMemoryGame(game.id, {
                    cards: game.cards,
                    flippedCards: [],
                    matchedPairs,
                    players: game.players,
                  });
                  const updatedGame = storage.getMemoryGame(game.id);
                  if (updatedGame) {
                    sendToMemoryGameAll(updatedGame, {
                      type: "game_update_memory",
                      game: updatedGame,
                    });
                  }
                }
              } else {
                storage.updateMemoryGame(game.id, {
                  cards: game.cards,
                  flippedCards,
                  status: "checking",
                });
                let checkingGame = storage.getMemoryGame(game.id);
                if (checkingGame) {
                  sendToMemoryGameAll(checkingGame, {
                    type: "game_update_memory",
                    game: checkingGame,
                  });
                }

                setTimeout(() => {
                  const currGame = storage.getMemoryGame(game.id);
                  if (!currGame || currGame.status !== "checking") return;

                  card1.isFlipped = false;
                  card2.isFlipped = false;

                  const playerIdx = currGame.players.findIndex(
                    (p) => p.id === ws.playerId,
                  );
                  const nextPlayerIdx =
                    (playerIdx + 1) % currGame.players.length;
                  const nextTurn = currGame.players[nextPlayerIdx].id;

                  storage.updateMemoryGame(game.id, {
                    cards: currGame.cards,
                    flippedCards: [],
                    currentTurn: nextTurn,
                    status: "playing",
                  });
                  const nextGame = storage.getMemoryGame(game.id);
                  if (nextGame) {
                    sendToMemoryGameAll(nextGame, {
                      type: "game_update_memory",
                      game: nextGame,
                    });
                  }
                }, 1000);
              }
            } else {
              storage.updateMemoryGame(game.id, {
                cards: game.cards,
                flippedCards,
              });
              const updatedGame = storage.getMemoryGame(game.id);
              if (updatedGame) {
                sendToMemoryGameAll(updatedGame, {
                  type: "game_update_memory",
                  game: updatedGame,
                });
              }
            }
            break;
          }

          case "lobby_join_typing": {
            if (!ws.playerId || !ws.playerName) return;

            const lobby = storage.getOrCreateTypingLobby(
              ws.playerId,
              ws.playerName,
            );
            storage.updatePlayerStatus(ws.playerId, "in_game", lobby.id);

            lobby.players.forEach((p) => {
              sendTo(p.id, { type: "lobby_update_typing", lobby });
            });

            broadcast({
              type: "players_list",
              players: storage.getAllPlayers(),
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_start_typing": {
            if (!ws.playerId) return;
            const lobby = storage.getTypingLobby(data.lobbyId);
            if (!lobby || lobby.hostId !== ws.playerId) return;
            if (lobby.players.length < lobby.minPlayers) return;

            const game = storage.createTypingGame(lobby);

            game.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_typing", game });
            });

            setTimeout(() => {
              const currGame = storage.getTypingGame(game.id);
              if (currGame && currGame.status === "countdown") {
                storage.updateTypingGame(game.id, {
                  status: "racing",
                  startTime: Date.now(),
                });
                const racingGame = storage.getTypingGame(game.id);
                if (racingGame) {
                  currGame.players.forEach((p) => {
                    sendTo(p.id, {
                      type: "game_update_typing",
                      game: racingGame,
                    });
                  });
                }
              }
            }, 3000);
            break;
          }

          case "lobby_leave_typing": {
            if (!ws.playerId) return;
            const lobby = storage.getTypingLobbyByPlayerId(ws.playerId);
            const game = storage.getTypingGameByPlayerId(ws.playerId);

            if (lobby) {
              storage.removePlayerFromTypingLobby(lobby.id, ws.playerId);
              storage.updatePlayerStatus(ws.playerId, "online", null);

              const updatedLobby = storage.getTypingLobby(lobby.id);
              if (updatedLobby) {
                updatedLobby.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_typing",
                    lobby: updatedLobby,
                  });
                });
              }
            }

            if (game) {
              game.players = game.players.filter((p) => p.id !== ws.playerId);
              if (game.players.length < 2) {
                game.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_update_typing",
                    game: { ...game, status: "finished" },
                  });
                  storage.updatePlayerStatus(p.id, "online", null);
                });
                storage.deleteTypingGame(game.id);
              } else {
                storage.updateTypingGame(game.id, { players: game.players });
              }
            }

            broadcast({
              type: "players_list",
              players: storage.getAllPlayers(),
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "game_progress_typing": {
            if (!ws.playerId) return;
            const game = storage.getTypingGame(data.gameId);
            if (!game || game.status !== "racing") return;

            const player = game.players.find((p) => p.id === ws.playerId);
            if (!player || player.finished) return;

            player.progress = data.progress;
            player.wpm = data.wpm;

            storage.updateTypingGame(game.id, { players: game.players });
            const updatedGame = storage.getTypingGame(game.id);
            if (updatedGame) {
              game.players.forEach((p) => {
                sendTo(p.id, { type: "game_update_typing", game: updatedGame });
              });
            }
            break;
          }

          case "game_finish_typing": {
            if (!ws.playerId) return;
            const game = storage.getTypingGame(data.gameId);
            if (!game || game.status !== "racing") return;

            const player = game.players.find((p) => p.id === ws.playerId);
            if (!player || player.finished) return;

            player.finished = true;
            player.finishTime = Date.now() - game.startTime;
            player.progress = 100;

            const allFinished = game.players.every((p) => p.finished);

            if (allFinished || !game.winner) {
              if (!game.winner) {
                storage.updateTypingGame(game.id, {
                  players: game.players,
                  winner: ws.playerId,
                });
              }
            }

            if (allFinished) {
              storage.updateTypingGame(game.id, {
                players: game.players,
                status: "finished",
              });
              const finishedGame = storage.getTypingGame(game.id);
              if (finishedGame) {
                const sortedPlayers = [...finishedGame.players].sort(
                  (a, b) =>
                    (a.finishTime || Infinity) - (b.finishTime || Infinity),
                );
                if (sortedPlayers.length >= 2) {
                  const winner = sortedPlayers[0];
                  const loser = sortedPlayers[sortedPlayers.length - 1];
                  const log = storage.addGameLog(
                    "Typing Race",
                    winner.name,
                    loser.name,
                    false,
                  );
                  broadcast({ type: "game_log", log });
                }
                game.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_update_typing",
                    game: finishedGame,
                  });
                  storage.updatePlayerStatus(p.id, "online", null);
                });
                storage.deleteTypingGame(game.id);
              }
            } else {
              storage.updateTypingGame(game.id, { players: game.players });
              const updatedGame = storage.getTypingGame(game.id);
              if (updatedGame) {
                game.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_update_typing",
                    game: updatedGame,
                  });
                });
              }
            }
            break;
          }

          case "lobby_join_werewolf": {
            if (!ws.playerId) return;
            const player = storage.getPlayer(ws.playerId);
            if (!player) return;
            const requestedVipOnly = Boolean(data.vipOnly);
            if (requestedVipOnly && !isVipOrAdmin(player.username)) {
              sendTo(ws.playerId, {
                type: "error",
                message: "VIP lobby is only for VIP or admin users.",
              });
              return;
            }

            const lobby = storage.getOrCreateWerewolfLobby(
              ws.playerId,
              player.username,
              requestedVipOnly,
            );
            lobby.players.forEach((p) => {
              sendTo(p.id, { type: "lobby_update_werewolf", lobby });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_settings_werewolf": {
            if (!ws.playerId) return;
            const lobby = storage.getWerewolfLobby(data.lobbyId);
            if (!lobby || lobby.hostId !== ws.playerId) return;

            const updated = storage.updateWerewolfLobbySettings(
              data.lobbyId,
              data.enableSeer,
              data.enableDoctor,
            );
            if (updated) {
              updated.players.forEach((p) => {
                sendTo(p.id, { type: "lobby_update_werewolf", lobby: updated });
              });
            }
            break;
          }

          case "lobby_start_werewolf": {
            if (!ws.playerId) return;
            const lobby = storage.getWerewolfLobby(data.lobbyId);
            if (!lobby || lobby.hostId !== ws.playerId) return;
            if (lobby.players.length < lobby.minPlayers) return;

            const game = storage.createWerewolfGame(lobby);

            game.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "in_game", game.id);
              const playerData = game.players.find((gp) => gp.id === p.id);
              const teammates =
                playerData?.role === "werewolf"
                  ? game.players
                      .filter((gp) => gp.role === "werewolf" && gp.id !== p.id)
                      .map((gp) => gp.name)
                  : undefined;
              sendTo(p.id, {
                type: "game_update_werewolf",
                game,
                playerRole: playerData?.role,
                teammates,
              });
            });
            break;
          }

          case "lobby_leave_werewolf": {
            if (!ws.playerId) return;
            const lobby = storage.getWerewolfLobbyByPlayerId(ws.playerId);
            if (lobby) {
              storage.removePlayerFromWerewolfLobby(lobby.id, ws.playerId);
              const updated = storage.getWerewolfLobby(lobby.id);
              if (updated) {
                updated.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_werewolf",
                    lobby: updated,
                  });
                });
              }
              sendTo(ws.playerId, {
                type: "lobby_update_werewolf",
                lobby: null,
              });
            }

            const activeGame = storage.getWerewolfGameByPlayerId(ws.playerId);
            if (activeGame) {
              const updatedGame = storage.removePlayerFromWerewolfGame(
                activeGame.id,
                ws.playerId,
              );
              if (updatedGame) {
                updatedGame.players.forEach((p) => {
                  const playerData = updatedGame.players.find(
                    (gp) => gp.id === p.id,
                  );
                  sendTo(p.id, {
                    type: "game_update_werewolf",
                    game: updatedGame,
                    playerRole: playerData?.role,
                  });
                });
              } else {
                // Game was deleted
                sendTo(ws.playerId, {
                  type: "game_update_werewolf",
                  game: null,
                });
              }
            }
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "game_action_werewolf": {
            if (!ws.playerId) return;
            const game = storage.getWerewolfGame(data.gameId);

            // Handle End Discussion transition
            if (
              game &&
              data.action === "end_discussion" &&
              game.phase === "discussion"
            ) {
              game.phase = "voting";
              game.phaseEndTime = Date.now() + 60000;
              storage.updateWerewolfGame(game.id, game);

              game.players.forEach((p) => {
                const playerData = game.players.find((gp) => gp.id === p.id);
                sendTo(p.id, {
                  type: "game_update_werewolf",
                  game,
                  playerRole: playerData?.role,
                });
              });
              return;
            }

            if (!game || game.phase !== "night" || game.status !== "playing")
              return;

            const player = game.players.find((p) => p.id === ws.playerId);
            if (!player || !player.isAlive) return;

            if (data.action === "kill" && player.role === "werewolf") {
              game.werewolfTarget = data.targetId;
              game.actionsSubmitted.werewolves = true;
            } else if (data.action === "protect" && player.role === "doctor") {
              game.doctorProtect = data.targetId;
              game.actionsSubmitted.doctor = true;
            } else if (data.action === "inspect" && player.role === "seer") {
              game.seerInspect = data.targetId;
              const target = game.players.find((p) => p.id === data.targetId);
              game.seerResult =
                target?.role === "werewolf" ? "werewolf" : "not werewolf";
              game.actionsSubmitted.seer = true;
              sendTo(ws.playerId, {
                type: "game_update_werewolf",
                game,
                playerRole: player.role,
              });
            }

            storage.updateWerewolfGame(game.id, game);

            if (
              game.actionsSubmitted.werewolves &&
              game.actionsSubmitted.doctor &&
              game.actionsSubmitted.seer
            ) {
              let victim = game.werewolfTarget;
              if (victim && victim === game.doctorProtect) {
                victim = null;
              }

              if (victim) {
                const victimPlayer = game.players.find((p) => p.id === victim);
                if (victimPlayer) {
                  victimPlayer.isAlive = false;
                  game.lastNightVictim = victim;
                }
              } else {
                game.lastNightVictim = null;
              }

              game.phase = "morning";
              game.phaseEndTime = Date.now() + 10000;
              game.werewolfTarget = null;
              game.doctorProtect = null;
              game.seerInspect = null;

              storage.updateWerewolfGame(game.id, game);

              game.players.forEach((p) => {
                const playerData = game.players.find((gp) => gp.id === p.id);
                sendTo(p.id, {
                  type: "game_update_werewolf",
                  game,
                  playerRole: playerData?.role,
                });
              });

              setTimeout(() => {
                const currentGame = storage.getWerewolfGame(game.id);
                if (currentGame && currentGame.phase === "morning") {
                  checkWerewolfWinCondition(currentGame);
                  if (currentGame.status === "playing") {
                    currentGame.phase = "discussion";
                    currentGame.phaseEndTime = Date.now() + 60000;
                    storage.updateWerewolfGame(currentGame.id, currentGame);
                    currentGame.players.forEach((p) => {
                      const playerData = currentGame.players.find(
                        (gp) => gp.id === p.id,
                      );
                      sendTo(p.id, {
                        type: "game_update_werewolf",
                        game: currentGame,
                        playerRole: playerData?.role,
                      });
                    });
                  }
                }
              }, 10000);
            }
            break;
          }

          case "game_vote_werewolf": {
            if (!ws.playerId) return;
            const game = storage.getWerewolfGame(data.gameId);
            if (!game || game.phase !== "voting" || game.status !== "playing")
              return;

            const player = game.players.find((p) => p.id === ws.playerId);
            if (!player || !player.isAlive) return;

            // Werewolf votes don't count - but still record them for display
            game.votes[ws.playerId] = data.targetId;
            storage.updateWerewolfGame(game.id, game);

            const alivePlayers = game.players.filter((p) => p.isAlive);
            const voteCount = Object.keys(game.votes).length;

            if (voteCount >= alivePlayers.length) {
              // Count only non-werewolf votes
              const voteCounts: Record<string, number> = {};
              Object.entries(game.votes).forEach(([voterId, targetId]) => {
                const voter = game.players.find((p) => p.id === voterId);
                // Only count votes from non-werewolves
                if (voter && voter.role !== "werewolf") {
                  voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
                }
              });

              let maxVotes = 0;
              let eliminatedId: string | null = null;
              let isTie = false;

              Object.entries(voteCounts).forEach(([id, count]) => {
                if (count > maxVotes) {
                  maxVotes = count;
                  eliminatedId = id;
                  isTie = false;
                } else if (count === maxVotes) {
                  isTie = true;
                }
              });

              if (!isTie && eliminatedId) {
                const suspect = game.players.find((p) => p.id === eliminatedId);
                if (suspect) {
                  game.lastVoteSuspect = eliminatedId;
                  // Only eliminate if the suspect IS a werewolf
                  if (suspect.role === "werewolf") {
                    suspect.isAlive = false;
                    game.eliminatedTonight = eliminatedId;
                    game.lastVoteResult = "werewolf_eliminated";
                  } else {
                    // Non-werewolf is NOT eliminated
                    game.eliminatedTonight = null;
                    game.lastVoteResult = "villager_safe";
                  }
                }
              } else if (isTie) {
                game.lastVoteResult = "tie";
                game.lastVoteSuspect = null;
                game.eliminatedTonight = null;
              }

              game.votes = {};
              game.phase = "night";
              game.day += 1;
              game.phaseEndTime = Date.now() + 45000;

              const hasSeer = game.players.some(
                (p) => p.role === "seer" && p.isAlive,
              );
              const hasDoctor = game.players.some(
                (p) => p.role === "doctor" && p.isAlive,
              );
              game.actionsSubmitted = {
                werewolves: false,
                doctor: !hasDoctor,
                seer: !hasSeer,
              };

              checkWerewolfWinCondition(game);
              storage.updateWerewolfGame(game.id, game);

              game.players.forEach((p) => {
                const playerData = game.players.find((gp) => gp.id === p.id);
                sendTo(p.id, {
                  type: "game_update_werewolf",
                  game,
                  playerRole: playerData?.role,
                });
              });
            } else {
              game.players.forEach((p) => {
                const playerData = game.players.find((gp) => gp.id === p.id);
                sendTo(p.id, {
                  type: "game_update_werewolf",
                  game,
                  playerRole: playerData?.role,
                });
              });
            }
            break;
          }

          // ... (Existing SpyHunt, FPS, PointOnPoint, OutpostRush, EmojiChain, WordAssoc, Hangman, Trivia handlers remain unchanged)
          case "lobby_join_spyhunt": {
            if (!ws.playerId) return;
            const player = storage.getPlayer(ws.playerId);
            if (!player) return;

            const lobby = storage.getOrCreateSpyHuntLobby(
              ws.playerId,
              player.username,
            );
            lobby.players.forEach((p) => {
              sendTo(p.id, { type: "lobby_update_spyhunt", lobby });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_start_spyhunt": {
            if (!ws.playerId) return;
            const lobby = storage.getSpyHuntLobby(data.lobbyId);
            if (!lobby || lobby.hostId !== ws.playerId) return;
            if (lobby.players.length < lobby.minPlayers) return;

            const game = storage.createSpyHuntGame(lobby);

            game.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "in_game", game.id);
              sendTo(p.id, {
                type: "game_update_spyhunt",
                game,
                isSpy: p.id === game.spyId,
                location: p.id === game.spyId ? undefined : game.location,
              });
            });
            break;
          }

          case "lobby_leave_spyhunt": {
            if (!ws.playerId) return;
            const lobby = storage.getSpyHuntLobbyByPlayerId(ws.playerId);
            const game = storage.getSpyHuntGameByPlayerId(ws.playerId);
            if (lobby) {
              storage.removePlayerFromSpyHuntLobby(lobby.id, ws.playerId);
              const updated = storage.getSpyHuntLobby(lobby.id);
              if (updated) {
                updated.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_spyhunt",
                    lobby: updated,
                  });
                });
              }
              sendTo(ws.playerId, {
                type: "lobby_update_spyhunt",
                lobby: null,
              });
            }
            if (game) {
              handleSpyHuntPlayerExit(game.id, ws.playerId, "left");
            }
            storage.updatePlayerStatus(ws.playerId, "online", null);
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "game_ask_spyhunt": {
            if (!ws.playerId) return;
            const game = storage.getSpyHuntGame(data.gameId);
            if (!game || game.status !== "questioning") return;
            if (game.currentTurn !== ws.playerId) return;

            const asker = game.players.find((p) => p.id === ws.playerId);
            const target = game.players.find((p) => p.id === data.targetId);
            if (!asker || !target) return;

            game.questionHistory.push({
              askerId: ws.playerId,
              askerName: asker.name,
              targetId: data.targetId,
              targetName: target.name,
              question: data.question,
              answer: null,
            });

            storage.updateSpyHuntGame(game.id, game);

            game.players.forEach((p) => {
              sendTo(p.id, {
                type: "game_update_spyhunt",
                game,
                isSpy: p.id === game.spyId,
                location: p.id === game.spyId ? undefined : game.location,
              });
            });
            break;
          }

          case "game_answer_spyhunt": {
            if (!ws.playerId) return;
            const game = storage.getSpyHuntGame(data.gameId);
            if (!game || game.status !== "questioning") return;

            const lastQuestion =
              game.questionHistory[game.questionHistory.length - 1];
            if (
              !lastQuestion ||
              lastQuestion.targetId !== ws.playerId ||
              lastQuestion.answer !== null
            )
              return;

            lastQuestion.answer = data.answer;

            const currentIdx = game.players.findIndex(
              (p) => p.id === game.currentTurn,
            );
            const nextIdx = (currentIdx + 1) % game.players.length;
            game.currentTurn = game.players[nextIdx].id;

            storage.updateSpyHuntGame(game.id, game);

            game.players.forEach((p) => {
              sendTo(p.id, {
                type: "game_update_spyhunt",
                game,
                isSpy: p.id === game.spyId,
                location: p.id === game.spyId ? undefined : game.location,
              });
            });
            break;
          }

          case "game_accuse_spyhunt": {
            if (!ws.playerId) return;
            const game = storage.getSpyHuntGame(data.gameId);
            if (!game || game.status !== "questioning") return;

            game.status = "voting";
            game.accuserId = ws.playerId;
            game.accusedId = data.accusedId;
            game.votes = {};
            game.votingActive = true;

            storage.updateSpyHuntGame(game.id, game);

            game.players.forEach((p) => {
              sendTo(p.id, {
                type: "game_update_spyhunt",
                game,
                isSpy: p.id === game.spyId,
                location: p.id === game.spyId ? undefined : game.location,
              });
            });
            break;
          }

          case "game_vote_spyhunt": {
            if (!ws.playerId) return;
            const game = storage.getSpyHuntGame(data.gameId);
            if (!game || game.status !== "voting") return;

            game.votes[ws.playerId] = data.targetId;

            const player = game.players.find((p) => p.id === ws.playerId);
            if (player) {
              player.hasVoted = true;
            }

            storage.updateSpyHuntGame(game.id, game);

            const allVoted = game.players.every((p) => p.hasVoted);

            if (allVoted) {
              const votesForAccused = Object.values(game.votes).filter(
                (v) => v === game.accusedId,
              ).length;
              const majority = Math.ceil(game.players.length / 2);

              if (votesForAccused >= majority) {
                if (game.accusedId === game.spyId) {
                  game.winner = "players";
                  game.winReason = "The spy was caught!";
                } else {
                  game.winner = "spy";
                  game.winReason = "An innocent player was eliminated!";
                }
                game.status = "finished";

                const spyPlayer = game.players.find((p) => p.id === game.spyId);
                const log = storage.addGameLog(
                  "Spy Hunt",
                  game.winner === "players"
                    ? "Players"
                    : spyPlayer?.name || "Spy",
                  game.winner === "players"
                    ? spyPlayer?.name || "Spy"
                    : "Players",
                  false,
                );
                broadcast({ type: "game_log", log });

                game.players.forEach((p) => {
                  storage.updatePlayerStatus(p.id, "online", null);
                });
                storage.deleteSpyHuntGame(game.id);
              } else {
                game.status = "questioning";
                game.votes = {};
                game.votingActive = false;
                game.accuserId = null;
                game.accusedId = null;
                game.players.forEach((p) => (p.hasVoted = false));
              }

              storage.updateSpyHuntGame(game.id, game);
            }

            game.players.forEach((p) => {
              sendTo(p.id, {
                type: "game_update_spyhunt",
                game,
                isSpy: p.id === game.spyId,
                location: p.id === game.spyId ? undefined : game.location,
              });
            });
            break;
          }

          case "game_guess_location_spyhunt": {
            if (!ws.playerId) return;
            const game = storage.getSpyHuntGame(data.gameId);
            if (!game || game.status === "finished") return;
            if (ws.playerId !== game.spyId) return;

            if (data.location.toLowerCase() === game.location.toLowerCase()) {
              game.winner = "spy";
              game.winReason = "The spy guessed the location correctly!";
            } else {
              game.winner = "players";
              game.winReason = "The spy guessed wrong!";
            }
            game.status = "finished";

            const spyPlayer = game.players.find((p) => p.id === game.spyId);
            const log = storage.addGameLog(
              "Spy Hunt",
              game.winner === "spy" ? spyPlayer?.name || "Spy" : "Players",
              game.winner === "spy" ? "Players" : spyPlayer?.name || "Spy",
              false,
            );
            broadcast({ type: "game_log", log });

            storage.updateSpyHuntGame(game.id, game);

            game.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "online", null);
              sendTo(p.id, {
                type: "game_update_spyhunt",
                game,
                isSpy: p.id === game.spyId,
                location: game.location,
              });
            });

            storage.deleteSpyHuntGame(game.id);
            break;
          }

          // FPS Game Handlers
          case "fps_create_lobby": {
            if (!ws.playerId || !ws.playerName) return;

            const existingGame = storage.getFpsGameByPlayerId(ws.playerId);
            if (existingGame) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "You are already in an FPS game.",
                }),
              );
              return;
            }

            const mode = data.mode || "ffa";
            const timeLimit = data.timeLimit || 5;
            const fpsGame = storage.createFpsGame(
              ws.playerId,
              ws.playerName,
              mode,
              timeLimit,
            );

            storage.updatePlayerStatus(
              ws.playerId,
              "in_game",
              `fps:${fpsGame.id}`,
            );
            sendTo(ws.playerId, { type: "fps_lobby_update", game: fpsGame });
            break;
          }

          case "fps_join_lobby": {
            if (!ws.playerId || !ws.playerName) return;

            const existingFpsGame = storage.getFpsGameByPlayerId(ws.playerId);
            if (existingFpsGame) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "You are already in an FPS game.",
                }),
              );
              return;
            }

            const fpsGame = storage.getFpsGameByCode(data.code);
            if (!fpsGame) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Lobby not found or game already started.",
                }),
              );
              return;
            }

            const joinedGame = storage.joinFpsGame(
              fpsGame.id,
              ws.playerId,
              ws.playerName,
              data.team,
            );
            if (!joinedGame) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Could not join lobby.",
                }),
              );
              return;
            }

            storage.updatePlayerStatus(
              ws.playerId,
              "in_game",
              `fps:${joinedGame.id}`,
            );

            joinedGame.players.forEach((p) => {
              sendTo(p.id, { type: "fps_lobby_update", game: joinedGame });
            });
            break;
          }

          case "fps_leave_lobby": {
            if (!ws.playerId) return;

            const fpsGame = storage.getFpsGameByPlayerId(ws.playerId);
            if (!fpsGame) return;

            const updatedGame = storage.leaveFpsGame(fpsGame.id, ws.playerId);
            storage.updatePlayerStatus(ws.playerId, "online", null);

            sendTo(ws.playerId, { type: "fps_lobby_update", game: null });

            if (updatedGame) {
              updatedGame.players.forEach((p) => {
                sendTo(p.id, { type: "fps_lobby_update", game: updatedGame });
              });
            }
            break;
          }

          case "fps_start_game": {
            if (!ws.playerId) return;

            const fpsGame = storage.getFpsGame(data.gameId);
            if (!fpsGame || fpsGame.status !== "lobby") return;
            if (fpsGame.hostId !== ws.playerId) {
              ws.send(
                JSON.stringify({
                  type: "error",
                  message: "Only the host can start the game.",
                }),
              );
              return;
            }

            const startedGame = storage.startFpsGame(fpsGame.id);
            if (!startedGame) {
              if (fpsGame.mode === "team") {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    message: "Need at least 1 player on each team to start.",
                  }),
                );
              } else {
                ws.send(
                  JSON.stringify({
                    type: "error",
                    message: "Need at least 2 players to start.",
                  }),
                );
              }
              return;
            }

            startedGame.players.forEach((p) => {
              sendTo(p.id, { type: "fps_game_update", game: startedGame });
            });
            break;
          }

          case "fps_player_move": {
            if (!ws.playerId) return;

            const fpsGame = storage.getFpsGame(data.gameId);
            if (!fpsGame || fpsGame.status !== "playing") return;

            const updatedGame = storage.updateFpsPlayerPosition(
              fpsGame.id,
              ws.playerId,
              data.position,
              data.rotation,
            );

            if (updatedGame) {
              updatedGame.players.forEach((p) => {
                if (p.id !== ws.playerId) {
                  sendTo(p.id, { type: "fps_game_update", game: updatedGame });
                }
              });
            }
            break;
          }

          case "fps_player_shoot": {
            if (!ws.playerId) return;

            const fpsGame = storage.getFpsGame(data.gameId);
            if (!fpsGame || fpsGame.status !== "playing") return;

            const shootResult = storage.fpsPlayerShoot(
              fpsGame.id,
              ws.playerId,
              data.targetId,
            );
            if (!shootResult) return;

            shootResult.game.players.forEach((p) => {
              sendTo(p.id, { type: "fps_game_update", game: shootResult.game });
            });

            if (shootResult.killed) {
              const target = shootResult.game.players.find(
                (p) => p.id === data.targetId,
              );
              const shooter = shootResult.game.players.find(
                (p) => p.id === ws.playerId,
              );
              if (target && shooter) {
                shootResult.game.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "fps_kill_notification",
                    killerId: ws.playerId,
                    killerName: shooter.name,
                    victimId: data.targetId,
                    victimName: target.name,
                    gun: shooter.gun,
                  });
                });
              }
            }
            break;
          }

          case "fps_player_respawn": {
            if (!ws.playerId) return;

            const fpsGame = storage.getFpsGame(data.gameId);
            if (!fpsGame || fpsGame.status !== "playing") return;

            const validGuns = ["sniper", "ak47", "rpg"];
            const gun = validGuns.includes(data.gun) ? data.gun : "ak47";
            const respawnedGame = storage.respawnFpsPlayer(
              fpsGame.id,
              ws.playerId,
              gun,
            );

            if (respawnedGame) {
              const respawnedPlayer = respawnedGame.players.find(
                (p) => p.id === ws.playerId,
              );
              respawnedGame.players.forEach((p) => {
                sendTo(p.id, { type: "fps_game_update", game: respawnedGame });
                if (respawnedPlayer && p.id !== ws.playerId) {
                  sendTo(p.id, {
                    type: "fps_respawn_notification",
                    playerId: ws.playerId,
                    playerName: respawnedPlayer.name,
                  });
                }
              });
            }
            break;
          }

          case "fps_change_gun": {
            if (!ws.playerId) return;

            const fpsGame = storage.getFpsGame(data.gameId);
            if (!fpsGame) return;

            const validGuns = ["sniper", "ak47", "rpg"];
            if (!validGuns.includes(data.gun)) {
              ws.send(
                JSON.stringify({ type: "error", message: "Invalid gun type." }),
              );
              return;
            }

            const updatedGame = storage.changeFpsPlayerGun(
              fpsGame.id,
              ws.playerId,
              data.gun,
            );
            if (updatedGame) {
              updatedGame.players.forEach((p) => {
                sendTo(p.id, {
                  type:
                    fpsGame.status === "lobby"
                      ? "fps_lobby_update"
                      : "fps_game_update",
                  game: updatedGame,
                });
              });
            }
            break;
          }

          case "fps_end_game": {
            if (!ws.playerId) return;

            const fpsGame = storage.getFpsGame(data.gameId);
            if (!fpsGame || fpsGame.status === "finished") return;
            if (fpsGame.hostId !== ws.playerId) return;

            const endedGame = storage.endFpsGame(fpsGame.id);
            if (endedGame) {
              endedGame.players.forEach((p) => {
                storage.updatePlayerStatus(p.id, "online", null);
                sendTo(p.id, { type: "fps_game_end", game: endedGame });
              });
              storage.deleteFpsGame(endedGame.id);
            }
            break;
          }

          // Point on Point Game
          case "lobby_join_pointonpoint": {
            if (!ws.playerId || !ws.playerName) return;
            const lobby = storage.getOrCreatePointOnPointLobby(
              ws.playerId,
              ws.playerName,
            );
            storage.updatePlayerStatus(ws.playerId, "in-game", "pointonpoint");

            lobby.players.forEach((p) => {
              sendTo(p.id, { type: "lobby_update_pointonpoint", lobby });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_leave_pointonpoint": {
            if (!ws.playerId) return;
            const lobby = storage.getPointOnPointLobbyByPlayerId(ws.playerId);
            const game = storage.getPointOnPointGameByPlayerId(ws.playerId);

            if (lobby) {
              storage.removePlayerFromPointOnPointLobby(lobby.id, ws.playerId);
              storage.updatePlayerStatus(ws.playerId, "online", null);

              const updatedLobby = storage.getPointOnPointLobby(lobby.id);
              if (updatedLobby) {
                updatedLobby.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_pointonpoint",
                    lobby: updatedLobby,
                  });
                });
              }
              sendTo(ws.playerId, { type: "pointonpoint_left" });
              broadcast({
                type: "lobby_counts_update",
                lobbyCounts: getLobbyCountsForBroadcast(),
              });
            }

            if (game) {
              const leavingPlayer = game.players.find(
                (p) => p.id === ws.playerId,
              );
              game.players = game.players.filter((p) => p.id !== ws.playerId);
              game.turnOrder = game.turnOrder.filter(
                (id) => id !== ws.playerId,
              );

              if (game.players.length < 2) {
                game.status = "finished";
                game.players.forEach((p) => {
                  storage.updatePlayerStatus(p.id, "online", null);
                  sendTo(p.id, {
                    type: "game_update_pointonpoint",
                    game: game,
                    reason: "Not enough players",
                  });
                });
                storage.deletePointOnPointGame(game.id);
              } else {
                if (game.hostId === ws.playerId) {
                  game.hostId = game.players[0].id;
                }
                if (game.currentTurn === ws.playerId) {
                  game.currentTurn = game.turnOrder[0] || game.players[0]?.id;
                }
                storage.updatePointOnPointGame(game.id, game);
                game.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_update_pointonpoint",
                    game: game,
                    notification: leavingPlayer
                      ? `${leavingPlayer.name} disconnected`
                      : undefined,
                  });
                });
              }
              broadcast({
                type: "lobby_counts_update",
                lobbyCounts: getLobbyCountsForBroadcast(),
              });
            }
            break;
          }

          case "lobby_start_pointonpoint": {
            if (!ws.playerId) return;
            const lobby = storage.getPointOnPointLobbyByPlayerId(ws.playerId);
            if (!lobby || lobby.hostId !== ws.playerId) return;
            if (lobby.players.length < lobby.minPlayers) {
              sendTo(ws.playerId, {
                type: "error",
                message: `Need at least ${lobby.minPlayers} players to start.`,
              });
              return;
            }

            const game = storage.createPointOnPointGame(lobby);
            game.players.forEach((p) => {
              sendTo(p.id, { type: "game_start_pointonpoint", game });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "game_sentence_pointonpoint": {
            if (!ws.playerId) return;
            const game = storage.getPointOnPointGameByPlayerId(ws.playerId);
            if (!game || game.status !== "playing") return;
            if (game.currentTurn !== ws.playerId) {
              sendTo(ws.playerId, {
                type: "error",
                message: "It's not your turn!",
              });
              return;
            }

            const sentence = data.sentence?.trim();
            if (!sentence || sentence.length < 1) {
              sendTo(ws.playerId, {
                type: "error",
                message: "Please enter a sentence.",
              });
              return;
            }

            const playerInfo = game.players.find((p) => p.id === ws.playerId);
            game.sentences.push({
              playerId: ws.playerId,
              playerName: playerInfo?.name || "Unknown",
              content: sentence,
            });

            const currentIndex = game.turnOrder.indexOf(ws.playerId);
            const nextIndex = (currentIndex + 1) % game.turnOrder.length;
            game.currentTurn = game.turnOrder[nextIndex];

            if (nextIndex === 0) {
              game.currentRound++;
            }

            storage.updatePointOnPointGame(game.id, game);

            game.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_pointonpoint", game });
            });
            break;
          }

          case "game_end_pointonpoint": {
            if (!ws.playerId) return;
            const game = storage.getPointOnPointGameByPlayerId(ws.playerId);
            if (!game) return;
            if (game.hostId !== ws.playerId) {
              sendTo(ws.playerId, {
                type: "error",
                message: "Only the host can end the game.",
              });
              return;
            }

            game.status = "finished";
            storage.updatePointOnPointGame(game.id, game);

            game.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "online", null);
              sendTo(p.id, { type: "game_update_pointonpoint", game });
            });

            storage.deletePointOnPointGame(game.id);
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_join_outpostrush": {
            if (!ws.playerId || !ws.playerName) return;
            const lobby = storage.getOrCreateOutpostRushLobby(
              ws.playerId,
              ws.playerName,
            );
            storage.updatePlayerStatus(ws.playerId, "in-game", "outpostrush");
            lobby.players.forEach((p) => {
              sendTo(p.id, { type: "lobby_update_outpostrush", lobby });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_team_outpostrush": {
            if (!ws.playerId) return;
            const { team } = data as { team: "alpha" | "beta" };
            const lobby = storage.getOutpostRushLobbyByPlayerId(ws.playerId);
            if (!lobby) return;
            const updated = storage.updateOutpostRushPlayerTeam(
              lobby.id,
              ws.playerId,
              team,
            );
            if (updated) {
              updated.players.forEach((p) => {
                sendTo(p.id, {
                  type: "lobby_update_outpostrush",
                  lobby: updated,
                });
              });
            }
            break;
          }

          case "lobby_leave_outpostrush": {
            if (!ws.playerId) return;
            const lobby = storage.getOutpostRushLobbyByPlayerId(ws.playerId);
            const game = storage.getOutpostRushGameByPlayerId(ws.playerId);

            if (lobby) {
              storage.removePlayerFromOutpostRushLobby(lobby.id, ws.playerId);
              storage.updatePlayerStatus(ws.playerId, "online", null);
              const updatedLobby = storage.getOutpostRushLobby(lobby.id);
              if (updatedLobby) {
                updatedLobby.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_outpostrush",
                    lobby: updatedLobby,
                  });
                });
              }
              sendTo(ws.playerId, { type: "outpostrush_left" });
              broadcast({
                type: "lobby_counts_update",
                lobbyCounts: getLobbyCountsForBroadcast(),
              });
            }

            if (game) {
              const player = game.players.find((p) => p.id === ws.playerId);
              if (player) {
                game.players = game.players.filter((p) => p.id !== ws.playerId);
                storage.updateOutpostRushGame(game.id, {
                  players: game.players,
                });
                storage.updatePlayerStatus(ws.playerId, "online", null);
                game.players.forEach((p) => {
                  sendTo(p.id, { type: "game_update_outpostrush", game });
                });
                sendTo(ws.playerId, { type: "outpostrush_left" });

                if (game.players.length < 2) {
                  game.status = "finished";
                  game.winReason = "Not enough players";
                  storage.updateOutpostRushGame(game.id, game);
                  game.players.forEach((p) => {
                    storage.updatePlayerStatus(p.id, "online", null);
                    sendTo(p.id, { type: "game_update_outpostrush", game });
                  });
                  storage.deleteOutpostRushGame(game.id);
                }
              }
            }
            break;
          }

          case "lobby_start_outpostrush": {
            if (!ws.playerId) return;
            const lobby = storage.getOutpostRushLobbyByPlayerId(ws.playerId);
            if (!lobby || lobby.hostId !== ws.playerId) return;
            if (lobby.players.length < lobby.minPlayers) {
              sendTo(ws.playerId, {
                type: "error",
                message: "Not enough players to start.",
              });
              return;
            }

            const game = storage.createOutpostRushGame(lobby);
            game.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_outpostrush", game });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });

            const resourceGenerationInterval = setInterval(() => {
              const currentGame = storage.getOutpostRushGame(game.id);
              if (!currentGame || currentGame.status !== "playing") {
                clearInterval(resourceGenerationInterval);
                return;
              }

              let updated = false;
              for (const outpost of currentGame.outposts) {
                if (outpost.owner !== "neutral") {
                  outpost.storedResources =
                    (outpost.storedResources || 0) +
                    (outpost.resourceRate || 5);
                  if (outpost.storedResources > 1000) {
                    outpost.storedResources = 1000;
                  }
                  updated = true;
                }
              }

              if (updated) {
                storage.updateOutpostRushGame(game.id, currentGame);
                currentGame.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_update_outpostrush",
                    game: currentGame,
                  });
                });
              }
            }, 5000);
            break;
          }

          case "game_move_outpostrush": {
            if (!ws.playerId) return;
            const { x, y } = data as { x: number; y: number };
            const game = storage.getOutpostRushGameByPlayerId(ws.playerId);
            if (!game || game.status !== "playing") return;

            const player = game.players.find((p) => p.id === ws.playerId);
            if (!player || !player.isAlive) return;

            player.x = Math.max(30, Math.min(12000 - 30, x));
            player.y = Math.max(30, Math.min(6000 - 30, y));
            storage.updateOutpostRushGame(game.id, { players: game.players });
            game.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_outpostrush", game });
            });
            break;
          }

          case "game_capture_outpostrush": {
            if (!ws.playerId) return;
            const { outpostId } = data as { outpostId: string };
            const game = storage.getOutpostRushGameByPlayerId(ws.playerId);
            if (!game || game.status !== "playing") return;

            const player = game.players.find((p) => p.id === ws.playerId);
            if (!player || !player.isAlive) return;

            const outpost = game.outposts.find((o) => o.id === outpostId);
            if (!outpost) return;

            const distance = Math.sqrt(
              Math.pow(player.x - outpost.x, 2) +
                Math.pow(player.y - outpost.y, 2),
            );
            if (distance > 150) return;

            if (outpost.owner === "neutral" || outpost.owner !== player.team) {
              outpost.captureProgress += 10;
              if (outpost.captureProgress >= 100) {
                outpost.owner = player.team;
                outpost.captureProgress = 0;
              }
            }

            const alphaOutposts = game.outposts.filter(
              (o) => o.owner === "alpha",
            ).length;
            const betaOutposts = game.outposts.filter(
              (o) => o.owner === "beta",
            ).length;

            if (alphaOutposts >= 2) {
              game.alphaHoldTime += 1;
              if (game.alphaHoldTime >= 300) {
                game.winner = "alpha";
                game.winReason = "Held 2 outposts for 5 minutes";
                game.status = "finished";
              }
            } else {
              game.alphaHoldTime = 0;
            }

            if (betaOutposts >= 2) {
              game.betaHoldTime += 1;
              if (game.betaHoldTime >= 300) {
                game.winner = "beta";
                game.winReason = "Held 2 outposts for 5 minutes";
                game.status = "finished";
              }
            } else {
              game.betaHoldTime = 0;
            }

            storage.updateOutpostRushGame(game.id, game);
            game.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_outpostrush", game });
            });

            if (game.status === "finished") {
              game.players.forEach((p) => {
                storage.updatePlayerStatus(p.id, "online", null);
              });
              storage.deleteOutpostRushGame(game.id);
            }
            break;
          }

          case "game_build_outpostrush": {
            if (!ws.playerId) return;
            const {
              buildType: defenseType,
              x,
              y,
            } = data as {
              buildType: "wall" | "turret" | "trap";
              x: number;
              y: number;
            };
            const game = storage.getOutpostRushGameByPlayerId(ws.playerId);
            if (!game || game.status !== "playing") return;

            const player = game.players.find((p) => p.id === ws.playerId);
            if (!player || !player.isAlive) return;

            const costs: Record<string, number> = {
              wall: 20,
              turret: 50,
              trap: 30,
            };
            const cost = costs[defenseType] || 30;

            if (player.resources < cost) {
              sendTo(ws.playerId, {
                type: "error",
                message: "Not enough resources.",
              });
              return;
            }

            player.resources -= cost;
            game.defenses.push({
              id: `defense-${Date.now()}-${Math.random()}`,
              team: player.team,
              type: defenseType,
              x,
              y,
              health: defenseType === "wall" ? 200 : 100,
            });

            storage.updateOutpostRushGame(game.id, game);
            game.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_outpostrush", game });
            });
            break;
          }

          case "game_upgrade_outpostrush": {
            if (!ws.playerId) return;
            const game = storage.getOutpostRushGameByPlayerId(ws.playerId);
            if (!game || game.status !== "playing") return;

            const player = game.players.find((p) => p.id === ws.playerId);
            if (!player || !player.isAlive) return;

            const upgradeCost = player.weaponLevel * 50;
            if (player.resources < upgradeCost) {
              sendTo(ws.playerId, {
                type: "error",
                message: "Not enough resources.",
              });
              return;
            }

            player.resources -= upgradeCost;
            player.weaponLevel = Math.min(player.weaponLevel + 1, 3);

            storage.updateOutpostRushGame(game.id, game);
            game.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_outpostrush", game });
            });
            break;
          }

          case "game_attack_outpostrush": {
            if (!ws.playerId) return;
            const { targetId } = data as { targetId: string };
            const game = storage.getOutpostRushGameByPlayerId(ws.playerId);
            if (!game || game.status !== "playing") return;

            const attacker = game.players.find((p) => p.id === ws.playerId);
            const target = game.players.find((p) => p.id === targetId);
            if (!attacker || !target || !attacker.isAlive || !target.isAlive)
              return;
            if (attacker.team === target.team) return;

            const distance = Math.sqrt(
              Math.pow(attacker.x - target.x, 2) +
                Math.pow(attacker.y - target.y, 2),
            );
            const weaponRanges = [400, 500, 600];
            const weaponDamage = [15, 20, 30];
            const range = weaponRanges[attacker.weaponLevel - 1] || 400;
            const damage = weaponDamage[attacker.weaponLevel - 1] || 15;

            if (distance > range) return;

            target.health -= damage;
            if (target.health <= 0) {
              target.health = 0;
              target.isAlive = false;
              target.deaths++;
              attacker.kills++;
              attacker.resources += 25;

              // Check if all players on target's team are dead
              const targetTeamPlayers = game.players.filter(
                (p) => p.team === target.team,
              );
              const allDead = targetTeamPlayers.every((p) => !p.isAlive);

              if (allDead) {
                game.winner = attacker.team;
                game.winReason = "Eliminated all enemy players";
                game.status = "finished";
              }
            }

            storage.updateOutpostRushGame(game.id, game);
            game.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_outpostrush", game });
            });
            break;
          }

          case "game_revive_outpostrush": {
            if (!ws.playerId) return;
            const { targetId } = data as { targetId: string };
            const game = storage.getOutpostRushGameByPlayerId(ws.playerId);
            if (!game || game.status !== "playing") return;

            const reviver = game.players.find((p) => p.id === ws.playerId);
            const target = game.players.find((p) => p.id === targetId);
            if (!reviver || !target || !reviver.isAlive || target.isAlive)
              return;
            if (reviver.team !== target.team) return;

            const distance = Math.sqrt(
              Math.pow(reviver.x - target.x, 2) +
                Math.pow(reviver.y - target.y, 2),
            );
            if (distance > 100) {
              sendTo(ws.playerId, {
                type: "error",
                message: "Too far to revive.",
              });
              return;
            }

            target.health = 50;
            target.isAlive = true;

            storage.updateOutpostRushGame(game.id, game);
            game.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_outpostrush", game });
            });
            break;
          }

          case "game_collect_outpostrush": {
            if (!ws.playerId) return;
            const { outpostId } = data as { outpostId: string };
            const game = storage.getOutpostRushGameByPlayerId(ws.playerId);
            if (!game || game.status !== "playing") return;

            const player = game.players.find((p) => p.id === ws.playerId);
            if (!player || !player.isAlive) return;

            const outpost = game.outposts.find((o) => o.id === outpostId);
            if (!outpost) return;

            if (outpost.owner !== player.team) {
              sendTo(ws.playerId, {
                type: "error",
                message: "You can only collect from your team's outposts.",
              });
              return;
            }

            const distance = Math.sqrt(
              Math.pow(player.x - outpost.x, 2) +
                Math.pow(player.y - outpost.y, 2),
            );
            if (distance > 150) {
              sendTo(ws.playerId, {
                type: "error",
                message: "Too far from outpost.",
              });
              return;
            }

            const storedResources = outpost.storedResources || 0;
            if (storedResources <= 0) {
              sendTo(ws.playerId, {
                type: "error",
                message: "No resources to collect.",
              });
              return;
            }

            player.resources += storedResources;
            outpost.storedResources = 0;

            storage.updateOutpostRushGame(game.id, game);
            game.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_outpostrush", game });
            });
            break;
          }

          case "game_chat_outpostrush": {
            if (!ws.playerId || !ws.playerName) return;
            const { message } = data as { message: string };
            const game = storage.getOutpostRushGameByPlayerId(ws.playerId);
            const lobby = storage.getOutpostRushLobbyByPlayerId(ws.playerId);

            if (game) {
              game.players.forEach((p) => {
                sendTo(p.id, {
                  type: "outpostrush_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            } else if (lobby) {
              lobby.players.forEach((p) => {
                sendTo(p.id, {
                  type: "outpostrush_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            }
            break;
          }

          case "game_chat_pointonpoint": {
            if (!ws.playerId || !ws.playerName) return;
            const { message } = data as { message: string };
            const game = storage.getPointOnPointGameByPlayerId(ws.playerId);
            const lobby = storage.getPointOnPointLobbyByPlayerId(ws.playerId);

            if (game) {
              game.players.forEach((p) => {
                sendTo(p.id, {
                  type: "pointonpoint_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            } else if (lobby) {
              lobby.players.forEach((p) => {
                sendTo(p.id, {
                  type: "pointonpoint_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            }
            break;
          }

          // ========== EMOJI CHAIN GAME ==========
          case "lobby_join_emojichain": {
            if (!ws.playerId || !ws.playerName) return;
            const existingLobby = storage.getEmojiChainLobbyByPlayerId(
              ws.playerId,
            );
            if (existingLobby) {
              sendTo(ws.playerId, {
                type: "lobby_update_emojichain",
                lobby: existingLobby,
              });
              return;
            }

            const emojiLobby = storage.getOrCreateEmojiChainLobby(
              ws.playerId,
              ws.playerName,
            );
            storage.updatePlayerStatus(ws.playerId, "in_lobby", "emojichain");

            emojiLobby.players.forEach((p) => {
              sendTo(p.id, {
                type: "lobby_update_emojichain",
                lobby: emojiLobby,
              });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_leave_emojichain": {
            if (!ws.playerId) return;
            const emojiLobby = storage.getEmojiChainLobbyByPlayerId(
              ws.playerId,
            );
            if (!emojiLobby) return;

            storage.removePlayerFromEmojiChainLobby(emojiLobby.id, ws.playerId);
            storage.updatePlayerStatus(ws.playerId, "online", null);

            const updatedEmojiLobby = storage.getEmojiChainLobby(emojiLobby.id);
            if (updatedEmojiLobby && updatedEmojiLobby.players.length > 0) {
              updatedEmojiLobby.players.forEach((p) => {
                sendTo(p.id, {
                  type: "lobby_update_emojichain",
                  lobby: updatedEmojiLobby,
                });
              });
            }
            sendTo(ws.playerId, {
              type: "lobby_update_emojichain",
              lobby: null,
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_start_emojichain": {
            if (!ws.playerId) return;
            const emojiLobby = storage.getEmojiChainLobbyByPlayerId(
              ws.playerId,
            );
            if (!emojiLobby || emojiLobby.hostId !== ws.playerId) return;
            if (emojiLobby.players.length < 2) {
              sendTo(ws.playerId, {
                type: "error",
                message: "Need at least 2 players to start.",
              });
              return;
            }

            const EMOJI_PUZZLES = [
              { emojis: "🎬🦁👑", answer: "lion king", hint: "Disney movie" },
              {
                emojis: "🧙‍♂️💍🌋",
                answer: "lord of the rings",
                hint: "Fantasy epic",
              },
              { emojis: "🦈🌊😱", answer: "jaws", hint: "Classic thriller" },
              {
                emojis: "🕷️🦸‍♂️🕸️",
                answer: "spiderman",
                hint: "Marvel superhero",
              },
              {
                emojis: "⚡🧙‍♂️👓",
                answer: "harry potter",
                hint: "Wizard story",
              },
              {
                emojis: "🚢💔🧊",
                answer: "titanic",
                hint: "Famous ship disaster",
              },
              { emojis: "🦇🃏💣", answer: "batman", hint: "Dark superhero" },
              { emojis: "🧊👸❄️", answer: "frozen", hint: "Let it go" },
              {
                emojis: "🐀👨‍🍳🇫🇷",
                answer: "ratatouille",
                hint: "Cooking movie",
              },
              {
                emojis: "🦖🌴🧬",
                answer: "jurassic park",
                hint: "Dinosaur movie",
              },
              { emojis: "🏠⬆️🎈", answer: "up", hint: "Pixar movie" },
              {
                emojis: "🧜‍♀️🦀🌊",
                answer: "little mermaid",
                hint: "Under the sea",
              },
              {
                emojis: "🎃👻🎄",
                answer: "nightmare before christmas",
                hint: "Tim Burton",
              },
              { emojis: "🏝️🏀🌴", answer: "cast away", hint: "Tom Hanks" },
              { emojis: "🐟🔍👶", answer: "finding nemo", hint: "Pixar ocean" },
              { emojis: "🌙🐺🧔", answer: "twilight", hint: "Vampire romance" },
              {
                emojis: "🎸🎤🌟",
                answer: "a star is born",
                hint: "Music drama",
              },
              {
                emojis: "🏰🌹🧌",
                answer: "beauty and the beast",
                hint: "Tale as old as time",
              },
              { emojis: "🤖🔫🔴", answer: "terminator", hint: "Ill be back" },
              { emojis: "🦸‍♂️🔨⚡", answer: "thor", hint: "Norse god hero" },
              { emojis: "👻📞💀", answer: "scream", hint: "Horror classic" },
              { emojis: "🎪🐘✨", answer: "dumbo", hint: "Flying elephant" },
              { emojis: "🐕🛷❄️", answer: "balto", hint: "Sled dog hero" },
              { emojis: "🤴🗡️🐉", answer: "shrek", hint: "Ogre tale" },
              {
                emojis: "🌊🏄‍♂️🦈",
                answer: "soul surfer",
                hint: "Shark attack survivor",
              },
              {
                emojis: "👸🐸💋",
                answer: "princess and the frog",
                hint: "New Orleans",
              },
              { emojis: "🦁🐗🦡", answer: "lion king", hint: "Hakuna Matata" },
              { emojis: "🧞‍♂️🏜️🪔", answer: "aladdin", hint: "Magic lamp" },
              {
                emojis: "🎹👻🌹",
                answer: "phantom of the opera",
                hint: "Broadway classic",
              },
              { emojis: "🚀👽📞", answer: "et", hint: "Phone home" },
            ];

            const puzzle =
              EMOJI_PUZZLES[Math.floor(Math.random() * EMOJI_PUZZLES.length)];
            const emojiGame = storage.createEmojiChainGame(
              emojiLobby,
              puzzle.emojis,
              puzzle.answer,
              puzzle.hint,
            );
            storage.deleteEmojiChainLobby(emojiLobby.id);

            emojiGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "playing", "emojichain");
              sendTo(p.id, { type: "game_update_emojichain", game: emojiGame });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });

            // Start timeout checker interval (30 second timeout per round)
            const emojiTimeoutInterval = setInterval(() => {
              const currentGame = storage.getEmojiChainGame(emojiGame.id);
              if (!currentGame || currentGame.status !== "playing") {
                clearInterval(emojiTimeoutInterval);
                return;
              }

              const elapsed = Date.now() - currentGame.roundStartTime;
              if (elapsed >= 30000) {
                // Eliminate all players who haven't guessed correctly
                const activePlayers = currentGame.players.filter(
                  (p) => !p.isEliminated,
                );
                activePlayers.forEach((p) => {
                  if (!p.hasGuessed) {
                    p.isEliminated = true;
                    currentGame.players.forEach((player) => {
                      sendTo(player.id, {
                        type: "emojichain_chat_message",
                        sender: "System",
                        message: `${p.name} was eliminated for not guessing in time!`,
                      });
                    });
                  }
                });

                // Check for last standing winner
                const remainingPlayers = currentGame.players.filter(
                  (p) => !p.isEliminated,
                );
                if (remainingPlayers.length <= 1) {
                  currentGame.status = "finished";
                  storage.updateEmojiChainGame(currentGame.id, currentGame);
                  currentGame.players.forEach((p) => {
                    storage.updatePlayerStatus(p.id, "online", null);
                    sendTo(p.id, {
                      type: "game_update_emojichain",
                      game: currentGame,
                    });
                  });
                  storage.deleteEmojiChainGame(currentGame.id);
                  clearInterval(emojiTimeoutInterval);
                  return;
                }

                // Move to next phrase
                currentGame.status = "reveal";
                storage.updateEmojiChainGame(currentGame.id, currentGame);
                currentGame.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_update_emojichain",
                    game: currentGame,
                  });
                });

                setTimeout(() => {
                  const gameAfterReveal = storage.getEmojiChainGame(
                    currentGame.id,
                  );
                  if (!gameAfterReveal) return;

                  const NEXT_PUZZLES = [
                    {
                      emojis: "🎬🦁👑",
                      answer: "lion king",
                      hint: "Disney movie",
                    },
                    {
                      emojis: "🧙‍♂️💍🌋",
                      answer: "lord of the rings",
                      hint: "Fantasy epic",
                    },
                    {
                      emojis: "🦈🌊😱",
                      answer: "jaws",
                      hint: "Classic thriller",
                    },
                    {
                      emojis: "🕷️🦸‍♂️🕸️",
                      answer: "spiderman",
                      hint: "Marvel superhero",
                    },
                    {
                      emojis: "⚡🧙‍♂️👓",
                      answer: "harry potter",
                      hint: "Wizard story",
                    },
                    {
                      emojis: "🚢💔🧊",
                      answer: "titanic",
                      hint: "Famous ship disaster",
                    },
                    {
                      emojis: "🦇🃏💣",
                      answer: "batman",
                      hint: "Dark superhero",
                    },
                    { emojis: "🧊👸❄️", answer: "frozen", hint: "Let it go" },
                    {
                      emojis: "🐀👨‍🍳🇫🇷",
                      answer: "ratatouille",
                      hint: "Cooking movie",
                    },
                    {
                      emojis: "🦖🌴🧬",
                      answer: "jurassic park",
                      hint: "Dinosaur movie",
                    },
                    { emojis: "🏠⬆️🎈", answer: "up", hint: "Pixar movie" },
                    {
                      emojis: "🧜‍♀️🦀🌊",
                      answer: "little mermaid",
                      hint: "Under the sea",
                    },
                    {
                      emojis: "🎃👻🎄",
                      answer: "nightmare before christmas",
                      hint: "Tim Burton",
                    },
                    {
                      emojis: "🏝️🏀🌴",
                      answer: "cast away",
                      hint: "Tom Hanks",
                    },
                    {
                      emojis: "🐟🔍👶",
                      answer: "finding nemo",
                      hint: "Pixar ocean",
                    },
                    {
                      emojis: "🌙🐺🧔",
                      answer: "twilight",
                      hint: "Vampire romance",
                    },
                    {
                      emojis: "🎸🎤🌟",
                      answer: "a star is born",
                      hint: "Music drama",
                    },
                    {
                      emojis: "🏰🌹🧌",
                      answer: "beauty and the beast",
                      hint: "Tale as old as time",
                    },
                    {
                      emojis: "🤖🔫🔴",
                      answer: "terminator",
                      hint: "Ill be back",
                    },
                    {
                      emojis: "🦸‍♂️🔨⚡",
                      answer: "thor",
                      hint: "Norse god hero",
                    },
                    {
                      emojis: "👻📞💀",
                      answer: "scream",
                      hint: "Horror classic",
                    },
                    {
                      emojis: "🎪🐘✨",
                      answer: "dumbo",
                      hint: "Flying elephant",
                    },
                    {
                      emojis: "🐕🛷❄️",
                      answer: "balto",
                      hint: "Sled dog hero",
                    },
                    { emojis: "🤴🗡️🐉", answer: "shrek", hint: "Ogre tale" },
                    {
                      emojis: "🌊🏄‍♂️🦈",
                      answer: "soul surfer",
                      hint: "Shark attack survivor",
                    },
                    {
                      emojis: "👸🐸💋",
                      answer: "princess and the frog",
                      hint: "New Orleans",
                    },
                    { emojis: "🧞‍♂️🏜️🪔", answer: "aladdin", hint: "Magic lamp" },
                    {
                      emojis: "🎹👻🌹",
                      answer: "phantom of the opera",
                      hint: "Broadway classic",
                    },
                    { emojis: "🚀👽📞", answer: "et", hint: "Phone home" },
                  ];
                  const newPuzzle =
                    NEXT_PUZZLES[
                      Math.floor(Math.random() * NEXT_PUZZLES.length)
                    ];
                  gameAfterReveal.roundIndex++;
                  gameAfterReveal.currentEmojis = newPuzzle.emojis;
                  gameAfterReveal.currentAnswer = newPuzzle.answer;
                  gameAfterReveal.currentHint = newPuzzle.hint;
                  gameAfterReveal.correctGuessers = [];
                  gameAfterReveal.roundStartTime = Date.now();
                  gameAfterReveal.status = "playing";
                  gameAfterReveal.players.forEach((p) => {
                    p.hasGuessed = false;
                  });

                  storage.updateEmojiChainGame(
                    gameAfterReveal.id,
                    gameAfterReveal,
                  );
                  gameAfterReveal.players.forEach((p) => {
                    sendTo(p.id, {
                      type: "game_update_emojichain",
                      game: gameAfterReveal,
                    });
                  });
                }, 3000);
              }
            }, 1000);
            break;
          }

          case "game_guess_emojichain": {
            if (!ws.playerId || !ws.playerName) return;
            const { guess } = data as { guess: string };
            const emojiGame = storage.getEmojiChainGameByPlayerId(ws.playerId);
            if (!emojiGame || emojiGame.status !== "playing") return;

            const player = emojiGame.players.find((p) => p.id === ws.playerId);
            if (!player || player.hasGuessed || player.isEliminated) return;

            const normalizedGuess = guess.toLowerCase().trim();
            const normalizedAnswer = emojiGame.currentAnswer
              .toLowerCase()
              .trim();

            if (normalizedGuess === normalizedAnswer) {
              player.hasGuessed = true;
              player.score += Math.max(
                10,
                30 - emojiGame.correctGuessers.length * 5,
              );
              emojiGame.correctGuessers.push(ws.playerId);

              emojiGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "emojichain_chat_message",
                  sender: "System",
                  message: `${ws.playerName} guessed correctly!`,
                });
              });

              const activePlayers = emojiGame.players.filter(
                (p) => !p.isEliminated,
              );
              const allActiveGuessed = activePlayers.every((p) => p.hasGuessed);
              if (allActiveGuessed) {
                emojiGame.status = "reveal";
                storage.updateEmojiChainGame(emojiGame.id, emojiGame);

                emojiGame.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_update_emojichain",
                    game: emojiGame,
                  });
                });

                setTimeout(() => {
                  const currentGame = storage.getEmojiChainGame(emojiGame.id);
                  if (!currentGame) return;

                  if (currentGame.roundIndex + 1 >= currentGame.totalRounds) {
                    currentGame.status = "finished";
                    storage.updateEmojiChainGame(currentGame.id, currentGame);
                    currentGame.players.forEach((p) => {
                      storage.updatePlayerStatus(p.id, "online", null);
                      sendTo(p.id, {
                        type: "game_update_emojichain",
                        game: currentGame,
                      });
                    });
                    storage.deleteEmojiChainGame(currentGame.id);
                  } else {
                    const EMOJI_PUZZLES = [
                      {
                        emojis: "🎬🦁👑",
                        answer: "lion king",
                        hint: "Disney movie",
                      },
                      {
                        emojis: "🧙‍♂️💍🌋",
                        answer: "lord of the rings",
                        hint: "Fantasy epic",
                      },
                      {
                        emojis: "🦈🌊😱",
                        answer: "jaws",
                        hint: "Classic thriller",
                      },
                      {
                        emojis: "🕷️🦸‍♂️🕸️",
                        answer: "spiderman",
                        hint: "Marvel superhero",
                      },
                      {
                        emojis: "⚡🧙‍♂️👓",
                        answer: "harry potter",
                        hint: "Wizard story",
                      },
                      {
                        emojis: "🚢💔🧊",
                        answer: "titanic",
                        hint: "Famous ship disaster",
                      },
                      {
                        emojis: "🦇🃏💣",
                        answer: "batman",
                        hint: "Dark superhero",
                      },
                      { emojis: "🧊👸❄️", answer: "frozen", hint: "Let it go" },
                      {
                        emojis: "🐀👨‍🍳🇫🇷",
                        answer: "ratatouille",
                        hint: "Cooking movie",
                      },
                      {
                        emojis: "🦖🌴🧬",
                        answer: "jurassic park",
                        hint: "Dinosaur movie",
                      },
                      { emojis: "🏠⬆️🎈", answer: "up", hint: "Pixar movie" },
                      {
                        emojis: "🧜‍♀️🦀🌊",
                        answer: "little mermaid",
                        hint: "Under the sea",
                      },
                      {
                        emojis: "🎃👻🎄",
                        answer: "nightmare before christmas",
                        hint: "Tim Burton",
                      },
                      {
                        emojis: "🏝️🏀🌴",
                        answer: "cast away",
                        hint: "Tom Hanks",
                      },
                      {
                        emojis: "🐟🔍👶",
                        answer: "finding nemo",
                        hint: "Pixar ocean",
                      },
                      {
                        emojis: "🌙🐺🧔",
                        answer: "twilight",
                        hint: "Vampire romance",
                      },
                      {
                        emojis: "🎸🎤🌟",
                        answer: "a star is born",
                        hint: "Music drama",
                      },
                      {
                        emojis: "🏰🌹🧌",
                        answer: "beauty and the beast",
                        hint: "Tale as old as time",
                      },
                      {
                        emojis: "🤖🔫🔴",
                        answer: "terminator",
                        hint: "Ill be back",
                      },
                      {
                        emojis: "🦸‍♂️🔨⚡",
                        answer: "thor",
                        hint: "Norse god hero",
                      },
                      {
                        emojis: "👻📞💀",
                        answer: "scream",
                        hint: "Horror classic",
                      },
                      {
                        emojis: "🎪🐘✨",
                        answer: "dumbo",
                        hint: "Flying elephant",
                      },
                      {
                        emojis: "🐕🛷❄️",
                        answer: "balto",
                        hint: "Sled dog hero",
                      },
                      { emojis: "🤴🗡️🐉", answer: "shrek", hint: "Ogre tale" },
                      {
                        emojis: "🌊🏄‍♂️🦈",
                        answer: "soul surfer",
                        hint: "Shark attack survivor",
                      },
                      {
                        emojis: "👸🐸💋",
                        answer: "princess and the frog",
                        hint: "New Orleans",
                      },
                      {
                        emojis: "🧞‍♂️🏜️🪔",
                        answer: "aladdin",
                        hint: "Magic lamp",
                      },
                      {
                        emojis: "🎹👻🌹",
                        answer: "phantom of the opera",
                        hint: "Broadway classic",
                      },
                      { emojis: "🚀👽📞", answer: "et", hint: "Phone home" },
                    ];
                    const newPuzzle =
                      EMOJI_PUZZLES[
                        Math.floor(Math.random() * EMOJI_PUZZLES.length)
                      ];
                    currentGame.roundIndex++;
                    currentGame.currentEmojis = newPuzzle.emojis;
                    currentGame.currentAnswer = newPuzzle.answer;
                    currentGame.currentHint = newPuzzle.hint;
                    currentGame.correctGuessers = [];
                    currentGame.roundStartTime = Date.now();
                    currentGame.status = "playing";
                    currentGame.players.forEach((p) => {
                      p.hasGuessed = false;
                    });

                    storage.updateEmojiChainGame(currentGame.id, currentGame);
                    currentGame.players.forEach((p) => {
                      sendTo(p.id, {
                        type: "game_update_emojichain",
                        game: currentGame,
                      });
                    });
                  }
                }, 3000);
              } else {
                storage.updateEmojiChainGame(emojiGame.id, emojiGame);
                emojiGame.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_update_emojichain",
                    game: emojiGame,
                  });
                });
              }
            } else {
              emojiGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "emojichain_chat_message",
                  sender: ws.playerName!,
                  message: guess,
                });
              });
            }
            break;
          }

          case "game_hint_emojichain": {
            if (!ws.playerId) return;
            const emojiGame = storage.getEmojiChainGameByPlayerId(ws.playerId);
            if (!emojiGame) return;

            emojiGame.players.forEach((p) => {
              sendTo(p.id, {
                type: "emojichain_chat_message",
                sender: "Hint",
                message: emojiGame.currentHint || "No hint available",
              });
            });
            break;
          }

          case "game_chat_emojichain": {
            if (!ws.playerId || !ws.playerName) return;
            const { message } = data as { message: string };
            const emojiGame = storage.getEmojiChainGameByPlayerId(ws.playerId);
            const emojiLobby = storage.getEmojiChainLobbyByPlayerId(
              ws.playerId,
            );

            if (emojiGame) {
              emojiGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "emojichain_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            } else if (emojiLobby) {
              emojiLobby.players.forEach((p) => {
                sendTo(p.id, {
                  type: "emojichain_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            }
            break;
          }

          // ========== WORD ASSOCIATION GAME ==========
          case "lobby_join_wordassociation": {
            if (!ws.playerId || !ws.playerName) return;
            const existingWALobby = storage.getWordAssociationLobbyByPlayerId(
              ws.playerId,
            );
            if (existingWALobby) {
              sendTo(ws.playerId, {
                type: "lobby_update_wordassociation",
                lobby: existingWALobby,
              });
              return;
            }

            const waLobby = storage.getOrCreateWordAssociationLobby(
              ws.playerId,
              ws.playerName,
            );
            storage.updatePlayerStatus(
              ws.playerId,
              "in_lobby",
              "wordassociation",
            );

            waLobby.players.forEach((p) => {
              sendTo(p.id, {
                type: "lobby_update_wordassociation",
                lobby: waLobby,
              });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_leave_wordassociation": {
            if (!ws.playerId) return;
            const waLobby = storage.getWordAssociationLobbyByPlayerId(
              ws.playerId,
            );
            if (!waLobby) return;

            storage.removePlayerFromWordAssociationLobby(
              waLobby.id,
              ws.playerId,
            );
            storage.updatePlayerStatus(ws.playerId, "online", null);

            const updatedWALobby = storage.getWordAssociationLobby(waLobby.id);
            if (updatedWALobby && updatedWALobby.players.length > 0) {
              updatedWALobby.players.forEach((p) => {
                sendTo(p.id, {
                  type: "lobby_update_wordassociation",
                  lobby: updatedWALobby,
                });
              });
            }
            sendTo(ws.playerId, {
              type: "lobby_update_wordassociation",
              lobby: null,
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_start_wordassociation": {
            if (!ws.playerId) return;
            const waLobby = storage.getWordAssociationLobbyByPlayerId(
              ws.playerId,
            );
            if (!waLobby || waLobby.hostId !== ws.playerId) return;
            if (waLobby.players.length < 2) {
              sendTo(ws.playerId, {
                type: "error",
                message: "Need at least 2 players to start.",
              });
              return;
            }

            const STARTER_WORDS = [
              "ocean",
              "fire",
              "music",
              "dream",
              "tree",
              "moon",
              "book",
              "star",
              "cloud",
              "river",
              "mountain",
              "city",
              "garden",
              "night",
              "love",
            ];
            const starterWord =
              STARTER_WORDS[Math.floor(Math.random() * STARTER_WORDS.length)];
            const waGame = storage.createWordAssociationGame(
              waLobby,
              starterWord,
            );
            storage.deleteWordAssociationLobby(waLobby.id);

            waGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "playing", "wordassociation");
              sendTo(p.id, {
                type: "game_update_wordassociation",
                game: waGame,
              });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });

            // Start timeout checker interval (10 second timeout)
            const waTimeoutInterval = setInterval(() => {
              const currentGame = storage.getWordAssociationGame(waGame.id);
              if (!currentGame || currentGame.status !== "playing") {
                clearInterval(waTimeoutInterval);
                return;
              }

              const elapsed = Date.now() - currentGame.turnStartTime;
              if (elapsed >= 10000) {
                const currentPlayer = currentGame.players.find(
                  (p) => p.id === currentGame.currentTurn,
                );
                if (currentPlayer && !currentPlayer.isEliminated) {
                  currentPlayer.isEliminated = true;
                  currentGame.players.forEach((p) => {
                    sendTo(p.id, {
                      type: "wordassociation_chat_message",
                      sender: "System",
                      message: `${currentPlayer.name} was eliminated for running out of time!`,
                    });
                  });

                  const activePlayers = currentGame.players.filter(
                    (p) => !p.isEliminated,
                  );
                  if (activePlayers.length <= 1) {
                    currentGame.status = "finished";
                    if (activePlayers.length === 1) {
                      currentGame.winner = activePlayers[0].id;
                    }
                    storage.updateWordAssociationGame(
                      currentGame.id,
                      currentGame,
                    );
                    currentGame.players.forEach((p) => {
                      storage.updatePlayerStatus(p.id, "online", null);
                      sendTo(p.id, {
                        type: "game_update_wordassociation",
                        game: currentGame,
                      });
                    });
                    storage.deleteWordAssociationGame(currentGame.id);
                    clearInterval(waTimeoutInterval);
                  } else {
                    // Move to next player
                    const currentTurnIndex = currentGame.turnOrder.indexOf(
                      currentGame.currentTurn,
                    );
                    let nextTurnIndex =
                      (currentTurnIndex + 1) % currentGame.turnOrder.length;
                    let nextPlayerId = currentGame.turnOrder[nextTurnIndex];
                    let attempts = 0;

                    while (
                      currentGame.players.find((p) => p.id === nextPlayerId)
                        ?.isEliminated &&
                      attempts < currentGame.turnOrder.length
                    ) {
                      nextTurnIndex =
                        (nextTurnIndex + 1) % currentGame.turnOrder.length;
                      nextPlayerId = currentGame.turnOrder[nextTurnIndex];
                      attempts++;
                    }

                    currentGame.currentTurn = nextPlayerId;
                    currentGame.turnStartTime = Date.now();
                    currentGame.roundNumber++;

                    storage.updateWordAssociationGame(
                      currentGame.id,
                      currentGame,
                    );
                    currentGame.players.forEach((p) => {
                      sendTo(p.id, {
                        type: "game_update_wordassociation",
                        game: currentGame,
                      });
                    });
                  }
                }
              }
            }, 1000);
            break;
          }

          case "game_word_wordassociation": {
            if (!ws.playerId || !ws.playerName) return;
            const { word } = data as { word: string };
            const waGame = storage.getWordAssociationGameByPlayerId(
              ws.playerId,
            );
            if (!waGame || waGame.status !== "playing") return;
            if (waGame.currentTurn !== ws.playerId) {
              sendTo(ws.playerId, { type: "error", message: "Not your turn!" });
              return;
            }

            const player = waGame.players.find((p) => p.id === ws.playerId);
            if (!player || player.isEliminated) return;

            const normalizedWord = word.toLowerCase().trim();

            if (normalizedWord.length < 2) {
              sendTo(ws.playerId, {
                type: "error",
                message: "Word must be at least 2 characters.",
              });
              return;
            }

            if (normalizedWord.includes(" ")) {
              sendTo(ws.playerId, {
                type: "error",
                message: "Only single words allowed!",
              });
              return;
            }

            const alreadyUsed = waGame.wordChain.some(
              (w) => w.word.toLowerCase() === normalizedWord,
            );
            if (alreadyUsed) {
              player.isEliminated = true;
              waGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "wordassociation_chat_message",
                  sender: "System",
                  message: `${ws.playerName} was eliminated for using "${normalizedWord}" which was already used!`,
                });
              });
            } else {
              player.score += 10;
              waGame.wordChain.push({
                word: normalizedWord,
                playerId: ws.playerId,
                playerName: ws.playerName,
              });
              waGame.currentWord = normalizedWord;
            }

            const activePlayers = waGame.players.filter((p) => !p.isEliminated);
            if (activePlayers.length <= 1) {
              waGame.status = "finished";
              if (activePlayers.length === 1) {
                waGame.winner = activePlayers[0].id;
              }
              storage.updateWordAssociationGame(waGame.id, waGame);
              waGame.players.forEach((p) => {
                storage.updatePlayerStatus(p.id, "online", null);
                sendTo(p.id, {
                  type: "game_update_wordassociation",
                  game: waGame,
                });
              });
              storage.deleteWordAssociationGame(waGame.id);
            } else {
              const currentTurnIndex = waGame.turnOrder.indexOf(ws.playerId);
              let nextTurnIndex =
                (currentTurnIndex + 1) % waGame.turnOrder.length;
              let nextPlayerId = waGame.turnOrder[nextTurnIndex];
              let attempts = 0;

              while (
                waGame.players.find((p) => p.id === nextPlayerId)
                  ?.isEliminated &&
                attempts < waGame.turnOrder.length
              ) {
                nextTurnIndex = (nextTurnIndex + 1) % waGame.turnOrder.length;
                nextPlayerId = waGame.turnOrder[nextTurnIndex];
                attempts++;
              }

              waGame.currentTurn = nextPlayerId;
              waGame.turnStartTime = Date.now();
              waGame.roundNumber++;

              storage.updateWordAssociationGame(waGame.id, waGame);
              waGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "game_update_wordassociation",
                  game: waGame,
                });
              });
            }
            break;
          }

          case "game_chat_wordassociation": {
            if (!ws.playerId || !ws.playerName) return;
            const { message } = data as { message: string };
            const waGame = storage.getWordAssociationGameByPlayerId(
              ws.playerId,
            );
            const waLobby = storage.getWordAssociationLobbyByPlayerId(
              ws.playerId,
            );

            if (waGame) {
              waGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "wordassociation_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            } else if (waLobby) {
              waLobby.players.forEach((p) => {
                sendTo(p.id, {
                  type: "wordassociation_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            }
            break;
          }

          // ========== HANGMAN GAME ==========
          case "lobby_join_hangman": {
            if (!ws.playerId || !ws.playerName) return;
            const existingHangmanLobby = storage.getHangmanLobbyByPlayerId(
              ws.playerId,
            );
            if (existingHangmanLobby) {
              sendTo(ws.playerId, {
                type: "lobby_update_hangman",
                lobby: existingHangmanLobby,
              });
              return;
            }

            const hangmanLobby = storage.getOrCreateHangmanLobby(
              ws.playerId,
              ws.playerName,
            );
            storage.updatePlayerStatus(ws.playerId, "in_lobby", "hangman");

            hangmanLobby.players.forEach((p) => {
              sendTo(p.id, {
                type: "lobby_update_hangman",
                lobby: hangmanLobby,
              });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_leave_hangman": {
            if (!ws.playerId) return;
            const hangmanLobby = storage.getHangmanLobbyByPlayerId(ws.playerId);
            const hangmanGame = storage.getHangmanGameByPlayerId(ws.playerId);

            if (hangmanLobby) {
              storage.removePlayerFromHangmanLobby(
                hangmanLobby.id,
                ws.playerId,
              );
              storage.updatePlayerStatus(ws.playerId, "online", null);

              const updatedHangmanLobby = storage.getHangmanLobby(
                hangmanLobby.id,
              );
              if (
                updatedHangmanLobby &&
                updatedHangmanLobby.players.length > 0
              ) {
                updatedHangmanLobby.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_hangman",
                    lobby: updatedHangmanLobby,
                  });
                });
              }
              sendTo(ws.playerId, {
                type: "lobby_update_hangman",
                lobby: null,
              });
            }

            if (hangmanGame) {
              hangmanGame.players = hangmanGame.players.filter(
                (p) => p.id !== ws.playerId,
              );
              hangmanGame.turnOrder = hangmanGame.turnOrder.filter(
                (id) => id !== ws.playerId,
              );
              storage.updatePlayerStatus(ws.playerId, "online", null);

              if (hangmanGame.players.length < 2) {
                hangmanGame.status = "finished";
                hangmanGame.players.forEach((p) => {
                  storage.updatePlayerStatus(p.id, "online", null);
                  sendTo(p.id, {
                    type: "game_update_hangman",
                    game: hangmanGame,
                  });
                });
                storage.deleteHangmanGame(hangmanGame.id);
              } else {
                if (hangmanGame.wordSetter === ws.playerId) {
                  hangmanGame.wordSetter = hangmanGame.turnOrder[0];
                }
                if (hangmanGame.currentGuesser === ws.playerId) {
                  const idx = hangmanGame.turnOrder.indexOf(
                    hangmanGame.currentGuesser,
                  );
                  hangmanGame.currentGuesser =
                    hangmanGame.turnOrder[
                      (idx + 1) % hangmanGame.turnOrder.length
                    ];
                }
                storage.updateHangmanGame(hangmanGame.id, hangmanGame);
                hangmanGame.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_update_hangman",
                    game: hangmanGame,
                  });
                });
              }
              sendTo(ws.playerId, { type: "game_update_hangman", game: null });
            }
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_start_hangman": {
            if (!ws.playerId) return;
            const hangmanLobby = storage.getHangmanLobbyByPlayerId(ws.playerId);
            if (!hangmanLobby || hangmanLobby.hostId !== ws.playerId) return;
            if (hangmanLobby.players.length < 2) {
              sendTo(ws.playerId, {
                type: "error",
                message: "Need at least 2 players to start.",
              });
              return;
            }

            const hangmanGame = storage.createHangmanGame(hangmanLobby);
            storage.deleteHangmanLobby(hangmanLobby.id);

            hangmanGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "playing", "hangman");
              sendTo(p.id, { type: "game_update_hangman", game: hangmanGame });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "game_setword_hangman": {
            if (!ws.playerId || !ws.playerName) return;
            const { word } = data as { word: string };
            const hangmanGame = storage.getHangmanGameByPlayerId(ws.playerId);
            if (!hangmanGame || hangmanGame.status !== "setting_word") return;
            if (hangmanGame.wordSetter !== ws.playerId) {
              sendTo(ws.playerId, {
                type: "error",
                message: "You are not the word setter!",
              });
              return;
            }

            const cleanWord = word.toLowerCase().trim();
            if (
              cleanWord.length < 3 ||
              cleanWord.length > 20 ||
              !/^[a-z]+$/.test(cleanWord)
            ) {
              sendTo(ws.playerId, {
                type: "error",
                message: "Word must be 3-20 letters only (a-z).",
              });
              return;
            }

            hangmanGame.word = cleanWord;
            hangmanGame.revealedWord = "_".repeat(cleanWord.length);
            hangmanGame.guessedLetters = [];
            hangmanGame.wrongGuesses = 0;
            hangmanGame.status = "guessing";

            const nonSetters = hangmanGame.turnOrder.filter(
              (id) => id !== hangmanGame.wordSetter,
            );
            hangmanGame.currentGuesser =
              nonSetters[0] || hangmanGame.turnOrder[0];

            storage.updateHangmanGame(hangmanGame.id, hangmanGame);
            hangmanGame.players.forEach((p) => {
              const gameToSend = { ...hangmanGame };
              if (p.id !== hangmanGame.wordSetter) {
                gameToSend.word = "";
              }
              sendTo(p.id, { type: "game_update_hangman", game: gameToSend });
            });
            break;
          }

          case "game_guess_hangman": {
            if (!ws.playerId || !ws.playerName) return;
            const { letter } = data as { letter: string };
            const hangmanGame = storage.getHangmanGameByPlayerId(ws.playerId);
            if (!hangmanGame || hangmanGame.status !== "guessing") return;
            if (hangmanGame.currentGuesser !== ws.playerId) {
              sendTo(ws.playerId, { type: "error", message: "Not your turn!" });
              return;
            }

            const cleanLetter = letter.toLowerCase().trim();
            if (cleanLetter.length !== 1 || !/^[a-z]$/.test(cleanLetter)) {
              sendTo(ws.playerId, {
                type: "error",
                message: "Invalid letter.",
              });
              return;
            }

            if (hangmanGame.guessedLetters.includes(cleanLetter)) {
              sendTo(ws.playerId, {
                type: "error",
                message: "Letter already guessed!",
              });
              return;
            }

            hangmanGame.guessedLetters.push(cleanLetter);
            const isCorrect = hangmanGame.word.includes(cleanLetter);

            if (isCorrect) {
              let newRevealed = "";
              for (let i = 0; i < hangmanGame.word.length; i++) {
                if (hangmanGame.guessedLetters.includes(hangmanGame.word[i])) {
                  newRevealed += hangmanGame.word[i];
                } else {
                  newRevealed += "_";
                }
              }
              hangmanGame.revealedWord = newRevealed;

              const player = hangmanGame.players.find(
                (p) => p.id === ws.playerId,
              );
              if (player) player.score += 10;
            } else {
              hangmanGame.wrongGuesses++;
            }

            hangmanGame.lastGuess = {
              letter: cleanLetter,
              playerId: ws.playerId,
              playerName: ws.playerName,
              correct: isCorrect,
            };

            const wordComplete = !hangmanGame.revealedWord.includes("_");
            const hanged =
              hangmanGame.wrongGuesses >= hangmanGame.maxWrongGuesses;

            if (wordComplete || hanged) {
              hangmanGame.status = "round_end";

              if (wordComplete) {
                const guesser = hangmanGame.players.find(
                  (p) => p.id === ws.playerId,
                );
                if (guesser) guesser.score += 50;
              } else {
                const setter = hangmanGame.players.find(
                  (p) => p.id === hangmanGame.wordSetter,
                );
                if (setter) setter.score += 30;
              }

              storage.updateHangmanGame(hangmanGame.id, hangmanGame);
              hangmanGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "game_update_hangman",
                  game: hangmanGame,
                });
              });

              setTimeout(() => {
                const currentGame = storage.getHangmanGame(hangmanGame.id);
                if (!currentGame || currentGame.status !== "round_end") return;

                if (currentGame.roundNumber >= currentGame.players.length) {
                  currentGame.status = "finished";
                  const highestScore = Math.max(
                    ...currentGame.players.map((p) => p.score),
                  );
                  const winners = currentGame.players.filter(
                    (p) => p.score === highestScore,
                  );
                  currentGame.winner =
                    winners.length === 1 ? winners[0].id : null;

                  storage.updateHangmanGame(currentGame.id, currentGame);
                  currentGame.players.forEach((p) => {
                    storage.updatePlayerStatus(p.id, "online", null);
                    sendTo(p.id, {
                      type: "game_update_hangman",
                      game: currentGame,
                    });
                  });
                  storage.deleteHangmanGame(currentGame.id);
                } else {
                  const currentSetterIdx = currentGame.turnOrder.indexOf(
                    currentGame.wordSetter,
                  );
                  const nextSetterIdx =
                    (currentSetterIdx + 1) % currentGame.turnOrder.length;
                  currentGame.wordSetter = currentGame.turnOrder[nextSetterIdx];
                  currentGame.word = "";
                  currentGame.revealedWord = "";
                  currentGame.guessedLetters = [];
                  currentGame.wrongGuesses = 0;
                  currentGame.lastGuess = null;
                  currentGame.roundNumber++;
                  currentGame.status = "setting_word";

                  const nonSetters = currentGame.turnOrder.filter(
                    (id) => id !== currentGame.wordSetter,
                  );
                  currentGame.currentGuesser =
                    nonSetters[0] || currentGame.turnOrder[0];

                  storage.updateHangmanGame(currentGame.id, currentGame);
                  currentGame.players.forEach((p) => {
                    sendTo(p.id, {
                      type: "game_update_hangman",
                      game: currentGame,
                    });
                  });
                }
              }, 3000);
            } else {
              const nonSetters = hangmanGame.turnOrder.filter(
                (id) => id !== hangmanGame.wordSetter,
              );
              const currentIdx = nonSetters.indexOf(ws.playerId);
              hangmanGame.currentGuesser =
                nonSetters[(currentIdx + 1) % nonSetters.length];

              storage.updateHangmanGame(hangmanGame.id, hangmanGame);
              hangmanGame.players.forEach((p) => {
                const gameToSend = { ...hangmanGame };
                if (p.id !== hangmanGame.wordSetter) {
                  gameToSend.word = "";
                }
                sendTo(p.id, { type: "game_update_hangman", game: gameToSend });
              });
            }
            break;
          }

          case "game_chat_hangman": {
            if (!ws.playerId || !ws.playerName) return;
            const { message } = data as { message: string };
            const hangmanGame = storage.getHangmanGameByPlayerId(ws.playerId);
            const hangmanLobby = storage.getHangmanLobbyByPlayerId(ws.playerId);

            if (hangmanGame) {
              hangmanGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "hangman_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            } else if (hangmanLobby) {
              hangmanLobby.players.forEach((p) => {
                sendTo(p.id, {
                  type: "hangman_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            }
            break;
          }

          // ========== TRIVIA QUIZ GAME ==========
          case "lobby_join_triviaquiz": {
            if (!ws.playerId || !ws.playerName) return;
            const existingTriviaLobby = storage.getTriviaQuizLobbyByPlayerId(
              ws.playerId,
            );
            if (existingTriviaLobby) {
              sendTo(ws.playerId, {
                type: "lobby_update_triviaquiz",
                lobby: existingTriviaLobby,
              });
              return;
            }

            const triviaLobby = storage.getOrCreateTriviaQuizLobby(
              ws.playerId,
              ws.playerName,
            );
            storage.updatePlayerStatus(ws.playerId, "in_lobby", "triviaquiz");

            triviaLobby.players.forEach((p) => {
              sendTo(p.id, {
                type: "lobby_update_triviaquiz",
                lobby: triviaLobby,
              });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_leave_triviaquiz": {
            if (!ws.playerId) return;
            const triviaLobby = storage.getTriviaQuizLobbyByPlayerId(
              ws.playerId,
            );
            const triviaGame = storage.getTriviaQuizGameByPlayerId(ws.playerId);

            if (triviaLobby) {
              storage.removePlayerFromTriviaQuizLobby(
                triviaLobby.id,
                ws.playerId,
              );
              storage.updatePlayerStatus(ws.playerId, "online", null);

              const updatedTriviaLobby = storage.getTriviaQuizLobby(
                triviaLobby.id,
              );
              if (updatedTriviaLobby && updatedTriviaLobby.players.length > 0) {
                updatedTriviaLobby.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_triviaquiz",
                    lobby: updatedTriviaLobby,
                  });
                });
              }
              sendTo(ws.playerId, {
                type: "lobby_update_triviaquiz",
                lobby: null,
              });
            }

            if (triviaGame) {
              triviaGame.players = triviaGame.players.filter(
                (p) => p.id !== ws.playerId,
              );
              storage.updatePlayerStatus(ws.playerId, "online", null);

              if (triviaGame.players.length < 1) {
                triviaGame.status = "finished";
                storage.deleteTriviaQuizGame(triviaGame.id);
              } else {
                storage.updateTriviaQuizGame(triviaGame.id, triviaGame);
                triviaGame.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_update_triviaquiz",
                    game: triviaGame,
                  });
                });
              }
              sendTo(ws.playerId, {
                type: "game_update_triviaquiz",
                game: null,
              });
            }
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_start_triviaquiz": {
            if (!ws.playerId) return;
            const triviaLobby = storage.getTriviaQuizLobbyByPlayerId(
              ws.playerId,
            );
            if (!triviaLobby || triviaLobby.hostId !== ws.playerId) return;
            if (triviaLobby.players.length < 2) {
              sendTo(ws.playerId, {
                type: "error",
                message: "Need at least 2 players to start.",
              });
              return;
            }

            const TRIVIA_QUESTIONS = [
              {
                question: "What planet is known as the Red Planet?",
                options: ["Venus", "Mars", "Jupiter", "Saturn"],
                correctIndex: 1,
                category: "Science",
              },
              {
                question: "Who painted the Mona Lisa?",
                options: ["Van Gogh", "Picasso", "Da Vinci", "Michelangelo"],
                correctIndex: 2,
                category: "Art",
              },
              {
                question: "What is the capital of Japan?",
                options: ["Seoul", "Beijing", "Tokyo", "Bangkok"],
                correctIndex: 2,
                category: "Geography",
              },
              {
                question: "In what year did World War II end?",
                options: ["1943", "1944", "1945", "1946"],
                correctIndex: 2,
                category: "History",
              },
              {
                question: "What is the largest mammal in the world?",
                options: ["Elephant", "Blue Whale", "Giraffe", "Hippopotamus"],
                correctIndex: 1,
                category: "Nature",
              },
              {
                question: "Who wrote 'Romeo and Juliet'?",
                options: [
                  "Charles Dickens",
                  "William Shakespeare",
                  "Jane Austen",
                  "Mark Twain",
                ],
                correctIndex: 1,
                category: "Literature",
              },
              {
                question: "What is the chemical symbol for gold?",
                options: ["Go", "Gd", "Au", "Ag"],
                correctIndex: 2,
                category: "Science",
              },
              {
                question: "Which country is home to the kangaroo?",
                options: ["New Zealand", "South Africa", "Australia", "Brazil"],
                correctIndex: 2,
                category: "Geography",
              },
              {
                question: "What is the largest ocean on Earth?",
                options: ["Atlantic", "Indian", "Arctic", "Pacific"],
                correctIndex: 3,
                category: "Geography",
              },
              {
                question: "Who discovered gravity?",
                options: ["Einstein", "Newton", "Galileo", "Darwin"],
                correctIndex: 1,
                category: "Science",
              },
              {
                question: "What is the hardest natural substance?",
                options: ["Gold", "Iron", "Diamond", "Platinum"],
                correctIndex: 2,
                category: "Science",
              },
              {
                question: "Which planet has the most moons?",
                options: ["Jupiter", "Saturn", "Uranus", "Neptune"],
                correctIndex: 1,
                category: "Science",
              },
              {
                question: "What is the smallest country in the world?",
                options: [
                  "Monaco",
                  "Vatican City",
                  "San Marino",
                  "Liechtenstein",
                ],
                correctIndex: 1,
                category: "Geography",
              },
              {
                question: "Who invented the telephone?",
                options: ["Edison", "Tesla", "Bell", "Marconi"],
                correctIndex: 2,
                category: "History",
              },
              {
                question: "What is the main ingredient in guacamole?",
                options: ["Tomato", "Avocado", "Pepper", "Onion"],
                correctIndex: 1,
                category: "Food",
              },
            ];

            const shuffled = [...TRIVIA_QUESTIONS].sort(
              () => Math.random() - 0.5,
            );
            const firstQuestion = shuffled[0];

            const triviaGame = storage.createTriviaQuizGame(
              triviaLobby,
              firstQuestion,
            );
            (triviaGame as any).questionPool = shuffled.slice(1);
            storage.deleteTriviaQuizLobby(triviaLobby.id);

            triviaGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "playing", "triviaquiz");
              sendTo(p.id, {
                type: "game_update_triviaquiz",
                game: triviaGame,
              });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });

            const triviaTimeoutInterval = setInterval(() => {
              const currentGame = storage.getTriviaQuizGame(triviaGame.id);
              if (!currentGame || currentGame.status === "finished") {
                clearInterval(triviaTimeoutInterval);
                return;
              }

              if (currentGame.status === "question") {
                const elapsed = Date.now() - currentGame.questionStartTime;
                if (elapsed >= 15000) {
                  currentGame.status = "reveal";
                  storage.updateTriviaQuizGame(currentGame.id, currentGame);
                  currentGame.players.forEach((p) => {
                    sendTo(p.id, {
                      type: "game_update_triviaquiz",
                      game: currentGame,
                    });
                  });

                  setTimeout(() => {
                    const gameAfterReveal = storage.getTriviaQuizGame(
                      currentGame.id,
                    );
                    if (!gameAfterReveal || gameAfterReveal.status !== "reveal")
                      return;

                    if (
                      gameAfterReveal.questionIndex + 1 >=
                      gameAfterReveal.totalQuestions
                    ) {
                      gameAfterReveal.status = "finished";
                      const highestScore = Math.max(
                        ...gameAfterReveal.players.map((p) => p.score),
                      );

                      storage.updateTriviaQuizGame(
                        gameAfterReveal.id,
                        gameAfterReveal,
                      );
                      gameAfterReveal.players.forEach((p) => {
                        storage.updatePlayerStatus(p.id, "online", null);
                        sendTo(p.id, {
                          type: "game_update_triviaquiz",
                          game: gameAfterReveal,
                        });
                      });
                      storage.deleteTriviaQuizGame(gameAfterReveal.id);
                      clearInterval(triviaTimeoutInterval);
                    } else {
                      const pool = (gameAfterReveal as any).questionPool || [];
                      if (pool.length > 0) {
                        const nextQ = pool.shift();
                        gameAfterReveal.currentQuestion = {
                          question: nextQ.question,
                          options: nextQ.options,
                          correctIndex: nextQ.correctIndex,
                          category: nextQ.category,
                        };
                      }
                      gameAfterReveal.questionIndex++;
                      gameAfterReveal.questionStartTime = Date.now();
                      gameAfterReveal.status = "question";
                      gameAfterReveal.correctAnswers = [];
                      gameAfterReveal.players.forEach((p) => {
                        p.hasAnswered = false;
                        p.lastAnswerCorrect = null;
                      });

                      storage.updateTriviaQuizGame(
                        gameAfterReveal.id,
                        gameAfterReveal,
                      );
                      gameAfterReveal.players.forEach((p) => {
                        sendTo(p.id, {
                          type: "game_update_triviaquiz",
                          game: gameAfterReveal,
                        });
                      });
                    }
                  }, 3000);
                }
              }
            }, 1000);
            break;
          }

          case "game_answer_triviaquiz": {
            if (!ws.playerId || !ws.playerName) return;
            const { answerIndex } = data as { answerIndex: number };
            const triviaGame = storage.getTriviaQuizGameByPlayerId(ws.playerId);
            if (!triviaGame || triviaGame.status !== "question") return;

            const player = triviaGame.players.find((p) => p.id === ws.playerId);
            if (!player || player.hasAnswered) return;

            player.hasAnswered = true;
            const isCorrect =
              triviaGame.currentQuestion &&
              answerIndex === triviaGame.currentQuestion.correctIndex;
            player.lastAnswerCorrect = isCorrect;

            if (isCorrect) {
              const elapsed = Date.now() - triviaGame.questionStartTime;
              const timeBonus = Math.max(
                0,
                Math.floor((15000 - elapsed) / 100),
              );
              player.score += 100 + timeBonus;
              triviaGame.correctAnswers.push({
                playerId: ws.playerId,
                playerName: ws.playerName,
                timeMs: elapsed,
              });
            }

            const allAnswered = triviaGame.players.every((p) => p.hasAnswered);
            if (allAnswered) {
              triviaGame.status = "reveal";
            }

            storage.updateTriviaQuizGame(triviaGame.id, triviaGame);
            triviaGame.players.forEach((p) => {
              sendTo(p.id, {
                type: "game_update_triviaquiz",
                game: triviaGame,
              });
            });

            if (allAnswered) {
              setTimeout(() => {
                const gameAfterReveal = storage.getTriviaQuizGame(
                  triviaGame.id,
                );
                if (!gameAfterReveal || gameAfterReveal.status !== "reveal")
                  return;

                if (
                  gameAfterReveal.questionIndex + 1 >=
                  gameAfterReveal.totalQuestions
                ) {
                  gameAfterReveal.status = "finished";

                  storage.updateTriviaQuizGame(
                    gameAfterReveal.id,
                    gameAfterReveal,
                  );
                  gameAfterReveal.players.forEach((p) => {
                    storage.updatePlayerStatus(p.id, "online", null);
                    sendTo(p.id, {
                      type: "game_update_triviaquiz",
                      game: gameAfterReveal,
                    });
                  });
                  storage.deleteTriviaQuizGame(gameAfterReveal.id);
                } else {
                  const pool = (gameAfterReveal as any).questionPool || [];
                  if (pool.length > 0) {
                    const nextQ = pool.shift();
                    gameAfterReveal.currentQuestion = {
                      question: nextQ.question,
                      options: nextQ.options,
                      correctIndex: nextQ.correctIndex,
                      category: nextQ.category,
                    };
                  }
                  gameAfterReveal.questionIndex++;
                  gameAfterReveal.questionStartTime = Date.now();
                  gameAfterReveal.status = "question";
                  gameAfterReveal.correctAnswers = [];
                  gameAfterReveal.players.forEach((p) => {
                    p.hasAnswered = false;
                    p.lastAnswerCorrect = null;
                  });

                  storage.updateTriviaQuizGame(
                    gameAfterReveal.id,
                    gameAfterReveal,
                  );
                  gameAfterReveal.players.forEach((p) => {
                    sendTo(p.id, {
                      type: "game_update_triviaquiz",
                      game: gameAfterReveal,
                    });
                  });
                }
              }, 3000);
            }
            break;
          }

          case "game_chat_triviaquiz": {
            if (!ws.playerId || !ws.playerName) return;
            const { message } = data as { message: string };
            const triviaGame = storage.getTriviaQuizGameByPlayerId(ws.playerId);
            const triviaLobby = storage.getTriviaQuizLobbyByPlayerId(
              ws.playerId,
            );

            if (triviaGame) {
              triviaGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "triviaquiz_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            } else if (triviaLobby) {
              triviaLobby.players.forEach((p) => {
                sendTo(p.id, {
                  type: "triviaquiz_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            }
            break;
          }

          // ========== SQUID GAME ==========
          case "lobby_join_squidgame": {
            if (!ws.playerId || !ws.playerName) return;
            const requestedVipOnly = Boolean(data.vipOnly);
            if (requestedVipOnly && !isVipOrAdmin(ws.playerName)) {
              sendTo(ws.playerId, {
                type: "error",
                message: "VIP lobby is only for VIP or admin users.",
              });
              return;
            }
            const existingSquidLobby = storage.getSquidGameLobbyByPlayerId(
              ws.playerId,
            );
            if (existingSquidLobby) {
              if (Boolean((existingSquidLobby as any).vipOnly) !== requestedVipOnly) {
                sendTo(ws.playerId, {
                  type: "error",
                  message: "Leave your current Squid Game lobby before switching VIP/normal lobby.",
                });
                return;
              }
              sendTo(ws.playerId, {
                type: "lobby_update_squidgame",
                lobby: existingSquidLobby,
              });
              return;
            }

            const squidLobby = storage.getOrCreateSquidGameLobby(
              ws.playerId,
              ws.playerName,
              requestedVipOnly,
            );
            storage.updatePlayerStatus(ws.playerId, "in_lobby", "squidgame");

            squidLobby.players.forEach((p) => {
              sendTo(p.id, {
                type: "lobby_update_squidgame",
                lobby: squidLobby,
              });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_leave_squidgame": {
            if (!ws.playerId) return;
            const squidLobby = storage.getSquidGameLobbyByPlayerId(ws.playerId);
            const squidGame = storage.getSquidGameByPlayerId(ws.playerId);

            if (squidLobby) {
              storage.removePlayerFromSquidGameLobby(
                squidLobby.id,
                ws.playerId,
              );
              storage.updatePlayerStatus(ws.playerId, "online", null);

              const updatedSquidLobby = storage.getSquidGameLobby(
                squidLobby.id,
              );
              if (updatedSquidLobby && updatedSquidLobby.players.length > 0) {
                updatedSquidLobby.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_squidgame",
                    lobby: updatedSquidLobby,
                  });
                });
              }
              sendTo(ws.playerId, { type: "squidgame_left" });
            }

            if (squidGame) {
              squidGame.players = squidGame.players.filter(
                (p) => p.id !== ws.playerId,
              );
              storage.updatePlayerStatus(ws.playerId, "online", null);
              storage.updateSquidGame(squidGame.id, squidGame);
              squidGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "game_update_squidgame",
                  game: squidGame,
                });
              });
              sendTo(ws.playerId, { type: "squidgame_left" });
            }
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_start_squidgame": {
            if (!ws.playerId) return;
            const squidLobby = storage.getSquidGameLobbyByPlayerId(ws.playerId);
            if (!squidLobby || squidLobby.hostId !== ws.playerId) return;
            if (squidLobby.players.length < squidLobby.minPlayers) {
              sendTo(ws.playerId, {
                type: "error",
                message: `Need at least ${squidLobby.minPlayers} players to start.`,
              });
              return;
            }

            const squidGame = storage.createSquidGame(squidLobby);
            storage.deleteSquidGameLobby(squidLobby.id);

            squidGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "in_game", "squidgame");
              sendTo(p.id, { type: "game_update_squidgame", game: squidGame });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "game_action_squidgame": {
            if (!ws.playerId) return;
            const { action, data: actionData } = data as {
              action: string;
              data: any;
            };
            const squidGame = storage.getSquidGameByPlayerId(ws.playerId);
            if (!squidGame) return;

            const player = squidGame.players.find((p) => p.id === ws.playerId);
            if (!player || !player.isAlive) return;

            if (action === "move") {
              player.position = Math.min(
                100,
                (player.position || 0) + (actionData.distance || 0),
              );
              if (player.position >= 100) {
                squidGame.survivors.push(ws.playerId);
              }
            } else if (action === "eliminated") {
              player.isAlive = false;
              squidGame.eliminated.push(ws.playerId);
            }

            storage.updateSquidGame(squidGame.id, squidGame);
            squidGame.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_squidgame", game: squidGame });
            });
            break;
          }

          case "game_chat_squidgame": {
            if (!ws.playerId || !ws.playerName) return;
            const { message } = data as { message: string };
            const squidGame = storage.getSquidGameByPlayerId(ws.playerId);
            const squidLobby = storage.getSquidGameLobbyByPlayerId(ws.playerId);

            if (squidGame) {
              squidGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "squidgame_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            } else if (squidLobby) {
              squidLobby.players.forEach((p) => {
                sendTo(p.id, {
                  type: "squidgame_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            }
            break;
          }

          // ========== ESCAPE SHIP ==========
          case "lobby_join_escapeship": {
            if (!ws.playerId || !ws.playerName) return;
            const requestedVipOnly = Boolean(data.vipOnly);
            if (requestedVipOnly && !isVipOrAdmin(ws.playerName)) {
              sendTo(ws.playerId, {
                type: "error",
                message: "VIP lobby is only for VIP or admin users.",
              });
              return;
            }
            const existingEscapeLobby = storage.getEscapeShipLobbyByPlayerId(
              ws.playerId,
            );
            if (existingEscapeLobby) {
              if (Boolean((existingEscapeLobby as any).vipOnly) !== requestedVipOnly) {
                sendTo(ws.playerId, {
                  type: "error",
                  message: "Leave your current Escape Ship lobby before switching VIP/normal lobby.",
                });
                return;
              }
              sendTo(ws.playerId, {
                type: "lobby_update_escapeship",
                lobby: existingEscapeLobby,
              });
              return;
            }

            const escapeLobby = storage.getOrCreateEscapeShipLobby(
              ws.playerId,
              ws.playerName,
              requestedVipOnly,
            );
            storage.updatePlayerStatus(ws.playerId, "in_lobby", "escapeship");

            escapeLobby.players.forEach((p) => {
              sendTo(p.id, {
                type: "lobby_update_escapeship",
                lobby: escapeLobby,
              });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_leave_escapeship": {
            if (!ws.playerId) return;
            const escapeLobby = storage.getEscapeShipLobbyByPlayerId(
              ws.playerId,
            );
            const escapeGame = storage.getEscapeShipGameByPlayerId(ws.playerId);

            if (escapeLobby) {
              storage.removePlayerFromEscapeShipLobby(
                escapeLobby.id,
                ws.playerId,
              );
              storage.updatePlayerStatus(ws.playerId, "online", null);

              const updatedEscapeLobby = storage.getEscapeShipLobby(
                escapeLobby.id,
              );
              if (updatedEscapeLobby && updatedEscapeLobby.players.length > 0) {
                updatedEscapeLobby.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_escapeship",
                    lobby: updatedEscapeLobby,
                  });
                });
              }
              sendTo(ws.playerId, { type: "escapeship_left" });
            }

            if (escapeGame) {
              escapeGame.players = escapeGame.players.filter(
                (p) => p.id !== ws.playerId,
              );
              storage.updatePlayerStatus(ws.playerId, "online", null);
              storage.updateEscapeShipGame(escapeGame.id, escapeGame);
              escapeGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "game_update_escapeship",
                  game: escapeGame,
                });
              });
              sendTo(ws.playerId, { type: "escapeship_left" });
            }
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_start_escapeship": {
            if (!ws.playerId) return;
            const escapeLobby = storage.getEscapeShipLobbyByPlayerId(
              ws.playerId,
            );
            if (!escapeLobby || escapeLobby.hostId !== ws.playerId) return;
            if (escapeLobby.players.length < escapeLobby.minPlayers) {
              sendTo(ws.playerId, {
                type: "error",
                message: `Need at least ${escapeLobby.minPlayers} players to start.`,
              });
              return;
            }

            const escapeGame = storage.createEscapeShipGame(escapeLobby);
            storage.deleteEscapeShipLobby(escapeLobby.id);

            escapeGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "in_game", "escapeship");
              sendTo(p.id, {
                type: "game_update_escapeship",
                game: escapeGame,
              });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "game_action_escapeship": {
            if (!ws.playerId) return;
            const { action, data: actionData } = data as {
              action: string;
              data: any;
            };
            const escapeGame = storage.getEscapeShipGameByPlayerId(ws.playerId);
            if (!escapeGame || escapeGame.status === "finished") return;

            const player = escapeGame.players.find((p) => p.id === ws.playerId);
            if (!player || player.escaped) return;

            // Check stun status
            if (player.isStunned && player.stunEndTime) {
              if (Date.now() < player.stunEndTime) {
                return; // Still stunned
              }
              player.isStunned = false;
              player.stunEndTime = null;
            }

            const ROOM_ITEMS: Record<string, string> = {
              lab: "key",
              engine: "fuel",
              bridge: "code",
            };

            const ADJACENT_ROOMS: Record<string, string[]> = {
              engine: ["cargo", "lab"],
              bridge: ["airlock", "cargo"],
              cargo: ["engine", "bridge", "lab"],
              lab: ["engine", "cargo", "airlock"],
              airlock: ["bridge", "lab", "escape_pod"],
              escape_pod: ["airlock"],
            };

            // Canonical list of valid rooms
            const VALID_ROOMS = Object.keys(ADJACENT_ROOMS);

            switch (action) {
              case "move": {
                const { toRoom } = actionData;
                const adjacentRooms = ADJACENT_ROOMS[player.currentRoom];

                // Validate target room is adjacent and valid
                if (
                  !adjacentRooms ||
                  !adjacentRooms.includes(toRoom) ||
                  !VALID_ROOMS.includes(toRoom)
                ) {
                  break;
                }

                // Check for trap before determining final room
                let finalRoom = toRoom;
                let trapTriggered = false;
                let trapType: string | null = null;

                const roomPuzzle = escapeGame.roomPuzzles[toRoom];
                if (roomPuzzle?.trapActive && Math.random() < 0.3) {
                  roomPuzzle.trapActive = false;
                  trapTriggered = true;
                  trapType = roomPuzzle.trapType;

                  if (roomPuzzle.trapType === "teleport") {
                    // Teleport trap: send player to a random valid room
                    const otherRooms = VALID_ROOMS.filter(
                      (r) => r !== toRoom && r !== "escape_pod",
                    );
                    finalRoom =
                      otherRooms[Math.floor(Math.random() * otherRooms.length)];
                  }
                }

                // Update player's room to final destination
                player.currentRoom = finalRoom as any;

                // Log move event with final room destination
                escapeGame.events.push({
                  type: "move",
                  playerId: ws.playerId,
                  playerName: player.name,
                  message: `moved to ${finalRoom}`,
                  timestamp: Date.now(),
                });

                // Log trap event if triggered
                if (trapTriggered) {
                  if (trapType === "teleport") {
                    escapeGame.events.push({
                      type: "trap",
                      playerId: ws.playerId,
                      playerName: player.name,
                      message: `triggered a teleport trap while entering ${toRoom} and was sent to ${finalRoom}!`,
                      timestamp: Date.now(),
                    });
                  } else {
                    // Stun trap: stun the player for 5 seconds
                    player.isStunned = true;
                    player.stunEndTime = Date.now() + 5000;
                    escapeGame.events.push({
                      type: "trap",
                      playerId: ws.playerId,
                      playerName: player.name,
                      message: `triggered a stun trap in ${finalRoom} and is stunned!`,
                      timestamp: Date.now(),
                    });
                  }
                }
                break;
              }
              case "solve": {
                const { answer } = actionData;
                const currentRoom = player.currentRoom;
                const puzzle = escapeGame.roomPuzzles[currentRoom];

                if (
                  puzzle &&
                  !puzzle.solved &&
                  answer.toUpperCase() === puzzle.answer.toUpperCase()
                ) {
                  puzzle.solved = true;
                  puzzle.solvedBy = player.name;

                  // Award item if room has one
                  const itemType = ROOM_ITEMS[currentRoom];
                  if (itemType === "key") player.hasKey = true;
                  else if (itemType === "fuel") player.hasFuel = true;
                  else if (itemType === "code") player.hasCode = true;

                  escapeGame.events.push({
                    type: "puzzle_solved",
                    playerId: ws.playerId,
                    playerName: player.name,
                    message: `solved the puzzle in ${currentRoom}${itemType ? ` and got the ${itemType}!` : "!"}`,
                    timestamp: Date.now(),
                  });
                }
                break;
              }
              case "escape": {
                if (
                  player.currentRoom === "escape_pod" &&
                  player.hasKey &&
                  player.hasFuel &&
                  player.hasCode
                ) {
                  player.escaped = true;
                  player.finishTime = Date.now() - escapeGame.startTime;
                  player.position = escapeGame.rankings.length + 1;

                  escapeGame.rankings.push({
                    playerId: ws.playerId,
                    playerName: player.name,
                    time: player.finishTime,
                    position: player.position,
                  });

                  escapeGame.events.push({
                    type: "escaped",
                    playerId: ws.playerId,
                    playerName: player.name,
                    message: `ESCAPED in ${Math.floor(player.finishTime / 1000)} seconds!`,
                    timestamp: Date.now(),
                  });

                  // Check if game should end
                  const allEscaped = escapeGame.players.every((p) => p.escaped);
                  if (allEscaped) {
                    escapeGame.status = "finished";
                  }
                }
                break;
              }
            }

            // Check time limit
            const elapsed = Date.now() - escapeGame.startTime;
            if (elapsed >= escapeGame.gameTimer * 1000) {
              escapeGame.status = "finished";
            }

            storage.updateEscapeShipGame(escapeGame.id, escapeGame);
            escapeGame.players.forEach((p) => {
              sendTo(p.id, {
                type: "game_update_escapeship",
                game: escapeGame,
              });
            });

            // Clean up finished game after delay to allow viewing results
            if (
              escapeGame.status === "finished" &&
              !escapeShipCleanupScheduled.has(escapeGame.id)
            ) {
              escapeShipCleanupScheduled.add(escapeGame.id);
              const gameId = escapeGame.id;
              const playerIds = escapeGame.players.map((p) => p.id);

              // Update player statuses immediately when game finishes
              playerIds.forEach((pid) => {
                storage.updatePlayerStatus(pid, "online", null);
              });
              broadcast({
                type: "lobby_counts_update",
                lobbyCounts: getLobbyCountsForBroadcast(),
              });

              // Delete game data after 30 seconds to allow viewing final results
              setTimeout(() => {
                escapeShipCleanupScheduled.delete(gameId);
                const existingGame = storage.getEscapeShipGame(gameId);
                if (existingGame) {
                  storage.deleteEscapeShipGame(gameId);
                  playerIds.forEach((pid) => {
                    sendTo(pid, { type: "escapeship_game_ended" });
                  });
                }
              }, 30000);
            }
            break;
          }

          case "game_chat_escapeship": {
            if (!ws.playerId || !ws.playerName) return;
            const { message } = data as { message: string };
            const escapeGame = storage.getEscapeShipGameByPlayerId(ws.playerId);
            const escapeLobby = storage.getEscapeShipLobbyByPlayerId(
              ws.playerId,
            );

            if (escapeGame) {
              escapeGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "escapeship_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            } else if (escapeLobby) {
              escapeLobby.players.forEach((p) => {
                sendTo(p.id, {
                  type: "escapeship_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            }
            break;
          }

          // ========== TRUTH OR BLUFF ==========
          case "lobby_join_truthorbluff": {
            if (!ws.playerId || !ws.playerName) return;
            const existingTobLobby = storage.getTruthOrBluffLobbyByPlayerId(
              ws.playerId,
            );
            if (existingTobLobby) {
              sendTo(ws.playerId, {
                type: "lobby_update_truthorbluff",
                lobby: existingTobLobby,
              });
              return;
            }

            const tobLobby = storage.getOrCreateTruthOrBluffLobby(
              ws.playerId,
              ws.playerName,
            );
            storage.updatePlayerStatus(ws.playerId, "in_lobby", "truthorbluff");

            tobLobby.players.forEach((p) => {
              sendTo(p.id, {
                type: "lobby_update_truthorbluff",
                lobby: tobLobby,
              });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_leave_truthorbluff": {
            if (!ws.playerId) return;
            const tobLobby = storage.getTruthOrBluffLobbyByPlayerId(
              ws.playerId,
            );
            const tobGame = storage.getTruthOrBluffGameByPlayerId(ws.playerId);

            if (tobLobby) {
              storage.removePlayerFromTruthOrBluffLobby(
                tobLobby.id,
                ws.playerId,
              );
              storage.updatePlayerStatus(ws.playerId, "online", null);

              const updatedTobLobby = storage.getTruthOrBluffLobby(tobLobby.id);
              if (updatedTobLobby && updatedTobLobby.players.length > 0) {
                updatedTobLobby.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_truthorbluff",
                    lobby: updatedTobLobby,
                  });
                });
              }
              sendTo(ws.playerId, { type: "truthorbluff_left" });
            }

            if (tobGame) {
              tobGame.players = tobGame.players.filter(
                (p) => p.id !== ws.playerId,
              );
              storage.updatePlayerStatus(ws.playerId, "online", null);
              storage.updateTruthOrBluffGame(tobGame.id, tobGame);
              tobGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "game_update_truthorbluff",
                  game: tobGame,
                });
              });
              sendTo(ws.playerId, { type: "truthorbluff_left" });
            }
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_start_truthorbluff": {
            if (!ws.playerId) return;
            const tobLobby = storage.getTruthOrBluffLobbyByPlayerId(
              ws.playerId,
            );
            if (!tobLobby || tobLobby.hostId !== ws.playerId) return;
            if (tobLobby.players.length < tobLobby.minPlayers) {
              sendTo(ws.playerId, {
                type: "error",
                message: `Need at least ${tobLobby.minPlayers} players to start.`,
              });
              return;
            }

            const tobGame = storage.createTruthOrBluffGame(tobLobby);
            storage.deleteTruthOrBluffLobby(tobLobby.id);

            tobGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "in_game", "truthorbluff");
              sendTo(p.id, { type: "game_update_truthorbluff", game: tobGame });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "game_submit_story_truthorbluff": {
            if (!ws.playerId) return;
            const { story, isTruth } = data as {
              story: string;
              isTruth: boolean;
            };
            const tobGame = storage.getTruthOrBluffGameByPlayerId(ws.playerId);
            if (!tobGame || tobGame.status !== "waiting_story") return;
            if (tobGame.currentStoryteller !== ws.playerId) return;

            tobGame.currentStory = story;
            tobGame.storyIsTruth = isTruth;
            tobGame.status = "voting";
            tobGame.votes = {};

            storage.updateTruthOrBluffGame(tobGame.id, tobGame);
            tobGame.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_truthorbluff", game: tobGame });
            });
            break;
          }

          case "game_vote_truthorbluff": {
            if (!ws.playerId) return;
            const { voteTruth } = data as { voteTruth: boolean };
            const tobGame = storage.getTruthOrBluffGameByPlayerId(ws.playerId);
            if (!tobGame || tobGame.status !== "voting") return;
            if (tobGame.currentStoryteller === ws.playerId) return;
            if (tobGame.votes[ws.playerId] !== undefined) return;

            tobGame.votes[ws.playerId] = voteTruth;

            const votersCount = Object.keys(tobGame.votes).length;
            const expectedVoters = tobGame.players.length - 1;

            if (votersCount >= expectedVoters) {
              tobGame.status = "reveal";
              const results: any[] = [];
              Object.entries(tobGame.votes).forEach(([playerId, vote]) => {
                const player = tobGame.players.find((p) => p.id === playerId);
                const wasCorrect = vote === tobGame.storyIsTruth;
                if (wasCorrect && player) {
                  player.score += 10;
                }
                results.push({
                  playerId,
                  playerName: player?.name || "Unknown",
                  votedTruth: vote,
                  wasCorrect,
                });
              });

              const storyteller = tobGame.players.find(
                (p) => p.id === tobGame.currentStoryteller,
              );
              const fooledCount = results.filter((r) => !r.wasCorrect).length;
              if (storyteller) {
                storyteller.score += fooledCount * 5;
              }

              tobGame.voteResults = results;
              storage.updateTruthOrBluffGame(tobGame.id, tobGame);

              tobGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "game_update_truthorbluff",
                  game: tobGame,
                });
              });

              setTimeout(() => {
                const gameAfterReveal = storage.getTruthOrBluffGame(tobGame.id);
                if (!gameAfterReveal || gameAfterReveal.status !== "reveal")
                  return;

                if (
                  gameAfterReveal.currentTurnIndex >=
                  gameAfterReveal.players.length - 1
                ) {
                  gameAfterReveal.roundNumber++;
                  gameAfterReveal.currentTurnIndex = 0;
                } else {
                  gameAfterReveal.currentTurnIndex++;
                }

                if (gameAfterReveal.roundNumber > gameAfterReveal.totalRounds) {
                  gameAfterReveal.status = "finished";
                  storage.updateTruthOrBluffGame(
                    gameAfterReveal.id,
                    gameAfterReveal,
                  );
                  gameAfterReveal.players.forEach((p) => {
                    storage.updatePlayerStatus(p.id, "online", null);
                    sendTo(p.id, {
                      type: "game_update_truthorbluff",
                      game: gameAfterReveal,
                    });
                  });
                  storage.deleteTruthOrBluffGame(gameAfterReveal.id);
                } else {
                  gameAfterReveal.currentStoryteller =
                    gameAfterReveal.players[
                      gameAfterReveal.currentTurnIndex
                    ].id;
                  gameAfterReveal.currentStory = "";
                  gameAfterReveal.storyIsTruth = null;
                  gameAfterReveal.votes = {};
                  gameAfterReveal.voteResults = [];
                  gameAfterReveal.status = "waiting_story";

                  storage.updateTruthOrBluffGame(
                    gameAfterReveal.id,
                    gameAfterReveal,
                  );
                  gameAfterReveal.players.forEach((p) => {
                    sendTo(p.id, {
                      type: "game_update_truthorbluff",
                      game: gameAfterReveal,
                    });
                  });
                }
              }, 5000);
            } else {
              storage.updateTruthOrBluffGame(tobGame.id, tobGame);
              tobGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "game_update_truthorbluff",
                  game: tobGame,
                });
              });
            }
            break;
          }

          case "game_chat_truthorbluff": {
            if (!ws.playerId || !ws.playerName) return;
            const { message } = data as { message: string };
            const tobGame = storage.getTruthOrBluffGameByPlayerId(ws.playerId);
            const tobLobby = storage.getTruthOrBluffLobbyByPlayerId(
              ws.playerId,
            );

            if (tobGame) {
              tobGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "truthorbluff_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            } else if (tobLobby) {
              tobLobby.players.forEach((p) => {
                sendTo(p.id, {
                  type: "truthorbluff_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            }
            break;
          }

          // ========== SPOT THE LIAR ==========
          case "lobby_join_spottheliar": {
            if (!ws.playerId || !ws.playerName) return;
            const existingStlLobby = storage.getSpotTheLiarLobbyByPlayerId(
              ws.playerId,
            );
            if (existingStlLobby) {
              sendTo(ws.playerId, {
                type: "lobby_update_spottheliar",
                lobby: existingStlLobby,
              });
              return;
            }

            const stlLobby = storage.getOrCreateSpotTheLiarLobby(
              ws.playerId,
              ws.playerName,
            );
            storage.updatePlayerStatus(ws.playerId, "in_lobby", "spottheliar");

            stlLobby.players.forEach((p) => {
              sendTo(p.id, {
                type: "lobby_update_spottheliar",
                lobby: stlLobby,
              });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_leave_spottheliar": {
            if (!ws.playerId) return;
            const stlLobby = storage.getSpotTheLiarLobbyByPlayerId(ws.playerId);
            const stlGame = storage.getSpotTheLiarGameByPlayerId(ws.playerId);

            if (stlLobby) {
              storage.removePlayerFromSpotTheLiarLobby(
                stlLobby.id,
                ws.playerId,
              );
              storage.updatePlayerStatus(ws.playerId, "online", null);

              const updatedStlLobby = storage.getSpotTheLiarLobby(stlLobby.id);
              if (updatedStlLobby && updatedStlLobby.players.length > 0) {
                updatedStlLobby.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_spottheliar",
                    lobby: updatedStlLobby,
                  });
                });
              }
              sendTo(ws.playerId, { type: "spottheliar_left" });
            }

            if (stlGame) {
              stlGame.players = stlGame.players.filter(
                (p) => p.id !== ws.playerId,
              );
              storage.updatePlayerStatus(ws.playerId, "online", null);
              storage.updateSpotTheLiarGame(stlGame.id, stlGame);
              stlGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "game_update_spottheliar",
                  game: stlGame,
                });
              });
              sendTo(ws.playerId, { type: "spottheliar_left" });
            }
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_start_spottheliar": {
            if (!ws.playerId) return;
            const stlLobby = storage.getSpotTheLiarLobbyByPlayerId(ws.playerId);
            if (!stlLobby || stlLobby.hostId !== ws.playerId) return;
            if (stlLobby.players.length < stlLobby.minPlayers) {
              sendTo(ws.playerId, {
                type: "error",
                message: `Need at least ${stlLobby.minPlayers} players to start`,
              });
              return;
            }

            stlLobby.status = "playing";
            const stlGame = storage.createSpotTheLiarGame(stlLobby);

            stlGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "in_game", "spottheliar");
              const isLiar = p.id === stlGame.liarId;
              const playerWord = isLiar ? stlGame.fakeWord : stlGame.realWord;
              sendTo(p.id, {
                type: "game_update_spottheliar",
                game: {
                  ...stlGame,
                  playerWord,
                  isLiar,
                },
              });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "game_describe_spottheliar": {
            if (!ws.playerId) return;
            const { description } = data as { description: string };
            const stlGame = storage.getSpotTheLiarGameByPlayerId(ws.playerId);
            if (!stlGame || stlGame.status !== "describing") return;
            if (stlGame.currentDescriber !== ws.playerId) return;

            const describer = stlGame.players.find((p) => p.id === ws.playerId);
            if (!describer) return;

            stlGame.descriptions.push({
              playerId: ws.playerId,
              playerName: describer.name,
              description,
            });

            stlGame.currentDescriberIndex++;
            if (
              stlGame.currentDescriberIndex >= stlGame.describerOrder.length
            ) {
              stlGame.status = "voting";
              stlGame.currentDescriber = "";
            } else {
              stlGame.currentDescriber =
                stlGame.describerOrder[stlGame.currentDescriberIndex];
            }

            storage.updateSpotTheLiarGame(stlGame.id, stlGame);
            stlGame.players.forEach((p) => {
              const isLiar = p.id === stlGame.liarId;
              const playerWord = isLiar ? stlGame.fakeWord : stlGame.realWord;
              sendTo(p.id, {
                type: "game_update_spottheliar",
                game: { ...stlGame, playerWord, isLiar },
              });
            });
            break;
          }

          case "game_vote_spottheliar": {
            if (!ws.playerId) return;
            const { votedPlayerId } = data as { votedPlayerId: string };
            const stlGame = storage.getSpotTheLiarGameByPlayerId(ws.playerId);
            if (!stlGame || stlGame.status !== "voting") return;
            if (stlGame.votes[ws.playerId]) return;

            stlGame.votes[ws.playerId] = votedPlayerId;

            const totalVotes = Object.keys(stlGame.votes).length;
            if (totalVotes >= stlGame.players.length) {
              stlGame.status = "reveal";

              const voteCounts: Record<string, number> = {};
              Object.values(stlGame.votes).forEach((v) => {
                voteCounts[v] = (voteCounts[v] || 0) + 1;
              });

              const maxVotes = Math.max(...Object.values(voteCounts));
              const mostVoted = Object.entries(voteCounts)
                .filter(([, count]) => count === maxVotes)
                .map(([id]) => id);

              const liarCaught = mostVoted.includes(stlGame.liarId);
              const liarPlayer = stlGame.players.find(
                (p) => p.id === stlGame.liarId,
              );

              if (liarCaught) {
                stlGame.players.forEach((p) => {
                  if (p.id !== stlGame.liarId) {
                    p.score += 10;
                  }
                });
              } else if (liarPlayer) {
                liarPlayer.score += 20;
              }

              stlGame.roundHistory.push({
                liarId: stlGame.liarId,
                liarName: liarPlayer?.name || "Unknown",
                realWord: stlGame.realWord,
                fakeWord: stlGame.fakeWord,
                liarCaught,
                votes: { ...stlGame.votes },
              });

              storage.updateSpotTheLiarGame(stlGame.id, stlGame);

              stlGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "game_update_spottheliar",
                  game: {
                    ...stlGame,
                    playerWord:
                      p.id === stlGame.liarId
                        ? stlGame.fakeWord
                        : stlGame.realWord,
                    isLiar: p.id === stlGame.liarId,
                    liarCaught,
                  },
                });
              });

              setTimeout(() => {
                const gameAfterReveal = storage.getSpotTheLiarGame(stlGame.id);
                if (!gameAfterReveal || gameAfterReveal.status !== "reveal")
                  return;

                if (
                  gameAfterReveal.roundNumber >= gameAfterReveal.totalRounds
                ) {
                  gameAfterReveal.status = "finished";
                  storage.updateSpotTheLiarGame(
                    gameAfterReveal.id,
                    gameAfterReveal,
                  );

                  gameAfterReveal.players.forEach((p) => {
                    storage.updatePlayerStatus(p.id, "online", null);
                    sendTo(p.id, {
                      type: "game_update_spottheliar",
                      game: {
                        ...gameAfterReveal,
                        playerWord:
                          p.id === gameAfterReveal.liarId
                            ? gameAfterReveal.fakeWord
                            : gameAfterReveal.realWord,
                        isLiar: p.id === gameAfterReveal.liarId,
                      },
                    });
                  });
                  storage.deleteSpotTheLiarGame(gameAfterReveal.id);
                } else {
                  const wordSets = [
                    {
                      category: "Animals",
                      realWord: "Elephant",
                      fakeWord: "Giraffe",
                    },
                    { category: "Food", realWord: "Pizza", fakeWord: "Burger" },
                    {
                      category: "Places",
                      realWord: "Beach",
                      fakeWord: "Mountain",
                    },
                    { category: "Jobs", realWord: "Doctor", fakeWord: "Nurse" },
                    {
                      category: "Sports",
                      realWord: "Soccer",
                      fakeWord: "Basketball",
                    },
                  ];
                  const newWordSet =
                    wordSets[Math.floor(Math.random() * wordSets.length)];
                  const playerIds = gameAfterReveal.players.map((p) => p.id);
                  const newLiarId =
                    playerIds[Math.floor(Math.random() * playerIds.length)];
                  const shuffledOrder = [...playerIds].sort(
                    () => Math.random() - 0.5,
                  );

                  gameAfterReveal.roundNumber++;
                  gameAfterReveal.liarId = newLiarId;
                  gameAfterReveal.realWord = newWordSet.realWord;
                  gameAfterReveal.fakeWord = newWordSet.fakeWord;
                  gameAfterReveal.category = newWordSet.category;
                  gameAfterReveal.descriptions = [];
                  gameAfterReveal.describerOrder = shuffledOrder;
                  gameAfterReveal.currentDescriberIndex = 0;
                  gameAfterReveal.currentDescriber = shuffledOrder[0];
                  gameAfterReveal.votes = {};
                  gameAfterReveal.status = "describing";

                  storage.updateSpotTheLiarGame(
                    gameAfterReveal.id,
                    gameAfterReveal,
                  );

                  gameAfterReveal.players.forEach((p) => {
                    const isLiar = p.id === gameAfterReveal.liarId;
                    const playerWord = isLiar
                      ? gameAfterReveal.fakeWord
                      : gameAfterReveal.realWord;
                    sendTo(p.id, {
                      type: "game_update_spottheliar",
                      game: { ...gameAfterReveal, playerWord, isLiar },
                    });
                  });
                }
              }, 5000);
            } else {
              storage.updateSpotTheLiarGame(stlGame.id, stlGame);
              stlGame.players.forEach((p) => {
                const isLiar = p.id === stlGame.liarId;
                const playerWord = isLiar ? stlGame.fakeWord : stlGame.realWord;
                sendTo(p.id, {
                  type: "game_update_spottheliar",
                  game: { ...stlGame, playerWord, isLiar },
                });
              });
            }
            break;
          }

          case "game_chat_spottheliar": {
            if (!ws.playerId || !ws.playerName) return;
            const { message } = data as { message: string };
            const stlGame = storage.getSpotTheLiarGameByPlayerId(ws.playerId);
            const stlLobby = storage.getSpotTheLiarLobbyByPlayerId(ws.playerId);

            if (stlGame) {
              stlGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "spottheliar_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            } else if (stlLobby) {
              stlLobby.players.forEach((p) => {
                sendTo(p.id, {
                  type: "spottheliar_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            }
            break;
          }

          // ========== REACTION RACE HANDLERS ==========
          case "lobby_join_reactionrace": {
            if (!ws.playerId || !ws.playerName) return;
            const existingRRLobby = storage.getReactionRaceLobbyByPlayerId(
              ws.playerId,
            );
            if (existingRRLobby) {
              sendTo(ws.playerId, {
                type: "lobby_update_reactionrace",
                lobby: existingRRLobby,
              });
              return;
            }

            const rrLobby = storage.getOrCreateReactionRaceLobby(
              ws.playerId,
              ws.playerName,
            );
            storage.updatePlayerStatus(ws.playerId, "in_lobby", "reactionrace");

            rrLobby.players.forEach((p) => {
              sendTo(p.id, {
                type: "lobby_update_reactionrace",
                lobby: rrLobby,
              });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_leave_reactionrace": {
            if (!ws.playerId) return;
            const rrLobby = storage.getReactionRaceLobbyByPlayerId(ws.playerId);
            const rrGame = storage.getReactionRaceGameByPlayerId(ws.playerId);

            if (rrLobby) {
              storage.removePlayerFromReactionRaceLobby(
                rrLobby.id,
                ws.playerId,
              );
              storage.updatePlayerStatus(ws.playerId, "online", null);

              const updatedRRLobby = storage.getReactionRaceLobby(rrLobby.id);
              if (updatedRRLobby && updatedRRLobby.players.length > 0) {
                updatedRRLobby.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_reactionrace",
                    lobby: updatedRRLobby,
                  });
                });
              }
              sendTo(ws.playerId, { type: "reactionrace_left" });
            }

            if (rrGame) {
              rrGame.players = rrGame.players.filter(
                (p) => p.id !== ws.playerId,
              );
              storage.updatePlayerStatus(ws.playerId, "online", null);
              storage.updateReactionRaceGame(rrGame.id, rrGame);
              rrGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "game_update_reactionrace",
                  game: rrGame,
                });
              });
              sendTo(ws.playerId, { type: "reactionrace_left" });
            }
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_start_reactionrace": {
            if (!ws.playerId) return;
            const rrLobby = storage.getReactionRaceLobbyByPlayerId(ws.playerId);
            if (!rrLobby || rrLobby.hostId !== ws.playerId) return;
            if (rrLobby.players.length < rrLobby.minPlayers) {
              sendTo(ws.playerId, {
                type: "error",
                message: `Need at least ${rrLobby.minPlayers} players to start.`,
              });
              return;
            }

            const rrGame = storage.createReactionRaceGame(rrLobby);
            storage.deleteReactionRaceLobby(rrLobby.id);

            rrGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "in_game", "reactionrace");
              sendTo(p.id, { type: "game_update_reactionrace", game: rrGame });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });

            // Start the first round after a short delay
            setTimeout(() => {
              const gameCheck = storage.getReactionRaceGame(rrGame.id);
              if (gameCheck && gameCheck.status === "playing") {
                startReactionRaceRound(gameCheck.id);
              }
            }, 1500);
            break;
          }

          case "game_react_reactionrace": {
            if (!ws.playerId) return;
            const rrGame = storage.getReactionRaceGameByPlayerId(ws.playerId);
            if (!rrGame || rrGame.status !== "playing") return;

            const player = rrGame.players.find((p) => p.id === ws.playerId);
            if (!player) return;

            // Already reacted this round
            if (player.lastReactionTime !== null || player.falseStart) return;

            const now = Date.now();

            // Check if signal has been shown
            if (
              rrGame.roundStatus === "waiting" ||
              rrGame.roundStatus === "ready"
            ) {
              // False start - clicked before signal
              player.falseStart = true;
              player.score = Math.max(0, player.score - 1); // Penalty
              storage.updateReactionRaceGame(rrGame.id, rrGame);

              rrGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "game_update_reactionrace",
                  game: rrGame,
                });
              });
              return;
            }

            if (rrGame.roundStatus === "signal" && rrGame.signalTime) {
              // Valid reaction
              player.lastReactionTime = now - rrGame.signalTime;
              storage.updateReactionRaceGame(rrGame.id, rrGame);

              // Check if all players have reacted or false started
              const allResponded = rrGame.players.every(
                (p) => p.lastReactionTime !== null || p.falseStart,
              );

              if (allResponded) {
                completeReactionRaceRound(rrGame.id);
              } else {
                rrGame.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "game_update_reactionrace",
                    game: rrGame,
                  });
                });
              }
            }
            break;
          }

          case "game_chat_reactionrace": {
            if (!ws.playerId || !ws.playerName) return;
            const { message } = data as { message: string };
            const rrGame = storage.getReactionRaceGameByPlayerId(ws.playerId);
            const rrLobby = storage.getReactionRaceLobbyByPlayerId(ws.playerId);

            if (rrGame) {
              rrGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "reactionrace_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            } else if (rrLobby) {
              rrLobby.players.forEach((p) => {
                sendTo(p.id, {
                  type: "reactionrace_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            }
            break;
          }

          // ========== COLOR CLASH HANDLERS ==========
          case "lobby_join_colorclash": {
            if (!ws.playerId || !ws.playerName) return;
            const existingCCLobby = storage.getColorClashLobbyByPlayerId(
              ws.playerId,
            );
            if (existingCCLobby) {
              sendTo(ws.playerId, {
                type: "lobby_update_colorclash",
                lobby: existingCCLobby,
              });
              return;
            }

            const ccLobby = storage.getOrCreateColorClashLobby(
              ws.playerId,
              ws.playerName,
            );
            storage.updatePlayerStatus(ws.playerId, "in_lobby", "colorclash");

            ccLobby.players.forEach((p) => {
              sendTo(p.id, { type: "lobby_update_colorclash", lobby: ccLobby });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_leave_colorclash": {
            if (!ws.playerId) return;
            const ccLobby = storage.getColorClashLobbyByPlayerId(ws.playerId);
            const ccGame = storage.getColorClashGameByPlayerId(ws.playerId);

            if (ccLobby) {
              storage.removePlayerFromColorClashLobby(ccLobby.id, ws.playerId);
              storage.updatePlayerStatus(ws.playerId, "online", null);

              const updatedCCLobby = storage.getColorClashLobby(ccLobby.id);
              if (updatedCCLobby && updatedCCLobby.players.length > 0) {
                updatedCCLobby.players.forEach((p) => {
                  sendTo(p.id, {
                    type: "lobby_update_colorclash",
                    lobby: updatedCCLobby,
                  });
                });
              }
              sendTo(ws.playerId, { type: "colorclash_left" });
            }

            if (ccGame) {
              const leavingPlayer = ccGame.players.find(
                (p) => p.id === ws.playerId,
              );
              if (leavingPlayer) {
                leavingPlayer.isEliminated = true;
              }
              storage.updatePlayerStatus(ws.playerId, "online", null);
              storage.updateColorClashGame(ccGame.id, ccGame);

              const activePlayers = ccGame.players.filter(
                (p) => !p.isEliminated,
              );
              if (activePlayers.length <= 1) {
                ccGame.status = "finished";
                if (activePlayers.length === 1) {
                  ccGame.winner = activePlayers[0].id;
                  ccGame.winnerName = activePlayers[0].name;
                }
                storage.updateColorClashGame(ccGame.id, ccGame);
              }

              ccGame.players.forEach((p) => {
                sendTo(p.id, { type: "game_update_colorclash", game: ccGame });
              });
              sendTo(ws.playerId, { type: "colorclash_left" });
            }
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_start_colorclash": {
            if (!ws.playerId) return;
            const ccLobby = storage.getColorClashLobbyByPlayerId(ws.playerId);
            if (!ccLobby || ccLobby.hostId !== ws.playerId) return;
            if (ccLobby.players.length < ccLobby.minPlayers) {
              sendTo(ws.playerId, {
                type: "error",
                message: `Need at least ${ccLobby.minPlayers} players to start.`,
              });
              return;
            }

            const ccGame = storage.createColorClashGame(ccLobby);
            storage.deleteColorClashLobby(ccLobby.id);

            ccGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "in_game", "colorclash");
              sendTo(p.id, { type: "game_update_colorclash", game: ccGame });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });

            // Start showing the first color sequence after a short delay
            setTimeout(() => {
              startColorClashRound(ccGame.id, sendTo);
            }, 1500);
            break;
          }

          case "game_input_colorclash": {
            if (!ws.playerId) return;
            const { color } = data as { color: string };
            const ccGame = storage.getColorClashGameByPlayerId(ws.playerId);
            if (!ccGame || ccGame.status !== "playing") return;
            if (ccGame.roundStatus !== "input") return;

            // Validate color
            if (!COLOR_CLASH_COLORS.includes(color)) {
              sendTo(ws.playerId, {
                type: "error",
                message: "Invalid color. Must be red, blue, green, or yellow.",
              });
              return;
            }

            const player = ccGame.players.find((p) => p.id === ws.playerId);
            if (!player || player.isEliminated || player.hasSubmitted) return;

            player.currentInput.push(color);
            storage.updateColorClashGame(ccGame.id, ccGame);

            // Send update only to the player who input
            sendTo(ws.playerId, {
              type: "game_update_colorclash",
              game: ccGame,
            });
            break;
          }

          case "game_submit_colorclash": {
            if (!ws.playerId) return;
            const ccGame = storage.getColorClashGameByPlayerId(ws.playerId);
            if (!ccGame || ccGame.status !== "playing") return;
            if (ccGame.roundStatus !== "input") return;

            const player = ccGame.players.find((p) => p.id === ws.playerId);
            if (!player || player.isEliminated || player.hasSubmitted) return;

            player.hasSubmitted = true;

            // Check if player's input matches the sequence
            const isCorrect =
              player.currentInput.length === ccGame.colorSequence.length &&
              player.currentInput.every(
                (c, i) => c === ccGame.colorSequence[i],
              );

            if (!isCorrect) {
              player.isEliminated = true;
            }

            storage.updateColorClashGame(ccGame.id, ccGame);

            // Check if all active players have submitted
            const activePlayers = ccGame.players.filter((p) => !p.isEliminated);
            const allSubmitted = activePlayers.every((p) => p.hasSubmitted);

            if (allSubmitted) {
              completeColorClashRound(ccGame.id, sendTo);
            } else {
              ccGame.players.forEach((p) => {
                sendTo(p.id, { type: "game_update_colorclash", game: ccGame });
              });
            }
            break;
          }

          case "game_chat_colorclash": {
            if (!ws.playerId || !ws.playerName) return;
            const { message } = data as { message: string };
            const ccGame = storage.getColorClashGameByPlayerId(ws.playerId);
            const ccLobby = storage.getColorClashLobbyByPlayerId(ws.playerId);

            if (ccGame) {
              ccGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "colorclash_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            } else if (ccLobby) {
              ccLobby.players.forEach((p) => {
                sendTo(p.id, {
                  type: "colorclash_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            }
            break;
          }

          // ========== HIDE AND SEEK HANDLERS ==========
          case "lobby_join_hideseek": {
            if (!ws.playerId || !ws.playerName) return;
            const requestedVipOnly = Boolean(data.vipOnly);
            if (requestedVipOnly && !isVipOrAdmin(ws.playerName)) {
              sendTo(ws.playerId, {
                type: "error",
                message: "VIP lobby is only for VIP or admin users.",
              });
              return;
            }
            const existingHSLobby = storage.getHideSeekLobbyByPlayerId(ws.playerId);
            if (existingHSLobby) {
              if (Boolean((existingHSLobby as any).vipOnly) !== requestedVipOnly) {
                sendTo(ws.playerId, {
                  type: "error",
                  message: "Leave your current Hide & Seek lobby before switching VIP/normal lobby.",
                });
                return;
              }
              sendTo(ws.playerId, { type: "lobby_update_hideseek", lobby: existingHSLobby });
              return;
            }

            const hsLobby = storage.getOrCreateHideSeekLobby(
              ws.playerId,
              ws.playerName,
              requestedVipOnly,
            );
            storage.updatePlayerStatus(ws.playerId, "in_lobby", "hideseek");

            hsLobby.players.forEach((p) => {
              sendTo(p.id, { type: "lobby_update_hideseek", lobby: hsLobby });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_leave_hideseek": {
            if (!ws.playerId) return;
            const hsLobby = storage.getHideSeekLobbyByPlayerId(ws.playerId);
            const hsGame = storage.getHideSeekGameByPlayerId(ws.playerId);

            if (hsLobby) {
              storage.removePlayerFromHideSeekLobby(hsLobby.id, ws.playerId);
              storage.updatePlayerStatus(ws.playerId, "online", null);

              const updatedHSLobby = storage.getHideSeekLobby(hsLobby.id);
              if (updatedHSLobby && updatedHSLobby.players.length > 0) {
                updatedHSLobby.players.forEach((p) => {
                  sendTo(p.id, { type: "lobby_update_hideseek", lobby: updatedHSLobby });
                });
              }
              sendTo(ws.playerId, { type: "hideseek_left" });
            }

            if (hsGame) {
              const leavingPlayer = hsGame.players.find((p) => p.id === ws.playerId);
              if (leavingPlayer) {
                leavingPlayer.isEliminated = true;
              }
              storage.updatePlayerStatus(ws.playerId, "online", null);
              storage.updateHideSeekGame(hsGame.id, hsGame);

              // Check if game should end
              const activePlayers = hsGame.players.filter((p) => !p.isEliminated);
              const activeHiders = activePlayers.filter((p) => !p.isSeeker);
              const seeker = activePlayers.find((p) => p.isSeeker);

              if (!seeker || activeHiders.length === 0) {
                hsGame.status = "finished";
                hsGame.winner = !seeker ? "hiders" : "seeker";
                storage.updateHideSeekGame(hsGame.id, hsGame);
              }

              hsGame.players.forEach((p) => {
                sendTo(p.id, { type: "game_update_hideseek", game: hsGame });
              });
              sendTo(ws.playerId, { type: "hideseek_left" });
            }
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "lobby_settings_hideseek": {
            if (!ws.playerId) return;
            const { seekerMode } = data as { seekerMode: "random" | "host" };
            const hsLobby = storage.getHideSeekLobbyByPlayerId(ws.playerId);
            if (!hsLobby || hsLobby.hostId !== ws.playerId) return;

            const updatedLobby = storage.updateHideSeekLobby(hsLobby.id, { seekerMode });
            if (updatedLobby) {
              updatedLobby.players.forEach((p) => {
                sendTo(p.id, { type: "lobby_update_hideseek", lobby: updatedLobby });
              });
            }
            break;
          }

          case "lobby_start_hideseek": {
            if (!ws.playerId) return;
            const hsLobby = storage.getHideSeekLobbyByPlayerId(ws.playerId);
            if (!hsLobby || hsLobby.hostId !== ws.playerId) return;
            if (hsLobby.players.length < hsLobby.minPlayers) {
              sendTo(ws.playerId, {
                type: "error",
                message: `Need at least ${hsLobby.minPlayers} players to start.`,
              });
              return;
            }

            const hsGame = storage.createHideSeekGame(hsLobby);
            storage.deleteHideSeekLobby(hsLobby.id);

            hsGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "in_game", "hideseek");
              sendTo(p.id, { type: "game_update_hideseek", game: hsGame });
            });

            // Start game timer
            const gameInterval = setInterval(() => {
              const currentGame = storage.getHideSeekGame(hsGame.id);
              if (!currentGame) {
                clearInterval(gameInterval);
                return;
              }

              if (currentGame.phase === "hiding" && currentGame.hidingTimeRemaining > 0) {
                currentGame.hidingTimeRemaining--;
                if (currentGame.hidingTimeRemaining === 0) {
                  currentGame.phase = "seeking";
                }
              }

              if (currentGame.gameTimeRemaining > 0) {
                currentGame.gameTimeRemaining--;
              } else if (currentGame.status === "playing") {
                currentGame.status = "finished";
                currentGame.winner = "hiders";
              }

              storage.updateHideSeekGame(currentGame.id, currentGame);
              currentGame.players.forEach((p) => {
                sendTo(p.id, { type: "game_update_hideseek", game: currentGame });
              });
            }, 1000);

            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "game_move_hideseek": {
            if (!ws.playerId) return;
            const { x, y, z, rotation } = data as { x: number; y: number; z: number; rotation: number };
            const hsGame = storage.getHideSeekGameByPlayerId(ws.playerId);
            if (!hsGame) return;

            const player = hsGame.players.find((p) => p.id === ws.playerId);
            if (player && !player.isEliminated) {
              player.x = x;
              player.y = y;
              player.z = z;
              player.rotation = rotation;
              storage.updateHideSeekGame(hsGame.id, hsGame);

              hsGame.players.forEach((p) => {
                sendTo(p.id, { type: "game_update_hideseek", game: hsGame });
              });
            }
            break;
          }

          case "game_action_hideseek": {
            if (!ws.playerId) return;
            const { action, targetId } = data as { action: string; targetId?: string };
            const hsGame = storage.getHideSeekGameByPlayerId(ws.playerId);
            if (!hsGame) return;

            const player = hsGame.players.find((p) => p.id === ws.playerId);
            if (!player || player.isEliminated) return;

            if (action === "crouch") {
              player.isCrouching = true;
            } else if (action === "stand") {
              player.isCrouching = false;
            } else if (action === "jump") {
              // Jump action handled client-side, server just acknowledges
            } else if (action === "eliminate" && player.isSeeker && targetId) {
              const target = hsGame.players.find((p) => p.id === targetId);
              if (target && !target.isEliminated && !target.isSeeker) {
                target.isEliminated = true;
                hsGame.eliminatedPlayers.push(targetId);

                // Check if all hiders are eliminated
                const activeHiders = hsGame.players.filter((p) => !p.isSeeker && !p.isEliminated);
                if (activeHiders.length === 0) {
                  hsGame.status = "finished";
                  hsGame.winner = "seeker";
                }
              }
            }

            storage.updateHideSeekGame(hsGame.id, hsGame);
            hsGame.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_hideseek", game: hsGame });
            });
            break;
          }

          case "game_chat_hideseek": {
            if (!ws.playerId || !ws.playerName) return;
            const { message } = data as { message: string };
            const hsGame = storage.getHideSeekGameByPlayerId(ws.playerId);
            const hsLobby = storage.getHideSeekLobbyByPlayerId(ws.playerId);

            if (hsGame) {
              hsGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "hideseek_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            } else if (hsLobby) {
              hsLobby.players.forEach((p) => {
                sendTo(p.id, {
                  type: "hideseek_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            }
            break;
          }

          // ========== BATTLESHIP HANDLERS ==========
          case "battleship_join_lobby": {
            if (!ws.playerId || !ws.playerName) return;
            const existingBSLobby = storage.getBattleshipLobbyByPlayerId(ws.playerId);
            if (existingBSLobby) {
              sendTo(ws.playerId, { type: "battleship_lobby_update", lobby: existingBSLobby });
              return;
            }

            const bsLobby = storage.getOrCreateBattleshipLobby(ws.playerId, ws.playerName);
            storage.updatePlayerStatus(ws.playerId, "in_lobby", "battleship");

            bsLobby.players.forEach((p) => {
              sendTo(p.id, { type: "battleship_lobby_update", lobby: bsLobby });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "battleship_leave_lobby": {
            if (!ws.playerId) return;
            const bsLobby = storage.getBattleshipLobbyByPlayerId(ws.playerId);
            if (bsLobby) {
              storage.removePlayerFromBattleshipLobby(bsLobby.id, ws.playerId);
              storage.updatePlayerStatus(ws.playerId, "online", null);
              
              const updatedLobby = storage.getBattleshipLobby(bsLobby.id);
              if (updatedLobby && updatedLobby.players.length > 0) {
                updatedLobby.players.forEach((p) => {
                  sendTo(p.id, { type: "battleship_lobby_update", lobby: updatedLobby });
                });
              } else if (!updatedLobby || updatedLobby.players.length === 0) {
                storage.deleteBattleshipLobby(bsLobby.id);
              }
              sendTo(ws.playerId, { type: "battleship_left" });
            }
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "battleship_start_game": {
            if (!ws.playerId) return;
            const { lobbyId } = data as { lobbyId: string };
            const bsLobby = storage.getBattleshipLobby(lobbyId);
            if (!bsLobby || bsLobby.hostId !== ws.playerId) return;
            if (bsLobby.players.length < 2) {
              sendTo(ws.playerId, { type: "error", message: "Need 2 players to start." });
              return;
            }

            const bsGame = storage.createBattleshipGame(bsLobby);
            bsGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "in_game", "battleship");
              sendTo(p.id, { type: "battleship_game_update", game: bsGame });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "battleship_place_ship": {
            if (!ws.playerId) return;
            const { gameId, size, positions } = data as { gameId: string; size: number; positions: Array<{ x: number; y: number }> };
            const bsGame = storage.getBattleshipGame(gameId);
            if (!bsGame) return;

            const player = bsGame.players.find((p) => p.id === ws.playerId);
            if (!player) return;

            // Validate positions are within 10x10 grid
            const outOfBounds = positions.some((p) => p.x < 0 || p.x >= 10 || p.y < 0 || p.y >= 10);
            if (outOfBounds) {
              sendTo(ws.playerId, { type: "error", message: "Ship position out of bounds" });
              return;
            }

            // Validate no overlap with existing ships
            const existingPositions = player.ships.flatMap((s) => s.positions);
            const hasOverlap = positions.some((newPos) => 
              existingPositions.some((exPos) => exPos.x === newPos.x && exPos.y === newPos.y)
            );
            if (hasOverlap) {
              sendTo(ws.playerId, { type: "error", message: "Ships cannot overlap" });
              return;
            }

            // Validate max 5 ships and correct sizes
            const allowedSizes = [5, 4, 3, 3, 2];
            const usedSizes = player.ships.map((s) => s.size);
            if (player.ships.length >= 5) {
              sendTo(ws.playerId, { type: "error", message: "Maximum ships placed" });
              return;
            }

            // Check if this size is still available
            const sizeCount = usedSizes.filter((s) => s === size).length;
            const allowedCount = allowedSizes.filter((s) => s === size).length;
            if (sizeCount >= allowedCount) {
              sendTo(ws.playerId, { type: "error", message: "This ship size already placed" });
              return;
            }

            const ship = {
              id: `ship-${Date.now()}-${Math.random()}`,
              size,
              positions,
              hits: [],
              isSunk: false,
            };
            player.ships.push(ship);
            storage.updateBattleshipGame(gameId, bsGame);

            bsGame.players.forEach((p) => {
              sendTo(p.id, { type: "battleship_game_update", game: bsGame });
            });
            break;
          }

          case "battleship_ready": {
            if (!ws.playerId) return;
            const { gameId } = data as { gameId: string };
            const bsGame = storage.getBattleshipGame(gameId);
            if (!bsGame) return;

            const player = bsGame.players.find((p) => p.id === ws.playerId);
            if (!player) return;

            player.isReady = true;
            const allReady = bsGame.players.every((p) => p.isReady);
            if (allReady) {
              bsGame.status = "playing";
            }
            storage.updateBattleshipGame(gameId, bsGame);

            bsGame.players.forEach((p) => {
              sendTo(p.id, { type: "battleship_game_update", game: bsGame });
            });
            break;
          }

          case "battleship_shoot": {
            if (!ws.playerId) return;
            const { gameId, x, y } = data as { gameId: string; x: number; y: number };
            const bsGame = storage.getBattleshipGame(gameId);
            if (!bsGame || bsGame.status !== "playing") return;
            if (bsGame.currentTurn !== ws.playerId) return;

            const shooter = bsGame.players.find((p) => p.id === ws.playerId);
            const target = bsGame.players.find((p) => p.id !== ws.playerId);
            if (!shooter || !target) return;

            if (shooter.shots.some((s) => s.x === x && s.y === y)) return;

            let hit = false;
            for (const ship of target.ships) {
              const hitPos = ship.positions.find((p) => p.x === x && p.y === y);
              if (hitPos) {
                hit = true;
                ship.hits.push({ x, y });
                if (ship.hits.length === ship.positions.length) {
                  ship.isSunk = true;
                }
                break;
              }
            }

            shooter.shots.push({ x, y, hit });

            const allSunk = target.ships.every((s) => s.isSunk);
            if (allSunk) {
              bsGame.status = "finished";
              bsGame.winner = shooter.id;
              bsGame.winnerName = shooter.name;
            } else {
              bsGame.currentTurn = target.id;
            }

            storage.updateBattleshipGame(gameId, bsGame);
            bsGame.players.forEach((p) => {
              sendTo(p.id, { type: "battleship_game_update", game: bsGame });
            });
            break;
          }

          case "battleship_leave_game": {
            if (!ws.playerId) return;
            const { gameId } = data as { gameId: string };
            const bsGame = storage.getBattleshipGame(gameId);
            if (!bsGame) return;

            storage.updatePlayerStatus(ws.playerId, "online", null);
            storage.deleteBattleshipGame(gameId);
            bsGame.players.forEach((p) => {
              sendTo(p.id, { type: "battleship_left" });
            });
            break;
          }

          case "battleship_chat": {
            if (!ws.playerId || !ws.playerName) return;
            const { message } = data as { message: string };
            const bsGame = storage.getBattleshipGameByPlayerId(ws.playerId);
            const bsLobby = storage.getBattleshipLobbyByPlayerId(ws.playerId);

            if (bsGame) {
              bsGame.players.forEach((p) => {
                sendTo(p.id, { type: "battleship_chat_message", sender: ws.playerName, message });
              });
            } else if (bsLobby) {
              bsLobby.players.forEach((p) => {
                sendTo(p.id, { type: "battleship_chat_message", sender: ws.playerName, message });
              });
            }
            break;
          }

          // ========== CAPTURE THE FLAG HANDLERS ==========
          case "ctf_join_lobby": {
            if (!ws.playerId || !ws.playerName) return;
            const existingCTFLobby = storage.getCTFLobbyByPlayerId(ws.playerId);
            if (existingCTFLobby) {
              sendTo(ws.playerId, { type: "ctf_lobby_update", lobby: existingCTFLobby });
              return;
            }

            const ctfLobby = storage.getOrCreateCTFLobby(ws.playerId, ws.playerName);
            storage.updatePlayerStatus(ws.playerId, "in_lobby", "ctf");

            ctfLobby.players.forEach((p) => {
              sendTo(p.id, { type: "ctf_lobby_update", lobby: ctfLobby });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "ctf_leave_lobby": {
            if (!ws.playerId) return;
            const ctfLobby = storage.getCTFLobbyByPlayerId(ws.playerId);
            if (ctfLobby) {
              storage.removePlayerFromCTFLobby(ctfLobby.id, ws.playerId);
              storage.updatePlayerStatus(ws.playerId, "online", null);
              
              const updatedLobby = storage.getCTFLobby(ctfLobby.id);
              if (updatedLobby && updatedLobby.players.length > 0) {
                updatedLobby.players.forEach((p) => {
                  sendTo(p.id, { type: "ctf_lobby_update", lobby: updatedLobby });
                });
              } else if (!updatedLobby || updatedLobby.players.length === 0) {
                storage.deleteCTFLobby(ctfLobby.id);
              }
              sendTo(ws.playerId, { type: "ctf_left" });
            }
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "ctf_set_team": {
            if (!ws.playerId) return;
            const { lobbyId, team } = data as { lobbyId: string; team: "red" | "blue" };
            const ctfLobby = storage.setCTFTeam(lobbyId, ws.playerId, team);
            if (ctfLobby) {
              ctfLobby.players.forEach((p) => {
                sendTo(p.id, { type: "ctf_lobby_update", lobby: ctfLobby });
              });
            }
            break;
          }

          case "ctf_set_ready": {
            if (!ws.playerId) return;
            const { lobbyId, ready } = data as { lobbyId: string; ready: boolean };
            const ctfLobby = storage.setCTFReady(lobbyId, ws.playerId, ready);
            if (ctfLobby) {
              ctfLobby.players.forEach((p) => {
                sendTo(p.id, { type: "ctf_lobby_update", lobby: ctfLobby });
              });
            }
            break;
          }

          case "ctf_start_game": {
            if (!ws.playerId) return;
            const { lobbyId } = data as { lobbyId: string };
            const ctfLobby = storage.getCTFLobby(lobbyId);
            if (!ctfLobby || ctfLobby.hostId !== ws.playerId) return;
            if (ctfLobby.players.length < 2) {
              sendTo(ws.playerId, { type: "error", message: "Need at least 2 players to start." });
              return;
            }

            const ctfGame = storage.createCTFGame(ctfLobby);
            ctfGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "in_game", "ctf");
              sendTo(p.id, { type: "ctf_game_update", game: ctfGame });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "ctf_move": {
            if (!ws.playerId) return;
            const { gameId, x, y } = data as { gameId: string; x: number; y: number };
            const ctfGame = storage.getCTFGame(gameId);
            if (!ctfGame || ctfGame.status !== "playing") return;

            const player = ctfGame.players.find((p) => p.id === ws.playerId);
            if (!player || player.isStunned) return;

            player.x = x;
            player.y = y;

            // Check flag pickup
            if (player.team === "red" && !ctfGame.blueFlagCarrier) {
              const distToBlueFlag = Math.hypot(player.x - ctfGame.blueFlagPosition.x, player.y - ctfGame.blueFlagPosition.y);
              if (distToBlueFlag < 20) {
                ctfGame.blueFlagCarrier = player.id;
                player.hasFlag = true;
              }
            } else if (player.team === "blue" && !ctfGame.redFlagCarrier) {
              const distToRedFlag = Math.hypot(player.x - ctfGame.redFlagPosition.x, player.y - ctfGame.redFlagPosition.y);
              if (distToRedFlag < 20) {
                ctfGame.redFlagCarrier = player.id;
                player.hasFlag = true;
              }
            }

            // Check flag capture
            if (player.hasFlag) {
              const homeBase = player.team === "red" ? ctfGame.redFlagPosition : ctfGame.blueFlagPosition;
              const distToHome = Math.hypot(player.x - homeBase.x, player.y - homeBase.y);
              if (distToHome < 30) {
                if (player.team === "red") {
                  ctfGame.redScore++;
                  ctfGame.blueFlagCarrier = null;
                } else {
                  ctfGame.blueScore++;
                  ctfGame.redFlagCarrier = null;
                }
                player.hasFlag = false;
                player.captures++;

                if (ctfGame.redScore >= ctfGame.scoreLimit || ctfGame.blueScore >= ctfGame.scoreLimit) {
                  ctfGame.status = "finished";
                  ctfGame.winner = ctfGame.redScore > ctfGame.blueScore ? "red" : "blue";
                }
              }
            }

            storage.updateCTFGame(gameId, ctfGame);
            ctfGame.players.forEach((p) => {
              sendTo(p.id, { type: "ctf_game_update", game: ctfGame });
            });
            break;
          }

          case "ctf_tag": {
            if (!ws.playerId) return;
            const { gameId, targetId } = data as { gameId: string; targetId: string };
            const ctfGame = storage.getCTFGame(gameId);
            if (!ctfGame || ctfGame.status !== "playing") return;

            const tagger = ctfGame.players.find((p) => p.id === ws.playerId);
            const target = ctfGame.players.find((p) => p.id === targetId);
            if (!tagger || !target) return;
            if (tagger.team === target.team) return;
            if (tagger.isStunned) return;

            const dist = Math.hypot(tagger.x - target.x, tagger.y - target.y);
            if (dist > 25) return;

            target.isStunned = true;
            target.stunEndTime = Date.now() + 3000;
            tagger.tags++;

            // Drop flag if carrying
            if (target.hasFlag) {
              target.hasFlag = false;
              if (target.team === "red") {
                ctfGame.blueFlagCarrier = null;
              } else {
                ctfGame.redFlagCarrier = null;
              }
            }

            storage.updateCTFGame(gameId, ctfGame);
            ctfGame.players.forEach((p) => {
              sendTo(p.id, { type: "ctf_game_update", game: ctfGame });
            });

            // Clear stun after timeout
            setTimeout(() => {
              const updatedGame = storage.getCTFGame(gameId);
              if (updatedGame) {
                const stunnedPlayer = updatedGame.players.find((p) => p.id === targetId);
                if (stunnedPlayer) {
                  stunnedPlayer.isStunned = false;
                  stunnedPlayer.stunEndTime = null;
                  storage.updateCTFGame(gameId, updatedGame);
                  updatedGame.players.forEach((p) => {
                    sendTo(p.id, { type: "ctf_game_update", game: updatedGame });
                  });
                }
              }
            }, 3000);
            break;
          }

          case "ctf_leave_game": {
            if (!ws.playerId) return;
            const { gameId } = data as { gameId: string };
            const ctfGame = storage.getCTFGame(gameId);
            if (!ctfGame) return;

            storage.updatePlayerStatus(ws.playerId, "online", null);
            storage.deleteCTFGame(gameId);
            ctfGame.players.forEach((p) => {
              sendTo(p.id, { type: "ctf_left" });
            });
            break;
          }

          case "ctf_chat": {
            if (!ws.playerId || !ws.playerName) return;
            const { message } = data as { message: string };
            const ctfGame = storage.getCTFGameByPlayerId(ws.playerId);
            const ctfLobby = storage.getCTFLobbyByPlayerId(ws.playerId);

            if (ctfGame) {
              ctfGame.players.forEach((p) => {
                sendTo(p.id, { type: "ctf_chat_message", sender: ws.playerName, message });
              });
            } else if (ctfLobby) {
              ctfLobby.players.forEach((p) => {
                sendTo(p.id, { type: "ctf_chat_message", sender: ws.playerName, message });
              });
            }
            break;
          }

          // ========== SIEGE WAR HANDLERS ==========
          case "siegewar_join_lobby": {
            if (!ws.playerId || !ws.playerName) return;
            const existingSWLobby = storage.getSiegeWarLobbyByPlayerId(ws.playerId);
            if (existingSWLobby) {
              sendTo(ws.playerId, { type: "siegewar_lobby_update", lobby: existingSWLobby });
              return;
            }

            const swLobby = storage.getOrCreateSiegeWarLobby(ws.playerId, ws.playerName);
            storage.updatePlayerStatus(ws.playerId, "in_lobby", "siegewar");

            swLobby.players.forEach((p) => {
              sendTo(p.id, { type: "siegewar_lobby_update", lobby: swLobby });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "siegewar_leave_lobby": {
            if (!ws.playerId) return;
            const swLobby = storage.getSiegeWarLobbyByPlayerId(ws.playerId);
            if (swLobby) {
              storage.removePlayerFromSiegeWarLobby(swLobby.id, ws.playerId);
              storage.updatePlayerStatus(ws.playerId, "online", null);
              
              const updatedLobby = storage.getSiegeWarLobby(swLobby.id);
              if (updatedLobby && updatedLobby.players.length > 0) {
                updatedLobby.players.forEach((p) => {
                  sendTo(p.id, { type: "siegewar_lobby_update", lobby: updatedLobby });
                });
              } else if (!updatedLobby || updatedLobby.players.length === 0) {
                storage.deleteSiegeWarLobby(swLobby.id);
              }
              sendTo(ws.playerId, { type: "siegewar_left" });
            }
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "siegewar_set_team": {
            if (!ws.playerId) return;
            const { lobbyId, team } = data as { lobbyId: string; team: "attackers" | "defenders" };
            const swLobby = storage.setSiegeWarTeam(lobbyId, ws.playerId, team);
            if (swLobby) {
              swLobby.players.forEach((p) => {
                sendTo(p.id, { type: "siegewar_lobby_update", lobby: swLobby });
              });
            }
            break;
          }

          case "siegewar_set_ready": {
            if (!ws.playerId) return;
            const { lobbyId, ready } = data as { lobbyId: string; ready: boolean };
            const swLobby = storage.setSiegeWarReady(lobbyId, ws.playerId, ready);
            if (swLobby) {
              swLobby.players.forEach((p) => {
                sendTo(p.id, { type: "siegewar_lobby_update", lobby: swLobby });
              });
            }
            break;
          }

          case "siegewar_start_game": {
            if (!ws.playerId) return;
            const { lobbyId } = data as { lobbyId: string };
            const swLobby = storage.getSiegeWarLobby(lobbyId);
            if (!swLobby || swLobby.hostId !== ws.playerId) return;
            if (swLobby.players.length < 2) {
              sendTo(ws.playerId, { type: "error", message: "Need at least 2 players to start." });
              return;
            }

            const swGame = storage.createSiegeWarGame(swLobby);
            swGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "in_game", "siegewar");
              sendTo(p.id, { type: "siegewar_game_update", game: swGame });
            });
            broadcast({
              type: "lobby_counts_update",
              lobbyCounts: getLobbyCountsForBroadcast(),
            });
            break;
          }

          case "siegewar_spawn_unit": {
            if (!ws.playerId) return;
            const { gameId, unitType } = data as { gameId: string; unitType: string };
            const swGame = storage.getSiegeWarGame(gameId);
            if (!swGame || swGame.status !== "playing") return;

            const player = swGame.players.find((p) => p.id === ws.playerId);
            if (!player) return;

            const unitCosts: Record<string, number> = {
              infantry: 10,
              archer: 15,
              cavalry: 25,
              siege_tower: 50,
              catapult: 40,
            };

            const cost = unitCosts[unitType] || 10;
            if (player.gold < cost) return;

            player.gold -= cost;
            player.unitsSpawned++;

            const spawnX = player.team === "attackers" ? 50 : swGame.mapWidth - 50;
            const spawnY = 100 + Math.random() * (swGame.mapHeight - 200);

            const unit = {
              id: `unit-${Date.now()}-${Math.random()}`,
              type: unitType as any,
              team: player.team,
              ownerId: player.id,
              x: spawnX,
              y: spawnY,
              targetX: null,
              targetY: null,
              health: unitType === "siege_tower" ? 200 : unitType === "catapult" ? 150 : unitType === "cavalry" ? 120 : 100,
              maxHealth: unitType === "siege_tower" ? 200 : unitType === "catapult" ? 150 : unitType === "cavalry" ? 120 : 100,
              attackTarget: null,
            };

            swGame.units.push(unit);
            storage.updateSiegeWarGame(gameId, swGame);

            swGame.players.forEach((p) => {
              sendTo(p.id, { type: "siegewar_game_update", game: swGame });
            });
            break;
          }

          case "siegewar_move_units": {
            if (!ws.playerId) return;
            const { gameId, unitIds, targetX, targetY } = data as { gameId: string; unitIds: string[]; targetX: number; targetY: number };
            const swGame = storage.getSiegeWarGame(gameId);
            if (!swGame || swGame.status !== "playing") return;

            const player = swGame.players.find((p) => p.id === ws.playerId);
            if (!player) return;

            unitIds.forEach((unitId) => {
              const unit = swGame.units.find((u) => u.id === unitId && u.team === player.team);
              if (unit) {
                unit.targetX = targetX;
                unit.targetY = targetY;
                unit.attackTarget = null;
              }
            });

            storage.updateSiegeWarGame(gameId, swGame);
            swGame.players.forEach((p) => {
              sendTo(p.id, { type: "siegewar_game_update", game: swGame });
            });
            break;
          }

          case "siegewar_attack": {
            if (!ws.playerId) return;
            const { gameId, unitIds, targetId } = data as { gameId: string; unitIds: string[]; targetId: string };
            const swGame = storage.getSiegeWarGame(gameId);
            if (!swGame || swGame.status !== "playing") return;

            const player = swGame.players.find((p) => p.id === ws.playerId);
            if (!player) return;

            unitIds.forEach((unitId) => {
              const unit = swGame.units.find((u) => u.id === unitId && u.team === player.team);
              if (unit) {
                unit.attackTarget = targetId;
              }
            });

            storage.updateSiegeWarGame(gameId, swGame);
            swGame.players.forEach((p) => {
              sendTo(p.id, { type: "siegewar_game_update", game: swGame });
            });
            break;
          }

          case "siegewar_leave_game": {
            if (!ws.playerId) return;
            const { gameId } = data as { gameId: string };
            const swGame = storage.getSiegeWarGame(gameId);
            if (!swGame) return;

            storage.updatePlayerStatus(ws.playerId, "online", null);
            storage.deleteSiegeWarGame(gameId);
            swGame.players.forEach((p) => {
              sendTo(p.id, { type: "siegewar_left" });
            });
            break;
          }

          case "siegewar_chat": {
            if (!ws.playerId || !ws.playerName) return;
            const { message } = data as { message: string };
            const swGame = storage.getSiegeWarGameByPlayerId(ws.playerId);
            const swLobby = storage.getSiegeWarLobbyByPlayerId(ws.playerId);

            if (swGame) {
              swGame.players.forEach((p) => {
                sendTo(p.id, { type: "siegewar_chat_message", sender: ws.playerName, message });
              });
            } else if (swLobby) {
              swLobby.players.forEach((p) => {
                sendTo(p.id, { type: "siegewar_chat_message", sender: ws.playerName, message });
              });
            }
            break;
          }

          // ========== SKY FORTRESS SIEGE HANDLERS ==========
          case "lobby_join_skyfortress": {
            if (!ws.playerId || !ws.playerName) return;
            const existingSFLobby = storage.getSkyFortressLobbyByPlayerId(ws.playerId);
            if (existingSFLobby) {
              sendTo(ws.playerId, { type: "lobby_update_skyfortress", lobby: existingSFLobby });
              return;
            }
            const sfLobby = storage.getOrCreateSkyFortressLobby(ws.playerId, ws.playerName);
            storage.updatePlayerStatus(ws.playerId, "in_lobby", "skyfortress");
            sfLobby.players.forEach((p) => {
              sendTo(p.id, { type: "lobby_update_skyfortress", lobby: sfLobby });
            });
            break;
          }

          case "lobby_leave_skyfortress": {
            if (!ws.playerId) return;
            const sfLobby = storage.getSkyFortressLobbyByPlayerId(ws.playerId);
            if (sfLobby) {
              storage.removePlayerFromSkyFortressLobby(sfLobby.id, ws.playerId);
              storage.updatePlayerStatus(ws.playerId, "online", null);
              const updatedLobby = storage.getSkyFortressLobby(sfLobby.id);
              if (updatedLobby && updatedLobby.players.length > 0) {
                updatedLobby.players.forEach((p) => {
                  sendTo(p.id, { type: "lobby_update_skyfortress", lobby: updatedLobby });
                });
              }
              sendTo(ws.playerId, { type: "skyfortress_left" });
            }
            break;
          }

          case "lobby_team_skyfortress": {
            if (!ws.playerId) return;
            const { lobbyId, team } = data as { lobbyId: string; team: "red" | "blue" };
            const sfLobby = storage.setSkyFortressTeam(lobbyId, ws.playerId, team);
            if (sfLobby) {
              sfLobby.players.forEach((p) => {
                sendTo(p.id, { type: "lobby_update_skyfortress", lobby: sfLobby });
              });
            }
            break;
          }

          case "lobby_ready_skyfortress": {
            if (!ws.playerId) return;
            const { lobbyId, ready } = data as { lobbyId: string; ready: boolean };
            const sfLobby = storage.setSkyFortressReady(lobbyId, ws.playerId, ready);
            if (sfLobby) {
              sfLobby.players.forEach((p) => {
                sendTo(p.id, { type: "lobby_update_skyfortress", lobby: sfLobby });
              });
            }
            break;
          }

          case "lobby_start_skyfortress": {
            if (!ws.playerId) return;
            const { lobbyId } = data as { lobbyId: string };
            const sfLobby = storage.getSkyFortressLobby(lobbyId);
            if (!sfLobby || sfLobby.hostId !== ws.playerId) return;
            if (sfLobby.players.length < 2) return;
            const sfGame = storage.createSkyFortressGame(sfLobby);
            sfGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "in_game", "skyfortress");
              sendTo(p.id, { type: "game_update_skyfortress", game: sfGame });
            });
            break;
          }

          case "game_move_skyfortress": {
            if (!ws.playerId) return;
            const { gameId, y } = data as { gameId: string; y: number };
            const sfGame = storage.getSkyFortressGame(gameId);
            if (!sfGame || sfGame.status !== "playing") return;
            const player = sfGame.players.find((p) => p.id === ws.playerId);
            if (player) {
              player.fortressY = Math.max(50, Math.min(sfGame.mapHeight - 50, y));
              storage.updateSkyFortressGame(gameId, sfGame);
              sfGame.players.forEach((p) => {
                sendTo(p.id, { type: "game_update_skyfortress", game: sfGame });
              });
            }
            break;
          }

          case "game_fire_skyfortress": {
            if (!ws.playerId) return;
            const { gameId, targetX, targetY, weaponType } = data as { gameId: string; targetX: number; targetY: number; weaponType: "missile" | "drone" };
            const sfGame = storage.getSkyFortressGame(gameId);
            if (!sfGame || sfGame.status !== "playing") return;
            const player = sfGame.players.find((p) => p.id === ws.playerId);
            if (!player) return;
            if (weaponType === "missile" && player.missiles > 0) {
              player.missiles--;
              const dx = targetX - player.fortressX;
              const dy = targetY - player.fortressY;
              const dist = Math.hypot(dx, dy);
              sfGame.projectiles.push({
                id: `proj-${Date.now()}-${Math.random()}`,
                ownerId: player.id,
                x: player.fortressX,
                y: player.fortressY,
                vx: (dx / dist) * 8,
                vy: (dy / dist) * 8,
                type: "missile",
              });
            } else if (weaponType === "drone" && player.drones > 0) {
              player.drones--;
              const dx = targetX - player.fortressX;
              const dy = targetY - player.fortressY;
              const dist = Math.hypot(dx, dy);
              sfGame.projectiles.push({
                id: `proj-${Date.now()}-${Math.random()}`,
                ownerId: player.id,
                x: player.fortressX,
                y: player.fortressY,
                vx: (dx / dist) * 5,
                vy: (dy / dist) * 5,
                type: "drone",
              });
            }
            storage.updateSkyFortressGame(gameId, sfGame);
            sfGame.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_skyfortress", game: sfGame });
            });
            break;
          }

          case "game_chat_skyfortress": {
            if (!ws.playerId || !ws.playerName) return;
            const { message } = data as { message: string };
            const sfGame = storage.getSkyFortressGameByPlayerId(ws.playerId);
            const sfLobby = storage.getSkyFortressLobbyByPlayerId(ws.playerId);
            if (sfGame) {
              sfGame.players.forEach((p) => {
                sendTo(p.id, { type: "skyfortress_chat_message", sender: ws.playerName, message });
              });
            } else if (sfLobby) {
              sfLobby.players.forEach((p) => {
                sendTo(p.id, { type: "skyfortress_chat_message", sender: ws.playerName, message });
              });
            }
            break;
          }

          // ========== TIME RIFT TACTICS HANDLERS ==========
          case "lobby_join_timerift": {
            if (!ws.playerId || !ws.playerName) return;
            const existingTRLobby = storage.getTimeRiftLobbyByPlayerId(ws.playerId);
            if (existingTRLobby) {
              sendTo(ws.playerId, { type: "lobby_update_timerift", lobby: existingTRLobby });
              return;
            }
            const trLobby = storage.getOrCreateTimeRiftLobby(ws.playerId, ws.playerName);
            storage.updatePlayerStatus(ws.playerId, "in_lobby", "timerift");
            trLobby.players.forEach((p) => {
              sendTo(p.id, { type: "lobby_update_timerift", lobby: trLobby });
            });
            break;
          }

          case "lobby_leave_timerift": {
            if (!ws.playerId) return;
            const trLobby = storage.getTimeRiftLobbyByPlayerId(ws.playerId);
            if (trLobby) {
              storage.removePlayerFromTimeRiftLobby(trLobby.id, ws.playerId);
              storage.updatePlayerStatus(ws.playerId, "online", null);
              const updatedLobby = storage.getTimeRiftLobby(trLobby.id);
              if (updatedLobby && updatedLobby.players.length > 0) {
                updatedLobby.players.forEach((p) => {
                  sendTo(p.id, { type: "lobby_update_timerift", lobby: updatedLobby });
                });
              }
              sendTo(ws.playerId, { type: "timerift_left" });
            }
            break;
          }

          case "lobby_team_timerift": {
            if (!ws.playerId) return;
            const { lobbyId, team } = data as { lobbyId: string; team: "chrono" | "temporal" };
            const trLobby = storage.setTimeRiftTeam(lobbyId, ws.playerId, team);
            if (trLobby) {
              trLobby.players.forEach((p) => {
                sendTo(p.id, { type: "lobby_update_timerift", lobby: trLobby });
              });
            }
            break;
          }

          case "lobby_ready_timerift": {
            if (!ws.playerId) return;
            const { lobbyId, ready } = data as { lobbyId: string; ready: boolean };
            const trLobby = storage.setTimeRiftReady(lobbyId, ws.playerId, ready);
            if (trLobby) {
              trLobby.players.forEach((p) => {
                sendTo(p.id, { type: "lobby_update_timerift", lobby: trLobby });
              });
            }
            break;
          }

          case "lobby_start_timerift": {
            if (!ws.playerId) return;
            const { lobbyId } = data as { lobbyId: string };
            const trLobby = storage.getTimeRiftLobby(lobbyId);
            if (!trLobby || trLobby.hostId !== ws.playerId) return;
            if (trLobby.players.length < 2) return;
            const trGame = storage.createTimeRiftGame(trLobby);
            trGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "in_game", "timerift");
              sendTo(p.id, { type: "game_update_timerift", game: trGame });
            });
            break;
          }

          case "game_move_timerift": {
            if (!ws.playerId) return;
            const { gameId, x, y } = data as { gameId: string; x: number; y: number };
            const trGame = storage.getTimeRiftGame(gameId);
            if (!trGame || trGame.status !== "playing") return;
            const player = trGame.players.find((p) => p.id === ws.playerId);
            if (player) {
              player.x = Math.max(0, Math.min(trGame.mapWidth, x));
              player.y = Math.max(0, Math.min(trGame.mapHeight, y));
              storage.updateTimeRiftGame(gameId, trGame);
              trGame.players.forEach((p) => {
                sendTo(p.id, { type: "game_update_timerift", game: trGame });
              });
            }
            break;
          }

          case "game_shoot_timerift": {
            if (!ws.playerId) return;
            const { gameId, targetX, targetY } = data as { gameId: string; targetX: number; targetY: number };
            const trGame = storage.getTimeRiftGame(gameId);
            if (!trGame || trGame.status !== "playing") return;
            const player = trGame.players.find((p) => p.id === ws.playerId);
            if (!player || player.timeEnergy < 10) return;
            player.timeEnergy -= 10;
            const dx = targetX - player.x;
            const dy = targetY - player.y;
            const dist = Math.hypot(dx, dy);
            trGame.projectiles.push({
              id: `proj-${Date.now()}-${Math.random()}`,
              ownerId: player.id,
              x: player.x,
              y: player.y,
              vx: (dx / dist) * 10,
              vy: (dy / dist) * 10,
            });
            storage.updateTimeRiftGame(gameId, trGame);
            trGame.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_timerift", game: trGame });
            });
            break;
          }

          case "game_chat_timerift": {
            if (!ws.playerId || !ws.playerName) return;
            const { message } = data as { message: string };
            const trGame = storage.getTimeRiftGameByPlayerId(ws.playerId);
            const trLobby = storage.getTimeRiftLobbyByPlayerId(ws.playerId);
            if (trGame) {
              trGame.players.forEach((p) => {
                sendTo(p.id, { type: "timerift_chat_message", sender: ws.playerName, message });
              });
            } else if (trLobby) {
              trLobby.players.forEach((p) => {
                sendTo(p.id, { type: "timerift_chat_message", sender: ws.playerName, message });
              });
            }
            break;
          }

          // ========== SHADOW OPS HANDLERS ==========
          case "lobby_join_shadowops": {
            if (!ws.playerId || !ws.playerName) return;
            const existingSOLobby = storage.getShadowOpsLobbyByPlayerId(ws.playerId);
            if (existingSOLobby) {
              sendTo(ws.playerId, { type: "lobby_update_shadowops", lobby: existingSOLobby });
              return;
            }
            const soLobby = storage.getOrCreateShadowOpsLobby(ws.playerId, ws.playerName);
            storage.updatePlayerStatus(ws.playerId, "in_lobby", "shadowops");
            soLobby.players.forEach((p) => {
              sendTo(p.id, { type: "lobby_update_shadowops", lobby: soLobby });
            });
            break;
          }

          case "lobby_leave_shadowops": {
            if (!ws.playerId) return;
            const soLobby = storage.getShadowOpsLobbyByPlayerId(ws.playerId);
            if (soLobby) {
              storage.removePlayerFromShadowOpsLobby(soLobby.id, ws.playerId);
              storage.updatePlayerStatus(ws.playerId, "online", null);
              const updatedLobby = storage.getShadowOpsLobby(soLobby.id);
              if (updatedLobby && updatedLobby.players.length > 0) {
                updatedLobby.players.forEach((p) => {
                  sendTo(p.id, { type: "lobby_update_shadowops", lobby: updatedLobby });
                });
              }
              sendTo(ws.playerId, { type: "shadowops_left" });
            }
            break;
          }

          case "lobby_team_shadowops": {
            if (!ws.playerId) return;
            const { lobbyId, team } = data as { lobbyId: string; team: "infiltrators" | "defenders" };
            const soLobby = storage.setShadowOpsTeam(lobbyId, ws.playerId, team);
            if (soLobby) {
              soLobby.players.forEach((p) => {
                sendTo(p.id, { type: "lobby_update_shadowops", lobby: soLobby });
              });
            }
            break;
          }

          case "lobby_ready_shadowops": {
            if (!ws.playerId) return;
            const { lobbyId, ready } = data as { lobbyId: string; ready: boolean };
            const soLobby = storage.setShadowOpsReady(lobbyId, ws.playerId, ready);
            if (soLobby) {
              soLobby.players.forEach((p) => {
                sendTo(p.id, { type: "lobby_update_shadowops", lobby: soLobby });
              });
            }
            break;
          }

          case "lobby_start_shadowops": {
            if (!ws.playerId) return;
            const { lobbyId } = data as { lobbyId: string };
            const soLobby = storage.getShadowOpsLobby(lobbyId);
            if (!soLobby || soLobby.hostId !== ws.playerId) return;
            if (soLobby.players.length < 2) return;
            const soGame = storage.createShadowOpsGame(soLobby);
            soGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "in_game", "shadowops");
              sendTo(p.id, { type: "game_update_shadowops", game: soGame });
            });
            break;
          }

          case "game_move_shadowops": {
            if (!ws.playerId) return;
            const { gameId, x, y } = data as { gameId: string; x: number; y: number };
            const soGame = storage.getShadowOpsGame(gameId);
            if (!soGame || soGame.status !== "playing") return;
            const player = soGame.players.find((p) => p.id === ws.playerId);
            if (player) {
              player.x = Math.max(0, Math.min(soGame.mapWidth, x));
              player.y = Math.max(0, Math.min(soGame.mapHeight, y));
              storage.updateShadowOpsGame(gameId, soGame);
              soGame.players.forEach((p) => {
                sendTo(p.id, { type: "game_update_shadowops", game: soGame });
              });
            }
            break;
          }

          case "game_stealth_shadowops": {
            if (!ws.playerId) return;
            const { gameId, stealth } = data as { gameId: string; stealth: boolean };
            const soGame = storage.getShadowOpsGame(gameId);
            if (!soGame || soGame.status !== "playing") return;
            const player = soGame.players.find((p) => p.id === ws.playerId);
            if (player) {
              player.isStealthed = stealth;
              storage.updateShadowOpsGame(gameId, soGame);
              soGame.players.forEach((p) => {
                sendTo(p.id, { type: "game_update_shadowops", game: soGame });
              });
            }
            break;
          }

          case "game_chat_shadowops": {
            if (!ws.playerId || !ws.playerName) return;
            const { message } = data as { message: string };
            const soGame = storage.getShadowOpsGameByPlayerId(ws.playerId);
            const soLobby = storage.getShadowOpsLobbyByPlayerId(ws.playerId);
            if (soGame) {
              soGame.players.forEach((p) => {
                sendTo(p.id, { type: "shadowops_chat_message", sender: ws.playerName, message });
              });
            } else if (soLobby) {
              soLobby.players.forEach((p) => {
                sendTo(p.id, { type: "shadowops_chat_message", sender: ws.playerName, message });
              });
            }
            break;
          }

          // ========== ELEMENTAL CONQUEST HANDLERS ==========
          case "lobby_join_elemental": {
            if (!ws.playerId || !ws.playerName) return;
            const existingELobby = storage.getElementalLobbyByPlayerId(ws.playerId);
            if (existingELobby) {
              sendTo(ws.playerId, { type: "lobby_update_elemental", lobby: existingELobby });
              return;
            }
            const eLobby = storage.getOrCreateElementalLobby(ws.playerId, ws.playerName);
            storage.updatePlayerStatus(ws.playerId, "in_lobby", "elemental");
            eLobby.players.forEach((p) => {
              sendTo(p.id, { type: "lobby_update_elemental", lobby: eLobby });
            });
            break;
          }

          case "lobby_leave_elemental": {
            if (!ws.playerId) return;
            const eLobby = storage.getElementalLobbyByPlayerId(ws.playerId);
            if (eLobby) {
              storage.removePlayerFromElementalLobby(eLobby.id, ws.playerId);
              storage.updatePlayerStatus(ws.playerId, "online", null);
              const updatedLobby = storage.getElementalLobby(eLobby.id);
              if (updatedLobby && updatedLobby.players.length > 0) {
                updatedLobby.players.forEach((p) => {
                  sendTo(p.id, { type: "lobby_update_elemental", lobby: updatedLobby });
                });
              }
              sendTo(ws.playerId, { type: "elemental_left" });
            }
            break;
          }

          case "lobby_team_elemental": {
            if (!ws.playerId) return;
            const { lobbyId, team } = data as { lobbyId: string; team: "fire" | "water" };
            const eLobby = storage.setElementalTeam(lobbyId, ws.playerId, team);
            if (eLobby) {
              eLobby.players.forEach((p) => {
                sendTo(p.id, { type: "lobby_update_elemental", lobby: eLobby });
              });
            }
            break;
          }

          case "lobby_ready_elemental": {
            if (!ws.playerId) return;
            const { lobbyId, ready } = data as { lobbyId: string; ready: boolean };
            const eLobby = storage.setElementalReady(lobbyId, ws.playerId, ready);
            if (eLobby) {
              eLobby.players.forEach((p) => {
                sendTo(p.id, { type: "lobby_update_elemental", lobby: eLobby });
              });
            }
            break;
          }

          case "lobby_start_elemental": {
            if (!ws.playerId) return;
            const { lobbyId } = data as { lobbyId: string };
            const eLobby = storage.getElementalLobby(lobbyId);
            if (!eLobby || eLobby.hostId !== ws.playerId) return;
            if (eLobby.players.length < 2) return;
            const eGame = storage.createElementalGame(eLobby);
            eGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "in_game", "elemental");
              sendTo(p.id, { type: "game_update_elemental", game: eGame });
            });
            break;
          }

          case "game_move_elemental": {
            if (!ws.playerId) return;
            const { gameId, x, y } = data as { gameId: string; x: number; y: number };
            const eGame = storage.getElementalGame(gameId);
            if (!eGame || eGame.status !== "playing") return;
            const player = eGame.players.find((p) => p.id === ws.playerId);
            if (player) {
              player.x = Math.max(0, Math.min(eGame.mapWidth, x));
              player.y = Math.max(0, Math.min(eGame.mapHeight, y));
              storage.updateElementalGame(gameId, eGame);
              eGame.players.forEach((p) => {
                sendTo(p.id, { type: "game_update_elemental", game: eGame });
              });
            }
            break;
          }

          case "game_cast_elemental": {
            if (!ws.playerId) return;
            const { gameId, targetX, targetY, element, isArea } = data as { gameId: string; targetX: number; targetY: number; element: "fire" | "water" | "earth" | "air"; isArea: boolean };
            const eGame = storage.getElementalGame(gameId);
            if (!eGame || eGame.status !== "playing") return;
            const player = eGame.players.find((p) => p.id === ws.playerId);
            if (!player || player.mana < 15) return;
            player.mana -= 15;
            if (isArea) {
              eGame.areaEffects.push({
                id: `area-${Date.now()}-${Math.random()}`,
                x: targetX,
                y: targetY,
                radius: 50,
                element,
                duration: 5,
              });
            } else {
              const dx = targetX - player.x;
              const dy = targetY - player.y;
              const dist = Math.hypot(dx, dy);
              eGame.projectiles.push({
                id: `proj-${Date.now()}-${Math.random()}`,
                ownerId: player.id,
                x: player.x,
                y: player.y,
                vx: (dx / dist) * 8,
                vy: (dy / dist) * 8,
                element,
              });
            }
            storage.updateElementalGame(gameId, eGame);
            eGame.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_elemental", game: eGame });
            });
            break;
          }

          case "game_chat_elemental": {
            if (!ws.playerId || !ws.playerName) return;
            const { message } = data as { message: string };
            const eGame = storage.getElementalGameByPlayerId(ws.playerId);
            const eLobby = storage.getElementalLobbyByPlayerId(ws.playerId);
            if (eGame) {
              eGame.players.forEach((p) => {
                sendTo(p.id, { type: "elemental_chat_message", sender: ws.playerName, message });
              });
            } else if (eLobby) {
              eLobby.players.forEach((p) => {
                sendTo(p.id, { type: "elemental_chat_message", sender: ws.playerName, message });
              });
            }
            break;
          }

          // ========== MECH ARENA HANDLERS ==========
          case "lobby_join_mech": {
            if (!ws.playerId || !ws.playerName) return;
            const existingMLobby = storage.getMechLobbyByPlayerId(ws.playerId);
            if (existingMLobby) {
              sendTo(ws.playerId, { type: "lobby_update_mech", lobby: existingMLobby });
              return;
            }
            const mLobby = storage.getOrCreateMechLobby(ws.playerId, ws.playerName);
            storage.updatePlayerStatus(ws.playerId, "in_lobby", "mech");
            mLobby.players.forEach((p) => {
              sendTo(p.id, { type: "lobby_update_mech", lobby: mLobby });
            });
            break;
          }

          case "lobby_leave_mech": {
            if (!ws.playerId) return;
            const mLobby = storage.getMechLobbyByPlayerId(ws.playerId);
            if (mLobby) {
              storage.removePlayerFromMechLobby(mLobby.id, ws.playerId);
              storage.updatePlayerStatus(ws.playerId, "online", null);
              const updatedLobby = storage.getMechLobby(mLobby.id);
              if (updatedLobby && updatedLobby.players.length > 0) {
                updatedLobby.players.forEach((p) => {
                  sendTo(p.id, { type: "lobby_update_mech", lobby: updatedLobby });
                });
              }
              sendTo(ws.playerId, { type: "mech_left" });
            }
            break;
          }

          case "lobby_team_mech": {
            if (!ws.playerId) return;
            const { lobbyId, team } = data as { lobbyId: string; team: "alpha" | "omega" };
            const mLobby = storage.setMechTeam(lobbyId, ws.playerId, team);
            if (mLobby) {
              mLobby.players.forEach((p) => {
                sendTo(p.id, { type: "lobby_update_mech", lobby: mLobby });
              });
            }
            break;
          }

          case "lobby_ready_mech": {
            if (!ws.playerId) return;
            const { lobbyId, ready } = data as { lobbyId: string; ready: boolean };
            const mLobby = storage.setMechReady(lobbyId, ws.playerId, ready);
            if (mLobby) {
              mLobby.players.forEach((p) => {
                sendTo(p.id, { type: "lobby_update_mech", lobby: mLobby });
              });
            }
            break;
          }

          case "lobby_start_mech": {
            if (!ws.playerId) return;
            const { lobbyId } = data as { lobbyId: string };
            const mLobby = storage.getMechLobby(lobbyId);
            if (!mLobby || mLobby.hostId !== ws.playerId) return;
            if (mLobby.players.length < 2) return;
            const mGame = storage.createMechGame(mLobby);
            mGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "in_game", "mech");
              sendTo(p.id, { type: "game_update_mech", game: mGame });
            });
            break;
          }

          case "game_move_mech": {
            if (!ws.playerId) return;
            const { gameId, x, y } = data as { gameId: string; x: number; y: number };
            const mGame = storage.getMechGame(gameId);
            if (!mGame || mGame.status !== "playing") return;
            const player = mGame.players.find((p) => p.id === ws.playerId);
            if (player) {
              player.x = Math.max(0, Math.min(mGame.mapWidth, x));
              player.y = Math.max(0, Math.min(mGame.mapHeight, y));
              storage.updateMechGame(gameId, mGame);
              mGame.players.forEach((p) => {
                sendTo(p.id, { type: "game_update_mech", game: mGame });
              });
            }
            break;
          }

          case "game_shoot_mech": {
            if (!ws.playerId) return;
            const { gameId, targetX, targetY } = data as { gameId: string; targetX: number; targetY: number };
            const mGame = storage.getMechGame(gameId);
            if (!mGame || mGame.status !== "playing") return;
            const player = mGame.players.find((p) => p.id === ws.playerId);
            if (!player || player.energy < 10) return;
            player.energy -= 10;
            const dx = targetX - player.x;
            const dy = targetY - player.y;
            const dist = Math.hypot(dx, dy);
            mGame.projectiles.push({
              id: `proj-${Date.now()}-${Math.random()}`,
              ownerId: player.id,
              x: player.x,
              y: player.y,
              vx: (dx / dist) * 12,
              vy: (dy / dist) * 12,
              damage: 20 + (player.weaponLevel * 5),
            });
            storage.updateMechGame(gameId, mGame);
            mGame.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_mech", game: mGame });
            });
            break;
          }

          case "game_upgrade_mech": {
            if (!ws.playerId) return;
            const { gameId } = data as { gameId: string };
            const mGame = storage.getMechGame(gameId);
            if (!mGame || mGame.status !== "playing") return;
            const player = mGame.players.find((p) => p.id === ws.playerId);
            if (!player || player.resources < 50) return;
            player.resources -= 50;
            player.weaponLevel++;
            storage.updateMechGame(gameId, mGame);
            mGame.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_mech", game: mGame });
            });
            break;
          }

          case "game_chat_mech": {
            if (!ws.playerId || !ws.playerName) return;
            const { message } = data as { message: string };
            const mGame = storage.getMechGameByPlayerId(ws.playerId);
            const mLobby = storage.getMechLobbyByPlayerId(ws.playerId);
            if (mGame) {
              mGame.players.forEach((p) => {
                sendTo(p.id, { type: "mech_chat_message", sender: ws.playerName, message });
              });
            } else if (mLobby) {
              mLobby.players.forEach((p) => {
                sendTo(p.id, { type: "mech_chat_message", sender: ws.playerName, message });
              });
            }
            break;
          }

          // ========== ASSASSIN'S GRID HANDLERS ==========
          case "lobby_join_assassin": {
            if (!ws.playerId || !ws.playerName) return;
            const existingALobby = storage.getAssassinLobbyByPlayerId(ws.playerId);
            if (existingALobby) {
              sendTo(ws.playerId, { type: "lobby_update_assassin", lobby: existingALobby });
              return;
            }
            const aLobby = storage.getOrCreateAssassinLobby(ws.playerId, ws.playerName);
            storage.updatePlayerStatus(ws.playerId, "in_lobby", "assassin");
            aLobby.players.forEach((p) => {
              sendTo(p.id, { type: "lobby_update_assassin", lobby: aLobby });
            });
            break;
          }

          case "lobby_leave_assassin": {
            if (!ws.playerId) return;
            const aLobby = storage.getAssassinLobbyByPlayerId(ws.playerId);
            if (aLobby) {
              storage.removePlayerFromAssassinLobby(aLobby.id, ws.playerId);
              storage.updatePlayerStatus(ws.playerId, "online", null);
              const updatedLobby = storage.getAssassinLobby(aLobby.id);
              if (updatedLobby && updatedLobby.players.length > 0) {
                updatedLobby.players.forEach((p) => {
                  sendTo(p.id, { type: "lobby_update_assassin", lobby: updatedLobby });
                });
              }
              sendTo(ws.playerId, { type: "assassin_left" });
            }
            break;
          }

          case "lobby_team_assassin": {
            if (!ws.playerId) return;
            const { lobbyId, team } = data as { lobbyId: string; team: "shadow" | "blade" };
            const aLobby = storage.setAssassinTeam(lobbyId, ws.playerId, team);
            if (aLobby) {
              aLobby.players.forEach((p) => {
                sendTo(p.id, { type: "lobby_update_assassin", lobby: aLobby });
              });
            }
            break;
          }

          case "lobby_ready_assassin": {
            if (!ws.playerId) return;
            const { lobbyId, ready } = data as { lobbyId: string; ready: boolean };
            const aLobby = storage.setAssassinReady(lobbyId, ws.playerId, ready);
            if (aLobby) {
              aLobby.players.forEach((p) => {
                sendTo(p.id, { type: "lobby_update_assassin", lobby: aLobby });
              });
            }
            break;
          }

          case "lobby_start_assassin": {
            if (!ws.playerId) return;
            const { lobbyId } = data as { lobbyId: string };
            const aLobby = storage.getAssassinLobby(lobbyId);
            if (!aLobby || aLobby.hostId !== ws.playerId) return;
            if (aLobby.players.length < 2) return;
            const aGame = storage.createAssassinGame(aLobby);
            aGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "in_game", "assassin");
              sendTo(p.id, { type: "game_update_assassin", game: aGame });
            });
            break;
          }

          case "game_move_assassin": {
            if (!ws.playerId) return;
            const { gameId, gridX, gridY } = data as { gameId: string; gridX: number; gridY: number };
            const aGame = storage.getAssassinGame(gameId);
            if (!aGame || aGame.status !== "playing") return;
            if (aGame.currentTurn !== ws.playerId) return;
            const player = aGame.players.find((p) => p.id === ws.playerId);
            if (!player || player.energy < 1) return;
            const dx = Math.abs(gridX - player.gridX);
            const dy = Math.abs(gridY - player.gridY);
            if (dx + dy > 2) return;
            if (gridX < 0 || gridX >= aGame.gridWidth || gridY < 0 || gridY >= aGame.gridHeight) return;
            if (aGame.grid[gridY][gridX].type === "wall") return;
            player.gridX = gridX;
            player.gridY = gridY;
            player.energy--;
            player.isHidden = aGame.grid[gridY][gridX].type === "shadow";
            const currentIndex = aGame.players.findIndex((p) => p.id === ws.playerId);
            const nextIndex = (currentIndex + 1) % aGame.players.length;
            aGame.currentTurn = aGame.players[nextIndex].id;
            aGame.turnTimeRemaining = 30;
            storage.updateAssassinGame(gameId, aGame);
            aGame.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_assassin", game: aGame });
            });
            break;
          }

          case "game_attack_assassin": {
            if (!ws.playerId) return;
            const { gameId, targetId } = data as { gameId: string; targetId: string };
            const aGame = storage.getAssassinGame(gameId);
            if (!aGame || aGame.status !== "playing") return;
            if (aGame.currentTurn !== ws.playerId) return;
            const player = aGame.players.find((p) => p.id === ws.playerId);
            const target = aGame.players.find((p) => p.id === targetId);
            if (!player || !target || player.team === target.team) return;
            const dx = Math.abs(target.gridX - player.gridX);
            const dy = Math.abs(target.gridY - player.gridY);
            if (dx + dy > 1) return;
            target.health -= 50;
            if (target.health <= 0) {
              player.kills++;
              target.deaths++;
              if (player.team === "shadow") {
                aGame.shadowScore++;
              } else {
                aGame.bladeScore++;
              }
              target.gridX = target.team === "shadow" ? 1 : aGame.gridWidth - 2;
              target.gridY = 2;
              target.health = 100;
            }
            if (aGame.shadowScore >= aGame.scoreLimit || aGame.bladeScore >= aGame.scoreLimit) {
              aGame.status = "finished";
              aGame.winner = aGame.shadowScore >= aGame.scoreLimit ? "shadow" : "blade";
            }
            storage.updateAssassinGame(gameId, aGame);
            aGame.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_assassin", game: aGame });
            });
            break;
          }

          case "game_hide_assassin": {
            if (!ws.playerId) return;
            const { gameId } = data as { gameId: string };
            const aGame = storage.getAssassinGame(gameId);
            if (!aGame || aGame.status !== "playing") return;
            const player = aGame.players.find((p) => p.id === ws.playerId);
            if (!player || player.energy < 2) return;
            player.energy -= 2;
            player.isHidden = true;
            storage.updateAssassinGame(gameId, aGame);
            aGame.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_assassin", game: aGame });
            });
            break;
          }

          case "game_chat_assassin": {
            if (!ws.playerId || !ws.playerName) return;
            const { message } = data as { message: string };
            const aGame = storage.getAssassinGameByPlayerId(ws.playerId);
            const aLobby = storage.getAssassinLobbyByPlayerId(ws.playerId);
            if (aGame) {
              aGame.players.forEach((p) => {
                sendTo(p.id, { type: "assassin_chat_message", sender: ws.playerName, message });
              });
            } else if (aLobby) {
              aLobby.players.forEach((p) => {
                sendTo(p.id, { type: "assassin_chat_message", sender: ws.playerName, message });
              });
            }
            break;
          }

          // Castles: Siege Dominion handlers
          case "lobby_join_castles": {
            if (!ws.playerId || !ws.playerName) return;
            const requestedVipOnly = Boolean(data.vipOnly);
            if (requestedVipOnly && !isVipOrAdmin(ws.playerName)) {
              sendTo(ws.playerId, {
                type: "error",
                message: "VIP lobby is only for VIP or admin users.",
              });
              return;
            }
            let castlesLobby = storage.getCastlesLobby(requestedVipOnly);
            if (!castlesLobby) {
              castlesLobby = storage.createCastlesLobby(
                ws.playerId,
                ws.playerName,
                requestedVipOnly,
              );
            } else {
              castlesLobby = storage.joinCastlesLobby(
                castlesLobby.id,
                ws.playerId,
                ws.playerName,
              );
            }
            if (castlesLobby) {
              castlesLobby.players.forEach((p) => {
                sendTo(p.id, {
                  type: "lobby_update_castles",
                  lobby: castlesLobby,
                });
              });
            }
            break;
          }

          case "lobby_team_castles": {
            if (!ws.playerId) return;
            const { lobbyId, team } = data as {
              lobbyId: string;
              team: "red" | "blue";
            };
            const castlesLobby = storage.setCastlesTeam(
              lobbyId,
              ws.playerId,
              team,
            );
            if (castlesLobby) {
              castlesLobby.players.forEach((p) => {
                sendTo(p.id, {
                  type: "lobby_update_castles",
                  lobby: castlesLobby,
                });
              });
            }
            break;
          }

          case "lobby_ready_castles": {
            if (!ws.playerId) return;
            const { lobbyId, ready } = data as {
              lobbyId: string;
              ready: boolean;
            };
            const castlesLobby = storage.setCastlesReady(
              lobbyId,
              ws.playerId,
              ready,
            );
            if (castlesLobby) {
              castlesLobby.players.forEach((p) => {
                sendTo(p.id, {
                  type: "lobby_update_castles",
                  lobby: castlesLobby,
                });
              });
            }
            break;
          }

          case "lobby_start_castles": {
            if (!ws.playerId) return;
            const { lobbyId } = data as { lobbyId: string };
            const castlesLobby = storage.getCastlesLobbyById(lobbyId);
            if (!castlesLobby || castlesLobby.hostId !== ws.playerId) return;

            const castlesGame = storage.startCastlesGame(lobbyId);
            if (castlesGame) {
              castlesGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "game_update_castles",
                  game: castlesGame,
                });
              });
              // Start game tick loop
              startCastlesGameLoop(castlesGame.id, sendTo);
            }
            break;
          }

          case "lobby_leave_castles": {
            if (!ws.playerId) return;
            const { lobbyId } = data as { lobbyId: string };
            const castlesLobby = storage.leaveCastlesLobby(
              lobbyId,
              ws.playerId,
            );
            sendTo(ws.playerId, { type: "castles_left" });
            if (castlesLobby) {
              castlesLobby.players.forEach((p) => {
                sendTo(p.id, {
                  type: "lobby_update_castles",
                  lobby: castlesLobby,
                });
              });
            }
            break;
          }

          case "game_command_castles": {
            if (!ws.playerId) return;
            const {
              gameId,
              command,
              unitIds,
              targetX,
              targetY,
              buildingType,
              unitType,
              buildingId,
              resourceType,
            } = data as any;
            const castlesGame = storage.getCastlesGame(gameId);
            if (!castlesGame || castlesGame.status !== "playing") return;

            const player = castlesGame.players.find(
              (p) => p.id === ws.playerId,
            );
            if (!player) return;

            processCastlesCommand(
              castlesGame,
              ws.playerId,
              command,
              unitIds,
              targetX,
              targetY,
              buildingType,
              unitType,
              buildingId,
              resourceType,
            );
            storage.updateCastlesGame(castlesGame);

            castlesGame.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_castles", game: castlesGame });
            });
            break;
          }

          case "game_chat_castles": {
            if (!ws.playerId || !ws.playerName) return;
            const { gameId, message } = data as {
              gameId: string;
              message: string;
            };
            const castlesGame = storage.getCastlesGame(gameId);
            if (castlesGame) {
              castlesGame.players.forEach((p) => {
                sendTo(p.id, {
                  type: "castles_chat_message",
                  sender: ws.playerName,
                  message,
                });
              });
            }
            break;
          }

          // Ships Battle handlers
          case "lobby_join_shipsbattle": {
            if (!ws.playerId || !ws.playerName) return;
            // Check if there's already a waiting player
            const waitingLobby = storage.getWaitingShipsBattleLobby();
            if (waitingLobby && waitingLobby.playerId !== ws.playerId) {
              // Match found! Create game
              const sbGame = storage.createShipsBattleGame(
                waitingLobby.playerId,
                waitingLobby.playerName,
                ws.playerId,
                ws.playerName,
              );
              storage.removeShipsBattleLobby(waitingLobby.id);
              sendTo(waitingLobby.playerId, {
                type: "game_update_shipsbattle",
                game: sbGame,
              });
              sendTo(ws.playerId, {
                type: "game_update_shipsbattle",
                game: sbGame,
              });
            } else {
              // No match, add to waiting list
              const lobbyId = storage.addShipsBattleLobby(ws.playerId, ws.playerName);
              sendTo(ws.playerId, {
                type: "lobby_update_shipsbattle",
                lobby: { id: lobbyId },
              });
            }
            break;
          }

          case "lobby_leave_shipsbattle": {
            if (!ws.playerId) return;
            storage.removePlayerFromShipsBattleLobby(ws.playerId);
            sendTo(ws.playerId, { type: "shipsbattle_left" });
            break;
          }

          case "game_start_shipsbattle": {
            if (!ws.playerId || !ws.playerName) return;
            const { opponentId, opponentName } = data as {
              opponentId: string;
              opponentName: string;
            };
            const sbGame = storage.createShipsBattleGame(
              ws.playerId,
              ws.playerName,
              opponentId,
              opponentName,
            );
            sendTo(ws.playerId, {
              type: "game_update_shipsbattle",
              game: sbGame,
            });
            sendTo(opponentId, {
              type: "game_update_shipsbattle",
              game: sbGame,
            });
            break;
          }

          case "game_place_ship_shipsbattle": {
            if (!ws.playerId) return;
            const { gameId, shipSize, positions } = data as {
              gameId: string;
              shipSize: number;
              positions: Array<{ x: number; y: number }>;
            };
            const sbGame = storage.placeShipsBattleShip(
              gameId,
              ws.playerId,
              shipSize,
              positions,
            );
            if (sbGame) {
              sendTo(ws.playerId, {
                type: "game_update_shipsbattle",
                game: sbGame,
              });
            }
            break;
          }

          case "game_ready_shipsbattle": {
            if (!ws.playerId) return;
            const { gameId } = data as { gameId: string };
            const sbGame = storage.setShipsBattleReady(gameId, ws.playerId);
            if (sbGame) {
              sendTo(sbGame.player1.id, {
                type: "game_update_shipsbattle",
                game: sbGame,
              });
              sendTo(sbGame.player2.id, {
                type: "game_update_shipsbattle",
                game: sbGame,
              });
            }
            break;
          }

          case "game_shoot_shipsbattle": {
            if (!ws.playerId) return;
            const { gameId, x, y } = data as {
              gameId: string;
              x: number;
              y: number;
            };
            const result = storage.shootShipsBattle(gameId, ws.playerId, x, y);
            if (result) {
              sendTo(result.game.player1.id, {
                type: "game_update_shipsbattle",
                game: result.game,
              });
              sendTo(result.game.player2.id, {
                type: "game_update_shipsbattle",
                game: result.game,
              });
            }
            break;
          }

          case "game_leave_shipsbattle": {
            if (!ws.playerId) return;
            const { gameId } = data as { gameId: string };
            const sbGame = storage.leaveShipsBattleGame(gameId, ws.playerId);
            if (sbGame) {
              const otherId =
                sbGame.player1.id === ws.playerId
                  ? sbGame.player2.id
                  : sbGame.player1.id;
              sendTo(otherId, {
                type: "game_update_shipsbattle",
                game: sbGame,
              });
              storage.deleteShipsBattleGame(gameId);
            }
            break;
          }

          case "game_rematch_shipsbattle": {
            if (!ws.playerId || !ws.playerName) return;
            const { gameId } = data as { gameId: string };
            const oldGame = storage.getShipsBattleGame(gameId);
            if (oldGame) {
              const newGame = storage.createShipsBattleGame(
                oldGame.player1.id,
                oldGame.player1.name,
                oldGame.player2.id,
                oldGame.player2.name,
              );
              storage.deleteShipsBattleGame(gameId);
              sendTo(newGame.player1.id, {
                type: "game_update_shipsbattle",
                game: newGame,
              });
              sendTo(newGame.player2.id, {
                type: "game_update_shipsbattle",
                game: newGame,
              });
            }
            break;
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      if (ws.playerId) {
        leaveWarzoneRoom(ws.playerId);

        const tttGame = storage.getTTTGameByPlayerId(ws.playerId);
        if (tttGame) {
          const otherId =
            tttGame.player1Id === ws.playerId
              ? tttGame.player2Id
              : tttGame.player1Id;
          const leavingPlayerName =
            tttGame.player1Id === ws.playerId
              ? tttGame.player1Name
              : tttGame.player2Name;
          storage.deleteTTTGame(tttGame.id);
          storage.updatePlayerStatus(otherId, "online", null);
          sendTo(otherId, {
            type: "opponent_left",
            game: "tictactoe",
            opponentName: leavingPlayerName,
            message: `${leavingPlayerName} disconnected. You win!`,
          });
          sendTo(otherId, { type: "game_update_ttt", game: null });
        }

        const rpsGame = storage.getRPSGameByPlayerId(ws.playerId);
        if (rpsGame) {
          const otherId =
            rpsGame.player1Id === ws.playerId
              ? rpsGame.player2Id
              : rpsGame.player1Id;
          const leavingPlayerName =
            rpsGame.player1Id === ws.playerId
              ? rpsGame.player1Name
              : rpsGame.player2Name;
          storage.deleteRPSGame(rpsGame.id);
          storage.updatePlayerStatus(otherId, "online", null);
          sendTo(otherId, {
            type: "opponent_left",
            game: "rps",
            opponentName: leavingPlayerName,
            message: `${leavingPlayerName} disconnected. You win!`,
          });
          sendTo(otherId, { type: "game_update_rps", game: null });
        }

        const lobby = storage.getRiddleLobbyByPlayerId(ws.playerId);
        if (lobby) {
          storage.removePlayerFromRiddleLobby(lobby.id, ws.playerId);
          const updatedLobby = storage.getRiddleLobby(lobby.id);
          if (updatedLobby) {
            updatedLobby.players.forEach((p) => {
              sendTo(p.id, {
                type: "lobby_update_riddle",
                lobby: updatedLobby,
              });
            });
          }
        }

        const riddleGame = storage.getRiddleGameByPlayerId(ws.playerId);
        if (riddleGame) {
          riddleGame.players = riddleGame.players.filter(
            (p) => p.id !== ws.playerId,
          );
          if (riddleGame.players.length < 2) {
            riddleGame.players.forEach((p) => {
              sendTo(p.id, {
                type: "game_update_riddle",
                game: { ...riddleGame, status: "finished" },
              });
              storage.updatePlayerStatus(p.id, "online", null);
            });
            storage.deleteRiddleGame(riddleGame.id);
          } else {
            storage.updateRiddleGame(riddleGame.id, {
              players: riddleGame.players,
            });
          }
        }

        const wsGame = storage.getWSGameByPlayerId(ws.playerId);
        if (wsGame) {
          const otherId =
            wsGame.player1Id === ws.playerId
              ? wsGame.player2Id
              : wsGame.player1Id;
          const leavingPlayerName =
            wsGame.player1Id === ws.playerId
              ? wsGame.player1Name
              : wsGame.player2Name;
          storage.deleteWSGame(wsGame.id);
          storage.updatePlayerStatus(otherId, "online", null);
          sendTo(otherId, {
            type: "opponent_left",
            game: "wordscramble",
            opponentName: leavingPlayerName,
            message: `${leavingPlayerName} disconnected. You win!`,
          });
          sendTo(otherId, { type: "game_update_ws", game: null });
        }

        const ngGame = storage.getNGGameByPlayerId(ws.playerId);
        if (ngGame) {
          const otherId =
            ngGame.player1Id === ws.playerId
              ? ngGame.player2Id
              : ngGame.player1Id;
          const leavingPlayerName =
            ngGame.player1Id === ws.playerId
              ? ngGame.player1Name
              : ngGame.player2Name;
          storage.deleteNGGame(ngGame.id);
          storage.updatePlayerStatus(otherId, "online", null);
          sendTo(otherId, {
            type: "opponent_left",
            game: "numberguess",
            opponentName: leavingPlayerName,
            message: `${leavingPlayerName} disconnected. You win!`,
          });
          sendTo(otherId, { type: "game_update_ng", game: null });
        }

        const qmGame = storage.getQMGameByPlayerId(ws.playerId);
        if (qmGame) {
          const otherId =
            qmGame.player1Id === ws.playerId
              ? qmGame.player2Id
              : qmGame.player1Id;
          const leavingPlayerName =
            qmGame.player1Id === ws.playerId
              ? qmGame.player1Name
              : qmGame.player2Name;
          storage.deleteQMGame(qmGame.id);
          storage.updatePlayerStatus(otherId, "online", null);
          sendTo(otherId, {
            type: "opponent_left",
            game: "quickmath",
            opponentName: leavingPlayerName,
            message: `${leavingPlayerName} disconnected. You win!`,
          });
          sendTo(otherId, { type: "game_update_qm", game: null });
        }

        const c4Game = storage.getC4GameByPlayerId(ws.playerId);
        if (c4Game) {
          const otherId =
            c4Game.player1Id === ws.playerId
              ? c4Game.player2Id
              : c4Game.player1Id;
          const leavingPlayerName =
            c4Game.player1Id === ws.playerId
              ? c4Game.player1Name
              : c4Game.player2Name;
          if (c4Game.spectators) {
            c4Game.spectators.forEach((s) => {
              sendTo(s.id, { type: "game_update_c4", game: null });
            });
          }
          storage.deleteC4Game(c4Game.id);
          storage.updatePlayerStatus(otherId, "online", null);
          sendTo(otherId, {
            type: "opponent_left",
            game: "connectfour",
            opponentName: leavingPlayerName,
            message: `${leavingPlayerName} disconnected. You win!`,
          });
          sendTo(otherId, { type: "game_update_c4", game: null });
        }

        const c4SpectatingGame = storage.getC4GameBySpectatorId(ws.playerId);
        if (c4SpectatingGame) {
          const updatedC4Game = storage.removeSpectatorFromC4Game(
            c4SpectatingGame.id,
            ws.playerId,
          );
          if (updatedC4Game) {
            sendTo(updatedC4Game.player1Id, {
              type: "game_update_c4",
              game: updatedC4Game,
            });
            sendTo(updatedC4Game.player2Id, {
              type: "game_update_c4",
              game: updatedC4Game,
            });
            if (updatedC4Game.spectators) {
              updatedC4Game.spectators.forEach((s) => {
                sendTo(s.id, { type: "game_update_c4", game: updatedC4Game });
              });
            }
          }
        }

        const memoryLobby = storage.getMemoryLobbyByPlayerId(ws.playerId);
        if (memoryLobby) {
          storage.removePlayerFromMemoryLobby(memoryLobby.id, ws.playerId);
          const updatedLobby = storage.getMemoryLobby(memoryLobby.id);
          if (updatedLobby) {
            updatedLobby.players.forEach((p) => {
              sendTo(p.id, {
                type: "lobby_update_memory",
                lobby: updatedLobby,
              });
            });
          }
        }

        const memoryGame = storage.getMemoryGameByPlayerId(ws.playerId);
        if (memoryGame) {
          memoryGame.players = memoryGame.players.filter(
            (p) => p.id !== ws.playerId,
          );
          if (memoryGame.players.length < 2) {
            const finishedGame = { ...memoryGame, status: "finished" as const };
            sendToMemoryGameAll(finishedGame, {
              type: "game_update_memory",
              game: finishedGame,
            });
            memoryGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "online", null);
            });
            storage.deleteMemoryGame(memoryGame.id);
          } else {
            storage.updateMemoryGame(memoryGame.id, {
              players: memoryGame.players,
            });
          }
        }

        const typingLobby = storage.getTypingLobbyByPlayerId(ws.playerId);
        if (typingLobby) {
          storage.removePlayerFromTypingLobby(typingLobby.id, ws.playerId);
          const updatedLobby = storage.getTypingLobby(typingLobby.id);
          if (updatedLobby) {
            updatedLobby.players.forEach((p) => {
              sendTo(p.id, {
                type: "lobby_update_typing",
                lobby: updatedLobby,
              });
            });
          }
        }

        const typingGame = storage.getTypingGameByPlayerId(ws.playerId);
        if (typingGame) {
          typingGame.players = typingGame.players.filter(
            (p) => p.id !== ws.playerId,
          );
          if (typingGame.players.length < 2) {
            typingGame.players.forEach((p) => {
              sendTo(p.id, {
                type: "game_update_typing",
                game: { ...typingGame, status: "finished" },
              });
              storage.updatePlayerStatus(p.id, "online", null);
            });
            storage.deleteTypingGame(typingGame.id);
          } else {
            storage.updateTypingGame(typingGame.id, {
              players: typingGame.players,
            });
          }
        }

        // Werewolf Cleanup
        const werewolfLobby = storage.getWerewolfLobbyByPlayerId(ws.playerId);
        if (werewolfLobby) {
          storage.removePlayerFromWerewolfLobby(werewolfLobby.id, ws.playerId);
          const updatedLobby = storage.getWerewolfLobby(werewolfLobby.id);
          if (updatedLobby) {
            updatedLobby.players.forEach((p) => {
              sendTo(p.id, {
                type: "lobby_update_werewolf",
                lobby: updatedLobby,
              });
            });
          }
        }

        const werewolfGame = storage.getWerewolfGameByPlayerId(ws.playerId);
        if (werewolfGame) {
          const updatedGame = storage.removePlayerFromWerewolfGame(
            werewolfGame.id,
            ws.playerId,
          );
          if (updatedGame) {
            updatedGame.players.forEach((p) => {
              const playerData = updatedGame.players.find(
                (gp) => gp.id === p.id,
              );
              sendTo(p.id, {
                type: "game_update_werewolf",
                game: updatedGame,
                playerRole: playerData?.role,
              });
            });
          }
        }

        const spyHuntLobby = storage.getSpyHuntLobbyByPlayerId(ws.playerId);
        if (spyHuntLobby) {
          storage.removePlayerFromSpyHuntLobby(spyHuntLobby.id, ws.playerId);
          const updatedLobby = storage.getSpyHuntLobby(spyHuntLobby.id);
          if (updatedLobby) {
            updatedLobby.players.forEach((p) => {
              sendTo(p.id, {
                type: "lobby_update_spyhunt",
                lobby: updatedLobby,
              });
            });
          }
        }

        const spyHuntGame = storage.getSpyHuntGameByPlayerId(ws.playerId);
        if (spyHuntGame) {
          handleSpyHuntPlayerExit(spyHuntGame.id, ws.playerId, "disconnected");
        }

        // FPS Game cleanup
        const fpsGame = storage.getFpsGameByPlayerId(ws.playerId);
        if (fpsGame) {
          const leavingPlayerName =
            fpsGame.players.find((p) => p.id === ws.playerId)?.name ||
            "Unknown";
          const wasPlaying = fpsGame.status === "playing";
          const updatedFpsGame = storage.leaveFpsGame(fpsGame.id, ws.playerId);

          storage.updatePlayerStatus(ws.playerId, "online", null);

          if (updatedFpsGame) {
            const newHostName = updatedFpsGame.players.find(
              (p) => p.id === updatedFpsGame.hostId,
            )?.name;
            updatedFpsGame.players.forEach((p) => {
              sendTo(p.id, {
                type: wasPlaying ? "fps_game_update" : "fps_lobby_update",
                game: updatedFpsGame,
              });
              sendTo(p.id, {
                type: "fps_player_left",
                playerName: leavingPlayerName,
                newHostId: updatedFpsGame.hostId,
                newHostName: newHostName,
              });
            });
          }
        }

        // Point on Point cleanup
        const popLobby = storage.getPointOnPointLobbyByPlayerId(ws.playerId);
        if (popLobby) {
          storage.removePlayerFromPointOnPointLobby(popLobby.id, ws.playerId);
          const updatedLobby = storage.getPointOnPointLobby(popLobby.id);
          if (updatedLobby) {
            updatedLobby.players.forEach((p) => {
              sendTo(p.id, {
                type: "lobby_update_pointonpoint",
                lobby: updatedLobby,
              });
            });
          }
        }

        const popGame = storage.getPointOnPointGameByPlayerId(ws.playerId);
        if (popGame) {
          const leavingPlayer = popGame.players.find(
            (p) => p.id === ws.playerId,
          );
          popGame.players = popGame.players.filter((p) => p.id !== ws.playerId);
          popGame.turnOrder = popGame.turnOrder.filter(
            (id) => id !== ws.playerId,
          );

          if (popGame.players.length < 2) {
            popGame.status = "finished";
            popGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "online", null);
              sendTo(p.id, {
                type: "game_update_pointonpoint",
                game: popGame,
                reason: "Not enough players",
              });
            });
            storage.deletePointOnPointGame(popGame.id);
          } else {
            if (popGame.hostId === ws.playerId) {
              popGame.hostId = popGame.players[0].id;
            }
            if (popGame.currentTurn === ws.playerId) {
              popGame.currentTurn =
                popGame.turnOrder[0] || popGame.players[0]?.id;
            }
            storage.updatePointOnPointGame(popGame.id, popGame);
            popGame.players.forEach((p) => {
              sendTo(p.id, {
                type: "game_update_pointonpoint",
                game: popGame,
                notification: leavingPlayer
                  ? `${leavingPlayer.name} disconnected`
                  : undefined,
              });
            });
          }
        }

        // Emoji Chain cleanup
        const emojiChainLobby = storage.getEmojiChainLobbyByPlayerId(
          ws.playerId,
        );
        if (emojiChainLobby) {
          storage.removePlayerFromEmojiChainLobby(
            emojiChainLobby.id,
            ws.playerId,
          );
          const updatedLobby = storage.getEmojiChainLobby(emojiChainLobby.id);
          if (updatedLobby && updatedLobby.players.length > 0) {
            updatedLobby.players.forEach((p) => {
              sendTo(p.id, {
                type: "lobby_update_emojichain",
                lobby: updatedLobby,
              });
            });
          }
        }

        const emojiChainGame = storage.getEmojiChainGameByPlayerId(ws.playerId);
        if (emojiChainGame) {
          emojiChainGame.players = emojiChainGame.players.filter(
            (p) => p.id !== ws.playerId,
          );
          if (emojiChainGame.players.length < 2) {
            emojiChainGame.status = "finished";
            emojiChainGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "online", null);
              sendTo(p.id, {
                type: "game_update_emojichain",
                game: emojiChainGame,
              });
            });
            storage.deleteEmojiChainGame(emojiChainGame.id);
          } else {
            storage.updateEmojiChainGame(emojiChainGame.id, emojiChainGame);
            emojiChainGame.players.forEach((p) => {
              sendTo(p.id, {
                type: "game_update_emojichain",
                game: emojiChainGame,
              });
            });
          }
        }

        // Word Association cleanup
        const wordAssocLobby = storage.getWordAssociationLobbyByPlayerId(
          ws.playerId,
        );
        if (wordAssocLobby) {
          storage.removePlayerFromWordAssociationLobby(
            wordAssocLobby.id,
            ws.playerId,
          );
          const updatedLobby = storage.getWordAssociationLobby(
            wordAssocLobby.id,
          );
          if (updatedLobby && updatedLobby.players.length > 0) {
            updatedLobby.players.forEach((p) => {
              sendTo(p.id, {
                type: "lobby_update_wordassociation",
                lobby: updatedLobby,
              });
            });
          }
        }

        const wordAssocGame = storage.getWordAssociationGameByPlayerId(
          ws.playerId,
        );
        if (wordAssocGame) {
          wordAssocGame.players = wordAssocGame.players.filter(
            (p) => p.id !== ws.playerId,
          );
          wordAssocGame.turnOrder = wordAssocGame.turnOrder.filter(
            (id) => id !== ws.playerId,
          );
          if (wordAssocGame.players.filter((p) => !p.isEliminated).length < 2) {
            wordAssocGame.status = "finished";
            wordAssocGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "online", null);
              sendTo(p.id, {
                type: "game_update_wordassociation",
                game: wordAssocGame,
              });
            });
            storage.deleteWordAssociationGame(wordAssocGame.id);
          } else {
            if (wordAssocGame.currentTurn === ws.playerId) {
              const activePlayers = wordAssocGame.players.filter(
                (p) => !p.isEliminated,
              );
              wordAssocGame.currentTurn =
                activePlayers[0]?.id || wordAssocGame.turnOrder[0];
            }
            storage.updateWordAssociationGame(wordAssocGame.id, wordAssocGame);
            wordAssocGame.players.forEach((p) => {
              sendTo(p.id, {
                type: "game_update_wordassociation",
                game: wordAssocGame,
              });
            });
          }
        }

        // Hangman cleanup
        const hangmanLobby = storage.getHangmanLobbyByPlayerId(ws.playerId);
        if (hangmanLobby) {
          storage.removePlayerFromHangmanLobby(hangmanLobby.id, ws.playerId);
          const updatedLobby = storage.getHangmanLobby(hangmanLobby.id);
          if (updatedLobby && updatedLobby.players.length > 0) {
            updatedLobby.players.forEach((p) => {
              sendTo(p.id, {
                type: "lobby_update_hangman",
                lobby: updatedLobby,
              });
            });
          }
        }

        const hangmanGame = storage.getHangmanGameByPlayerId(ws.playerId);
        if (hangmanGame) {
          hangmanGame.players = hangmanGame.players.filter(
            (p) => p.id !== ws.playerId,
          );
          hangmanGame.turnOrder = hangmanGame.turnOrder.filter(
            (id) => id !== ws.playerId,
          );
          if (hangmanGame.players.length < 2) {
            hangmanGame.status = "finished";
            hangmanGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "online", null);
              sendTo(p.id, { type: "game_update_hangman", game: hangmanGame });
            });
            storage.deleteHangmanGame(hangmanGame.id);
          } else {
            if (hangmanGame.wordSetter === ws.playerId) {
              hangmanGame.wordSetter = hangmanGame.turnOrder[0];
            }
            if (hangmanGame.currentGuesser === ws.playerId) {
              hangmanGame.currentGuesser = hangmanGame.turnOrder[0];
            }
            storage.updateHangmanGame(hangmanGame.id, hangmanGame);
            hangmanGame.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_hangman", game: hangmanGame });
            });
          }
        }

        // Trivia Quiz cleanup
        const triviaLobby = storage.getTriviaQuizLobbyByPlayerId(ws.playerId);
        if (triviaLobby) {
          storage.removePlayerFromTriviaQuizLobby(triviaLobby.id, ws.playerId);
          const updatedLobby = storage.getTriviaQuizLobby(triviaLobby.id);
          if (updatedLobby && updatedLobby.players.length > 0) {
            updatedLobby.players.forEach((p) => {
              sendTo(p.id, {
                type: "lobby_update_triviaquiz",
                lobby: updatedLobby,
              });
            });
          }
        }

        const triviaGame = storage.getTriviaQuizGameByPlayerId(ws.playerId);
        if (triviaGame) {
          triviaGame.players = triviaGame.players.filter(
            (p) => p.id !== ws.playerId,
          );
          if (triviaGame.players.length < 1) {
            triviaGame.status = "finished";
            storage.deleteTriviaQuizGame(triviaGame.id);
          } else {
            storage.updateTriviaQuizGame(triviaGame.id, triviaGame);
            triviaGame.players.forEach((p) => {
              sendTo(p.id, {
                type: "game_update_triviaquiz",
                game: triviaGame,
              });
            });
          }
        }

        // Reaction Race cleanup
        const rrLobby = storage.getReactionRaceLobbyByPlayerId(ws.playerId);
        if (rrLobby) {
          storage.removePlayerFromReactionRaceLobby(rrLobby.id, ws.playerId);
          const updatedLobby = storage.getReactionRaceLobby(rrLobby.id);
          if (updatedLobby && updatedLobby.players.length > 0) {
            updatedLobby.players.forEach((p) => {
              sendTo(p.id, {
                type: "lobby_update_reactionrace",
                lobby: updatedLobby,
              });
            });
          }
        }

        const rrGame = storage.getReactionRaceGameByPlayerId(ws.playerId);
        if (rrGame) {
          rrGame.players = rrGame.players.filter((p) => p.id !== ws.playerId);
          if (rrGame.players.length < 2) {
            rrGame.status = "finished";
            rrGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "online", null);
              sendTo(p.id, { type: "game_update_reactionrace", game: rrGame });
            });
            storage.deleteReactionRaceGame(rrGame.id);
          } else {
            storage.updateReactionRaceGame(rrGame.id, rrGame);
            rrGame.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_reactionrace", game: rrGame });
            });
          }
        }

        // Color Clash cleanup
        const ccLobby = storage.getColorClashLobbyByPlayerId(ws.playerId);
        if (ccLobby) {
          storage.removePlayerFromColorClashLobby(ccLobby.id, ws.playerId);
          const updatedLobby = storage.getColorClashLobby(ccLobby.id);
          if (updatedLobby && updatedLobby.players.length > 0) {
            updatedLobby.players.forEach((p) => {
              sendTo(p.id, {
                type: "lobby_update_colorclash",
                lobby: updatedLobby,
              });
            });
          }
        }

        const ccGame = storage.getColorClashGameByPlayerId(ws.playerId);
        if (ccGame) {
          const leavingPlayer = ccGame.players.find(
            (p) => p.id === ws.playerId,
          );
          if (leavingPlayer) {
            leavingPlayer.isEliminated = true;
          }

          const activePlayers = ccGame.players.filter((p) => !p.isEliminated);
          if (activePlayers.length <= 1) {
            ccGame.status = "finished";
            if (activePlayers.length === 1) {
              ccGame.winner = activePlayers[0].id;
              ccGame.winnerName = activePlayers[0].name;
            }
            ccGame.players.forEach((p) => {
              storage.updatePlayerStatus(p.id, "online", null);
              sendTo(p.id, { type: "game_update_colorclash", game: ccGame });
            });
            storage.deleteColorClashGame(ccGame.id);
          } else {
            storage.updateColorClashGame(ccGame.id, ccGame);
            ccGame.players.forEach((p) => {
              sendTo(p.id, { type: "game_update_colorclash", game: ccGame });
            });
          }
        }

        storage.removePlayer(ws.playerId);
        clients.delete(ws.playerId);
        broadcast({ type: "player_left", playerId: ws.playerId });
        broadcast({ type: "players_list", players: storage.getAllPlayers() });
      }
    });

    ws.on("error", (error) => {
      console.error("WebSocket error:", error);
    });
  });

  return httpServer;
}
