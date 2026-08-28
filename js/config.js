// ============================================================
// js/config.js
// 游戏全局配置：所有可调参数集中管理
// ============================================================

export const CONFIG = {
    // ---------- 玩家 ----------
    PLAYER: {
        SPEED: 18,            // 玩家移动速度（世界单位/秒）
        BOUNDS_X: 8,          // X 轴移动边界
        BOUNDS_Y: 4.5,        // Y 轴移动边界
        START_HEALTH: 100,     // 初始生命值
    },
    // ---------- 子弹 ----------
    BULLET: {
        SPEED: 70,            // 普通子弹速度
        COOLDOWN: 0.15,       // 普通子弹发射间隔（秒）
        MEGA_COOLDOWN: 0.8,   // Mega 子弹冷却时间（秒）
        MEGA_SPREAD: 5,       // Mega 子弹扇形数量
        MEGA_ANGLE: 0.3,      // Mega 子弹扇形角度（弧度）
    },
    // ---------- 敌机 ----------
    ENEMY: {
        SPAWN_INTERVAL_START: 1.5,  // 初始生成间隔（秒）
        SPAWN_INTERVAL_MIN: 0.35,   // 生成间隔下限
        WAVE_SIZE: 10,              // 每波敌机数量

        BASIC: {
            SPEED_MIN: 4,
            SPEED_MAX: 7,
            HEALTH: 1,
            SCORE: 10,
            COLOR: 0xff4466,
        },
        WEAVER: {
            SPEED_MIN: 6,
            SPEED_MAX: 9,
            HEALTH: 1,
            SCORE: 15,
            COLOR: 0xffaa00,
            AMPLITUDE: 2.0,   // 正弦横移幅度
            FREQUENCY: 3.0,   // 正弦横移频率
        },
        TANK: {
            SPEED_MIN: 2.5,
            SPEED_MAX: 3.5,
            HEALTH: 3,
            SCORE: 30,
            COLOR: 0xaa66ff,
        },
    },
    // ---------- 相机 ----------
    CAMERA: {
        FOV: 60,
        POS_X: 0,
        POS_Y: 3.5,
        POS_Z: 12,
        LOOK_X: 0,
        LOOK_Y: 0,
        LOOK_Z: -10,
    },
    // ---------- 粒子 ----------
    PARTICLE: {
        EXPLOSION_COUNT: 24,   // 爆炸粒子数量
        MAX_PARTICLES: 200,    // 粒子总数量上限
    },
    // ---------- 星空 ----------
    STARFIELD: {
        COUNT: 1200,           // 星星数量
        SIZE: 0.15,            // 星星大小
        SPREAD_X: 80,          // X 分布范围
        SPREAD_Y: 40,          // Y 分布范围
        SPREAD_Z: 60,          // Z 分布范围
    },
};