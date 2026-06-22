'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type BudgetTier = 'Low' | 'Medium' | 'High';

type Activity = {
  title: string;
  description: string;
  estimatedCostUSD: number;
  timeOfDay: 'Morning' | 'Afternoon' | 'Evening';
};

type ItineraryDay = {
  dayNumber: number;
  activities: Activity[];
};

type PackingItem = {
  _id?: string;
  item: string;
  category: 'Documents' | 'Clothing' | 'Gear' | 'Other';
  isPacked: boolean;
};

type Trip = {
  _id: string;
  destination: string;
  durationDays: number;
  budgetTier: BudgetTier;
  interests: string[];
  itinerary: ItineraryDay[];
  hotels: { name: string; tier?: string; estimatedCostNightUSD?: number; rating?: string }[];
  estimatedBudget: {
    total: number;
    accommodation: number;
    food: number;
    activities: number;
    transport: number;
  };
  packingList: PackingItem[];
};

export default function DashboardPage() {
  const router = useRouter();

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [selectedTrip, setSelectedTrip] = useState<Trip | null>(null);

  // Create trip form state
  const [destination, setDestination] = useState('Tokyo');
  const [durationDays, setDurationDays] = useState(4);
  const [budgetTier, setBudgetTier] = useState<BudgetTier>('Medium');
  const [interests, setInterests] = useState('Food, Culture, Adventure');

  const [generating, setGenerating] = useState(false);

  // Day customization/regeneration states
  const [regenerateDayNum, setRegenerateDayNum] = useState<number | null>(null);
  const [regeneratePrompt, setRegeneratePrompt] = useState('');
  const [regeneratingDay, setRegeneratingDay] = useState(false);

  // Inline edit/add activity
  const [targetDay, setTargetDay] = useState(1);
  const [newActivityName, setNewActivityName] = useState('');

  const interestsArr = useMemo(() => {
    return interests
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }, [interests]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    fetchTrips();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const fetchTrips = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/trips`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setTrips(data);
        if (data.length > 0) setSelectedTrip(data[0]);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const createTrip = async () => {
    setGenerating(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/trips`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ destination, durationDays, budgetTier, interests: interestsArr }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Trip generation failed');
      }

      const trip: Trip = await res.json();
      const nextTrips = [trip, ...trips];
      setTrips(nextTrips);
      setSelectedTrip(trip);
    } catch (e) {
      console.error(e);
      alert((e as any)?.message || 'Trip generation failed');
    } finally {
      setGenerating(false);
    }
  };

  const handleAddActivity = async (dayNum: number) => {
    if (!newActivityName.trim() || !selectedTrip) return;

    const updatedItinerary = selectedTrip.itinerary.map((day) => {
      if (day.dayNumber !== dayNum) return day;
      return {
        ...day,
        activities: [
          ...day.activities,
          {
            title: newActivityName.trim(),
            description: 'Added by traveler',
            estimatedCostUSD: 0,
            timeOfDay: 'Afternoon',
          },
        ],
      };
    });

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/trips/${selectedTrip._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itinerary: updatedItinerary }),
      });

      if (!res.ok) throw new Error('Failed to update trip');
      const updatedData: Trip = await res.json();

      setSelectedTrip(updatedData);
      setTrips((prev) => prev.map((t) => (t._id === updatedData._id ? updatedData : t)));
      setNewActivityName('');
    } catch (e) {
      console.error(e);
      alert('Update failed');
    }
  };

const togglePackingItem = async (itemIdOrIndex: string, indexFallback?: number) => {
    if (!selectedTrip) return;

    const updatedPacking = selectedTrip.packingList.map((item, idx) => {
      const matchById =
        itemIdOrIndex &&
        item &&
        (item as any)._id &&
        (item as any)._id === itemIdOrIndex;
      const matchByIndex = typeof indexFallback === 'number' && idx === indexFallback;
      if (matchById || matchByIndex) return { ...item, isPacked: !item.isPacked };
      return item;
    });

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/trips/${selectedTrip._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ packingList: updatedPacking }),
      });

      if (!res.ok) throw new Error('Failed to update packing list');
      const updatedData: Trip = await res.json();
      setSelectedTrip(updatedData);
      setTrips((prev) => prev.map((t) => (t._id === updatedData._id ? updatedData : t)));
    } catch (e) {
      console.error(e);
      alert('Packing update failed');
    }
  };

  const generatePacking = async () => {
    if (!selectedTrip) return;
    const seasonOrMonth = prompt('Enter season or month (e.g., June / Winter / Monsoon):', 'June');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/trips/${selectedTrip._id}/packing`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ seasonOrMonth }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Packing generation failed');
      }

      const updatedData: Trip = await res.json();
      setSelectedTrip(updatedData);
      setTrips((prev) => prev.map((t) => (t._id === updatedData._id ? updatedData : t)));
    } catch (e) {
      console.error(e);
      alert((e as any)?.message || 'Packing generation failed');
    }
  };

  const handleRemoveActivity = async (dayNum: number, activityIndex: number) => {
    if (!selectedTrip) return;

    const updatedItinerary = selectedTrip.itinerary.map((day) => {
      if (day.dayNumber !== dayNum) return day;
      return {
        ...day,
        activities: day.activities.filter((_, idx) => idx !== activityIndex),
      };
    });

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/trips/${selectedTrip._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ itinerary: updatedItinerary }),
      });

      if (!res.ok) throw new Error('Failed to update trip');
      const updatedData: Trip = await res.json();

      setSelectedTrip(updatedData);
      setTrips((prev) => prev.map((t) => (t._id === updatedData._id ? updatedData : t)));
    } catch (e) {
      console.error(e);
      alert('Delete activity failed');
    }
  };

  const handleRegenerateDay = async (dayNum: number) => {
    if (!selectedTrip || regeneratingDay) return;
    setRegeneratingDay(true);

    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/api/trips/${selectedTrip._id}/regenerate-day`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ dayNumber: dayNum, prompt: regeneratePrompt }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Regeneration failed');
      }

      const updatedData: Trip = await res.json();
      setSelectedTrip(updatedData);
      setTrips((prev) => prev.map((t) => (t._id === updatedData._id ? updatedData : t)));
      setRegeneratePrompt('');
      setRegenerateDayNum(null);
    } catch (e) {
      console.error(e);
      alert((e as any)?.message || 'Failed to regenerate day');
    } finally {
      setRegeneratingDay(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-slate-900 text-white">
        <p className="text-xl animate-pulse">Loading secure user vault...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <header className="max-w-7xl mx-auto flex justify-between items-center border-b border-slate-800 pb-5 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
            AI Travel Dashboard
          </h1>
          <p className="text-sm text-slate-400">User Data Enclave Connected</p>
        </div>
        <button
          onClick={() => {
            localStorage.removeItem('token');
            router.push('/login');
          }}
          className="bg-red-500 hover:bg-red-600 transition text-white px-4 py-2 rounded-lg text-sm"
        >
          Sign Out
        </button>
      </header>

      <main className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column: trips + budgets + create */}
        <div className="space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">Your Active Trips</h2>
            {trips.length === 0 ? (
              <p className="text-slate-500">No itineraries found. Create one to begin!</p>
            ) : (
              <div className="space-y-3">
                {trips.map((trip) => (
                  <button
                    key={trip._id}
                    onClick={() => setSelectedTrip(trip)}
                    className={`w-full text-left p-4 rounded-xl transition ${
                      selectedTrip?._id === trip._id
                        ? 'bg-blue-600 border border-blue-500 text-white'
                        : 'bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    <p className="font-bold">{trip.destination}</p>
                    <p className="text-xs opacity-80">
                      {trip.durationDays} Days • {trip.budgetTier} Budget
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <h2 className="text-lg font-bold mb-4">Create a Trip</h2>
            <div className="space-y-3">
              <input
                className="w-full bg-slate-950 border border-slate-800 rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-indigo-500"
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Destination"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-indigo-500"
                  value={durationDays}
                  onChange={(e) => setDurationDays(parseInt(e.target.value || '0', 10))}
                  type="number"
                  min={1}
                  max={30}
                />
                <select
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-indigo-500"
                  value={budgetTier}
                  onChange={(e) => setBudgetTier(e.target.value as BudgetTier)}
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                </select>
              </div>
              <input
                className="w-full bg-slate-950 border border-slate-800 rounded-lg text-sm px-3 py-2 focus:outline-none focus:border-indigo-500"
                value={interests}
                onChange={(e) => setInterests(e.target.value)}
                placeholder="Interests (comma-separated)"
              />
              <button
                onClick={createTrip}
                disabled={generating}
                className="w-full bg-indigo-600 hover:bg-indigo-500 transition disabled:opacity-50 text-white rounded-lg px-4 py-2 font-semibold"
              >
                {generating ? 'Generating...' : 'Generate Trip'}
              </button>
            </div>
          </div>

          {selectedTrip && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <h2 className="text-lg font-bold mb-4">Financial Cost Ledger</h2>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Lodging & Accommodations:</span>
                  <span className="font-semibold">${selectedTrip.estimatedBudget.accommodation}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Culinary & Dining:</span>
                  <span className="font-semibold">${selectedTrip.estimatedBudget.food}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Activities & Sightseeing:</span>
                  <span className="font-semibold">${selectedTrip.estimatedBudget.activities}</span>
                </div>
                <div className="flex justify-between text-sm border-t border-slate-800 pt-3 text-white font-bold">
                  <span>Grand Total Estimated Budget:</span>
                  <span>${selectedTrip.estimatedBudget.total}</span>
                </div>
              </div>
            </div>
          )}

          {selectedTrip && selectedTrip.hotels && selectedTrip.hotels.length > 0 && (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl backdrop-blur-md bg-slate-900/90 animate-fadeIn">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                <span>🏨</span> Recommended Hotels
              </h2>
              <div className="space-y-3">
                {selectedTrip.hotels.map((hotel, idx) => (
                  <div key={idx} className="bg-slate-950 border border-slate-800/40 p-3.5 rounded-xl hover:border-slate-700/60 transition duration-200">
                    <p className="font-semibold text-white text-sm">{hotel.name}</p>
                    <div className="flex justify-between items-center mt-2.5 text-xs">
                      <span className="bg-indigo-900/30 text-indigo-300 px-2 py-0.5 rounded font-medium border border-indigo-800/30">
                        {hotel.tier || 'Mid Range'}
                      </span>
                      <span className="text-slate-400 font-medium">
                        {hotel.estimatedCostNightUSD ? `$${hotel.estimatedCostNightUSD}/night` : 'Price varies'}
                      </span>
                      {hotel.rating && (
                        <span className="text-amber-400 font-semibold flex items-center gap-0.5">
                          ★ {hotel.rating}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Center/right: itinerary + packing */}
        <div className="lg:col-span-2 space-y-6">
          {selectedTrip ? (
            <>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h2 className="text-2xl font-bold mb-6 text-white border-b border-slate-800 pb-3">
                  Day-by-Day Timeline: {selectedTrip.destination}
                </h2>

                <div className="space-y-6">
                  {selectedTrip.itinerary.map((day) => (
                    <div
                      key={day.dayNumber}
                      className="border-l-2 border-indigo-500 pl-6 relative"
                    >
                      <div className="absolute -left-[9px] top-1 w-4 h-4 bg-indigo-500 rounded-full border-4 border-slate-900" />
                      <div className="flex justify-between items-center mb-3">
                        <h3 className="text-lg font-bold text-slate-200">Day {day.dayNumber}</h3>
                        <button
                          onClick={() => {
                            setRegenerateDayNum(regenerateDayNum === day.dayNumber ? null : day.dayNumber);
                            setRegeneratePrompt('');
                          }}
                          className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold transition flex items-center gap-1 bg-indigo-950/40 px-2 py-1 rounded border border-indigo-900/30"
                        >
                          <span>🪄</span> Customize Day
                        </button>
                      </div>

                      {regenerateDayNum === day.dayNumber && (
                        <div className="mb-4 bg-slate-950 border border-slate-800 p-3.5 rounded-xl space-y-2">
                          <p className="text-xs text-slate-400 font-medium">Tell the AI what to change for Day {day.dayNumber}:</p>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={regeneratePrompt}
                              onChange={(e) => setRegeneratePrompt(e.target.value)}
                              placeholder="e.g. focus on shopping / add outdoor adventures"
                              className="bg-slate-900 border border-slate-700 rounded-lg text-xs px-3 py-1.5 focus:outline-none focus:border-indigo-500 w-full text-slate-200"
                            />
                            <button
                              disabled={regeneratingDay}
                              onClick={() => handleRegenerateDay(day.dayNumber)}
                              className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition shrink-0"
                            >
                              {regeneratingDay ? '...' : 'Go'}
                            </button>
                          </div>
                        </div>
                      )}

                      <div className="space-y-3 mb-4">
                        {day.activities.map((act, actIdx) => (
                          <div key={actIdx} className="bg-slate-800/80 p-3.5 rounded-xl border border-slate-700/50 relative group hover:border-slate-650 transition duration-200">
                            <div className="flex justify-between items-start gap-4">
                              <span className="font-semibold text-white text-sm">{act.title}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[10px] uppercase font-mono bg-indigo-900/40 text-indigo-300 px-2 py-0.5 rounded-full">
                                  {act.timeOfDay}
                                </span>
                                <button
                                  onClick={() => handleRemoveActivity(day.dayNumber, actIdx)}
                                  className="text-red-400 hover:text-red-300 text-xs opacity-60 md:opacity-0 group-hover:opacity-100 transition duration-150 p-1 rounded hover:bg-slate-700"
                                  title="Remove activity"
                                >
                                  🗑️
                                </button>
                              </div>
                            </div>
                            <p className="text-xs text-slate-400 mt-1">{act.description}</p>
                          </div>
                        ))}
                      </div>

                      <div className="flex items-center gap-2 max-w-sm mt-3">
                        <input
                          type="text"
                          placeholder="Add activity..."
                          value={targetDay === day.dayNumber ? newActivityName : ''}
                          onChange={(e) => {
                            setTargetDay(day.dayNumber);
                            setNewActivityName(e.target.value);
                          }}
                          className="bg-slate-950 border border-slate-800 rounded-lg text-xs px-3 py-1.5 focus:outline-none focus:border-indigo-500 w-full"
                        />
                        <button
                          onClick={() => handleAddActivity(day.dayNumber)}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg px-3 py-1.5 text-xs font-semibold transition"
                        >
                          Add
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-1 text-white">⛈️ AI Weather-Aware Packing Assistant</h3>
                <p className="text-xs text-slate-400 mb-4">
                  Generate a packing checklist based on itinerary + season/month.
                </p>

                <button
                  onClick={generatePacking}
                  className="mb-4 bg-emerald-600 hover:bg-emerald-500 transition text-white rounded-lg px-4 py-2 text-sm font-semibold"
                >
                  Generate Packing Checklist
                </button>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedTrip.packingList?.length ? (
                    selectedTrip.packingList.map((item, idx) => (
                      <div
                        key={item._id || idx}
                        onClick={() => {
                          if (item._id) togglePackingItem(item._id);
                          else togglePackingItem('', idx);
                        }}
                        className="flex items-center gap-3 p-3 bg-slate-800 border border-slate-700 rounded-xl cursor-pointer hover:bg-slate-750 transition"
                      >
                        <input
                          type="checkbox"
                          checked={item.isPacked}
                          readOnly
                          className="h-4 w-4 rounded bg-slate-950 border-slate-800 accent-emerald-500 cursor-pointer"
                        />
                        <span className={`text-sm ${item.isPacked ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                          {item.item}
                        </span>
                        <span className="ml-auto text-[10px] uppercase bg-slate-900 text-slate-400 px-2 py-0.5 rounded font-mono">
                          {item.category}
                        </span>
                      </div>
                    ))
                  ) : (
                    <p className="text-xs text-slate-500">Generating weather checklists...</p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col justify-center items-center h-96 bg-slate-900 border border-slate-800 rounded-2xl">
              <span className="text-6xl mb-4">✈️</span>
              <p className="text-slate-400">Select an existing itinerary or create a new trip to begin exploring.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

