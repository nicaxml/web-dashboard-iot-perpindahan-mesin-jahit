// authRoutes.js
const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const router = express.Router();

// Simulasi user database (bisa diganti MySQL)
const users = [
  { id: 1, username: 'admin', password: bcrypt.hashSync('12345', 8) },
];

// LOGIN untuk mendapatkan JWT token
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find(u => u.username === username);
  
  if (!user) {
    return res.status(404).json({ message: 'User tidak ditemukan' });
  }

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) {
    return res.status(401).json({ message: 'Password salah' });
  }

  const token = jwt.sign({ id: user.id, username: user.username }, process.env.JWT_SECRET, {
    expiresIn: '2h'
  });

  res.json({ message: 'Login berhasil', token });
});

module.exports = router;
