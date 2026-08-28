// ============================================================
// js/bullet.js
// 子弹类（普通 + Mega）和子弹管理器
// ============================================================

import * as THREE from 'three';
import { CONFIG } from './config.js';

// ------------------------------------------------------------
// Bullet 子弹类
// ------------------------------------------------------------
export class Bullet {
    /**
     * @param {THREE.Scene} scene
     * @param {THREE.Vector3} position
     * @param {THREE.Vector3} direction - 发射方向（需归一化）
     * @param {number} speed
     * @param {boolean} isMega
     */
    constructor(scene, position, direction, speed, isMega = false) {
        this.mesh = this.createMesh(isMega);
        this.mesh.position.copy(position);
        this.direction = direction.clone().normalize();
        this.speed = speed;
        this.isMega = isMega;
        this.active = true;
        scene.add(this.mesh);
    }

    /**
     * 创建子弹网格：发光胶囊体
     * @param {boolean} isMega
     * @returns {THREE.Mesh}
     */
    createMesh(isMega) {
        const length = isMega ? 1.2 : 0.6;
        const radius = isMega ? 0.12 : 0.05;
        const geo = new THREE.CylinderGeometry(radius, radius, length, 6);
        geo.rotateX(Math.PI / 2);
        const mat = new THREE.MeshBasicMaterial({
            color: isMega ? 0xffaa00 : 0x00ffee,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
        });
        return new THREE.Mesh(geo, mat);
    }

    /**
     * 每帧更新子弹位置
     * @param {number} dt
     */
    update(dt) {
        this.mesh.position.addScaledVector(this.direction, this.speed * dt);
        if (this.mesh.position.z < -80) {
            this.active = false; // 超出场景，标记为销毁
        }
    }

    /**
     * 从场景移除并释放资源
     * @param {THREE.Scene} scene
     */
    destroy(scene) {
        if (!this.active) return;
        scene.remove(this.mesh);
        this.mesh.geometry.dispose();
        this.mesh.material.dispose();
        this.active = false;
    }
}

// ------------------------------------------------------------
// BulletManager 子弹管理器
// ------------------------------------------------------------
export class BulletManager {
    /**
     * @param {THREE.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.bullets = [];
        this.shootTimer = 0;   // 普通射击计时器
        this.megaTimer = 0;    // Mega 射击计时器
    }

    /**
     * 每帧更新全部子弹，并推进冷却计时器
     * @param {number} dt
     */
    update(dt) {
        this.shootTimer += dt;
        this.megaTimer += dt;

        for (let i = this.bullets.length - 1; i >= 0; i--) {
            const bullet = this.bullets[i];
            bullet.update(dt);
            if (!bullet.active) {
                bullet.destroy(this.scene);
                this.bullets.splice(i, 1);
            }
        }
    }

    /**
     * 检查是否可以发射普通子弹
     */
    canShootNormal() {
        return this.shootTimer >= CONFIG.BULLET.COOLDOWN;
    }

    /**
     * 检查是否可以发射 Mega 子弹
     */
    canShootMega() {
        return this.megaTimer >= CONFIG.BULLET.MEGA_COOLDOWN;
    }

    resetShootTimer() {
        this.shootTimer = 0;
    }

    resetMegaTimer() {
        this.megaTimer = 0;
    }

    /**
     * 在指定位置发射一枚普通子弹（沿 -Z 方向）
     * @param {THREE.Vector3} position
     */
    fireNormal(position) {
        const direction = new THREE.Vector3(0, 0, -1);
        const bullet = new Bullet(
            this.scene,
            position.clone(),
            direction,
            CONFIG.BULLET.SPEED,
            false
        );
        this.bullets.push(bullet);
    }

    /**
     * 在指定位置发射一组扇形 Mega 子弹
     * @param {THREE.Vector3} position
     */
    fireMega(position) {
        const count = CONFIG.BULLET.MEGA_SPREAD;
        const angle = CONFIG.BULLET.MEGA_ANGLE;
        const step = angle / (count - 1);

        for (let i = 0; i < count; i++) {
            const a = -angle / 2 + i * step;
            const direction = new THREE.Vector3(Math.sin(a), 0, -Math.cos(a));
            const bullet = new Bullet(
                this.scene,
                position.clone(),
                direction,
                CONFIG.BULLET.SPEED * 0.9,
                true
            );
            this.bullets.push(bullet);
        }
    }

    /**
     * 清空所有子弹（重启游戏时调用）
     */
    clear() {
        for (const bullet of this.bullets) {
            bullet.destroy(this.scene);
        }
        this.bullets.length = 0;
        this.shootTimer = 0;
        this.megaTimer = 0;
    }
}