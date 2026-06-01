import Phaser from 'phaser';
import { CollectibleType, COLORS } from '../config';

export class Collectible extends Phaser.Physics.Arcade.Image {
  readonly itemType: CollectibleType;
  collected = false;

  constructor(scene: Phaser.Scene, x: number, y: number, type: CollectibleType) {
    super(scene, x, y, `item_${type}`);
    this.itemType = type;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
    body.immovable = true;

    // Subtle floating loop
    scene.tweens.add({
      targets: this,
      y: y - 6,
      duration: 900 + Math.random() * 200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  collect(): void {
    if (this.collected) return;
    this.collected = true;

    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.8,
      scaleY: 1.8,
      alpha: 0,
      duration: 220,
      ease: 'Power2',
      onComplete: () => this.destroy(),
    });
  }
}

export function generateCollectibleTextures(scene: Phaser.Scene): void {
  mkSuitcase(scene);
  mkTickets(scene);
  mkCharger(scene);
  mkWater(scene);
  mkProps(scene);
}

function mkSuitcase(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  g.fillStyle(COLORS.ITEM_SUITCASE);
  g.fillRoundedRect(2, 6, 20, 14, 2);
  g.lineStyle(2, 0x5A3800);
  g.strokeRect(7, 2, 10, 5);
  g.fillStyle(0xD4A020);
  g.fillRect(10, 12, 4, 3);
  g.fillStyle(0xC08030);
  g.fillRect(2, 10, 20, 2);
  g.generateTexture('item_suitcase', 24, 24);
  g.destroy();
}

function mkTickets(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  g.fillStyle(COLORS.ITEM_TICKETS);
  g.fillRect(2, 5, 20, 13);
  g.fillStyle(0xFF8080);
  g.fillRect(2, 5, 4, 13);
  g.fillStyle(0xAAAAAA);
  g.fillRect(8, 8, 11, 2);
  g.fillRect(8, 12, 8, 2);
  g.generateTexture('item_tickets', 24, 24);
  g.destroy();
}

function mkCharger(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  g.fillStyle(COLORS.ITEM_CHARGER);
  g.fillRect(3, 6, 12, 10);
  g.fillStyle(0x444444);
  g.fillRect(6, 3, 2, 4);
  g.fillRect(10, 3, 2, 4);
  g.fillStyle(0x777777);
  g.fillRect(15, 10, 7, 2);
  g.fillStyle(0x555555);
  g.fillRect(20, 8, 3, 6);
  g.generateTexture('item_charger', 24, 24);
  g.destroy();
}

function mkWater(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  g.fillStyle(COLORS.ITEM_WATER, 0.85);
  g.fillRoundedRect(7, 5, 10, 16, 3);
  g.fillStyle(0x2070B0);
  g.fillRect(9, 3, 6, 4);
  g.fillStyle(0xAADDFF, 0.6);
  g.fillRect(9, 7, 3, 9);
  g.generateTexture('item_water', 24, 24);
  g.destroy();
}

function mkProps(scene: Phaser.Scene): void {
  const g = scene.make.graphics({}, false);
  g.fillStyle(COLORS.ITEM_PROPS);
  g.fillRect(2, 8, 20, 12);
  g.fillStyle(0xFFFF40);
  g.fillTriangle(12, 4, 8, 11, 16, 11);
  g.fillTriangle(12, 14, 8, 7, 16, 7);
  g.generateTexture('item_props', 24, 24);
  g.destroy();
}
