# Gigaquarium Iterations

Development history and change log. Check git commits for additional context.

---


## Status Log

**Iteration 1:** Created TankManager.cs - Unity prototype (deprecated)

**Iteration 2:** PIVOT TO WEB - Created HTML5 Canvas project:
- index.html with canvas element and gold UI
- main.js with TankManager class (getRandomPosition, clampToTank, isWithinBounds)
- Guppy class with wandering/hungry/eating/death states
- Pellet class with falling physics
- Click-to-spawn pellets ($5 cost)
- 2 free starting guppies
- Vite dev server setup (npm start)

**Iteration 3:** Phase 2 Complete - Evolution system:
- STAGES config: small/medium/large/king with size, color, feeding thresholds
- Death animation: 'dying' state with float-to-top, flip upside down, fade out
- Growth tracking: timesEaten counter, checkEvolution() on feeding
- Visual feedback: size scaling, dorsal fin (large+), crown (king)
- Stage label displayed under evolved fish

**Iteration 4:** Phase 3 Complete - Economy system:
- Coin class with silver/gold/diamond types, values, and visual styles
- Coins sink with wobble physics, flash when expiring (last 3s of 10s lifetime)
- coinTimer on Guppy, drops coins every 10-15 seconds based on stage
- Click detection prioritizes coins over pellet spawning
- Shop UI: Buy Guppy ($100), Upgrade Food ($200)
- Upgraded pellets are green and set hunger to -25 for longer satiation

**Iteration 5:** Phase 4 Complete - Alien threat system:
- Sylvester class: blue alien blob with tentacles, yellow eyes, teeth
- Spawns from random edge, warps into tank with entry animation
- AI pursues nearest fish, instantly kills on contact
- Combat mode: clicks damage alien (1 HP per click), no food during attack
- Health bar displayed above alien, red flash on damage
- Drops 5 gold coins on death, respawns after 60-90 seconds
- Visual feedback: red border flash, warning banner, combat instructions

**Iteration 6:** Phase 5 Complete - Carnivore fish:
- Carnivore class: green predator fish with spiky dorsal fin, forked tail, sharp teeth
- Costs $1000, drops diamonds ($200) every 15 seconds
- Hunts only small guppies when hunger >40%, turns red while hunting
- Moves 50% faster during hunting mode
- Visual "HUNGRY!" warning when hunger >60%
- Aliens can also target and eat carnivores
- High risk/reward: great income but can eat your guppy farm

**Iteration 7:** Phase 6 Complete - Pet system (Stinky):
- Stinky class: golden snail with brown spiral shell, eye stalks
- Costs $500, one-time purchase (button disables after buying)
- Moves along tank bottom only (horizontal movement)
- Auto-detects and collects coins that reach the floor
- Moves 50% faster when chasing a coin
- Cute animations: wobbling body, swaying eye stalks, slime trail
- Frees player to focus on feeding/combat instead of coin collection

**Iteration 8:** Phase 7 Complete - Polish & Persistence:
- SoundSystem class using Web Audio API with 8 sound types:
  - feed, coin, evolve, alien, hit, death, buy, victory
- Particle system with 4 particle types:
  - bubbles (ambient + on feed/death), sparkles (evolution/victory)
  - coin_sparkle (coin collection), blood (alien damage)
- Save/Load system with LocalStorage:
  - Saves: gold, upgrades, Stinky, guppies (position/stage/hunger), carnivores
  - Auto-save every 30 seconds
  - Load on game start, hunger capped at 50% on load
- UI controls: Sound toggle, manual Save, New Game button
- Ambient bubbles rise from tank bottom randomly

**Iteration 9:** Phase 8 Complete - Balance & New Content:
- Carnivore vs Alien: Carnivores now attack Sylvester when he arrives
  - Blue 'attacking' state, moves 50% faster toward alien
  - Deals damage every 0.5 seconds, spawns blood particles
- Coin Persistence: Removed coin expiration - coins stay until collected
- Breeder Fish ($750): Pink maternal fish that spawns guppies
  - Spawns new small guppy every 20-30 seconds (if hunger < 70%)
  - Eats pellets like guppies, heart indicator when breeding soon
  - Can be hunted by aliens
- Laser Upgrade ($300): Clicks deal 3 damage to alien instead of 1
  - More blood particles on hit for visual feedback
- Alien Lethality: Alien kills now trigger proper death animation
  - 'dying' state with float-up, sound effect, blood + bubble particles
- Save/Load updated to include breeders and laserUpgraded state
- Shop UI expanded with Breeder (pink) and Laser (cyan) buttons

**Iteration 10:** Phase 9 Complete - Balance and Polish:
- Carnivore Resilience: Aliens take 2 seconds to kill carnivores
  - Added beingEatenTimer to Carnivore class
  - Visual danger bar shows progress toward death
  - Timer resets/recovers when carnivore escapes alien
- Hungry Speed Boost: Guppies and Breeders move 30% faster when hunger > 50%
- Satiation Cap: Fish ignore pellets when hunger < 10 (prevents food waste)
- Multiple Stinkies: Converted from single pet to array
  - Scaling cost: $500 base + $250 per Stinky owned
  - Each Stinky spawns at random bottom position
  - Button shows count and next purchase cost
- Feeder Fish ($1500): New autonomous food source
  - Slow orange fish that wanders the tank
  - Drops a pellet every 15-20 seconds
  - Doesn't need to eat (no hunger system)
  - Visual indicator when about to drop food
- Save/Load updated for stinky count and feeders

**Iteration 11:** Phase 10 Complete - Star Guppies & Starcatcher:
- Star Guppy Evolution: Added 'star' stage after king (15 feedings)
  - Star guppies are bright yellow, larger than kings
  - Drop stars ($40) that float upward instead of sinking
- Star Collectible: New coin type with unique behavior
  - Rendered as rotating 5-pointed star with sparkle effects
  - Floats upward slowly, escapes off top of screen if not collected
- Starcatcher ($1200): Purple bottom-dwelling fish
  - Stays at tank bottom, moves horizontally only
  - Mouth on top of body - catches stars floating up
  - Produces diamonds ($200) every 12s when well-fed (hunger < 50)
  - Unique visual design with upward-facing eyes
- Added alien targeting for starcatchers
- Save/Load updated for starcatchers

**Iteration 12:** Phase 11 Complete - Bottom-Dweller Food Chain:
- Guppycruncher ($800): Orange crab-like creature at tank bottom
  - Confined to ground, uses jumping mechanic to catch prey
  - Hunts small guppies with `findSmallGuppy()` targeting
  - Drops beetles ($150) every 15 seconds when fed
- Beetle Class: New collectible entity
  - Scuttles horizontally along tank bottom (doesn't sink)
  - Click to collect for $150 value
  - Serves as food source for Beetlemuncher
- Beetlemuncher ($1000): Green tadpole-like bottom dweller
  - Hunts beetles using `findNearestBeetle()` method
  - Drops pearls ($500) every 20 seconds when fed
  - Completes the food chain: Guppy → Guppycruncher → Beetle → Beetlemuncher → Pearl
- Save/Load updated for guppycrunchers, beetles, and beetlemunchers

**Iteration 13:** Phase 12 Complete - Ultravore (Apex Predator):
- Ultravore ($5000): Massive 60px silver prehistoric fish
  - Slowest predator (speed 50) but highest value drops
  - Hunts carnivores when hungry using `findCarnivore()` method
  - Drops treasure chests ($2000) every 25 seconds
- Alien Interaction: Ultravores attack aliens as priority behavior
  - 3-second resilience to alien attacks (`beingEatenDuration = 3`)
  - Large target makes it vulnerable but can fight back
- Risk/Reward Balance: High income potential offset by:
  - Expensive cost to replace
  - Requires carnivore supply as food source
  - Slow speed makes escape difficult
- Save/Load updated for ultravores

**Iteration 14:** Phase 17 In Progress - Sprite Migration:
- Created fishData.js with FISH_SPECIES object containing 8 species
  - Each species has: name, rarity, size, behavior, imageUrl, iconUrl, cost, coinType, coinValue, coinDropInterval
  - SIZE_CONFIG defines pixel sizes and speeds for sm/med/lg/xxl
  - COIN_TYPES and RARITY_COLORS exports
- Added imageCache and preloadFishImages() async function
- Replaced Guppy with Trout class (sprite-based)
  - Removed evolution system (no stage, timesEaten, checkEvolution)
  - Uses ctx.drawImage() with sprite, fallback to colored ellipse
  - Added `const Guppy = Trout` alias for backward compatibility
- Replaced Carnivore with Skellfin class (sprite-based)
  - Renamed findSmallGuppy() to findTrout()
  - Added `const Carnivore = Skellfin` alias
- Replaced Ultravore with MobiusDickens class (sprite-based)
  - Updated to drop $1500 chests (per FISH_SPECIES config)
  - Renamed findCarnivore() to findSkellfin()
  - Added `const Ultravore = MobiusDickens` alias
- Legacy arrays (guppies, carnivores) maintained for backward compatibility
- Still TODO: Crab class, special fish (WardenLamprey, Seeker, Anemone, Geotle), shop UI, save/load, game loop updates

**Iteration 15:** Added iteration tracking (2026-01-29)
- Added rule to CLAUDE.md requiring work to be documented in this file
- Created ITERATIONS.md to track development progress
- Migrated Status Log from PRD.md to this file

**Iteration 16:** Phase 18 Complete - New Fish (2026-01-29)
- Added WardenLamprey class: Attacks aliens dealing 2 damage/sec
  - Uses sprite from FISH_SPECIES.warden_lamprey
  - Prioritizes attacking aliens when present, otherwise wanders
  - No hunger system (doesn't need food)
  - Cost: $2000
- Added Seeker class: Auto-collects coins within 100px detection range
  - Searches for coins and beetles in collectRadius
  - Fast movement when pursuing collectibles
  - Cost: $5000
- Added Anemone class: Heals nearby fish -5 hunger/sec within 80px radius
  - Heals all fish types (trouts, guppies, skellfins, carnivores, breeders, geotles)
  - Very slow movement with pulsing animation
  - Visual healing radius indicator
  - Cost: $5000
- Added Geotle class: Spawns baby Trout every 25 seconds
  - Turtle-like appearance with shell
  - Eats pellets, spawns Trout when hunger < 70%
  - Cost: $4000
- Updated shop UI with 4 new buttons (Warden, Geotle, Seeker, Anemone)
- Updated save/load system for all new arrays (wardens, seekers, anemones, geotles, trouts, skellfins, mobiuses, crabs)
- Updated game loop to render all new fish arrays
- Added preloadFishImages() call in async init()
- Added legacy STAGES constant for backward compatibility with old saves
- Added missing legacy fish cost constants
- Fixed alien spawn timer to consider new fish arrays

**Iteration 18:** Phase 14 Complete - New Aliens (2026-01-30)
- Added Balrog class: Dark red demon alien with 100 HP, horns, fire aura
  - Never gets full - keeps eating fish until killed
  - Drops 8 gold coins on death (more than Sylvester)
  - Slower but larger than Sylvester
- Added Gus class: Green bloated creature that cannot be shot
  - Must be fed 20 pellets to defeat (explodes when full)
  - Grows/bloats visually as it eats pellets
  - Slows down as it bloats, displays pellet counter bar
  - Also hunts fish (prefers pellets when close)
  - Drops 10 gold coins when defeated
- Added Destructor class: Tank-like alien at bottom of screen
  - Fires homing Missile entities at random fish
  - Missiles can be shot down (3 HP each, click to damage)
  - Missiles have fire trail and home toward target
  - 75 HP, drops 7 gold coins on death
- Added Missile class for Destructor projectiles
- Added alien warning system:
  - 5-second countdown before alien spawns
  - Orange pulsing border and "ALIEN INCOMING IN X..." text
  - Gives player time to prepare
- Added alien wave system:
  - Track totalEarned across coin collections
  - After $10,000 total earned, aliens spawn in pairs
  - Random alien type selection for each spawn
- Added helper functions: findNearestAlien(), hasActiveAlien()
- Updated combat system to handle multiple aliens and missiles
- Updated Angie's revive mechanic to work with multiple aliens
- Updated save/load to persist totalEarned
- Combat overlay now shows alien-specific instructions

**Iteration 17:** Phase 13 Complete - Expanded Pet System (2026-01-30)
- Added pet shop UI section to index.html with dedicated #petShop div
- Added pet counter display showing "Pets: X/3"
- Moved Stinky button from main shop to pet shop section
- All 6 pets now have visible buy buttons with golden border styling:
  - Stinky ($500): Snail that collects floor coins (scaling cost)
  - Zorf ($400): Alien pet that drops pellets every 8s
  - Clyde ($550): Jellyfish that collects coins anywhere
  - Niko ($600): Seahorse that produces pearls every 40s
  - Itchy ($700): Swordfish that attacks aliens (2 dmg/sec)
  - Angie ($2000): Angel fish that revives one dead fish per attack
- Pet limit enforced: MAX_PETS = 3
- Added updatePetCounter() function to update UI counter
- Fixed init() to call updateAllPetButtons() for new games
- Note: Pet classes, buy functions, game loop, and save/load were already implemented in prior uncommitted work

**Iteration 19:** Phase 15 Complete - Quality of Life & Progression (2026-01-30)
- **Fish Counter UI**: Semi-transparent panel in top-left showing count of each fish type with color coding
  - Only displays fish types that have been purchased (cleans up UI)
  - Updates dynamically as fish are bought/die
- **Speed Toggle (1x/2x)**: Button to toggle game speed
  - All fish, pets, coins, and particles run at 2x speed
  - Alien spawn timer uses raw time to maintain balance
- **Auto-Collect Upgrade ($1000)**: Shop upgrade that collects all coins/beetles within 100px radius on click
  - Works during combat mode too
  - Shows visual collection of multiple items at once
- **Statistics Panel**: Toggle-able overlay showing:
  - Total earned, coins collected, fish bought, fish lost, aliens defeated
  - Time played (formatted as hours/minutes/seconds)
  - Current fish and pet counts
  - Achievement progress summary
- **Achievements System**: 7 achievements with popup notifications
  - First Friend (buy first fish), Predator (buy carnivore), Alien Slayer (defeat 10 aliens)
  - Millionaire (earn $100k), Full Tank (20+ fish), Pet Lover (all 6 pets), Survivor (30 min played)
  - Gold popup animation with star icon, 3-second display
- **Prestige System**: Reset game with permanent bonuses
  - Unlocks at $50,000 total earned
  - Prestige points = totalEarned / 10000
  - +10% starting gold per level, +5% fish speed per level, +5% coin drop rate per level
  - Prestige indicator shows level and bonuses in corner
- Updated save/load to persist all new state
- Added stats tracking: fishBought on all buy functions, totalFishLost on death, aliensDefeated on alien death

**Iteration 20:** PRD Refactoring - Split R1 into sub-phases (2026-01-30)
- Phase R1 (Module Split) was too large for a single session - context grew quickly
- Split into 7 discrete sub-phases (R1a through R1g):
  - R1a: Core fish module (Trout, Skellfin, MobiusDickens)
  - R1b: Support fish module (Breeder, Feeder, Starcatcher, Beetlemuncher, Crab, Geotle)
  - R1c: Utility fish module (WardenLamprey, Seeker, Anemone)
  - R1d: Aliens module (Sylvester, Balrog, Gus, Destructor, Missile)
  - R1e: Pets module (Stinky, Niko, Zorf, Itchy, Clyde, Angie)
  - R1f: Collectibles module (Pellet, Coin, Beetle)
  - R1g: Final cleanup (CLAUDE.md, verify save/load)
- Each sub-phase is completable in one session with checkpoint verification

**Iteration 21:** Added Completion Checklist to CLAUDE.md (2026-01-30)
- Added "Completion Checklist (Every Task)" section at bottom of CLAUDE.md
- Checklist reminds to: test code, update ITERATIONS.md, update CLAUDE.md if needed, mark PRD tasks complete
- Positioned at end of file so it's seen when wrapping up work

**Iteration 22:** Phase R1a Complete - Core Fish Module (2026-01-30)
- Created `entities/` directory for modular code organization
- Extracted Trout, Skellfin, MobiusDickens classes to `entities/fish.js` (716 lines)
- Implemented game context pattern: `setGameContext()` provides access to shared state
  - Fish classes access tankManager, imageCache, arrays, Coin, alien, sound, etc. via context
- main.js reduced from ~7500 to 6915 lines
- Exported backward compatibility aliases: Guppy = Trout, Carnivore = Skellfin, Ultravore = MobiusDickens
- Updated main.js imports to use fish module

**Iteration 23:** Phase R1b Complete - Support Fish Module (2026-01-30)
- Extracted 6 support fish classes to `entities/fish.js`:
  - Breeder (~230 lines): Spawns baby guppies every 20-30s
  - Feeder (~150 lines): Drops pellets every 15-20s, doesn't eat
  - Starcatcher (~250 lines): Bottom-dweller, eats stars, drops diamonds
  - Beetlemuncher (~280 lines): Green tadpole, hunts beetles, drops pearls
  - Crab (~230 lines): Bottom-dweller, jumps to hunt trouts, drops beetles
  - Geotle (~180 lines): Spawns baby trouts every 25s
- Extended game context with additional arrays: breeders, feeders, starcatchers, beetlemunchers, crabs, geotles, beetles
- Added Pellet class to game context for Feeder fish
- Added Guppycruncher alias (= Crab) for backward compatibility
- main.js reduced by ~1400 lines (from ~6900 to ~5500 lines)
- entities/fish.js expanded to ~1900 lines with all support fish

**Iteration 24:** Phase R1c Complete - Utility Fish Module (2026-01-30)
- Extracted 3 utility fish classes to `entities/fish.js`:
  - WardenLamprey (~115 lines): Attacks aliens, deals 2 damage/sec, no hunger
  - Seeker (~155 lines): Auto-collects coins within radius, no hunger
  - Anemone (~160 lines): Heals nearby fish (-5 hunger/sec), very slow movement
- Adapted classes to use game context pattern (`ctx.getAlien()`, `ctx.tankManager`, etc.)
- Added gold management functions to game context: getGold, setGold, addGold, getTotalEarned, addTotalEarned, updateGoldDisplay
- Removed ~460 lines of duplicate code from main.js
- entities/fish.js expanded to ~2500 lines with all fish classes

**Iteration 25:** Phase R1d Complete - Aliens Module (2026-01-30)
- Created `entities/aliens.js` with 5 alien classes (~1250 lines):
  - Sylvester (~415 lines): Basic alien, 50 HP, hunts fish, drops 5 gold coins
  - Balrog (~290 lines): Tougher alien, 100 HP, never gets full, drops 8 gold coins
  - Gus (~295 lines): Cannot be shot, must be fed 20 pellets to defeat, drops 10 gold coins
  - Missile (~115 lines): Homing projectile fired by Destructor, 3 HP
  - Destructor (~145 lines): Tank-like alien at bottom, fires missiles, 75 HP
- Implemented `setAlienContext()` pattern to provide shared state access:
  - tankManager, sound, spawnParticles, stats, getAngie(), arrays, Coin class
- Updated main.js imports to use aliens module
- Removed ~1200 lines from main.js (5134 -> 3937 lines)
- Renamed `ctx` parameter to `canvasCtx` in draw() methods to avoid confusion with game context

**Iteration 26:** Phase R1e & R1f Complete - Pets and Collectibles Modules (2026-02-01)
- Integrated `entities/pets.js` module with 6 pet classes (~1150 lines):
  - Stinky: Floor coin collector snail
  - Niko: Seahorse pearl producer ($500 every 40s)
  - Zorf: Alien pet food dropper (pellet every 8s)
  - Itchy: Swordfish alien attacker (2 dmg/sec)
  - Clyde: Jellyfish coin collector (anywhere in tank)
  - Angie: Angel fish that revives one fish per attack
- Integrated `entities/collectibles.js` module with 3 classes (~395 lines):
  - Pellet: Food item with upgraded variant
  - Coin: Currency (silver, gold, diamond, star, pearl, treasure)
  - Beetle: Floor-scuttling collectible ($150)
- Implemented context patterns for both modules:
  - `setPetsContext()`: tankManager, coins, aliens, pellets, gold accessors, sound, etc.
  - `setCollectiblesContext()`: tankManager, foodUpgraded, COIN_TYPES
  - `updateFoodUpgradedStatus()`: Syncs food upgrade state with module
- Updated pets.js to use function-based gold accessors (addGold, addTotalEarned)
- Added `initPetsContext()` call in init() function
- Removed ~1460 lines of duplicate class definitions from main.js (3986 -> 2528 lines)
- main.js now under 2600 lines (target was <2000, close!)

**Iteration 27:** Phase R1g - Final Cleanup (2026-02-01)
- Removed dead comments and placeholder code from main.js:
  - Removed "NOTE:" comments about moved classes
  - Removed "PLACEHOLDER" section for moved entities
  - Removed redundant import comments
- main.js reduced from 2531 to 2517 lines
- Updated CLAUDE.md file map with accurate line numbers:
  - TankManager at 55-95
  - SoundSystem at 305-420
  - Particle at 423-527
  - Save/Load at 530-890
  - Module Contexts at 950-1050
  - Purchase Functions at 1495-1720
  - Game Loop at 1750-2105
  - UI Drawing at 2155-2345
  - Debug Commands at 2420-2520
- Updated "Adding a New Fish" and "Adding a New Pet" tasks with correct line references
- Phase R1 (Module Split) is now complete except for manual testing verification

**Iteration 28:** Phase R2 Complete - EntityManager System (2026-02-01)
- Created `entities/EntityManager.js` (~160 lines) with unified entity management:
  - `CATEGORY_CONFIG` defines removal conditions and draw layers for each entity type
  - `register(name, array, category)` - registers entity arrays with the manager
  - `setContext(context)` - provides special update args (missiles for Destructor)
  - `updateAll(dt)` - updates all entities and removes dead ones
  - `drawAll(ctx)` - draws entities in layer order (0=pellets, 6=particles)
  - `getByCategory(category)` - query entities by type
  - `getArray(name)` - get specific array by name
- Registered 25+ entity arrays in main.js with categories:
  - fish: trouts, skellfins, mobiuses, crabs, breeders, starcatchers, beetlemunchers, geotles, guppies, carnivores, ultravores, guppycrunchers
  - permanentFish: wardens, feeders, seekers, anemones
  - pellet, coin, beetle: collectibles
  - alien, missile: combat entities
  - pet: stinkies, nikos, zorfs, itchys, clydes
  - particle: visual effects
- Draw layer order: 0=pellets, 1=beetles, 2=fish, 3=coins, 4=pets, 5=aliens/missiles, 6=particles
- Angie singleton handled separately (not in array system)
- **Game loop reduced from ~250 lines to ~25 lines** (target was 50, exceeded!)
- main.js reduced from ~2570 to ~2340 lines (230 lines saved)
- Save/load compatibility maintained - EntityManager references existing arrays

**Iteration 29:** Phase R3 Complete - Legacy Code Removal (2026-02-02)
- Removed all legacy class aliases from `entities/fish.js`:
  - Removed `Guppy = Trout`, `Carnivore = Skellfin`, `Ultravore = MobiusDickens`, `Guppycruncher = Crab`
- Removed legacy arrays from `main.js`:
  - Removed `guppies[]`, `carnivores[]`, `ultravores[]`, `guppycrunchers[]`
  - Removed legacy cost aliases (GUPPY_COST, CARNIVORE_COST, etc.)
  - Removed EntityManager registrations for legacy arrays
- Updated save/load system:
  - Removed legacy fish from saveGame()
  - Added migration in loadGame() to convert old saves (guppies→trouts, carnivores→skellfins, etc.)
- Updated all context providers:
  - Removed legacy arrays from `setGameContext()` and `setAlienContext()`
  - Updated `entities/fish.js` and `entities/aliens.js` to use only new fish types
- Updated buy functions:
  - Renamed `buyGuppy()` → `buyTrout()`, `buyCarnivore()` → `buySkellfin()`
  - Renamed `buyGuppycruncher()` → `buyCrab()`, `buyUltravore()` → `buyMobius()`
- Updated `index.html`:
  - Renamed buttons and CSS IDs to match new fish names
- Updated helper functions:
  - `getTotalFishCount()`, `checkAchievements()`, `doPrestige()`, `drawFishCounterUI()`, `hasFish` check
- Updated fish behavior:
  - Breeder now spawns Trouts instead of Guppies
  - Anemone healing simplified to use only current fish arrays
  - Alien targeting uses only current fish arrays
- Code reduction: Removed ~800 lines of duplicate/legacy code
- Backward compatibility: Old saves automatically migrate to new fish types on load

---

<!-- Template for new entries:

## YYYY-MM-DD

### Feature/Change name
- What was done
- Why it was done
- Any relevant details or decisions made

-->
