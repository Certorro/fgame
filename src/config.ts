export const GAME = {
  WIDTH: 800,
  HEIGHT: 450,
  GRAVITY: 900,
  WORLD_SCALE: 2.2,
} as const;

export const COLORS = {
  // Sonya — Genshin-style: golden hair, dark jacket, mole under eye
  SONYA_HAIR:   0xD4A830,
  SONYA_SKIN:   0xF5C5A0,
  SONYA_BODY:   0x1C1C30,
  SONYA_SCARF:  0x383848,
  SONYA_BOW:    0x080810,

  // Yana — neat, organized: chestnut bun, blue blazer
  YANA_HAIR:    0x6B3A20,
  YANA_SKIN:    0xF5C5A0,
  YANA_BODY:    0x2A4A7A,
  YANA_COLLAR:  0xE8E8F0,
  YANA_PANTS:   0x1A2A4A,

  // World
  PLATFORM_TOP:    0x8B7055,
  PLATFORM_MID:    0x6B5040,
  PLATFORM_SHADOW: 0x3A2818,
  GROUND_TOP:      0x7A6550,
  GROUND_MID:      0x5A4535,
  GROUND_SHADOW:   0x3A2520,

  // UI touch buttons
  BTN_BG:     0x333366,
  BTN_ACTIVE: 0x6666CC,
  BTN_TEXT:   '#FFFFFF',

  // Collectibles
  ITEM_SUITCASE: 0x8B6020,
  ITEM_TICKETS:  0xF5F5DC,
  ITEM_CHARGER:  0x888888,
  ITEM_WATER:    0x4090D0,
  ITEM_PROPS:    0xC060A0,
} as const;

export const COLLECTIBLE_TYPES = ['suitcase', 'tickets', 'charger', 'water', 'props'] as const;
export type CollectibleType = typeof COLLECTIBLE_TYPES[number];
