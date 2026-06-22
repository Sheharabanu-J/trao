const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

function signToken({ userId, email }) {
  return jwt.sign(
    { email },
    process.env.JWT_SECRET,
    {
      subject: userId.toString(),
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
}

exports.register = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'email and password are required' });

  const existing = await User.findOne({ email }).lean();
  if (existing) return res.status(409).json({ message: 'User already exists' });

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await User.create({ email, passwordHash });

  const token = signToken({ userId: user._id, email: user.email });
  return res.status(201).json({ token });
};

exports.login = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ message: 'email and password are required' });

  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

  const token = signToken({ userId: user._id, email: user.email });
  return res.status(200).json({ token });
};

