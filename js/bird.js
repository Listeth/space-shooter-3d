// ============================================================
// 小鸟实体类
// ============================================================
const Bird = (function () {
    'use strict';

    function Bird(x, y, groundY) {
        this.x = x;
        this.y = y;
        this.groundY = groundY;
        this.radius = CONFIG.BIRD_RADIUS;
        this.vy = 0;
        this.rotation = 0;
        this.wingTime = 0;
        this.invincibleTime = 0;
        this.alive = true;
    }

    Bird.prototype.reset = function (x, y) {
        this.x = x;
        this.y = y;
        this.vy = 0;
        this.rotation = 0;
        this.invincibleTime = 0;
        this.alive = true;
    };

    Bird.prototype.jump = function () {
        this.vy = CONFIG.JUMP_VELOCITY;
    };

    Bird.prototype.setInvincible = function (time) {
        this.invincibleTime = time;
    };

    Bird.prototype.update = function (dt) {
        if (!this.alive) return;
        this.vy += CONFIG.GRAVITY * dt;
        this.y += this.vy * dt;
        this.rotation = Utils.clamp(this.vy * 0.08, -0.6, 1.2);
        this.wingTime += dt;
        if (this.invincibleTime > 0) {
            this.invincibleTime -= dt;
        }
        if (this.y + this.radius > this.groundY) {
            this.y = this.groundY - this.radius;
            this.alive = false;
        }
    };

    Bird.prototype.getCircle = function () {
        return { x: this.x, y: this.y, r: this.radius };
    };

    Bird.prototype.draw = function (ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);

        // 身体
        ctx.fillStyle = CONFIG.BIRD_COLOR_BODY;
        ctx.beginPath();
        ctx.ellipse(0, 0, 16, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = CONFIG.BIRD_COLOR_BODY_STROKE;
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // 腹部
        ctx.fillStyle = CONFIG.BIRD_COLOR_BELLY;
        ctx.beginPath();
        ctx.ellipse(0, 4, 10, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // 翅膀
        const wingAngle = Math.sin(this.wingTime * 12) * 0.5;
        ctx.save();
        ctx.translate(-6, -2);
        ctx.rotate(wingAngle);
        ctx.fillStyle = CONFIG.BIRD_COLOR_WING;
        ctx.beginPath();
        ctx.ellipse(-5, 0, 10, 6, 0.3, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 眼睛
        ctx.fillStyle = CONFIG.BIRD_COLOR_EYE;
        ctx.beginPath();
        ctx.ellipse(6, -4, 5, 5, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = CONFIG.BIRD_COLOR_PUPIL;
        ctx.beginPath();
        ctx.arc(7, -4, 2.5, 0, Math.PI * 2);
        ctx.fill();

        // 嘴巴
        ctx.fillStyle = CONFIG.BIRD_COLOR_BEAK;
        ctx.beginPath();
        ctx.moveTo(12, -2);
        ctx.lineTo(22, 0);
        ctx.lineTo(12, 3);
        ctx.closePath();
        ctx.fill();

        ctx.restore();

        // 无敌闪光
        if (this.invincibleTime > 0) {
            ctx.save();
            ctx.globalAlpha = 0.5 + Math.sin(this.wingTime * 20) * 0.3;
            ctx.fillStyle = 'rgba(255,255,255,0.3)';
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 4, 0, Math.PI * 2);
            ctx.fill();
            ctx.restore();
        }
    };

    return Bird;
})();