// ============================================================
// js/particle.js
// 粒子爆炸特效系统
// ============================================================

import * as THREE from 'three';
import { CONFIG } from './config.js';

export class ParticleSystem {
    /**
     * @param {THREE.Scene} scene
     */
    constructor(scene) {
        this.scene = scene;
        this.particles = [];
    }

    /**
     * 在指定位置创建爆炸粒子
     * @param {THREE.Vector3} position
     * @param {number} color - 十六进制颜色
     * @param {number} count - 粒子数量
     */
    createExplosion(position, color = 0xff6600, count = CONFIG.PARTICLE.EXPLOSION_COUNT) {
        // 限制粒子总数，防止性能过载
        count = Math.min(count, CONFIG.PARTICLE.MAX_PARTICLES - this.particles.length);
        if (count <= 0) return;

        for (let i = 0; i < count; i++) {
            const size = 0.08 + Math.random() * 0.18;
            const geo = new THREE.SphereGeometry(size, 6, 6);
            const mat = new THREE.MeshBasicMaterial({
                color: color,
                transparent: true,
                opacity: 1,
                blending: THREE.AdditiveBlending,
                depthWrite: false,
            });
            const particle = new THREE.Mesh(geo, mat);
            particle.position.copy(position);

            // 粒子速度：向随机方向飞散
            const speed = 4 + Math.random() * 10;
            particle.userData = {
                velocity: new THREE.Vector3(
                    (Math.random() - 0.5),
                    (Math.random() - 0.5),
                    (Math.random() - 0.5)
                ).normalize().multiplyScalar(speed),
                life: 1,                    // 当前寿命（1 → 0）
                decay: 1.2 + Math.random() * 1.2, // 衰减速率
            };

            this.scene.add(particle);
            this.particles.push(particle);
        }
    }

    /**
     * 每帧更新所有粒子
     * @param {number} dt
     */
    update(dt) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            // 施加空气阻力
            p.userData.velocity.multiplyScalar(0.98);
            // 位移
            p.position.addScaledVector(p.userData.velocity, dt);
            // 寿命衰减
            p.userData.life -= p.userData.decay * dt;
            // 透明度随寿命降低
            p.material.opacity = Math.max(0, p.userData.life);

            // 粒子寿命结束 → 移除
            if (p.userData.life <= 0) {
                this.scene.remove(p);
                p.geometry.dispose();
                p.material.dispose();
                this.particles.splice(i, 1);
            }
        }
    }

    /**
     * 清空所有粒子（重启游戏时调用）
     */
    clear() {
        for (const p of this.particles) {
            this.scene.remove(p);
            p.geometry.dispose();
            p.material.dispose();
        }
        this.particles.length = 0;
    }
}