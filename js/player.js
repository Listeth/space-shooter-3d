// ============================================================
// js/player.js
// 玩家战机类：包含战机模型构建、移动逻辑、生命值管理
// ============================================================

import * as THREE from 'three';
import { CONFIG } from './config.js';
import { clamp } from './utils.js';

export class Player {
    /**
     * @param {THREE.Scene} scene
     */
    constructor(scene) {
        // Three.js Group，包含机身、机翼、座舱、引擎、尾翼
        this.mesh = this.createShip();
        this.mesh.position.set(0, 0, 0);
        scene.add(this.mesh);

        this.health = CONFIG.PLAYER.START_HEALTH;
        this.alive = true;
        this.boundsX = CONFIG.PLAYER.BOUNDS_X;
        this.boundsY = CONFIG.PLAYER.BOUNDS_Y;
        this.speed = CONFIG.PLAYER.SPEED;
    }

    /**
     * 构建玩家战机模型
     * 机头朝向 -Z 方向，因此子弹发射方向为 (0, 0, -1)
     * @returns {THREE.Group}
     */
    createShip() {
        const group = new THREE.Group();

        // ---------- 机身 ----------
        const bodyGeo = new THREE.BoxGeometry(0.8, 0.35, 1.8);
        const bodyMat = new THREE.MeshPhongMaterial({
            color: 0x4488ff,
            emissive: 0x112244,
            specular: 0x6699ff,
            shininess: 30,
        });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.castShadow = true;
        group.add(body);

        // ---------- 机翼 ----------
        const wingGeo = new THREE.BoxGeometry(3.0, 0.06, 0.8);
        const wingMat = new THREE.MeshPhongMaterial({
            color: 0x3366cc,
            emissive: 0x0e1f3d,
        });
        const wings = new THREE.Mesh(wingGeo, wingMat);
        wings.position.set(0, -0.08, 0.15);
        group.add(wings);

        // ---------- 翼尖（左/右） ----------
        const tipGeo = new THREE.BoxGeometry(0.3, 0.04, 0.5);
        const tipMat = new THREE.MeshPhongMaterial({ color: 0x2255aa, emissive: 0x0a1a33 });
        const tipL = new THREE.Mesh(tipGeo, tipMat);
        tipL.position.set(-1.65, -0.08, 0.1);
        group.add(tipL);
        const tipR = new THREE.Mesh(tipGeo, tipMat);
        tipR.position.set(1.65, -0.08, 0.1);
        group.add(tipR);

        // ---------- 座舱 ----------
        const cockpitGeo = new THREE.SphereGeometry(0.24, 16, 16);
        const cockpitMat = new THREE.MeshPhongMaterial({
            color: 0x88eeff,
            emissive: 0x226688,
            transparent: true,
            opacity: 0.8,
        });
        const cockpit = new THREE.Mesh(cockpitGeo, cockpitMat);
        cockpit.position.set(0, 0.25, -0.4);
        group.add(cockpit);

        // ---------- 引擎喷口 ----------
        const engineGeo = new THREE.CylinderGeometry(0.15, 0.2, 0.5, 12);
        engineGeo.rotateX(Math.PI / 2);
        const engineMat = new THREE.MeshPhongMaterial({ color: 0x334499, emissive: 0x224466 });
        const engine = new THREE.Mesh(engineGeo, engineMat);
        engine.position.set(0, 0.05, 0.9);
        group.add(engine);

        // ---------- 尾翼（左/右） ----------
        const finGeo = new THREE.BoxGeometry(0.06, 0.5, 0.5);
        const finMat = new THREE.MeshPhongMaterial({ color: 0x4477dd, emissive: 0x112233 });
        const leftFin = new THREE.Mesh(finGeo, finMat);
        leftFin.position.set(-0.35, 0.25, 0.7);
        group.add(leftFin);
        const rightFin = new THREE.Mesh(finGeo, finMat);
        rightFin.position.set(0.35, 0.25, 0.7);
        group.add(rightFin);

        return group;
    }

    /**
     * 每帧更新玩家位置与姿态
     * @param {number} dt - 帧间时间间隔（秒）
     * @param {number} moveX - X 轴方向速度（世界单位/秒），如 -18 ~ 18
     * @param {number} moveY - Y 轴方向速度
     */
    update(dt, moveX, moveY) {
        // 位移
        this.mesh.position.x += moveX * dt;
        this.mesh.position.y += moveY * dt;

        // 边界限制
        this.mesh.position.x = clamp(this.mesh.position.x, -this.boundsX, this.boundsX);
        this.mesh.position.y = clamp(this.mesh.position.y, -this.boundsY, this.boundsY);

        // 倾斜动画（lerp 平滑）
        const targetRotZ = -moveX * 0.02;
        this.mesh.rotation.z += (targetRotZ - this.mesh.rotation.z) * 8 * dt;
        this.mesh.rotation.x += (0 - this.mesh.rotation.x) * 5 * dt;
    }

    /**
     * 玩家受伤
     * @param {number} amount
     * @returns {boolean} 受伤后是否仍然存活
     */
    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.health = 0;
            this.alive = false;
        }
        return this.alive;
    }

    /**
     * 获取玩家位置
     * @returns {THREE.Vector3}
     */
    get position() {
        return this.mesh.position;
    }

    /**
     * 重置玩家状态（重启游戏时调用）
     */
    reset() {
        this.health = CONFIG.PLAYER.START_HEALTH;
        this.alive = true;
        this.mesh.position.set(0, 0, 0);
        this.mesh.rotation.set(0, 0, 0);
    }
}