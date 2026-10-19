import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from rich.console import Console
from witch.api.routes import router
from witch.data.storage import DATA_DIR, HISTORY_FILE
from witch.services.twitch import close_http_client

console = Console()


@asynccontextmanager
async def lifespan(app: FastAPI):
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            f.write("{}")
    yield
    await close_http_client()


app = FastAPI(title="Witch Server", lifespan=lifespan)

# Include the API router
app.include_router(router)

# Mount static files for the frontend
static_dir = os.path.join(os.path.dirname(__file__), 'static')
app.mount("/", StaticFiles(directory=static_dir, html=True), name="static")


def run_server(port=8000):
    import uvicorn
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(HISTORY_FILE):
        with open(HISTORY_FILE, 'w', encoding='utf-8') as f:
            f.write("{}")

    console.rule("[bold purple]Witch Server Starting[/bold purple]")
    console.log(f"[green]Starting server on http://localhost:{port}[/green]")
    uvicorn.run(app, host="0.0.0.0", port=port, log_level="warning")

