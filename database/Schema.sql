SET NAMES utf8mb4;
SET SQL_MODE = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `rating_dokter`;
DROP TABLE IF EXISTS `hak_akses`;
DROP TABLE IF EXISTS `fitur`;
DROP TABLE IF EXISTS `rekam_medis`;
DROP TABLE IF EXISTS `kunjungan`;
DROP TABLE IF EXISTS `invoice`;
DROP TABLE IF EXISTS `layanan`;
DROP TABLE IF EXISTS `karyawan`;
DROP TABLE IF EXISTS `pasien`;
DROP TABLE IF EXISTS `poli`;
DROP TABLE IF EXISTS `keuangan`;
DROP TABLE IF EXISTS `user_sessions`;
DROP TABLE IF EXISTS `password_resets`;
DROP TABLE IF EXISTS `users`;

SET FOREIGN_KEY_CHECKS = 1;

CREATE TABLE `users` (
  `id_user` CHAR(36) NOT NULL DEFAULT (LOWER(UUID())),
  `email` VARCHAR(254) NOT NULL,
  `password` VARCHAR(255) NOT NULL,
  `role` VARCHAR(20) NOT NULL,
  `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Status akun: FALSE = tidak bisa login',
  `last_login_at` TIMESTAMP NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_user`),
  UNIQUE KEY `uk_users_email` (`email`),
  CONSTRAINT `chk_users_role`
    CHECK (`role` IN ('super_admin', 'admin', 'dokter'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `password_resets` (
  `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_user` CHAR(36) NOT NULL,
  `token_hash` CHAR(64) NOT NULL COMMENT 'Hash token reset',
  `expires_at` TIMESTAMP NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_password_resets_user_expiry` (`id_user`, `expires_at`),
  CONSTRAINT `fk_password_resets_user`
    FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `user_sessions` (
  `id` CHAR(36) NOT NULL DEFAULT (LOWER(UUID())),
  `id_user` CHAR(36) NOT NULL,
  `session_token` CHAR(64) NOT NULL COMMENT 'Simpan hash token sesi',
  `device_info` VARCHAR(500) NULL,
  `last_active_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_user_sessions_token` (`session_token`),
  KEY `idx_user_sessions_user_active` (`id_user`, `last_active_at`),
  CONSTRAINT `fk_user_sessions_user`
    FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `poli` (
  `idPoli` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `namaPoli` VARCHAR(50) NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idPoli`),
  UNIQUE KEY `uk_poli_nama` (`namaPoli`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `keuangan` (
  `idTransaksi` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `jenisTransaksi` VARCHAR(100) NOT NULL,
  `kategori` VARCHAR(50) NOT NULL,
  `nominal` DECIMAL(15,2) NOT NULL,
  `tglTransaksi` DATE NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idTransaksi`),
  KEY `idx_keuangan_tanggal_kategori` (`tglTransaksi`, `kategori`),
  CONSTRAINT `chk_keuangan_nominal` CHECK (`nominal` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `karyawan` (
  `idKaryawan` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `id_user` CHAR(36) NULL COMMENT 'Akun login; NULL = karyawan belum punya akun',
  `idPoli` INT UNSIGNED NOT NULL COMMENT 'Unit kerja: Poli Umum / Poli Gigi',
  `NIP` VARCHAR(30) NOT NULL COMMENT 'Otomatis: KRY-0001 dari idKaryawan, tidak bisa diubah',
  `NIK` CHAR(16) NOT NULL,
  `namaLengkap` VARCHAR(100) NOT NULL,
  `jenisKaryawan` VARCHAR(100) NOT NULL COMMENT 'Jabatan, mis. Dokter Umum / Perawat. Pimpinan Klinik = akun Super Admin',
  `noHp` VARCHAR(20) NULL,
  `statusAktif` BOOLEAN NOT NULL DEFAULT TRUE,
  `STR` VARCHAR(255) NULL,
  `SIP` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idKaryawan`),
  UNIQUE KEY `uk_karyawan_user` (`id_user`),
  UNIQUE KEY `uk_karyawan_nip` (`NIP`),
  UNIQUE KEY `uk_karyawan_nik` (`NIK`),
  KEY `idx_karyawan_poli` (`idPoli`),
  KEY `idx_karyawan_nama` (`namaLengkap`),
  KEY `idx_karyawan_jenis_status` (`jenisKaryawan`, `statusAktif`),
  CONSTRAINT `fk_karyawan_user`
    FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE SET NULL,
  CONSTRAINT `fk_karyawan_poli`
    FOREIGN KEY (`idPoli`) REFERENCES `poli` (`idPoli`),
  CONSTRAINT `chk_karyawan_nik`
    CHECK (`NIK` REGEXP '^[0-9]{16}$')
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- NIP dibuat otomatis oleh aplikasi (format KRY-0001 dari idKaryawan) dan tidak bisa diubah.
-- Trigger ini mengembalikan NIP lama bila ada UPDATE yang mencoba menggantinya.
-- Pengecualian: NIP sementara "TMP-..." yang dipakai sesaat saat INSERT.
CREATE TRIGGER `trg_karyawan_nip_tetap`
  BEFORE UPDATE ON `karyawan`
  FOR EACH ROW
  SET NEW.`NIP` = IF(OLD.`NIP` LIKE 'TMP-%', NEW.`NIP`, OLD.`NIP`);

CREATE TABLE `layanan` (
  `idLayanan` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `idPoli` INT UNSIGNED NOT NULL,
  `idKeuangan` BIGINT UNSIGNED NULL,
  `namaLayanan` VARCHAR(100) NOT NULL,
  `porsiDokter` DECIMAL(5,2) NOT NULL,
  `diskon` DECIMAL(5,2) NOT NULL DEFAULT 0.00,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idLayanan`),
  UNIQUE KEY `uk_layanan_keuangan` (`idKeuangan`),
  KEY `idx_layanan_poli_nama` (`idPoli`, `namaLayanan`),
  CONSTRAINT `fk_layanan_poli`
    FOREIGN KEY (`idPoli`) REFERENCES `poli` (`idPoli`),
  CONSTRAINT `fk_layanan_keuangan`
    FOREIGN KEY (`idKeuangan`) REFERENCES `keuangan` (`idTransaksi`),
  CONSTRAINT `chk_layanan_porsi_dokter`
    CHECK (`porsiDokter` BETWEEN 0 AND 100),
  CONSTRAINT `chk_layanan_diskon`
    CHECK (`diskon` BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `invoice` (
  `idInvoice` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `idKeuangan` BIGINT UNSIGNED NOT NULL,
  `tanggal` DATE NOT NULL,
  `totalBayar` DECIMAL(15,2) NOT NULL,
  `linkRating` VARCHAR(255) NOT NULL,
  `statusKirim` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'FALSE: belum/gagal, TRUE: terkirim',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idInvoice`),
  KEY `idx_invoice_keuangan` (`idKeuangan`),
  KEY `idx_invoice_tanggal_status` (`tanggal`, `statusKirim`),
  CONSTRAINT `fk_invoice_keuangan`
    FOREIGN KEY (`idKeuangan`) REFERENCES `keuangan` (`idTransaksi`),
  CONSTRAINT `chk_invoice_total_bayar` CHECK (`totalBayar` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `pasien` (
  `idPasien` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `namaLengkap` VARCHAR(100) NOT NULL,
  `NoRM` VARCHAR(50) NOT NULL,
  `NIK` CHAR(16) NOT NULL,
  `jenisKelamin` CHAR(1) NOT NULL,
  `alamat` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idPasien`),
  UNIQUE KEY `uk_pasien_no_rm` (`NoRM`),
  UNIQUE KEY `uk_pasien_nik` (`NIK`),
  KEY `idx_pasien_nama` (`namaLengkap`),
  CONSTRAINT `chk_pasien_jenis_kelamin`
    CHECK (`jenisKelamin` IN ('L', 'P'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `kunjungan` (
  `idKunjungan` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `idLayanan` INT UNSIGNED NOT NULL,
  `tglKunjungan` DATE NOT NULL,
  `idPasien` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idKunjungan`),
  KEY `idx_kunjungan_pasien_tanggal` (`idPasien`, `tglKunjungan`),
  KEY `idx_kunjungan_layanan_tanggal` (`idLayanan`, `tglKunjungan`),
  CONSTRAINT `fk_kunjungan_layanan`
    FOREIGN KEY (`idLayanan`) REFERENCES `layanan` (`idLayanan`),
  CONSTRAINT `fk_kunjungan_pasien`
    FOREIGN KEY (`idPasien`) REFERENCES `pasien` (`idPasien`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rekam_medis` (
  `idRekamMedis` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `idKunjungan` BIGINT UNSIGNED NOT NULL,
  `idDokter` INT UNSIGNED NOT NULL,
  `diagnosa` VARCHAR(255) NOT NULL,
  `resepObat` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idRekamMedis`),
  UNIQUE KEY `uk_rekam_medis_kunjungan` (`idKunjungan`),
  KEY `idx_rekam_medis_dokter` (`idDokter`),
  CONSTRAINT `fk_rekam_medis_kunjungan`
    FOREIGN KEY (`idKunjungan`) REFERENCES `kunjungan` (`idKunjungan`),
  CONSTRAINT `fk_rekam_medis_dokter`
    FOREIGN KEY (`idDokter`) REFERENCES `karyawan` (`idKaryawan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Hak akses per akun
-- ============================================================

CREATE TABLE `fitur` (
  `kodeFitur` VARCHAR(50) NOT NULL,
  `namaFitur` VARCHAR(100) NOT NULL,
  `deskripsi` VARCHAR(255) NULL,
  `grup` VARCHAR(50) NOT NULL,
  `urutan` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `khususSuperAdmin` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'TRUE = tidak bisa diberikan ke selain super_admin',
  PRIMARY KEY (`kodeFitur`),
  KEY `idx_fitur_grup_urutan` (`grup`, `urutan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `hak_akses` (
  `id_user` CHAR(36) NOT NULL,
  `kodeFitur` VARCHAR(50) NOT NULL,
  `bisaLihat` BOOLEAN NOT NULL DEFAULT FALSE,
  `bisaTambah` BOOLEAN NOT NULL DEFAULT FALSE,
  `bisaUbah` BOOLEAN NOT NULL DEFAULT FALSE,
  `bisaHapus` BOOLEAN NOT NULL DEFAULT FALSE,
  `diubahOleh` CHAR(36) NULL COMMENT 'id_user super admin yang terakhir mengubah',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_user`, `kodeFitur`),
  KEY `idx_hak_akses_fitur` (`kodeFitur`),
  KEY `idx_hak_akses_diubah_oleh` (`diubahOleh`),
  CONSTRAINT `fk_hak_akses_user`
    FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE CASCADE,
  CONSTRAINT `fk_hak_akses_fitur`
    FOREIGN KEY (`kodeFitur`) REFERENCES `fitur` (`kodeFitur`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_hak_akses_diubah_oleh`
    FOREIGN KEY (`diubahOleh`) REFERENCES `users` (`id_user`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- Rating dokter dari pengunjung (diisi lewat tautan rating di invoice)
-- ============================================================

CREATE TABLE `rating_dokter` (
  `idRating` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `idKunjungan` BIGINT UNSIGNED NOT NULL,
  `idDokter` INT UNSIGNED NOT NULL,
  `nilai` TINYINT UNSIGNED NOT NULL COMMENT 'Bintang 1-5',
  `ulasan` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idRating`),
  UNIQUE KEY `uk_rating_kunjungan` (`idKunjungan`),
  KEY `idx_rating_dokter_tanggal` (`idDokter`, `created_at`),
  CONSTRAINT `fk_rating_kunjungan`
    FOREIGN KEY (`idKunjungan`) REFERENCES `kunjungan` (`idKunjungan`) ON DELETE CASCADE,
  CONSTRAINT `fk_rating_dokter`
    FOREIGN KEY (`idDokter`) REFERENCES `karyawan` (`idKaryawan`),
  CONSTRAINT `chk_rating_nilai`
    CHECK (`nilai` BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Data master unit kerja (hanya 2 poli)
INSERT INTO `poli` (`idPoli`, `namaPoli`) VALUES
(1, 'Poli Umum'),
(2, 'Poli Gigi');

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
