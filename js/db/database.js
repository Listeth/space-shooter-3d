// ==========================================================
// js/db/database.js
// IndexedDB 底层封装：连接数据库、创建 Object Store（表）、
// 导出所有 Store 名称常量。
// ==========================================================

const DB_NAME = 'space-shooter-db';
const DB_VERSION = 1;

// 所有 Object Store 名称（相当于表名）
export const STORES = {
  PLAYERS: 'players',
  GAME_RECORDS: 'gameRecords',
  LEADERBOARD: 'leaderboard',
  SETTINGS: 'settings',
};

/**
 * 打开数据库，并在首次创建时初始化所有 Store 和索引。
 * @returns {Promise<IDBDatabase>}
 */
export function openDatabase() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      reject(new Error('当前浏览器不支持 IndexedDB'));
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    // 建库 / 升级时触发
    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // ---- players ----
      if (!db.objectStoreNames.contains(STORES.PLAYERS)) {
        const userStore = db.createObjectStore(STORES.PLAYERS, {
          keyPath: 'id',
          autoIncrement: true,
        });
        userStore.createIndex('username', 'username', { unique: true });
        userStore.createIndex('best_score', 'best_score', { unique: false });
      }

      // ---- gameRecords ----
      if (!db.objectStoreNames.contains(STORES.GAME_RECORDS)) {
        const recordStore = db.createObjectStore(STORES.GAME_RECORDS, {
          keyPath: 'id',
          autoIncrement: true,
        });
        recordStore.createIndex('player_id', 'player_id', { unique: false });
        recordStore.createIndex('score', 'score', { unique: false });
        recordStore.createIndex('created_at', 'created_at', { unique: false });
      }

      // ---- leaderboard ----
      if (!db.objectStoreNames.contains(STORES.LEADERBOARD)) {
        const boardStore = db.createObjectStore(STORES.LEADERBOARD, {
          keyPath: 'id',
          autoIncrement: true,
        });
        boardStore.createIndex('score', 'score', { unique: false });
        boardStore.createIndex('player_id', 'player_id', { unique: true });
      }

      // ---- settings ----
      if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
        db.createObjectStore(STORES.SETTINGS, { keyPath: 'player_id' });
      }
    };

    request.onsuccess = (event) => resolve(event.target.result);
    request.onerror = (event) => reject(event.target.error);
  });
}