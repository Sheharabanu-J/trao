# Trao AI Travel Planner - Deployment Guide

This guide details how to deploy the Trao AI Travel Planner to production using **Render** (or Railway) for the backend and **Vercel** for the frontend.

---

## 1. Prerequisites
- A GitHub repository containing the project.
- A MongoDB database (e.g. via MongoDB Atlas).
- A Google Gemini API key.
- Accounts on:
  - [Render](https://render.com/) or [Railway](https://railway.app/)
  - [Vercel](https://vercel.com/)

---

## 2. Backend Deployment (Render)

1. **Log in** to Render and click **New** -> **Web Service**.
2. **Connect** your GitHub repository.
3. Configure the following settings:
   - **Name:** `trao-backend`
   - **Root Directory:** `backend`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
4. Add the following **Environment Variables** in the service configuration under the **Environment** tab:
   - `MONGO_URI`: Your production MongoDB connection string (e.g. `mongodb+srv://...`).
   - `JWT_SECRET`: A secure random string for JWT signatures.
   - `GEMINI_API_KEY`: Your Gemini API key.
   - `CORS_ORIGIN`: Set this to your production Vercel frontend URL once deployed (e.g. `https://trao-travel.vercel.app`).
   - `PORT`: `5000` (Render will override this, but standardizing is good practice).
5. Click **Create Web Service**. Once deployed, copy your backend URL (e.g. `https://trao-backend.onrender.com`).

---

## 3. Frontend Deployment (Vercel)

1. **Log in** to Vercel and click **Add New** -> **Project**.
2. **Import** your GitHub repository.
3. In the configuration settings:
   - **Root Directory:** Edit and select `frontend`.
   - **Framework Preset:** `Next.js`
   - **Build Command:** `npm run build`
   - **Output Directory:** `.next`
4. Expand **Environment Variables** and add:
   - `NEXT_PUBLIC_API_URL`: The URL of your deployed Render backend (e.g. `https://trao-backend.onrender.com`).
5. Click **Deploy**.
6. Vercel will build and deploy the app, providing a public domain (e.g. `https://trao-travel.vercel.app`).

---

## 4. Final Verification
1. Go to your Render backend environment variables and update `CORS_ORIGIN` to match your Vercel URL.
2. Visit your Vercel URL.
3. Test the flow:
   - Register a new account.
   - Log in.
   - Generate a new itinerary.
   - Customize a day.
   - Generate a weather-aware packing checklist.
