// ============================================================
// 分享与复活管理器
// ============================================================
const ShareManager = (function () {
    'use strict';

    let reviveUsed = false;

    function share(callback) {
        Platform.shareAppMessage({
            title: '快来挑战我的最高分！',
            imageUrl: '',
            success: () => {
                if (callback) callback(true);
            },
            fail: () => {
                if (callback) callback(false);
            }
        });
    }

    function canRevive() {
        return !reviveUsed;
    }

    function useRevive() {
        if (reviveUsed) return false;
        reviveUsed = true;
        return true;
    }

    function resetRevive() {
        reviveUsed = false;
    }

    return {
        share,
        canRevive,
        useRevive,
        resetRevive
    };
})();