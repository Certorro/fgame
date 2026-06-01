import Phaser from 'phaser';
import { COLORS } from '../config';
import { Player, PlayerConfig } from './Player';

export const SONYA_CFG: PlayerConfig = {
  texturePrefix: 'sonya',
  speed: 230,
  jumpVelocity: -540,
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

export function generateSonyaTextures(scene: Phaser.Scene): void {
  for (const [key, pose] of Object.entries(POSES)) {
    const g = scene.make.graphics({}, false);
    drawSonya(g, pose);
    g.generateTexture(`sonya_${key}`, 32, 57);
    g.destroy();
  }
}

function drawSonya(g: Phaser.GameObjects.Graphics, p: Pose): void {
  const by = p.bodyY;

  // Hair back (golden honey, flowing)
  g.fillStyle(COLORS.SONYA_HAIR);
  g.fillEllipse(16, 13 + by, 30, 20);
  g.fillRect(3,  16 + by, 7, 26);
  g.fillRect(22, 16 + by, 7, 26);

  // Face
  g.fillStyle(COLORS.SONYA_SKIN);
  g.fillCircle(16, 14 + by, 11);

  // Hair front
  g.fillStyle(COLORS.SONYA_HAIR);
  g.fillEllipse(16, 5 + by, 27, 14);

  // Black bow clip — Sonya's signature
  g.fillStyle(COLORS.SONYA_BOW);
  g.fillTriangle(15, 4 + by,  8, 0 + by,  8, 8 + by);
  g.fillTriangle(17, 4 + by, 24, 0 + by, 24, 8 + by);
  g.fillCircle(16, 4 + by, 3);

  // Eyes (anime style, brown)
  const eyeH = p.blink ? 2 : 6;
  g.fillStyle(0x3D2010);
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

  // Eyebrows
  g.fillStyle(0x8B6010);
  g.fillRect(9,  9 + by, 7, 2);
  g.fillRect(16, 9 + by, 7, 2);

  // Mole under right eye — Sonya's characteristic mark
  g.fillStyle(0x5C3010);
  g.fillCircle(23, 20 + by, 1.5);

  // Neck
  g.fillStyle(COLORS.SONYA_SKIN);
  g.fillRect(13, 24 + by, 6, 5);

  // Arms (raised only in jump)
  if (p.armsUp) {
    g.fillStyle(COLORS.SONYA_BODY);
    g.fillRect(1,  24 + by, 5, 14);
    g.fillRect(26, 24 + by, 5, 14);
  }

  // Dark jacket
  g.fillStyle(COLORS.SONYA_BODY);
  g.fillRect(6, 28 + by, 20, 18);

  // Scarf (dark herringbone)
  g.fillStyle(COLORS.SONYA_SCARF);
  g.fillRect(9, 27 + by, 14, 11);

  // Legs with stride offset
  g.fillStyle(0x252535);
  g.fillRect(7,  46 + p.legLY, 7, 10);
  g.fillRect(18, 46 + p.legRY, 7, 10);

  // Shoes
  g.fillStyle(COLORS.SONYA_BOW);
  g.fillRect(5,  54 + p.legLY, 9, 3);
  g.fillRect(17, 54 + p.legRY, 9, 3);
}

export class Sonya extends Player {
  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, SONYA_CFG);
  }
}
