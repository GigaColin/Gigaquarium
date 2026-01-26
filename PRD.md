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
| King Guppy | Pellets | Diamond ($200) | Final evolution stage |
| Carnivore | Small Guppies | Diamond ($200) | Eats living fish to survive |

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
- [x] Coin Timeout: Coins flash and disappear after 10 seconds if not collected
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

### Phase 6: Automation (Pets)
- [x] Stinky the Snail: Moves along tank bottom, auto-collects floor coins
- [x] Pet purchase system: $500, one-time purchase, button disables after buying

### Phase 7: Polish & Persistence
- [x] Sound effects (feeding, coin collect, evolution, alien warning, hits, death, buy, victory)
- [x] LocalStorage save/load with auto-save every 30 seconds
- [x] Particle effects (bubbles, sparkles on evolution, coin sparkles, blood on alien hit)

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
