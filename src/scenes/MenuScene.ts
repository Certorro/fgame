import Phaser from 'phaser';
import { GAME } from '../config';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { WIDTH: W, HEIGHT: H } = GAME;

    // Background
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0d0618, 0x0d0618, 0x1a0a2e, 0x2d1b4e, 1);
    bg.fillRect(0, 0, W, H);

    // Stars
    for (let i = 0; i < 60; i++) {
      const x = Phaser.Math.Between(0, W);
      const y = Phaser.Math.Between(0, H * 0.6);
      const r = Math.random() < 0.2 ? 2 : 1;
      this.add.circle(x, y, r, 0xFFFFFF, Math.random() * 0.6 + 0.3);
    }

    // Title
    this.add.text(W / 2, H * 0.18, 'Яна и Соня', {
      fontSize: '40px',
      color: '#FFFFFF',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(W / 2, H * 0.30, 'Импровизация в Керчь', {
      fontSize: '20px',
      color: '#C8B8FF',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Character cards
    this.makeCard(W / 2 - 130, H * 0.54, 200, 100,
      0xD4A830, 0x1C1C30,
      'Соня', 'Хаос и вдохновение',
    );
    this.makeCard(W / 2 + 130, H * 0.54, 200, 100,
      0x2A4A7A, 0x1A2A4A,
      'Яна', 'Порядок и точность',
    );

    // Start prompt
    const prompt = this.add.text(W / 2, H * 0.80, 'Нажмите, чтобы начать', {
      fontSize: '18px',
      color: '#FFD060',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Blink the prompt
    this.tweens.add({
      targets: prompt,
      alpha: 0.2,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    // Credits
    this.add.text(W / 2, H * 0.93, 'v0.2  ·  3 уровня  ·  2 героини', {
      fontSize: '11px',
      color: '#665577',
      fontFamily: 'Arial',
    }).setOrigin(0.5);

    // Any tap starts the game
    this.input.once('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => this.scene.start('GameScene'));
    });

    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  private makeCard(
    x: number, y: number, w: number, h: number,
    colorTop: number, colorBot: number,
    name: string, sub: string,
  ): void {
    const g = this.add.graphics();
    g.fillGradientStyle(colorTop, colorTop, colorBot, colorBot, 0.9);
    g.fillRoundedRect(x - w / 2, y - h / 2, w, h, 10);
    g.lineStyle(1, 0xFFFFFF, 0.2);
    g.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 10);

    this.add.text(x, y - 16, name, {
      fontSize: '22px',
      color: '#FFFFFF',
      fontFamily: 'Arial',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(x, y + 14, sub, {
      fontSize: '13px',
      color: '#DDCCFF',
      fontFamily: 'Arial',
    }).setOrigin(0.5);
  }
}
