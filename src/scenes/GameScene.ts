import Phaser from 'phaser';
import { GAME, COLORS, CollectibleType } from '../config';
import { Sonya, generateSonyaTextures } from '../entities/Sonya';
import { Yana, generateYanaTextures } from '../entities/Yana';
import { Collectible, generateCollectibleTextures } from '../entities/Collectible';
import { Player } from '../entities/Player';
import { DialogSystem, DialogLine } from '../systems/DialogSystem';

// ─── Dialogue data for Level 1 ────────────────────────────────────────────────

const SONYA_COLOR = '#FFD060';
const YANA_COLOR  = '#7AB0FF';
const NPC_COLOR   = '#FF9999';

const DIALOGS: Record<string, DialogLine[]> = {
  intro: [
    { speaker: 'NPC', text: 'Куда это вы с двумя чемоданами?', color: NPC_COLOR },
    { speaker: 'Соня', text: 'Нам каждый нужен.', color: SONYA_COLOR },
    { speaker: 'Яна',  text: 'По-отдельности.', color: YANA_COLOR },
  ],
  mid: [
    { speaker: 'NPC', text: 'Возьмите одно на двоих!', color: NPC_COLOR },
    { speaker: 'Соня', text: 'Мы не одинаковые. Мы просто синхронно устали.', color: SONYA_COLOR },
  ],
  exit: [
    { speaker: 'Яна',  text: 'Это не паника...', color: YANA_COLOR },
    { speaker: 'Соня', text: '...это ускоренная подготовка.', color: SONYA_COLOR },
  ],
  allCollected: [
    { speaker: 'Соня', text: 'Всё! Едем!', color: SONYA_COLOR, duration: 1600 },
    { speaker: 'Яна',  text: 'До поезда 20 минут. Бежим.', color: YANA_COLOR, duration: 1800 },
  ],
};

// ─── Trigger types ────────────────────────────────────────────────────────────

interface ProximityTrigger {
  x: number;
  y: number;
  radius: number;
  lines: DialogLine[];
  fired: boolean;
}

export class GameScene extends Phaser.Scene {
  private sonya!: Sonya;
  private yana!: Yana;
  private active!: Player;

  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private collectibles!: Phaser.Physics.Arcade.Group;
  private finishDoor!: Phaser.Physics.Arcade.Image;

  private dialog!: DialogSystem;
  private triggers: ProximityTrigger[] = [];

  private collected      = 0;
  private readonly total = 5;
  private doorUnlocked   = false;
  private levelDone      = false;

  private itemText!: Phaser.GameObjects.Text;
  private switchLabel!: Phaser.GameObjects.Text;
  private specialBtn!: Phaser.GameObjects.Arc;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private tabKey!: Phaser.Input.Keyboard.Key;

  private touchLeft    = false;
  private touchRight   = false;
  private touchJump    = false;
  private touchSpecial = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  create(): void {
    this.levelDone    = false;
    this.doorUnlocked = false;
    this.collected    = 0;
    this.triggers     = [];

    this.buildTextures();
    this.createWorld();
    this.createPlayers();
    this.createCollectibles();
    this.setupCollisions();
    this.setupKeyboard();
    this.createHUD();
    this.createTouchControls();
    this.setupCamera();

    this.dialog = new DialogSystem(this);
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
    generateCollectibleTextures(this);
    this.makeTile('platform', COLORS.PLATFORM_MID, COLORS.PLATFORM_TOP, COLORS.PLATFORM_SHADOW);
    this.makeTile('ground',   COLORS.GROUND_MID,   COLORS.GROUND_TOP,   COLORS.GROUND_SHADOW);
    this.makeNpcTexture();
    this.makeDrawerTexture();
    this.makeDoorTexture(false);
    this.makeDoorTexture(true);
  }

  private makeTile(key: string, mid: number, top: number, shadow: number): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(mid);    g.fillRect(0, 0,  32, 16);
    g.fillStyle(top);    g.fillRect(0, 0,  32,  3);
    g.fillStyle(shadow); g.fillRect(0, 13, 32,  3);
    g.generateTexture(key, 32, 16);
    g.destroy();
  }

  private makeNpcTexture(): void {
    const g = this.make.graphics({}, false);

    // Gray hair (grandma-ish relative)
    g.fillStyle(0xAAAAAA);
    g.fillCircle(16, 10, 10);
    g.fillEllipse(16, 5, 20, 12);

    // Face
    g.fillStyle(0xF0C090);
    g.fillCircle(16, 12, 9);

    // Eyes
    g.fillStyle(0x5A3A20);
    g.fillCircle(13, 12, 1.5);
    g.fillCircle(19, 12, 1.5);

    // Smile
    g.fillStyle(0xC08070);
    g.fillRect(12, 16, 8, 2);

    // Body — purple house coat
    g.fillStyle(0x8030A0);
    g.fillRect(7, 22, 18, 20);

    // Collar
    g.fillStyle(0x6020A0);
    g.fillTriangle(16, 22, 7, 22, 10, 32);
    g.fillTriangle(16, 22, 25, 22, 22, 32);

    // Legs
    g.fillStyle(0x501870);
    g.fillRect(7,  42, 7, 10);
    g.fillRect(18, 42, 7, 10);

    // Slippers
    g.fillStyle(0x903090);
    g.fillRect(5,  50, 9, 4);
    g.fillRect(18, 50, 9, 4);

    g.generateTexture('npc', 32, 54);
    g.destroy();
  }

  private makeDrawerTexture(): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(0x8B6040);
    g.fillRect(0, 0, 32, 22);
    g.fillStyle(0x6B4020);
    g.fillRect(0, 0, 32, 3);
    g.fillStyle(0xC8904C);
    g.fillRect(2, 5, 28, 15);
    g.fillStyle(0xAA7030);
    g.fillRect(12, 11, 8, 5);
    g.fillStyle(0x8B5020);
    g.fillRect(14, 12, 4, 3);
    g.generateTexture('drawer', 32, 22);
    g.destroy();
  }

  private makeDoorTexture(open: boolean): void {
    const key = open ? 'door_open' : 'door_closed';
    const g   = this.make.graphics({}, false);

    // Frame
    g.fillStyle(0x5A4030);
    g.fillRect(0, 0, 48, 88);

    // Door face
    g.fillStyle(open ? 0x40C060 : 0x404050);
    g.fillRect(4, 4, 40, 80);

    // Door panels
    g.fillStyle(open ? 0x30A050 : 0x303040);
    g.fillRect(7, 8, 16, 34);
    g.fillRect(25, 8, 16, 34);
    g.fillRect(7, 46, 34, 34);

    // Knob
    g.fillStyle(0xD4A020);
    g.fillCircle(38, 44, 4);
    g.fillStyle(0xFFD040);
    g.fillCircle(37, 43, 2);

    if (open) {
      // Glow outline
      g.lineStyle(2, 0x80FF80, 0.8);
      g.strokeRect(4, 4, 40, 80);
    }

    g.generateTexture(key, 48, 88);
    g.destroy();
  }

  // ─── World ──────────────────────────────────────────────────────────────────

  private createWorld(): void {
    const { WIDTH: W, HEIGHT: H, WORLD_SCALE } = GAME;
    const worldW = Math.floor(W * WORLD_SCALE);

    this.physics.world.setBounds(0, 0, worldW, H);

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x1a0a2e, 0x1a0a2e, 0x2d1b4e, 0x2d1b4e, 1);
    bg.fillRect(0, 0, worldW, H);

    // Faint floor line / wall suggestion
    bg.fillStyle(0x2A1848, 0.5);
    bg.fillRect(0, H - 50, worldW, 34);

    this.platforms = this.physics.add.staticGroup();

    // Ground
    for (let x = 0; x < worldW; x += 32) {
      this.platforms.create(x + 16, H - 8, 'ground').refreshBody();
    }

    // Furniture platforms
    const layout: { x: number; y: number; n: number }[] = [
      { x: 96,   y: H - 120, n: 4 },
      { x: 290,  y: H - 165, n: 3 },
      { x: 480,  y: H - 130, n: 3 },
      { x: 672,  y: H - 195, n: 4 },
      { x: 864,  y: H - 150, n: 3 },
      { x: 1056, y: H - 175, n: 4 },
      { x: 1260, y: H - 140, n: 3 },
    ];

    for (const { x, y, n } of layout) {
      for (let i = 0; i < n; i++) {
        this.platforms.create(x + i * 32 + 16, y, 'platform').refreshBody();
      }
    }

    // Open drawers — short obstacles on the ground the player must jump over
    const drawerXs = [230, 580, 970];
    for (const dx of drawerXs) {
      this.platforms.create(dx, H - 19, 'drawer').setScale(1, 1).refreshBody();
    }

    // NPC relatives — static figures on platforms
    this.add.image(176, H - 142, 'npc');   // on sofa platform
    this.add.image(736, H - 217, 'npc');   // on wardrobe platform

    // Finish door
    this.finishDoor = this.physics.add.image(worldW - 60, H - 52, 'door_closed');
    const doorBody  = this.finishDoor.body as Phaser.Physics.Arcade.Body;
    doorBody.allowGravity = false;
    doorBody.immovable    = true;

    // "Выход" label above door
    this.add.text(worldW - 60, H - 100, 'Выход', {
      fontSize: '12px', color: '#666666', fontFamily: 'Arial',
    }).setOrigin(0.5);
  }

  // ─── Players ────────────────────────────────────────────────────────────────

  private createPlayers(): void {
    this.sonya  = new Sonya(this, 60, 300);
    this.yana   = new Yana(this,  96, 300);
    this.active = this.sonya;
    this.yana.setAlpha(0.55);
  }

  private switchPlayer(): void {
    const prev  = this.active;
    this.active = prev === this.sonya ? this.yana : this.sonya;

    prev.setAlpha(0.55);
    this.active.setAlpha(1);

    this.switchLabel.setText(this.active === this.sonya ? 'Яна' : 'Соня');
    this.cameras.main.startFollow(this.active, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(120, 60);
  }

  // ─── Collectibles ───────────────────────────────────────────────────────────

  private createCollectibles(): void {
    this.collectibles = this.physics.add.group();

    const spots: { x: number; y: number; type: CollectibleType }[] = [
      { x: 164,  y: GAME.HEIGHT - 80,  type: 'suitcase' },
      { x: 354,  y: GAME.HEIGHT - 210, type: 'tickets'  },
      { x: 534,  y: GAME.HEIGHT - 175, type: 'charger'  },
      { x: 752,  y: GAME.HEIGHT - 240, type: 'water'    },
      { x: 1080, y: GAME.HEIGHT - 220, type: 'props'    },
    ];

    for (const { x, y, type } of spots) {
      this.collectibles.add(new Collectible(this, x, y, type));
    }
  }

  private onCollect(item: Collectible): void {
    if (item.collected) return;
    item.collect();

    this.collected++;
    this.itemText.setText(`Вещи: ${this.collected}/${this.total}`);

    if (this.collected >= this.total) {
      this.time.delayedCall(400, () => {
        this.dialog.show(DIALOGS.allCollected);
        this.time.delayedCall(600, () => this.unlockDoor());
      });
    }
  }

  // ─── Finish door ────────────────────────────────────────────────────────────

  private unlockDoor(): void {
    this.doorUnlocked = true;
    this.finishDoor.setTexture('door_open');

    this.tweens.add({
      targets: this.finishDoor,
      scaleX: 1.12,
      scaleY: 1.12,
      duration: 280,
      yoyo: true,
      ease: 'Power2',
    });
  }

  private onLevelComplete(): void {
    if (this.levelDone) return;
    this.levelDone = true;

    this.showLevelComplete();
  }

  private updateSpecialBtn(): void {
    if (!this.specialBtn) return;
    const ready = this.active === this.sonya && this.sonya.isDashReady;
    this.specialBtn.setFillStyle(
      ready ? 0xAA8800 : COLORS.BTN_BG,
      ready ? 0.75 : 0.3,
    );
  }

  private showLevelComplete(): void {
    const { WIDTH: W, HEIGHT: H } = GAME;

    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0)
      .setScrollFactor(0).setDepth(200);
    this.tweens.add({ targets: dim, fillAlpha: 0.65, duration: 500 });

    this.time.delayedCall(500, () => {
      this.add.text(W / 2, H / 2 - 60, 'Уровень 1 пройден!', {
        fontSize: '30px', color: '#AAFFAA', fontFamily: 'Arial', fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

      this.add.text(W / 2, H / 2 - 16, 'До поезда 20 минут. Бежим!', {
        fontSize: '16px', color: '#FFD060', fontFamily: 'Arial',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

      const btn = this.add.rectangle(W / 2, H / 2 + 50, 220, 44, 0x446644)
        .setScrollFactor(0).setDepth(201).setInteractive();
      this.add.text(W / 2, H / 2 + 50, 'Уровень 2 →', {
        fontSize: '16px', color: '#FFFFFF', fontFamily: 'Arial',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(202);

      btn.on('pointerdown', () => {
        this.cameras.main.fadeOut(300, 0, 0, 0);
        this.time.delayedCall(300, () => this.scene.start('Level2Scene'));
      });
      btn.on('pointerover', () => btn.setFillStyle(0x66AA66));
      btn.on('pointerout',  () => btn.setFillStyle(0x446644));
    });
  }

  // ─── Proximity triggers ─────────────────────────────────────────────────────

  private setupTriggers(): void {
    const H = GAME.HEIGHT;

    this.triggers = [
      {
        x: 170, y: H - 130,
        radius: 110,
        lines: DIALOGS.intro,
        fired: false,
      },
      {
        x: 720, y: H - 210,
        radius: 120,
        lines: DIALOGS.mid,
        fired: false,
      },
      {
        x: Math.floor(GAME.WIDTH * GAME.WORLD_SCALE) - 180, y: H - 80,
        radius: 150,
        lines: DIALOGS.exit,
        fired: false,
      },
    ];
  }

  private checkTriggers(): void {
    const px = this.active.x;
    const py = this.active.y;

    for (const t of this.triggers) {
      if (t.fired || this.dialog.isActive) continue;
      const dist = Phaser.Math.Distance.Between(px, py, t.x, t.y);
      if (dist < t.radius) {
        t.fired = true;
        this.dialog.show(t.lines);
      }
    }
  }

  // ─── Collisions ─────────────────────────────────────────────────────────────

  private setupCollisions(): void {
    this.physics.add.collider(this.sonya, this.platforms);
    this.physics.add.collider(this.yana,  this.platforms);

    const pick = (_: unknown, item: unknown) => this.onCollect(item as Collectible);
    this.physics.add.overlap(
      this.sonya, this.collectibles,
      pick as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
    );
    this.physics.add.overlap(
      this.yana, this.collectibles,
      pick as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
    );

    // Finish door — only active when unlocked
    const tryFinish = () => {
      if (this.doorUnlocked) this.onLevelComplete();
    };
    this.physics.add.overlap(
      this.sonya, this.finishDoor,
      tryFinish as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
    );
    this.physics.add.overlap(
      this.yana, this.finishDoor,
      tryFinish as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
    );
  }

  // ─── HUD ────────────────────────────────────────────────────────────────────

  private createHUD(): void {
    const W = GAME.WIDTH;

    this.itemText = this.add.text(16, 14, `Вещи: 0/${this.total}`, {
      fontSize: '14px', color: '#FFF0C0', fontFamily: 'Arial',
    }).setScrollFactor(0);

    this.add.text(W / 2, 14, 'Уровень 1: Сборы и хаос дома', {
      fontSize: '14px', color: '#FFF0C0', fontFamily: 'Arial',
    }).setOrigin(0.5, 0).setScrollFactor(0);

    this.add.text(W - 16, 14, 'Играет:', {
      fontSize: '12px', color: '#AAA0FF', fontFamily: 'Arial',
    }).setOrigin(1, 0).setScrollFactor(0);

    // Updated via switchLabel ref (assigned in createTouchControls)
    this.switchLabel = this.add.text(W - 16, 30, 'Соня', {
      fontSize: '14px', color: '#FFD060', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(1, 0).setScrollFactor(0);
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

    const btmY  = H - pad - r;
    const left  = mkBtn(pad + r,                  btmY, '◀');
    const right = mkBtn(pad + r * 3 + 16,         btmY, '▶');
    const jump  = mkBtn(W - pad - r,               btmY, '▲');
    const sp    = mkBtn(W - pad - r * 3 - 16,     btmY, '★');
    const sw    = mkBtn(W - pad - r * 5 - 32,     btmY, 'Яна');

    this.switchLabel = sw.t;
    this.specialBtn  = sp.c;

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
    const worldW = Math.floor(GAME.WIDTH * GAME.WORLD_SCALE);
    this.cameras.main.setBounds(0, 0, worldW, GAME.HEIGHT);
    this.cameras.main.startFollow(this.sonya, true, 0.08, 0.08);
    this.cameras.main.setDeadzone(120, 60);
  }
}
