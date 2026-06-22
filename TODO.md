# TODO - Trao AI Travel Planner

- [x] Scaffold repo structure (`backend/`, `frontend/`) and basic configs.

- [x] Backend: initialize Express app, Mongo connection (Mongoose), JWT auth middleware.
- [x] Backend: implement User model, register/login controllers + routes.
- [x] Backend: implement Trip model + trip CRUD/update routes (user isolation enforced).
- [x] Backend: implement Gemini client + itinerary generation controller with JSON schema enforcement and retry/backoff.
- [x] Backend: implement endpoints for itinerary modifications (add activity, remove, regenerate day).
- [x] Creative Feature: implement Weather-Aware Packing Assistant controller (prompt Gemini, store packingList).
- [x] Frontend: scaffold Next.js app router + Tailwind; implement login/register pages.
- [x] Frontend: implement dashboard (trip list, itinerary board, packing checklist) with auth header.
- [x] Wire frontend to backend env vars; ensure protected routes.
- [x] Add .env.example files and update README.
- [x] Run local dev (backend + frontend) and verify user isolation (Mongo requires valid MONGO_URI).
- [x] Produce deployment instructions for Render/Railway + Vercel.

