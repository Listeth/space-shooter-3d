// ============================================================
// js/db/init-db.js
// 数据层统一初始化入口
// ============================================================

import { openDatabase } from './database.js';
import {
    PlayerRepository,
    GameRecordRepository,
    LeaderboardRepository,
    SettingsRepository,
} from './repositories.js';

/**
 * 初始化数据库并返回所有业务仓库
 * @returns {Promise<{
 *   db: IDBDatabase,
 *   playerRepo: PlayerRepository,
 *   recordRepo: GameRecordRepository,
 *   boardRepo: LeaderboardRepository,
 *   settingsRepo: SettingsRepository,
 * }>}
 */
export async function initDB() {
    try {
        const db = await openDatabase();
        return {
            db,
            playerRepo: new PlayerRepository(db),
            recordRepo: new GameRecordRepository(db),
            boardRepo: new LeaderboardRepository(db),
            settingsRepo: new SettingsRepository(db),
        };
    } catch (error) {
        console.error('数据库初始化失败:', error);
        throw error;
    }
}