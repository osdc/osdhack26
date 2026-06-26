import asyncio
import json
from datetime import datetime, timezone
from pathlib import Path

from aiohttp import web


ROOT = Path(__file__).resolve().parent
SCORES_PATH = ROOT / "scores.json"
STATIC_FILES = {
    "/": ROOT / "index.html",
    "/index.html": ROOT / "index.html",
    "/style.css": ROOT / "style.css",
    "/script.js": ROOT / "script.js",
}


class ScoreStore:
    def __init__(self, path: Path):
        self.path = path
        self.lock = asyncio.Lock()

    async def ensure_file(self):
        if not self.path.exists():
            await self._write_data({"players": {}})
            return
        data = await self._read_data()
        if "players" not in data or not isinstance(data["players"], dict):
            await self._write_data({"players": {}})

    async def _read_data(self):
        try:
            raw = self.path.read_text(encoding="utf-8").strip()
            if not raw:
                return {"players": {}}
            data = json.loads(raw)
            if not isinstance(data, dict):
                return {"players": {}}
            players = data.get("players")
            if not isinstance(players, dict):
                data["players"] = {}
            return data
        except (json.JSONDecodeError, OSError):
            return {"players": {}}

    async def _write_data(self, data):
        temp_path = self.path.with_suffix(".tmp")
        temp_path.write_text(json.dumps(data, indent=2), encoding="utf-8")
        temp_path.replace(self.path)

    async def get_data(self):
        async with self.lock:
            return await self._read_data()

    async def update_score(self, browser_id, player_name, score, level):
        now = datetime.now(timezone.utc).isoformat()
        async with self.lock:
            data = await self._read_data()
            players = data.setdefault("players", {})
            record = players.get(browser_id, {
                "browserId": browser_id,
                "playerName": player_name,
                "score": 0,
                "bestScore": 0,
                "level": 1,
                "timestamp": now,
                "updatedAt": now,
                "recentScores": [],
            })
            record["browserId"] = browser_id
            record["playerName"] = player_name
            record["score"] = score
            record["level"] = level
            record["timestamp"] = now
            record["updatedAt"] = now
            record["bestScore"] = max(int(record.get("bestScore", 0)), score)
            history = record.get("recentScores", [])
            if not isinstance(history, list):
                history = []
            history.append({"score": score, "level": level, "timestamp": now})
            record["recentScores"] = history[-10:]
            players[browser_id] = record
            await self._write_data(data)
            return record


def sanitize_name(value):
    cleaned = "".join(ch for ch in str(value or "").strip() if ch.isalnum() or ch in " _-")
    cleaned = cleaned[:12].upper()
    return cleaned or "PLAYER"


def parse_non_negative_int(value, default=0):
    if isinstance(value, bool):
        raise ValueError
    parsed = int(value)
    if parsed < 0:
        raise ValueError
    return parsed


def rank_leaders(players):
    ranked = sorted(
        players.values(),
        key=lambda player: (int(player.get("bestScore", 0)), player.get("updatedAt", "")),
        reverse=True,
    )[:10]
    leaders = []
    for index, player in enumerate(ranked, start=1):
        leaders.append({
            "rank": index,
            "playerName": player.get("playerName", "PLAYER"),
            "bestScore": int(player.get("bestScore", 0)),
            "updatedAt": player.get("updatedAt", ""),
        })
    return leaders


async def serve_static(request):
    file_path = STATIC_FILES.get(request.path)
    if not file_path:
        raise web.HTTPNotFound()
    return web.FileResponse(file_path)


async def get_leaderboard(request):
    data = await request.app["store"].get_data()
    return web.json_response({"leaders": rank_leaders(data.get("players", {}))})


async def get_player(request):
    browser_id = request.match_info["browserId"]
    data = await request.app["store"].get_data()
    player = data.get("players", {}).get(browser_id)
    if not player:
        player = {
            "browserId": browser_id,
            "playerName": "PLAYER",
            "score": 0,
            "bestScore": 0,
            "level": 1,
            "timestamp": "",
            "updatedAt": "",
            "recentScores": [],
        }
    return web.json_response({"player": player})


async def post_score(request):
    try:
        payload = await request.json()
    except json.JSONDecodeError as error:
        raise web.HTTPBadRequest(text=str(error))

    browser_id = str(payload.get("browserId", "")).strip()
    if not browser_id:
        raise web.HTTPBadRequest(text="browserId is required")

    try:
        score = parse_non_negative_int(payload.get("score"))
        level = parse_non_negative_int(payload.get("level", 1), 1)
    except (TypeError, ValueError):
        raise web.HTTPBadRequest(text="score and level must be non-negative integers")

    player_name = sanitize_name(payload.get("playerName"))
    player = await request.app["store"].update_score(browser_id, player_name, score, level)
    data = await request.app["store"].get_data()
    return web.json_response({"player": player, "leaders": rank_leaders(data.get("players", {}))})


async def create_app():
    app = web.Application()
    store = ScoreStore(SCORES_PATH)
    await store.ensure_file()
    app["store"] = store
    app.router.add_get("/", serve_static)
    app.router.add_get("/index.html", serve_static)
    app.router.add_get("/style.css", serve_static)
    app.router.add_get("/script.js", serve_static)
    app.router.add_get("/api/leaderboard", get_leaderboard)
    app.router.add_get("/api/player/{browserId}", get_player)
    app.router.add_post("/api/score", post_score)
    app.router.add_static("/app/", ROOT / "app")
    return app


if __name__ == "__main__":
    application = asyncio.run(create_app())
    print("http://localhost:8080")
    web.run_app(application, host="localhost", port=8080)
