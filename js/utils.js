// ============================================================
// js/utils.js
// 通用工具函数数据结构
// ============================================================

/**
 * 将 value 限制在 [min, max] 范围内
 */
export function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

/**
 * 生成 [min, max] 范围内的随机浮点数
 */
export function randRange(min, max) {
    return min + Math.random() * (max - min);
}

/**
 * 随机返回 -1 或 1
 */
export function randSign() {
    return Math.random() < 0.5 ? -1 : 1;
}

/**
 * 球体碰撞检测（使用平方比较，避免开根号）
 * @param {Object} a - 具有 x/y/z 的对象（如 THREE.Vector3）
 * @param {number} radiusA
 * @param {Object} b
 * @param {number} radiusB
 * @returns {boolean} 是否碰撞
 */
export function sphereCollide(a, radiusA, b, radiusB) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    const r = radiusA + radiusB;
    return dx * dx + dy * dy + dz * dz <= r * r;
}

/**
 * 递归释放 Three.js 对象及其子对象的几何体和材质
 * @param {THREE.Object3D} obj
 */
export function disposeObject(obj) {
    if (!obj) return;

    if (obj.geometry) {
        obj.geometry.dispose();
        obj.geometry = null;
    }

    if (obj.material) {
        if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
        } else {
            obj.material.dispose();
        }
        obj.material = null;
    }

    if (obj.children) {
        for (let i = obj.children.length - 1; i >= 0; i--) {
            disposeObject(obj.children[i]);
        }
        obj.children.length = 0;
    }
}