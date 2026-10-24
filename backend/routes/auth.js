const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const User = require('../models/User');

function hashPassword(password, salt) {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

function generateToken(user) {
  const payload = `${user._id}:${user.email}:${Date.now()}`;
  return Buffer.from(payload).toString('base64');
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists' });
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);

    const newUser = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      passwordHash,
      salt,
      cashBalance: 50000.00,
      role: 'pro_trader'
    });

    const token = generateToken(newUser);
    return res.status(201).json({
      token,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        cashBalance: newUser.cashBalance,
        role: newUser.role
      }
    });
  } catch (err) {
    console.error('Error during registration:', err);
    return res.status(500).json({ error: 'Failed to create account. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const testHash = hashPassword(password, user.salt);
    if (testHash !== user.passwordHash) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        cashBalance: user.cashBalance,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Error during login:', err);
    return res.status(500).json({ error: 'Login failed. Please try again.' });
  }
});

// POST /api/auth/demo
router.post('/demo', async (req, res) => {
  try {
    const demoEmail = 'trader.demo@stockvault.io';
    let demoUser = await User.findOne({ email: demoEmail });
    if (!demoUser) {
      const salt = crypto.randomBytes(16).toString('hex');
      const passwordHash = hashPassword('demo123456', salt);
      demoUser = await User.create({
        name: 'Alex Vance',
        email: demoEmail,
        passwordHash,
        salt,
        cashBalance: 75000.00,
        role: 'institutional_trader'
      });
    }

    const token = generateToken(demoUser);
    return res.json({
      token,
      user: {
        id: demoUser._id,
        name: demoUser.name,
        email: demoUser.email,
        cashBalance: demoUser.cashBalance,
        role: demoUser.role
      }
    });
  } catch (err) {
    console.error('Error creating demo session:', err);
    return res.status(500).json({ error: 'Demo login failed' });
  }
});

// GET /api/auth/me
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = authHeader.replace(/^Bearer\s+/i, '');
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId] = decoded.split(':');
    const user = await User.findById(userId).select('-passwordHash -salt');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    return res.json({ user });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
});

module.exports = router;
