const canvas = document.getElementById('myCanvas');
const ctx = canvas.getContext('2d');
const restartBtn = document.getElementById('restart-btn');
ctx.imageSmoothingEnabled = false;
const sfx = {
    bounce: createSound('sounds/bounce.wav', 0.18, 4),
    brick: createSound('sounds/brick.wav', 0.2, 4),
    win: createSound('sounds/win.wav', 0.22, 1),
    gameover: createSound('sounds/gameover.wav', 0.22, 1)
};

const WORLD_WIDTH = 560;
const WORLD_HEIGHT = 640;
const borderWidth = 20;
const ballRadius = 7;
const paddleHeight = 20;
const paddleWidth = 75;
const maxBallSpeed = 7;
const LEADERBOARD_URL = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:8787'
    : 'http://jha.jpoop.in:8787';

let animationFrameId = null;
let timerId = null;
let score = 0;
let timeCount = 60;
let gameRunning = true;
let x = WORLD_WIDTH / 2;
let y = WORLD_HEIGHT - 60;
let dx = 4;
let dy = -4;
let paddleX = (WORLD_WIDTH - paddleWidth) / 2;
let rightPressed = false;
let leftPressed = false;
let bricks = [];
let collisionShapes = [];
let leaderboardSubmitted = false;

function createSound(src, volume, count) {
    const pool = [];
    for (let index = 0; index < count; index++) {
        const audio = new Audio(src);
        audio.preload = 'auto';
        audio.volume = volume;
        pool.push(audio);
    }
    let cursor = 0;
    return function() {
        const audio = pool[cursor];
        cursor = (cursor + 1) % pool.length;
        audio.currentTime = 0;
        audio.play().catch(() => {});
    };
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}

function getStoredPlayerName() {
    try {
        return localStorage.getItem('arcadePlayerName') || '';
    } catch (error) {
        return '';
    }
}

function setStoredPlayerName(name) {
    try {
        localStorage.setItem('arcadePlayerName', name);
    } catch (error) {}
}

async function submitLeaderboardScore(scoreValue) {
    if (leaderboardSubmitted || !scoreValue || scoreValue <= 0) {
        return;
    }
    let playerName = getStoredPlayerName();
    if (!playerName) {
        playerName = (window.prompt('Enter a name for the leaderboard:', 'PLAYER') || 'PLAYER').trim();
        if (!playerName) {
            playerName = 'PLAYER';
        }
        setStoredPlayerName(playerName);
    }
    leaderboardSubmitted = true;
    try {
        await fetch(`${LEADERBOARD_URL}/api/leaderboards/submit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                game: 'geebee',
                player: playerName.slice(0, 20),
                score: Math.max(0, Math.floor(scoreValue))
            })
        });
    } catch (error) {
        leaderboardSubmitted = false;
        console.warn('Leaderboard submit failed:', error);
    }
}

function getLayout() {
    const centerX = WORLD_WIDTH / 2;
    const eyeY = 190;
    const eyeOffset = 95;
    const eyeRadius = 34;
    const noseTopY = 350;
    const noseHeight = 70;
    const noseWidth = paddleHeight;
    const mouthWidth = 30;
    const mouthHeight = 10;
    const mouthY = noseTopY + 12;
    const barWidth = 100;
    const barHeight = 14;
    return {
        topWall: { x: 70, y: 0, width: WORLD_WIDTH - 140, height: borderWidth, color: '#E903BB' },
        topLeft: { x: 70, y: 0, width: borderWidth, height: 70, color: '#E903BB' },
        topRight: { x: WORLD_WIDTH - 70 - borderWidth, y: 0, width: borderWidth, height: 70, color: '#E903BB' },
        leftL1: { x: 0, y: 70, width: 70 + borderWidth, height: borderWidth, color: '#8B03E9' },
        leftL2: { x: 0, y: 70, width: borderWidth, height: 300, color: '#8B03E9' },
        rightL1: { x: WORLD_WIDTH - 70 - borderWidth, y: 70, width: 70 + borderWidth, height: borderWidth, color: '#8B03E9' },
        rightL2: { x: WORLD_WIDTH - borderWidth, y: 70, width: borderWidth, height: 300, color: '#8B03E9' },
        leftSide1: { x: borderWidth, y: 260, width: 45, height: borderWidth - 5, color: '#2941fc' },
        leftSide2: { x: borderWidth + 45, y: 260, width: borderWidth - 5, height: 80, color: '#2941fc' },
        rightSide1: { x: WORLD_WIDTH - borderWidth - 45, y: 260, width: 45, height: borderWidth - 5, color: '#2941fc' },
        rightSide2: { x: WORLD_WIDTH - borderWidth - 45 - (borderWidth - 5), y: 260, width: borderWidth - 5, height: 80, color: '#2941fc' },
        leftBottomWall: { x: 0, y: 510, width: borderWidth, height: 80, color: '#8B03E9' },
        rightBottomWall: { x: WORLD_WIDTH - borderWidth, y: 510, width: borderWidth, height: 80, color: '#8B03E9' },
        leftBottomCap: { x: 0, y: 590, width: borderWidth, height: 30, color: '#EEE' },
        rightBottomCap: { x: WORLD_WIDTH - borderWidth, y: 590, width: borderWidth, height: 30, color: '#EEE' },
        middleBar: { x: centerX - barWidth / 2, y: WORLD_HEIGHT / 2 - barHeight / 2, width: barWidth, height: barHeight, color: '#2941fc' },
        nose: { x: centerX - noseWidth / 2, y: noseTopY, width: noseWidth, height: noseHeight, color: '#FFF' },
        mouth: { x: centerX - mouthWidth / 2, y: mouthY, width: mouthWidth, height: mouthHeight, color: '#2941fc' },
        eyes: [
            { x: centerX - eyeOffset, y: eyeY, radius: eyeRadius, color: '#FF0' },
            { x: centerX + eyeOffset, y: eyeY, radius: eyeRadius, color: '#FF0' }
        ],
        leftPoly: [
            { x: 0, y: 370 }, { x: 50, y: 420 }, { x: 70, y: 420 }, { x: 20, y: 370 },
            { x: 50, y: 420 }, { x: 50, y: 460 }, { x: 70, y: 460 }, { x: 70, y: 420 },
            { x: 50, y: 460 }, { x: 30, y: 480 }, { x: 50, y: 480 }, { x: 70, y: 460 }
        ],
        rightPoly: [
            { x: WORLD_WIDTH - 20, y: 370 }, { x: WORLD_WIDTH - 70, y: 420 }, { x: WORLD_WIDTH - 50, y: 420 }, { x: WORLD_WIDTH, y: 370 },
            { x: WORLD_WIDTH - 70, y: 420 }, { x: WORLD_WIDTH - 70, y: 460 }, { x: WORLD_WIDTH - 50, y: 460 }, { x: WORLD_WIDTH - 50, y: 420 },
            { x: WORLD_WIDTH - 70, y: 460 }, { x: WORLD_WIDTH - 50, y: 480 }, { x: WORLD_WIDTH - 30, y: 480 }, { x: WORLD_WIDTH - 50, y: 460 }
        ]
    };
}

function buildBricks() {
    bricks = [];
    const brickPadding = 4;
    const brickOffsetTop = 28;
    const brickHeight = 13;
    const mainBrickWidth = 24;
    const sideBrickLength = 26;
    const topRowPattern = [7, 9, 11, 9];

    topRowPattern.forEach((count, rowIndex) => {
        const totalWidth = count * mainBrickWidth + (count - 1) * brickPadding;
        const startX = Math.round((WORLD_WIDTH - totalWidth) / 2);
        for (let column = 0; column < count; column++) {
            bricks.push({
                x: startX + column * (mainBrickWidth + brickPadding),
                y: brickOffsetTop + rowIndex * (brickHeight + brickPadding),
                width: mainBrickWidth,
                height: brickHeight,
                color: '#E903BB',
                score: 10,
                active: true
            });
        }
    });

    for (let row = 0; row < 5; row++) {
        bricks.push({
            x: 34,
            y: 98 + row * (sideBrickLength + brickPadding),
            width: brickHeight,
            height: sideBrickLength,
            color: '#2941fc',
            score: 50,
            active: true
        });
        bricks.push({
            x: WORLD_WIDTH - 47,
            y: 98 + row * (sideBrickLength + brickPadding),
            width: brickHeight,
            height: sideBrickLength,
            color: '#2941fc',
            score: 50,
            active: true
        });
    }

    [250, 274, 298].forEach(yPos => {
        bricks.push({
            x: 48,
            y: yPos,
            width: mainBrickWidth,
            height: brickHeight,
            color: '#2941fc',
            score: 50,
            active: true
        });
        bricks.push({
            x: WORLD_WIDTH - 72,
            y: yPos,
            width: mainBrickWidth,
            height: brickHeight,
            color: '#2941fc',
            score: 50,
            active: true
        });
    });
}

function updateCollisionShapes() {
    const layout = getLayout();
    collisionShapes = [
        layout.topWall, layout.topLeft, layout.topRight, layout.leftL1, layout.leftL2,
        layout.rightL1, layout.rightL2, layout.leftSide1, layout.leftSide2, layout.rightSide1,
        layout.rightSide2, layout.leftBottomWall, layout.rightBottomWall, layout.leftBottomCap,
        layout.rightBottomCap, layout.middleBar, layout.nose, layout.mouth,
        { type: 'polygon', points: layout.leftPoly, color: '#2941fc' },
        { type: 'polygon', points: layout.rightPoly, color: '#2941fc' },
        ...layout.eyes.map(eye => ({ type: 'circle', x: eye.x, y: eye.y, radius: eye.radius, color: eye.color }))
    ];
}

function drawPolygon(points, color) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let index = 1; index < points.length; index++) {
        ctx.lineTo(points[index].x, points[index].y);
    }
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
}

function drawBoard() {
    const layout = getLayout();
    Object.values(layout).forEach(shape => {
        if (Array.isArray(shape)) {
            shape.forEach(eye => {
                ctx.beginPath();
                ctx.arc(eye.x, eye.y, eye.radius, 0, Math.PI * 2);
                ctx.fillStyle = eye.color;
                ctx.shadowColor = '#f0f';
                ctx.shadowBlur = 14;
                ctx.fill();
                ctx.shadowBlur = 0;
            });
            return;
        }
        ctx.fillStyle = shape.color;
        ctx.fillRect(shape.x - 0.5, shape.y - 0.5, shape.width + 1, shape.height + 1);
    });
    drawPolygon(layout.leftPoly.slice(0, 4), '#2941fc');
    drawPolygon(layout.leftPoly.slice(4, 8), '#2941fc');
    drawPolygon(layout.leftPoly.slice(8, 12), '#2941fc');
    drawPolygon(layout.rightPoly.slice(0, 4), '#2941fc');
    drawPolygon(layout.rightPoly.slice(4, 8), '#2941fc');
    drawPolygon(layout.rightPoly.slice(8, 12), '#2941fc');
}

function drawBricks() {
    bricks.forEach(brick => {
        if (!brick.active) {
            return;
        }
        ctx.fillStyle = brick.color;
        ctx.fillRect(brick.x, brick.y, brick.width + 1, brick.height + 1);
    });
}

function drawBall() {
    ctx.beginPath();
    ctx.arc(x, y, ballRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#FF0';
    ctx.fill();
}

function drawPaddle() {
    ctx.fillStyle = '#FFF';
    ctx.fillRect(paddleX, WORLD_HEIGHT - paddleHeight - 8, paddleWidth, paddleHeight);
}

function closestPointOnRect(px, py, rect) {
    return {
        x: clamp(px, rect.x, rect.x + rect.width),
        y: clamp(py, rect.y, rect.y + rect.height)
    };
}

function pointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].x;
        const yi = polygon[i].y;
        const xj = polygon[j].x;
        const yj = polygon[j].y;
        const intersect = ((yi > point.y) !== (yj > point.y)) &&
            (point.x < (xj - xi) * (point.y - yi) / ((yj - yi) || 1) + xi);
        if (intersect) {
            inside = !inside;
        }
    }
    return inside;
}

function closestPointOnSegment(px, py, ax, ay, bx, by) {
    const abx = bx - ax;
    const aby = by - ay;
    const t = clamp(((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby || 1), 0, 1);
    return { x: ax + abx * t, y: ay + aby * t };
}

function detectCollisionAt(nextX, nextY, shape) {
    if (shape.type === 'circle') {
        const distance = Math.hypot(nextX - shape.x, nextY - shape.y);
        return distance <= ballRadius + shape.radius ? { distance, nx: nextX - shape.x, ny: nextY - shape.y } : null;
    }
    if (shape.type === 'polygon') {
        let closest = null;
        for (let index = 0; index < shape.points.length; index++) {
            const start = shape.points[index];
            const end = shape.points[(index + 1) % shape.points.length];
            const point = closestPointOnSegment(nextX, nextY, start.x, start.y, end.x, end.y);
            const distance = Math.hypot(nextX - point.x, nextY - point.y);
            if (!closest || distance < closest.distance) {
                closest = { distance, nx: nextX - point.x, ny: nextY - point.y };
            }
        }
        if (pointInPolygon({ x: nextX, y: nextY }, shape.points) || (closest && closest.distance <= ballRadius)) {
            return closest;
        }
        return null;
    }
    const point = closestPointOnRect(nextX, nextY, shape);
    const distance = Math.hypot(nextX - point.x, nextY - point.y);
    return distance <= ballRadius ? { distance, nx: nextX - point.x, ny: nextY - point.y } : null;
}

function reflectVelocity(nx, ny) {
    const length = Math.hypot(nx, ny) || 1;
    const normalX = nx / length;
    const normalY = ny / length;
    const dot = dx * normalX + dy * normalY;
    dx -= 2 * dot * normalX;
    dy -= 2 * dot * normalY;
    dx = clamp(dx, -maxBallSpeed, maxBallSpeed);
    dy = clamp(dy, -maxBallSpeed, maxBallSpeed);
}

function updateScore() {
    document.getElementById('score-display').textContent = `SCORE: ${score}`;
}

function updateTime() {
    document.getElementById('time-display').textContent = `TIME: ${timeCount}`;
}

function clearGameTimer() {
    if (timerId !== null) {
        clearInterval(timerId);
        timerId = null;
    }
}

function startTimer() {
    clearGameTimer();
    timerId = setInterval(() => {
        if (timeCount <= 0) {
            endGame(false);
            return;
        }
        timeCount -= 1;
        updateTime();
    }, 1000);
}

function endGame(win) {
    if (!gameRunning) {
        return;
    }
    gameRunning = false;
    if (win) {
        sfx.win();
    } else {
        sfx.gameover();
    }
    clearGameTimer();
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
    document.getElementById('final-score').textContent = `SCORE: ${score}`;
    document.querySelector('#game-over h2').textContent = win ? 'YOU WIN!' : 'GAME OVER';
    document.getElementById('game-over').style.display = 'block';
    submitLeaderboardScore(score);
}

function restartGame() {
    document.getElementById('game-over').style.display = 'none';
    score = 0;
    timeCount = 60;
    leaderboardSubmitted = false;
    x = WORLD_WIDTH / 2;
    y = WORLD_HEIGHT - 60;
    dx = 4;
    dy = -4;
    paddleX = (WORLD_WIDTH - paddleWidth) / 2;
    buildBricks();
    updateCollisionShapes();
    updateScore();
    updateTime();
    gameRunning = true;
    startTimer();
    startLoop();
}

function handlePointerMove(clientX) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const relativeX = (clientX - rect.left) * scaleX;
    paddleX = clamp(relativeX - paddleWidth / 2, 0, WORLD_WIDTH - paddleWidth);
}

function applyMovement() {
    if (rightPressed) {
        paddleX = clamp(paddleX + 7, 0, WORLD_WIDTH - paddleWidth);
    } else if (leftPressed) {
        paddleX = clamp(paddleX - 7, 0, WORLD_WIDTH - paddleWidth);
    }
}

function handleBrickCollisions(nextX, nextY) {
    for (const brick of bricks) {
        if (!brick.active) {
            continue;
        }
        const collision = detectCollisionAt(nextX, nextY, brick);
        if (collision) {
            brick.active = false;
            score += brick.score;
            updateScore();
            reflectVelocity(collision.nx, collision.ny);
            sfx.brick();
            return true;
        }
    }
    return false;
}

function handleStaticCollisions(nextX, nextY) {
    let bestCollision = null;
    for (const shape of collisionShapes) {
        const collision = detectCollisionAt(nextX, nextY, shape);
        if (collision && (!bestCollision || collision.distance < bestCollision.distance)) {
            bestCollision = collision;
        }
    }
    if (bestCollision) {
        reflectVelocity(bestCollision.nx, bestCollision.ny);
        sfx.bounce();
    }
}

function allBricksDestroyed() {
    return bricks.every(brick => !brick.active);
}

function rescueBallFromSidePocket(nextX, nextY) {
    const inPocketY = nextY > 486 && nextY < 590;
    if (!inPocketY) {
        return false;
    }
    if (nextX < 72) {
        x = 86;
        dx = Math.abs(dx || 4);
        dy = -Math.max(3, Math.abs(dy));
        sfx.bounce();
        return true;
    }
    if (nextX > WORLD_WIDTH - 72) {
        x = WORLD_WIDTH - 86;
        dx = -Math.abs(dx || 4);
        dy = -Math.max(3, Math.abs(dy));
        sfx.bounce();
        return true;
    }
    return false;
}

function updateBall() {
    let nextX = x + dx;
    let nextY = y + dy;
    handleBrickCollisions(nextX, nextY);
    nextX = x + dx;
    nextY = y + dy;
    handleStaticCollisions(nextX, nextY);
    nextX = x + dx;
    nextY = y + dy;

    if (rescueBallFromSidePocket(nextX, nextY)) {
        nextX = x + dx;
        nextY = y + dy;
    }

    const paddleTop = WORLD_HEIGHT - paddleHeight - 8;
    if (nextY + ballRadius >= paddleTop) {
        if (nextX >= paddleX && nextX <= paddleX + paddleWidth) {
            dy = -Math.abs(dy);
            dx += ((nextX - paddleX) / paddleWidth - 0.5) * 2;
            dx = clamp(dx, -maxBallSpeed, maxBallSpeed);
        } else if (nextY + ballRadius >= WORLD_HEIGHT) {
            endGame(false);
            return;
        }
    }

    x += dx;
    y += dy;

    if (allBricksDestroyed()) {
        endGame(true);
    }
}

function render() {
    ctx.clearRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);
    drawBoard();
    drawBricks();
    drawBall();
    drawPaddle();
}

function frame() {
    if (!gameRunning) {
        animationFrameId = null;
        return;
    }
    applyMovement();
    updateBall();
    render();
    if (gameRunning) {
        animationFrameId = requestAnimationFrame(frame);
    }
}

function startLoop() {
    if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
    }
    animationFrameId = requestAnimationFrame(frame);
}

document.addEventListener('keydown', event => {
    if (event.key === 'ArrowRight' || event.key === 'd') {
        rightPressed = true;
    } else if (event.key === 'ArrowLeft' || event.key === 'a') {
        leftPressed = true;
    }
});

document.addEventListener('keyup', event => {
    if (event.key === 'ArrowRight' || event.key === 'd') {
        rightPressed = false;
    } else if (event.key === 'ArrowLeft' || event.key === 'a') {
        leftPressed = false;
    }
});

document.addEventListener('mousemove', event => {
    handlePointerMove(event.clientX);
});

canvas.addEventListener('touchstart', event => {
    event.preventDefault();
    handlePointerMove(event.touches[0].clientX);
}, { passive: false });

canvas.addEventListener('touchmove', event => {
    event.preventDefault();
    handlePointerMove(event.touches[0].clientX);
}, { passive: false });

restartBtn.addEventListener('click', restartGame);

buildBricks();
updateCollisionShapes();
updateScore();
updateTime();
startTimer();
startLoop();
