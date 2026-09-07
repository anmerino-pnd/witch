import os
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from rich.console import Console
from witch.api.routes import router
from witch.data.storage import DATA_DIR, HISTORY_FILE

console = Console()
app = FastAPI(title="Witch Server")

# Include the API router
app.include_router(router)

# Mount static files for the frontend
static_dir = os.path.join(os.path.dirname(__file__), 'static')
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")

def run_server(port=8000):
    import uvicorn
    # Create empty cache dir if it doesn't exist
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            f.write("{}")

    console.rule("[bold purple]Witch Server Starting[/bold purple]")
    console.log(f"[green]Starting server on http://localhost:{port}[/green]")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")
