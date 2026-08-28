// ============================================================
// js/db/gameRecords.js
// 对局记录读写封装
//
// 使用示例：
//   const data = await initDB();
//   await data.gameRecords.saveRecord({
//     playerName: '玩家1',
//     score: 100,
//     wave: 3,
//     kills: 12,
//     duration: 45.2,
//   });
// ============================================================

import { STORES, add, getAll, getByIndex, clearStore } from './database.js';

const DEFAULT_PLAYER_NAME = '飞行员';

export class GameRecorder {
  /**
   * @param {IDBDatabase} db IndexedDB 实例
   */
  constructor(db) {
    this.db = db;
  }

  /**
   * 保存一局完整记录
   * @param {Object} data
   * @param {string} [data.playerName='飞行员']
   * @param {number} [data.score=0]
   * @param {number} [data.wave=1]
   * @param {number} [data.kills=0]
   * @param {number} [data.duration=0] 对局时长（秒）
   * @returns {Promise<number|undefined>} 新记录自增 id
   */
  async saveRecord({
    playerName = DEFAULT_PLAYER_NAME,
    score = 0,
    wave = 1,
    kills = 0,
    duration = 0,
  } = {}) {
    if (!this.db) return undefined;
    const record = {
      playerName: String(playerName).slice(0, 20) || DEFAULT_PLAYER_NAME,
      score: Number(score) || 0,
      wave: Number(wave) || 1,
      kills: Number(kills) || 0,
      duration: Number(duration) || 0,
      timestamp: Date.now(),
    };
    return await add(this.db, STORES.GAME_RECORDS, record);
  }

  /**
   * 获取最近 N 条对局记录（按时间倒序）
   * @param {number} [limit=20]
   * @returns {Promise<Array>}
   */
  async getRecentRecords(limit = 20) {
    if (!this.db) return [];
    const all = await getAll(this.db, STORES.GAME_RECORDS);
    all.sort((a, b) => b.timestamp - a.timestamp);
    return all.slice(0, limit);
  }

  /**
   * 按最低分数查询记录
   * @param {number} minScore
   * @returns {Promise<Array>}
   */
  async getByMinScore(minScore) {
    if (!this.db) return [];
    const range = IDBKeyRange.lowerBound(Number(minScore) || 0);
    const records = await getByIndex(this.db, STORES.GAME_RECORDS, 'score', range);
    return records;
  }

  /**
   * 获取总对局次数
   * @returns {Promise<number>}
   */
  async getTotalGames() {
    if (!this.db) return 0;
    const all = await getAll(this.db, STORES.GAME_RECORDS);
    return all.length;
  }

  /**
   * 清空对局记录（谨慎使用）
   * @returns {Promise<void>}
   */
  async clear() {
    if (!this.db) return;
    await clearStore(this.db, STORES.GAME_RECORDS);
  }
}