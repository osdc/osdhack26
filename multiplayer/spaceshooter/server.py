import asyncio
import random
import time
from pathlib import Path
from typing import Dict, Optional

import socketio
from aiohttp import web

WORLD_WIDTH = 1280
WORLD_HEIGHT = 720
PLAYER_SPEED = 5
BULLET_SPEED = 10
ENEMY_SPEED = 2
GAME_TICK_RATE = 60
ENEMY_SPAWN_RATE = 2
ROOT = Path(__file__).resolve().parent


class Player:
    def __init__(self, player_id: str, name: str, x: float = 50, y: float = 300):
        self.id = player_id
        self.name = name
        self.x = x
        self.y = y
        self.width = 32
        self.height = 32
        self.health = 100
        self.max_health = 100
        self.alive = True
        self.score = 0
        self.last_shot = 0.0
        self.input = {
            'left': False,
            'right': False,
            'up': False,
            'down': False,
            'shoot': False
        }

    def update(self):
        if not self.alive:
            return
        if self.input['left']:
            self.x = max(0, self.x - PLAYER_SPEED)
        if self.input['right']:
            self.x = min(WORLD_WIDTH - self.width, self.x + PLAYER_SPEED)
        if self.input['up']:
            self.y = max(0, self.y - PLAYER_SPEED)
        if self.input['down']:
            self.y = min(WORLD_HEIGHT - self.height, self.y + PLAYER_SPEED)

    def take_damage(self, damage: int):
        self.health = max(0, self.health - damage)
        if self.health == 0:
            self.alive = False

    def respawn(self, index: int = 0):
        self.health = self.max_health
        self.alive = True
        self.x = 50 + index * 60
        self.y = WORLD_HEIGHT // 2

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'x': self.x,
            'y': self.y,
            'width': self.width,
            'height': self.height,
            'health': self.health,
            'max_health': self.max_health,
            'alive': self.alive,
            'score': self.score
        }


class Enemy:
    def __init__(self, enemy_id: str):
        self.id = enemy_id
        self.x = WORLD_WIDTH
        self.y = random.uniform(0, WORLD_HEIGHT - 32)
        self.width = 32
        self.height = 32
        self.health = 50
        self.max_health = 50
        self.speed = ENEMY_SPEED
        self.alive = True

    def update(self):
        if self.alive:
            self.x -= self.speed

    def take_damage(self, damage: int):
        self.health = max(0, self.health - damage)
        if self.health == 0:
            self.alive = False

    def to_dict(self):
        return {
            'id': self.id,
            'x': self.x,
            'y': self.y,
            'width': self.width,
            'height': self.height,
            'health': self.health,
            'max_health': self.max_health,
            'alive': self.alive
        }


class Bullet:
    def __init__(self, bullet_id: str, x: float, y: float, player_id: str):
        self.id = bullet_id
        self.x = x
        self.y = y
        self.width = 8
        self.height = 4
        self.speed = BULLET_SPEED
        self.player_id = player_id
        self.alive = True

    def update(self):
        if not self.alive:
            return
        self.x += self.speed
        if self.x > WORLD_WIDTH:
            self.alive = False

    def to_dict(self):
        return {
            'id': self.id,
            'x': self.x,
            'y': self.y,
            'width': self.width,
            'height': self.height,
            'player_id': self.player_id,
            'alive': self.alive
        }


class GameRoom:
    def __init__(self, room_id: str):
        self.id = room_id
        self.players: Dict[str, Player] = {}
        self.enemies: Dict[str, Enemy] = {}
        self.bullets: Dict[str, Bullet] = {}
        self.last_enemy_spawn = time.time()
        self.next_enemy_id = 1
        self.next_bullet_id = 1

    def add_player(self, player_id: str, name: str) -> Player:
        player = Player(player_id, name)
        player.respawn(len(self.players))
        self.players[player_id] = player
        return player

    def remove_player(self, player_id: str):
        self.players.pop(player_id, None)

    def update_player_input(self, player_id: str, input_data: dict):
        player = self.players.get(player_id)
        if not player:
            return
        for key in player.input:
            value = input_data.get(key)
            if isinstance(value, bool):
                player.input[key] = value

    def player_shoot(self, player_id: str):
        player = self.players.get(player_id)
        if not player or not player.alive:
            return
        now = time.time()
        if now - player.last_shot < 0.1:
            return
        bullet_id = f"bullet_{self.next_bullet_id}"
        self.next_bullet_id += 1
        self.bullets[bullet_id] = Bullet(bullet_id, player.x + player.width, player.y + player.height // 2, player_id)
        player.last_shot = now

    def revive_teammate(self, player_id: str):
        requester = self.players.get(player_id)
        if not requester:
            return False, "Invalid player"
        if not requester.alive:
            return False, "You must be alive to revive"
        if requester.score < 500:
            return False, "Need 500 points to revive"
        dead_teammate = next((player for sid, player in self.players.items() if sid != player_id and not player.alive), None)
        if not dead_teammate:
            return False, "No dead teammate to revive"
        requester.score -= 500
        respawn_index = list(self.players).index(dead_teammate.id)
        dead_teammate.respawn(respawn_index)
        return True, f"Revived {dead_teammate.name}"

    def spawn_enemy(self):
        enemy_id = f"enemy_{self.next_enemy_id}"
        self.next_enemy_id += 1
        self.enemies[enemy_id] = Enemy(enemy_id)
        self.last_enemy_spawn = time.time()

    def check_collision(self, first, second) -> bool:
        return (
            first.x < second.x + second.width and
            first.x + first.width > second.x and
            first.y < second.y + second.height and
            first.y + first.height > second.y
        )

    def check_collisions(self):
        for bullet in list(self.bullets.values()):
            if not bullet.alive:
                continue
            for enemy in list(self.enemies.values()):
                if not enemy.alive:
                    continue
                if self.check_collision(bullet, enemy):
                    bullet.alive = False
                    enemy.take_damage(25)
                    if not enemy.alive:
                        shooter = self.players.get(bullet.player_id)
                        if shooter:
                            shooter.score += 25
                    break

        for player in self.players.values():
            if not player.alive:
                continue
            for enemy in list(self.enemies.values()):
                if enemy.alive and self.check_collision(player, enemy):
                    player.take_damage(25)
                    enemy.alive = False

    def update(self):
        for player in self.players.values():
            player.update()
        for bullet in list(self.bullets.values()):
            bullet.update()
            if not bullet.alive:
                del self.bullets[bullet.id]
        for enemy in list(self.enemies.values()):
            enemy.update()
            if not enemy.alive or enemy.x + enemy.width < 0:
                del self.enemies[enemy.id]
        if time.time() - self.last_enemy_spawn > ENEMY_SPAWN_RATE:
            self.spawn_enemy()
        self.check_collisions()

    def get_game_state(self):
        return {
            'players': [player.to_dict() for player in self.players.values()],
            'enemies': [enemy.to_dict() for enemy in self.enemies.values()],
            'bullets': [bullet.to_dict() for bullet in self.bullets.values()],
            'room_id': self.id,
            'worldWidth': WORLD_WIDTH,
            'worldHeight': WORLD_HEIGHT
        }


sio = socketio.AsyncServer(cors_allowed_origins="*")
app = web.Application()
sio.attach(app)
game_rooms: Dict[str, GameRoom] = {}


async def serve_index(_request):
    return web.FileResponse(ROOT / 'index.html')


async def serve_script(_request):
    return web.FileResponse(ROOT / 'script.js')


async def serve_style(_request):
    return web.FileResponse(ROOT / 'style.css')


app.router.add_get('/', serve_index)
app.router.add_get('/script.js', serve_script)
app.router.add_get('/style.css', serve_style)
app.router.add_static('/sounds/', ROOT / 'sounds')


@sio.event
async def connect(sid, _environ):
    print(f"Connected {sid}")


@sio.event
async def disconnect(sid):
    for room in list(game_rooms.values()):
        if sid in room.players:
            room.remove_player(sid)
            await sio.emit('gameState', room.get_game_state(), room=room.id)
            break


@sio.event
async def joinGame(sid, data):
    player_name = (data.get('playerName') or 'Player').strip()[:20] or 'Player'
    room_id = (data.get('roomId') or 'room1').strip() or 'room1'
    if room_id not in game_rooms:
        game_rooms[room_id] = GameRoom(room_id)
    room = game_rooms[room_id]
    room.add_player(sid, player_name)
    await sio.enter_room(sid, room_id)
    await sio.emit('joinedGame', {
        'success': True,
        'playerId': sid,
        'playerName': player_name,
        'roomId': room_id,
        'worldWidth': WORLD_WIDTH,
        'worldHeight': WORLD_HEIGHT
    }, room=sid)
    await sio.emit('gameState', room.get_game_state(), room=room_id)


@sio.event
async def playerInput(sid, data):
    for room in game_rooms.values():
        if sid in room.players:
            room.update_player_input(sid, data or {})
            break


@sio.event
async def playerShoot(sid, _data):
    for room in game_rooms.values():
        if sid in room.players:
            room.player_shoot(sid)
            break


@sio.event
async def reviveTeammate(sid, _data):
    for room in game_rooms.values():
        if sid in room.players:
            success, message = room.revive_teammate(sid)
            await sio.emit('reviveResponse', {'success': success, 'message': message}, room=sid)
            await sio.emit('gameState', room.get_game_state(), room=room.id)
            break


async def game_loop():
    while True:
        for room_id, room in list(game_rooms.items()):
            if room.players:
                room.update()
                await sio.emit('gameState', room.get_game_state(), room=room_id)
            else:
                del game_rooms[room_id]
        await asyncio.sleep(1 / GAME_TICK_RATE)


async def init_app():
    asyncio.create_task(game_loop())
    return app


if __name__ == '__main__':
    print("Space Shooter server on http://localhost:3000")
    web.run_app(init_app(), host='localhost', port=3000)
