import Phaser from 'phaser';
import { GAME, COLORS } from '../config';
import { Sonya, generateSonyaTextures } from '../entities/Sonya';
import { Yana, generateYanaTextures } from '../entities/Yana';
import { Player } from '../entities/Player';
import { MovingObstacle } from '../entities/MovingObstacle';
import { DialogSystem, DialogLine } from '../systems/DialogSystem';

// ─── Dialogue ─────────────────────────────────────────────────────────────────

const SC = '#FFD060';
const YC = '#7AB0FF';
const NC = '#FF9999';
const OC = '#AAFFAA';  // organizer

const DIALOGS: Record<string, DialogLine[]> = {
  entry: [
    { speaker: 'Организатор', text: 'Наконец-то! Вы кто?', color: OC },
    { speaker: 'Соня', text: 'Участницы. Яна и Соня.', color: SC },
    { speaker: 'Организатор', text: 'А, те самые. Вы почти опоздали.', color: OC },
    { speaker: 'Яна', text: 'Почти — это значит не опоздали.', color: YC },
  ],
  corridor: [
    { speaker: 'Указатель', text: '← Главный вход  → Запасный выход', color: NC },
    { speaker: 'Указатель', text: '↑ Зал  ↓ Зал  ↖ Зал  ↗ Буфет', color: NC, duration: 2400 },
    { speaker: 'Соня', text: 'Нам просто нужен зал.', color: SC },
  ],
  backstage: [
    { speaker: 'Человек в чёрном', text: 'Не трогайте реквизит!', color: NC },
    { speaker: 'Соня', text: 'Он нам нужен.', color: SC },
    { speaker: 'Человек в чёрном', text: '...берите.', color: NC, duration: 1600 },
  ],
  preStage: [
    { speaker: 'Яна',  text: 'Это наш выход?',          color: YC },
    { speaker: 'Соня', text: 'Звучит как риторический.', color: SC },
    { speaker: 'Яна',  text: 'Погнали.',                 color: YC, duration: 1600 },
  ],
  ending: [
    { speaker: 'Зал',  text: 'БРАВО!!! ЕЩЁ!!!', color: OC },
    { speaker: 'Соня', text: 'Мы не одинаковые...', color: SC },
    { speaker: 'Яна',  text: '...но это и есть наша фишка.', color: YC },
    { speaker: 'Соня', text: 'И да. Это был мой чемодан.', color: SC },
    { speaker: 'Яна',  text: 'Он тоже так думает.', color: YC, duration: 3000 },
  ],
};

const PERF_PROMPTS = [
  'Покажи реквизит!',
  'Придумай оправдание!',
  'Удержи внимание зала!',
] as const;

// ─── Trigger ──────────────────────────────────────────────────────────────────

interface Trigger {
  x: number; y: number; radius: number;
  lines: DialogLine[];
  fired: boolean;
}

export class Level3Scene extends Phaser.Scene {
  private sonya!: Sonya;
  private yana!: Yana;
  private active!: Player;

  private platforms!: Phaser.Physics.Arcade.StaticGroup;
  private obstacles!: Phaser.Physics.Arcade.Group;
  private props!: Phaser.GameObjects.Image[];
  private propBodies!: Phaser.Physics.Arcade.Image[];

  private dialog!: DialogSystem;
  private triggers: Trigger[] = [];

  private collectedProps  = 0;
  private readonly TOTAL_PROPS = 4;
  private propText!: Phaser.GameObjects.Text;

  // Performance (mini-game on stage)
  private perfPhase: 'none' | 'active' | 'done' = 'none';
  private perfStep  = 0;
  private perfContainer!: Phaser.GameObjects.Container;
  private perfPromptText!: Phaser.GameObjects.Text;
  private perfSubText!: Phaser.GameObjects.Text;
  private stageDone = false;

  // Input
  private switchLabel!: Phaser.GameObjects.Text;
  private activeLabel!: Phaser.GameObjects.Text;
  private specialBtn!: Phaser.GameObjects.Arc;

  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private spaceKey!: Phaser.Input.Keyboard.Key;
  private tabKey!: Phaser.Input.Keyboard.Key;

  private touchLeft    = false;
  private touchRight   = false;
  private touchJump    = false;
  private touchSpecial = false;

  private readonly WORLD_W = Math.floor(GAME.WIDTH * 2.2);

  constructor() {
    super({ key: 'Level3Scene' });
  }

  create(): void {
    this.perfPhase      = 'none';
    this.perfStep       = 0;
    this.stageDone      = false;
    this.collectedProps = 0;
    this.triggers       = [];
    this.props          = [];
    this.propBodies     = [];

    this.buildTextures();
    this.physics.world.setBounds(0, 0, this.WORLD_W, GAME.HEIGHT);
    this.createWorld();
    this.createPlayers();
    this.createObstacles();
    this.createStageProps();
    this.setupCollisions();
    this.setupKeyboard();
    this.dialog = new DialogSystem(this);
    this.createHUD();
    this.createTouchControls();
    this.setupCamera();
    this.setupTriggers();
    this.cameras.main.fadeIn(400, 0, 0, 0);
  }

  update(_t: number, dt: number): void {
    if (this.stageDone) return;

    if (this.perfPhase === 'active') {
      this.handlePerfInput();
      return;
    }

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
    this.checkPerformanceTrigger();
    this.updateSpecialBtn();
    void dt;
  }

  // ─── Performance input ──────────────────────────────────────────────────────

  private handlePerfInput(): void {
    const tapped =
      Phaser.Input.Keyboard.JustDown(this.cursors.up)  ||
      Phaser.Input.Keyboard.JustDown(this.spaceKey)    ||
      this.touchJump || this.touchSpecial;

    this.touchJump    = false;
    this.touchSpecial = false;

    if (tapped) this.onPerfTap();
  }

  // ─── Textures ───────────────────────────────────────────────────────────────

  private buildTextures(): void {
    generateSonyaTextures(this);
    generateYanaTextures(this);
    this.makeTile('stage_floor', 0x6B4820, 0x8B6030, 0x3A2010);
    this.makeTile('stage_riser', 0x8B6030, 0xAA8050, 0x5A3818);
    this.makeStagerTexture();
    this.makePropTextures();
  }

  private makeTile(key: string, mid: number, top: number, shadow: number): void {
    const g = this.make.graphics({}, false);
    g.fillStyle(mid);    g.fillRect(0, 0,  32, 16);
    g.fillStyle(top);    g.fillRect(0, 0,  32,  3);
    g.fillStyle(shadow); g.fillRect(0, 13, 32,  3);
    g.generateTexture(key, 32, 16);
    g.destroy();
  }

  private makeStagerTexture(): void {
    const g = this.make.graphics({}, false);
    // Stage crew — all black, headset
    g.fillStyle(0xF0C090);
    g.fillCircle(16, 10, 8);
    // Headset
    g.fillStyle(0x222222);
    g.fillRect(10, 7, 12, 3);
    g.fillCircle(10, 10, 3);
    g.fillCircle(22, 10, 3);
    // Black outfit
    g.fillStyle(0x111111);
    g.fillRect(8, 18, 16, 20);
    // Walkie-talkie
    g.fillStyle(0x444444);
    g.fillRect(22, 22, 5, 9);
    // Legs
    g.fillStyle(0x111111);
    g.fillRect(8,  38, 6, 10);
    g.fillRect(18, 38, 6, 10);
    g.fillStyle(0x080808);
    g.fillRect(6,  46, 8, 3);
    g.fillRect(18, 46, 8, 3);
    g.generateTexture('stager', 32, 49);
    g.destroy();
  }

  private makePropTextures(): void {
    // Microphone
    let g = this.make.graphics({}, false);
    g.fillStyle(0x888888);
    g.fillRect(11, 8, 4, 12);
    g.fillStyle(0xCCCCCC);
    g.fillCircle(13, 7, 6);
    g.fillStyle(0x555555);
    g.fillRect(11, 20, 4, 4);
    g.generateTexture('item_mic', 26, 26);
    g.destroy();

    // Script (folded paper)
    g = this.make.graphics({}, false);
    g.fillStyle(0xF5F0E0);
    g.fillRect(4, 2, 18, 22);
    g.fillStyle(0xAAAAAA);
    g.fillRect(6, 6, 14, 2);
    g.fillRect(6, 10, 14, 2);
    g.fillRect(6, 14, 10, 2);
    g.fillStyle(0xE0D8B0);
    g.fillRect(4, 2, 5, 22);
    g.generateTexture('item_script', 26, 26);
    g.destroy();

    // Badge / credential
    g = this.make.graphics({}, false);
    g.fillStyle(0xCC2222);
    g.fillRoundedRect(3, 4, 20, 18, 2);
    g.fillStyle(0xFFFFFF);
    g.fillRect(5, 7, 16, 3);
    g.fillRect(5, 12, 12, 2);
    g.fillStyle(0xFFCC00);
    g.fillRect(10, 1, 6, 4);
    g.generateTexture('item_badge', 26, 26);
    g.destroy();

    // Costume prop — star-shaped bowtie
    g = this.make.graphics({}, false);
    g.fillStyle(0xFF6699);
    g.fillTriangle(13, 6, 4, 14, 13, 14);
    g.fillTriangle(13, 6, 22, 14, 13, 14);
    g.fillTriangle(13, 20, 4, 12, 13, 12);
    g.fillTriangle(13, 20, 22, 12, 13, 12);
    g.fillStyle(0xFF88BB);
    g.fillCircle(13, 13, 3);
    g.generateTexture('item_costume', 26, 26);
    g.destroy();
  }

  // ─── World ──────────────────────────────────────────────────────────────────

  private createWorld(): void {
    const { HEIGHT: H } = GAME;
    const WW = this.WORLD_W;

    const bg = this.add.graphics();
    this.drawBackground(bg, WW, H);

    this.platforms = this.physics.add.staticGroup();

    // Floor tiles across world
    for (let x = 0; x < WW; x += 32) {
      this.platforms.create(x + 16, H - 8, 'stage_floor').refreshBody();
    }

    this.buildPlatformLayout(H);
    this.drawDecorativeElements(H);
  }

  private drawBackground(g: Phaser.GameObjects.Graphics, ww: number, h: number): void {
    // ── Section 1: Backstage (warm dark amber) ──
    g.fillStyle(0x180C06);
    g.fillRect(0, 0, 580, h);
    // Amber glow from above
    for (let i = 0; i < 4; i++) {
      g.fillStyle(0xC86020, 0.06 + i * 0.02);
      g.fillRect(i * 5, 0, 580 - i * 10, h * 0.4);
    }

    // ── Section 2: Corridors (cool backstage hallway) ──
    g.fillStyle(0x0E0E1C);
    g.fillRect(580, 0, 520, h);
    // Fluorescent strip lights
    for (let x = 600; x < 1100; x += 120) {
      g.fillStyle(0xCCCCFF, 0.12);
      g.fillRect(x, 0, 60, 8);
    }

    // ── Section 3: Stage (spotlight theater) ──
    g.fillStyle(0x06040A);
    g.fillRect(1100, 0, ww - 1100, h);

    // Spotlights on stage
    const spots = [1250, 1420, 1580];
    for (const sx of spots) {
      // Outer glow
      g.fillStyle(0xFFD060, 0.04);
      g.fillCircle(sx, h * 0.6, 160);
      g.fillStyle(0xFFD060, 0.08);
      g.fillCircle(sx, h * 0.6, 100);
      g.fillStyle(0xFFE080, 0.12);
      g.fillCircle(sx, h * 0.6, 55);
    }

    // Audience silhouettes (bottom of stage section)
    for (let x = 1120; x < ww - 10; x += 22) {
      g.fillStyle(0x0A0808);
      g.fillCircle(x, h + 6, 9);
      g.fillRect(x - 7, h, 14, 18);
    }

    // Stage apron edge
    g.fillStyle(0xAA8040, 0.4);
    g.fillRect(1100, h - 22, ww - 1100, 5);

    // Curtain ropes in backstage (decorative)
    g.fillStyle(0x8B4010, 0.6);
    for (const rx of [80, 200, 340, 480]) {
      for (let ry = 0; ry < h - 60; ry += 20) {
        g.fillRect(rx, ry, 3, 12);
      }
    }

    // Corridor arrows
    const arrowX = [600, 700, 820, 950, 1050];
    const arrowDir = ['→', '←', '↑', '↗', '→'];
    const arrowColors = [0xFF4444, 0x44FF44, 0x4444FF, 0xFF44FF, 0xFFFF44];
    for (let i = 0; i < arrowX.length; i++) {
      g.fillStyle(arrowColors[i], 0.7);
      g.fillRect(arrowX[i], 40, 60, 24);
      // Arrow text not possible in Graphics; use text objects instead
    }
  }

  private drawDecorativeElements(H: number): void {
    // Corridor arrow text labels
    const signs = [
      { x: 607, y: 48, text: '→ Зал', color: '#FF6666' },
      { x: 707, y: 48, text: '← Выход', color: '#66FF66' },
      { x: 827, y: 48, text: '↑ Зал?', color: '#6666FF' },
      { x: 957, y: 48, text: '↗ Буфет', color: '#FF66FF' },
    ];
    for (const s of signs) {
      this.add.text(s.x, s.y, s.text, {
        fontSize: '11px', color: s.color, fontFamily: 'Arial', fontStyle: 'bold',
      });
    }

    // Stage label
    this.add.text(this.WORLD_W / 2 + 200, 20, '★ СЦЕНА ★', {
      fontSize: '14px', color: '#FFD060', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5, 0);

    // Final performance zone marker
    this.add.text(1540, H - 110, 'Выйди на сцену', {
      fontSize: '12px', color: '#AAFFAA', fontFamily: 'Arial',
    }).setOrigin(0.5);
  }

  private buildPlatformLayout(H: number): void {
    const layout = [
      // Backstage — prop boxes
      { x: 60,   y: H - 90,  n: 3, tile: 'stage_riser' as const },
      { x: 200,  y: H - 130, n: 2, tile: 'stage_riser' as const },
      { x: 330,  y: H - 100, n: 3, tile: 'stage_riser' as const },
      { x: 460,  y: H - 140, n: 2, tile: 'stage_riser' as const },
      // Corridor — elevated walkway
      { x: 600,  y: H - 110, n: 4, tile: 'stage_floor' as const },
      { x: 800,  y: H - 80,  n: 3, tile: 'stage_floor' as const },
      { x: 960,  y: H - 120, n: 3, tile: 'stage_floor' as const },
      // Stage risers
      { x: 1140, y: H - 80,  n: 4, tile: 'stage_riser' as const },
      { x: 1360, y: H - 110, n: 4, tile: 'stage_riser' as const },
      { x: 1560, y: H - 90,  n: 4, tile: 'stage_riser' as const },
    ];

    for (const { x, y, n, tile } of layout) {
      for (let i = 0; i < n; i++) {
        this.platforms.create(x + i * 32 + 16, y, tile).refreshBody();
      }
    }
  }

  // ─── Obstacles ──────────────────────────────────────────────────────────────

  private createObstacles(): void {
    const H = GAME.HEIGHT;
    this.obstacles = this.physics.add.group();

    const crew = [
      { x: 180, min: 80,  max: 320, spd:  50 },
      { x: 410, min: 280, max: 540, spd: -48 },
      { x: 720, min: 620, max: 900, spd:  55 },
      { x: 980, min: 880, max: 1090, spd: -52 },
    ];

    for (const c of crew) {
      const ob = new MovingObstacle(this, c.x, H - 33, 'stager', c.min, c.max, c.spd);
      this.obstacles.add(ob);
    }
  }

  // ─── Stage props ────────────────────────────────────────────────────────────

  private createStageProps(): void {
    const H = GAME.HEIGHT;
    const spots = [
      { x: 140,  y: H - 55,  key: 'item_mic'     },
      { x: 460,  y: H - 55,  key: 'item_script'  },
      { x: 760,  y: H - 55,  key: 'item_badge'   },
      { x: 1000, y: H - 55,  key: 'item_costume' },
    ];

    for (const { x, y, key } of spots) {
      const img = this.physics.add.image(x, y, key);
      const b   = img.body as Phaser.Physics.Arcade.Body;
      b.allowGravity = false;
      b.immovable    = true;

      this.tweens.add({
        targets: img, y: y - 7,
        duration: 850 + Math.random() * 200,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut',
      });

      this.propBodies.push(img);
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

    const name  = this.active === this.sonya ? 'Соня' : 'Яна';
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
    this.physics.add.collider(this.sonya, this.obstacles);
    this.physics.add.collider(this.yana,  this.obstacles);

    const pickProp = (
      player: Phaser.Types.Physics.Arcade.ArcadeColliderType,
      prop:   Phaser.Types.Physics.Arcade.ArcadeColliderType,
    ) => {
      const img = prop as Phaser.Physics.Arcade.Image;
      if (!img.active) return;
      img.disableBody(true, false);
      void player;

      this.tweens.add({
        targets: img, scaleX: 1.8, scaleY: 1.8, alpha: 0,
        duration: 220, ease: 'Power2',
        onComplete: () => img.destroy(),
      });

      this.collectedProps++;
      this.propText.setText(`Реквизит: ${this.collectedProps}/${this.TOTAL_PROPS}`);
    };

    for (const pb of this.propBodies) {
      this.physics.add.overlap(
        this.sonya, pb,
        pickProp as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      );
      this.physics.add.overlap(
        this.yana, pb,
        pickProp as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      );
    }
  }

  // ─── Proximity triggers ─────────────────────────────────────────────────────

  private setupTriggers(): void {
    const H = GAME.HEIGHT;
    this.triggers = [
      { x: 90,   y: H - 60, radius: 120, lines: DIALOGS.entry,     fired: false },
      { x: 640,  y: H - 60, radius: 120, lines: DIALOGS.corridor,  fired: false },
      { x: 360,  y: H - 60, radius: 110, lines: DIALOGS.backstage, fired: false },
      { x: 1150, y: H - 60, radius: 140, lines: DIALOGS.preStage,  fired: false },
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

  // ─── Performance zone ────────────────────────────────────────────────────────

  private checkPerformanceTrigger(): void {
    if (this.perfPhase !== 'none') return;
    if (this.active.x < 1400) return;
    if (this.collectedProps < this.TOTAL_PROPS) {
      // Hint: collect all props first
      if (!this.dialog.isActive && !this.triggers.find(t => t.x > 1300 && !t.fired)) {
        this.dialog.show([{
          speaker: 'Организатор',
          text: 'Стоп! Нужен весь реквизит. Соберите оставшийся.',
          color: OC,
          duration: 2500,
        }]);
        // Temporarily block with a fake trigger so it fires once
        this.triggers.push({ x: this.active.x, y: this.active.y, radius: 5, lines: [], fired: true });
      }
      return;
    }
    this.startPerformance();
  }

  private startPerformance(): void {
    this.perfPhase = 'active';
    this.perfStep  = 0;

    // Pause player
    this.sonya.setVelocity(0, 0);
    this.yana.setVelocity(0, 0);

    this.buildPerfOverlay();
    this.showNextPerfPrompt();
  }

  private buildPerfOverlay(): void {
    const { WIDTH: W, HEIGHT: H } = GAME;

    this.perfContainer = this.add.container(0, 0).setScrollFactor(0).setDepth(200);

    const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0.6)
      .setScrollFactor(0);
    this.perfContainer.add(bg);

    this.add.text(W / 2, H * 0.18, '★ ИМПРОВИЗАЦИЯ ★', {
      fontSize: '26px', color: '#FFD060', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    this.perfPromptText = this.add.text(W / 2, H * 0.38, '', {
      fontSize: '20px', color: '#FFFFFF', fontFamily: 'Arial',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);

    this.perfSubText = this.add.text(W / 2, H * 0.56, '[ нажми ▲ или ★ ]', {
      fontSize: '15px', color: '#AAAAFF', fontFamily: 'Arial',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(201);
  }

  private showNextPerfPrompt(): void {
    const prompts = PERF_PROMPTS;
    if (this.perfStep >= prompts.length) {
      this.finishPerformance();
      return;
    }

    this.perfPromptText.setText(prompts[this.perfStep]);
    this.perfSubText.setVisible(true);

    // Blink the sub-text
    this.tweens.add({
      targets: this.perfSubText, alpha: 0.3,
      duration: 600, yoyo: true, repeat: -1, ease: 'Sine',
    });
  }

  private onPerfTap(): void {
    const reactions = ['ЗАЛ СМЕЁТСЯ!', 'ЗАЛ АПЛОДИРУЕТ!', 'БРАВО!!!'];
    const reaction  = reactions[this.perfStep] ?? 'ОХ!';

    this.tweens.killTweensOf(this.perfSubText);
    this.perfSubText.setText(reaction).setAlpha(1).setColor('#AAFFAA');

    this.tweens.add({
      targets: this.perfSubText,
      scaleX: 1.4, scaleY: 1.4,
      duration: 200, yoyo: true, ease: 'Power2',
    });

    this.perfStep++;
    this.time.delayedCall(1100, () => this.showNextPerfPrompt());
  }

  private finishPerformance(): void {
    this.perfPhase = 'done';

    // Fade out overlay
    this.tweens.add({
      targets: this.perfContainer,
      alpha: 0, duration: 600,
      onComplete: () => {
        this.perfContainer.destroy();
        this.showEnding();
      },
    });
  }

  // ─── Ending ─────────────────────────────────────────────────────────────────

  private showEnding(): void {
    this.stageDone = true;
    const { WIDTH: W, HEIGHT: H } = GAME;

    // Curtain dim
    const dim = this.add.rectangle(W / 2, H / 2, W, H, 0x000000, 0)
      .setScrollFactor(0).setDepth(210);
    this.tweens.add({ targets: dim, fillAlpha: 0.8, duration: 800 });

    // Play ending dialogue through dialog system, then show credits
    this.time.delayedCall(900, () => {
      this.dialog.show(DIALOGS.ending);
    });

    // After dialogue (~14s total), show credits
    const totalDuration = DIALOGS.ending.reduce((s, l) => s + (l.duration ?? 2800), 0) + 1200;
    this.time.delayedCall(900 + totalDuration, () => this.showCredits());
  }

  private showCredits(): void {
    const { WIDTH: W, HEIGHT: H } = GAME;

    this.add.text(W / 2, H * 0.22, 'Яна и Соня', {
      fontSize: '38px', color: '#FFFFFF', fontFamily: 'Arial', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(220);

    this.add.text(W / 2, H * 0.36, 'Импровизация в Керчь', {
      fontSize: '20px', color: '#C8B8FF', fontFamily: 'Arial',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(220);

    this.add.text(W / 2, H * 0.50, '— Конец —', {
      fontSize: '16px', color: '#888888', fontFamily: 'Arial',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(220);

    this.add.text(W / 2, H * 0.63, 'Для Яны и Сони.\nСпасибо, что есть.', {
      fontSize: '15px', color: '#FFD060', fontFamily: 'Arial', align: 'center',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(220);

    // Menu button
    const btn = this.add.rectangle(W / 2, H * 0.80, 200, 44, 0x443366)
      .setScrollFactor(0).setDepth(220).setInteractive();
    this.add.text(W / 2, H * 0.80, 'В главное меню', {
      fontSize: '15px', color: '#FFFFFF', fontFamily: 'Arial',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(221);

    btn.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => this.scene.start('MenuScene'));
    });
    btn.on('pointerover', () => btn.setFillStyle(0x6655AA));
    btn.on('pointerout',  () => btn.setFillStyle(0x443366));
  }

  // ─── HUD ────────────────────────────────────────────────────────────────────

  private createHUD(): void {
    const W = GAME.WIDTH;

    this.propText = this.add.text(16, 14, `Реквизит: 0/${this.TOTAL_PROPS}`, {
      fontSize: '14px', color: '#FFF0C0', fontFamily: 'Arial',
    }).setScrollFactor(0);

    this.add.text(W / 2, 14, 'Уровень 3: Керчь, сцена, импровизация', {
      fontSize: '13px', color: '#FFF0C0', fontFamily: 'Arial',
    }).setOrigin(0.5, 0).setScrollFactor(0);

    this.add.text(W - 16, 14, 'Играет:', {
      fontSize: '12px', color: '#AAA0FF', fontFamily: 'Arial',
    }).setOrigin(1, 0).setScrollFactor(0);

    this.activeLabel = this.add.text(W - 16, 30, 'Соня', {
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
    this.specialBtn.setFillStyle(ready ? 0xAA8800 : COLORS.BTN_BG, ready ? 0.75 : 0.3);
  }
}
