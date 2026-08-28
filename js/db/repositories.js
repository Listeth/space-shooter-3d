// ============================================================
// js/db/repositories.js
// 领域仓库：PlayerRepository / GameRecordRepository /
//          LeaderboardRepository / SettingsRepository
// ============================================================

import { STORES } from './database.js';
import {
    findAll,
    findById,
    findByIndex,
    getTopByIndex,
    add,
    update,
    remove,
    clearStore,
} from './repository.js';
import { clamp } from '../utils.js';

// -----------------------------------------------------------
// PlayerRepository 玩家仓库
// -----------------------------------------------------------
export class PlayerRepository {
    constructor(db) {
        this.db = db;
    }

    /**
     * 创建新玩家
     * @param {string} username
     * @returns {Promise<number>} 新玩家 id
     */
    async createPlayer(username) {
        const player = {
            username: String(username || '飞行员').slice(0, 20),
            avatar: null,
            created_at: new Date().toISOString(),
            last_login_at: new Date().toISOString(),
            total_games: 0,
            total_score: 0,
            best_score: 0,
            best_wave: 1,
        };
        return await add(this.db, STORES.PLAYERS, player);
    }

    /**
     * 根据主键获取玩家
     * @param {number} playerId
     * @returns {Promise<Object|null>}
     */
    async getPlayer(playerId) {
        return await findById(this.db, STORES.PLAYERS, playerId);
    }

    /**
     * 根据用户名查找玩家
     * @param {string} username
     * @returns {Promise<Object|null>}
     */
    async findByUsername(username) {
        const list = await findByIndex(this.db, STORES.PLAYERS, 'username', username);
        return list[0] || null;
    }

    /**
     * 获取或创建玩家
     * @param {string} username
     * @returns {Promise<Object>}
     */
    async getOrCreate(username) {
        let user = await this.findByUsername(username);
        if (!user) {
            const newId = await this.createPlayer(username);
            user = await this.getPlayer(newId);
        } else {
            user.last_login_at = new Date().toISOString();
            await update(this.db, STORES.PLAYERS, user);
        }
        return user;
    }

    /**
     * 更新玩家统计
     * @param {number} playerId
     * @param {Object} gameResult
     * @param {number} gameResult.score
     * @param {number} gameResult.wave
     * @returns {Promise<Object>}
     */
    async updateStats(playerId, gameResult) {
        const player = await this.getPlayer(playerId);
        if (!player) throw new Error('玩家不存在');

        player.total_games += 1;
        player.total_score += gameResult.score || 0;

        if ((gameResult.score || 0) > player.best_score) {
            player.best_score = gameResult.score;
            player.best_wave = gameResult.wave || 1;
        }

        player.last_login_at = new Date().toISOString();
        await update(this.db, STORES.PLAYERS, player);
        return player;
    }

    /**
     * 删除玩家及其关联数据（IndexedDB 无外键，需手动级联清理）
     * @param {number} playerId
     */
    async removePlayer(playerId) {
        // 级联删除对局记录
        const records = await findByIndex(this.db, STORES.GAME_RECORDS, 'player_id', playerId);
        for (const r of records) {
            await remove(this.db, STORES.GAME_RECORDS, r.id);
        }
        // 级联删除排行榜记录
        const board = await findByIndex(this.db, STORES.LEADERBOARD, 'player_id', playerId);
        for (const b of board) {
            await remove(this.db, STORES.LEADERBOARD, b.id);
        }
        // 删除设置
        await remove(this.db, STORES.SETTINGS, playerId);
        // 删除玩家自己
        await remove(this.db, STORES.PLAYERS, playerId);
    }
}

// -----------------------------------------------------------
// GameRecordRepository 游戏记录仓库
// -----------------------------------------------------------
export class GameRecordRepository {
    constructor(db) {
        this.db = db;
    }

    /**
     * 新增一条对局记录
     * @param {Object} record
     * @param {number} record.player_id
     * @param {number} record.score
     * @param {number} record.wave
     * @param {number} [record.kills]
     * @param {number} [record.duration_sec]
     * @param {number} [record.shots_fired]
     * @param {number} [record.hits]
     * @param {number} [record.accuracy]
     * @returns {Promise<number>} 新记录 id
     */
    async addRecord(record) {
        const data = {
            player_id: record.player_id,
            score: record.score || 0,
            wave: record.wave || 1,
            kills: record.kills || 0,
            duration_sec: record.duration_sec || 0,
            shots_fired: record.shots_fired || 0,
            hits: record.hits || 0,
            accuracy: record.accuracy || 0,
            created_at: new Date().toISOString(),
        };
        return await add(this.db, STORES.GAME_RECORDS, data);
    }

    /**
     * 获取某玩家最近 N 条记录
     * @param {number} playerId
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    async findByPlayer(playerId, limit = 10) {
        const list = await findByIndex(this.db, STORES.GAME_RECORDS, 'player_id', playerId);
        list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return list.slice(0, limit);
    }

    /**
     * 获取全局最高分 N 条记录
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    async getTop(limit = 10) {
        return await getTopByIndex(this.db, STORES.GAME_RECORDS, 'score', limit);
    }

    /**
     * 获取玩家总对局数
     * @param {number} playerId
     * @returns {Promise<number>}
     */
    async getCountByPlayer(playerId) {
        const list = await findByIndex(this.db, STORES.GAME_RECORDS, 'player_id', playerId);
        return list.length;
    }

    /**
     * 删除一条记录
     * @param {number} recordId
     */
    async removeRecord(recordId) {
        await remove(this.db, STORES.GAME_RECORDS, recordId);
    }

    /**
     * 清空对局记录表
     */
    async clear() {
        await clearStore(this.db, STORES.GAME_RECORDS);
    }
}

// -----------------------------------------------------------
// LeaderboardRepository 排行榜仓库
// -----------------------------------------------------------
export class LeaderboardRepository {
    constructor(db) {
        this.db = db;
    }

    /**
     * 根据玩家 ID 查找排行榜记录
     * @param {number} playerId
     * @returns {Promise<Object|null>}
     */
    async findByPlayerId(playerId) {
        const list = await findByIndex(this.db, STORES.LEADERBOARD, 'player_id', playerId);
        return list[0] || null;
    }

    /**
     * 提交分数：若已有记录且新分更高则更新，否则保留旧纪录
     * @param {number} playerId
     * @param {string} playerName
     * @param {number} score
     * @param {number} wave
     * @returns {Promise<Object>}
     */
    async submitScore(playerId, playerName, score, wave) {
        const existing = await this.findByPlayerId(playerId);

        if (existing && existing.score >= score) {
            return existing;
        }

        const record = {
            id: existing ? existing.id : undefined,
            player_id: playerId,
            player_name: String(playerName || '飞行员').slice(0, 20),
            score: Number(score) || 0,
            wave: Number(wave) || 1,
            achieved_at: new Date().toISOString(),
        };

        if (existing) {
            await update(this.db, STORES.LEADERBOARD, record);
        } else {
            await add(this.db, STORES.LEADERBOARD, record);
        }

        return record;
    }

    /**
     * 获取排行榜前 N 名
     * @param {number} limit
     * @returns {Promise<Array>}
     */
    async getTopScores(limit = 10) {
        return await getTopByIndex(this.db, STORES.LEADERBOARD, 'score', limit);
    }

    /**
     * 删除某玩家的排行榜记录
     * @param {number} playerId
     */
    async removePlayerRecord(playerId) {
        const record = await this.findByPlayerId(playerId);
        if (record) {
            await remove(this.db, STORES.LEADERBOARD, record.id);
        }
    }

    /**
     * 清空排行榜
     */
    async clear() {
        await clearStore(this.db, STORES.LEADERBOARD);
    }
}

// -----------------------------------------------------------
// SettingsRepository 玩家设置仓库
// -----------------------------------------------------------
export class SettingsRepository {
    constructor(db) {
        this.db = db;
    }

    /**
     * 获取玩家设置，不存在时返回默认设置
     * @param {number} playerId
     * @returns {Promise<Object>}
     */
    async getSettings(playerId) {
        const settings = await findById(this.db, STORES.SETTINGS, playerId);
        if (settings) {
            return settings;
        }
        // 返回默认设置（不写入数据库）
        return {
            player_id: playerId,
            sound_enabled: true,
            music_enabled: true,
            graphics_quality: 'high',
            sensitivity: 1.0,
        };
    }

    /**
     * 保存玩家设置（不存在则新增，存在则覆盖）
     * @param {Object} settings
     * @param {number} settings.player_id
     * @param {boolean} [settings.sound_enabled]
     * @param {boolean} [settings.music_enabled]
     * @param {string} [settings.graphics_quality]
     * @param {number} [settings.sensitivity]
     * @returns {Promise<number|string>}
     */
    async saveSettings(settings) {
        if (!settings || settings.player_id === undefined) {
            throw new Error('Settings 必须包含 player_id');
        }

        const data = {
            player_id: settings.player_id,
            sound_enabled: settings.sound_enabled !== false,
            music_enabled: settings.music_enabled !== false,
            graphics_quality: ['low', 'medium', 'high', 'ultra'].includes(
                settings.graphics_quality
            )
                ? settings.graphics_quality
                : 'high',
            sensitivity: clamp(Number(settings.sensitivity) || 1.0, 0.1, 5.0),
        };

        const existing = await findById(this.db, STORES.SETTINGS, settings.player_id);
        if (existing) {
            return await update(this.db, STORES.SETTINGS, data);
        }
        return await add(this.db, STORES.SETTINGS, data);
    }

    /**
     * 清空设置表
     */
    async clear() {
        await clearStore(this.db, STORES.SETTINGS);
    }
}