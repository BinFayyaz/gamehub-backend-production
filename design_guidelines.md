# Design Guidelines: Real-Time Multiplayer Gaming Platform

## Design Approach
Reference-based approach inspired by **Discord's gaming interface** and **Kahoot's lobby system** - modern gaming aesthetic with emphasis on real-time interaction and social engagement.

## Color Palette (User-Specified)
- **Primary:** #7289DA (Discord blue) - main actions, game cards, active states
- **Secondary:** #43B581 (online green) - player status indicators, success states
- **Accent:** #FAA61A (gold) - highlights, achievements, winner announcements
- **Background:** #36393F (dark grey) - main background
- **Cards:** #2F3136 (darker grey) - game cards, chat container, sidebar
- **Text:** #FFFFFF (white) - all text content
- **Error:** #F04747 (red) - warnings, errors, disconnections

## Typography
- **Font Stack:** Whitney, Inter, Roboto (in order of preference)
- **Hierarchy:** Large bold headings for game titles (2rem-2.5rem), medium weights for player names (1rem-1.25rem), regular for chat and descriptions (0.875rem-1rem)

## Layout System
**Spacing:** Use Tailwind units of 2, 4, 6, and 8 for consistent rhythm (p-4, m-6, gap-8)

### Welcome Screen
- Centered layout with platform logo/title at top
- Name input field (rounded, glowing focus state) in center
- Large "Enter Gaming Platform" button below
- Subtle background pattern or grid

### Home Page Structure
- **Header:** Platform title/logo, user's name display, online player count badge
- **Main Grid:** 3 game cards in responsive grid (grid-cols-1 md:grid-cols-2 lg:grid-cols-3)
- **Right Sidebar:** Online players list (fixed width 280px on desktop, collapsible on mobile)
- **Bottom Left Chat:** Floating chat widget (320px width, 400px height, draggable)

## Component Library

### Game Cards (Home Page)
- Rounded corners (rounded-xl)
- Dark card background (#2F3136)
- Game icon/illustration at top
- Game title in primary color
- Brief description text
- "Play Now" button with glow effect
- Hover state: lift effect (transform translateY) with enhanced glow

### Online Players Sidebar
- Scrollable list with dark background
- Each player entry: avatar circle (or initial), username, green status dot
- Challenge buttons appear on hover for competitive games
- "In Game" status indicator (dimmed state)

### Chat Container
- Floating widget with shadow and rounded corners
- Header with "Chat" title and minimize button
- Scrollable message area with auto-scroll to latest
- Messages: username in accent color, timestamp, message text
- Input field at bottom with send button
- Typing indicators when others are composing

### Game Lobby (Riddles)
- Centered container showing "Waiting for Players"
- Player count badge (2/8 format)
- List of joined players with avatars
- "Start Game" button (enabled only for first player when 2+ joined)
- Countdown timer when game is starting

### Game Screens (Tic Tac Toe & Rock Paper Scissors)
- Opponent info at top (name, avatar, score)
- Game board/selection area in center with large, clear interactive elements
- Your info at bottom (name, avatar, score)
- Turn indicator or waiting state messaging
- Rematch button after game completion

### Riddles Game Screen
- Question display at top (large text, #FAA61A accent border)
- Answer input field (for typing responses)
- Timer countdown (if timed)
- Leaderboard sidebar showing current scores
- Answer reveal with correct/incorrect animations

## Visual Effects & Animations
- **Glow Effects:** Primary color glow on buttons and cards on hover (use box-shadow with blur)
- **Transitions:** 200-300ms smooth transitions for all interactive elements
- **Challenge Notifications:** Toast-style notifications sliding in from top-right
- **Game State Changes:** Fade transitions between lobby/game/results screens
- **Chat Messages:** Subtle slide-in animation for new messages

## Images
No hero images required. Use game-related icons/illustrations within game cards:
- **Tic Tac Toe:** Grid icon with X and O symbols
- **Rock Paper Scissors:** Hand gesture illustrations
- **Riddles:** Question mark or lightbulb icon

All icons should use the primary color (#7289DA) with glow effects.

## Responsive Behavior
- **Desktop (lg):** Full layout with visible sidebar, floating chat, 3-column game grid
- **Tablet (md):** 2-column game grid, collapsible sidebar, chat remains floating
- **Mobile (base):** Single column, hamburger sidebar, full-width chat drawer from bottom

## Key Design Principles
1. **Real-time Feedback:** Instant visual updates for all multiplayer actions
2. **Gaming Atmosphere:** Dark theme with vibrant accent colors creates immersive experience
3. **Social Presence:** Always-visible player list and chat emphasize multiplayer nature
4. **Clear State Communication:** Obvious indicators for whose turn, waiting states, game results
5. **Accessibility:** High contrast text, clear focus states, keyboard navigation support