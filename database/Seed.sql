-- Seed demo. Aman dijalankan berulang (INSERT IGNORE).
-- Urutan wajib: users -> karyawan -> hak_akses (data poli ada di Schema.sql / migrasi)
-- Password semua akun demo sama.
-- NIP otomatis berformat KRY-0001 (= idKaryawan); seed menulisnya eksplisit.
-- Role akun hanya: super_admin, admin, dokter. Jabatan (jenisKaryawan) seperti Perawat tetap bebas.

-- Data master unit kerja (hanya 2 poli)
INSERT INTO `poli` (`idPoli`, `namaPoli`) VALUES
(1, 'Poli Umum'),
(2, 'Poli Gigi');

-- Contoh layanan katalog. Tarif disimpan sebagai transaksi keuangan,
-- lalu dihubungkan melalui layanan.idKeuangan.
INSERT IGNORE INTO `keuangan` (`idTransaksi`, `jenisTransaksi`, `kategori`, `nominal`, `tglTransaksi`) VALUES
(900001, 'Pendapatan layanan', 'Pemeriksaan', 100000, '2026-11-01');

INSERT IGNORE INTO `layanan` (`idPoli`, `idKeuangan`, `namaLayanan`, `porsiDokter`, `diskon`) VALUES
(1, 900001, 'Pemeriksaan umum', 0, 20);

-- Data master fitur (dibutuhkan aplikasi, bukan data dummy)
INSERT INTO `fitur` (`kodeFitur`, `namaFitur`, `deskripsi`, `grup`, `urutan`, `khususSuperAdmin`) VALUES
('rekap_pasien',     'Rekap Pasien & Detail Layanan', 'Riwayat kunjungan dan layanan per pasien dari CRM', 'Pelayanan Pasien', 1, FALSE),
('input_pasien',     'Input Data Pasien Manual',      'Untuk pasien yang belum terdaftar di web CRM',      'Pelayanan Pasien', 2, FALSE),
('task_manager',     'Task Manager',                  'Tugas harian dan penugasan antar karyawan',         'Pelayanan Pasien', 3, FALSE),
('arus_kas',         'Arus Kas',                      'Pemasukan dan pengeluaran klinik',                  'Keuangan',         4, FALSE),
('reimburse',        'Reimburse',                     'Pengajuan dan persetujuan klaim biaya',             'Keuangan',         5, FALSE),
('invoice_digital',  'Invoice Digital',               'Invoice dan tautan rating via WhatsApp',            'Keuangan',         6, FALSE),
('katalog_layanan',  'Katalog Layanan Berdiskon',     'Daftar layanan, tarif, dan diskon',                 'Keuangan',         7, FALSE),
('kelola_karyawan',  'Kelola Karyawan',               'Data karyawan, jabatan, dan legalitas',             'SDM & Laporan',    8, TRUE),
('kinerja_jasa',     'Kinerja & Jasa Pelayanan',      'Penilaian kinerja dan perhitungan jasa',            'SDM & Laporan',    9, FALSE),
('dasbor_eksekutif', 'Dasbor Eksekutif',              'Pendapatan per poli dan total pengeluaran gaji',    'SDM & Laporan',   10, FALSE),
('kelola_hak_akses', 'Kelola Hak Akses',              'Akun dan hak akses karyawan',                       'SDM & Laporan',   11, TRUE);


INSERT INTO users (id_user, email, password, role, is_active, created_at) VALUES
('10000000-0000-4000-8000-000000000001', 'farhan@gmail.com', '$2b$10$.4d2fomSKD9QK217.J9lguM78aEKSBOceC7n/zzhtR1qeEsp4GFy6', 'dokter', TRUE, NOW()),
('10000000-0000-4000-8000-000000000002', 'andi@gmail.com', '$2b$10$.4d2fomSKD9QK217.J9lguM78aEKSBOceC7n/zzhtR1qeEsp4GFy6', 'admin', TRUE, NOW()),
('10000000-0000-4000-8000-000000000003', 'budi@gmail.com', '$2b$10$.4d2fomSKD9QK217.J9lguM78aEKSBOceC7n/zzhtR1qeEsp4GFy6', 'super_admin', TRUE, NOW()),
('10000000-0000-4000-8000-000000000004', 'siti@gmail.com', '$2b$10$.4d2fomSKD9QK217.J9lguM78aEKSBOceC7n/zzhtR1qeEsp4GFy6', 'admin', TRUE, NOW()),
('10000000-0000-4000-8000-000000000005', 'yuli@gmail.com', '$2b$10$.4d2fomSKD9QK217.J9lguM78aEKSBOceC7n/zzhtR1qeEsp4GFy6', 'admin', FALSE, NOW());

INSERT INTO karyawan
  (idKaryawan, id_user, idPoli, NIP, NIK, namaLengkap, jenisKaryawan, noHp, statusAktif, STR, SIP, created_at)
VALUES
(1, '10000000-0000-4000-8000-000000000001', 1, 'KRY-0001', '3174092408890003', 'dr. Farhan Maulana', 'Dokter Umum', '0812-9843-2210', TRUE, 'DEMO-STR-0001', 'DEMO-SIP-0001', NOW()),
(2, '10000000-0000-4000-8000-000000000002', 2, 'KRY-0002', '3174092408890004', 'drg. Sarah Ramadhani', 'Dokter Gigi', '0812-9843-2211', TRUE, 'DEMO-STR-0002', 'DEMO-SIP-0002', NOW()),
(3, '10000000-0000-4000-8000-000000000003', 1, 'KRY-0003', '3174092408890005', 'Budi Santoso', 'Pimpinan Klinik', '0812-9843-2212', TRUE, NULL, NULL, NOW()),
(4, '10000000-0000-4000-8000-000000000004', 1, 'KRY-0004', '3174092408890006', 'Siti Aminah', 'Perawat', '0812-9843-2213', TRUE, 'DEMO-STR-0004', NULL, NOW()),
(5, '10000000-0000-4000-8000-000000000005', 2, 'KRY-0005', '3174092408890007', 'Yuli Hartati', 'Perawat', '0812-9843-2214', TRUE, 'DEMO-STR-0005', NULL, NOW());

-- Contoh hak akses dr. Farhan (7 fitur aktif)
INSERT INTO hak_akses (id_user, kodeFitur, bisaLihat, bisaTambah, bisaUbah, bisaHapus, diubahOleh) VALUES
('10000000-0000-4000-8000-000000000001', 'rekap_pasien',    TRUE, FALSE, TRUE,  FALSE, '10000000-0000-4000-8000-000000000003'),
('10000000-0000-4000-8000-000000000001', 'input_pasien',    TRUE, FALSE, FALSE, FALSE, '10000000-0000-4000-8000-000000000003'),
('10000000-0000-4000-8000-000000000001', 'task_manager',    TRUE, TRUE,  TRUE,  FALSE, '10000000-0000-4000-8000-000000000003'),
('10000000-0000-4000-8000-000000000001', 'reimburse',       TRUE, TRUE,  FALSE, FALSE, '10000000-0000-4000-8000-000000000003'),
('10000000-0000-4000-8000-000000000001', 'invoice_digital', TRUE, FALSE, FALSE, FALSE, '10000000-0000-4000-8000-000000000003'),
('10000000-0000-4000-8000-000000000001', 'katalog_layanan', TRUE, FALSE, FALSE, FALSE, '10000000-0000-4000-8000-000000000003'),
('10000000-0000-4000-8000-000000000001', 'kinerja_jasa',    TRUE, FALSE, FALSE, FALSE, '10000000-0000-4000-8000-000000000003');
