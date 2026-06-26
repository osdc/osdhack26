import asyncio
import json
import logging
import random
import time
import uuid
from typing import Any, Dict, List, Optional

import websockets

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')


def is_finite_number(value: Any) -> bool:
    return isinstance(value, (int, float)) and value == value and value not in (float('inf'), float('-inf'))


class Player:
    def __init__(self, websocket, player_id: str, name: str):
        self.websocket = websocket
        self.player_id = player_id
        self.name = name
        self.paddle_y: float = 205
        self.score = 0


class GameRoom:
    def __init__(self, room_id: str):
        self.room_id = room_id
        self.players: Dict[int, Optional[Player]] = {1: None, 2: None}
        self.spectators: List[Player] = []
        self.ball_x = 400
        self.ball_y = 250
        self.ball_speed_x = 0.0
        self.ball_speed_y = 0.0
        self.game_active = False
        self.game_paused = False
        self.winning_score = 10
        self.ball_speed = 4
        self.max_ball_speed_x = 10
        self.paddle_speed = 8

    def get_player_count(self) -> int:
        return sum(1 for player in self.players.values() if player is not None)

    def is_full(self) -> bool:
        return all(player is not None for player in self.players.values())

    def sanitize_name(self, name: str) -> str:
        cleaned = (name or "Anonymous").strip()
        return cleaned[:20] or "Anonymous"

    def add_player(self, websocket, player_id: str, name: str) -> Optional[int]:
        player = Player(websocket, player_id, self.sanitize_name(name))
        assigned_slot = None

        if self.players[1] is None:
            self.players[1] = player
            assigned_slot = 1
        elif self.players[2] is None:
            self.players[2] = player
            assigned_slot = 2
        else:
            self.spectators.append(player)
            logging.info(f"Player {player.name} joined room {self.room_id} as spectator")
            return None

        logging.info(f"Player {player.name} joined room {self.room_id} as Player {assigned_slot}")
        if self.is_full():
            self.start_game()
        else:
            self.pause_game()
        return assigned_slot

    def remove_player(self, player_id: str) -> Optional[int]:
        for slot, player in self.players.items():
            if player and player.player_id == player_id:
                logging.info(f"Player {player.name} (Player {slot}) left room {self.room_id}")
                self.players[slot] = None
                self.pause_game()
                return slot

        self.spectators = [spectator for spectator in self.spectators if spectator.player_id != player_id]
        return None

    def is_empty(self) -> bool:
        return all(player is None for player in self.players.values()) and not self.spectators

    def reset_scores(self):
        for player in self.players.values():
            if player:
                player.score = 0

    def start_game(self):
        if not self.is_full():
            return
        self.reset_scores()
        self.reset_paddles()
        self.game_active = True
        self.game_paused = False
        self.reset_ball()
        logging.info(f"Game started in room {self.room_id}")

    def pause_game(self):
        self.game_active = False
        self.game_paused = True
        self.ball_speed_x = 0
        self.ball_speed_y = 0

    def can_reset(self, player_id: str) -> bool:
        if not any(player and player.player_id == player_id for player in self.players.values()):
            return False
        if not self.is_full():
            return True
        return not self.game_active or self.has_winner()

    def reset_game(self):
        self.reset_scores()
        self.reset_paddles()
        self.reset_ball()
        self.game_active = self.is_full()
        self.game_paused = not self.is_full()
        logging.info(f"Game reset in room {self.room_id}")

    def reset_paddles(self):
        for player in self.players.values():
            if player:
                player.paddle_y = 205

    def reset_ball(self):
        self.ball_x = 400
        self.ball_y = 250
        if self.game_active and self.is_full():
            direction = 1 if random.random() > 0.5 else -1
            self.ball_speed_x = self.ball_speed * direction
            self.ball_speed_y = random.uniform(-3, 3)
        else:
            self.ball_speed_x = 0
            self.ball_speed_y = 0

    def update_paddle(self, player_number: int, y: Any):
        if player_number not in self.players or not self.players[player_number]:
            return
        if not is_finite_number(y):
            return
        self.players[player_number].paddle_y = max(0, min(410, float(y)))

    def has_winner(self) -> bool:
        player1 = self.players[1]
        player2 = self.players[2]
        return bool(
            (player1 and player1.score >= self.winning_score) or
            (player2 and player2.score >= self.winning_score)
        )

    def update_game_state(self):
        if not self.game_active or not self.is_full():
            return

        self.ball_x += self.ball_speed_x
        self.ball_y += self.ball_speed_y

        if self.ball_y <= 6 or self.ball_y >= 494:
            self.ball_speed_y = -self.ball_speed_y
            self.ball_y = max(6, min(494, self.ball_y))

        player1 = self.players[1]
        player2 = self.players[2]
        if not player1 or not player2:
            return

        if self.ball_x <= 18 and player1.paddle_y <= self.ball_y <= player1.paddle_y + 90 and self.ball_speed_x < 0:
            self.ball_speed_x = min(abs(self.ball_speed_x) * 1.02, self.max_ball_speed_x)
            self.ball_x = 18
            hit_pos = (self.ball_y - player1.paddle_y) / 90
            self.ball_speed_y = (hit_pos - 0.5) * 8
        elif self.ball_x >= 782 and player2.paddle_y <= self.ball_y <= player2.paddle_y + 90 and self.ball_speed_x > 0:
            self.ball_speed_x = -min(abs(self.ball_speed_x) * 1.02, self.max_ball_speed_x)
            self.ball_x = 782
            hit_pos = (self.ball_y - player2.paddle_y) / 90
            self.ball_speed_y = (hit_pos - 0.5) * 8

        if self.ball_x < 0:
            player2.score += 1
            self.reset_ball()
        elif self.ball_x > 800:
            player1.score += 1
            self.reset_ball()

        if self.has_winner():
            self.game_active = False
            winner = player1.name if player1.score >= self.winning_score else player2.name
            logging.info(f"Game finished in room {self.room_id}: {winner} wins!")

    def get_game_state(self) -> dict:
        player1 = self.players[1]
        player2 = self.players[2]
        return {
            'ballX': self.ball_x,
            'ballY': self.ball_y,
            'ballSpeedX': self.ball_speed_x,
            'ballSpeedY': self.ball_speed_y,
            'player1Y': player1.paddle_y if player1 else 205,
            'player2Y': player2.paddle_y if player2 else 205,
            'player1Score': player1.score if player1 else 0,
            'player2Score': player2.score if player2 else 0,
            'player1Name': player1.name if player1 else 'Player 1',
            'player2Name': player2.name if player2 else 'Player 2',
            'gameActive': self.game_active
        }

    async def broadcast_to_all(self, message: dict):
        message_str = json.dumps(message)
        disconnected = []
        for player in list(self.players.values()) + self.spectators:
            if not player:
                continue
            try:
                await player.websocket.send(message_str)
            except (websockets.exceptions.ConnectionClosed, websockets.exceptions.ConnectionClosedError):
                disconnected.append(player.player_id)
            except Exception as error:
                logging.error(f"Error sending message to player {player.player_id}: {error}")
                disconnected.append(player.player_id)

        for player_id in disconnected:
            self.remove_player(player_id)


class GameServer:
    def __init__(self):
        self.rooms: Dict[str, GameRoom] = {}
        self.player_to_room: Dict[str, str] = {}
        self.waiting_room: Optional[str] = None

    def normalize_room_id(self, room_id: Any) -> Optional[str]:
        if not isinstance(room_id, str):
            return None
        cleaned = ''.join(ch for ch in room_id.strip().upper() if ch.isalnum())
        return cleaned[:8] or None

    def find_or_create_room(self, requested_room_id: Optional[str] = None) -> str:
        if requested_room_id:
            if requested_room_id not in self.rooms:
                self.rooms[requested_room_id] = GameRoom(requested_room_id)
                logging.info(f"Created requested room {requested_room_id}")
            return requested_room_id

        if self.waiting_room and self.waiting_room in self.rooms:
            room = self.rooms[self.waiting_room]
            if room.get_player_count() == 1:
                return self.waiting_room
            if room.get_player_count() == 0 and not room.spectators:
                del self.rooms[self.waiting_room]
                self.waiting_room = None

        for room_id, room in self.rooms.items():
            if room.get_player_count() == 1:
                return room_id

        room_id = str(uuid.uuid4())[:8].upper()
        self.rooms[room_id] = GameRoom(room_id)
        self.waiting_room = room_id
        logging.info(f"Created new room {room_id}")
        return room_id

    def cleanup_empty_rooms(self):
        empty_rooms = [room_id for room_id, room in self.rooms.items() if room.is_empty()]
        for room_id in empty_rooms:
            if room_id == self.waiting_room:
                self.waiting_room = None
            del self.rooms[room_id]
            logging.info(f"Cleaned up empty room {room_id}")

    async def notify_player_disconnected(self, room: GameRoom):
        remaining_player = next((player for player in room.players.values() if player), None)
        if remaining_player:
            await room.broadcast_to_all({
                'type': 'player_disconnected',
                'remaining_player': remaining_player.name
            })

    async def handle_client(self, websocket: Any, path: Optional[str] = None):
        player_id = str(uuid.uuid4())
        try:
            try:
                initial_message = await asyncio.wait_for(websocket.recv(), timeout=30.0)
                data = json.loads(initial_message)
            except asyncio.TimeoutError:
                await websocket.send(json.dumps({'type': 'error', 'message': 'Connection timeout'}))
                return
            except json.JSONDecodeError:
                await websocket.send(json.dumps({'type': 'error', 'message': 'Invalid message format'}))
                return

            if data.get('type') != 'join':
                await websocket.send(json.dumps({'type': 'error', 'message': 'Expected join message'}))
                return

            player_name = (data.get('name') or 'Anonymous').strip()[:20] or 'Anonymous'
            room_id = self.find_or_create_room(self.normalize_room_id(data.get('room_id')))
            room = self.rooms[room_id]
            player_number = room.add_player(websocket, player_id, player_name)
            self.player_to_room[player_id] = room_id

            if room.get_player_count() == 1:
                self.waiting_room = room_id
            elif room.get_player_count() == 2 and self.waiting_room == room_id:
                self.waiting_room = None

            await websocket.send(json.dumps({
                'type': 'connected',
                'player_number': player_number,
                'room_id': room_id,
                'players_in_room': room.get_player_count(),
                'player_name': player_name,
                'is_spectator': player_number is None,
                'game_state': room.get_game_state()
            }))

            await room.broadcast_to_all({'type': 'game_state', 'data': room.get_game_state()})

            async for message in websocket:
                try:
                    incoming = json.loads(message)
                except json.JSONDecodeError:
                    logging.warning(f"Invalid JSON from player {player_id}")
                    continue
                await self.handle_message(player_id, incoming)
        except (websockets.exceptions.ConnectionClosed, websockets.exceptions.ConnectionClosedError):
            logging.info(f"Player {player_id} disconnected")
        finally:
            if player_id in self.player_to_room:
                room_id = self.player_to_room[player_id]
                room = self.rooms.get(room_id)
                if room:
                    removed_slot = room.remove_player(player_id)
                    if removed_slot is not None:
                        await self.notify_player_disconnected(room)
                        await room.broadcast_to_all({'type': 'game_state', 'data': room.get_game_state()})
                    if room.get_player_count() == 1:
                        self.waiting_room = room_id
                del self.player_to_room[player_id]
            self.cleanup_empty_rooms()

    async def handle_message(self, player_id: str, data: dict):
        if player_id not in self.player_to_room or not isinstance(data, dict):
            return

        room_id = self.player_to_room[player_id]
        room = self.rooms.get(room_id)
        if not room:
            return

        message_type = data.get('type')
        if message_type == 'paddle_move':
            player_number = next((slot for slot, player in room.players.items() if player and player.player_id == player_id), None)
            if player_number is None:
                return
            room.update_paddle(player_number, data.get('y'))
        elif message_type == 'reset_game':
            if room.can_reset(player_id):
                room.reset_game()
                await room.broadcast_to_all({'type': 'game_state', 'data': room.get_game_state()})
        elif message_type == 'disconnect':
            player = next((player for player in list(room.players.values()) + room.spectators if player and player.player_id == player_id), None)
            if player:
                await player.websocket.close()

    async def game_loop(self):
        while True:
            try:
                for room in list(self.rooms.values()):
                    if room.game_active:
                        room.update_game_state()
                    await room.broadcast_to_all({'type': 'game_state', 'data': room.get_game_state()})
                await asyncio.sleep(1 / 60)
            except Exception as error:
                logging.error(f"Error in game loop: {error}")
                await asyncio.sleep(1 / 60)

    async def start_server(self):
        asyncio.create_task(self.game_loop())
        server = await websockets.serve(
            self.handle_client,
            "localhost",
            8765,
            ping_interval=20,
            ping_timeout=10
        )
        print("=" * 60)
        print("🏓 MULTIPLAYER PONG SERVER STARTED 🏓")
        print("=" * 60)
        print("Server: ws://localhost:8765")
        print("• Room joining and spectators enabled")
        print("• First to 10 wins")
        print("=" * 60)
        await server.wait_closed()


if __name__ == "__main__":
    server = GameServer()
    try:
        asyncio.run(server.start_server())
    except KeyboardInterrupt:
        print("🛑 Server stopped")
