-- ============================================================
-- Migrasi: status akun, hak akses per akun, dan rating dokter
-- Untuk database yang SUDAH berisi data (tidak menghapus apa pun).
-- Database baru cukup import database/Schema.sql.
-- Jalankan SEKALI, lewat phpMyAdmin (tab Import) atau:
--   mysql -u root db_klinik < database/migrations/2026-11-10_akun_hak_akses_rating.sql
-- ============================================================

SET NAMES utf8mb4;

-- 1. users: status akun & login terakhir (role tetap: super_admin, admin, dokter)
ALTER TABLE `users`
  ADD COLUMN `is_active` BOOLEAN NOT NULL DEFAULT TRUE COMMENT 'Status akun: FALSE = tidak bisa login' AFTER `role`,
  ADD COLUMN `last_login_at` TIMESTAMP NULL AFTER `is_active`;

-- 2. poli: unit kerja hanya Poli Umum & Poli Gigi
INSERT IGNORE INTO `poli` (`idPoli`, `namaPoli`) VALUES
(1, 'Poli Umum'),
(2, 'Poli Gigi');

-- 3. karyawan:
--    - boleh belum punya akun; hapus akun tidak menghapus karyawan
--    - wajib punya unit kerja (poli). Karyawan lama tanpa poli dipindah ke Poli Umum.
UPDATE `karyawan` SET `idPoli` = 1 WHERE `idPoli` IS NULL;

ALTER TABLE `karyawan` DROP FOREIGN KEY `fk_karyawan_user`;
ALTER TABLE `karyawan` DROP FOREIGN KEY `fk_karyawan_poli`;
ALTER TABLE `karyawan`
  MODIFY `id_user` CHAR(36) NULL COMMENT 'Akun login; NULL = karyawan belum punya akun',
  MODIFY `idPoli` INT UNSIGNED NOT NULL COMMENT 'Unit kerja: Poli Umum / Poli Gigi',
  ADD CONSTRAINT `fk_karyawan_user`
    FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_karyawan_poli`
    FOREIGN KEY (`idPoli`) REFERENCES `poli` (`idPoli`);

-- 4. NIP otomatis: format KRY-0001 dari idKaryawan, lalu dikunci trigger
UPDATE `karyawan`
   SET `NIP` = CONCAT('KRY-', LPAD(`idKaryawan`, GREATEST(4, CHAR_LENGTH(`idKaryawan`)), '0'));

ALTER TABLE `karyawan`
  MODIFY `NIP` VARCHAR(30) NOT NULL COMMENT 'Otomatis: KRY-0001 dari idKaryawan, tidak bisa diubah';

DROP TRIGGER IF EXISTS `trg_karyawan_nip_tetap`;
-- NIP dibuat otomatis oleh aplikasi (format KRY-0001 dari idKaryawan) dan tidak bisa diubah.
-- Trigger ini mengembalikan NIP lama bila ada UPDATE yang mencoba menggantinya.
-- Pengecualian: NIP sementara "TMP-..." yang dipakai sesaat saat INSERT.
CREATE TRIGGER `trg_karyawan_nip_tetap`
  BEFORE UPDATE ON `karyawan`
  FOR EACH ROW
  SET NEW.`NIP` = IF(OLD.`NIP` LIKE 'TMP-%', NEW.`NIP`, OLD.`NIP`);

-- 5. Pimpinan Klinik selalu ber-role Super Admin
--    Data demo: Budi Santoso (seed) adalah Pimpinan Klinik, bukan "Administrator Sistem"
UPDATE `karyawan`
   SET `jenisKaryawan` = 'Pimpinan Klinik'
 WHERE `id_user` = '10000000-0000-4000-8000-000000000003'
   AND `jenisKaryawan` = 'Administrator Sistem';

UPDATE `users` u
  JOIN `karyawan` k ON k.`id_user` = u.`id_user`
   SET u.`role` = 'super_admin'
 WHERE k.`jenisKaryawan` = 'Pimpinan Klinik';

-- 6. fitur & hak_akses
CREATE TABLE IF NOT EXISTS `fitur` (
  `kodeFitur` VARCHAR(50) NOT NULL,
  `namaFitur` VARCHAR(100) NOT NULL,
  `deskripsi` VARCHAR(255) NULL,
  `grup` VARCHAR(50) NOT NULL,
  `urutan` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  `khususSuperAdmin` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'TRUE = tidak bisa diberikan ke selain super_admin',
  PRIMARY KEY (`kodeFitur`),
  KEY `idx_fitur_grup_urutan` (`grup`, `urutan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS `hak_akses` (
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

-- 7. rating_dokter (diisi pengunjung lewat tautan rating di invoice)
CREATE TABLE IF NOT EXISTS `rating_dokter` (
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

-- 8. Data master fitur
INSERT IGNORE INTO `fitur` (`kodeFitur`, `namaFitur`, `deskripsi`, `grup`, `urutan`, `khususSuperAdmin`) VALUES
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
