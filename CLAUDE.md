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
├── index.html                    # Main HTML with canvas and UI buttons
├── main.js                       # Core game logic (~7,500 lines)
├── fishData.js                   # Fish species configuration data
├── constants.js                  # Centralized game constants (costs, timings, thresholds)
├── package.json                  # npm configuration with Vite
├── PRD.md                        # Product requirements document
├── ITERATIONS.md                 # Development history and change log
├── SPRITE_MIGRATION_PROGRESS.md  # Sprite migration tracking
└── CLAUDE.md                     # This file
```

## File Map (main.js)

### Utility Classes
| Lines | Class/Section | Description |
|-------|---------------|-------------|
| 1-31 | Image Management | `imageCache`, `preloadFishImages()` |
| 36-76 | TankManager | Boundary logic, `clampToTank()`, `getRandomPosition()` |
| 234-351 | SoundSystem | Web Audio procedural sounds |
| 352-451 | Particle | Particle effects (bubble, sparkle, blood) |

### Game State
| Lines | Section | Description |
|-------|---------|-------------|
| 78-181 | State Variables | `gold`, arrays for all fish/pets/aliens, upgrade flags |
| 93-118 | Cost Constants | All entity costs (TROUT_COST, SKELLFIN_COST, etc.) |

### Fish Classes (Sprite-Based)
| Lines | Class | Behavior |
|-------|-------|----------|
| 887-1082 | Trout | Basic fish, eats pellets, drops silver coins ($15) |
| 1083-1340 | Skellfin | Predator, hunts Trouts, drops chests ($500) |
| 1341-1588 | MobiusDickens | Apex predator, hunts Skellfins, drops chests ($1500) |
| 2353-2589 | Crab | Bottom dweller, jumps to hunt Trouts, drops beetles |
| 2590-2707 | WardenLamprey | Alien attacker, no hunger, 2 dmg/sec |
| 2708-2862 | Seeker | Auto-collector, 100px radius |
| 2863-3049 | Anemone | Healer, -5 hunger/sec to nearby fish |
| 3050-3243 | Geotle | Breeder, spawns baby Trouts every 25s |

### Legacy/Companion Fish
| Lines | Class | Description |
|-------|-------|-------------|
| 1589-1829 | Breeder | Spawns small guppies |
| 1830-1975 | Feeder | Autonomous pellet dropper |
| 1976-2227 | Starcatcher | Star collector, bottom dweller |
| 3244-3528 | Beetlemuncher | Eats beetles for coins |

### Collectibles
| Lines | Class | Description |
|-------|-------|-------------|
| 2228-2352 | Beetle | Floor-scuttling collectible ($150) |
| 3529-3563 | Pellet | Food item, sinks with physics |
| 3564-3769 | Coin | Currency, sinks/floats by type |

### Aliens
| Lines | Class | HP | Behavior |
|-------|-------|-----|----------|
| 3770-4131 | Sylvester | 50 | Basic alien, eats fish |
| 4132-4416 | Balrog | 100 | Tough, never gets full |
| 4417-4708 | Gus | N/A | Fed to death (20 pellets) |
| 4709-4824 | Missile | 3 | Destructor projectiles |
| 4825-5011 | Destructor | 80 | Fires homing missiles |

### Pets
| Lines | Class | Ability |
|-------|-------|---------|
| 5012-5184 | Stinky | Snail, collects floor coins |
| 5185-5349 | Niko | Seahorse, produces pearls ($250) |
| 5350-5519 | Zorf | Drops pellets every 8s |
| 5520-5710 | Itchy | Attacks aliens (2 dmg/sec) |
| 5711-5874 | Clyde | Collects coins anywhere |
| 5875-6107 | Angie | Revives one dead fish per attack |

### Core Systems
| Lines | Section | Description |
|-------|---------|-------------|
| 463-828 | Save/Load | `saveGame()`, `loadGame()`, `deleteSave()` |
| 6108-6547 | Game Systems | Alien management, pet system, progression |
| 6554-6796 | Purchase Functions | All `buy*()` functions |
| 6872-7228 | Game Loop | `init()`, `gameLoop()`, entity updates |
| 7229-7539 | UI Drawing | Stats panel, achievements, fish counter |
| 7467-7541 | Alien Spawning | `spawnAlien()`, warning system |

## Common Tasks

### Adding a New Fish
1. Create class (~200 lines) following Trout pattern at `main.js:887`
2. Add species config to `fishData.js`
3. Add array declaration with other fish arrays (~line 80)
4. Add cost constant (~line 100)
5. Create `buy*()` function (~line 6600)
6. Add to game loop update/draw section (~line 7100)
7. Add to `saveGame()`/`loadGame()` (~line 500)
8. Add button to `index.html`

### Adding a New Alien
1. Create class following Sylvester pattern at `main.js:3770`
2. Add to `spawnAlien()` random selection (~line 7480)
3. Add to alien update loop in `gameLoop()` (~line 7150)

### Adding a New Pet
1. Create class following Stinky pattern at `main.js:5012`
2. Add to pet arrays and pet limit check (~line 6200)
3. Create `buy*()` function with pet limit enforcement
4. Add to save/load system
5. Add button to `index.html`

### Modifying Fish Behavior
- Hunger/eating: Look for `findNearestPellet()` in fish class
- Movement: Modify `update()` method, check `wanderTimer` logic
- Coin drops: Modify `coinTimer` and coin creation in `update()`

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

## Constants Reference (constants.js)

| Export | Description |
|--------|-------------|
| `COSTS` | All purchase costs (fish, pets, upgrades) |
| `VALUES` | Currency values (coin types, beetles, pearls) |
| `TIMING` | Time intervals (spawns, coin drops, auto-save) |
| `THRESHOLDS` | Gameplay limits (max pets, hunger levels, wave trigger) |
| `ALIEN_STATS` | HP, damage, speed for each alien type |
| `STAGES` | Legacy evolution stages |
| `ACHIEVEMENT_DEFS` | Achievement names and descriptions |
| `PRESTIGE` | Prestige bonus multipliers |
| `PHYSICS` | Movement speeds for pellets, coins, beetles |

## Debug Commands (Browser Console)

Access via `game.debug.*` in the browser console:

| Command | Description |
|---------|-------------|
| `game.debug.status()` | Print current game state |
| `game.debug.setGold(n)` | Set gold to n |
| `game.debug.addGold(n)` | Add n gold |
| `game.debug.spawnAlien(type)` | Spawn alien ('sylvester', 'balrog', 'gus', 'destructor', or 'random') |
| `game.debug.spawnTrout(n)` | Spawn n trouts |
| `game.debug.spawnSkellfin(n)` | Spawn n skellfins |
| `game.debug.spawnMobius(n)` | Spawn n mobiuses |
| `game.debug.killAllAliens()` | Kill all active aliens |
| `game.debug.killAllFish()` | Clear all fish arrays |
| `game.debug.setSpeed(n)` | Set game speed multiplier |
| `game.debug.resetAlienTimer()` | Force alien spawn in 5 seconds |
| `game.debug.skipToWave()` | Set totalEarned to $10k (enables wave mode) |
| `game.debug.unlockAll()` | Unlock all upgrades, set gold to $100k |
| `game.debug.clearSave()` | Delete save data |

Read-only state access: `game.state.gold`, `game.state.trouts`, `game.state.aliens`, etc.

## Important Notes
- Click on canvas to drop pellets ($5 each)
- Fish turn red when hungry (hunger > 50)
- Fish die if hunger reaches 100
- Aliens spawn every 2-3 minutes (faster at higher progression)
- Wave system activates at $10k+ total earned (multiple aliens)
