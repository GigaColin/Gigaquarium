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

---

<!-- Template for new entries:

## YYYY-MM-DD

### Feature/Change name
- What was done
- Why it was done
- Any relevant details or decisions made

-->
