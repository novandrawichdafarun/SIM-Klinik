-- Seed demo. Aman dijalankan berulang (INSERT IGNORE).
-- Urutan wajib: users -> karyawan -> hak_akses (data poli ada di Schema.sql / migrasi)
-- Password semua akun demo sama.
-- NIP otomatis berformat KRY-0001 (= idKaryawan); seed menulisnya eksplisit.
-- Role akun hanya: super_admin, admin, dokter. Jabatan (jenisKaryawan) seperti Perawat tetap bebas.

INSERT IGNORE INTO users (id_user, email, password, role, is_active, created_at) VALUES
('10000000-0000-4000-8000-000000000001', 'farhan@gmail.com', '$2b$10$.4d2fomSKD9QK217.J9lguM78aEKSBOceC7n/zzhtR1qeEsp4GFy6', 'dokter', TRUE, NOW()),
('10000000-0000-4000-8000-000000000002', 'andi@gmail.com', '$2b$10$.4d2fomSKD9QK217.J9lguM78aEKSBOceC7n/zzhtR1qeEsp4GFy6', 'admin', TRUE, NOW()),
('10000000-0000-4000-8000-000000000003', 'budi@gmail.com', '$2b$10$.4d2fomSKD9QK217.J9lguM78aEKSBOceC7n/zzhtR1qeEsp4GFy6', 'super_admin', TRUE, NOW()),
('10000000-0000-4000-8000-000000000004', 'siti@gmail.com', '$2b$10$.4d2fomSKD9QK217.J9lguM78aEKSBOceC7n/zzhtR1qeEsp4GFy6', 'admin', TRUE, NOW()),
('10000000-0000-4000-8000-000000000005', 'yuli@gmail.com', '$2b$10$.4d2fomSKD9QK217.J9lguM78aEKSBOceC7n/zzhtR1qeEsp4GFy6', 'admin', FALSE, NOW());

INSERT IGNORE INTO karyawan
  (idKaryawan, id_user, idPoli, NIP, NIK, namaLengkap, jenisKaryawan, noHp, statusAktif, STR, SIP, created_at)
VALUES
(1, '10000000-0000-4000-8000-000000000001', 1, 'KRY-0001', '3174092408890003', 'dr. Farhan Maulana', 'Dokter Umum', '0812-9843-2210', TRUE, 'DEMO-STR-0001', 'DEMO-SIP-0001', NOW()),
(2, '10000000-0000-4000-8000-000000000002', 2, 'KRY-0002', '3174092408890004', 'drg. Sarah Ramadhani', 'Dokter Gigi', '0812-9843-2211', TRUE, 'DEMO-STR-0002', 'DEMO-SIP-0002', NOW()),
-- Pimpinan Klinik = Super Admin, sekaligus dokter di Poli Umum
(3, '10000000-0000-4000-8000-000000000003', 1, 'KRY-0003', '3174092408890005', 'Budi Santoso', 'Pimpinan Klinik', '0812-9843-2212', TRUE, NULL, NULL, NOW()),
(4, '10000000-0000-4000-8000-000000000004', 1, 'KRY-0004', '3174092408890006', 'Siti Aminah', 'Perawat', '0812-9843-2213', TRUE, 'DEMO-STR-0004', NULL, NOW()),
(5, '10000000-0000-4000-8000-000000000005', 2, 'KRY-0005', '3174092408890007', 'Yuli Hartati', 'Perawat', '0812-9843-2214', TRUE, 'DEMO-STR-0005', NULL, NOW()),
-- Karyawan tanpa akun (untuk mencoba fitur Tambah Akun)

-- Contoh hak akses dr. Farhan (7 fitur aktif)
INSERT IGNORE INTO hak_akses (id_user, kodeFitur, bisaLihat, bisaTambah, bisaUbah, bisaHapus, diubahOleh) VALUES
('10000000-0000-4000-8000-000000000001', 'rekap_pasien',    TRUE, FALSE, TRUE,  FALSE, '10000000-0000-4000-8000-000000000003'),
('10000000-0000-4000-8000-000000000001', 'input_pasien',    TRUE, FALSE, FALSE, FALSE, '10000000-0000-4000-8000-000000000003'),
('10000000-0000-4000-8000-000000000001', 'task_manager',    TRUE, TRUE,  TRUE,  FALSE, '10000000-0000-4000-8000-000000000003'),
('10000000-0000-4000-8000-000000000001', 'reimburse',       TRUE, TRUE,  FALSE, FALSE, '10000000-0000-4000-8000-000000000003'),
('10000000-0000-4000-8000-000000000001', 'invoice_digital', TRUE, FALSE, FALSE, FALSE, '10000000-0000-4000-8000-000000000003'),
('10000000-0000-4000-8000-000000000001', 'katalog_layanan', TRUE, FALSE, FALSE, FALSE, '10000000-0000-4000-8000-000000000003'),
('10000000-0000-4000-8000-000000000001', 'kinerja_jasa',    TRUE, FALSE, FALSE, FALSE, '10000000-0000-4000-8000-000000000003');
