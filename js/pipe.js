// ============================================================
// 管道实体类
// ============================================================
const Pipe = (function () {
    'use strict';

    function Pipe(x, gapY, gapHeight, groundY) {
        this.x = x;
        this.gapY = gapY;
        this.gapHeight = gapHeight;
        this.groundY = groundY;
        this.width = CONFIG.PIPE_WIDTH;
        this.passed = false;
    }

    Pipe.prototype.update = function (dt, speed) {
        this.x -= speed * dt;
    };

    Pipe.prototype.getTopRect = function () {
        return {
            x: this.x,
            y: 0,
            w: this.width,
            h: this.gapY - this.gapHeight / 2
        };
    };

    Pipe.prototype.getBottomRect = function () {
        const y = this.gapY + this.gapHeight / 2;
        return {
            x: this.x,
            y: y,
            w: this.width,
            h: this.groundY - y
        };
    };

    Pipe.prototype.isOffScreen = function () {
        return this.x + this.width < 0;
    };

    Pipe.prototype.draw = function (ctx) {
        const topRect = this.getTopRect();
        const bottomRect = this.getBottomRect();

        // 上管道
        ctx.fillStyle = CONFIG.PIPE_COLOR_MAIN;
        ctx.fillRect(topRect.x, topRect.y, topRect.w, topRect.h);
        ctx.fillStyle = CONFIG.PIPE_COLOR_CAP;
        ctx.fillRect(topRect.x - 3, topRect.h - 20, topRect.w + 6, 20);
        ctx.strokeStyle = CONFIG.PIPE_COLOR_STROKE;
        ctx.lineWidth = 2;
        ctx.strokeRect(topRect.x, topRect.y, topRect.w, topRect.h);
        ctx.strokeRect(topRect.x - 3, topRect.h - 20, topRect.w + 6, 20);

        // 下管道
        ctx.fillStyle = CONFIG.PIPE_COLOR_MAIN;
        ctx.fillRect(bottomRect.x, bottomRect.y, bottomRect.w, bottomRect.h);
        ctx.fillStyle = CONFIG.PIPE_COLOR_CAP;
        ctx.fillRect(bottomRect.x - 3, bottomRect.y, bottomRect.w + 6, 20);
        ctx.strokeRect(bottomRect.x, bottomRect.y, bottomRect.w, bottomRect.h);
        ctx.strokeRect(bottomRect.x - 3, bottomRect.y, bottomRect.w + 6, 20);
    };

    return Pipe;
})();