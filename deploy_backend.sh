#!/usr/bin/env bash
echo "This script is a helper. Deploy backend to Render using their UI or CLI."
echo "If you have Render CLI installed, use: render services create --name brilhah-backend --env python --build-cmd 'pip install -r requirements.txt' --start-cmd 'uvicorn main:app --host 0.0.0.0 --port $PORT'"
