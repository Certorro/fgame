import Phaser from 'phaser';

export class MovingObstacle extends Phaser.Physics.Arcade.Sprite {
  private readonly minX: number;
  private readonly maxX: number;
  private readonly spd: number;

  constructor(
    scene: Phaser.Scene,
    x: number, y: number,
    texture: string,
    minX: number, maxX: number,
    speed: number,
  ) {
    super(scene, x, y, texture);
    this.minX = minX;
    this.maxX = maxX;
    this.spd  = speed;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.allowGravity = false;
    body.setImmovable(true);
    body.setVelocityX(speed);
  }

  preUpdate(time: number, delta: number): void {
    super.preUpdate(time, delta);
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (this.x <= this.minX && body.velocity.x < 0) {
      body.setVelocityX(Math.abs(this.spd));
      this.setFlipX(false);
    } else if (this.x >= this.maxX && body.velocity.x > 0) {
      body.setVelocityX(-Math.abs(this.spd));
      this.setFlipX(true);
    }
  }
}
