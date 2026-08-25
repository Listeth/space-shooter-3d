/**
 * game.js - 游戏核心逻辑
 * 包含：音频管理、排行榜存储、玩家、障碍物、渲染器、广告管理器、主控类
 * 支持浏览器与微信小游戏双平台
 */
(function() {
  'use strict';

  // 环境检测：微信小游戏存在 wx 对象，浏览器不存在
  const wxEnv = (typeof wx !== 'undefined' && wx !== null) ? wx : null;

  // ============================================================
  // 游戏常量
  // ============================================================
  const CANVAS_WIDTH = 800;          // 画布逻辑宽度
  const CANVAS_HEIGHT = 400;         // 画布逻辑高度
  const GROUND_Y = 320;              // 地面 Y 坐标
  const GRAVITY = 900;               // 重力加速度（像素/秒²）
  const JUMP_FORCE = -380;           // 跳跃初速度（负值向上）
  const MAX_TOP_SCORES = 5;          // 排行榜最大条数
  const STORAGE_KEY = 'neon_run_top_scores'; // 排行榜存储 key
  const INITIAL_SPEED = 200;         // 初始移动速度
  const SPEED_INCREMENT = 3;         // 每 100 分增加的速度
  const SCORE_PER_POINT = 10;        // 每秒得分
  const SPAWN_INTERVAL_MIN = 0.9;    // 障碍生成最小间隔（秒）
  const SPAWN_INTERVAL_MAX = 1.3;    // 障碍生成最大间隔（秒）
  const DT_MAX = 0.05;               // 最大帧时间（防止物理穿透）
  const COLLISION_PADDING = 1;       // 碰撞盒内缩容差（px）
  const OBSTACLE_MIN_GAP = 20;       // 障碍物最小间距（px）

  // ============================================================
  // 音频管理类
  // 使用 WebAudio API 合成音效，零外部文件
  // ============================================================
  class AudioManager {
    constructor() {
      this.audioCtx = null;
      this._initialized = false;
    }

    // 初始化音频上下文（需用户交互后才能创建）
    init() {
      if (this._initialized) return;
      try {
        if (wxEnv) {
          this.audioCtx = wxEnv.createWebAudioContext();
        } else {
          const AudioContextClass = window.AudioContext || window.webkitAudioContext;
          this.audioCtx = new AudioContextClass();
        }
        this._initialized = true;
      } catch (e) {
        // 浏览器自动播放策略或微信版本不支持时，静默降级
        this.audioCtx = null;
      }
    }

    // 播放短音：频率/时长/波形/音量
    beep(freq, dur, type, vol) {
      if (!this.audioCtx) return;
      try {
        const oscillator = this.audioCtx.createOscillator();
        const gainNode = this.audioCtx.createGain();
        oscillator.type = type || 'square';
        oscillator.frequency.value = freq;
        gainNode.gain.setValueAtTime(vol || 0.05, this.audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + dur);
        oscillator.connect(gainNode);
        gainNode.connect(this.audioCtx.destination);
        oscillator.start();
        oscillator.stop(this.audioCtx.currentTime + dur);
      } catch (e) {
        // 音频 API 异常时忽略，不影响游戏
      }
    }

    playJump() { this.init(); this.beep(520, 0.1, 'square', 0.04); }
    playCrash() { this.init(); this.beep(110, 0.3, 'sawtooth', 0.06); }
  }

  // ============================================================
  // 排行榜存储类
  // 数据结构：topScores = [{ score: number, ts: number }]
  // ============================================================
  class StorageManager {
    constructor() {
      this.topScores = [];
      this._ready = false;
    }

    // 从本地存储读取排行榜
    load() {
      if (this._ready) return this.topScores;
      let raw = null;
      try {
        if (wxEnv) {
          raw = wxEnv.getStorageSync(STORAGE_KEY);
        } else {
          raw = localStorage.getItem(STORAGE_KEY);
        }
      } catch (e) {
        raw = null;
      }
      if (raw) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            // 过滤非法数据：必须是对象且包含数字 score
            this.topScores = parsed
              .filter(item => item && typeof item.score === 'number' && isFinite(item.score))
              .slice(0, MAX_TOP_SCORES);
          }
        } catch (e) {
          this.topScores = [];
        }
      }
      this._ready = true;
      return this.topScores;
    }

    // 保存排行榜到本地存储
    save() {
      if (!this._ready) return;
      try {
        const data = JSON.stringify(this.topScores);
        if (wxEnv) {
          wxEnv.setStorageSync(STORAGE_KEY, data);
        } else {
          localStorage.setItem(STORAGE_KEY, data);
        }
      } catch (e) {
        // 存储失败不影响游戏
      }
    }

    // 添加一条新分数
    addScore(scoreValue) {
      this.load();
      const now = Date.now();
      const entry = { score: Math.floor(scoreValue), ts: now };
      this.topScores.push(entry);
      this.topScores.sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.ts - b.ts; // 同分时先达到者靠前
      });
      this.topScores = this.topScores.slice(0, MAX_TOP_SCORES);
      this.save();
    }

    // 获取排行榜副本
    getScores() {
      this.load();
      return this.topScores.slice(0);
    }
  }

  // ============================================================
  // 玩家类
  // ============================================================
  class Player {
    constructor() {
      this.x = 80;
      this.y = GROUND_Y - 40;
      this.w = 30;
      this.h = 40;
      this.vy = 0;
      this.jumping = false;
    }

    reset() {
      this.x = 80;
      this.y = GROUND_Y - 40;
      this.vy = 0;
      this.jumping = false;
    }

    attemptJump() {
      // 仅允许在地面时跳跃（通过 jumping 状态判断）
      if (!this.jumping) {
        this.jumping = true;
        this.vy = JUMP_FORCE;
      }
    }

    // 物理更新
    update(dt) {
      if (!this.jumping) return;
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      // 防止穿过地面：直接 clamping
      if (this.y >= GROUND_Y - this.h) {
        this.y = GROUND_Y - this.h;
        this.vy = 0;
        this.jumping = false;
      }
    }

    // 获取碰撞盒（内缩容差）
    getCollisionBox() {
      return {
        x: this.x - COLLISION_PADDING,
        y: this.y - COLLISION_PADDING,
        w: this.w + 2 * COLLISION_PADDING,
        h: this.h + 2 * COLLISION_PADDING
      };
    }
  }

  // ============================================================
  // 障碍物类
  // ============================================================
  class Obstacle {
    constructor(x, y, w, h, color) {
      this.x = x;
      this.y = y;
      this.w = w;
      this.h = h;
      this.color = color;
    }

    update(speed, dt) {
      this.x -= speed * dt;
    }

    isOffScreen() {
      return this.x + this.w < 0;
    }

    getCollisionBox() {
      return { x: this.x, y: this.y, w: this.w, h: this.h };
    }

    // 工厂方法：生成障碍物，防止与已有障碍重叠
    static spawn(canvasWidth, existingObstacles) {
      const h = 30 + Math.random() * 30;
      const w = 20 + Math.random() * 15;
      const color = `hsl(${Math.floor(Math.random() * 60 + 280)},100%,60%)`;
      let newX = canvasWidth + 20;

      // 确保与已有障碍物保持至少 OBSTACLE_MIN_GAP 间距
      for (const obj of existingObstacles) {
        if (obj.x + obj.w > newX - OBSTACLE_MIN_GAP && obj.x < newX + w + OBSTACLE_MIN_GAP) {
          newX = obj.x + obj.w + OBSTACLE_MIN_GAP;
        }
      }
      return new Obstacle(newX, GROUND_Y - h, w, h, color);
    }
  }

  // ============================================================
  // 渲染器类
  // ============================================================
  class Renderer {
    constructor(ctx, width, height) {
      this.ctx = ctx;
      this.width = width;
      this.height = height;
    }

    drawBackground() {
      const ctx = this.ctx;
      ctx.fillStyle = '#0a0a1a';
      ctx.fillRect(0, 0, this.width, this.height);
    }

    drawGrid() {
      const ctx = this.ctx;
      ctx.strokeStyle = 'rgba(0,200,255,0.15)';
      ctx.lineWidth = 1;
      for (let i = 0; i < this.width; i += 40) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, this.height);
        ctx.stroke();
      }
      for (let i = 0; i < this.height; i += 40) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(this.width, i);
        ctx.stroke();
      }
    }

    drawGround() {
      const ctx = this.ctx;
      ctx.strokeStyle = '#00f0ff';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, GROUND_Y);
      ctx.lineTo(this.width, GROUND_Y);
      ctx.stroke();
    }

    drawPlayer(player) {
      const ctx = this.ctx;
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#00f0ff';
      ctx.fillStyle = '#00f0ff';
      ctx.fillRect(player.x, player.y, player.w, player.h);
      ctx.shadowBlur = 0;
    }

    drawObstacles(obstacles) {
      const ctx = this.ctx;
      for (const obs of obstacles) {
        ctx.shadowBlur = 15;
        ctx.shadowColor = obs.color;
        ctx.fillStyle = obs.color;
        ctx.fillRect(obs.x, obs.y, obs.w, obs.h);
      }
      ctx.shadowBlur = 0;
    }

    drawScore(score) {
      const ctx = this.ctx;
      ctx.font = 'bold 22px "Courier New", monospace';
      ctx.textAlign = 'left';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ff00ff';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('SCORE:' + Math.floor(score), 10, 30);
      ctx.shadowBlur = 0;
    }

    drawLeaderboard(topScores) {
      if (!topScores || topScores.length === 0) return;
      const ctx = this.ctx;
      ctx.textAlign = 'right';
      ctx.font = '14px "Courier New", monospace';
      ctx.fillStyle = '#ff00ff';
      ctx.shadowBlur = 4;
      ctx.shadowColor = '#ff00ff';
      ctx.fillText('TOP 5', this.width - 20, 25);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#ffffff';
      for (let i = 0; i < Math.min(topScores.length, MAX_TOP_SCORES); i++) {
        ctx.fillText((i + 1) + '.' + topScores[i].score, this.width - 20, 45 + i * 18);
      }
    }

    drawShareButton(btnRect) {
      const ctx = this.ctx;
      ctx.textAlign = 'center';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#00ff77';
      ctx.fillStyle = '#00ff77';
      ctx.fillRect(btnRect.x, btnRect.y, btnRect.w, btnRect.h);
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 18px "Courier New", monospace';
      ctx.fillText('分享复活', btnRect.x + btnRect.w / 2, btnRect.y + btnRect.h / 2 + 6);
    }

    drawAdLoading() {
      const ctx = this.ctx;
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.textAlign = 'center';
      ctx.font = 'bold 24px "Courier New", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('正在加载视频广告...', this.width / 2, this.height / 2);
    }

    drawGameOver(score, btnRect, canRevive) {
      const ctx = this.ctx;
      ctx.fillStyle = 'rgba(0,0,0,0.72)';
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.textAlign = 'center';
      ctx.font = 'bold 36px "Courier New", monospace';
      ctx.fillStyle = '#ff0044';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#ff0044';
      ctx.fillText('GAME OVER', this.width / 2, this.height / 2 - 50);
      ctx.shadowBlur = 0;
      ctx.font = '20px "Courier New", monospace';
      ctx.fillStyle = '#ffffff';
      ctx.fillText('分数: ' + Math.floor(score), this.width / 2, this.height / 2 - 10);
      ctx.font = '16px "Courier New", monospace';
      ctx.fillStyle = '#cccccc';
      ctx.fillText(canRevive ? '点击“分享复活”继续，或点击其他位置重新开始' : '点击任意位置重新开始', this.width / 2, this.height / 2 + 85);
      if (canRevive) {
        this.drawShareButton(btnRect);
      }
    }
  }

  // ============================================================
  // 广告管理器（激励视频广告）
  // ============================================================
  class AdManager {
    constructor() {
      this.ad = null;
      this.adReady = false;
      this._initialized = false;
      this.adUnitId = ''; // 请替换为真实激励视频广告 ID，留空则自动降级为分享复活
    }

    init() {
      if (this._initialized) return;
      this._initialized = true;
      if (!wxEnv) return;
      if (!this.adUnitId) return;
      try {
        if (wxEnv.createRewardedVideoAd) {
          this.ad = wxEnv.createRewardedVideoAd({ adUnitId: this.adUnitId });
          this.ad.onLoad(() => { this.adReady = true; });
          this.ad.onError((err) => {
            this.adReady = false;
            console.warn('广告加载失败', err);
          });
          this.ad.load && this.ad.load().catch(() => {});
        }
      } catch (e) {
        this.ad = null;
      }
    }

    // 播放激励视频，返回 Promise<boolean> 是否完成
    show() {
      this.init();
      return new Promise((resolve) => {
        if (!this.ad || !this.adReady) {
          resolve(false);
          return;
        }
        try {
          this.ad.show().then(() => {
            resolve(true);
          }).catch(() => {
            // 展示失败，尝试重新加载后再次播放
            this.adReady = false;
            this.ad.load && this.ad.load().then(() => {
              this.adReady = true;
              this.ad.show().then(() => resolve(true)).catch(() => resolve(false));
            }).catch(() => resolve(false));
          });
        } catch (e) {
          resolve(false);
        }
      });
    }
  }

  // ============================================================
  // 游戏主控类
  // ============================================================
  class Game {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.width = CANVAS_WIDTH;
      this.height = CANVAS_HEIGHT;
      canvas.width = this.width;
      canvas.height = this.height;

      // 初始化子模块
      this.audio = new AudioManager();
      this.storage = new StorageManager();
      this.renderer = new Renderer(this.ctx, this.width, this.height);
      this.ad = new AdManager();
      this.player = new Player();

      // 游戏状态变量
      this.state = 'playing';
      this.score = 0;
      this.speed = INITIAL_SPEED;
      this.lastTime = 0;
      this.spawnTimer = 1.0;
      this.obstacles = [];

      // 复活控制
      this.hasRevived = false;
      this.adLoading = false;

      // 分享复活按钮矩形区域
      this.shareBtn = {
        x: 300,
        y: this.height / 2 + 20,
        w: 200,
        h: 50
      };

      this._bindEvents();
      this.storage.load();
      this.ad.init();
    }

    // 重置游戏
    reset() {
      this.obstacles = [];
      this.player.reset();
      this.score = 0;
      this.speed = INITIAL_SPEED;
      this.spawnTimer = 1.0;
      this.state = 'playing';
      this.hasRevived = false;
      this.adLoading = false;
    }

    // 生成障碍物
    spawnObstacle() {
      const obs = Obstacle.spawn(this.width, this.obstacles);
      this.obstacles.push(obs);
    }

    // 碰撞检测（AABB）
    checkCollision() {
      const playerBox = this.player.getCollisionBox();
      for (const obs of this.obstacles) {
        const obsBox = obs.getCollisionBox();
        if (this._rectCollide(playerBox, obsBox)) {
          return true;
        }
      }
      return false;
    }

    _rectCollide(r1, r2) {
      return r1.x < r2.x + r2.w &&
             r1.x + r1.w > r2.x &&
             r1.y < r2.y + r2.h &&
             r1.y + r1.h > r2.y;
    }

    // 跳跃动作
    jump() {
      if (this.state !== 'playing') return;
      this.player.attemptJump();
      this.audio.playJump();
    }

    // 尝试复活（优先广告，广告失败则分享兜底）
    revive() {
      if (this.hasRevived) return;
      this.hasRevived = true;

      if (wxEnv && this.ad) {
        this.adLoading = true;
        this.ad.show().then((completed) => {
          this.adLoading = false;
          if (completed) {
            this._performRevive();
          } else {
            this._shareReviveFallback();
          }
        });
      } else {
        this._shareReviveFallback();
      }
    }

    // 执行复活逻辑
    _performRevive() {
      this.obstacles = [];
      this.player.x = 80;
      this.player.y = GROUND_Y - this.player.h;
      this.player.vy = 0;
      this.player.jumping = false;
      this.score = Math.floor(this.score * 0.8);
      this.speed = INITIAL_SPEED + Math.floor(this.score / 100) * SPEED_INCREMENT;
      this.spawnTimer = 1.0;
      this.state = 'playing';
    }

    // 分享复活兜底
    _shareReviveFallback() {
      if (wxEnv) {
        try {
          wxEnv.shareAppMessage({
            title: '我在霓虹跑酷中获得了 ' + Math.floor(this.score) + ' 分，你能超过我吗？',
            imageUrl: '',
            success: () => { this._performRevive(); },
            fail: () => { this._performRevive(); }
          });
        } catch (e) {
          this._performRevive();
        }
      } else {
        this._performRevive();
      }
    }

    // 游戏结束时处理点击/触摸
    handleEndInput(x, y) {
      const btn = this.shareBtn;
      if (this.state === 'over' && !this.hasRevived &&
          x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) {
        this.revive();
      } else {
        this.reset();
      }
    }

    // 转换屏幕坐标为逻辑坐标（考虑 CSS 缩放）
    _convertCoords(clientX, clientY) {
      const rect = this.canvas.getBoundingClientRect();
      return {
        x: (clientX - rect.left) * (this.width / rect.width),
        y: (clientY - rect.top) * (this.height / rect.height)
      };
    }

    // 更新逻辑
    update(dt) {
      if (this.state !== 'playing') return;

      this.player.update(dt);

      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawnObstacle();
        this.spawnTimer = SPAWN_INTERVAL_MIN + Math.random() * (SPAWN_INTERVAL_MAX - SPAWN_INTERVAL_MIN);
      }

      this.speed = INITIAL_SPEED + Math.floor(this.score / 100) * SPEED_INCREMENT;

      for (let i = this.obstacles.length - 1; i >= 0; i--) {
        this.obstacles[i].update(this.speed, dt);
        if (this.obstacles[i].isOffScreen()) {
          this.obstacles.splice(i, 1);
        }
      }

      this.score += dt * SCORE_PER_POINT;

      if (this.checkCollision()) {
        this.state = 'over';
        this.audio.playCrash();
        this.storage.addScore(this.score);
      }
    }

    // 渲染
    render() {
      this.renderer.drawBackground();
      this.renderer.drawGrid();
      this.renderer.drawGround();
      this.renderer.drawPlayer(this.player);
      this.renderer.drawObstacles(this.obstacles);
      this.renderer.drawScore(this.score);
      this.renderer.drawLeaderboard(this.storage.getScores());

      if (this.state === 'over') {
        const canRevive = !this.hasRevived;
        this.renderer.drawGameOver(this.score, this.shareBtn, canRevive);
      }

      if (this.adLoading) {
        this.renderer.drawAdLoading();
      }
    }

    // 主循环
    loop(timestamp) {
      let dt = (timestamp - this.lastTime) / 1000;
      if (this.lastTime === 0) dt = 0;
      if (dt > DT_MAX) dt = DT_MAX;
      if (dt < 0) dt = 0;
      this.lastTime = timestamp;

      this.update(dt);
      this.render();

      requestAnimationFrame(this.loop.bind(this));
    }

    // 启动游戏
    start() {
      this.reset();
      requestAnimationFrame(this.loop.bind(this));
    }

    // 绑定输入事件（双端）
    _bindEvents() {
      if (wxEnv) {
        wxEnv.onTouchStart((e) => {
          const touch = e.touches && e.touches[0];
          const x = touch ? touch.clientX : this.width / 2;
          const y = touch ? touch.clientY : this.height / 2;
          if (this.state === 'over') {
            this.handleEndInput(x, y);
          } else {
            this.jump();
          }
        });
      } else {
        this.canvas.addEventListener('touchstart', (e) => {
          e.preventDefault();
          const touch = e.touches && e.touches[0];
          if (!touch) return;
          const { x, y } = this._convertCoords(touch.clientX, touch.clientY);
          if (this.state === 'over') {
            this.handleEndInput(x, y);
          } else {
            this.jump();
          }
        }, { passive: false });

        this.canvas.addEventListener('mousedown', (e) => {
          e.preventDefault();
          const { x, y } = this._convertCoords(e.clientX, e.clientY);
          if (this.state === 'over') {
            this.handleEndInput(x, y);
          } else {
            this.jump();
          }
        });

        window.addEventListener('keydown', (e) => {
          if (e.code === 'Space') {
            e.preventDefault();
            if (this.state === 'over') {
              this.reset();
            } else {
              this.jump();
            }
          }
          if (e.code === 'KeyR') {
            this.reset();
          }
        });
      }
    }
  }

  // ============================================================
  // 启动入口
  // ============================================================
  let canvas;
  if (wxEnv) {
    canvas = wxEnv.createCanvas();
  } else {
    canvas = document.getElementById('game');
    if (!canvas) {
      throw new Error('找不到 canvas 元素，请确认 #game 存在');
    }
  }

  const game = new Game(canvas);
  game.start();
})();