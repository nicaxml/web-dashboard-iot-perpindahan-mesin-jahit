// ============================
// === IMPORT MODULES ===
// ============================
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();
const db = require('./db'); // gunakan koneksi dari db.js

// ============================
// === INISIALISASI APP ===
// ============================
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// ============================
// === KONFIGURASI DASAR ===
// ============================
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'mesin_secret_key';

// ============================
// === MIDDLEWARE UMUM ===
// ============================
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ============================
// === KONFIGURASI SESSION ===
// ============================
app.use(
  session({
    secret: 'mesin_secret_key',
    resave: false,
    saveUninitialized: true,
  })
);

// ============================
// === CEK LOGIN UNTUK ADMIN EJS ===
// ============================
function isLoggedIn(req, res, next) {
  if (req.session.loggedIn) next();
  else res.redirect('/login');
}

// ============================
// === HALAMAN LOGIN ADMIN (EJS) ===
// ============================

// === TAMPILAN LOGIN ===
app.get('/login', (req, res) => {
  res.render('admin/login', { error: null });
});

// === LOGIN DENGAN HASH PASSWORD ===
app.post('/login', (req, res) => {
  const { username, password } = req.body;

  // Cek username di database
  const sql = 'SELECT * FROM admin WHERE username = ?';
  db.query(sql, [username], (err, results) => {
    if (err) {
      console.error('❌ Database error:', err);
      return res.render('admin/login', { error: 'Terjadi kesalahan server!' });
    }

    // Jika username tidak ditemukan
    if (results.length === 0) {
      return res.render('admin/login', { error: 'Username tidak ditemukan!' });
    }

    const user = results[0];

    // Bandingkan password input dengan hash dari database
    const isMatch = bcrypt.compareSync(password, user.password);
    if (!isMatch) {
      return res.render('admin/login', { error: 'Password salah!' });
    }

    // Jika cocok, buat session dan redirect
    req.session.loggedIn = true;
    req.session.username = user.username;
    res.redirect('/admin/dashboard');
  });
});

// === LOGOUT ===
app.get('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error('❌ Gagal logout:', err);
      return res.status(500).send('Terjadi kesalahan saat logout.');
    }
    res.redirect('/login');
  });
});


// ============================
// === HALAMAN DASHBOARD ADMIN ===
// ============================
app.get('/admin/dashboard', isLoggedIn, (req, res) => {
  res.render('admin/dashboard');
});

// ============================
// === HALAMAN DATA MESIN ===
// ============================
app.get('/admin/mesin', isLoggedIn, (req, res) => {
  db.query('SELECT * FROM mesin', (err, results) => {
    if (err) throw err;
    res.render('admin/mesin', { mesin: results });
  });
});

// ============================
// === HALAMAN RIWAYAT ADMIN ===
// ============================
app.get('/admin/riwayat', isLoggedIn, (req, res) => {
  const sql = `
    SELECT r.*, m.merk_mesin, m.nomer_seri_mesin, m.kode_barcode
    FROM riwayat_pindah_mesin r
    LEFT JOIN mesin m ON r.id_mesin = m.id_mesin
    ORDER BY r.waktu_pindah DESC
  `;
  db.query(sql, (err, results) => {
    if (err) throw err;

    const riwayat = results.map((r) => ({
      id_mesin: r.id_mesin,
      merk_mesin: r.merk_mesin,
      nomer_seri_mesin: r.nomer_seri_mesin,
      kode_barcode: r.kode_barcode || '-',
      line_dari: r.line_sebelumnya || '-',
      line_ke: r.line_sekarang,
      waktu_pindah: r.waktu_pindah,
      status_pindah: r.status_pindah,
      keterangan:
        r.status_pindah === 'Pindah'
          ? `🚚 Pindah dari ${r.line_sebelumnya || '-'} ke ${r.line_sekarang}`
          : '✓ Tidak ada perpindahan',
    }));

    res.render('admin/riwayat', { riwayat });
  });
});

// ============================
// === HALAMAN UTAMA (DASHBOARD PUBLIC) ===
// ============================
app.get('/', (req, res) => {
  db.query('SELECT * FROM mesin', (err, rows) => {
    if (err) {
      console.error('❌ Error fetching mesin data:', err.message);
      return res.status(500).send('Database Error');
    }
    res.render('index', { mesin: rows });
  });
});

// ============================
// 🔐 AUTHENTICATION API (JWT)
// ============================

const users = [
  { id: 1, username: 'apiadmin', password: bcrypt.hashSync('api12345', 8) },
];

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  const user = users.find((u) => u.username === username);

  if (!user) return res.status(404).json({ message: 'User tidak ditemukan' });

  const valid = bcrypt.compareSync(password, user.password);
  if (!valid) return res.status(401).json({ message: 'Password salah' });

  const token = jwt.sign(
    { id: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '2h' }
  );

  res.json({ message: 'Login berhasil', token });
});

// === MIDDLEWARE CEK TOKEN ===
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token)
    return res.status(401).json({ message: 'Token tidak ditemukan' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ message: 'Token tidak valid' });
    req.user = user;
    next();
  });
}

// === API POST DATA MESIN BERDASARKAN BARCODE & ID MASALAH ===
// === API POST DATA MESIN BERDASARKAN BARCODE & ID MASALAH (Output hanya data mesin) ===
app.post('/api/data/machine', verifyToken, (req, res) => {
  const { barcode, id_masalah_mesin } = req.body; // ambil dari body JSON

  if (!barcode || !id_masalah_mesin) {
    return res.status(400).json({
      message: 'Parameter barcode dan id_masalah_mesin wajib diisi',
    });
  }

  // cek validitas id_masalah_mesin
  db.query(
    'SELECT * FROM masalah_mesin WHERE id_masalah_mesin = ?',
    [id_masalah_mesin],
    (err, masalahRows) => {
      if (err)
        return res.status(500).json({ message: 'Database error (masalah_mesin)' });
      if (masalahRows.length === 0)
        return res.status(404).json({ message: 'id_masalah_mesin tidak ditemukan' });

      // ambil data mesin saja berdasarkan barcode
      const query = 'SELECT * FROM mesin WHERE kode_barcode = ?';
      db.query(query, [barcode], (err2, mesinRows) => {
        if (err2)
          return res.status(500).json({ message: 'Database error (mesin)' });
        if (mesinRows.length === 0)
          return res.status(404).json({
            message: 'Data mesin dengan barcode tersebut tidak ditemukan',
          });

        res.json({
          message: 'Data mesin ditemukan',
          data: mesinRows[0], // hanya data mesin
        });
      });
    }
  );
});




// ============================
// === POST Masalah Mesin (Revisi) ===
// ============================
app.post('/api/masalah', verifyToken, (req, res) => {
  const { barcode, masalah_mesin } = req.body;

  if (!barcode || !masalah_mesin) {
    return res
      .status(400)
      .json({ message: 'Barcode dan masalah mesin wajib diisi' });
  }

  // 1️⃣ Cari id_mesin dan line_sekarang berdasarkan barcode
  const findMachineSql = 'SELECT id_mesin, line_sekarang FROM mesin WHERE kode_barcode = ?';
  db.query(findMachineSql, [barcode], (err, result) => {
    if (err) {
      console.error('❌ DB Error saat mencari mesin:', err);
      return res.status(500).json({ message: 'Database error saat mencari mesin' });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: 'Mesin dengan barcode tersebut tidak ditemukan' });
    }

    const { id_mesin, line_sekarang } = result[0];

    // 2️⃣ Simpan data ke tabel_masalah_mesin
    const insertSql = `
      INSERT INTO tabel_masalah_mesin (id_mesin, masalah_mesin)
      VALUES (?, ?)
    `;
    db.query(insertSql, [id_mesin, masalah_mesin], (err2, result2) => {
      if (err2) {
        console.error('❌ DB Error saat insert masalah mesin:', err2);
        return res.status(500).json({ message: 'Gagal menyimpan data masalah mesin' });
      }

      // 3️⃣ Kirim response ke client
      res.json({
        message: 'Masalah mesin berhasil disimpan',
        id_masalah_mesin: result2.insertId,
        id_mesin,
        line_sekarang
      });
    });
  });
});


// ============================
// 🧩 CRUD MESIN & SOCKET.IO
// ============================

app.post('/add-mesin', (req, res) => {
  const { merk_mesin, nomer_seri_mesin, line_sekarang, kode_barcode } = req.body;
  if (!merk_mesin || !nomer_seri_mesin || !line_sekarang)
    return res.status(400).json({ success: false, message: 'Data tidak lengkap' });

  db.query(
    `INSERT INTO mesin (merk_mesin, nomer_seri_mesin, line_sekarang, kode_barcode, status_pindah) 
     VALUES (?, ?, ?, ?, 'Tidak Pindah')`,
    [merk_mesin, nomer_seri_mesin, line_sekarang, kode_barcode || ''],
    (err, result) => {
      if (err)
        return res.status(500).json({ success: false, message: err.message });

      db.query(`SELECT * FROM mesin WHERE id_mesin = ?`, [result.insertId], (err, rows) => {
        if (err)
          return res.status(500).json({ success: false, message: err.message });

        io.emit('newMachine', rows[0]);
        res.json({ success: true, mesin: rows[0] });
      });
    }
  );
});

app.post('/update', (req, res) => {
  const { id_mesin, line_baru } = req.body;

  if (!id_mesin || !line_baru)
    return res.status(400).send({ success: false, message: 'Data tidak lengkap' });

  db.query('SELECT line_sekarang FROM mesin WHERE id_mesin = ?', [id_mesin], (err, rows) => {
    if (err || rows.length === 0) {
      return res.status(404).send({ success: false, message: 'Mesin tidak ditemukan' });
    }

    const lineSebelumnya = rows[0].line_sekarang;

    const updateSql = `
      UPDATE mesin 
      SET line_sebelumnya = ?, line_sekarang = ?, status_pindah = 'Pindah', update_time = NOW()
      WHERE id_mesin = ?
    `;
    db.query(updateSql, [lineSebelumnya, line_baru, id_mesin], (err) => {
      if (err) return res.status(500).send({ success: false });

      const insertSql = `
        INSERT INTO riwayat_pindah_mesin (id_mesin, line_sebelumnya, line_sekarang, status_pindah, waktu_pindah)
        VALUES (?, ?, ?, 'Pindah', NOW())
      `;
      db.query(insertSql, [id_mesin, lineSebelumnya, line_baru], (err) => {
        if (err) return res.status(500).send({ success: false });

        db.query('SELECT * FROM mesin WHERE id_mesin = ?', [id_mesin], (err, updatedRows) => {
          if (err || updatedRows.length === 0) {
            io.emit('updateNow');
            return res.send({ success: true });
          }

          const updatedMachine = updatedRows[0];
          io.emit('machineUpdated', updatedMachine);

          res.send({ success: true, mesin: updatedMachine });
        });
      });
    });
  });
});

app.get('/mesin-data', (req, res) => {
  db.query('SELECT * FROM mesin', (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json(rows);
  });
});

app.get('/count', (req, res) => {
  const sql = `SELECT COUNT(*) AS total FROM riwayat_pindah_mesin WHERE DATE(waktu_pindah) = CURDATE()`;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json({ success: false, message: err.message });
    res.json({ total: rows[0].total || 0 });
  });
});

app.post('/api/notify-update', (req, res) => {
  const { id_mesin } = req.body;
  if (!id_mesin) return res.status(400).json({ success: false, message: 'id_mesin required' });

  db.query('SELECT * FROM mesin WHERE id_mesin = ?', [id_mesin], (err, rows) => {
    if (err || rows.length === 0) return res.status(404).json({ success: false });
    io.emit('machineUpdated', rows[0]);
    res.json({ success: true });
  });
});

io.on('connection', (socket) => {
  console.log('🟢 Client connected');
  socket.on('disconnect', () => console.log('🔴 Client disconnected'));
});

// ============================
// === JALANKAN SERVER ===
// ============================
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
