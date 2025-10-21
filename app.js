// === IMPORT MODULE ===
const express = require('express');
const mysql = require('mysql2');
const http = require('http');
const { Server } = require('socket.io');
const bodyParser = require('body-parser');
const path = require('path');
const session = require('express-session');

// === INISIALISASI APLIKASI ===
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// === MIDDLEWARE ===
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// === SESSION ===
app.use(
  session({
    secret: 'mesin_secret_key',
    resave: false,
    saveUninitialized: true,
  })
);

// === KONEKSI DATABASE ===
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'mesin_db',
});

db.connect((err) => {
  if (err) {
    console.error('❌ Database connection failed:', err.message);
    process.exit(1);
  }
  console.log('✅ Database Connected');
});

db.query("SET time_zone = '+07:00';");

// === CEK LOGIN MIDDLEWARE ===
function isLoggedIn(req, res, next) {
  if (req.session.loggedIn) next();
  else res.redirect('/login');
}

// === HALAMAN LOGIN ADMIN ===
app.get('/login', (req, res) => {
  res.render('admin/login', { error: null });
});

app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === '12345') {
    req.session.loggedIn = true;
    res.redirect('/admin/dashboard');
  } else {
    res.render('admin/login', { error: 'Username atau password salah!' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/login');
});

// === DASHBOARD ADMIN ===
app.get('/admin/dashboard', isLoggedIn, (req, res) => {
  res.render('admin/dashboard');
});

// === HALAMAN DATA MESIN ===
app.get('/admin/mesin', isLoggedIn, (req, res) => {
  db.query('SELECT * FROM mesin', (err, results) => {
    if (err) throw err;
    // Kirim variabel 'mesin' ke EJS
    res.render('admin/mesin', { mesin: results });
  });
});

// === HALAMAN RIWAYAT ADMIN ===
app.get('/admin/riwayat', isLoggedIn, (req, res) => {
  const sql = `
    SELECT r.*, m.merk_mesin, m.nomer_seri_mesin, m.kode_barcode
    FROM riwayat_pindah_mesin r
    LEFT JOIN mesin m ON r.id_mesin = m.id_mesin
    ORDER BY r.waktu_pindah DESC
  `;
  db.query(sql, (err, results) => {
    if (err) throw err;

    // Tambahkan kolom line_dari, line_ke, keterangan
    const riwayat = results.map(r => ({
      id_mesin: r.id_mesin,
      merk_mesin: r.merk_mesin,
      nomer_seri_mesin: r.nomer_seri_mesin,
      kode_barcode: r.kode_barcode || '-',
      line_dari: r.line_sebelumnya || '-',
      line_ke: r.line_sekarang,
      waktu_pindah: r.waktu_pindah,
      status_pindah: r.status_pindah,
      keterangan: r.status_pindah === 'Pindah'
        ? `🚚 Pindah dari ${r.line_sebelumnya || '-'} ke ${r.line_sekarang}`
        : '✓ Tidak ada perpindahan'
    }));

    // Kirim variabel 'riwayat' ke EJS
    res.render('admin/riwayat', { riwayat });
  });
});



// === HALAMAN UTAMA (PUBLIC DASHBOARD) ===
app.get('/', (req, res) => {
  db.query('SELECT * FROM mesin', (err, rows) => {
    if (err) {
      console.error('❌ Error fetching mesin data:', err.message);
      return res.status(500).send('Database Error');
    }
    res.render('index', { mesin: rows });
  });
});

// === ENDPOINT TAMBAH MESIN BARU ===
app.post('/add-mesin', (req, res) => {
  const { merk_mesin, nomer_seri_mesin, line_sekarang, kode_barcode } = req.body;
  if (!merk_mesin || !nomer_seri_mesin || !line_sekarang)
    return res.status(400).json({ success: false, message: 'Data tidak lengkap' });

  db.query(
    `INSERT INTO mesin (merk_mesin, nomer_seri_mesin, line_sekarang, kode_barcode, status_pindah) VALUES (?, ?, ?, ?, 'Tidak Pindah')`,
    [merk_mesin, nomer_seri_mesin, line_sekarang, kode_barcode || ''],
    (err, result) => {
      if (err) return res.status(500).json({ success: false, message: err.message });

      db.query(`SELECT * FROM mesin WHERE id_mesin = ?`, [result.insertId], (err, rows) => {
        if (err) return res.status(500).json({ success: false, message: err.message });

        io.emit('newMachine', rows[0]);
        res.json({ success: true, mesin: rows[0] });
      });
    }
  );
});

// === ENDPOINT UPDATE MESIN (PERPINDAHAN) ===
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

        io.emit('updateNow');
        res.send({ success: true });
      });
    });
  });
});

// === ENDPOINT JSON UNTUK FRONTEND ===
app.get('/mesin-data', (req, res) => {
  db.query('SELECT * FROM mesin', (err, rows) => {
    if (err) return res.status(500).json([]);
    res.json(rows);
  });
});

app.get('/riwayat-data', (req, res) => {
  const sql = `
    SELECT r.*, m.merk_mesin, m.nomer_seri_mesin, m.kode_barcode
    FROM riwayat_pindah_mesin r
    LEFT JOIN mesin m ON r.id_mesin = m.id_mesin
    ORDER BY r.waktu_pindah DESC
  `;
  db.query(sql, (err, rows) => {
    if (err) return res.status(500).json([]);

    const dataWithKeterangan = rows.map(r => ({
      ...r,
      line_dari: r.line_sebelumnya,
      line_ke: r.line_sekarang,
      keterangan: r.status_pindah === 'Pindah' ? `🚚 Pindah dari ${r.line_sebelumnya || '-'} ke ${r.line_sekarang}` : '✓ Tidak ada perpindahan'
    }));

    res.json(dataWithKeterangan);
  });
});

// === JUMLAH MESIN BERPINDAH HARI INI ===
app.get('/count', (req, res) => {
  db.query(
    `SELECT COUNT(*) AS total FROM riwayat_pindah_mesin WHERE DATE(waktu_pindah) = CURDATE()`,
    (err, result) => {
      if (err) return res.status(500).json({ total: 0 });
      res.json({ total: result[0].total });
    }
  );
});

// === SOCKET.IO ===
io.on('connection', (socket) => {
  console.log('🟢 Client connected');
  socket.on('disconnect', () => console.log('🔴 Client disconnected'));
});

// === JALANKAN SERVER ===
const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
