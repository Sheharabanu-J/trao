const express = require('express');
const auth = require('../middleware/auth');
const {
  getMyTrips,
  getMyTrip,
  generateNewTrip,
  updateTrip,
  generatePackingAssistant,
  regenerateTripDay,
} = require('../controllers/tripController');

const router = express.Router();

router.get('/trips', auth, getMyTrips);
router.get('/trips/:id', auth, getMyTrip);

router.post('/trips', auth, generateNewTrip);
router.put('/trips/:id', auth, updateTrip);
router.post('/trips/:id/regenerate-day', auth, regenerateTripDay);

router.post('/trips/:id/packing', auth, generatePackingAssistant);

module.exports = router;

