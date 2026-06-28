#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

DEPLOY_SSH_HOST="${DEPLOY_SSH_HOST:-80.225.194.90}"
DEPLOY_SSH_USER="${DEPLOY_SSH_USER:-ubuntu}"
DEPLOY_REMOTE_DIR="${DEPLOY_REMOTE_DIR:-/home/ubuntu/osdhack26-multiplayer}"
DEPLOY_SSH_KEY_PATH="${DEPLOY_SSH_KEY_PATH:-}"

if [[ -z "$DEPLOY_SSH_KEY_PATH" ]]; then
  echo "DEPLOY_SSH_KEY_PATH is required"
  exit 1
fi

TMP_KEY="$(mktemp)"
BUNDLE_PATH="$(mktemp /tmp/osdhack26-multiplayer.XXXXXX.tgz)"
trap 'rm -f "$TMP_KEY" "$BUNDLE_PATH"' EXIT

install -m 600 "$DEPLOY_SSH_KEY_PATH" "$TMP_KEY"

cd "$ROOT_DIR"
tar \
  --exclude='__pycache__' \
  --exclude='*.pyc' \
  -czf "$BUNDLE_PATH" \
  multiplayer/Tank \
  multiplayer/pacman \
  multiplayer/pong \
  multiplayer/spaceshooter \
  multiplayer/arcade_leaderboard

scp -i "$TMP_KEY" -o StrictHostKeyChecking=accept-new "$BUNDLE_PATH" "${DEPLOY_SSH_USER}@${DEPLOY_SSH_HOST}:/tmp/osdhack26-multiplayer.tgz"

ssh -i "$TMP_KEY" -o StrictHostKeyChecking=accept-new "${DEPLOY_SSH_USER}@${DEPLOY_SSH_HOST}" \
  "DEPLOY_REMOTE_DIR='$DEPLOY_REMOTE_DIR' bash -s" <<'REMOTE_SCRIPT'
set -euo pipefail

REMOTE_DIR="${DEPLOY_REMOTE_DIR}"
PYTHON_BIN="python3"
VENV_DIR="${REMOTE_DIR}/.venv"

mkdir -p "$REMOTE_DIR"
tar -xzf /tmp/osdhack26-multiplayer.tgz -C "$REMOTE_DIR"

if [[ ! -d "$VENV_DIR" ]]; then
  "$PYTHON_BIN" -m venv "$VENV_DIR"
fi

"$VENV_DIR/bin/pip" install --upgrade pip >/dev/null
"$VENV_DIR/bin/pip" install \
  aiohttp \
  python-socketio \
  websockets >/dev/null

mkdir -p "$REMOTE_DIR/data"
touch "$REMOTE_DIR/data/pacman-scores.json"
touch "$REMOTE_DIR/data/arcade-leaderboards.json"

sudo tee /etc/systemd/system/osdhack26-pacman.service >/dev/null <<UNIT
[Unit]
Description=OSDHACK26 Pac-Man server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=${REMOTE_DIR}/multiplayer/pacman
Environment=HOST=0.0.0.0
Environment=PORT=6910
Environment=PACMAN_SCORES_PATH=${REMOTE_DIR}/data/pacman-scores.json
ExecStart=${VENV_DIR}/bin/python ${REMOTE_DIR}/multiplayer/pacman/server.py
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
UNIT

sudo tee /etc/systemd/system/osdhack26-pong.service >/dev/null <<UNIT
[Unit]
Description=OSDHACK26 Pong server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=${REMOTE_DIR}/multiplayer/pong
Environment=HOST=0.0.0.0
Environment=PORT=6920
ExecStart=${VENV_DIR}/bin/python ${REMOTE_DIR}/multiplayer/pong/server.py
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
UNIT

sudo tee /etc/systemd/system/osdhack26-spaceshooter.service >/dev/null <<UNIT
[Unit]
Description=OSDHACK26 Space Shooter server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=${REMOTE_DIR}/multiplayer/spaceshooter
Environment=HOST=0.0.0.0
Environment=PORT=6930
ExecStart=${VENV_DIR}/bin/python ${REMOTE_DIR}/multiplayer/spaceshooter/server.py
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
UNIT

sudo tee /etc/systemd/system/osdhack26-tank.service >/dev/null <<UNIT
[Unit]
Description=OSDHACK26 Tank Wars server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=${REMOTE_DIR}/multiplayer/Tank
Environment=HOST=0.0.0.0
Environment=PORT=6940
ExecStart=${VENV_DIR}/bin/python ${REMOTE_DIR}/multiplayer/Tank/server.py
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
UNIT

sudo tee /etc/systemd/system/osdhack26-leaderboard.service >/dev/null <<UNIT
[Unit]
Description=OSDHACK26 Arcade leaderboard server
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=${REMOTE_DIR}/multiplayer/arcade_leaderboard
Environment=HOST=0.0.0.0
Environment=PORT=6950
Environment=ARCADE_LEADERBOARD_DATA_PATH=${REMOTE_DIR}/data/arcade-leaderboards.json
ExecStart=${VENV_DIR}/bin/python ${REMOTE_DIR}/multiplayer/arcade_leaderboard/server.py
Restart=always
RestartSec=2

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now \
  osdhack26-pacman.service \
  osdhack26-pong.service \
  osdhack26-spaceshooter.service \
  osdhack26-tank.service \
  osdhack26-leaderboard.service

sudo systemctl restart \
  osdhack26-pacman.service \
  osdhack26-pong.service \
  osdhack26-spaceshooter.service \
  osdhack26-tank.service \
  osdhack26-leaderboard.service

sleep 2

for service in \
  osdhack26-pacman.service \
  osdhack26-pong.service \
  osdhack26-spaceshooter.service \
  osdhack26-tank.service \
  osdhack26-leaderboard.service
do
  sudo systemctl is-active --quiet "$service"
done

ss -ltn | egrep ':(6910|6920|6930|6940|6950)\b'
REMOTE_SCRIPT

echo "OSDHACK26 multiplayer services deployed to ${DEPLOY_SSH_HOST}"
