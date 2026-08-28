// ============================================================
// 渲染器（背景、地面、UI、排行榜、广告位）
// ============================================================
const Renderer = (function () {
    'use strict';

    let groundOffset = 0;

    function clear(ctx, width, height) {
        ctx.clearRect(0, 0, width, height);
    }

    function drawBackground(ctx, width, height, groundY) {
        const grad = ctx.createLinearGradient(0, 0, 0, height);
        grad.addColorStop(0, CONFIG.SKY_GRADIENT_TOP);
        grad.addColorStop(1, CONFIG.SKY_GRADIENT_BOTTOM);
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, width, height);

        // 云朵
        drawCloud(ctx, width * 0.2, height * 0.2, 1);
        drawCloud(ctx, width * 0.6, height * 0.15, 0.8);
        drawCloud(ctx, width * 0.85, height * 0.35, 0.6);
        drawCloud(ctx, width * 0.1, height * 0.5, 0.5);

        // 山丘
        ctx.fillStyle = CONFIG.HILL_COLOR;
        ctx.beginPath();
        ctx.moveTo(0, groundY);
        for (let x = 0; x <= width; x += 10) {
            const y = groundY - 40 - Math.sin(x * 0.005 + 1) * 30;
            ctx.lineTo(x, y);
        }
        ctx.lineTo(width, groundY);
        ctx.closePath();
        ctx.fill();
    }

    function drawCloud(ctx, x, y, scale) {
        ctx.fillStyle = 'rgba(255,255,255,' + CONFIG.CLOUD_ALPHA + ')';
        ctx.beginPath();
        ctx.arc(x, y, 20 * scale, 0, Math.PI * 2);
        ctx.arc(x + 20 * scale, y - 10 * scale, 15 * scale, 0, Math.PI * 2);
        ctx.arc(x + 40 * scale, y, 18 * scale, 0, Math.PI * 2);
        ctx.arc(x + 10 * scale, y + 5 * scale, 12 * scale, 0, Math.PI * 2);
        ctx.fill();
    }

    function drawGround(ctx, width, groundY, dt) {
        const groundHeight = ctx.canvas.height - groundY;
        ctx.fillStyle = CONFIG.GROUND_COLOR_BASE;
        ctx.fillRect(0, groundY, width, groundHeight);
        ctx.fillStyle = CONFIG.GROUND_COLOR_GRASS;
        ctx.fillRect(0, groundY, width, 12);

        groundOffset -= CONFIG.PIPE_SPEED * CONFIG.GROUND_STRIPE_SPEED * dt;
        if (groundOffset <= -CONFIG.GROUND_STRIPE_SPACING) groundOffset += CONFIG.GROUND_STRIPE_SPACING;

        ctx.fillStyle = CONFIG.GROUND_COLOR_STRIPE;
        for (let i = groundOffset; i < width + CONFIG.GROUND_STRIPE_SPACING; i += CONFIG.GROUND_STRIPE_SPACING) {
            ctx.fillRect(i, groundY + CONFIG.GROUND_STRIPE_OFFSET_Y, CONFIG.GROUND_STRIPE_WIDTH, 4);
        }
    }

    function drawScore(ctx, score, width, topY) {
        ctx.save();
        ctx.font = 'bold 36px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = CONFIG.UI_COLOR_SCORE_SHADOW;
        ctx.fillText(score, width / 2 + 2, topY + 2);
        ctx.fillStyle = CONFIG.UI_COLOR_SCORE;
        ctx.fillText(score, width / 2, topY);
        ctx.restore();
    }

    function drawButton(ctx, x, y, w, h, text, color) {
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(x + 8, y);
        ctx.lineTo(x + w - 8, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + 8);
        ctx.lineTo(x + w, y + h - 8);
        ctx.quadraticCurveTo(x + w, y + h, x + w - 8, y + h);
        ctx.lineTo(x + 8, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - 8);
        ctx.lineTo(x, y + 8);
        ctx.quadraticCurveTo(x, y, x + 8, y);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = CONFIG.UI_COLOR_BUTTON_BORDER;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.fillStyle = CONFIG.UI_COLOR_BUTTON_TEXT;
        ctx.font = 'bold 18px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + w / 2, y + h / 2 + 1);
        ctx.restore();
    }

    function drawReady(ctx, width, height, best) {
        ctx.save();
        ctx.fillStyle = CONFIG.UI_COLOR_READY_OVERLAY;
        ctx.fillRect(0, 0, width, height);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 42px Arial, sans-serif';
        ctx.fillStyle = CONFIG.UI_COLOR_TITLE;
        ctx.fillText('极速飞鸟', width / 2, height * 0.28);

        ctx.font = '18px Arial, sans-serif';
        ctx.fillStyle = CONFIG.UI_COLOR_HINT;
        ctx.fillText('点击屏幕 开始游戏', width / 2, height * 0.45);

        ctx.font = '16px Arial, sans-serif';
        ctx.fillStyle = CONFIG.UI_COLOR_TITLE;
        ctx.fillText('最高分: ' + best, width / 2, height * 0.55);

        ctx.font = '14px Arial, sans-serif';
        ctx.fillStyle = CONFIG.UI_COLOR_VERSION;
        ctx.fillText('v1.0 最终版', width / 2, height * 0.95);
        ctx.restore();
    }

    function drawGameOver(ctx, width, height, score, best, canRevive) {
        ctx.save();
        ctx.fillStyle = CONFIG.UI_COLOR_OVERLAY;
        ctx.fillRect(0, 0, width, height);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 36px Arial, sans-serif';
        ctx.fillStyle = CONFIG.UI_COLOR_GAMEOVER_TITLE;
        ctx.fillText('游戏结束', width / 2, height * 0.22);

        ctx.font = '22px Arial, sans-serif';
        ctx.fillStyle = CONFIG.UI_COLOR_GAMEOVER_SCORE;
        ctx.fillText('得分: ' + score, width / 2, height * 0.33);
        ctx.fillStyle = CONFIG.UI_COLOR_GAMEOVER_BEST;
        ctx.fillText('最佳: ' + best, width / 2, height * 0.40);

        const btnY = height * 0.52;
        const btnW = CONFIG.BUTTON_WIDTH;
        const btnH = CONFIG.BUTTON_HEIGHT;
        const gap = CONFIG.BUTTON_GAP;
        const totalW = btnW * 2 + gap;
        const startX = width / 2 - totalW / 2;

        drawButton(ctx, startX, btnY, btnW, btnH, '重玩', CONFIG.UI_COLOR_BUTTON_REPLAY);
        if (canRevive) {
            drawButton(ctx, startX + btnW + gap, btnY, btnW, btnH, '复活', CONFIG.UI_COLOR_BUTTON_REVIVE);
        } else {
            drawButton(ctx, startX + btnW + gap, btnY, btnW, btnH, '已用完', CONFIG.UI_COLOR_BUTTON_DISABLED);
        }
        drawButton(ctx, width / 2 - 60, btnY + btnH + 20, 120, 40, '排行榜', CONFIG.UI_COLOR_BUTTON_RANK);
        ctx.restore();
    }

    function drawRank(ctx, width, height, rankList, currentScore) {
        ctx.save();
        ctx.fillStyle = 'rgba(0,0,0,' + CONFIG.RANK_OVERLAY_ALPHA + ')';
        ctx.fillRect(0, 0, width, height);

        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = 'bold 28px Arial, sans-serif';
        ctx.fillStyle = CONFIG.UI_COLOR_RANK_TITLE;
        ctx.fillText('排行榜', width / 2, height * 0.1);

        ctx.font = '16px Arial, sans-serif';
        ctx.fillStyle = CONFIG.UI_COLOR_RANK_HEADER;
        ctx.fillText('排名', width * 0.2, height * CONFIG.RANK_HEADER_Y);
        ctx.fillText('分数', width * 0.5, height * CONFIG.RANK_HEADER_Y);
        ctx.fillText('时间', width * 0.8, height * CONFIG.RANK_HEADER_Y);

        ctx.font = '15px Arial, sans-serif';
        for (let i = 0; i < rankList.length; i++) {
            const y = height * CONFIG.RANK_START_Y + i * CONFIG.RANK_ROW_HEIGHT;
            const entry = rankList[i];
            ctx.fillStyle = (entry.score === currentScore) ? CONFIG.UI_COLOR_RANK_CURRENT : CONFIG.UI_COLOR_RANK_NORMAL;
            ctx.fillText('#' + (i + 1), width * 0.2, y);
            ctx.fillText(entry.score, width * 0.5, y);
            ctx.fillText(Utils.formatTimestamp(entry.time), width * 0.8, y);
        }

        ctx.font = '14px Arial, sans-serif';
        ctx.fillStyle = CONFIG.UI_COLOR_RANK_CLOSE;
        ctx.fillText('点击任意位置关闭', width / 2, height * CONFIG.RANK_CLOSE_Y);
        ctx.restore();
    }

    function drawBanner(ctx, width, height) {
        const bannerY = height - CONFIG.BANNER_HEIGHT;
        ctx.fillStyle = CONFIG.UI_COLOR_BANNER_BG;
        ctx.fillRect(0, bannerY, width, CONFIG.BANNER_HEIGHT);
        ctx.strokeStyle = CONFIG.UI_COLOR_BANNER_BORDER;
        ctx.lineWidth = 1;
        ctx.strokeRect(0, bannerY, width, CONFIG.BANNER_HEIGHT);
        ctx.save();
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = '12px Arial, sans-serif';
        ctx.fillStyle = CONFIG.UI_COLOR_BANNER_TEXT;
        ctx.fillText('广告位', width / 2, bannerY + CONFIG.BANNER_HEIGHT / 2);
        ctx.restore();
    }

    return {
        clear,
        drawBackground,
        drawGround,
        drawScore,
        drawButton,
        drawReady,
        drawGameOver,
        drawRank,
        drawBanner
    };
})();