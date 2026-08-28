// ============================================================
// js/enemy.js
// 敌机类（基础/横向/重型） + 波次生成器
// ============================================================

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { randRange, disposeObject } from './utils.js';

// ------------------------------------------------------------
// Enemy 敌机类
// ------------------------------------------------------------
export class Enemy {
    /**
     * @param {THREE.Scene} scene
     * @param {string} type - 'basic' | 'weaver' | 'tank'
     */
    constructor(scene, type) {
        this.type = type;
        const definition = this.getDefinition(type);
        this.health = definition.HEALTH;
        this.score = definition.SCORE;
        this.speed = randRange(definition.SPEED_MIN, definition.SPEED_MAX);
        this.mesh = this.createModel(type, definition.COLOR);
        this.mesh.position.set(randRange(-6, 6), randRange(-3.5, 3.5), -50);
        scene.add(this.mesh);

        this.baseX = this.mesh.position.x;
        this.phase = Math.random() * Math.PI * 2; // 用于正弦函数的随机相位
        this.time = 0;
        this.destroyed = false;
    }

    /**
     * 获取对应类型的配置定义
     */
    getDefinition(type) {
        switch (type) {
            case 'basic': return CONFIG.ENEMY.BASIC;
            case 'weaver': return CONFIG.ENEMY.WEAVER;
            case 'tank': return CONFIG.ENEMY.TANK;
            default: return CONFIG.ENEMY.BASIC;
        }
    }

    /**
     * 根据敌机类型创建对应的网格模型
     * @param {string} type
     * @param {number} color - 十六进制颜色
     * @returns {THREE.Group}
     */
    createModel(type, color) {
        const group = new THREE.Group();
        const emissive = new THREE.Color(color).multiplyScalar(0.3);

        if (type === 'basic') {
            const bodyGeo = new THREE.OctahedronGeometry(0.6);
            const bodyMat = new THREE.MeshPhongMaterial({ color, emissive });
            group.add(new THREE.Mesh(bodyGeo, bodyMat));

            const wingGeo = new THREE.BoxGeometry(1.5, 0.05, 0.4);
            const wingMat = new THREE.MeshPhongMaterial({ color: 0xcc2233, emissive: 0x331122 });
            const wings = new THREE.Mesh(wingGeo, wingMat);
            wings.position.z = 0.2;
            group.add(wings);
        } else if (type === 'weaver') {
            const bodyGeo = new THREE.IcosahedronGeometry(0.45);
            const bodyMat = new THREE.MeshPhongMaterial({ color, emissive });
            group.add(new THREE.Mesh(bodyGeo, bodyMat));

            const eyeGeo = new THREE.SphereGeometry(0.15, 8, 8);
            const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffff00 });
            const eye = new THREE.Mesh(eyeGeo, eyeMat);
            eye.position.set(0, 0, 0.5);
            group.add(eye);
        } else if (type === 'tank') {
            const bodyGeo = new THREE.BoxGeometry(1.2, 1.0, 1.0);
            const bodyMat = new THREE.MeshPhongMaterial({ color, emissive });
            group.add(new THREE.Mesh(bodyGeo, bodyMat));

            const spikeGeo = new THREE.ConeGeometry(0.2, 0.5, 4);
            const spikeMat = new THREE.MeshPhongMaterial({ color: 0x8844cc, emissive: 0x221144 });
            for (let i = 0; i < 4; i++) {
                const spike = new THREE.Mesh(spikeGeo, spikeMat);
                spike.position.set(
                    i % 2 === 0 ? -0.55 : 0.55,
                    i < 2 ? 0.45 : -0.45,
                    0
                );
                group.add(spike);
            }
        }

        return group;
    }

    /**
     * 每帧更新敌机 AI 行为
     * @param {number} dt
     * @param {THREE.Vector3} playerPosition
     */
    update(dt, playerPosition) {
        this.time += dt;
        this.mesh.position.z += this.speed * dt;

        if (this.type === 'basic') {
            // 基础型：缓慢追踪玩家
            const dx = playerPosition.x - this.mesh.position.x;
            const dy = playerPosition.y - this.mesh.position.y;
            this.mesh.position.x += dx * 0.3 * dt;
            this.mesh.position.y += dy * 0.3 * dt;
        } else if (this.type === 'weaver') {
            // 横向型：沿正弦轨迹移动
            const config = CONFIG.ENEMY.WEAVER;
            this.mesh.position.x = this.baseX + Math.sin(this.time * config.FREQUENCY + this.phase) * config.AMPLITUDE;
        }
        // tank 型不追踪，直线飞行

        // 小幅旋转，增加视觉动态
        this.mesh.rotation.z = Math.sin(this.time * 2 + this.phase) * 0.2;
        this.mesh.rotation.x = Math.sin(this.time * 1.5) * 0.1;
    }

    /**
     * 受到伤害
     * @param {number} amount
     * @returns {boolean} 是否被击毁
     */
    takeDamage(amount) {
        this.health -= amount;
        return this.health <= 0;
    }

    /**
     * 从场景移除并释放资源
     * @param {THREE.Scene} scene
     */
    destroy(scene) {
        if (!this.destroyed) {
            scene.remove(this.mesh);
            disposeObject(this.mesh);
            this.destroyed = true;
        }
    }
}

// ------------------------------------------------------------
// EnemySpawner 敌机生成器
// ------------------------------------------------------------
export class EnemySpawner {
    /**
     * @param {THREE.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.enemies = [];    // 当前所有活跃敌军
        this.spawnTimer = 0;
        this.spawnInterval = CONFIG.ENEMY.SPAWN_INTERVAL_START;
        this.wave = 1;        // 当前波数
        this.spawnedInWave = 0;
        this.waveSize = CONFIG.ENEMY.WAVE_SIZE;
    }

    /**
     * 每帧更新敌机生成状态
     * @param {number} dt
     * @param {THREE.Vector3} playerPosition
     */
    update(dt, playerPosition) {
        // 定时生成新敌机
        this.spawnTimer += dt;
        if (this.spawnTimer >= this.spawnInterval) {
            this.spawnTimer -= this.spawnInterval;
            this.spawnEnemy();
        }

        // 遍历所有敌人，更新 AI，并检测是否已飞出视野
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            enemy.update(dt, playerPosition);
            if (enemy.mesh.position.z > 12) {
                enemy.destroy(this.scene);
                this.enemies.splice(i, 1);
            }
        }
    }

    /**
     * 生成一个敌机
     */
    spawnEnemy() {
        const type = this.chooseType();
        const enemy = new Enemy(this.scene, type);
        this.enemies.push(enemy);
        this.spawnedInWave++;

        // 当前波次已满则升到下一波
        if (this.spawnedInWave >= this.waveSize) {
            this.wave++;
            this.spawnedInWave = 0;
            this.spawnInterval = Math.max(
                CONFIG.ENEMY.SPAWN_INTERVAL_MIN,
                CONFIG.ENEMY.SPAWN_INTERVAL_START - (this.wave - 1) * 0.12
            );
            this.waveSize = CONFIG.ENEMY.WAVE_SIZE + Math.floor(Math.random() * 5);
        }
    }

    /**
     * 根据权重（概率）选择敌机类型
     * @returns {string}
     */
    chooseType() {
        const p = Math.random();
        if (p < 0.55) return 'basic';
        if (p < 0.85) return 'weaver';
        return 'tank';
    }

    /**
     * 清空所有敌人（重启游戏时调用）
     */
    clear() {
        for (const enemy of this.enemies) {
            enemy.destroy(this.scene);
        }
        this.enemies.length = 0;
        this.spawnTimer = 0;
        this.spawnedInWave = 0;
        this.spawnInterval = CONFIG.ENEMY.SPAWN_INTERVAL_START;
        this.wave = 1;
        this.waveSize = CONFIG.ENEMY.WAVE_SIZE;
    }
}