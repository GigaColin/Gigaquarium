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

## NOT YET COMPLETED

### Still Need To Do:
1. **Guppycruncher -> Crab**: Need to find and update this class (search showed no matches - may have been removed or renamed already)

2. **Add Special Fish Classes** (Task #5):
   - WardenLamprey (attacks aliens, 2 dmg/sec)
   - Seeker (auto-collects coins in range)
   - Anemone (heals nearby fish -5 hunger/sec)
   - Geotle (spawns baby Trout every 25s)

3. **Update Shop System** (Task #6):
   - Update index.html buttons with new names/costs
   - Update buy functions in main.js

4. **Update Save/Load System** (Task #7):
   - Modify saveGame() and loadGame() for new fish types
   - Remove evolution data (stage, timesEaten)

5. **Update PRD.md** (Task #8):
   - Add Phase 17 documentation
   - Update fish table

6. **Update Game Loop**:
   - Add rendering loops for new fish arrays (trouts, skellfins, mobiuses, etc.)
   - Call preloadFishImages() in init()

7. **Update init() function**:
   - Call `await preloadFishImages()` before game starts
   - Show loading state while images load

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
