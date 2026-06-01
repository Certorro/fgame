import Phaser from 'phaser';
import { COLORS } from '../config';
import { Player, PlayerConfig } from './Player';

// Yana: slower but jumps higher — more precise, deliberate movement
export const YANA_CFG: PlayerConfig = {
  texturePrefix: 'yana',
  speed: 210,
  jumpVelocity: -590,
};

interface Pose {
  bodyY: number;
  legLY: number;
  legRY: number;
  blink: boolean;
  armsUp: boolean;
}

const POSES: Record<string, Pose> = {
  idle_0: { bodyY: 0,  legLY: 0,  legRY: 0,  blink: false, armsUp: false },
  idle_1: { bodyY: -1, legLY: 0,  legRY: 0,  blink: true,  armsUp: false },
  run_0:  { bodyY: -1, legLY: -2, legRY: 2,  blink: false, armsUp: false },
  run_1:  { bodyY: 0,  legLY: 0,  legRY: 0,  blink: false, armsUp: false },
  run_2:  { bodyY: -1, legLY: 2,  legRY: -2, blink: false, armsUp: false },
  run_3:  { bodyY: 0,  legLY: 0,  legRY: 0,  blink: false, armsUp: false },
  jump:   { bodyY: -2, legLY: 3,  legRY: 3,  blink: false, armsUp: true  },
};

export function generateYanaTextures(scene: Phaser.Scene): void {
  for (const [key, pose] of Object.entries(POSES)) {
    const g = scene.make.graphics({}, false);
    drawYana(g, pose);
    g.generateTexture(`yana_${key}`, 32, 57);
    g.destroy();
  }
}

function drawYana(g: Phaser.GameObjects.Graphics, p: Pose): void {
  const by = p.bodyY;

  // Hair back (chestnut, neater and shorter than Sonya)
  g.fillStyle(COLORS.YANA_HAIR);
  g.fillEllipse(16, 14 + by, 26, 18);
  g.fillRect(5,  16 + by, 5, 14);
  g.fillRect(22, 16 + by, 5, 14);

  // Face
  g.fillStyle(COLORS.YANA_SKIN);
  g.fillCircle(16, 14 + by, 11);

  // Hair front (neat, smooth)
  g.fillStyle(COLORS.YANA_HAIR);
  g.fillEllipse(16, 5 + by, 25, 12);

  // Bun — Yana's signature (neat and controlled, opposite of Sonya's flowing hair)
  g.fillStyle(COLORS.YANA_HAIR);
  g.fillCircle(22, 3 + by, 6);
  g.fillStyle(0x4A2810);
  g.fillCircle(22, 4 + by, 4);
  g.fillStyle(COLORS.YANA_HAIR);
  g.fillCircle(22, 3 + by, 3);

  // Hairpin (organized — always has the right accessories)
  g.fillStyle(0xC8C8C8);
  g.fillRect(19, 2 + by, 1, 6);

  // Eyes (hazel/green-brown, focused)
  const eyeH = p.blink ? 2 : 6;
  g.fillStyle(0x2A4A1A);
  g.fillEllipse(12, 15 + by, 6, eyeH);
  g.fillEllipse(20, 15 + by, 6, eyeH);
  if (!p.blink) {
    g.fillStyle(0x000000);
    g.fillEllipse(12, 15 + by, 4, 4);
    g.fillEllipse(20, 15 + by, 4, 4);
    g.fillStyle(0xFFFFFF);
    g.fillCircle(13, 13 + by, 1.5);
    g.fillCircle(21, 13 + by, 1.5);
  }

  // Eyebrows (slightly arched — expressive)
  g.fillStyle(0x5A3010);
  g.fillRect(9,  9 + by, 6, 2);
  g.fillRect(17, 9 + by, 6, 2);

  // Neck
  g.fillStyle(COLORS.YANA_SKIN);
  g.fillRect(13, 24 + by, 6, 5);

  // Arms (raised only in jump)
  if (p.armsUp) {
    g.fillStyle(COLORS.YANA_BODY);
    g.fillRect(1,  24 + by, 5, 14);
    g.fillRect(26, 24 + by, 5, 14);
  }

  // Blue blazer (structured, organized)
  g.fillStyle(COLORS.YANA_BODY);
  g.fillRect(6, 28 + by, 20, 18);

  // White collar triangle
  g.fillStyle(COLORS.YANA_COLLAR);
  g.fillTriangle(16, 27 + by, 10, 33 + by, 22, 33 + by);

  // Blazer lapels (darker blue V-shape)
  g.fillStyle(0x1E3A6A);
  g.fillTriangle(16, 28 + by,  6, 28 + by, 10, 39 + by);
  g.fillTriangle(16, 28 + by, 26, 28 + by, 22, 39 + by);

  // Dark neat trousers
  g.fillStyle(COLORS.YANA_PANTS);
  g.fillRect(7,  46 + p.legLY, 7, 10);
  g.fillRect(18, 46 + p.legRY, 7, 10);

  // Shoes (dark, polished)
  g.fillStyle(0x0A1830);
  g.fillRect(5,  54 + p.legLY, 9, 3);
  g.fillRect(17, 54 + p.legRY, 9, 3);
}

export class Yana extends Player {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, YANA_CFG);
  }
}
