const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const SERVER_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'ws://localhost:8765'
    : 'wss://jha.jpoop.in:6900';

let gameState = {
    tanks: {},
    bullets: [],
    obstacles: [],
    powerups: [],
    teams: {},
    flags: []
};

let myTankId = null;
let playerName = '';
let selectedTankClass = 'light';
let selectedGameMode = 'deathmatch';
let currentRoom = null;
let ws = null;
let connected = false;
let pendingJoinPayload = null;
let reconnectTimer = null;
let respawnInterval = null;
let collectedPowerupIds = new Set();

const tankClasses = {
    light: { name: 'LIGHT TANK', speed: 120, fireRate: 0.2, size: 12 },
    medium: { name: 'MEDIUM TANK', speed: 80, fireRate: 0.4, size: 15 },
    heavy: { name: 'HEAVY TANK', speed: 50, fireRate: 0.6, size: 18 },
    artillery: { name: 'ARTILLERY', speed: 30, fireRate: 1.0, size: 16 }
};

let keys = { up: false, down: false, left: false, right: false, space: false };

const mainMenu = document.getElementById('mainMenu');
const gameContainer = document.getElementById('gameContainer');
const nameInput = document.getElementById('nameInput');
const roomInput = document.getElementById('roomInput');
const joinBtn = document.getElementById('joinBtn');
const refreshRoomsBtn = document.getElementById('refreshRoomsBtn');
const connectionStatus = document.getElementById('connectionStatus');
const respawnModal = document.getElementById('respawnModal');
const respawnTimer = document.getElementById('respawnTimer');
const healthEl = document.getElementById('health');
const maxHealthEl = document.getElementById('maxHealth');
const ammoEl = document.getElementById('ammo');
const killsEl = document.getElementById('kills');
const deathsEl = document.getElementById('deaths');
const tankClassEl = document.getElementById('tankClass');
const leaderboardList = document.getElementById('leaderboardList');
const teamInfo = document.getElementById('teamInfo');
const gameMode = document.getElementById('gameMode');
const teamStatus = document.getElementById('teamStatus');
const roomList = document.getElementById('roomList');

nameInput.focus();

document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(element => element.classList.remove('selected'));
        btn.classList.add('selected');
        selectedGameMode = btn.dataset.mode;
        roomList.style.display = selectedGameMode === 'team' || selectedGameMode === 'capture' ? 'block' : 'none';
        if (roomList.style.display === 'block') {
            refreshRooms();
        }
    });
});

document.querySelectorAll('.tank-option').forEach(option => {
    option.addEventListener('click', () => {
        document.querySelectorAll('.tank-option').forEach(element => element.classList.remove('selected'));
        option.classList.add('selected');
        selectedTankClass = option.dataset.tank;
        tankClassEl.textContent = tankClasses[selectedTankClass].name;
    });
});

function resetLocalGameState() {
    gameState = { tanks: {}, bullets: [], obstacles: [], powerups: [], teams: {}, flags: [] };
    myTankId = null;
    currentRoom = null;
    collectedPowerupIds = new Set();
    hideRespawnModal();
}

function updateConnection(text, kind) {
    connectionStatus.textContent = text;
    connectionStatus.className = `connection-status ${kind}`;
}

function ensureSocket({ joinOnOpen = false, joinPayload = null, requestRooms = false } = {}) {
    pendingJoinPayload = joinOnOpen ? joinPayload : pendingJoinPayload;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
        if (requestRooms && ws.readyState === WebSocket.OPEN) {
            requestRoomList();
        }
        if (joinOnOpen && ws.readyState === WebSocket.OPEN && joinPayload) {
            ws.send(JSON.stringify(joinPayload));
        }
        return;
    }

    ws = new WebSocket(SERVER_URL);
    updateConnection('CONNECTING...', 'connecting');

    ws.onopen = () => {
        connected = true;
        updateConnection('CONNECTED', 'connected');
        if (requestRooms) {
            requestRoomList();
        }
        if (pendingJoinPayload) {
            ws.send(JSON.stringify(pendingJoinPayload));
            pendingJoinPayload = null;
        }
    };

    ws.onmessage = event => {
        try {
            handleServerMessage(JSON.parse(event.data));
        } catch (error) {
            console.error(error);
        }
    };

    ws.onclose = () => {
        connected = false;
        if (mainMenu.style.display === 'none' && playerName) {
            updateConnection('DISCONNECTED - RECONNECTING', 'disconnected');
            clearTimeout(reconnectTimer);
            reconnectTimer = setTimeout(() => {
                if (mainMenu.style.display === 'none' && playerName) {
                    ensureSocket({ joinOnOpen: true, joinPayload: buildJoinPayload() });
                }
            }, 2000);
        } else {
            updateConnection('DISCONNECTED', 'disconnected');
        }
    };

    ws.onerror = () => {
        updateConnection('CONNECTION FAILED', 'disconnected');
    };
}

function buildJoinPayload() {
    return {
        type: 'join',
        name: playerName,
        tankClass: selectedTankClass,
        gameMode: selectedGameMode,
        roomCode: roomInput.value.trim() || null
    };
}

function requestRoomList() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'get_rooms', gameMode: selectedGameMode }));
    }
}

function refreshRooms() {
    ensureSocket({ joinOnOpen: false, requestRooms: true });
}

function handleServerMessage(data) {
    switch (data.type) {
        case 'tank_assigned':
            myTankId = data.tank_id;
            currentRoom = data.room_id;
            mainMenu.style.display = 'none';
            gameContainer.style.display = 'block';
            updateConnection(`CONNECTED ${currentRoom}`, 'connected');
            break;
        case 'game_state':
            gameState = data.state;
            updateHUD();
            updateLeaderboard(data.leaderboard);
            updateTeamInfo(data.teamInfo);
            break;
        case 'room_list':
            renderRoomList(data.rooms || []);
            break;
        case 'tank_destroyed':
            if (data.tank_id === myTankId) {
                showRespawnModal();
            }
            break;
        case 'tank_respawned':
            if (data.tank_id === myTankId) {
                hideRespawnModal();
            }
            break;
        case 'powerup_collected':
            showPowerupEffect(data);
            break;
        case 'error':
            alert(`ERROR: ${data.message}`);
            break;
    }
}

function renderRoomList(rooms) {
    roomList.innerHTML = '';
    if (!rooms.length) {
        const item = document.createElement('div');
        item.className = 'room-item';
        item.textContent = 'NO ROOMS AVAILABLE';
        roomList.appendChild(item);
        return;
    }
    rooms.forEach(room => {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'room-item';
        button.textContent = `${room.name} (${room.players}/${room.maxPlayers}) - ${room.mode.toUpperCase()}`;
        button.addEventListener('click', () => {
            roomInput.value = room.id;
        });
        roomList.appendChild(button);
    });
}

function updateHUD() {
    const myTank = myTankId ? gameState.tanks[myTankId] : null;
    if (!myTank) {
        return;
    }
    healthEl.textContent = Math.max(0, myTank.health);
    maxHealthEl.textContent = myTank.maxHealth;
    killsEl.textContent = myTank.kills || 0;
    deathsEl.textContent = myTank.deaths || 0;
    tankClassEl.textContent = tankClasses[myTank.tankClass]?.name || 'UNKNOWN';
    const fireRate = tankClasses[myTank.tankClass]?.fireRate || 0;
    ammoEl.textContent = keys.space ? `FIRING ${fireRate.toFixed(1)}s` : 'READY';
}

function updateLeaderboard(leaderboard) {
    leaderboardList.innerHTML = '';
    (leaderboard || []).slice(0, 8).forEach((player, index) => {
        const row = document.createElement('div');
        const prefix = index === 0 ? '█' : index === 1 ? '▲' : index === 2 ? '♦' : '•';
        row.className = player.team ? `team-${player.team}` : '';
        row.textContent = `${prefix} ${player.name}: ${player.kills}`;
        leaderboardList.appendChild(row);
    });
    if (!leaderboardList.childNodes.length) {
        leaderboardList.textContent = 'NO PLAYERS';
    }
}

function updateTeamInfo(info) {
    if (!info) {
        return;
    }
    gameMode.textContent = `${info.mode.toUpperCase()} MODE`;
    if (info.mode === 'team' || info.mode === 'capture') {
        const myTank = myTankId ? gameState.tanks[myTankId] : null;
        const myTeam = myTank?.team;
        teamStatus.innerHTML = myTeam ? `TEAM: <span class="team-${myTeam}">${myTeam.toUpperCase()}</span>` : 'NO TEAM';
        if (info.team_scores) {
            teamInfo.dataset.score = `RED ${info.team_scores.red || 0} : ${info.team_scores.blue || 0} BLUE`;
        }
    } else {
        teamStatus.textContent = 'FREE FOR ALL';
    }
}

function showPowerupEffect(event) {
    const eventKey = `${event.tank_id}:${event.powerup_type}:${event.value}:${Date.now()}`;
    if (event.tank_id !== myTankId) {
        return;
    }
    const effect = document.createElement('div');
    effect.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);font-size:12px;font-family:"Press Start 2P",monospace;z-index:3000;pointer-events:none;animation:powerupFade 2s ease-out forwards;';
    if (event.powerup_type === 'health') {
        effect.textContent = `+${event.value} HEALTH`;
        effect.style.color = '#00ff00';
    } else if (event.powerup_type === 'speed') {
        effect.textContent = 'SPEED BOOST!';
        effect.style.color = '#ffff00';
    } else {
        effect.textContent = 'DAMAGE BOOST!';
        effect.style.color = '#ff8800';
    }
    document.body.appendChild(effect);
    collectedPowerupIds.add(eventKey);
    setTimeout(() => effect.remove(), 2000);
}

function showRespawnModal() {
    hideRespawnModal();
    respawnModal.style.display = 'block';
    let countdown = 3;
    respawnTimer.textContent = `RESPAWNING IN ${countdown}...`;
    respawnInterval = setInterval(() => {
        countdown = Math.max(0, countdown - 1);
        respawnTimer.textContent = `RESPAWNING IN ${countdown}...`;
    }, 1000);
}

function hideRespawnModal() {
    if (respawnInterval) {
        clearInterval(respawnInterval);
        respawnInterval = null;
    }
    respawnModal.style.display = 'none';
}

function returnToMenu() {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'leave_game' }));
        ws.close();
    }
    clearTimeout(reconnectTimer);
    connected = false;
    keys = { up: false, down: false, left: false, right: false, space: false };
    mainMenu.style.display = 'flex';
    gameContainer.style.display = 'none';
    resetLocalGameState();
}

function drawTank(tank) {
    ctx.save();
    ctx.translate(tank.x, tank.y);
    ctx.rotate(tank.angle);
    const tankClass = tankClasses[tank.tankClass] || tankClasses.light;
    const size = tankClass.size;
    ctx.fillStyle = tank.id === myTankId ? '#00ff00' : (tank.team ? getTeamColor(tank.team) : '#ff4444');
    ctx.fillRect(-size, -size * 0.6, size * 2, size * 1.2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.strokeRect(-size, -size * 0.6, size * 2, size * 1.2);
    ctx.fillStyle = '#888888';
    ctx.fillRect(size * 0.8, -2, size * 1.5, 4);
    ctx.strokeRect(size * 0.8, -2, size * 1.5, 4);
    ctx.fillStyle = '#444444';
    ctx.fillRect(-size, -size * 0.8, size * 2, 4);
    ctx.fillRect(-size, size * 0.4, size * 2, 4);
    ctx.restore();

    const healthPercent = Math.max(0, tank.health) / tank.maxHealth;
    ctx.fillStyle = '#330000';
    ctx.fillRect(tank.x - 15, tank.y - 30, 30, 6);
    ctx.fillStyle = healthPercent > 0.6 ? '#00ff00' : healthPercent > 0.3 ? '#ffff00' : '#ff0000';
    ctx.fillRect(tank.x - 15, tank.y - 30, 30 * healthPercent, 6);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(tank.x - 15, tank.y - 30, 30, 6);
    ctx.fillStyle = tank.team ? getTeamColor(tank.team) : '#00ff00';
    ctx.font = '8px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText(tank.name, tank.x, tank.y - 40);
}

function drawBullet(bullet) {
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(bullet.x - 2, bullet.y - 2, 4, 4);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(bullet.x - 2, bullet.y - 2, 4, 4);
}

function drawObstacle(obstacle) {
    ctx.fillStyle = '#666666';
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
}

function drawPowerup(powerup) {
    ctx.save();
    ctx.translate(powerup.x, powerup.y);
    ctx.fillStyle = powerup.type === 'health' ? '#00ff00' : powerup.type === 'speed' ? '#ffff00' : '#ff8800';
    ctx.fillRect(-8, -8, 16, 16);
    ctx.strokeStyle = '#ffffff';
    ctx.strokeRect(-8, -8, 16, 16);
    ctx.fillStyle = '#ffffff';
    ctx.font = '8px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText(powerup.type === 'health' ? '+' : powerup.type === 'speed' ? 'S' : '!', 0, 2);
    ctx.restore();
}

function drawFlag(flag) {
    ctx.save();
    ctx.translate(flag.x, flag.y);
    ctx.fillStyle = '#888888';
    ctx.fillRect(-2, -30, 4, 60);
    ctx.fillStyle = flag.captured ? '#666666' : getTeamColor(flag.team);
    ctx.beginPath();
    ctx.moveTo(2, -25);
    ctx.lineTo(20, -18);
    ctx.lineTo(16, -8);
    ctx.lineTo(20, 0);
    ctx.lineTo(2, -5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.restore();
}

function getTeamColor(team) {
    return team === 'red' ? '#ff4444' : team === 'blue' ? '#4444ff' : '#ffffff';
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#001100';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = 'rgba(0,255,0,0.1)';
    for (let x = 0; x < canvas.width; x += 25) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += 25) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
    gameState.obstacles.forEach(drawObstacle);
    gameState.powerups.forEach(drawPowerup);
    gameState.flags.forEach(drawFlag);
    gameState.bullets.forEach(drawBullet);
    Object.values(gameState.tanks).forEach(drawTank);
    requestAnimationFrame(render);
}

document.addEventListener('keydown', event => {
    if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
    }
    if (mainMenu.style.display !== 'none') {
        return;
    }
    if (event.code === 'ArrowUp' || event.code === 'KeyW') keys.up = true;
    if (event.code === 'ArrowDown' || event.code === 'KeyS') keys.down = true;
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') keys.left = true;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') keys.right = true;
    if (event.code === 'Space') keys.space = true;
    if (event.code === 'Escape') returnToMenu();
});

document.addEventListener('keyup', event => {
    if (event.code === 'ArrowUp' || event.code === 'KeyW') keys.up = false;
    if (event.code === 'ArrowDown' || event.code === 'KeyS') keys.down = false;
    if (event.code === 'ArrowLeft' || event.code === 'KeyA') keys.left = false;
    if (event.code === 'ArrowRight' || event.code === 'KeyD') keys.right = false;
    if (event.code === 'Space') keys.space = false;
});

joinBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) {
        alert('ENTER COMMANDER NAME!');
        return;
    }
    playerName = name.toUpperCase();
    ensureSocket({ joinOnOpen: true, joinPayload: buildJoinPayload() });
});

refreshRoomsBtn.addEventListener('click', refreshRooms);

nameInput.addEventListener('keypress', event => {
    if (event.key === 'Enter') joinBtn.click();
});

roomInput.addEventListener('keypress', event => {
    if (event.key === 'Enter') joinBtn.click();
});

setInterval(() => {
    if (!connected || !ws || ws.readyState !== WebSocket.OPEN || !myTankId || gameContainer.style.display === 'none') {
        return;
    }
    ws.send(JSON.stringify({
        type: 'input',
        input: {
            up: keys.up,
            down: keys.down,
            left: keys.left,
            right: keys.right,
            fire: keys.space
        }
    }));
}, 1000 / 60);

let touchStartX = null;
let touchStartY = null;

canvas.addEventListener('touchstart', event => {
    event.preventDefault();
    const touch = event.touches[0];
    const rect = canvas.getBoundingClientRect();
    touchStartX = touch.clientX - rect.left;
    touchStartY = touch.clientY - rect.top;
}, { passive: false });

canvas.addEventListener('touchmove', event => {
    event.preventDefault();
    if (touchStartX === null || touchStartY === null) {
        return;
    }
    const touch = event.touches[0];
    const rect = canvas.getBoundingClientRect();
    const touchX = touch.clientX - rect.left;
    const touchY = touch.clientY - rect.top;
    const deltaX = touchX - touchStartX;
    const deltaY = touchY - touchStartY;
    keys.up = keys.down = keys.left = keys.right = false;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
        if (Math.abs(deltaX) > 20) {
            keys.right = deltaX > 0;
            keys.left = deltaX < 0;
        }
    } else if (Math.abs(deltaY) > 20) {
        keys.down = deltaY > 0;
        keys.up = deltaY < 0;
    }
}, { passive: false });

canvas.addEventListener('touchend', event => {
    event.preventDefault();
    keys.up = keys.down = keys.left = keys.right = false;
    touchStartX = null;
    touchStartY = null;
}, { passive: false });

const style = document.createElement('style');
style.textContent = '@keyframes powerupFade {0% {opacity:1;transform:translate(-50%,-50%) scale(1);}50% {opacity:1;transform:translate(-50%,-60%) scale(1.2);}100% {opacity:0;transform:translate(-50%,-80%) scale(0.8);}}';
document.head.appendChild(style);

render();
