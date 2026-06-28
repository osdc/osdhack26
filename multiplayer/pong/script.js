const canvas = document.getElementById('pong');
const ctx = canvas.getContext('2d');
const WS_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'ws://localhost:8765'
  : 'wss://jha.jpoop.in:6920';

let gameState = {
  ballX: 400,
  ballY: 250,
  ballSpeedX: 0,
  ballSpeedY: 0,
  player1Y: 205,
  player2Y: 205,
  player1Score: 0,
  player2Score: 0,
  gameActive: false,
  player1Name: 'Player 1',
  player2Name: 'Player 2'
};

let playerNumber = 0;
let playerName = '';
let roomId = '';
let requestedRoomId = '';
let connected = false;
let demoMode = false;
let aiRequested = false;
let isSpectator = false;
let gameOverShown = false;

let ws = null;
let upPressed = false;
let downPressed = false;
const moveSpeed = 8;
const sfx = {
  paddle: makeSound('sounds/paddle.wav', 0.2, 4),
  wall: makeSound('sounds/wall.wav', 0.16, 4),
  score: makeSound('sounds/score.wav', 0.22, 2),
  win: makeSound('sounds/win.wav', 0.24, 1)
};
let previousBallSpeedX = 0;
let previousBallSpeedY = 0;
let previousScores = { player1: 0, player2: 0 };

const modalOverlay = document.getElementById('modalOverlay');
const modalMessage = document.getElementById('modalMessage');
const playAgainBtn = document.getElementById('playAgainBtn');
const quitBtn = document.getElementById('quitBtn');
const connectionStatus = document.getElementById('connectionStatus');
const instructions = document.getElementById('instructions');
const nameModal = document.getElementById('nameModal');
const nameInput = document.getElementById('nameInput');
const roomInput = document.getElementById('roomInput');
const joinGameBtn = document.getElementById('joinGameBtn');
const playAIBtn = document.getElementById('playAIBtn');
const player1NameEl = document.getElementById('player1Name');
const player2NameEl = document.getElementById('player2Name');

function makeSound(src, volume, count) {
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

function applyStateSounds(nextState) {
  if (
    previousBallSpeedX !== 0 &&
    nextState.ballSpeedX !== 0 &&
    Math.sign(previousBallSpeedX) !== Math.sign(nextState.ballSpeedX)
  ) {
    sfx.paddle();
  } else if (
    previousBallSpeedY !== 0 &&
    nextState.ballSpeedY !== 0 &&
    Math.sign(previousBallSpeedY) !== Math.sign(nextState.ballSpeedY)
  ) {
    sfx.wall();
  }
  if (nextState.player1Score !== previousScores.player1 || nextState.player2Score !== previousScores.player2) {
    sfx.score();
  }
  previousBallSpeedX = nextState.ballSpeedX;
  previousBallSpeedY = nextState.ballSpeedY;
  previousScores = { player1: nextState.player1Score, player2: nextState.player2Score };
}

setTimeout(() => {
  nameModal.style.display = 'flex';
  nameInput.focus();
}, 100);

function resetClientState() {
  gameState = {
    ballX: 400,
    ballY: 250,
    ballSpeedX: 0,
    ballSpeedY: 0,
    player1Y: 205,
    player2Y: 205,
    player1Score: 0,
    player2Score: 0,
    gameActive: false,
    player1Name: playerName || 'Player 1',
    player2Name: 'Waiting...'
  };
  playerNumber = 0;
  roomId = '';
  isSpectator = false;
  gameOverShown = false;
  hideModal();
  updatePlayerNames();
  updateScore();
  updateInstructions();
}

function connectWebSocket() {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
    ws.close();
  }

  try {
    ws = new WebSocket(WS_URL);
    connectionStatus.textContent = 'Connecting...';
    connectionStatus.className = 'connection-status';
  } catch (error) {
    fallbackToDemo();
    return;
  }

  ws.onopen = function() {
    connected = true;
    demoMode = false;
    if (demoInterval) {
      clearInterval(demoInterval);
      demoInterval = null;
    }
    ws.send(JSON.stringify({
      type: 'join',
      name: playerName,
      room_id: requestedRoomId || undefined
    }));
  };

  ws.onmessage = function(event) {
    try {
      handleServerMessage(JSON.parse(event.data));
    } catch (error) {
      console.error('Error parsing server message:', error);
    }
  };

  ws.onclose = function() {
    connected = false;
    if (!demoMode && playerName && nameModal.style.display === 'none') {
      connectionStatus.textContent = 'Disconnected - Reconnecting...';
      connectionStatus.className = 'connection-status disconnected';
      setTimeout(() => {
        if (!connected && !demoMode && playerName && nameModal.style.display === 'none') {
          connectWebSocket();
        }
      }, 3000);
    }
  };

  ws.onerror = function() {
    connected = false;
    connectionStatus.textContent = 'Connection failed - Starting demo mode';
    connectionStatus.className = 'connection-status disconnected';
    setTimeout(fallbackToDemo, 1500);
  };
}

function fallbackToDemo() {
  demoMode = true;
  connected = false;
  isSpectator = false;
  playerNumber = 1;
  roomId = 'DEMO';
  gameState.gameActive = true;
  gameState.player1Name = playerName || 'Player 1';
  gameState.player2Name = 'AI Player';
  connectionStatus.textContent = aiRequested ? 'Local AI Mode' : 'Local AI Mode - Server unavailable';
  connectionStatus.className = 'connection-status';
  updatePlayerNames();
  updateInstructions();
  startDemoMode();
}

function handleServerMessage(data) {
  switch (data.type) {
    case 'connected':
      playerNumber = data.player_number || 0;
      roomId = data.room_id || '';
      isSpectator = !!data.is_spectator;
      gameState = { ...gameState, ...(data.game_state || {}) };
      connectionStatus.textContent = isSpectator
        ? `Connected - Spectating room ${roomId}`
        : `Connected - Room ${roomId}`;
      connectionStatus.className = 'connection-status';
      updatePlayerNames();
      updateScore();
      updateInstructions();
      break;
    case 'game_state':
      applyStateSounds(data.data);
      gameState = { ...gameState, ...data.data };
      updateScore();
      updatePlayerNames();
      updateInstructions();
      if (gameState.gameActive) {
        hideModal();
        gameOverShown = false;
      } else if ((gameState.player1Score >= 10 || gameState.player2Score >= 10) && !gameOverShown) {
        const winner = gameState.player1Score >= 10 ? gameState.player1Name : gameState.player2Name;
        sfx.win();
        showModal(`Game Over! ${winner} Wins!`);
        gameOverShown = true;
      }
      break;
    case 'player_disconnected':
      connectionStatus.textContent = `Player disconnected - Waiting in room ${roomId}`;
      connectionStatus.className = 'connection-status disconnected';
      gameState.gameActive = false;
      gameOverShown = false;
      hideModal();
      updateInstructions();
      break;
    case 'error':
      connectionStatus.textContent = 'Server error - Switching to demo mode';
      connectionStatus.className = 'connection-status disconnected';
      setTimeout(fallbackToDemo, 1000);
      break;
  }
}

let demoInterval = null;

function startDemoMode() {
  if (demoInterval) {
    clearInterval(demoInterval);
  }
  demoInterval = setInterval(() => {
    if (!gameState.gameActive || !demoMode) {
      return;
    }
    const paddleCenter = gameState.player2Y + 45;
    if (gameState.ballY < paddleCenter - 10) {
      gameState.player2Y = Math.max(0, gameState.player2Y - 4);
    } else if (gameState.ballY > paddleCenter + 10) {
      gameState.player2Y = Math.min(410, gameState.player2Y + 4);
    }
    gameState.ballX += gameState.ballSpeedX;
    gameState.ballY += gameState.ballSpeedY;
    if (gameState.ballY <= 6 || gameState.ballY >= 494) {
      gameState.ballSpeedY = -gameState.ballSpeedY;
    }
    if (gameState.ballX <= 18 && gameState.ballY >= gameState.player1Y && gameState.ballY <= gameState.player1Y + 90) {
      gameState.ballSpeedX = Math.abs(gameState.ballSpeedX);
    }
    if (gameState.ballX >= 782 && gameState.ballY >= gameState.player2Y && gameState.ballY <= gameState.player2Y + 90) {
      gameState.ballSpeedX = -Math.abs(gameState.ballSpeedX);
    }
    if (gameState.ballX < 0) {
      gameState.player2Score += 1;
      resetBall();
    } else if (gameState.ballX > 800) {
      gameState.player1Score += 1;
      resetBall();
    }
    if ((gameState.player1Score >= 10 || gameState.player2Score >= 10) && !gameOverShown) {
      gameState.gameActive = false;
      const winner = gameState.player1Score >= 10 ? gameState.player1Name : gameState.player2Name;
      sfx.win();
      showModal(`Game Over! ${winner} Wins!`);
      gameOverShown = true;
    }
    updateScore();
  }, 1000 / 60);
}

function resetBall() {
  gameState.ballX = 400;
  gameState.ballY = 250;
  gameState.ballSpeedX = (Math.random() > 0.5 ? 1 : -1) * 7;
  gameState.ballSpeedY = (Math.random() - 0.5) * 8;
}

function updatePlayerNames() {
  player1NameEl.textContent = gameState.player1Name || 'Player 1';
  player2NameEl.textContent = gameState.player2Name || 'Player 2';
}

function updateInstructions() {
  if (isSpectator) {
    instructions.innerHTML = `<strong>Instructions:</strong><br>Spectating room ${roomId}<br>Share room: ${roomId}<br>First to 10 wins!`;
    return;
  }
  const controls = playerNumber === 1 ? 'W / S keys' : 'UP / DOWN keys';
  const mode = connected ? 'Multiplayer' : 'Local AI';
  instructions.innerHTML = `<strong>Instructions:</strong><br>${mode} - You are Player ${playerNumber || 1}<br>Room: ${roomId || 'AUTO'}<br>Controls: ${controls}<br>First to 10 wins!`;
}

function sendPaddleUpdate() {
  if (!connected || !ws || ws.readyState !== WebSocket.OPEN || isSpectator) {
    return;
  }
  const paddleY = playerNumber === 1 ? gameState.player1Y : gameState.player2Y;
  ws.send(JSON.stringify({ type: 'paddle_move', y: paddleY }));
}

function showModal(message) {
  modalMessage.textContent = message;
  modalOverlay.style.display = 'flex';
}

function hideModal() {
  modalOverlay.style.display = 'none';
}

playAgainBtn.onclick = function() {
  if (connected && ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'reset_game' }));
  } else if (demoMode) {
    gameState.player1Score = 0;
    gameState.player2Score = 0;
    gameState.player1Y = 205;
    gameState.player2Y = 205;
    gameState.gameActive = true;
    gameOverShown = false;
    hideModal();
    resetBall();
    updateScore();
  }
};

quitBtn.onclick = function() {
  if (demoInterval) {
    clearInterval(demoInterval);
    demoInterval = null;
  }
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: 'disconnect' }));
    ws.close();
  }
  connected = false;
  demoMode = false;
  aiRequested = false;
  playerName = '';
  requestedRoomId = '';
  resetClientState();
  nameModal.style.display = 'flex';
  nameInput.value = '';
  roomInput.value = '';
  nameInput.focus();
  connectionStatus.textContent = 'Enter your name to play';
  connectionStatus.className = 'connection-status';
};

function drawRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

function drawCircle(x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();
}

function drawText(text, x, y, color = '#fff', size = 30) {
  ctx.fillStyle = color;
  ctx.font = `${size}px Courier New, monospace`;
  ctx.textAlign = 'center';
  ctx.fillText(text, x, y);
}

function updateScore() {
  document.getElementById('score').innerHTML = `${gameState.player1Score} &nbsp; | &nbsp; ${gameState.player2Score}`;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawRect(0, 0, canvas.width, canvas.height, '#000');
  for (let i = 0; i < canvas.height; i += 28) {
    drawRect(canvas.width / 2 - 2, i, 4, 18, '#fff');
  }
  drawRect(0, gameState.player1Y, 12, 90, '#fff');
  drawRect(canvas.width - 12, gameState.player2Y, 12, 90, '#fff');
  drawCircle(gameState.ballX, gameState.ballY, 6, '#fff');
  drawText(gameState.player1Score, canvas.width / 4, 55, '#fff', 48);
  drawText(gameState.player2Score, 3 * canvas.width / 4, 55, '#fff', 48);
}

function gameLoop() {
  draw();
  requestAnimationFrame(gameLoop);
}

document.addEventListener('keydown', function(e) {
  if (isSpectator || !gameState.gameActive) {
    return;
  }
  if (playerNumber === 1) {
    if (e.key === 'w' || e.key === 'W') {
      upPressed = true;
    }
    if (e.key === 's' || e.key === 'S') {
      downPressed = true;
    }
  } else if (playerNumber === 2) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      upPressed = true;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      downPressed = true;
    }
  }
});

document.addEventListener('keyup', function(e) {
  if (playerNumber === 1) {
    if (e.key === 'w' || e.key === 'W') {
      upPressed = false;
    }
    if (e.key === 's' || e.key === 'S') {
      downPressed = false;
    }
  } else if (playerNumber === 2) {
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      upPressed = false;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      downPressed = false;
    }
  }
});

setInterval(() => {
  if (!gameState.gameActive || isSpectator) {
    return;
  }
  let moved = false;
  if (playerNumber === 1) {
    if (upPressed) {
      gameState.player1Y = Math.max(0, gameState.player1Y - moveSpeed);
      moved = true;
    }
    if (downPressed) {
      gameState.player1Y = Math.min(410, gameState.player1Y + moveSpeed);
      moved = true;
    }
  } else if (playerNumber === 2) {
    if (upPressed) {
      gameState.player2Y = Math.max(0, gameState.player2Y - moveSpeed);
      moved = true;
    }
    if (downPressed) {
      gameState.player2Y = Math.min(410, gameState.player2Y + moveSpeed);
      moved = true;
    }
  }
  if (moved && connected) {
    sendPaddleUpdate();
  }
}, 1000 / 60);

let touchStartY = null;
let touchCurrentY = null;

canvas.addEventListener('touchstart', function(e) {
  e.preventDefault();
  if (isSpectator) {
    return;
  }
  const touch = e.touches[0];
  touchStartY = touch.clientY;
  touchCurrentY = touch.clientY;
});

canvas.addEventListener('touchmove', function(e) {
  e.preventDefault();
  if (!gameState.gameActive || touchStartY === null || isSpectator) {
    return;
  }
  const rect = canvas.getBoundingClientRect();
  const scaleY = canvas.height / rect.height;
  const touch = e.touches[0];
  const deltaY = (touch.clientY - touchCurrentY) * scaleY;
  touchCurrentY = touch.clientY;
  if (playerNumber === 1) {
    gameState.player1Y = Math.max(0, Math.min(410, gameState.player1Y + deltaY));
  } else if (playerNumber === 2) {
    gameState.player2Y = Math.max(0, Math.min(410, gameState.player2Y + deltaY));
  }
  if (connected) {
    sendPaddleUpdate();
  }
});

canvas.addEventListener('touchend', function(e) {
  e.preventDefault();
  touchStartY = null;
  touchCurrentY = null;
});

joinGameBtn.onclick = function() {
  const name = nameInput.value.trim();
  if (!name) {
    alert('Please enter a name!');
    return;
  }
  if (demoInterval) {
    clearInterval(demoInterval);
    demoInterval = null;
  }
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  playerName = name;
  requestedRoomId = roomInput.value.trim().toUpperCase();
  aiRequested = false;
  nameModal.style.display = 'none';
  resetClientState();
  connectionStatus.textContent = 'Attempting to connect...';
  updatePlayerNames();
  connectWebSocket();
};

playAIBtn.onclick = function() {
  const name = nameInput.value.trim();
  if (!name) {
    alert('Please enter a name!');
    return;
  }
  if (demoInterval) {
    clearInterval(demoInterval);
    demoInterval = null;
  }
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.close();
  }
  playerName = name;
  requestedRoomId = '';
  aiRequested = true;
  nameModal.style.display = 'none';
  resetClientState();
  fallbackToDemo();
};

nameInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    joinGameBtn.click();
  }
});

roomInput.addEventListener('keypress', function(e) {
  if (e.key === 'Enter') {
    joinGameBtn.click();
  }
});

gameLoop();
