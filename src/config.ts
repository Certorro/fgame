export const GAME = {
  WIDTH: 800,
  HEIGHT: 450,
  GRAVITY: 900,
  PLAYER_SPEED: 220,
  JUMP_VELOCITY: -560,
  WORLD_SCALE: 2.2,
} as const;

export const COLORS = {
  // Sonya — Genshin-style: golden hair, dark jacket, mole under eye
  SONYA_HAIR:   0xD4A830,
  SONYA_SKIN:   0xF5C5A0,
  SONYA_BODY:   0x1C1C30,
  SONYA_SCARF:  0x383848,
  SONYA_BOW:    0x080810,

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
} as const;
