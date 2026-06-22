# Trao AI Travel Planner

Secure multi-user AI Travel Planner with day-by-day itinerary generation and a **Weather-Aware Packing Assistant**.

## Tech Stack
- **Frontend:** Next.js (App Router) + Tailwind CSS + TypeScript
- **Backend:** Node.js + Express + Mongoose (MongoDB)
- **Auth:** JWT (bcryptjs password hashing)
- **AI:** Google Gemini (Gemini 2.5 Flash) generating structured JSON

## Features
- Register + Login (JWT)
- Multi-user dashboard (strict user-isolated trip queries)
- Generate AI itinerary (days, activities, hotels, budget, initial packing list)
- Edit itinerary day activities (add activity)
- Weather-aware packing checklist generation (creative feature)

## Repo Structure
- `backend/` Express API
- `frontend/` Next.js web app

## Setup (Local)

### 1) Backend
```bash
cd backend
npm install
cp .env.example .env
```
Set:
- `MONGO_URI`
- `JWT_SECRET`
- `GEMINI_API_KEY`

Run:
```bash
npm run dev
```

### 2) Frontend
```bash
cd ../frontend
npm install
cp .env.example .env.local
```
Set:
- `NEXT_PUBLIC_API_URL=http://localhost:5000`

Run:
```bash
npm run dev
```

## Authentication & Authorization
- Login/register endpoints issue a JWT.
- `backend/middleware/auth.js` verifies JWT and populates `req.user.id`.
- All trip operations require `auth` and query MongoDB with `{ userId: req.user.id }`.

## AI Agent Design
- Gemini is instructed to return **only valid JSON** matching the expected schema.
- External calls use retry/backoff when rate-limited (429).

## Creative Feature: Weather-Aware Packing Assistant
- Uses destination + user itinerary highlights + provided season/month.
- Gemini returns a climate-aware checklist stored in `Trip.packingList`.
- Users can check/uncheck items; updates are persisted.

## Known Limitations
- Regenerate specific day and remove activity are not implemented yet (scaffolded routes can be extended).
- Pricing realism depends on the LLM output.

## Deployment (High-level)
- **Backend:** Render/Railway with environment variables (`MONGO_URI`, `JWT_SECRET`, `GEMINI_API_KEY`, `PORT`)
- **Frontend:** Vercel with `NEXT_PUBLIC_API_URL` set to backend URL

