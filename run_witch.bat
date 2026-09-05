@echo off
echo Starting Witch Server on http://localhost:8000/ ...
uv run python -c "import witch; witch.main()"
pause
