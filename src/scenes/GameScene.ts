import Phaser from 'phaser';
import { GAME, COLORS } from '../config';

export class GameScene extends Phaser.Scene {
  private player!: Phaser.Physics.Arcade.Sprite;
  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;

  private touchLeft  = false;
  private touchRight = false;
  private touchJump  = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.buildTextures();
    this.createWorld();
    this.createPlayer();
    this.setupKeyboard();
    this.createTouchControls();
    this.setupCamera();

    this.physics.add.collider(this.player, this.platforms);

    this.add.text(GAME.WIDTH / 2, 18, 'Уровень 1: Сборы и хаос дома', {
      fontSize: '15px',
      color: '#FFF0C0',
      fontFamily: 'Arial, sans-serif',
    }).setOrigin(0.5, 0).setScrollFactor(0);
  }

  update(): void {
    this.handleMovement();
  }

  // ─── Texture generation ───────────────────────────────────────────────────

  private buildTextures(): void {
    this.makeSonyaTexture();
    this.makePlatformTexture();
    this.makeGroundTexture();
  }

  private makeSonyaTexture(): void {
    const g = this.make.graphics({}, false);

    // Hair back (golden honey)
    g.fillStyle(COLORS.SONYA_HAIR);
    g.fillEllipse(16, 13, 30, 20);
    g.fillRect(3,  16, 7, 26);   // left hair flow
    g.fillRect(22, 16, 7, 26);   // right hair flow

    // Face / skin
    g.fillStyle(COLORS.SONYA_SKIN);
    g.fillCircle(16, 14, 11);

    // Hair front
    g.fillStyle(COLORS.SONYA_HAIR);
    g.fillEllipse(16, 5, 27, 14);

    // Black bow clip (characteristic trait)
    g.fillStyle(COLORS.SONYA_BOW);
    g.fillTriangle(15, 4,  8, 0,  8, 8);
    g.fillTriangle(17, 4, 24, 0, 24, 8);
    g.fillCircle(16, 4, 3);

    // Eyes – anime style
    g.fillStyle(0x3D2010);
    g.fillEllipse(12, 15, 6, 6);
    g.fillEllipse(20, 15, 6, 6);
    g.fillStyle(0x000000);
    g.fillEllipse(12, 15, 4, 4);
    g.fillEllipse(20, 15, 4, 4);
    g.fillStyle(0xFFFFFF);
    g.fillCircle(13, 13, 1.5);
    g.fillCircle(21, 13, 1.5);

    // Eyebrows
    g.fillStyle(0x8B6010);
    g.fillRect(9,  9, 7, 2);
    g.fillRect(16, 9, 7, 2);

    // Mole under right eye (Sonya's signature)
    g.fillStyle(0x5C3010);
    g.fillCircle(23, 20, 1.5);

    // Neck
    g.fillStyle(COLORS.SONYA_SKIN);
    g.fillRect(13, 24, 6, 5);

    // Dark jacket
    g.fillStyle(COLORS.SONYA_BODY);
    g.fillRect(6, 28, 20, 18);

    // Scarf (dark herringbone gray)
    g.fillStyle(COLORS.SONYA_SCARF);
    g.fillRect(9, 27, 14, 11);

    // Pants
    g.fillStyle(0x252535);
    g.fillRect(7,  46, 7, 10);
    g.fillRect(18, 46, 7, 10);

    // Shoes
    g.fillStyle(COLORS.SONYA_BOW);
    g.fillRect(5,  53, 9, 4);
    g.fillRect(17, 53, 9, 4);

    g.generateTexture('sonya', 32, 57);
    g.destroy();
  }

  private makePlatformTexture(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(COLORS.PLATFORM_MID);
    g.fillRect(0, 0, 32, 16);
    g.fillStyle(COLORS.PLATFORM_TOP);
    g.fillRect(0, 0, 32, 4);
    g.fillStyle(COLORS.PLATFORM_SHADOW);
    g.fillRect(0, 13, 32, 3);
    g.generateTexture('platform', 32, 16);
    g.destroy();
  }

  private makeGroundTexture(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(COLORS.GROUND_MID);
    g.fillRect(0, 0, 32, 16);
    g.fillStyle(COLORS.GROUND_TOP);
    g.fillRect(0, 0, 32, 3);
    g.fillStyle(COLORS.GROUND_SHADOW);
    g.fillRect(0, 13, 32, 3);
    g.generateTexture('ground', 32, 16);
    g.destroy();
  }

  // ─── World ────────────────────────────────────────────────────────────────

  private createWorld(): void {
    const W = GAME.WIDTH;
    const H = GAME.HEIGHT;
    const worldW = Math.floor(W * GAME.WORLD_SCALE);

    this.physics.world.setBounds(0, 0, worldW, H);

    // Sky gradient
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a0a2e, 0x1a0a2e, 0x2d1b4e, 0x2d1b4e, 1);
    bg.fillRect(0, 0, worldW, H);

    this.platforms = this.physics.add.staticGroup();

    // Ground tiles
    for (let x = 0; x < worldW; x += 32) {
      this.platforms.create(x + 16, H - 8, 'ground').refreshBody();
    }

    // Floating platforms — "furniture" in home level
    const layout = [
      { x: 96,   y: H - 120, n: 4 },  // диван
      { x: 290,  y: H - 165, n: 3 },  // стол
      { x: 480,  y: H - 130, n: 3 },  // полка
      { x: 672,  y: H - 195, n: 4 },  // шкаф
      { x: 864,  y: H - 150, n: 3 },  // табурет
      { x: 1056, y: H - 175, n: 4 },  // книжный шкаф
      { x: 1260, y: H - 140, n: 3 },  // подоконник
    ];

    for (const p of layout) {
      for (let i = 0; i < p.n; i++) {
        this.platforms.create(p.x + i * 32 + 16, p.y, 'platform').refreshBody();
      }
    }
  }

  // ─── Player ───────────────────────────────────────────────────────────────

  private createPlayer(): void {
    this.player = this.physics.add.sprite(80, 300, 'sonya');
    this.player.setCollideWorldBounds(true);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setSize(22, 50);
    body.setOffset(5, 5);
  }

  // ─── Input ────────────────────────────────────────────────────────────────

  private setupKeyboard(): void {
    this.cursors  = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
  }

  private createTouchControls(): void {
    const W   = GAME.WIDTH;
    const H   = GAME.HEIGHT;
    const r   = 46;
    const pad = 18;
    const a   = 0.45;

    const mkBtn = (x: number, y: number, label: string) => {
      const circle = this.add
        .circle(x, y, r, COLORS.BTN_BG, a)
        .setScrollFactor(0)
        .setInteractive();

      this.add
        .text(x, y, label, { fontSize: '26px', color: COLORS.BTN_TEXT, fontFamily: 'Arial' })
        .setOrigin(0.5)
        .setScrollFactor(0);

      return circle;
    };

    const btmY = H - pad - r;
    const left  = mkBtn(pad + r,           btmY, '◀');
    const right = mkBtn(pad + r * 3 + 16,  btmY, '▶');
    const jump  = mkBtn(W - pad - r,       btmY, '▲');

    const wire = (
      btn: Phaser.GameObjects.Arc,
      setDown: (v: boolean) => void,
    ) => {
      btn.on('pointerdown',  () => { setDown(true);  btn.setFillStyle(COLORS.BTN_ACTIVE, 0.75); });
      btn.on('pointerup',    () => { setDown(false); btn.setFillStyle(COLORS.BTN_BG, a); });
      btn.on('pointerout',   () => { setDown(false); btn.setFillStyle(COLORS.BTN_BG, a); });
    };

    wire(left,  (v) => { this.touchLeft  = v; });
    wire(right, (v) => { this.touchRight = v; });

    // Jump fires once per press — consumed in handleMovement
    jump.on('pointerdown', () => { this.touchJump = true;  jump.setFillStyle(COLORS.BTN_ACTIVE, 0.75); });
    jump.on('pointerup',   () => { jump.setFillStyle(COLORS.BTN_BG, a); });
    jump.on('pointerout',  () => { jump.setFillStyle(COLORS.BTN_BG, a); });
  }

  // ─── Camera ───────────────────────────────────────────────────────────────

  private setupCamera(): void {
    const worldW = Math.floor(GAME.WIDTH * GAME.WORLD_SCALE);
    this.cameras.main.setBounds(0, 0, worldW, GAME.HEIGHT);
    this.cameras.main.startFollow(this.player, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(120, 60);
  }

  // ─── Movement ─────────────────────────────────────────────────────────────

  private handleMovement(): void {
    const body    = this.player.body as Phaser.Physics.Arcade.Body;
    const onGround = body.blocked.down;

    const goLeft  = this.cursors.left.isDown  || this.touchLeft;
    const goRight = this.cursors.right.isDown || this.touchRight;
    const doJump  =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.spaceKey)   ||
      this.touchJump;

    this.touchJump = false;

    if (goLeft) {
      this.player.setVelocityX(-GAME.PLAYER_SPEED);
      this.player.setFlipX(true);
    } else if (goRight) {
      this.player.setVelocityX(GAME.PLAYER_SPEED);
      this.player.setFlipX(false);
    } else {
      this.player.setVelocityX(0);
    }

    if (doJump && onGround) {
      this.player.setVelocityY(GAME.JUMP_VELOCITY);
    }
  }
}
