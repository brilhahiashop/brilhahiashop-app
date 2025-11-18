BRILHAH MOBILE FULL - Quick deploy guide
========================================

1) Backend (Render recommended):
   - Create account on Render.com
   - Create new Web Service -> Connect to this repo -> set root to /backend
   - Build Command: pip install -r requirements.txt
   - Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
   - Add env vars (STRIPE, SHOPIFY, JWT keys) in Render dashboard

2) Mobile (Expo):
   - Install Node.js, npm, eas-cli
   - cd mobile && npm install
   - Edit mobile/app.json extra.BACKEND_URL to your backend URL
   - Run locally: npm start
   - For APK: configure EAS (expo.dev) and run: eas build -p android --profile production
   - You can use the provided GitHub Actions to trigger EAS build automatically (add EAS_TOKEN secret)

3) Quick local run (backend + mobile):
   - Backend:
     python -m venv .venv
     . .venv/bin/activate (or .venv\Scripts\activate on Windows)
     pip install -r backend/requirements.txt
     uvicorn backend.main:app --reload --port 8000
   - Mobile:
     cd mobile
     npm install
     npm start
