import Phaser from 'phaser';
import { GAME, COLORS } from '../config';
import { Sonya, generateSonyaTextures } from '../entities/Sonya';
import { Yana, generateYanaTextures } from '../entities/Yana';
import { Player } from '../entities/Player';
import { MovingObstacle } from '../entities/MovingObstacle';
import { DialogSystem, DialogLine } from '../systems/DialogSystem';

// ─── Dialogue ─────────────────────────────────────────────────────────────────

const SC = '#FFD060';   // Соня
const YC = '#7AB0FF';   // Яна
const NC = '#FF9999';   // NPC

const DIALOGS: Record<string, DialogLine[]> = {
  driver: [
    { speaker: 'Водитель', text: 'Точно без сдачи, я сказал!', color: NC },
    { speaker: 'Соня',     text: 'У нас только 500 рублей.',   color: SC },
    { speaker: 'Яна',      text: 'На двоих.',                  color: YC },
  ],
  twins: [
    { speaker: 'Пассажир', text: 'Вы же близняшки?', color: NC },
    { speaker: 'Соня',     text: 'Нет.',             color: SC },
    { speaker: 'Яна',      text: 'Нет.',             color: YC },
    { speaker: 'Пассажир', text: 'Понятно...',       color: NC, duration: 1800 },
  ],
  finish: [
    { speaker: 'Соня', text: 'Успеем?',                               color: SC },
    { speaker: 'Яна',  text: 'По плану — да. По факту — посмотрим.',  color: YC },
  ],
  scooter: [
    { speaker: 'Самокатчик', text: 'Иду на обгон!', color: NC, duration: 1600 },
    { speaker: 'Соня',       text: '★ — дэш!',      color: SC, duration: 1600 },
  ],
};

// ─── Scene ────────────────────────────────────────────────────────────────────

interface ProximityTrigger {
  x: number; y: number; radius: number;
  lines: DialogLine[];
  fired: boolean;
}

export class Level2Scene extends Phaser.Scene {
  private sonya!: Sonya;
  private yana!: Yana;
  private active!: Player;

  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private puddles!: Phaser.Physics.Arcade.Group;
  private finishDoor!: Phaser.Physics.Arcade.Image;

  private dialog!: DialogSystem;
  private triggers: ProximityTrigger[] = [];

  private levelDone        = false;
  private puddleCooldownAt = 0;

  private switchLabel!: Phaser.GameObjects.Text;
  private activeLabel!: Phaser.GameObjects.Text;
  private specialBtn!: Phaser.GameObjects.Arc;
  private hintText!: Phaser.GameObjects.Text;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private tabKey!: Phaser.Input.Keyboard.Key;

  private touchLeft    = false;
  private touchRight   = false;
  private touchJump    = false;
  private touchSpecial = false;

  private readonly WORLD_W = Math.floor(GAME.WIDTH * 2.5);

  constructor() {
    super({ key: 'Level2Scene' });
  }

  create(): void {
    this.levelDone        = false;
    this.puddleCooldownAt = 0;
    this.triggers         = [];

    this.buildTextures();
    this.physics.world.setBounds(0, 0, this.WORLD_W, GAME.HEIGHT);
    this.createWorld();
    this.createPlayers();
    this.setupCollisions();
    this.setupKeyboard();
    this.dialog = new DialogSystem(this);
    this.createHUD();
    this.createTouchControls();
    this.setupCamera();
    this.setupTriggers();
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  update(): void {
    if (this.levelDone) return;

    const left  = this.cursors.left.isDown  || this.touchLeft;
    const right = this.cursors.right.isDown || this.touchRight;
    const jump  =
      Phaser.Input.Keyboard.JustDown(this.cursors.up) ||
      Phaser.Input.Keyboard.JustDown(this.spaceKey)   ||
      this.touchJump;

    this.touchJump = false;
    this.active.move(left, right, jump);

    if (Phaser.Input.Keyboard.JustDown(this.tabKey)) this.switchPlayer();

    if (this.touchSpecial) {
      this.touchSpecial = false;
      this.active.special();
    }

    this.checkTriggers();
    this.updateSpecialBtn();
  }

  // ─── Textures ───────────────────────────────────────────────────────────────

  private buildTextures(): void {
    generateSonyaTextures(this);
    generateYanaTextures(this);
    this.makeTile('road',   0x404050, 0x505060, 0x303040);
    this.makeTile('bench',  0x6B5040, 0x8B7055, 0x3A2818);
    this.makeMarshrutka();
    this.makeGrandmaTexture();
    this.makeScooterTexture();
    this.makePuddleTexture();
    this.makeDoor2Texture();
  }

  private makeTile(key: string, mid: number, top: number, shadow: number): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(mid);    g.fillRect(0, 0,  32, 16);
    g.fillStyle(top);    g.fillRect(0, 0,  32,  3);
    g.fillStyle(shadow); g.fillRect(0, 13, 32,  3);
    g.generateTexture(key, 32, 16);
    g.destroy();
  }

  private makeMarshrutka(): void {
    const g = this.make.graphics({}, false);
    // Body
    g.fillStyle(0xD4A020);
    g.fillRoundedRect(0, 8, 192, 72, 8);
    // Roof (darker top)
    g.fillStyle(0xB8880E);
    g.fillRoundedRect(0, 8, 192, 20, { tl: 8, tr: 8, bl: 0, br: 0 });
    // Windows
    g.fillStyle(0xAADDFF, 0.75);
    for (let wx = 16; wx < 180; wx += 36) {
      g.fillRect(wx, 18, 28, 22);
    }
    // Door
    g.fillStyle(0x8B6010);
    g.fillRect(164, 30, 24, 50);
    g.fillStyle(0xAADDFF, 0.5);
    g.fillRect(167, 33, 18, 20);
    // Wheels
    g.fillStyle(0x222222);
    g.fillCircle(36, 80, 12);
    g.fillCircle(156, 80, 12);
    g.fillStyle(0x555555);
    g.fillCircle(36, 80, 7);
    g.fillCircle(156, 80, 7);
    g.generateTexture('marshrutka', 192, 88);
    g.destroy();
  }

  private makeGrandmaTexture(): void {
    const g = this.make.graphics({}, false);
    // Gray hair — big bun
    g.fillStyle(0xC0C0C0);
    g.fillCircle(16, 8, 10);
    g.fillEllipse(16, 4, 22, 14);
    // Face
    g.fillStyle(0xEEB880);
    g.fillCircle(16, 11, 9);
    // Eyes
    g.fillStyle(0x3A2210);
    g.fillCircle(13, 11, 1.5);
    g.fillCircle(19, 11, 1.5);
    // Smile
    g.fillStyle(0xAA7060);
    g.fillRect(12, 14, 8, 2);
    // Headscarf (марамья)
    g.fillStyle(0xCC4444);
    g.fillTriangle(16, 0, 4, 12, 28, 12);
    // Body + coat
    g.fillStyle(0x663366);
    g.fillRect(6, 21, 20, 22);
    // Bag
    g.fillStyle(0x996633);
    g.fillRect(22, 26, 12, 14);
    g.lineStyle(1, 0x7A4A1A);
    g.strokeRect(22, 26, 12, 14);
    // Legs
    g.fillStyle(0x442244);
    g.fillRect(7,  43, 7, 9);
    g.fillRect(18, 43, 7, 9);
    // Shoes
    g.fillStyle(0x221122);
    g.fillRect(5,  50, 9, 3);
    g.fillRect(18, 50, 9, 3);
    g.generateTexture('grandma', 34, 53);
    g.destroy();
  }

  private makeScooterTexture(): void {
    const g = this.make.graphics({}, false);
    // Deck
    g.fillStyle(0x44AA44);
    g.fillRect(4, 12, 40, 6);
    // Handlebar post
    g.fillStyle(0x888888);
    g.fillRect(8, 4, 4, 10);
    g.fillRect(4, 4, 12, 3);
    // Wheels
    g.fillStyle(0x222222);
    g.fillCircle(10, 20, 7);
    g.fillCircle(38, 20, 7);
    g.fillStyle(0x555555);
    g.fillCircle(10, 20, 4);
    g.fillCircle(38, 20, 4);
    // Rider suggestion
    g.fillStyle(0x2266CC);
    g.fillCircle(12, 6, 5);
    g.fillRect(8, 10, 10, 8);
    g.generateTexture('scooter', 48, 28);
    g.destroy();
  }

  private makePuddleTexture(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0x4488CC, 0.6);
    g.fillEllipse(30, 8, 60, 16);
    g.fillStyle(0x88BBFF, 0.4);
    g.fillEllipse(28, 7, 36, 8);
    g.generateTexture('puddle', 60, 16);
    g.destroy();
  }

  private makeDoor2Texture(): void {
    // Маршрутка door — wide bus door
    const g = this.make.graphics({}, false);
    g.fillStyle(0x40AA40);
    g.fillRoundedRect(0, 0, 52, 80, 4);
    g.fillStyle(0x30883010);
    g.fillRect(4, 8, 44, 64);
    g.fillStyle(0xAADDFF, 0.6);
    g.fillRect(8, 12, 16, 28);
    g.fillRect(28, 12, 16, 28);
    // Arrow
    g.fillStyle(0xFFFFFF, 0.8);
    g.fillTriangle(26, 50, 20, 60, 32, 60);
    g.generateTexture('door2_open', 52, 80);
    g.destroy();
  }

  // ─── World ──────────────────────────────────────────────────────────────────

  private createWorld(): void {
    const { HEIGHT: H } = GAME;
    const WW = this.WORLD_W;

    // Sky gradient (daytime — different from Level 1's night)
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x5588CC, 0x5588CC, 0x2244AA, 0x2244AA, 1);
    bg.fillRect(0, 0, WW, H * 0.65);

    // Buildings
    this.drawBuildings(bg, WW, H);

    // Sidewalk + road
    bg.fillStyle(0x888898);
    bg.fillRect(0, H * 0.65, WW, H * 0.35);
    bg.fillStyle(0x404050);
    bg.fillRect(0, H - 30, WW, 30);

    // Road center line dashes
    bg.fillStyle(0xFFFF88, 0.7);
    for (let x = 0; x < WW; x += 80) {
      bg.fillRect(x, H - 16, 40, 4);
    }

    this.platforms = this.physics.add.staticGroup();

    // Road ground
    for (let x = 0; x < WW; x += 32) {
      this.platforms.create(x + 16, H - 8, 'road').refreshBody();
    }

    this.buildPlatformLayout(H);
    this.buildObstacles(H);

    // Маршрутка decorations (background sprites, no physics)
    this.add.image(390, H - 52, 'marshrutka').setOrigin(0.5, 1);
    this.add.image(1090, H - 52, 'marshrutka').setOrigin(0.5, 1);
    this.add.image(1830, H - 52, 'marshrutka').setOrigin(0.5, 1);

    // Finish door on the last маршрутка
    this.finishDoor = this.physics.add.image(WW - 78, H - 44, 'door2_open');
    const db = this.finishDoor.body as Phaser.Physics.Arcade.Body;
    db.allowGravity = false;
    db.immovable    = true;

    this.add.text(WW - 78, H - 100, 'Маршрутка\nвот-вот уедет!', {
      fontSize: '11px', color: '#FFFF88', fontFamily: 'Arial', align: 'center',
    }).setOrigin(0.5);
  }

  private drawBuildings(g: Phaser.GameObjects.Graphics, ww: number, h: number): void {
    const buildings = [
      { x: 0,    w: 70,  ht: 130 }, { x: 80,   w: 90,  ht: 190 },
      { x: 180,  w: 60,  ht: 110 }, { x: 260,  w: 100, ht: 160 },
      { x: 375,  w: 80,  ht: 200 }, { x: 470,  w: 65,  ht: 140 },
      { x: 545,  w: 110, ht: 180 }, { x: 665,  w: 75,  ht: 120 },
      { x: 750,  w: 90,  ht: 170 }, { x: 850,  w: 80,  ht: 210 },
      { x: 940,  w: 60,  ht: 130 }, { x: 1010, w: 110, ht: 160 },
      { x: 1130, w: 70,  ht: 190 }, { x: 1210, w: 90,  ht: 140 },
      { x: 1310, w: 80,  ht: 170 }, { x: 1400, w: 100, ht: 120 },
      { x: 1510, w: 65,  ht: 200 }, { x: 1585, w: 85,  ht: 150 },
      { x: 1680, w: 90,  ht: 180 }, { x: 1780, w: 75,  ht: 130 },
      { x: 1865, w: 100, ht: 160 }, { x: 1975, w: 60,  ht: 120 },
    ];

    const groundY = h * 0.65;
    for (const b of buildings) {
      g.fillStyle(0x1A2A3A);
      g.fillRect(b.x, groundY - b.ht, b.w, b.ht);
      // Windows (random on/off)
      for (let wy = groundY - b.ht + 10; wy < groundY - 12; wy += 22) {
        for (let wx = b.x + 8; wx < b.x + b.w - 8; wx += 18) {
          const lit = Phaser.Math.Between(0, 3) > 0;
          g.fillStyle(lit ? 0xFFE080 : 0x0A1A2A, lit ? 0.85 : 1);
          g.fillRect(wx, wy, 10, 13);
        }
      }
    }
  }

  private buildPlatformLayout(H: number): void {
    const layout = [
      { x: 100,  y: H - 80,  n: 3 },   // bus stop bench
      { x: 320,  y: H - 60,  n: 4 },   // маршрутка 1 roof
      { x: 640,  y: H - 90,  n: 3 },   // bus stop bench 2
      { x: 900,  y: H - 65,  n: 6 },   // маршрутка 2 roof (long)
      { x: 1200, y: H - 75,  n: 2 },   // newspaper stand
      { x: 1430, y: H - 85,  n: 3 },   // bench 3
      { x: 1740, y: H - 60,  n: 4 },   // finish маршрутка roof
    ];

    for (const { x, y, n } of layout) {
      const tileKey = x > 600 ? 'bench' : 'bench';
      for (let i = 0; i < n; i++) {
        this.platforms.create(x + i * 32 + 16, y, tileKey).refreshBody();
      }
    }
  }

  private buildObstacles(H: number): void {
    this.obstacles = this.physics.add.group();
    this.puddles   = this.physics.add.group();

    // Moving grandmas (slow back-and-forth)
    const grandmas = [
      { x: 240,  min: 170,  max: 400,  spd: 42 },
      { x: 820,  min: 700,  max: 1000, spd: 38 },
      { x: 1350, min: 1250, max: 1540, spd: 44 },
    ];

    for (const g of grandmas) {
      const gma = new MovingObstacle(this, g.x, H - 35, 'grandma', g.min, g.max, g.spd);
      this.obstacles.add(gma);
    }

    // Scooters (fast)
    const scooters = [
      { x: 510,  min: 310,  max: 650,  spd: -185 },
      { x: 1300, min: 1090, max: 1560, spd:  195 },
    ];

    for (const s of scooters) {
      const sc = new MovingObstacle(this, s.x, H - 30, 'scooter', s.min, s.max, s.spd);
      this.obstacles.add(sc);
    }

    // Puddles — overlap hazard for Sonya only
    const puddleXs = [200, 570, 1060, 1480];
    for (const px of puddleXs) {
      const p = this.physics.add.image(px, H - 18, 'puddle');
      const pb = p.body as Phaser.Physics.Arcade.Body;
      pb.allowGravity = false;
      pb.setSize(50, 10);
      this.puddles.add(p);
    }
  }

  // ─── Players ────────────────────────────────────────────────────────────────

  private createPlayers(): void {
    this.sonya  = new Sonya(this, 60, GAME.HEIGHT - 80);
    this.yana   = new Yana(this, 96, GAME.HEIGHT - 80);
    this.active = this.sonya;
    this.yana.setAlpha(0.55);
  }

  private switchPlayer(): void {
    const prev  = this.active;
    this.active = prev === this.sonya ? this.yana : this.sonya;
    prev.setAlpha(0.55);
    this.active.setAlpha(1);

    const name = this.active === this.sonya ? 'Соня' : 'Яна';
    const other = this.active === this.sonya ? 'Яна' : 'Соня';
    this.activeLabel.setText(name);
    this.switchLabel.setText(other);

    this.cameras.main.startFollow(this.active, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(120, 60);
  }

  // ─── Collisions ─────────────────────────────────────────────────────────────

  private setupCollisions(): void {
    this.physics.add.collider(this.sonya, this.platforms);
    this.physics.add.collider(this.yana,  this.platforms);

    // Moving obstacles — collider (player gets pushed)
    this.physics.add.collider(this.sonya, this.obstacles);
    this.physics.add.collider(this.yana,  this.obstacles);

    // Puddles — only affect Sonya (Yana is careful)
    this.physics.add.overlap(
      this.sonya,
      this.puddles,
      (() => this.onSonyaPuddle()) as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
    );

    // Finish door
    const tryFinish = () => { if (!this.levelDone) this.onLevelComplete(); };
    this.physics.add.overlap(
      this.sonya, this.finishDoor,
      tryFinish as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
    );
    this.physics.add.overlap(
      this.yana, this.finishDoor,
      tryFinish as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
    );
  }

  private onSonyaPuddle(): void {
    if (this.time.now < this.puddleCooldownAt) return;
    this.puddleCooldownAt = this.time.now + 700;

    const body = this.sonya.body as Phaser.Physics.Arcade.Body;
    this.sonya.setVelocityX(body.velocity.x * 0.15);

    // Hint to use dash
    if (!this.dialog.isActive) {
      this.hintText.setVisible(true);
      this.time.delayedCall(1800, () => this.hintText.setVisible(false));
    }
  }

  // ─── Finish ─────────────────────────────────────────────────────────────────

  private onLevelComplete(): void {
    this.levelDone = true;
    const { WIDTH: W, HEIGHT: H } = GAME;

    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0)
      .setScrollFactor(0).setDepth(200);
    this.tweens.add({ targets: dim, fillAlpha: 0.65, duration: 500 });

    this.time.delayedCall(500, () => {
      this.add.text(W / 2, H / 2 - 60, 'Уровень 2 пройден!', {
        fontSize: '30px', color: '#AAFFAA', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

      this.add.text(W / 2, H / 2 - 16, 'Успели! Поезд ждёт.', {
        fontSize: '16px', color: '#FFD060', fontFamily: 'Arial',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

      const btn = this.add.rectangle(W / 2, H / 2 + 50, 220, 44, 0x446644)
        .setScrollFactor(0).setDepth(201).setInteractive();
      this.add.text(W / 2, H / 2 + 50, 'Уровень 3 →', {
        fontSize: '16px', color: '#FFFFFF', fontFamily: 'Arial',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(202);

      btn.on('pointerdown', () => {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.time.delayedCall(300, () => this.scene.start('Level3Scene'));
      });
      btn.on('pointerover', () => btn.setFillStyle(0x6688AA));
      btn.on('pointerout',  () => btn.setFillStyle(0x446688));
    });
  }

  // ─── Triggers ───────────────────────────────────────────────────────────────

  private setupTriggers(): void {
    const H = GAME.HEIGHT;
    this.triggers = [
      { x: 120,           y: H - 60, radius: 120, lines: DIALOGS.driver,  fired: false },
      { x: 680,           y: H - 80, radius: 130, lines: DIALOGS.twins,   fired: false },
      { x: 520,           y: H - 60, radius: 110, lines: DIALOGS.scooter, fired: false },
      { x: this.WORLD_W - 200, y: H - 60, radius: 160, lines: DIALOGS.finish, fired: false },
    ];
  }

  private checkTriggers(): void {
    const px = this.active.x;
    const py = this.active.y;
    for (const t of this.triggers) {
      if (t.fired || this.dialog.isActive) continue;
      if (Phaser.Math.Distance.Between(px, py, t.x, t.y) < t.radius) {
        t.fired = true;
        this.dialog.show(t.lines);
      }
    }
  }

  // ─── HUD ────────────────────────────────────────────────────────────────────

  private createHUD(): void {
    const W = GAME.WIDTH;

    this.add.text(W / 2, 14, 'Уровень 2: Дорога до вокзала', {
      fontSize: '14px', color: '#FFF0C0', fontFamily: 'Arial',
    }).setOrigin(0.5, 0).setScrollFactor(0);

    this.add.text(W - 16, 14, 'Играет:', {
      fontSize: '12px', color: '#AAA0FF', fontFamily: 'Arial',
    }).setOrigin(1, 0).setScrollFactor(0);

    this.activeLabel = this.add.text(W - 16, 30, 'Соня', {
      fontSize: '14px', color: '#FFD060', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(1, 0).setScrollFactor(0);

    // Puddle hint — shown on slip
    this.hintText = this.add.text(W / 2, 44, 'Соня поскользнулась! Жми ★', {
      fontSize: '13px', color: '#FF8888', fontFamily: 'Arial',
    }).setOrigin(0.5, 0).setScrollFactor(0).setVisible(false);

    // Yana immunity hint (shown once)
    this.add.text(16, 14, 'Яна: не скользит в лужах', {
      fontSize: '11px', color: '#7AB0FF', fontFamily: 'Arial',
    }).setScrollFactor(0);
  }

  // ─── Touch controls ─────────────────────────────────────────────────────────

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

    const btmY = H - pad - r;
    const left  = mkBtn(pad + r,               btmY, '◀');
    const right = mkBtn(pad + r * 3 + 16,      btmY, '▶');
    const jump  = mkBtn(W - pad - r,            btmY, '▲');
    const sp    = mkBtn(W - pad - r * 3 - 16,  btmY, '★');
    const sw    = mkBtn(W - pad - r * 5 - 32,  btmY, 'Яна');

    this.switchLabel = sw.t;
    this.specialBtn  = sp.c;

    const hold = (btn: Phaser.GameObjects.Arc, fn: (v: boolean) => void) => {
      btn.on('pointerdown', () => { fn(true);  btn.setFillStyle(COLORS.BTN_ACTIVE, 0.75); });
      btn.on('pointerup',   () => { fn(false); btn.setFillStyle(COLORS.BTN_BG, a); });
      btn.on('pointerout',  () => { fn(false); btn.setFillStyle(COLORS.BTN_BG, a); });
    };

    hold(left.c,  (v) => { this.touchLeft  = v; });
    hold(right.c, (v) => { this.touchRight = v; });

    jump.c.on('pointerdown', () => { this.touchJump    = true;  jump.c.setFillStyle(COLORS.BTN_ACTIVE, 0.75); });
    jump.c.on('pointerup',   () => { jump.c.setFillStyle(COLORS.BTN_BG, a); });
    jump.c.on('pointerout',  () => { jump.c.setFillStyle(COLORS.BTN_BG, a); });

    sp.c.on('pointerdown', () => { this.touchSpecial = true; sp.c.setFillStyle(COLORS.BTN_ACTIVE, 0.75); });
    sp.c.on('pointerup',   () => { sp.c.setFillStyle(COLORS.BTN_BG, a); });
    sp.c.on('pointerout',  () => { sp.c.setFillStyle(COLORS.BTN_BG, a); });

    sw.c.on('pointerdown', () => { this.switchPlayer(); sw.c.setFillStyle(COLORS.BTN_ACTIVE, 0.75); });
    sw.c.on('pointerup',   () => { sw.c.setFillStyle(COLORS.BTN_BG, a); });
    sw.c.on('pointerout',  () => { sw.c.setFillStyle(COLORS.BTN_BG, a); });
  }

  // ─── Camera ─────────────────────────────────────────────────────────────────

  private setupKeyboard(): void {
    this.cursors  = this.input.keyboard!.createCursorKeys();
    this.spaceKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    this.tabKey   = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.TAB);
  }

  private setupCamera(): void {
    this.cameras.main.setBounds(0, 0, this.WORLD_W, GAME.HEIGHT);
    this.cameras.main.startFollow(this.sonya, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(120, 60);
  }

  private updateSpecialBtn(): void {
    if (!this.specialBtn) return;
    const ready = this.active === this.sonya && this.sonya.isDashReady;
    this.specialBtn.setFillStyle(
      ready ? 0xAA8800 : COLORS.BTN_BG,
      ready ? 0.75 : 0.3,
    );
  }
}
