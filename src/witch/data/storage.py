import os
import json

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), 'data')
HISTORY_FILE = os.path.join(DATA_DIR, 'history.json')
MAX_HISTORY_ITEMS = 50


def load_history():
    if not os.path.exists(HISTORY_FILE):
        return {}
    try:
        with open(HISTORY_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data if isinstance(data, dict) else {}
    except (json.JSONDecodeError, OSError):
        return {}


def save_history(history):
    os.makedirs(DATA_DIR, exist_ok=True)
    if isinstance(history, dict) and len(history) > MAX_HISTORY_ITEMS:
        sorted_items = sorted(
            history.items(),
            key=lambda kv: kv[1].get("last_watched", 0) if isinstance(kv[1], dict) else 0,
            reverse=True,
        )[:MAX_HISTORY_ITEMS]
        history = dict(sorted_items)

    tmp_file = f"{HISTORY_FILE}.tmp"
    with open(tmp_file, 'w', encoding='utf-8') as f:
        json.dump(history, f, indent=4, ensure_ascii=False)
    os.replace(tmp_file, HISTORY_FILE)

