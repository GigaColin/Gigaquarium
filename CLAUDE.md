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
├── main.js                       # Core game logic (~2,340 lines)
├── fishData.js                   # Fish species configuration data
├── constants.js                  # Centralized game constants (costs, timings, thresholds)
├── entities/                     # Entity modules (Phase R1-R2 complete)
│   ├── EntityManager.js          # Unified update/draw system (~160 lines)
│   ├── fish.js                   # All fish classes (~2,500 lines)
│   ├── aliens.js                 # All alien classes (~1,250 lines)
│   ├── pets.js                   # All pet classes (~1,150 lines)
│   └── collectibles.js           # Pellet, Coin, Beetle (~395 lines)
├── package.json                  # npm configuration with Vite
├── PRD.md                        # Product requirements document
├── ITERATIONS.md                 # Development history and change log
├── SPRITE_MIGRATION_PROGRESS.md  # Sprite migration tracking
└── CLAUDE.md                     # This file
```

## File Map (main.js)

### Utility Classes & Functions
| Lines | Class/Section | Description |
|-------|---------------|-------------|
| 25-50 | Image Management | `imageCache`, `preloadFishImages()` |
| 55-95 | TankManager | Boundary logic, `clampToTank()`, `getRandomPosition()` |
| 98-155 | Utility Functions | `getDistance()`, `findNearest()`, `moveToward()` |
| 305-420 | SoundSystem | Web Audio procedural sounds |
| 423-527 | Particle | Particle effects (bubble, sparkle, blood) |

### Game State
| Lines | Section | Description |
|-------|---------|-------------|
| 157-255 | State Variables | `gold`, arrays for all fish/pets/aliens, upgrade flags |
| 171-197 | Cost Aliases | Aliases to `constants.js` (TROUT_COST, SKELLFIN_COST, etc.) |

### Fish Classes (Sprite-Based)

**entities/fish.js** (All fish classes - ~2500 lines):
| Lines | Class | Behavior |
|-------|-------|----------|
| 39-216 | Trout | Basic fish, eats pellets, drops silver coins ($15) |
| 221-473 | Skellfin | Predator, hunts Trouts, drops chests ($500) |
| 478-720 | MobiusDickens | Apex predator, hunts Skellfins, drops chests ($1500) |
| 730-955 | Breeder | Spawns baby trouts every 20-30s |
| 960-1105 | Feeder | Drops pellets every 15-20s, doesn't eat |
| 1110-1357 | Starcatcher | Bottom-dweller, eats stars, drops diamonds |
| 1362-1594 | Crab | Bottom dweller, jumps to hunt Trouts, drops beetles |
| 1599-1777 | Geotle | Spawns baby Trouts every 25s |
| 1782-1897 | WardenLamprey | Alien attacker, no hunger, 2 dmg/sec |
| 1902-2052 | Seeker | Auto-collector, 100px radius |
| 2057-2212 | Anemone | Healer, -5 hunger/sec to nearby fish |
| 2217-2500+ | Beetlemuncher | Green tadpole, hunts beetles, drops pearls |

### Collectibles

**entities/collectibles.js** (All collectible classes - ~395 lines):
| Lines | Class | Description |
|-------|-------|-------------|
| 28-58 | Pellet | Food item, sinks with physics |
| 63-266 | Coin | Currency, sinks/floats by type (silver, gold, diamond, star, pearl, treasure) |
| 271-393 | Beetle | Floor-scuttling collectible ($150) |

### Aliens

**entities/aliens.js** (All alien classes - ~1,250 lines):
| Lines | Class | HP | Behavior |
|-------|-------|-----|----------|
| 25-437 | Sylvester | 50 | Basic alien, eats fish |
| 439-727 | Balrog | 100 | Tough, never gets full |
| 729-1022 | Gus | N/A | Fed to death (20 pellets) |
| 1024-1139 | Missile | 3 | Destructor projectiles |
| 1141-1310 | Destructor | 75 | Fires homing missiles |

### Pets

**entities/pets.js** (All pet classes - ~1,150 lines):
| Lines | Class | Ability |
|-------|-------|---------|
| 38-209 | Stinky | Snail, collects floor coins |
| 213-375 | Niko | Seahorse, produces pearls ($500) every 40s |
| 379-547 | Zorf | Alien pet, drops pellets every 8s |
| 551-751 | Itchy | Swordfish, attacks aliens (2 dmg/sec) |
| 755-918 | Clyde | Jellyfish, collects coins anywhere |
| 921-1157 | Angie | Angel fish, revives one dead fish per attack |

### EntityManager (entities/EntityManager.js)
| Lines | Section | Description |
|-------|---------|-------------|
| 5-40 | CATEGORY_CONFIG | Removal conditions and draw layers per entity type |
| 50-170 | EntityManager | `register()`, `updateAll()`, `drawAll()`, `getByCategory()` |

### Core Systems (main.js)
| Lines | Section | Description |
|-------|---------|-------------|
| 257-305 | EntityManager Setup | Array registration, category assignments, context setup |
| 580-940 | Save/Load | `saveGame()`, `loadGame()`, `deleteSave()` |
| 1000-1100 | Module Contexts | `setGameContext()`, `setAlienContext()`, `setPetsContext()` |
| 1110-1200 | Helper Functions | Alien/pet helpers, `getPetCount()`, `canBuyPet()` |
| 1545-1770 | Purchase Functions | All `buy*()` functions, shop helpers |
| 1795-1930 | Game Loop | `init()`, `gameLoop()`, EntityManager calls |
| 1970-2160 | UI Drawing | Stats panel, achievements, fish counter, prestige |
| 2160-2240 | Alien Functions | `spawnAlien()`, warning display functions |
| 2240-2360 | Debug Commands | `game.debug.*` console utilities |

## Common Tasks

### Adding a New Fish
1. Create class (~200 lines) in `entities/fish.js` following Trout pattern
2. Export the class and add import in `main.js`
3. Add species config to `fishData.js`
4. Add array declaration with other fish arrays in main.js (~line 210)
5. Add cost to `constants.js` COSTS object, create alias in main.js (~line 190)
6. Register array with EntityManager (~line 270): `entityManager.register('fishname', array, 'fish')`
7. Create `buy*()` function using `buyFishHelper()` (~line 1690)
8. Add to `saveGame()`/`loadGame()` (~line 600)
9. Add to `setGameContext()` arrays (~line 1010) if fish needs game context access
10. Add button to `index.html`

### Adding a New Alien
1. Create class in `entities/aliens.js` following Sylvester pattern
2. Export the class and add import in `main.js`
3. Add to `spawnAlien()` random selection in main.js
4. EntityManager handles update/draw automatically (aliens array already registered)

### Adding a New Pet
1. Create class in `entities/pets.js` following Stinky pattern
2. Export the class and add import in `main.js`
3. Add to pet arrays in main.js and `getPetCount()` (~line 1125)
4. Register array with EntityManager (~line 290): `entityManager.register('petname', array, 'pet')`
5. Create `buy*()` function using `buyPetHelper()` (~line 1700)
6. Add cost to `constants.js` COSTS object
7. Add to save/load system (~line 600)
8. Add to `setPetsContext()` in `entities/pets.js` if pet needs game context access
9. Add button to `index.html`

### Modifying Fish Behavior
- Hunger/eating: Use `findNearest(this, pellets)` utility
- Movement: Use `moveToward(entity, targetX, targetY, speed, dt)` utility
- Coin drops: Modify `coinTimer` and coin creation in `update()`

## Utility Functions (main.js:78-130)

| Function | Usage | Description |
|----------|-------|-------------|
| `getDistance(x1, y1, x2, y2)` | `getDistance(fish.x, fish.y, pellet.x, pellet.y)` | Calculate distance between two points |
| `findNearest(entity, targets, options)` | `findNearest(this, pellets)` | Find nearest target from array |
| `moveToward(entity, targetX, targetY, speed, dt)` | `moveToward(this, target.x, target.y, this.speed, dt)` | Move entity toward position, returns true if still moving |
| `buyFishHelper(Class, array, cost, useRandomPos)` | `buyFishHelper(Trout, trouts, TROUT_COST)` | Generic fish purchase helper |
| `buyPetHelper(Class, array, cost)` | `buyPetHelper(Niko, nikos, NIKO_COST)` | Generic pet purchase helper with pet limit check |

### findNearest Options
```javascript
findNearest(entity, targets, {
  radius: 200,                    // Max search radius (default: Infinity)
  filter: t => !t.dead,          // Filter function (default: null)
  getPosition: t => ({ x: t.px, y: t.py })  // Custom position getter (default: target itself)
})
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

## Constants Reference (constants.js)

| Export | Description |
|--------|-------------|
| `COSTS` | All purchase costs (fish, pets, upgrades) |
| `VALUES` | Currency values (coin types, beetles, pearls) |
| `TIMING` | Time intervals (spawns, coin drops, auto-save) |
| `THRESHOLDS` | Gameplay limits (max pets, hunger levels, wave trigger) |
| `ALIEN_STATS` | HP, damage, speed for each alien type |
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

## Completion Checklist (Every Task)
Before finishing any task, verify:
- [ ] Code works and has been tested
- [ ] `ITERATIONS.md` updated with what was done
- [ ] `CLAUDE.md` updated if file structure or patterns changed
- [ ] `PRD.md` task checkboxes marked complete if applicable
