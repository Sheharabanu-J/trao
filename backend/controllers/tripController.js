const Trip = require('../models/Trip');

async function fetchWithRetry(url, options, retries = 5, delayMs = 1000) {
  let lastErr;
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        if (response.status === 429 && attempt < retries - 1) {
          const wait = delayMs * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, wait));
          continue;
        }
        throw new Error(`External API Error: Status Code ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      lastErr = err;
      if (attempt < retries - 1) {
        const wait = delayMs * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, wait));
        continue;
      }
    }
  }
  throw lastErr;
}

function safeParseGeminiJSON(text) {
  // Gemini often returns text containing JSON directly; we enforce strict parsing.
  return JSON.parse(text);
}

exports.getMyTrips = async (req, res) => {
  const userId = req.user.id;
  const trips = await Trip.find({ userId }).sort({ createdAt: -1 });
  res.json(trips);
};

exports.getMyTrip = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;

  const trip = await Trip.findOne({ _id: id, userId });
  if (!trip) return res.status(404).json({ message: 'Trip not found' });
  res.json(trip);
};

exports.generateNewTrip = async (req, res) => {
  const userId = req.user.id;
  const { destination, durationDays, budgetTier, interests } = req.body || {};

  if (!destination || !durationDays || !budgetTier) {
    return res.status(400).json({ message: 'destination, durationDays, budgetTier are required' });
  }

  const interestsArr = Array.isArray(interests) ? interests : [];

  const prompt = `
Create a detailed travel plan for a ${durationDays}-day trip to ${destination}.
Budget preference is ${budgetTier}.
Interests: ${interestsArr.join(', ') || 'None'}.

Return ONLY a valid JSON object with this exact structure:
{
  "itinerary": [
    {
      "dayNumber": 1,
      "activities": [
        {
          "title": "Activity name",
          "description": "Brief text details",
          "estimatedCostUSD": 20,
          "timeOfDay": "Morning|Afternoon|Evening"
        }
      ]
    }
  ],
  "hotels": [
    { "name": "Recommended Hotel", "tier": "Budget|Mid|Luxury", "estimatedCostNightUSD": 85, "rating": "4.5/5" }
  ],
  "estimatedBudget": {
    "transport": 120,
    "accommodation": 300,
    "food": 150,
    "activities": 100,
    "total": 670
  },
  "packingList": [
    { "item": "Passport", "category": "Documents|Clothing|Gear|Other", "isPacked": false }
  ]
}

Constraints:
- itinerary must contain exactly durationDays day objects, dayNumber 1..durationDays
- estimatedBudget.total must equal sum of categories
- packingList must include at least 8 items.
`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ message: 'Missing GEMINI_API_KEY' });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const requestPayload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    };

    const data = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    const parsedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!parsedText) throw new Error('Could not extract generation data from response.');

let clean;
    try {
      clean = safeParseGeminiJSON(parsedText);
    } catch (e) {
      throw new Error('Fail-safe: Gemini returned invalid JSON. Please try again.');
    }


    const newTrip = await Trip.create({
      userId,
      destination,
      durationDays,
      budgetTier,
      interests: interestsArr,
      itinerary: clean.itinerary || [],
      hotels: clean.hotels || [],
      estimatedBudget: clean.estimatedBudget || {
        transport: 0,
        accommodation: 0,
        food: 0,
        activities: 0,
        total: 0,
      },
      packingList: clean.packingList || [],
    });

    return res.status(201).json(newTrip);
  } catch (error) {
    console.error('Critical AI Generation Error:', error);
    return res.status(500).json({ message: 'Fail-safe: AI encountered an error generating your trip. Please try again.' });
  }
};

function recalculateTripBudget(trip) {
  let activitiesTotal = 0;
  for (const day of trip.itinerary) {
    for (const act of day.activities) {
      activitiesTotal += Number(act.estimatedCostUSD || 0);
    }
  }
  trip.estimatedBudget.activities = activitiesTotal;
  trip.estimatedBudget.total =
    (trip.estimatedBudget.transport || 0) +
    (trip.estimatedBudget.accommodation || 0) +
    (trip.estimatedBudget.food || 0) +
    activitiesTotal;
}

exports.updateTrip = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { itinerary, packingList } = req.body || {};

  const trip = await Trip.findOne({ _id: id, userId });
  if (!trip) return res.status(404).json({ message: 'Trip not found' });

  if (itinerary) {
    trip.itinerary = itinerary;
    recalculateTripBudget(trip);
  }
  if (packingList) trip.packingList = packingList;

  await trip.save();
  res.json(trip);
};

exports.regenerateTripDay = async (req, res) => {
  const userId = req.user.id;
  const { id } = req.params;
  const { dayNumber, prompt } = req.body || {};

  if (!dayNumber) {
    return res.status(400).json({ message: 'dayNumber is required' });
  }

  const trip = await Trip.findOne({ _id: id, userId });
  if (!trip) return res.status(404).json({ message: 'Trip not found' });

  if (dayNumber < 1 || dayNumber > trip.durationDays) {
    return res.status(400).json({ message: `dayNumber must be between 1 and ${trip.durationDays}` });
  }

  const interestsArr = Array.isArray(trip.interests) ? trip.interests : [];

  const promptText = `
Create a revised daily itinerary for Day ${dayNumber} of a trip to ${trip.destination}.
Budget preference is ${trip.budgetTier}.
Original Interests: ${interestsArr.join(', ') || 'None'}.
The traveler's customization request for Day ${dayNumber} is: "${prompt || 'Suggest alternative exciting activities'}".

Return ONLY a valid JSON object with this exact structure:
{
  "dayNumber": ${dayNumber},
  "activities": [
    {
      "title": "Activity name",
      "description": "Brief details",
      "estimatedCostUSD": 20,
      "timeOfDay": "Morning|Afternoon|Evening"
    }
  ]
}

Constraints:
- Return ONLY the JSON object. Do not wrap in markdown tags or include any extra text.
- itinerary day number must be exactly ${dayNumber}.
`;

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ message: 'Missing GEMINI_API_KEY' });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const requestPayload = {
      contents: [{ parts: [{ text: promptText }] }],
      generationConfig: { responseMimeType: 'application/json' },
    };

    const data = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    const parsedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!parsedText) throw new Error('Could not extract generation data from response.');

    let clean;
    try {
      clean = JSON.parse(parsedText);
    } catch (e) {
      throw new Error('Fail-safe: Gemini returned invalid JSON. Please try again.');
    }

    // Merge regenerated day activities back into trip itinerary
    trip.itinerary = trip.itinerary.map((day) => {
      if (day.dayNumber === Number(dayNumber)) {
        const rawDayObj = day.toObject ? day.toObject() : day;
        return {
          ...rawDayObj,
          activities: clean.activities || [],
        };
      }
      return day;
    });

    recalculateTripBudget(trip);
    await trip.save();

    return res.json(trip);
  } catch (error) {
    console.error('Critical Day Regeneration Error:', error);
    return res.status(500).json({ message: 'Fail-safe: AI encountered an error regenerating that day. Please try again.' });
  }
};

exports.generatePackingAssistant = async (req, res) => {
  // Weather-aware packing assistant (creative feature)
  const userId = req.user.id;
  const { id } = req.params;
  const { seasonOrMonth } = req.body || {};

  const trip = await Trip.findOne({ _id: id, userId });
  if (!trip) return res.status(404).json({ message: 'Trip not found' });

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ message: 'Missing GEMINI_API_KEY' });

    const prompt = `
You are a travel packing assistant.

Destination: ${trip.destination}
Season/Month: ${seasonOrMonth || trip.packingContext?.seasonOrMonth || 'unspecified'}
Trip duration: ${trip.durationDays} days
Budget tier: ${trip.budgetTier}
Itinerary highlights (activities):
${(trip.itinerary || []).map((d) => `Day ${d.dayNumber}: ${(d.activities || []).slice(0, 5).map(a => a.title).join(', ')}`).join('\n')}

Generate a packing checklist as weather-aware and activity-aware items.
Return ONLY valid JSON:
{
  "packingList": [
    { "item": "Rain jacket", "category": "Documents|Clothing|Gear|Other", "isPacked": false }
  ],
  "climateNotes": "Short notes about expected climate considerations."
}

Rules:
- packingList must include 12-22 items.
- Must include: travel documents, weather clothing, at least one footwear item if outdoor activity exists.
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    const requestPayload = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { responseMimeType: 'application/json' },
    };

    const data = await fetchWithRetry(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    const parsedText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!parsedText) throw new Error('Could not extract packing generation data from response.');

    let clean;
    try {
      clean = JSON.parse(parsedText);
    } catch (e) {
      throw new Error('Fail-safe: Packing assistant returned invalid JSON. Please try again.');
    }

    trip.packingList = clean.packingList || [];
    trip.packingContext = {
      seasonOrMonth: seasonOrMonth || trip.packingContext?.seasonOrMonth || '',
      climateNotes: clean.climateNotes || '',
    };

    await trip.save();

    res.json(trip);
  } catch (error) {
    console.error('Packing assistant error:', error);
    res.status(500).json({ message: 'Fail-safe: Could not generate packing checklist. Please try again.' });
  }
};

