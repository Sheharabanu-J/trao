
require('dotenv').config();

const express = require('express');
const cors = require('cors');
const { connectDB } = require('./config/db');

const authRoutes = require('./routes/authRoutes');
const tripRoutes = require('./routes/tripRoutes');

const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json({ limit: '2mb' }));

app.get('/health', (req, res) => res.json({ ok: true }));

app.use('/api/auth', authRoutes);
app.use('/api', tripRoutes);

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Backend listening on port ${PORT} (0.0.0.0)`);
    });
  })
  .catch((err) => {
    console.error('Failed to start server due to DB error:', err);
    process.exit(1);
  });

