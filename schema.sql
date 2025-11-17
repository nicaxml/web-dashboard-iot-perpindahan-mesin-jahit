CREATE DATABASE IF NOT EXISTS mesin_db DEFAULT CHARACTER SET utf8mb4;
USE mesin_db;

CREATE TABLE admin (
  id_admin INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE mesin (
  id_mesin INT AUTO_INCREMENT PRIMARY KEY,
  merk_mesin VARCHAR(100) NOT NULL,
  nomer_seri_mesin VARCHAR(100) NOT NULL,
  kode_barcode VARCHAR(100) NOT NULL DEFAULT '',
  line_sekarang VARCHAR(10) NOT NULL,
  line_sebelumnya VARCHAR(10),
  status_pindah ENUM('Pindah','Tidak Pindah') NOT NULL DEFAULT 'Tidak Pindah',
  update_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_kode_barcode (kode_barcode),
  INDEX idx_line_sekarang (line_sekarang)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE riwayat_pindah_mesin (
  id_riwayat INT AUTO_INCREMENT PRIMARY KEY,
  id_mesin INT NOT NULL,
  line_sebelumnya VARCHAR(10),
  line_sekarang VARCHAR(10) NOT NULL,
  status_pindah ENUM('Pindah','Tidak Pindah') NOT NULL DEFAULT 'Pindah',
  waktu_pindah DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_id_mesin (id_mesin),
  INDEX idx_waktu_pindah (waktu_pindah),
  CONSTRAINT fk_riwayat_mesin FOREIGN KEY (id_mesin) REFERENCES mesin(id_mesin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE masalah_mesin (
  id_masalah_mesin INT AUTO_INCREMENT PRIMARY KEY,
  nama_masalah VARCHAR(255) NOT NULL,
  deskripsi TEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE tabel_masalah_mesin (
  id_masalah INT AUTO_INCREMENT PRIMARY KEY,
  id_mesin INT NOT NULL,
  masalah_mesin TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_tabel_masalah_mesin_id_mesin (id_mesin),
  CONSTRAINT fk_tabel_masalah_mesin_mesin FOREIGN KEY (id_mesin) REFERENCES mesin(id_mesin)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO admin (username, password) VALUES ('admin', '$2b$10$1fgTlTUWDWE.udIfWpNequSh3fpFSzqc9gqFrIQrjTr/mDO7emsZa');
INSERT INTO mesin (merk_mesin, nomer_seri_mesin, kode_barcode, line_sekarang, line_sebelumnya, status_pindah) VALUES
('Juki DDL-7000A','SN-7000A-001','A001','1A',NULL,'Tidak Pindah'),
('Brother S-1000','SN-S1000-002','A002','2B',NULL,'Tidak Pindah'),
('Singer HD 6800','SN-6800-003','A003','3A',NULL,'Tidak Pindah'),
('Juki DDL-9000B','SN-9000B-004','A004','1B',NULL,'Tidak Pindah'),
('Brother NEXIO','SN-NEXIO-005','A005','7C',NULL,'Tidak Pindah'),
('Typical GC6910','SN-6910-006','A006','10A',NULL,'Tidak Pindah'),
('Jack F4','SN-JF4-007','A007','5A',NULL,'Tidak Pindah'),
('Siruba DL720','SN-720-008','A008','6B',NULL,'Tidak Pindah'),
('Juki MO-6714S','SN-6714-009','A009','11A',NULL,'Tidak Pindah'),
('Brother B950','SN-B950-010','A010','12B',NULL,'Tidak Pindah');

INSERT INTO riwayat_pindah_mesin (id_mesin, line_sebelumnya, line_sekarang, status_pindah, waktu_pindah) VALUES
(1,'1B','1A','Pindah',NOW() - INTERVAL 1 DAY),
(2,'2A','2B','Pindah',NOW() - INTERVAL 2 HOUR),
(3,'3B','3A','Pindah',NOW() - INTERVAL 30 MINUTE);

INSERT INTO masalah_mesin (nama_masalah, deskripsi) VALUES
('Jarum Putus','Jarum mesin patah saat operasi'),
('Benang Kusut','Benang kusut dan tertahan di shuttle'),
('Motor Overheat','Motor panas berlebihan');

INSERT INTO tabel_masalah_mesin (id_mesin, masalah_mesin) VALUES
(1,'Benang putus berkala di line 1A'),
(2,'Getaran tinggi di line 2B'),
(5,'Suara tidak normal pada 7C');