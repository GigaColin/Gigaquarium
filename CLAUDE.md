# Gigaquarium

## Project Overview
Insaniquarium-style fish tank game where fish swim, get hungry, eat pellets, and drop coins.

## Tech Stack
- **Platform:** Web / HTML5
- **Language:** JavaScript (ES6 modules)
- **Framework:** Vanilla Canvas API
- **Dev Server:** Vite

## Project Structure
```
Gigaquarium/
├── index.html      # Main HTML with canvas element
├── main.js         # Game logic (TankManager, Guppy, Pellet classes)
├── package.json    # npm configuration with Vite
├── PRD.md          # Product requirements document
├── ITERATIONS.md   # Development history and change log
└── CLAUDE.md       # This file
```

## Development Guidelines
- Use ES6 classes for game entities
- TankManager handles all boundary logic
- Game loop uses requestAnimationFrame with delta time
- **Before starting work:** Check `ITERATIONS.md` and git commits for recent context, and `PRD.md` for current task lists
- **After completing work:** Document changes in `ITERATIONS.md`

## Build & Run
```bash
npm install    # Install dependencies (Vite)
npm start      # Run dev server at localhost:5173
npm run build  # Build for production
```

## Important Notes
- Click on canvas to drop pellets ($5 each)
- Guppies turn red when hungry (hunger > 50)
- Guppies die if hunger reaches 100
