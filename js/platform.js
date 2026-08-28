// ============================================================
// 双平台适配层（微信小游戏 / 网页）
// ============================================================
const Platform = (function () {
    'use strict';

    const isWX = (typeof wx !== 'undefined' && wx.getSystemInfoSync);
    let systemInfo = null;

    function getSystemInfo() {
        if (systemInfo) return systemInfo;
        if (isWX) {
            systemInfo = wx.getSystemInfoSync();
            return systemInfo;
        }
        return null;
    }

    function getCanvas() {
        if (isWX) {
            return wx.createCanvas();
        }
        return document.getElementById('gameCanvas');
    }

    function getWidth() {
        if (isWX) {
            return getSystemInfo().windowWidth;
        }
        return window.innerWidth;
    }

    function getHeight() {
        if (isWX) {
            return getSystemInfo().windowHeight;
        }
        return window.innerHeight;
    }

    function getDevicePixelRatio() {
        if (isWX) {
            return getSystemInfo().pixelRatio || 1;
        }
        return window.devicePixelRatio || 1;
    }

    function onTouchStart(handler) {
        const wrappedHandler = function (e) {
            let x, y;
            if (isWX) {
                const touches = e.touches || e.changedTouches;
                if (touches && touches.length > 0) {
                    x = touches[0].clientX;
                    y = touches[0].clientY;
                }
            } else {
                const touch = e.touches ? e.touches[0] : e;
                x = touch.clientX || touch.pageX;
                y = touch.clientY || touch.pageY;
                const canvas = document.getElementById('gameCanvas');
                if (canvas) {
                    const rect = canvas.getBoundingClientRect();
                    x -= rect.left;
                    y -= rect.top;
                }
            }
            if (x !== undefined && y !== undefined) {
                handler({ x, y });
            }
        };

        if (isWX) {
            wx.onTouchStart(wrappedHandler);
        } else {
            const canvas = document.getElementById('gameCanvas');
            if (canvas) {
                canvas.addEventListener('touchstart', wrappedHandler, { passive: false });
                canvas.addEventListener('mousedown', wrappedHandler);
            }
        }
    }

    function onHide(handler) {
        if (isWX) {
            wx.onHide(handler);
        } else {
            window.addEventListener('blur', handler);
            document.addEventListener('visibilitychange', function () {
                if (document.hidden) handler();
            });
        }
    }

    function raf(callback) {
        if (isWX) {
            wx.requestAnimationFrame(callback);
        } else {
            requestAnimationFrame(callback);
        }
    }

    function shareAppMessage(options) {
        if (isWX) {
            wx.shareAppMessage({
                title: options.title || '快来挑战我的最高分！',
                imageUrl: options.imageUrl || '',
                success: options.success || function () {},
                fail: options.fail || function () {}
            });
        } else if (navigator.share) {
            navigator.share({
                title: options.title || '极速飞鸟',
                text: '看我得了多少分！'
            }).then(options.success || function () {})
                .catch(options.fail || function () {});
        } else {
            if (options.fail) options.fail(new Error('分享不可用'));
        }
    }

    function getContext(canvas) {
        return canvas.getContext('2d');
    }

    return {
        isWX,
        getCanvas,
        getWidth,
        getHeight,
        getDevicePixelRatio,
        onTouchStart,
        onHide,
        raf,
        shareAppMessage,
        getContext
    };
})();