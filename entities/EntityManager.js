// EntityManager - Unified entity update/draw system
// Reduces game loop from ~300 lines to ~50 lines

// Category configuration with removal conditions and draw layers
const CATEGORY_CONFIG = {
  fish: {
    shouldRemove: (e) => e.state === 'dead',
    layer: 2
  },
  permanentFish: {
    shouldRemove: null, // Never auto-remove
    layer: 2
  },
  coin: {
    shouldRemove: (e) => e.collected || e.escaped,
    layer: 3
  },
  beetle: {
    shouldRemove: (e) => e.collected,
    layer: 1
  },
  pellet: {
    shouldRemove: null, // Fish handle pellet removal via eating
    layer: 0
  },
  alien: {
    shouldRemove: (e) => e.dead,
    layer: 5,
    // Destructor needs special update args
    getUpdateArgs: (e, context) => {
      if (e.type === 'destructor') {
        return [context.missiles];
      }
      return [];
    }
  },
  missile: {
    shouldRemove: (e) => e.dead,
    layer: 5
  },
  particle: {
    shouldRemove: (e) => e.dead,
    layer: 6
  },
  pet: {
    shouldRemove: null, // Pets are permanent
    layer: 4
  }
};

/**
 * EntityManager - Manages update/draw cycles for all game entities
 * Replaces repetitive loops in game loop with unified system
 */
export class EntityManager {
  constructor() {
    // Map of array name -> { array, category }
    this.registered = new Map();
    // Context for entities needing extra update args (e.g., missiles for Destructor)
    this.context = {};
    // Cache sorted arrays for drawing
    this._sortedForDraw = null;
  }

  /**
   * Register an array of entities with the manager
   * @param {string} name - Unique name for the array (e.g., 'trouts')
   * @param {Array} array - The array to manage
   * @param {string} category - Category from CATEGORY_CONFIG
   */
  register(name, array, category) {
    if (!CATEGORY_CONFIG[category]) {
      console.warn(`EntityManager: Unknown category "${category}" for "${name}"`);
    }
    this.registered.set(name, { array, category });
    this._sortedForDraw = null; // Invalidate cache
  }

  /**
   * Set context for special update arguments
   * @param {object} context - Object with arrays/values needed by some entities
   */
  setContext(context) {
    this.context = context;
  }

  /**
   * Update all registered entities and remove dead ones
   * @param {number} dt - Delta time in seconds
   */
  updateAll(dt) {
    for (const [name, { array, category }] of this.registered) {
      const config = CATEGORY_CONFIG[category];
      if (!config) continue;

      // Update and optionally remove entities
      for (let i = array.length - 1; i >= 0; i--) {
        const entity = array[i];

        // Get any special update arguments
        const updateArgs = config.getUpdateArgs
          ? config.getUpdateArgs(entity, this.context)
          : [];

        // Update the entity
        entity.update(dt, ...updateArgs);

        // Check for removal
        if (config.shouldRemove && config.shouldRemove(entity)) {
          array.splice(i, 1);
        }
      }
    }
  }

  /**
   * Draw all registered entities in layer order
   * @param {CanvasRenderingContext2D} ctx - Canvas rendering context
   */
  drawAll(ctx) {
    // Build sorted array if not cached
    if (!this._sortedForDraw) {
      this._sortedForDraw = Array.from(this.registered.entries())
        .map(([name, { array, category }]) => ({
          name,
          array,
          layer: CATEGORY_CONFIG[category]?.layer ?? 0
        }))
        .sort((a, b) => a.layer - b.layer);
    }

    // Draw in layer order (lowest first = background)
    for (const { array } of this._sortedForDraw) {
      for (const entity of array) {
        entity.draw(ctx);
      }
    }
  }

  /**
   * Get all entities matching a category
   * @param {string} category - Category name
   * @returns {Array} All entities in that category
   */
  getByCategory(category) {
    const result = [];
    for (const [, { array, category: cat }] of this.registered) {
      if (cat === category) {
        result.push(...array);
      }
    }
    return result;
  }

  /**
   * Get a specific registered array by name
   * @param {string} name - The array name
   * @returns {Array|null} The array or null if not found
   */
  getArray(name) {
    const entry = this.registered.get(name);
    return entry ? entry.array : null;
  }

  /**
   * Get all registered array names
   * @returns {string[]} Array of registered names
   */
  getRegisteredNames() {
    return Array.from(this.registered.keys());
  }

  /**
   * Invalidate the draw cache (call after registering new arrays)
   */
  invalidateCache() {
    this._sortedForDraw = null;
  }
}

export default EntityManager;
