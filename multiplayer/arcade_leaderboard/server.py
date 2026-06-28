import json
import os
from datetime import datetime, timezone
from pathlib import Path

from aiohttp import web

ROOT = Path(__file__).resolve().parent
DATA_FILE = Path(os.environ.get("ARCADE_LEADERBOARD_DATA_PATH", ROOT / "leaderboards.json"))
MAX_ENTRIES_PER_GAME = 10


def load_data():
    if not DATA_FILE.exists():
        return {}
    try:
        return json.loads(DATA_FILE.read_text())
    except json.JSONDecodeError:
        return {}


def save_data(data):
    DATA_FILE.write_text(json.dumps(data, indent=2))


def with_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "GET,POST,OPTIONS"
    response.headers["Access-Control-Allow-Headers"] = "Content-Type"
    return response


async def options_handler(_request):
    return with_cors(web.Response(status=204))


async def get_leaderboards(_request):
    return with_cors(web.json_response(load_data()))


async def get_game_leaderboard(request):
    data = load_data()
    return with_cors(web.json_response(data.get(request.match_info["game"], [])))


async def submit_score(request):
    try:
        payload = await request.json()
    except Exception:
        return with_cors(web.json_response({"error": "Invalid JSON"}, status=400))

    game = str(payload.get("game", "")).strip().lower()
    player = str(payload.get("player", "PLAYER")).strip()[:20] or "PLAYER"
    score = payload.get("score", 0)

    if not game or not isinstance(score, (int, float)):
        return with_cors(web.json_response({"error": "Invalid payload"}, status=400))

    data = load_data()
    entries = data.setdefault(game, [])
    entries.append({
        "player": player,
        "score": int(score),
        "timestamp": datetime.now(timezone.utc).isoformat()
    })
    entries.sort(key=lambda item: (-item["score"], item["timestamp"]))
    data[game] = entries[:MAX_ENTRIES_PER_GAME]
    save_data(data)
    return with_cors(web.json_response({"ok": True, "leaderboard": data[game]}))


app = web.Application()
app.router.add_options("/{tail:.*}", options_handler)
app.router.add_get("/api/leaderboards", get_leaderboards)
app.router.add_get("/api/leaderboards/{game}", get_game_leaderboard)
app.router.add_post("/api/leaderboards/submit", submit_score)


if __name__ == "__main__":
    host = os.environ.get("HOST", "0.0.0.0")
    port = int(os.environ.get("PORT", "8787"))
    print(f"Arcade leaderboard server running on http://{host}:{port}")
    web.run_app(app, host=host, port=port)
