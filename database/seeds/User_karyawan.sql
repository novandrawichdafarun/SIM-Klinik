INSERT IGNORE INTO users (id_user, email, password, role, created_at) VALUES
('10000000-0000-4000-8000-000000000001', 'farhan@gmail.com', '$2b$10$.4d2fomSKD9QK217.J9lguM78aEKSBOceC7n/zzhtR1qeEsp4GFy6', 'dokter', NOW()),
('10000000-0000-4000-8000-000000000002', 'andi@gmail.com', '$2b$10$.4d2fomSKD9QK217.J9lguM78aEKSBOceC7n/zzhtR1qeEsp4GFy6', 'admin', NOW()),
('10000000-0000-4000-8000-000000000003', 'budi@gmail.com', '$2b$10$.4d2fomSKD9QK217.J9lguM78aEKSBOceC7n/zzhtR1qeEsp4GFy6', 'super_admin', NOW());

INSERT IGNORE INTO karyawan
  (id_user, namaLengkap, jenisKaryawan, statusAktif, STR, created_at)
VALUES
('10000000-0000-4000-8000-000000000001', 'dr. Farhan Maulana, Sp.A', 'Dokter Spesialis Anak', TRUE, 'DEMO-STR-0001', NOW()),
('10000000-0000-4000-8000-000000000002', 'dr. Sarah Ramadhani, Sp.PD', 'Dokter Spesialis Penyakit Dalam', TRUE, 'DEMO-STR-0002', NOW()),
('10000000-0000-4000-8000-000000000003', 'dr. Budi Santoso, Sp.KK', 'Dokter Spesialis Kulit dan Kelamin', TRUE, 'DEMO-STR-0003', NOW());
