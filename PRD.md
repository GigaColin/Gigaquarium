# PRD: Gigaquarium (Insaniquarium Clone)

## Project Vision
A high-fidelity web recreation of the "Feed-Grow-Collect" loop. Prioritize "game feel" (satisfying clicks, bouncy physics) and the tiered fish economy.

## Tech Stack
- **Engine:** Vanilla Canvas API (lightweight, no dependencies)
- **Bundler:** Vite (fast HMR and localhost serving)
- **Language:** JavaScript (ES6+)
- **Storage:** LocalStorage for save games (future phase)

## Core Game Data (Sprite-Based)

| Entity | Food Source | Drops | Notes |
|--------|-------------|-------|-------|
| Trout | Pellets | Silver ($15) | Basic fish, no evolution |
| Skellfin | Trouts | Diamond ($200) | Predator, attacks aliens |
| MobiusDickens | Skellfins | Chest ($1500) | Apex predator, slow but high value |
| Crab | Trouts | Beetle ($150) | Bottom-dweller, jumps to catch fish |
| Breeder | Pellets | None | Spawns baby Trouts over time |
| Feeder | None | Pellets | Drops food every 15-20s, doesn't eat |
| Starcatcher | Stars | Diamond ($200) | Bottom-dweller, mouth faces up |
| Beetlemuncher | Beetles | Pearl ($500) | Tadpole-like, eats beetles from floor |
| WardenLamprey | None | None | Attacks aliens (2 dmg/sec) |
| Seeker | None | None | Auto-collects coins within range |
| Anemone | None | None | Heals nearby fish (-5 hunger/sec) |
| Geotle | Pellets | None | Spawns baby Trout every 25s |

### Legacy Core Game Data (Pre-Sprite, with Evolution)

| Entity | Food Source | Drops | Growth/Notes |
|--------|-------------|-------|--------------|
| Guppy (S) | Pellets | None | Evolves to (M) after 3 feedings |
| Guppy (M) | Pellets | Silver ($15) | Evolves to (L) after 5 more feedings |
| Guppy (L) | Pellets | Gold ($35) | Evolves to King after 10 more feedings |
| King Guppy | Pellets | Diamond ($200) | Evolves to Star after 15 more feedings |
| Star Guppy | Pellets | Star ($40) | Final evolution - stars float upward |
| Carnivore | Small Guppies | Diamond ($200) | Eats living fish to survive, attacks aliens |
| Breeder | Pellets | None | Slowly spawns small guppies over time |
| Feeder | None | Pellets | Drops food every 15-20s, doesn't eat |
| Starcatcher | Stars | Diamond ($200) | Bottom-dweller, mouth faces up |
| Guppycruncher | Small Guppies | Beetle ($150) | Crab on tank bottom, jumps to catch fish |
| Beetlemuncher | Beetles | Pearl ($500) | Tadpole-like, eats beetles from floor |
| Ultravore | Carnivores | Chest ($2000) | Apex predator, slow but high value |

### Pets
| Pet | Cost | Ability |
|-----|------|---------|
| Stinky | $500+ | Snail that collects floor coins |
| Niko | $600 | Produces pearls ($250) every 40s |
| Zorf | $400 | Drops food pellets every 8s |
| Itchy | $700 | Attacks aliens (2 dmg/sec) |
| Clyde | $550 | Collects coins anywhere (not just floor) |
| Angie | $2000 | Revives one dead fish per attack |

### Aliens
| Alien | HP | Behavior |
|-------|-----|----------|
| Sylvester | 50 | Eats fish one at a time |
| Balrog | 100 | Never gets full, keeps eating |
| Gus | N/A | Fed to death (20 pellets) |
| Destructor | 75 | Fires homing missiles from bottom |

## Core Loop Task List

### Phase 1: The Foundation (Project Scaffolding)
- [x] Initialize Vite project with Canvas API
- [x] Create game canvas with dark blue gradient background (the "Tank")
- [x] Implement TankManager class for screen constraints and boundary clamping
- [x] Add GoldDisplay UI element
- [x] Spawn 2 starter guppies

### Phase 2: The "Guppy Loop" (State Machines)
- [x] Fish Movement: Implement random "Wander" steering behavior
- [x] Hunger System: Fish turn red when Hunger > 50%
- [x] Death Animation: Fish float to top, flip upside down, fade out
- [x] Feeding Logic: Clicking spawns a Pellet ($5 cost)
- [x] Targeting: Hungry fish seek nearest pellet
- [x] Growth System: Track feedings, evolve Small (3) → Medium (5) → Large (10) → King
- [x] Visual Feedback: Size scales up, dorsal fin on large+, crown on king

### Phase 3: The Economy (Collect & Spend)
- [x] Coin Dropping: Medium guppies drop Silver ($15), Large drop Gold ($35), Kings drop Diamond ($200)
- [x] Drop Timer: Coins drop every 10-15 seconds per fish
- [x] Coin Physics: Coins sink slowly with wobble effect
- [~] Coin Timeout: ~~Coins flash and disappear after 10 seconds~~ → Phase 8: coins persist forever
- [x] Coin Collection: Clicking a coin adds value to TotalGold
- [x] Shop UI: Top-bar with "Buy Guppy" ($100) and "Upgrade Food" ($200)
- [x] Food Upgrade: Upgraded pellets set hunger to -25 (50% longer before hungry)

### Phase 4: Threat & Defense (Aliens)
- [x] Alien Spawn: Sylvester warps in every 60-90 seconds
- [x] Alien AI: Sylvester pursues and eats the nearest fish
- [x] Combat Mode: While alien present, clicks damage alien instead of dropping food
- [x] Alien Health: Sylvester has 50 HP (1 damage per click)
- [x] Victory Reward: Defeated alien drops 5 Gold Coins

### Phase 5: Carnivore Fish
- [x] Carnivore Purchase: Add to shop ($1000)
- [x] Carnivore AI: Hunts and eats Small guppies when hungry (>40%)
- [x] Carnivore Drops: Drops Diamond ($200) every 15 seconds
- [x] Balance: High risk/reward - faster when hunting, visual warning when hungry
- [x] **Phase 8 Addition:** Carnivores attack aliens when present

### Phase 6: Automation (Pets)
- [x] Stinky the Snail: Moves along tank bottom, auto-collects floor coins
- [x] Pet purchase system: $500, one-time purchase, button disables after buying

### Phase 7: Polish & Persistence
- [x] Sound effects (feeding, coin collect, evolution, alien warning, hits, death, buy, victory)
- [x] LocalStorage save/load with auto-save every 30 seconds
- [x] Particle effects (bubbles, sparkles on evolution, coin sparkles, blood on alien hit)

### Phase 8: Balance & New Content
- [x] Carnivore vs Alien: Carnivores attack Sylvester when he arrives (deals damage over time)
- [x] Coin Persistence: Remove coin expiration - coins stay until collected
- [x] Breeder Fish: New fish type ($750) that slowly spawns small guppies every 20-30 seconds
- [x] Weapon Upgrade: "Laser Upgrade" ($300) - clicks deal 3 damage to alien instead of 1
- [x] Alien Lethality: Ensure alien actively kills fish on contact (visual death effect)

### Phase 9: Balance and Polish
- [x] Carnivore Resilience: Aliens take 2 seconds to kill a carnivore (instead of instant), giving it time to fight back
- [x] Hungry Speed Boost: Fish move 30% faster when hunger > 50%
- [x] Satiation Cap: Fish ignore pellets when hunger < 10 (prevents food waste)
- [x] Multiple Stinkies: Allow purchasing additional Stinkies ($500 + $250 per owned)
- [x] Feeder Fish ($1500): Slow orange fish that drops a pellet every 15-20 seconds; doesn't need to eat

### Phase 10: Star Guppies & Starcatcher
- [x] Star Guppy Evolution: King Guppies can evolve to "Star Guppy" after 15 more feedings
- [x] Star Drops: Star Guppies drop Stars ($40) instead of Diamonds - stars float upward slowly
- [x] Starcatcher ($1200): Purple bottom-dwelling fish that eats stars (mouth on top)
- [x] Starcatcher Diamonds: Well-fed Starcatcher produces Diamonds ($200) every 12 seconds
- [x] Visual: Stars have sparkle effect, Starcatcher has unique upward-facing design

### Phase 11: Bottom-Dweller Food Chain
- [x] Guppycruncher ($800): Crab-like creature confined to tank bottom, jumps up to eat small guppies
- [x] Beetle Drops: Guppycruncher drops Beetles ($150) instead of diamonds
- [x] Beetles: New collectible that scuttles along tank bottom (doesn't sink like coins)
- [x] Beetlemuncher ($1000): Green tadpole-like fish that eats beetles
- [x] Pearl Drops: Beetlemuncher produces Pearls ($500) every 20 seconds when fed
- [x] Food Chain: Guppy → Guppycruncher → Beetle → Beetlemuncher → Pearl

### Phase 12: Ultravore (Apex Predator)
- [x] Ultravore ($5000): Massive silver prehistoric fish - the ultimate predator
- [x] Diet: Eats Carnivores when hungry (not guppies)
- [x] Treasure Chest: Drops Treasure Chests ($2000) every 25 seconds
- [x] Vulnerability: Very slow, large target - aliens prioritize it
- [x] Risk/Reward: Highest income but expensive to replace and needs carnivore supply

### Phase 13: Expanded Pet System
- [x] Niko ($600): Seahorse that produces pearls ($250) every 40 seconds passively
- [x] Zorf ($400): Alien pet that drops food pellets every 8 seconds (better than Feeder fish)
- [x] Itchy ($700): Swordfish that attacks aliens, dealing 2 damage per second when alien present
- [x] Clyde ($550): Jellyfish that floats around collecting coins anywhere (not just floor)
- [x] Angie ($2000): Angelic fish that can revive ONE dead fish per alien attack
- [x] Pet Limit: Maximum 3 pets active at once

### Phase 14: New Aliens
- [x] Balrog: Tougher alien (100 HP), doesn't get full - keeps eating until killed
- [x] Gus: Cannot be shot - must be fed 20 pellets until he explodes (drops 10 gold coins)
- [x] Destructor: Sits at bottom, fires homing missiles at fish (missiles can be shot down, 3 HP each)
- [x] Alien Waves: After reaching $10,000 total earned, aliens spawn in pairs
- [x] Boss Warning: 5-second warning before alien spawns with audio cue

### Phase 15: Quality of Life & Progression - COMPLETE
- [x] Fish Counter UI: Show count of each fish type in corner
- [x] Auto-Collect Upgrade ($1000): Coins within radius of click are collected
- [x] Speed Toggle: 1x / 2x game speed button
- [x] Statistics Panel: Track total earned, fish lost, aliens defeated
- [x] Achievements: Unlock badges for milestones (first fish, defeat 10 aliens, etc.)
- [x] Prestige System: Reset with permanent bonuses (start with more gold, faster fish, etc.)

### Phase 16: Virtual Tank Mode
- [ ] Sandbox Mode: Unlimited money, no aliens, just watch fish
- [ ] Custom Tank: Change background color/theme
- [ ] Fish Renaming: Click fish to give them names
- [ ] Screenshot Mode: Hide UI and capture tank image
- [ ] Ambient Mode: Fish swim slower, relaxing background music option

### Phase 17: Sprite Migration
- [x] Create fishData.js with FISH_SPECIES configuration (name, rarity, size, behavior, imageUrl, iconUrl, cost, coinType, coinValue, coinDropInterval)
- [x] Add SIZE_CONFIG with pixel sizes and speeds for sm/med/lg/xxl
- [x] Add image preloading system with imageCache and preloadFishImages()
- [x] Replace Guppy class with Trout (sprite-based, no evolution)
- [x] Replace Carnivore class with Skellfin (sprite-based)
- [x] Replace Ultravore class with MobiusDickens (sprite-based, $1500 chests)
- [x] Replace Guppycruncher class with Crab (sprite-based)

### Phase 18: New Fish
- [x] Add WardenLamprey class: Attacks aliens, deals 2 damage/sec
- [x] Add Seeker class: Auto-collects coins within detection range
- [x] Add Anemone class: Heals nearby fish (-5 hunger/sec)
- [x] Add Geotle class: Spawns baby Trout every 25 seconds
- [x] Update shop UI with new fish names and costs
- [x] Update save/load system for new fish types (remove evolution data)
- [x] Update game loop to render new fish arrays
- [x] Call preloadFishImages() in init() with loading state

---

## Refactoring Phases (Developer Efficiency)

### Phase R1: Module Split (High Priority)
Split main.js (~7500 lines) into logical modules for better maintainability.

**Target:** main.js < 2000 lines, each entity module < 1500 lines

#### R1a: Core Fish Module
- [x] Create `entities/` directory
- [x] Create `entities/fish.js` with Trout, Skellfin, MobiusDickens
- [x] Export classes and update main.js imports
- [x] Verify game still runs (requires manual testing)

#### R1b: Support Fish Module
- [x] Add Breeder, Feeder, Starcatcher, Beetlemuncher, Crab, Geotle to `entities/fish.js`
- [x] Update main.js imports
- [x] Verify all fish types spawn and behave correctly

#### R1c: Utility Fish Module
- [x] Add WardenLamprey, Seeker, Anemone to `entities/fish.js`
- [x] Update main.js imports
- [x] Verify utility fish abilities work (alien damage, coin collection, healing)

#### R1d: Aliens Module
- [x] Create `entities/aliens.js` with Sylvester, Balrog, Gus, Destructor, Missile
- [x] Update main.js imports
- [x] Verify alien spawning and combat still works

#### R1e: Pets Module
- [x] Create `entities/pets.js` with Stinky, Niko, Zorf, Itchy, Clyde, Angie
- [x] Update main.js imports
- [ ] Verify pet abilities work (requires manual testing)

#### R1f: Collectibles Module
- [x] Create `entities/collectibles.js` with Pellet, Coin, Beetle
- [x] Update main.js imports
- [ ] Verify dropping, sinking, and collection works (requires manual testing)

#### R1g: Final Cleanup
- [ ] Verify save/load works with module structure (requires manual testing)
- [x] Update CLAUDE.md file map with new structure
- [x] Remove any dead code from main.js

### Phase R2: EntityManager System (High Priority)
Replace 20+ repetitive update/draw loops with a unified entity management system.

- [x] Create `EntityManager` class with `register()`, `updateAll()`, `drawAll()`, `cleanup()` methods
- [x] Define entity interface: `{ update(dt), draw(ctx), state, x, y }`
- [x] Migrate fish arrays to EntityManager
- [x] Migrate alien arrays to EntityManager
- [x] Migrate pet arrays to EntityManager
- [x] Migrate collectible arrays (coins, pellets, beetles) to EntityManager
- [x] Simplify game loop to single `entityManager.tick(dt, ctx)` call
- [x] Add entity type filtering for targeted operations (e.g., `getAll('fish')`)

**Target:** Game loop reduced from ~300 lines to ~50 lines - ACHIEVED

### Phase R3: Legacy Code Removal (High Priority) - COMPLETE
Remove dual legacy/sprite code paths to reduce complexity by ~30%.

- [x] Remove legacy `Guppy` class (keep `Trout` only)
- [x] Remove legacy `Carnivore` class (keep `Skellfin` only)
- [x] Remove legacy `Ultravore` class (keep `MobiusDickens` only)
- [x] Remove legacy `Guppycruncher` class (keep `Crab` only)
- [x] Remove `guppies[]`, `carnivores[]`, `ultravores[]`, `guppycrunchers[]` arrays
- [x] Remove class aliases (Guppy = Trout, etc.)
- [x] Update save/load to only use new fish types (with migration for old saves)
- [x] Remove legacy shop buttons from index.html
- [x] Update CLAUDE.md to remove legacy references

**Target:** Remove ~1000 lines of duplicate code - ACHIEVED

### Phase R4: Sync Alien Constants (Medium Priority)
Align ALIEN_STATS in constants.js with actual class implementations.

- [ ] Audit Sylvester class - compare HP, speed, damage to ALIEN_STATS
- [ ] Audit Balrog class - compare HP, speed, damage to ALIEN_STATS
- [ ] Audit Gus class - compare feedingsToKill to ALIEN_STATS
- [ ] Audit Destructor class - compare HP, speed, missileInterval to ALIEN_STATS
- [ ] Audit Missile class - compare HP, speed to ALIEN_STATS
- [ ] Refactor alien classes to use `ALIEN_STATS[type]` for all stats
- [ ] Remove hardcoded values from alien constructors

**Target:** Single source of truth for alien stats

### Phase R5: Centralize Magic Numbers (Medium Priority)
Move remaining hardcoded values to constants.js.

- [ ] Add `HUNGER` constants: `{ warning: 50, death: 100, full: 10, healRate: 5 }`
- [ ] Add `SPEED_MULTIPLIERS`: `{ hungryBoost: 1.3, slowSwim: 0.5, fastSwim: 1.5 }`
- [ ] Add `SEARCH_RADII`: `{ pellet: Infinity, coin: 100, heal: 150, autoCollect: 100 }`
- [ ] Add `INTERVALS`: fish-specific coin drop timers, spawn timers
- [ ] Update all fish classes to use centralized constants
- [ ] Update CLAUDE.md Constants Reference section

**Target:** No magic numbers in entity classes

### Phase R6: Generic Button State Manager (Lower Priority)
Replace 6 identical pet button update functions with one generic function.

- [ ] Create `updateButtonState(buttonId, cost, isDisabled, customText)` utility
- [ ] Refactor `updateNikoButtonState()` to use generic function
- [ ] Refactor `updateZorfButtonState()` to use generic function
- [ ] Refactor `updateItchyButtonState()` to use generic function
- [ ] Refactor `updateClydeButtonState()` to use generic function
- [ ] Refactor `updateAngieButtonState()` to use generic function
- [ ] Refactor `updateStinkyButtonState()` to use generic function
- [ ] Consider data-driven button configuration

**Target:** ~50 lines reduced to ~15 lines

---

*See [ITERATIONS.md](ITERATIONS.md) for development history and change log.*
