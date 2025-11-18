BRILHAH IA SHOP - Backend
=========================
Quick start (local):
```bash
python -m venv .venv
source .venv/bin/activate   # or .venv\Scripts\activate on Windows
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```
Endpoints:
- GET /health
- GET /generate_description?product=Name
