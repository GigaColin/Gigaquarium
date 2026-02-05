# Sprite-Based Fish Migration Progress

## Date: 2026-01-29

## Overview
Migrating from canvas-drawn fish to sprite-based fish loaded from IPFS URLs.

## Completed Work

### 1. Created fishData.js (NEW FILE)
- Contains `FISH_SPECIES` object with all 8 fish species
- Each species has: name, rarity, size, behavior, imageUrl, iconUrl, cost, coinType, coinValue, coinDropInterval
- Contains `SIZE_CONFIG` with pixel sizes and speeds for sm/med/lg/xxl
- Contains `COIN_TYPES` and `RARITY_COLORS` exports

### 2. Updated main.js - Top Section
- Added import for fishData.js
- Added `imageCache` object and `preloadFishImages()` async function
- Updated cost constants to use `FISH_SPECIES.xxx.cost`
- Added new fish arrays: `trouts`, `skellfins`, `mobiuses`, `crabs`, `wardens`, `seekers`, `anemones`, `geotles`
- Removed `STAGES` evolution configuration (replaced with comment)

### 3. Replaced Guppy Class with Trout Class
- New sprite-based `Trout` class that uses `imageCache['trout']`
- Removed evolution system (no stage, timesEaten, checkEvolution, evolve methods)
- Fixed coin dropping to use species config
- Added Anemone healing check in update()
- Draw method uses ctx.drawImage() with sprite, has fallback colored ellipse
- Added `const Guppy = Trout;` alias for backward compatibility

### 4. Replaced Carnivore Class with Skellfin Class
- New sprite-based `Skellfin` class using `imageCache['skellfin']`
- Updated size/speed from SIZE_CONFIG
- Renamed `findSmallGuppy()` to `findTrout()` - searches both `trouts` and `guppies` arrays
- Draw method uses sprite with fallback
- Added `const Carnivore = Skellfin;` alias

### 5. Replaced Ultravore Class with MobiusDickens Class
- New sprite-based class using `imageCache['mobius_dickens']`
- Updated coin drop to use species config ($1500 chests)
- Renamed `findCarnivore()` to `findSkellfin()` - searches both `skellfins` and `carnivores`
- Draw method uses sprite with fallback
- Added `const Ultravore = MobiusDickens;` alias

### 6. Replaced Guppycruncher Class with Crab Class
- New sprite-based `Crab` class using `imageCache['crab']`
- Updated constructor to use SIZE_CONFIG and FISH_SPECIES.crab
- Updated coin production to use species config (beetle coins)
- Renamed `findSmallGuppy()` to `findTrout()` - searches both `trouts` and `guppies` arrays
- Draw method uses sprite with fallback colored shape
- Added `const Guppycruncher = Crab;` alias for backward compatibility

### 7. Fixed Skellfin Class Syntax Error
- Removed premature closing brace that left update() and draw() outside the class

## PHASE 17 COMPLETE ✓

All 4 fish classes have been migrated to sprite-based rendering:
- Trout (was Guppy)
- Skellfin (was Carnivore)
- MobiusDickens (was Ultravore)
- Crab (was Guppycruncher)

## PHASE 18 COMPLETE ✓

All 4 new special fish classes have been added:

1. **WardenLamprey** - Attacks aliens, deals 2 damage/sec
   - Uses sprite from imageCache['warden_lamprey']
   - No hunger system - just attacks aliens
   - Cost: $2000

2. **Seeker** - Auto-collects coins within 100px range
   - Uses sprite from imageCache['seeker']
   - Collects coins and beetles automatically
   - Cost: $5000

3. **Anemone** - Heals nearby fish (-5 hunger/sec) within 80px
   - Uses sprite from imageCache['anemone']
   - Heals all fish types in radius
   - Very slow movement, pulsing animation
   - Cost: $5000

4. **Geotle** - Spawns baby Trout every 25 seconds
   - Uses sprite from imageCache['geotle']
   - Eats pellets like other fish
   - Cost: $4000

### Shop System Updated:
- index.html has 4 new buttons (Warden, Geotle, Seeker, Anemone)
- main.js has buyWarden(), buySeeker(), buyAnemone(), buyGeotle() functions
- All exposed to window object for onclick handlers

### Save/Load System Updated:
- saveGame() includes wardens, seekers, anemones, geotles, trouts, skellfins, mobiuses, crabs
- loadGame() restores all new fish arrays

### Game Loop Updated:
- All new arrays have update/draw loops
- preloadFishImages() called in async init()
- Alien spawn timer considers new fish arrays

## File Locations
- `/Users/colinmagerle/Documents/Claude Workspace/Gigaquarium/fishData.js` - NEW
- `/Users/colinmagerle/Documents/Claude Workspace/Gigaquarium/main.js` - MODIFIED
- `/Users/colinmagerle/Documents/Claude Workspace/Gigaquarium/index.html` - NEEDS UPDATE
- `/Users/colinmagerle/Documents/Claude Workspace/Gigaquarium/PRD.md` - NEEDS UPDATE

## Known Issues
- The `guppies` and `carnivores` arrays are still being used by legacy code
- Need to update all references or keep both old and new arrays
- Game loop doesn't yet render the new fish arrays
- preloadFishImages() is defined but not called in init()

## Fish Mapping
| Old Class | New Class | Sprite Key |
|-----------|-----------|------------|
| Guppy | Trout | 'trout' |
| Carnivore | Skellfin | 'skellfin' |
| Ultravore | MobiusDickens | 'mobius_dickens' |
| Guppycruncher | Crab | 'crab' |
| (new) | WardenLamprey | 'warden_lamprey' |
| (new) | Seeker | 'seeker' |
| (new) | Anemone | 'anemone' |
| (new) | Geotle | 'geotle' |
