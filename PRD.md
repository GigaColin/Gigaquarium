# PRD: Gigaquarium (Insaniquarium Clone)

## Project Vision
A high-fidelity web recreation of the "Feed-Grow-Collect" loop. Prioritize "game feel" (satisfying clicks, bouncy physics) and the tiered fish economy.

## Tech Stack
- **Engine:** Vanilla Canvas API (lightweight, no dependencies)
- **Bundler:** Vite (fast HMR and localhost serving)
- **Language:** JavaScript (ES6+)
- **Storage:** LocalStorage for save games (future phase)

## Core Game Data (Wiki-Accurate)

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
- [ ] Niko ($600): Seahorse that produces pearls ($250) every 40 seconds passively
- [ ] Zorf ($400): Alien pet that drops food pellets every 8 seconds (better than Feeder fish)
- [ ] Itchy ($700): Swordfish that attacks aliens, dealing 2 damage per second when alien present
- [ ] Clyde ($550): Jellyfish that floats around collecting coins anywhere (not just floor)
- [ ] Angie ($2000): Angelic fish that can revive ONE dead fish per alien attack
- [ ] Pet Limit: Maximum 3 pets active at once

### Phase 14: New Aliens
- [ ] Balrog: Tougher alien (100 HP), doesn't get full - keeps eating until killed
- [ ] Gus: Cannot be shot - must be fed 20 pellets until he explodes (drops 10 gold coins)
- [ ] Destructor: Sits at bottom, fires homing missiles at fish (missiles can be shot down, 3 HP each)
- [ ] Alien Waves: After reaching $10,000 total earned, aliens spawn in pairs
- [ ] Boss Warning: 5-second warning before alien spawns with audio cue

### Phase 15: Quality of Life & Progression
- [ ] Fish Counter UI: Show count of each fish type in corner
- [ ] Auto-Collect Upgrade ($1000): Coins within radius of click are collected
- [ ] Speed Toggle: 1x / 2x game speed button
- [ ] Statistics Panel: Track total earned, fish lost, aliens defeated
- [ ] Achievements: Unlock badges for milestones (first King Guppy, defeat 10 aliens, etc.)
- [ ] Prestige System: Reset with permanent bonuses (start with more gold, faster fish, etc.)

### Phase 16: Virtual Tank Mode
- [ ] Sandbox Mode: Unlimited money, no aliens, just watch fish
- [ ] Custom Tank: Change background color/theme
- [ ] Fish Renaming: Click fish to give them names
- [ ] Screenshot Mode: Hide UI and capture tank image
- [ ] Ambient Mode: Fish swim slower, relaxing background music option

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
