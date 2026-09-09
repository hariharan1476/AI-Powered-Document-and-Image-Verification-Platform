#!/bin/bash
PORT="${PORT:-10000}"
echo "Binding Uvicorn server to host 0.0.0.0 on port ${PORT}..."
exec uvicorn app:app --host 0.0.0.0 --port "$PORT"
