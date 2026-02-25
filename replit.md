# GameHub - Real-Time Multiplayer Gaming Platform

## Overview
A real-time multiplayer gaming web platform where friends can play together, featuring three games: Tic Tac Toe, Rock Paper Scissors, and Riddles. Users enter their name on a welcome screen, then access a home page displaying all three games with a sidebar showing online players and a persistent chat container.

## Current State
- **Status**: MVP Complete
- **Last Updated**: December 2024

## Tech Stack
- **Frontend**: React with TypeScript, Tailwind CSS, shadcn/ui components
- **Backend**: Express.js with WebSocket (ws library)
- **Real-time**: WebSocket for player presence, chat, game state synchronization
- **Storage**: In-memory storage for players, games, lobbies, and messages
- **Routing**: Wouter for client-side routing

## Project Structure
```
client/
  src/
    components/
      games/
        tic-tac-toe.tsx    - Tic Tac Toe game component
        rock-paper-scissors.tsx - RPS game component
        riddles.tsx        - Riddles lobby and game components
      game-card.tsx        - Game selection card component
      online-players.tsx   - Sidebar with online players
      chat-container.tsx   - Floating chat widget
      challenge-notification.tsx - Challenge popup
    lib/
      websocket.tsx        - WebSocket context and hooks
    pages/
      welcome.tsx          - Welcome/login screen
      home.tsx             - Main game selection page

server/
  routes.ts               - WebSocket server and game logic
  storage.ts              - In-memory data storage

shared/
  schema.ts               - TypeScript types and Zod schemas
```

## Features
1. **Welcome Screen**: Username entry to join the platform
2. **Home Page**: Game cards for Tic Tac Toe, RPS, and Riddles
3. **Online Players Sidebar**: Shows other connected players with challenge buttons
4. **Chat System**: Persistent chat accessible throughout the platform
5. **Tic Tac Toe**: Real-time 2-player game with win detection and rematch
6. **Rock Paper Scissors**: Best of 5 rounds with simultaneous selection
7. **Riddles**: Lobby-based multiplayer trivia with scoring

## WebSocket Events
- `join` - Player joins the platform
- `chat_message` - Send/receive chat messages
- `challenge_sent/received/response` - Game challenge system
- `game_start/update_ttt` - Tic Tac Toe game events
- `game_start/update_rps` - Rock Paper Scissors events
- `lobby_join/start_riddle` - Riddles lobby events
- `game_update/answer_riddle` - Riddles game events

## Design System
- **Primary Color**: Discord Blue (#7289DA / hsl(227, 58%, 65%))
- **Success/Online**: Green (#43B581 / hsl(145, 63%, 49%))
- **Warning/Accent**: Gold (#FAA61A / hsl(38, 95%, 54%))
- **Background**: Dark Grey (#36393F / hsl(225, 6%, 25%))
- **Cards**: Darker Grey (#2F3136 / hsl(225, 7%, 18%))
- **Font**: Inter, system fonts

## Running the Application
The application runs on port 5000. Use `npm run dev` to start both the Express server and Vite development server.
