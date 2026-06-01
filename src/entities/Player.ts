import Phaser from 'phaser';

export interface PlayerConfig {
  texturePrefix: string;
  speed: number;
  jumpVelocity: number;
}

export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly cfg: PlayerConfig;

  constructor(scene: Phaser.Scene, x: number, y: number, cfg: PlayerConfig) {
    super(scene, x, y, `${cfg.texturePrefix}_idle_0`);
    this.cfg = cfg;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setCollideWorldBounds(true);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(22, 50);
    body.setOffset(5, 5);

    this.registerAnims();
  }

  private registerAnims(): void {
    const p = this.cfg.texturePrefix;
    const a = this.scene.anims;

    if (!a.exists(`${p}_idle`)) {
      a.create({
        key: `${p}_idle`,
        frames: [{ key: `${p}_idle_0` }, { key: `${p}_idle_1` }],
        frameRate: 3,
        repeat: -1,
      });
    }
    if (!a.exists(`${p}_run`)) {
      a.create({
        key: `${p}_run`,
        frames: [
          { key: `${p}_run_0` }, { key: `${p}_run_1` },
          { key: `${p}_run_2` }, { key: `${p}_run_3` },
        ],
        frameRate: 10,
        repeat: -1,
      });
    }
    if (!a.exists(`${p}_jump`)) {
      a.create({
        key: `${p}_jump`,
        frames: [{ key: `${p}_jump` }],
        frameRate: 1,
        repeat: -1,
      });
    }
  }

  move(left: boolean, right: boolean, doJump: boolean): void {
    const body    = this.body as Phaser.Physics.Arcade.Body;
    const onGround = body.blocked.down;

    if (left) {
      this.setVelocityX(-this.cfg.speed);
      this.setFlipX(true);
    } else if (right) {
      this.setVelocityX(this.cfg.speed);
      this.setFlipX(false);
    } else {
      this.setVelocityX(0);
    }

    if (doJump && onGround) {
      this.setVelocityY(this.cfg.jumpVelocity);
    }

    const p = this.cfg.texturePrefix;
    if (!onGround) {
      this.anims.play(`${p}_jump`, true);
    } else if (left || right) {
      this.anims.play(`${p}_run`, true);
    } else {
      this.anims.play(`${p}_idle`, true);
    }
  }
}
