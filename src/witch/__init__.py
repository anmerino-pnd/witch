from witch.server import run_server
import os

def main() -> None:
    static_dir = os.path.join(os.path.dirname(__file__), 'static')
    os.makedirs(static_dir, exist_ok=True)
    run_server()
