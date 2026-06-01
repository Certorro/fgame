import Phaser from 'phaser';
import { GAME } from '../config';

export interface DialogLine {
  speaker: string;
  text: string;
  color?: string;      // speaker name color, defaults to gold
  duration?: number;   // ms before auto-advance, defaults to 2800
}

export class DialogSystem {
  private readonly scene: Phaser.Scene;
  private readonly bg: Phaser.GameObjects.Rectangle;
  private readonly speakerText: Phaser.GameObjects.Text;
  private readonly bodyText: Phaser.GameObjects.Text;

  private queue: DialogLine[] = [];
  private timer?: Phaser.Time.TimerEvent;

  get isActive(): boolean {
    return this.bg.visible;
  }

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const W    = GAME.WIDTH;
    const boxW = Math.min(W - 60, 500);
    const boxX = W / 2;
    const boxY = 62;

    this.bg = scene.add
      .rectangle(boxX, boxY, boxW, 72, 0x0D0618, 0.92)
      .setScrollFactor(0)
      .setDepth(100)
      .setStrokeStyle(1, 0x9966FF, 1)
      .setVisible(false);

    this.speakerText = scene.add
      .text(boxX - boxW / 2 + 14, boxY - 28, '', {
        fontSize: '12px',
        color: '#FFD060',
        fontFamily: 'Arial',
        fontStyle: 'bold',
      })
      .setScrollFactor(0)
      .setDepth(101)
      .setVisible(false);

    this.bodyText = scene.add
      .text(boxX - boxW / 2 + 14, boxY - 10, '', {
        fontSize: '14px',
        color: '#F0EEFF',
        fontFamily: 'Arial',
        wordWrap: { width: boxW - 28 },
      })
      .setScrollFactor(0)
      .setDepth(101)
      .setVisible(false);
  }

  show(lines: DialogLine[]): void {
    this.queue = [...lines];
    this.advance();
  }

  advance(): void {
    if (this.timer) {
      this.timer.remove();
      this.timer = undefined;
    }

    const line = this.queue.shift();
    if (!line) {
      this.hide();
      return;
    }

    this.speakerText.setText(line.speaker).setColor(line.color ?? '#FFD060');
    this.bodyText.setText(line.text);
    this.bg.setVisible(true);
    this.speakerText.setVisible(true);
    this.bodyText.setVisible(true);

    this.timer = this.scene.time.delayedCall(line.duration ?? 2800, () => this.advance());
  }

  private hide(): void {
    this.bg.setVisible(false);
    this.speakerText.setVisible(false);
    this.bodyText.setVisible(false);
  }
}
