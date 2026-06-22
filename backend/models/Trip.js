const mongoose = require('mongoose');

const ActivitySchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: '' },
  estimatedCostUSD: { type: Number, default: 0 },
  timeOfDay: { type: String, enum: ['Morning', 'Afternoon', 'Evening'], default: 'Afternoon' },
});

const ItineraryDaySchema = new mongoose.Schema({
  dayNumber: { type: Number, required: true },
  activities: { type: [ActivitySchema], default: [] },
});

const HotelSchema = new mongoose.Schema({
  name: { type: String, required: true },
  tier: { type: String, default: '' },
  estimatedCostNightUSD: { type: Number, default: 0 },
  rating: { type: String, default: '' },
});

const TripSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },

    destination: { type: String, required: true },
    durationDays: { type: Number, required: true },
    budgetTier: { type: String, enum: ['Low', 'Medium', 'High'], required: true },
    interests: { type: [String], default: [] },

    itinerary: { type: [ItineraryDaySchema], default: [] },

    hotels: { type: [HotelSchema], default: [] },

    estimatedBudget: {
      transport: { type: Number, default: 0 },
      accommodation: { type: Number, default: 0 },
      food: { type: Number, default: 0 },
      activities: { type: Number, default: 0 },
      total: { type: Number, default: 0 },
    },

    // Creative Feature data structures
    packingList: {
      type: [
        new mongoose.Schema({
          item: { type: String, required: true },
          category: { type: String, enum: ['Documents', 'Clothing', 'Gear', 'Other'], default: 'Other' },
          isPacked: { type: Boolean, default: false },
        })
      ],
      default: [],
    },

    // Optional metadata for packing assistant
    packingContext: {
      seasonOrMonth: { type: String, default: '' },
      climateNotes: { type: String, default: '' },
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Trip', TripSchema);

