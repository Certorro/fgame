import Phaser from 'phaser';
import { GAME, COLORS, CollectibleType } from '../config';
import { Sonya, generateSonyaTextures } from '../entities/Sonya';
import { Yana, generateYanaTextures } from '../entities/Yana';
import { Collectible, generateCollectibleTextures } from '../entities/Collectible';
import { Player } from '../entities/Player';

export class GameScene extends Phaser.Scene {
  private sonya!: Sonya;
  private yana!: Yana;
  private active!: Player;

  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private collectibles!: Phaser.Physics.Arcade.Group;

  private collected  = 0;
  private totalItems = 5;
  private itemText!: Phaser.GameObjects.Text;
  private switchLabel!: Phaser.GameObjects.Text;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private tabKey!: Phaser.Input.Keyboard.Key;

  private touchLeft  = false;
  private touchRight = false;
  private touchJump  = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.buildTextures();
    this.createWorld();
    this.createPlayers();
    this.createCollectibles();
    this.setupCollisions();
    this.setupKeyboard();
    this.createHUD();
    this.createTouchControls();
    this.setupCamera();
  }

  update(): void {
    const left  = this.cursors.left.isDown  || this.touchLeft;
    const right = this.cursors.right.isDown || this.touchRight;
    const jump  =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.spaceKey)   ||
      this.touchJump;

    this.touchJump = false;
    this.active.move(left, right, jump);

    if (Phaser.Input.Keyboard.JustDown(this.tabKey)) {
      this.switchPlayer();
    }
  }

  // ─── Textures ─────────────────────────────────────────────────────────────

  private buildTextures(): void {
    generateSonyaTextures(this);
    generateYanaTextures(this);
    generateCollectibleTextures(this);
    this.makeTile('platform', COLORS.PLATFORM_MID, COLORS.PLATFORM_TOP, COLORS.PLATFORM_SHADOW);
    this.makeTile('ground',   COLORS.GROUND_MID,   COLORS.GROUND_TOP,   COLORS.GROUND_SHADOW);
  }

  private makeTile(key: string, mid: number, top: number, shadow: number): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(mid);    g.fillRect(0, 0,  32, 16);
    g.fillStyle(top);    g.fillRect(0, 0,  32,  3);
    g.fillStyle(shadow); g.fillRect(0, 13, 32,  3);
    g.generateTexture(key, 32, 16);
    g.destroy();
  }

  // ─── World ────────────────────────────────────────────────────────────────

  private createWorld(): void {
    const { WIDTH: W, HEIGHT: H, WORLD_SCALE } = GAME;
    const worldW = Math.floor(W * WORLD_SCALE);

    this.physics.world.setBounds(0, 0, worldW, H);

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a0a2e, 0x1a0a2e, 0x2d1b4e, 0x2d1b4e, 1);
    bg.fillRect(0, 0, worldW, H);

    this.platforms = this.physics.add.staticGroup();

    for (let x = 0; x < worldW; x += 32) {
      this.platforms.create(x + 16, H - 8, 'ground').refreshBody();
    }

    // Home level — furniture as platforms
    const layout: { x: number; y: number; n: number }[] = [
      { x: 96,   y: H - 120, n: 4 },   // диван
      { x: 290,  y: H - 165, n: 3 },   // стол
      { x: 480,  y: H - 130, n: 3 },   // полка
      { x: 672,  y: H - 195, n: 4 },   // шкаф
      { x: 864,  y: H - 150, n: 3 },   // табурет
      { x: 1056, y: H - 175, n: 4 },   // книжный шкаф
      { x: 1260, y: H - 140, n: 3 },   // подоконник
    ];

    for (const { x, y, n } of layout) {
      for (let i = 0; i < n; i++) {
        this.platforms.create(x + i * 32 + 16, y, 'platform').refreshBody();
      }
    }
  }

  // ─── Players ──────────────────────────────────────────────────────────────

  private createPlayers(): void {
    this.sonya  = new Sonya(this, 80, 300);
    this.yana   = new Yana(this, 130, 300);
    this.active = this.sonya;

    // Inactive player faded
    this.yana.setAlpha(0.55);
  }

  private switchPlayer(): void {
    const prev = this.active;
    this.active = prev === this.sonya ? this.yana : this.sonya;

    prev.setAlpha(0.55);
    this.active.setAlpha(1);

    const nextName = this.active === this.sonya ? 'Яна' : 'Соня';
    this.switchLabel.setText(nextName);

    this.cameras.main.startFollow(this.active, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(120, 60);
  }

  // ─── Collectibles ─────────────────────────────────────────────────────────

  private createCollectibles(): void {
    this.collectibles = this.physics.add.group();

    const spots: { x: number; y: number; type: CollectibleType }[] = [
      { x: 168,  y: GAME.HEIGHT - 80,  type: 'suitcase' },
      { x: 354,  y: GAME.HEIGHT - 210, type: 'tickets'  },
      { x: 534,  y: GAME.HEIGHT - 175, type: 'charger'  },
      { x: 752,  y: GAME.HEIGHT - 240, type: 'water'    },
      { x: 1080, y: GAME.HEIGHT - 220, type: 'props'    },
    ];

    for (const { x, y, type } of spots) {
      const item = new Collectible(this, x, y, type);
      this.collectibles.add(item);
    }
  }

  private onCollect(item: Collectible): void {
    if (item.collected) return;
    item.collect();

    this.collected++;
    this.itemText.setText(`Вещи: ${this.collected}/${this.totalItems}`);

    if (this.collected >= this.totalItems) {
      this.time.delayedCall(600, () => {
        this.itemText.setColor('#AAFFAA').setText('Всё собрано! Бежим!');
      });
    }
  }

  private setupCollisions(): void {
    this.physics.add.collider(this.sonya, this.platforms);
    this.physics.add.collider(this.yana,  this.platforms);

    const pick = (_: unknown, item: unknown) => this.onCollect(item as Collectible);
    this.physics.add.overlap(this.sonya, this.collectibles, pick as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback);
    this.physics.add.overlap(this.yana,  this.collectibles, pick as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback);
  }

  // ─── HUD ──────────────────────────────────────────────────────────────────

  private createHUD(): void {
    this.itemText = this.add.text(16, 14, `Вещи: 0/${this.totalItems}`, {
      fontSize: '14px', color: '#FFF0C0', fontFamily: 'Arial',
    }).setScrollFactor(0);

    this.add.text(GAME.WIDTH / 2, 14, 'Уровень 1: Сборы и хаос дома', {
      fontSize: '14px', color: '#FFF0C0', fontFamily: 'Arial',
    }).setOrigin(0.5, 0).setScrollFactor(0);

    this.add.text(GAME.WIDTH - 16, 14, 'Играет:', {
      fontSize: '13px', color: '#AAA0FF', fontFamily: 'Arial',
    }).setOrigin(1, 0).setScrollFactor(0);

    // Updated by switchPlayer() via switchLabel ref (set in createTouchControls)
    this.add.text(GAME.WIDTH - 16, 30, 'Соня', {
      fontSize: '14px', color: '#FFD060', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(1, 0).setScrollFactor(0);
  }

  // ─── Touch controls ───────────────────────────────────────────────────────

  private createTouchControls(): void {
    const { WIDTH: W, HEIGHT: H } = GAME;
    const r   = 46;
    const pad = 18;
    const a   = 0.45;

    const mkBtn = (x: number, y: number, label: string) => {
      const c = this.add
        .circle(x, y, r, COLORS.BTN_BG, a)
        .setScrollFactor(0)
        .setInteractive();
      const t = this.add
        .text(x, y, label, { fontSize: '24px', color: COLORS.BTN_TEXT, fontFamily: 'Arial' })
        .setOrigin(0.5)
        .setScrollFactor(0);
      return { c, t };
    };

    const btmY  = H - pad - r;
    const left  = mkBtn(pad + r,           btmY, '◀');
    const right = mkBtn(pad + r * 3 + 16,  btmY, '▶');
    const jump  = mkBtn(W - pad - r,       btmY, '▲');
    const sw    = mkBtn(W - pad - r * 3 - 16, btmY, 'Яна');

    this.switchLabel = sw.t;

    const hold = (btn: Phaser.GameObjects.Arc, fn: (v: boolean) => void) => {
      btn.on('pointerdown', () => { fn(true);  btn.setFillStyle(COLORS.BTN_ACTIVE, 0.75); });
      btn.on('pointerup',   () => { fn(false); btn.setFillStyle(COLORS.BTN_BG, a); });
      btn.on('pointerout',  () => { fn(false); btn.setFillStyle(COLORS.BTN_BG, a); });
    };

    hold(left.c,  (v) => { this.touchLeft  = v; });
    hold(right.c, (v) => { this.touchRight = v; });

    jump.c.on('pointerdown', () => { this.touchJump = true;  jump.c.setFillStyle(COLORS.BTN_ACTIVE, 0.75); });
    jump.c.on('pointerup',   () => { jump.c.setFillStyle(COLORS.BTN_BG, a); });
    jump.c.on('pointerout',  () => { jump.c.setFillStyle(COLORS.BTN_BG, a); });

    sw.c.on('pointerdown', () => { this.switchPlayer(); sw.c.setFillStyle(COLORS.BTN_ACTIVE, 0.75); });
    sw.c.on('pointerup',   () => { sw.c.setFillStyle(COLORS.BTN_BG, a); });
    sw.c.on('pointerout',  () => { sw.c.setFillStyle(COLORS.BTN_BG, a); });
  }

  // ─── Camera ───────────────────────────────────────────────────────────────

  private setupKeyboard(): void {
    this.cursors  = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.tabKey   = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
  }

  private setupCamera(): void {
    const worldW = Math.floor(GAME.WIDTH * GAME.WORLD_SCALE);
    this.cameras.main.setBounds(0, 0, worldW, GAME.HEIGHT);
    this.cameras.main.startFollow(this.sonya, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(120, 60);
  }
}
