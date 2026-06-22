export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-xl text-center">
        <h1 className="text-4xl font-extrabold mb-3">Trao AI Travel Planner</h1>
        <p className="text-slate-400 mb-6">
          Generate an itinerary, estimate your budget, edit day-by-day, and get a weather-aware packing checklist.
        </p>
        <div className="flex gap-3 justify-center">
          <a className="bg-indigo-600 hover:bg-indigo-500 transition text-white px-4 py-2 rounded-lg text-sm font-semibold" href="/login">Login</a>
          <a className="bg-slate-800 hover:bg-slate-700 transition text-white px-4 py-2 rounded-lg text-sm font-semibold" href="/register">Register</a>
        </div>
      </div>
    </div>
  );
}

