// ============================================================
// js/main.js
// 游戏主入口：负责场景/相机/渲染器/灯光/星空初始化，
// 玩家/敌机/子弹/粒子系统创建，输入处理，碰撞检测，
// 游戏循环，以及数据库持久化。
// ============================================================

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { Player } from './player.js';
import { EnemySpawner } from './enemy.js';
import { BulletManager } from './bullet.js';
import { ParticleSystem } from './particle.js';
import { AudioManager } from './audio.js';
import { clamp, randRange, sphereCollide, disposeObject } from './utils.js';
import { initDB } from './db/init-db.js';

// -----------------------------------------------------------
// 1. DOM 引用
// -----------------------------------------------------------
const hudScore = document.getElementById('scoreVal');
const hudWave = document.getElementById('waveVal');
const healthBar = document.getElementById('healthBar');
const gameOverScreen = document.getElementById('gameOverScreen');
const finalScoreEl = document.getElementById('finalScore');
const finalWaveEl = document.getElementById('finalWave');
const restartBtn = document.getElementById('restartBtn');
const fireBtn = document.getElementById('fireBtn');

// -----------------------------------------------------------
// 2. 场景、相机、渲染器
// -----------------------------------------------------------
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x02040a);
scene.fog = new THREE.FogExp2(0x02040a, 0.0035);

const camera = new THREE.PerspectiveCamera(
    CONFIG.CAMERA.FOV,
    window.innerWidth / window.innerHeight,
    0.1,
    200
);
camera.position.set(
    CONFIG.CAMERA.POS_X,
    CONFIG.CAMERA.POS_Y,
    CONFIG.CAMERA.POS_Z
);
camera.lookAt(
    CONFIG.CAMERA.LOOK_X,
    CONFIG.CAMERA.LOOK_Y,
    CONFIG.CAMERA.LOOK_Z
);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// -----------------------------------------------------------
// 3. 灯光
// -----------------------------------------------------------
const ambientLight = new THREE.AmbientLight(0x334466, 0.6);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
dirLight.position.set(5, 10, 7);
dirLight.castShadow = true;
dirLight.shadow.mapSize.width = 1024;
dirLight.shadow.mapSize.height = 1024;
dirLight.shadow.camera.near = 0.1;
dirLight.shadow.camera.far = 40;
dirLight.shadow.camera.left = -10;
dirLight.shadow.camera.right = 10;
dirLight.shadow.camera.top = 10;
dirLight.shadow.camera.bottom = -10;
scene.add(dirLight);

const fillLight = new THREE.PointLight(0x4488ff, 0.4, 25);
fillLight.position.set(-6, 4, 8);
scene.add(fillLight);

// -----------------------------------------------------------
// 4. 星空背景
// -----------------------------------------------------------
function createStarfield() {
    const count = CONFIG.STARFIELD.COUNT;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * CONFIG.STARFIELD.SPREAD_X * 2;
        positions[i * 3 + 1] = (Math.random() - 0.5) * CONFIG.STARFIELD.SPREAD_Y * 2;
        positions[i * 3 + 2] = -20 - Math.random() * CONFIG.STARFIELD.SPREAD_Z;
        const b = 0.4 + Math.random() * 0.6;
        colors[i * 3] = b * 0.8;
        colors[i * 3 + 1] = b * 0.9;
        colors[i * 3 + 2] = b;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
        size: CONFIG.STARFIELD.SIZE,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
    });

    return new THREE.Points(geo, mat);
}

const stars = createStarfield();
scene.add(stars);

// -----------------------------------------------------------
// 5. 游戏全局变量
// -----------------------------------------------------------
let player;
let bulletManager;
let spawner;
let particleSystem;
let audioManager;

let score = 0;
let gameOver = false;
let gameTime = 0;
let enemiesKilled = 0;
let damageFlash = 0;
let lastTime = performance.now() / 1000;

// -----------------------------------------------------------
// 6. 输入状态
// -----------------------------------------------------------
const keys = {};

let touchActive = false;
let touchStartX = 0;
let touchStartY = 0;
let playerStartX = 0;
let playerStartY = 0;

// -----------------------------------------------------------
// 7. 数据库持久化全局引用
// -----------------------------------------------------------
let dataDB = null;
let currentPlayerId = null;

// -----------------------------------------------------------
// 8. 事件绑定
// -----------------------------------------------------------
document.addEventListener('keydown', (e) => {
    if (!audioManager.enabled) audioManager.init();
    keys[e.code] = true;
    if (e.code === 'Space') {
        e.preventDefault();
        fireMega();
    }
});

document.addEventListener('keyup', (e) => {
    keys[e.code] = false;
});

renderer.domElement.addEventListener('touchstart', (e) => {
    if (!audioManager.enabled) audioManager.init();
    if (e.touches.length > 0) {
        touchActive = true;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        playerStartX = player.position.x;
        playerStartY = player.position.y;
    }
});

renderer.domElement.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!touchActive || !e.touches.length) return;
    const dx = e.touches[0].clientX - touchStartX;
    const dy = e.touches[0].clientY - touchStartY;
    const scale = 0.015;
    player.mesh.position.x = clamp(
        playerStartX + dx * scale,
        -CONFIG.PLAYER.BOUNDS_X,
        CONFIG.PLAYER.BOUNDS_X
    );
    player.mesh.position.y = clamp(
        playerStartY - dy * scale,
        -CONFIG.PLAYER.BOUNDS_Y,
        CONFIG.PLAYER.BOUNDS_Y
    );
});

renderer.domElement.addEventListener('touchend', (e) => {
    e.preventDefault();
    touchActive = false;
});

fireBtn.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    if (gameOver) return;
    if (!audioManager.enabled) audioManager.init();
    fireMega();
});

restartBtn.addEventListener('click', () => {
    resetGame();
});

// -----------------------------------------------------------
// 9. 数据库初始化与持久化
// -----------------------------------------------------------
async function initDatabase() {
    try {
        dataDB = await initDB();
        const username = localStorage.getItem('space-shooter-player') || '飞行员';
        const playerEntity = await dataDB.playerRepo.getOrCreate(username);
        currentPlayerId = playerEntity.id;
        localStorage.setItem('space-shooter-player', playerEntity.username);
    } catch (e) {
        console.warn('数据库不可用，跳过持久化:', e);
        dataDB = null;
        currentPlayerId = null;
    }
}

async function persistGameResult() {
    if (!dataDB || !currentPlayerId) return;
    try {
        await dataDB.recordRepo.addRecord({
            player_id: currentPlayerId,
            score,
            wave: spawner.wave,
            kills: enemiesKilled,
            duration_sec: gameTime,
            accuracy: 0,
        });
        await dataDB.playerRepo.updateStats(currentPlayerId, {
            score,
            wave: spawner.wave,
        });
        const playerName = localStorage.getItem('space-shooter-player') || '飞行员';
        await dataDB.boardRepo.submitScore(
            currentPlayerId,
            playerName,
            score,
            spawner.wave
        );
    } catch (err) {
        console.warn('保存游戏数据失败:', err);
    }
}

// -----------------------------------------------------------
// 10. 游戏初始化
// -----------------------------------------------------------
function init() {
    player = new Player(scene);
    bulletManager = new BulletManager(scene);
    spawner = new EnemySpawner(scene);
    particleSystem = new ParticleSystem(scene);
    audioManager = new AudioManager();

    score = 0;
    gameOver = false;
    gameTime = 0;
    enemiesKilled = 0;
    damageFlash = 0;

    fireBtn.style.display = 'flex';

    updateUI();
    gameOverScreen.classList.remove('show');

    initDatabase();
}

function resetGame() {
    if (bulletManager) bulletManager.clear();
    if (spawner) spawner.clear();
    if (particleSystem) particleSystem.clear();
    if (player) {
        scene.remove(player.mesh);
        disposeObject(player.mesh);
        player = null;
    }
    init();
}

// -----------------------------------------------------------
// 11. UI 更新
// -----------------------------------------------------------
function updateUI() {
    hudScore.textContent = score;
    hudWave.textContent = spawner ? spawner.wave : 1;
    const hp = Math.max(0, player ? player.health : 0);
    healthBar.style.width = hp + '%';
}

// -----------------------------------------------------------
// 12. 伤害与游戏结束
// -----------------------------------------------------------
function damagePlayer(amount) {
    if (gameOver || !player) return;
    player.takeDamage(amount);
    damageFlash = 1;
    audioManager.playHit();
    updateUI();
    if (!player.alive) {
        showGameOver();
    }
}

function showGameOver() {
    gameOver = true;
    finalScoreEl.textContent = '得分: ' + score;
    finalWaveEl.textContent = '波次: ' + spawner.wave;
    gameOverScreen.classList.add('show');
    audioManager.playGameOver();
    persistGameResult();
}

// -----------------------------------------------------------
// 13. 射击逻辑
// -----------------------------------------------------------
function autoFire() {
    if (gameOver || !bulletManager || !player) return;
    if (bulletManager.canShootNormal()) {
        const pos = player.position.clone();
        pos.z -= 1.2;
        bulletManager.fireNormal(pos);
        bulletManager.resetShootTimer();
        audioManager.playShoot();
    }
}

function fireMega() {
    if (gameOver || !bulletManager || !player) return;
    if (!bulletManager.canShootMega()) return;
    const pos = player.position.clone();
    pos.z -= 1.2;
    bulletManager.fireMega(pos);
    bulletManager.resetMegaTimer();
    audioManager.playMegaShoot();
}

// -----------------------------------------------------------
// 14. 碰撞检测
// -----------------------------------------------------------
function handleCollisions() {
    if (gameOver) return;
    if (!player || !bulletManager || !spawner) return;

    // 子弹 vs 敌机
    for (let i = bulletManager.bullets.length - 1; i >= 0; i--) {
        const bullet = bulletManager.bullets[i];
        let hit = false;

        for (let j = spawner.enemies.length - 1; j >= 0; j--) {
            const enemy = spawner.enemies[j];
            if (enemy.destroyed) continue;

            const radius = bullet.isMega ? 1.2 : 0.7;
            if (sphereCollide(bullet.mesh.position, radius, enemy.mesh.position, 0.8)) {
                hit = true;
                const killed = enemy.takeDamage(bullet.isMega ? 2 : 1);

                if (killed) {
                    const color =
                        enemy.mesh.children[0]?.material?.color?.getHex?.() || 0xff4466;
                    particleSystem.createExplosion(
                        enemy.mesh.position,
                        color,
                        CONFIG.PARTICLE.EXPLOSION_COUNT
                    );
                    score += enemy.score;
                    enemiesKilled++;
                    audioManager.playExplosion();
                    enemy.destroy(scene);
                    spawner.enemies.splice(j, 1);
                } else {
                    particleSystem.createExplosion(enemy.mesh.position, 0xffaa00, 5);
                }
                break;
            }
        }

        if (hit) {
            bullet.destroy(scene);
            bulletManager.bullets.splice(i, 1);
        }
    }

    // 敌机 vs 玩家
    for (let i = spawner.enemies.length - 1; i >= 0; i--) {
        const enemy = spawner.enemies[i];
        if (enemy.destroyed) continue;

        if (sphereCollide(enemy.mesh.position, 1.0, player.position, 1.2)) {
            const color =
                enemy.mesh.children[0]?.material?.color?.getHex?.() || 0xff4466;
            particleSystem.createExplosion(
                enemy.mesh.position,
                color,
                CONFIG.PARTICLE.EXPLOSION_COUNT + 10
            );
            audioManager.playExplosion();
            damagePlayer(15);
            enemy.destroy(scene);
            spawner.enemies.splice(i, 1);
        }
    }

    // 敌机越界（飞过玩家）
    for (let i = spawner.enemies.length - 1; i >= 0; i--) {
        const enemy = spawner.enemies[i];
        if (enemy.destroyed) continue;

        if (enemy.mesh.position.z > 12) {
            enemy.destroy(scene);
            spawner.enemies.splice(i, 1);
            damagePlayer(5);
        }
    }
}

// -----------------------------------------------------------
// 15. 主循环
// -----------------------------------------------------------
function animate() {
    requestAnimationFrame(animate);

    const now = performance.now() / 1000;
    let dt = now - lastTime;
    lastTime = now;
    if (dt > 0.1) dt = 0.1; // 防止切后台后大 delta

    stars.rotation.y += dt * 0.01;

    if (!gameOver) {
        gameTime += dt;

        // 键盘方向输入
        let moveX = 0;
        let moveY = 0;
        if (keys['ArrowLeft'] || keys['KeyA']) moveX -= 1;
        if (keys['ArrowRight'] || keys['KeyD']) moveX += 1;
        if (keys['ArrowUp'] || keys['KeyW']) moveY += 1;
        if (keys['ArrowDown'] || keys['KeyS']) moveY -= 1;

        // 斜向移动归一化
        if (moveX !== 0 && moveY !== 0) {
            const factor = Math.SQRT1_2;
            moveX *= factor;
            moveY *= factor;
        }

        // 更新玩家（触摸已在事件里直接改位置）
        player.update(dt, moveX * CONFIG.PLAYER.SPEED, moveY * CONFIG.PLAYER.SPEED);

        // 射击与更新
        autoFire();
        spawner.update(dt, player.position);
        bulletManager.update(dt);
        handleCollisions();
        particleSystem.update(dt);

        // 扣血闪屏
        damageFlash = Math.max(0, damageFlash - dt * 3);
        if (damageFlash > 0) {
            document.body.style.background =
                'rgba(255, 40, 40, ' + damageFlash * 0.15 + ')';
        } else {
            document.body.style.background = 'transparent';
        }

        // 相机轻微跟随
        const camTargetX = player.position.x * 0.3;
        camera.position.x += (camTargetX - camera.position.x) * 4 * dt;
        camera.lookAt(0, 0, -10);

        // 每帧刷新 HUD（性能可接受）
        updateUI();
    } else {
        // 游戏结束时粒子仍继续播放
        particleSystem.update(dt);
    }

    renderer.render(scene, camera);
}

// -----------------------------------------------------------
// 16. 启动
// -----------------------------------------------------------
init();
animate();