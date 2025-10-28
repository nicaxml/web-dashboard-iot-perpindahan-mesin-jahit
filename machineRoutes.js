// machineRoutes.js
const express = require('express');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const router = express.Router();

// Middleware untuk verifikasi token
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // format: Bearer token
  if (!token) return res.status(401).json({ message: 'Token tidak ditemukan' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token tidak valid' });
    req.user = user;
    next();
  });
}

// API Data Machine
router.get('/machine', verifyToken, (req, res) => {
  const { barcode } = req.query;

  // Simulasi data (nanti bisa ambil dari database)
  const machines = [
    { barcode: 'A001', name: 'Juki DDL-7000A', position: 'Line 1 - Table 3' },
    { barcode: 'A002', name: 'Brother S-1000', position: 'Line 2 - Table 5' },
  ];

  const machine = machines.find(m => m.barcode === barcode);

  if (!machine) {
    return res.status(404).json({ message: 'Data machine tidak ditemukan' });
  }

  res.json({ 
    message: 'Data ditemukan', 
    data: machine 
  });
});

module.exports = router;
