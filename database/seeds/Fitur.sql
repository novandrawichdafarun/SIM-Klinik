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
