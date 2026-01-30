// Fish Species Data Module
// Contains all 8 fish species with IPFS image URLs and configurations

export const FISH_SPECIES = {
  trout: {
    name: 'Trout',
    rarity: 'common',
    size: 'med',
    behavior: 'basic',
    imageUrl: 'https://jade-decent-lizard-287.mypinata.cloud/ipfs/bafkreicqxdcnkgdfapues6t2vobsvmyyp2ljfre7btmwdogxp47ghwzxgu',
    iconUrl: 'https://jade-decent-lizard-287.mypinata.cloud/ipfs/bafkreidmlnnpup44ekbpgswghydjg6itegb3hdzdr7vd4mnuschtersniq',
    cost: 100,
    coinType: 'silver',
    coinValue: 15,
    coinDropInterval: [10, 15] // 10-15 seconds
  },
  skellfin: {
    name: 'Skellfin',
    rarity: 'relic',
    size: 'lg',
    behavior: 'carnivore',
    imageUrl: 'https://jade-decent-lizard-287.mypinata.cloud/ipfs/bafkreie77pwor5ujnqwkzytre6n4b665rs7fusi4fd3bhj3u2egqjivbeq',
    iconUrl: 'https://jade-decent-lizard-287.mypinata.cloud/ipfs/bafkreidmi5it2c55rbskfduxjd3yy5a4esjxrsfszfbpuaoune7okh6xnm',
    cost: 2500,
    coinType: 'chest',
    coinValue: 500,
    coinDropInterval: [15, 15]
  },
  mobius_dickens: {
    name: 'Mobius Dickens',
    rarity: 'relic',
    size: 'xxl',
    behavior: 'apex',
    imageUrl: 'https://jade-decent-lizard-287.mypinata.cloud/ipfs/bafkreiaxo2gekahd4xtgx4p54bjxwzcvm2azqdyivhv6k5iebqj2aamqny',
    iconUrl: 'https://jade-decent-lizard-287.mypinata.cloud/ipfs/bafkreiavatyz5hyg3wopotagowp2udpsccnsedt2mkvqpanutl676mvvyi',
    cost: 8000,
    coinType: 'chest',
    coinValue: 1500,
    coinDropInterval: [25, 25]
  },
  crab: {
    name: 'Crab',
    rarity: 'uncommon',
    size: 'sm',
    behavior: 'bottom_dweller',
    imageUrl: 'https://jade-decent-lizard-287.mypinata.cloud/ipfs/bafkreihdmkxaeqconvo5wlc3fly5kruidvvovbvminvgzvc4k3z2bkn2ha',
    iconUrl: 'https://jade-decent-lizard-287.mypinata.cloud/ipfs/bafkreibmamvi6nhenjhntvtbtuet5zysobgwdkaoj32nnyiei4sjv4xxni',
    cost: 800,
    coinType: 'beetle',
    coinValue: 150,
    coinDropInterval: [15, 15]
  },
  warden_lamprey: {
    name: 'Warden Lamprey',
    rarity: 'relic',
    size: 'lg',
    behavior: 'alien_attacker',
    imageUrl: 'https://jade-decent-lizard-287.mypinata.cloud/ipfs/bafkreicpgxeon5eatuvez6klxk4t3j34l37choz3hhverclyiuquzcte44',
    iconUrl: 'https://jade-decent-lizard-287.mypinata.cloud/ipfs/bafkreihhxou7qvuotacpfep4ml63cmbgnnga3fve7wffe6vnghj3ho5p3y',
    cost: 2000,
    damagePerSecond: 2
  },
  seeker: {
    name: 'Seeker',
    rarity: 'giga',
    size: 'med',
    behavior: 'coin_collector',
    imageUrl: 'https://jade-decent-lizard-287.mypinata.cloud/ipfs/bafkreicmohoc5qeofjhtm45rfgqwk4ouofg2pzhkxumn5gc3ei73vqshja',
    iconUrl: 'https://jade-decent-lizard-287.mypinata.cloud/ipfs/bafkreidjcevm7xu6dtktd76noowcank4asq3pkxf6lx5yxqxjndtd57zbi',
    cost: 5000,
    collectRadius: 100
  },
  anemone: {
    name: 'Anemone',
    rarity: 'giga',
    size: 'med',
    behavior: 'healer',
    imageUrl: 'https://jade-decent-lizard-287.mypinata.cloud/ipfs/bafkreidgqgiumbqi2uswdshxpwwsk7ameftzfipjc63eprzbeyeb6hduhu',
    iconUrl: 'https://jade-decent-lizard-287.mypinata.cloud/ipfs/bafkreib6q5cgwfafhfe24ig77gygka3hhsucuedmvtbpodnvwy65ywtsxq',
    cost: 5000,
    healRate: 5, // -5 hunger/sec to nearby fish
    healRadius: 80
  },
  geotle: {
    name: 'Geotle',
    rarity: 'giga',
    size: 'lg',
    behavior: 'breeder',
    imageUrl: 'https://jade-decent-lizard-287.mypinata.cloud/ipfs/bafkreiheypkr2uyfacqqjmbzndeq57servrdbm3ojfyx3eqyzs4axzytl4',
    iconUrl: 'https://jade-decent-lizard-287.mypinata.cloud/ipfs/bafkreichx2bgfcbzr37buwpvp26h7t2gwkwusi5kw2j6aht22yrkk4cfcy',
    cost: 4000,
    spawnInterval: 25 // Spawns baby trout every 25 seconds
  }
};

export const SIZE_CONFIG = {
  sm: { pixelSize: 40, speed: 80 },
  med: { pixelSize: 55, speed: 65 },
  lg: { pixelSize: 75, speed: 50 },
  xxl: { pixelSize: 110, speed: 35 }
};

// Coin types configuration
export const COIN_TYPES = {
  silver: {
    value: 15,
    color: '#c0c0c0',
    size: 12,
    label: '$15'
  },
  gold: {
    value: 35,
    color: '#ffd700',
    size: 14,
    label: '$35'
  },
  diamond: {
    value: 200,
    color: '#b9f2ff',
    size: 16,
    label: '$200'
  },
  chest: {
    value: 500, // Default, can be overridden by fish config
    color: '#8b4513',
    size: 20,
    label: '$500'
  },
  beetle: {
    value: 150,
    color: '#3d2b1f',
    size: 12,
    label: '$150'
  },
  star: {
    value: 40,
    color: '#ffff00',
    size: 18,
    label: '$40',
    floatsUp: true
  },
  pearl: {
    value: 500,
    color: '#faf0e6',
    size: 14,
    label: '$500'
  },
  treasure: {
    value: 2000,
    color: '#8b4513',
    size: 20,
    label: '$2000'
  }
};

// Rarity colors for UI
export const RARITY_COLORS = {
  common: '#a0a0a0',
  uncommon: '#4caf50',
  relic: '#9c27b0',
  giga: '#ff9800'
};
