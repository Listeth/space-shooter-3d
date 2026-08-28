// ============================================================
// js/db/leaderboard.js
// 排行榜读写封装
//
// 使用示例：
//   import { initDB } from './db/init-db.js';
//   const data = await initDB();
//   await data.leaderboard.addScore({ playerName: '玩家1', score: 100, wave: 3 });
//   const top = await data.leaderboard.getTopScores(10);
// ============================================================

import { STORES, add, getAll, clearStore } from './database.js';

const DEFAULT_PLAYER_NAME = '飞行员';

export class Leaderboard {
  /**
   * @param {IDBDatabase} db IndexedDB 实例
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * 提交一条分数
   * @param {Object} entry
   * @param {string} [entry.playerName='飞行员']
   * @param {number} [entry.score=0]
   * @param {number} [entry.wave=1]
   * @returns {Promise<number>} 新记录自增 id
   */
  async addScore({ playerName = DEFAULT_PLAYER_NAME, score = 0, wave = 1 } = {}) {
    if (!this.db) throw new Error('数据库未初始化');
    const record = {
      playerName: String(playerName).slice(0, 20) || DEFAULT_PLAYER_NAME,
      score: Number(score) || 0,
      wave: Number(wave) || 1,
      timestamp: Date.now(),
    };
    return await add(this.db, STORES.SCORES, record);
  }

  /**
   * 获取排行榜前 N 名
   * @param {number} [limit=10]
   * @returns {Promise<Array>} 按分数从高到低排序
   */
  async getTopScores(limit = 10) {
    if (!this.db) return [];
    const all = await getAll(this.db, STORES.SCORES);
    all.sort((a, b) => b.score - a.score || a.timestamp - b.timestamp);
    return all.slice(0, limit);
  }

  /**
   * 获取某个分数在当前排行榜中的名次（1 表示最高分）
   * @param {number} score
   * @returns {Promise<number>} 名次；如果无记录返回 -1
   */
  async getRank(score) {
    if (!this.db) return -1;
    const all = await getAll(this.db, STORES.SCORES);
    all.sort((a, b) => b.score - a.score);
    const index = all.findIndex((item) => item.score <= score);
    if (index === -1) return all.length + 1;
    return index + 1;
  }

  /**
   * 清空排行榜（谨慎使用）
   * @returns {Promise<void>}
   */
  async clear() {
    if (!this.db) return;
    await clearStore(this.db, STORES.SCORES);
  }
}