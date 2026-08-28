// ============================================================
// 本地存储与排行榜
// ============================================================
const Storage = (function () {
    'use strict';

    const STORAGE_KEY = 'flappy_bird_rank';

    function get(key, defaultValue) {
        try {
            if (Platform.isWX) {
                const value = wx.getStorageSync(key);
                return value === '' ? defaultValue : value;
            }
            const value = localStorage.getItem(key);
            return value === null ? defaultValue : JSON.parse(value);
        } catch (e) {
            return defaultValue;
        }
    }

    function set(key, value) {
        try {
            if (Platform.isWX) {
                wx.setStorageSync(key, value);
            } else {
                localStorage.setItem(key, JSON.stringify(value));
            }
        } catch (e) {}
    }

    class ScoreBoard {
        constructor() {
            this.key = STORAGE_KEY;
            this.list = get(this.key, []);
        }

        addScore(score) {
            const entry = { score, time: Date.now() };
            this.list.push(entry);
            this.list.sort((a, b) => b.score - a.score);
            this.list = this.list.slice(0, CONFIG.RANK_SIZE);
            set(this.key, this.list);
            return this.list;
        }

        getTop() {
            return this.list;
        }

        getBest() {
            return this.list.length ? this.list[0].score : 0;
        }

        getMyRank(score) {
            for (let i = 0; i < this.list.length; i++) {
                if (this.list[i].score === score) {
                    return i + 1;
                }
            }
            return -1;
        }

        getCount() {
            return this.list.length;
        }
    }

    return {
        get,
        set,
        ScoreBoard
    };
})();