import asyncio
import json
import math
import os
import random
import re
import time
import uuid
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Dict, List, Optional, Tuple

import websockets
from websockets.datastructures import Headers
from websockets.http11 import Response


ROOT = Path(__file__).resolve().parent
STATIC_FILES = {
    '/': ('index.html', 'text/html; charset=utf-8'),
    '/index.html': ('index.html', 'text/html; charset=utf-8'),
    '/script.js': ('script.js', 'application/javascript; charset=utf-8'),
    '/style.css': ('style.css', 'text/css; charset=utf-8'),
}

SOUND_CONTENT_TYPES = {
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg',
}


class GameMode(Enum):
    DEATHMATCH = "deathmatch"
    TEAM = "team"
    CAPTURE_FLAG = "capture"


class TankClass(Enum):
    LIGHT = "light"
    MEDIUM = "medium"
    HEAVY = "heavy"
    ARTILLERY = "artillery"


@dataclass
class TankStats:
    speed: float
    health: int
    armor: float
    fire_rate: float
    damage: int
    size: int


TANK_CLASSES = {
    TankClass.LIGHT: TankStats(120, 75, 0.8, 0.2, 20, 12),
    TankClass.MEDIUM: TankStats(80, 100, 0.6, 0.4, 30, 15),
    TankClass.HEAVY: TankStats(50, 150, 0.4, 0.6, 35, 18),
    TankClass.ARTILLERY: TankStats(30, 80, 0.7, 1.0, 60, 16),
}


class Vector2:
    def __init__(self, x: float = 0, y: float = 0):
        self.x = x
        self.y = y

    def __add__(self, other):
        return Vector2(self.x + other.x, self.y + other.y)

    def __sub__(self, other):
        return Vector2(self.x - other.x, self.y - other.y)

    def __mul__(self, scalar: float):
        return Vector2(self.x * scalar, self.y * scalar)

    def distance_to(self, other) -> float:
        return math.hypot(self.x - other.x, self.y - other.y)


class Bullet:
    def __init__(self, x: float, y: float, angle: float, owner_id: str, damage: int):
        self.id = str(uuid.uuid4())
        self.position = Vector2(x, y)
        self.previous_position = Vector2(x, y)
        self.velocity = Vector2(math.cos(angle) * 320, math.sin(angle) * 320)
        self.owner_id = owner_id
        self.damage = damage
        self.creation_time = time.time()
        self.lifetime = 3.0

    def update(self, dt: float) -> bool:
        self.previous_position = Vector2(self.position.x, self.position.y)
        self.position = self.position + self.velocity * dt
        return time.time() - self.creation_time < self.lifetime

    def to_dict(self):
        return {'id': self.id, 'x': self.position.x, 'y': self.position.y, 'owner_id': self.owner_id}


class Obstacle:
    def __init__(self, x: float, y: float, width: float, height: float):
        self.x = x
        self.y = y
        self.width = width
        self.height = height

    def overlaps(self, other: "Obstacle") -> bool:
        return (
            self.x < other.x + other.width and
            self.x + self.width > other.x and
            self.y < other.y + other.height and
            self.y + self.height > other.y
        )

    def collides_with_circle(self, x: float, y: float, radius: float) -> bool:
        closest_x = max(self.x, min(x, self.x + self.width))
        closest_y = max(self.y, min(y, self.y + self.height))
        return math.hypot(x - closest_x, y - closest_y) <= radius

    def collides_with_segment(self, start: Vector2, end: Vector2, radius: float = 3) -> bool:
        steps = max(1, int(start.distance_to(end) / 6))
        for step in range(steps + 1):
            t = step / steps
            point_x = start.x + (end.x - start.x) * t
            point_y = start.y + (end.y - start.y) * t
            if self.collides_with_circle(point_x, point_y, radius):
                return True
        return False

    def to_dict(self):
        return {'x': self.x, 'y': self.y, 'width': self.width, 'height': self.height}


class PowerUp:
    def __init__(self, x: float, y: float, powerup_type: str):
        self.id = str(uuid.uuid4())
        self.x = x
        self.y = y
        self.type = powerup_type
        self.value = 50 if powerup_type == 'health' else 0
        self.creation_time = time.time()
        self.lifetime = 30.0

    def expired(self) -> bool:
        return time.time() - self.creation_time > self.lifetime

    def to_dict(self):
        return {'id': self.id, 'x': self.x, 'y': self.y, 'type': self.type, 'value': self.value}


class Flag:
    def __init__(self, team: str, x: float, y: float):
        self.id = str(uuid.uuid4())
        self.team = team
        self.home_x = x
        self.home_y = y
        self.x = x
        self.y = y
        self.captured = False
        self.carrier_id: Optional[str] = None
        self.drop_return_at = 0.0

    def is_home(self) -> bool:
        return self.x == self.home_x and self.y == self.home_y and self.carrier_id is None

    def reset_home(self):
        self.x = self.home_x
        self.y = self.home_y
        self.captured = False
        self.carrier_id = None
        self.drop_return_at = 0.0

    def to_dict(self):
        return {
            'id': self.id,
            'x': self.x,
            'y': self.y,
            'team': self.team,
            'captured': self.captured,
            'carrier_id': self.carrier_id
        }


class Tank:
    def __init__(self, tank_id: str, name: str, tank_class: TankClass, team: Optional[str]):
        self.id = tank_id
        self.name = name
        self.tank_class = tank_class
        self.team = team
        self.stats = TANK_CLASSES[tank_class]
        self.position = Vector2()
        self.angle = 0.0
        self.health = self.stats.health
        self.max_health = self.stats.health
        self.kills = 0
        self.deaths = 0
        self.alive = True
        self.last_fire_time = 0.0
        self.respawn_time = 0.0
        self.speed_boost_end = 0.0
        self.damage_boost_end = 0.0
        self.input_state = {'up': False, 'down': False, 'left': False, 'right': False, 'fire': False}
        self.carrying_flag: Optional[str] = None

    def current_speed(self) -> float:
        speed = self.stats.speed
        if time.time() < self.speed_boost_end:
            speed *= 1.5
        return speed

    def current_damage(self) -> int:
        damage = self.stats.damage
        if time.time() < self.damage_boost_end:
            damage = int(damage * 1.5)
        return damage

    def can_fire(self) -> bool:
        return self.alive and time.time() - self.last_fire_time >= self.stats.fire_rate

    def apply_input(self, dt: float, bounds: Tuple[int, int], obstacles: List[Obstacle]):
        if not self.alive:
            return
        if self.input_state['left']:
            self.angle -= 3.0 * dt
        if self.input_state['right']:
            self.angle += 3.0 * dt
        move = Vector2()
        speed = self.current_speed()
        if self.input_state['up']:
            move.x += math.cos(self.angle) * speed * dt
            move.y += math.sin(self.angle) * speed * dt
        if self.input_state['down']:
            move.x -= math.cos(self.angle) * speed * dt * 0.5
            move.y -= math.sin(self.angle) * speed * dt * 0.5
        new_position = self.position + move
        radius = self.stats.size
        if not any(obstacle.collides_with_circle(new_position.x, new_position.y, radius) for obstacle in obstacles):
            self.position.x = max(radius, min(bounds[0] - radius, new_position.x))
            self.position.y = max(radius, min(bounds[1] - radius, new_position.y))

    def fire(self) -> Optional[Bullet]:
        if not self.can_fire():
            return None
        self.last_fire_time = time.time()
        muzzle = self.stats.size * 2
        return Bullet(
            self.position.x + math.cos(self.angle) * muzzle,
            self.position.y + math.sin(self.angle) * muzzle,
            self.angle,
            self.id,
            self.current_damage()
        )

    def take_damage(self, damage: int):
        actual_damage = int(damage * self.stats.armor)
        self.health = max(0, self.health - actual_damage)
        if self.health == 0:
            self.alive = False
            self.deaths += 1
            self.respawn_time = time.time() + 3

    def respawn(self, x: float, y: float):
        self.position = Vector2(x, y)
        self.health = self.max_health
        self.alive = True
        self.angle = random.uniform(0, math.pi * 2)
        self.respawn_time = 0.0
        self.speed_boost_end = 0.0
        self.damage_boost_end = 0.0
        self.carrying_flag = None

    def apply_powerup(self, powerup: PowerUp):
        if powerup.type == 'health':
            self.health = min(self.max_health, self.health + powerup.value)
        elif powerup.type == 'speed':
            self.speed_boost_end = time.time() + 10
        elif powerup.type == 'damage':
            self.damage_boost_end = time.time() + 10

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'x': self.position.x,
            'y': self.position.y,
            'angle': self.angle,
            'health': self.health,
            'maxHealth': self.max_health,
            'kills': self.kills,
            'deaths': self.deaths,
            'alive': self.alive,
            'team': self.team,
            'tankClass': self.tank_class.value
        }


class GameRoom:
    def __init__(self, room_id: str, mode: GameMode):
        self.room_id = room_id
        self.game_mode = mode
        self.max_players = 8
        self.world_width = 1000
        self.world_height = 700
        self.tanks: Dict[str, Tank] = {}
        self.bullets: List[Bullet] = []
        self.obstacles: List[Obstacle] = []
        self.powerups: List[PowerUp] = []
        self.flags: List[Flag] = []
        self.teams: Dict[str, List[str]] = {'red': [], 'blue': []}
        self.team_scores: Dict[str, int] = {'red': 0, 'blue': 0}
        self.last_powerup_spawn = time.time()
        self.pending_events: List[dict] = []
        self.generate_obstacles()
        if self.game_mode == GameMode.CAPTURE_FLAG:
            self.flags = [Flag('red', 90, self.world_height / 2), Flag('blue', self.world_width - 90, self.world_height / 2)]

    def generate_obstacles(self):
        attempts = 0
        while len(self.obstacles) < 10 and attempts < 80:
            attempts += 1
            obstacle = Obstacle(
                random.randint(80, self.world_width - 160),
                random.randint(80, self.world_height - 160),
                random.randint(30, 80),
                random.randint(30, 80)
            )
            if any(obstacle.overlaps(existing) for existing in self.obstacles):
                continue
            self.obstacles.append(obstacle)

    def assign_team(self) -> Optional[str]:
        if self.game_mode == GameMode.DEATHMATCH:
            return None
        return 'red' if len(self.teams['red']) <= len(self.teams['blue']) else 'blue'

    def find_spawn_position(self, team: Optional[str] = None) -> Tuple[float, float]:
        areas = {
            'red': (80, 220, 80, self.world_height - 80),
            'blue': (self.world_width - 220, self.world_width - 80, 80, self.world_height - 80)
        }
        fallback_positions = {
            'red': (120, self.world_height / 2),
            'blue': (self.world_width - 120, self.world_height / 2),
            None: (self.world_width / 2, self.world_height / 2)
        }
        x_min, x_max, y_min, y_max = areas.get(team, (80, self.world_width - 80, 80, self.world_height - 80))
        for _ in range(80):
            x = random.randint(int(x_min), int(x_max))
            y = random.randint(int(y_min), int(y_max))
            if any(obstacle.collides_with_circle(x, y, 42) for obstacle in self.obstacles):
                continue
            if any(tank.alive and tank.position.distance_to(Vector2(x, y)) < 100 for tank in self.tanks.values()):
                continue
            return x, y
        fallback = fallback_positions.get(team, fallback_positions[None])
        return fallback

    def add_tank(self, tank_id: str, name: str, tank_class: TankClass) -> Tank:
        team = self.assign_team()
        tank = Tank(tank_id, name, tank_class, team)
        if team:
            self.teams[team].append(tank_id)
        tank.respawn(*self.find_spawn_position(team))
        self.tanks[tank_id] = tank
        return tank

    def remove_tank(self, tank_id: str):
        tank = self.tanks.get(tank_id)
        if not tank:
            return
        if tank.team and tank_id in self.teams[tank.team]:
            self.teams[tank.team].remove(tank_id)
        if tank.carrying_flag:
            self.drop_flag(tank)
        del self.tanks[tank_id]

    def drop_flag(self, tank: Tank):
        flag = next((entry for entry in self.flags if entry.team == tank.carrying_flag), None)
        if not flag:
            return
        flag.x = tank.position.x
        flag.y = tank.position.y
        flag.captured = False
        flag.carrier_id = None
        flag.drop_return_at = time.time() + 5
        tank.carrying_flag = None

    def update_flags(self):
        if self.game_mode != GameMode.CAPTURE_FLAG:
            return
        for flag in self.flags:
            if flag.carrier_id and flag.carrier_id in self.tanks:
                carrier = self.tanks[flag.carrier_id]
                if not carrier.alive:
                    self.drop_flag(carrier)
                else:
                    flag.x = carrier.position.x
                    flag.y = carrier.position.y
                    own_flag = next(entry for entry in self.flags if entry.team == carrier.team)
                    if own_flag.is_home():
                        base_x, base_y = self.find_spawn_position(carrier.team)
                        if carrier.position.distance_to(Vector2(base_x, base_y)) < 60:
                            self.team_scores[carrier.team] += 1
                            carrier.carrying_flag = None
                            flag.reset_home()
            elif flag.drop_return_at and time.time() >= flag.drop_return_at:
                flag.reset_home()

        for tank in self.tanks.values():
            if not tank.alive:
                continue
            for flag in self.flags:
                if tank.team == flag.team and not flag.is_home() and tank.position.distance_to(Vector2(flag.x, flag.y)) < 30:
                    flag.reset_home()
                if tank.team != flag.team and not flag.carrier_id and tank.position.distance_to(Vector2(flag.x, flag.y)) < 30:
                    flag.captured = True
                    flag.carrier_id = tank.id
                    flag.drop_return_at = 0
                    tank.carrying_flag = flag.team

    def fire_for_tank(self, tank: Tank):
        bullet = tank.fire()
        if bullet:
            self.bullets.append(bullet)

    def update(self, dt: float):
        for tank in self.tanks.values():
            if tank.alive:
                tank.apply_input(dt, (self.world_width, self.world_height), self.obstacles)
                if tank.input_state['fire']:
                    self.fire_for_tank(tank)
            elif tank.respawn_time and time.time() >= tank.respawn_time:
                tank.respawn(*self.find_spawn_position(tank.team))
                self.pending_events.append({'type': 'tank_respawned', 'tank_id': tank.id})

        removed_bullets = set()
        for bullet in self.bullets:
            if not bullet.update(dt):
                removed_bullets.add(bullet.id)
                continue
            if bullet.position.x < 0 or bullet.position.x > self.world_width or bullet.position.y < 0 or bullet.position.y > self.world_height:
                removed_bullets.add(bullet.id)
                continue
            if any(obstacle.collides_with_segment(bullet.previous_position, bullet.position) for obstacle in self.obstacles):
                removed_bullets.add(bullet.id)
                continue
            for tank in self.tanks.values():
                if not tank.alive or tank.id == bullet.owner_id:
                    continue
                owner = self.tanks.get(bullet.owner_id)
                if self.game_mode in (GameMode.TEAM, GameMode.CAPTURE_FLAG) and owner and owner.team and owner.team == tank.team:
                    continue
                if tank.position.distance_to(bullet.position) <= tank.stats.size + 4:
                    tank.take_damage(bullet.damage)
                    removed_bullets.add(bullet.id)
                    if not tank.alive and owner:
                        owner.kills += 1
                        self.pending_events.append({'type': 'tank_destroyed', 'tank_id': tank.id})
                        if tank.carrying_flag:
                            self.drop_flag(tank)
                    break
        self.bullets = [bullet for bullet in self.bullets if bullet.id not in removed_bullets]

        active_powerups = []
        for powerup in self.powerups:
            if powerup.expired():
                continue
            collected = False
            for tank in self.tanks.values():
                if tank.alive and tank.position.distance_to(Vector2(powerup.x, powerup.y)) < 25:
                    tank.apply_powerup(powerup)
                    self.pending_events.append({
                        'type': 'powerup_collected',
                        'tank_id': tank.id,
                        'powerup_type': powerup.type,
                        'value': powerup.value
                    })
                    collected = True
                    break
            if not collected:
                active_powerups.append(powerup)
        self.powerups = active_powerups

        if time.time() - self.last_powerup_spawn > 8 and len(self.powerups) < 4:
            spawn_x, spawn_y = self.find_spawn_position()
            self.powerups.append(PowerUp(spawn_x, spawn_y, random.choice(['health', 'speed', 'damage'])))
            self.last_powerup_spawn = time.time()

        self.update_flags()

    def get_team_info(self) -> Dict:
        return {'mode': self.game_mode.value, 'teams': self.teams, 'team_scores': self.team_scores}

    def get_leaderboard(self) -> List[Dict]:
        return [{
            'name': tank.name,
            'kills': tank.kills,
            'deaths': tank.deaths,
            'team': tank.team
        } for tank in sorted(self.tanks.values(), key=lambda tank: tank.kills, reverse=True)[:10]]

    def to_dict(self):
        return {
            'tanks': {tank_id: tank.to_dict() for tank_id, tank in self.tanks.items()},
            'bullets': [bullet.to_dict() for bullet in self.bullets],
            'obstacles': [obstacle.to_dict() for obstacle in self.obstacles],
            'powerups': [powerup.to_dict() for powerup in self.powerups],
            'flags': [flag.to_dict() for flag in self.flags],
            'teams': self.teams
        }


class Matchmaking:
    def __init__(self):
        self.rooms: Dict[str, GameRoom] = {}

    def normalize_room_code(self, room_code: Optional[str]) -> Optional[str]:
        if not isinstance(room_code, str):
            return None
        cleaned = re.sub(r'[^A-Z0-9]', '', room_code.upper().strip())
        return cleaned[:8] or None

    def find_or_create_room(self, mode: GameMode, room_code: Optional[str]) -> str:
        room_code = self.normalize_room_code(room_code)
        if room_code:
            if room_code not in self.rooms:
                self.rooms[room_code] = GameRoom(room_code, mode)
            return room_code
        for room_id, room in self.rooms.items():
            if room.game_mode == mode and len(room.tanks) < room.max_players:
                return room_id
        room_id = ''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', k=6))
        self.rooms[room_id] = GameRoom(room_id, mode)
        return room_id

    def get_room_list(self, mode: GameMode) -> List[Dict]:
        return [{
            'id': room.room_id,
            'name': f"Room {room.room_id}",
            'players': len(room.tanks),
            'maxPlayers': room.max_players,
            'mode': room.game_mode.value
        } for room in self.rooms.values() if room.game_mode == mode]

    def cleanup(self):
        empty_rooms = [room_id for room_id, room in self.rooms.items() if not room.tanks]
        for room_id in empty_rooms:
            del self.rooms[room_id]


class GameServer:
    def __init__(self):
        self.clients: Dict = {}
        self.matchmaking = Matchmaking()
        self.running = False

    def sanitize_name(self, raw_name: Optional[str]) -> str:
        if not isinstance(raw_name, str):
            return 'ANONYMOUS'
        cleaned = raw_name.strip()[:12]
        return cleaned.upper() or 'ANONYMOUS'

    def validate_input(self, input_state) -> Optional[Dict[str, bool]]:
        if not isinstance(input_state, dict):
            return None
        validated = {}
        for key in ['up', 'down', 'left', 'right', 'fire']:
            value = input_state.get(key)
            if not isinstance(value, bool):
                return None
            validated[key] = value
        return validated

    async def unregister_client(self, websocket):
        info = self.clients.pop(websocket, None)
        if not info:
            return
        room = self.matchmaking.rooms.get(info['room_id'])
        if room:
            room.remove_tank(info['tank_id'])

    async def handle_join(self, websocket, data):
        name = self.sanitize_name(data.get('name'))
        tank_class = TankClass(data.get('tankClass', 'light'))
        mode = GameMode(data.get('gameMode', 'deathmatch'))
        room_id = self.matchmaking.find_or_create_room(mode, data.get('roomCode'))
        room = self.matchmaking.rooms[room_id]
        if len(room.tanks) >= room.max_players:
            await websocket.send(json.dumps({'type': 'error', 'message': 'Room is full'}))
            return
        tank_id = str(uuid.uuid4())
        room.add_tank(tank_id, name, tank_class)
        self.clients[websocket] = {'tank_id': tank_id, 'room_id': room_id}
        await websocket.send(json.dumps({'type': 'tank_assigned', 'tank_id': tank_id, 'room_id': room_id}))

    async def handle_input(self, websocket, data):
        info = self.clients.get(websocket)
        if not info:
            return
        room = self.matchmaking.rooms.get(info['room_id'])
        if not room or info['tank_id'] not in room.tanks:
            return
        validated = self.validate_input(data.get('input'))
        if validated is None:
            return
        room.tanks[info['tank_id']].input_state = validated

    async def handle_get_rooms(self, websocket, data):
        mode = GameMode(data.get('gameMode', 'deathmatch'))
        await websocket.send(json.dumps({'type': 'room_list', 'rooms': self.matchmaking.get_room_list(mode)}))

    async def handle_leave_game(self, websocket):
        await self.unregister_client(websocket)

    async def handle_message(self, websocket, message: str):
        data = json.loads(message)
        message_type = data.get('type')
        if message_type == 'join':
            await self.handle_join(websocket, data)
        elif message_type == 'input':
            await self.handle_input(websocket, data)
        elif message_type == 'get_rooms':
            await self.handle_get_rooms(websocket, data)
        elif message_type == 'leave_game':
            await self.handle_leave_game(websocket)

    async def broadcast_room(self, room_id: str):
        room = self.matchmaking.rooms.get(room_id)
        if not room:
            return
        state_message = json.dumps({
            'type': 'game_state',
            'state': room.to_dict(),
            'leaderboard': room.get_leaderboard(),
            'teamInfo': room.get_team_info()
        })
        room_clients = [websocket for websocket, info in self.clients.items() if info['room_id'] == room_id]
        for websocket in list(room_clients):
            try:
                await websocket.send(state_message)
            except websockets.exceptions.ConnectionClosed:
                await self.unregister_client(websocket)
        while room.pending_events:
            event = room.pending_events.pop(0)
            message = json.dumps(event)
            for websocket in list(room_clients):
                try:
                    await websocket.send(message)
                except websockets.exceptions.ConnectionClosed:
                    await self.unregister_client(websocket)

    async def game_loop(self):
        last_time = time.time()
        while self.running:
            now = time.time()
            dt = min(0.05, now - last_time)
            last_time = now
            for room_id, room in list(self.matchmaking.rooms.items()):
                room.update(dt)
                await self.broadcast_room(room_id)
            self.matchmaking.cleanup()
            await asyncio.sleep(1 / 60)

    async def client_handler(self, websocket, _path=None):
        try:
            async for message in websocket:
                await self.handle_message(websocket, message)
        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            await self.unregister_client(websocket)

    async def handle_http_request(self, _connection, request):
        if request.headers.get('Upgrade', '').lower() == 'websocket':
            return None
        if request.path.startswith('/sounds/'):
            sound_path = ROOT / request.path.lstrip('/')
            if not sound_path.is_file():
                return Response(
                    404,
                    'Not Found',
                    Headers([
                        ('Content-Type', 'text/plain; charset=utf-8'),
                        ('Content-Length', '9')
                    ]),
                    b'Not Found'
                )
            body = sound_path.read_bytes()
            return Response(
                200,
                'OK',
                Headers([
                    ('Content-Type', SOUND_CONTENT_TYPES.get(sound_path.suffix.lower(), 'application/octet-stream')),
                    ('Content-Length', str(len(body))),
                    ('Cache-Control', 'no-store')
                ]),
                body
            )
        target = STATIC_FILES.get(request.path)
        if not target:
            return Response(
                404,
                'Not Found',
                Headers([
                    ('Content-Type', 'text/plain; charset=utf-8'),
                    ('Content-Length', '9')
                ]),
                b'Not Found'
            )
        filename, content_type = target
        body = (ROOT / filename).read_bytes()
        return Response(
            200,
            'OK',
            Headers([
                ('Content-Type', content_type),
                ('Content-Length', str(len(body))),
                ('Cache-Control', 'no-store')
            ]),
            body
        )

    async def start_server(self, host='localhost', port=8765):
        self.running = True
        asyncio.create_task(self.game_loop())
        async with websockets.serve(
            self.client_handler,
            host,
            port,
            process_request=self.handle_http_request
        ):
            print(f"Tank Wars server on http://{host}:{port}")
            await asyncio.Future()


if __name__ == "__main__":
    server = GameServer()
    try:
        asyncio.run(server.start_server(
            host=os.environ.get("HOST", "localhost"),
            port=int(os.environ.get("PORT", "8765"))
        ))
    except KeyboardInterrupt:
        pass
