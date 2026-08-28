// ============================================================
// 广告管理模块
// ============================================================
const AdManager = (function () {
    'use strict';

    let interstitialShown = false;
    let rewardAdLoading = false;

    function showInterstitial(callback) {
        if (interstitialShown) {
            if (callback) callback(false);
            return;
        }
        interstitialShown = true;

        if (Platform.isWX) {
            try {
                const interstitialAd = wx.createInterstitialAd({
                    adUnitId: 'xxxxx'
                });
                interstitialAd.show().then(() => {
                    interstitialAd.onClose(() => {
                        if (callback) callback(true);
                    });
                }).catch((err) => {
                    console.error('插屏广告加载失败', err);
                    if (callback) callback(false);
                });
            } catch (e) {
                setTimeout(() => {
                    if (callback) callback(true);
                }, 500);
            }
        } else {
            setTimeout(() => {
                if (callback) callback(true);
            }, 2000);
        }
    }

    function showReward(callback) {
        if (rewardAdLoading) {
            if (callback) callback(false);
            return;
        }
        rewardAdLoading = true;

        if (Platform.isWX) {
            try {
                const videoAd = wx.createRewardedVideoAd({
                    adUnitId: 'xxxxx'
                });
                videoAd.show().then(() => {
                    videoAd.onClose((res) => {
                        rewardAdLoading = false;
                        if (res && res.isEnded) {
                            if (callback) callback(true);
                        } else {
                            if (callback) callback(false);
                        }
                    });
                }).catch((err) => {
                    rewardAdLoading = false;
                    console.error('激励视频加载失败', err);
                    if (callback) callback(false);
                });
            } catch (e) {
                rewardAdLoading = false;
                setTimeout(() => {
                    if (callback) callback(true);
                }, 3000);
            }
        } else {
            setTimeout(() => {
                rewardAdLoading = false;
                if (callback) callback(true);
            }, 3000);
        }
    }

    function resetInterstitial() {
        interstitialShown = false;
    }

    return {
        showInterstitial,
        showReward,
        resetInterstitial
    };
})();