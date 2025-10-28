// db.js
const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'mesin_db'
});

db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed: ', err.code, err.message);
    process.exit(1); // hentikan server biar gak lanjut kalau DB gagal
  } else {
    console.log('✅ Database Connected:', process.env.DB_NAME);
  }
});

module.exports = db;
