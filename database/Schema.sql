SET NAMES utf8mb4;
SET SQL_MODE = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `klaim_jasa_detail`;
DROP TABLE IF EXISTS `klaim_jasa`;
DROP TABLE IF EXISTS `tarif_jasa`;
DROP TABLE IF EXISTS `kunjungan_layanan`;
DROP TABLE IF EXISTS `rating_kunjungan`;
DROP TABLE IF EXISTS `rating_dokter`;
DROP TABLE IF EXISTS `invoice_detail`;
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
  `kodeLayanan` VARCHAR(20) NOT NULL COMMENT 'Otomatis: LYN-001 dari idLayanan, tidak bisa diubah',
  `idPoli` INT UNSIGNED NOT NULL,
  `idKeuangan` BIGINT UNSIGNED NULL,
  `namaLayanan` VARCHAR(100) NOT NULL,
  `kategori` VARCHAR(50) NOT NULL DEFAULT 'Umum',
  `tarif` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `deskripsi` VARCHAR(1000) NULL,
  `statusAktif` BOOLEAN NOT NULL DEFAULT TRUE,
  `porsiDokter` DECIMAL(5,2) NOT NULL,
  `diskon` DECIMAL(5,2) NOT NULL DEFAULT 0.00 COMMENT 'Kolom lama: diskon persen aktif',
  `diskonAktif` BOOLEAN NOT NULL DEFAULT FALSE,
  `namaEvent` VARCHAR(100) NULL,
  `nilaiDiskon` DECIMAL(5,2) NOT NULL DEFAULT 0 COMMENT 'Diskon event dalam persen (0-100)',
  `mulaiDiskon` DATE NULL,
  `selesaiDiskon` DATE NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idLayanan`),
  UNIQUE KEY `uk_layanan_kode` (`kodeLayanan`),
  UNIQUE KEY `uk_layanan_keuangan` (`idKeuangan`),
  KEY `idx_layanan_poli_nama` (`idPoli`, `namaLayanan`),
  CONSTRAINT `fk_layanan_poli`
    FOREIGN KEY (`idPoli`) REFERENCES `poli` (`idPoli`),
  CONSTRAINT `fk_layanan_keuangan`
    FOREIGN KEY (`idKeuangan`) REFERENCES `keuangan` (`idTransaksi`),
  CONSTRAINT `chk_layanan_porsi_dokter`
    CHECK (`porsiDokter` BETWEEN 0 AND 100),
  CONSTRAINT `chk_layanan_diskon`
    CHECK (`diskon` BETWEEN 0 AND 100),
  CONSTRAINT `chk_layanan_tarif` CHECK (`tarif` >= 0),
  CONSTRAINT `chk_layanan_nilai_diskon` CHECK (`nilaiDiskon` BETWEEN 0 AND 100),
  CONSTRAINT `chk_layanan_periode_diskon`
    CHECK (`mulaiDiskon` IS NULL OR `selesaiDiskon` IS NULL OR `mulaiDiskon` <= `selesaiDiskon`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Kode layanan dibuat otomatis oleh aplikasi (LYN-001 dari idLayanan) dan tidak bisa diubah.
-- Trigger ini mengembalikan kode lama bila ada UPDATE yang mencoba menggantinya.
-- Pengecualian: kode sementara "TMP-..." yang dipakai sesaat saat INSERT.
CREATE TRIGGER `trg_layanan_kode_tetap`
  BEFORE UPDATE ON `layanan`
  FOR EACH ROW
  SET NEW.`kodeLayanan` = IF(OLD.`kodeLayanan` LIKE 'TMP-%', NEW.`kodeLayanan`, OLD.`kodeLayanan`);

CREATE TABLE `pasien` (
  `idPasien` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `namaLengkap` VARCHAR(100) NOT NULL,
  `NoRM` VARCHAR(50) NOT NULL COMMENT 'Otomatis: RM-000001 dari idPasien, tidak bisa diubah',
  `NIK` CHAR(16) NOT NULL,
  `jenisKelamin` CHAR(1) NOT NULL,
  `tempatLahir` VARCHAR(100) NULL,
  `tanggalLahir` DATE NULL,
  `golonganDarah` VARCHAR(3) NULL COMMENT 'A+, A-, B+, B-, AB+, AB-, O+, O-',
  `statusPernikahan` VARCHAR(20) NULL,
  `agama` VARCHAR(20) NULL,
  `pekerjaan` VARCHAR(100) NULL,
  `noHp` VARCHAR(20) NULL,
  `email` VARCHAR(254) NULL,
  `alamat` VARCHAR(255) NULL COMMENT 'Alamat lengkap sesuai KTP',
  `alamatDomisili` VARCHAR(255) NULL COMMENT 'NULL = sama dengan KTP',
  `kecamatan` VARCHAR(100) NULL,
  `kotaKabupaten` VARCHAR(100) NULL,
  `provinsi` VARCHAR(100) NULL,
  `jenisPenjamin` VARCHAR(30) NOT NULL DEFAULT 'Umum',
  `noBpjs` VARCHAR(20) NULL,
  `fktpAsal` VARCHAR(150) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idPasien`),
  UNIQUE KEY `uk_pasien_no_rm` (`NoRM`),
  UNIQUE KEY `uk_pasien_nik` (`NIK`),
  UNIQUE KEY `uk_pasien_no_bpjs` (`noBpjs`),
  KEY `idx_pasien_nama` (`namaLengkap`),
  CONSTRAINT `chk_pasien_jenis_kelamin`
    CHECK (`jenisKelamin` IN ('L', 'P')),
  CONSTRAINT `chk_pasien_nik` CHECK (`NIK` REGEXP '^[0-9]{16}$'),
  CONSTRAINT `chk_pasien_golongan_darah`
    CHECK (`golonganDarah` IS NULL OR `golonganDarah` IN ('A+','A-','B+','B-','AB+','AB-','O+','O-')),
  CONSTRAINT `chk_pasien_penjamin`
    CHECK (`jenisPenjamin` IN ('Umum', 'BPJS Kesehatan (JKN)', 'Asuransi Swasta'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- No. RM dibuat otomatis oleh aplikasi dan tidak bisa diubah (pola sama dengan NIP karyawan)
CREATE TRIGGER `trg_pasien_norm_tetap`
  BEFORE UPDATE ON `pasien`
  FOR EACH ROW
  SET NEW.`NoRM` = IF(OLD.`NoRM` LIKE 'TMP-%', NEW.`NoRM`, OLD.`NoRM`);

CREATE TABLE `kunjungan` (
  `idKunjungan` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `kodeKunjungan` VARCHAR(30) NOT NULL COMMENT 'Otomatis: KJ-YYYYMMDD-NNN',
  `idPoli` INT UNSIGNED NOT NULL COMMENT 'Poli tujuan (dipilih admin saat pendaftaran)',
  `idLayanan` INT UNSIGNED NULL COMMENT 'Tindakan pertama (diisi otomatis saat dokter menyimpan diagnosa); daftar lengkap di kunjungan_layanan',
  `tglKunjungan` DATE NOT NULL,
  `jamKunjungan` TIME NOT NULL DEFAULT '08:00:00',
  `idPasien` INT UNSIGNED NOT NULL,
  `idDokter` INT UNSIGNED NULL COMMENT 'Dokter penanggung jawab',
  `idPerawat` INT UNSIGNED NULL COMMENT 'Perawat yang membantu (mengisi pemeriksaan & penerima jasa perawat)',
  `status` VARCHAR(20) NOT NULL DEFAULT 'menunggu',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idKunjungan`),
  UNIQUE KEY `uk_kunjungan_kode` (`kodeKunjungan`),
  KEY `idx_kunjungan_pasien_tanggal` (`idPasien`, `tglKunjungan`),
  KEY `idx_kunjungan_layanan_tanggal` (`idLayanan`, `tglKunjungan`),
  KEY `idx_kunjungan_tanggal_dokter` (`tglKunjungan`, `idDokter`),
  KEY `idx_kunjungan_poli_tanggal` (`idPoli`, `tglKunjungan`),
  KEY `fk_kunjungan_perawat` (`idPerawat`),
  CONSTRAINT `fk_kunjungan_poli`
    FOREIGN KEY (`idPoli`) REFERENCES `poli` (`idPoli`),
  CONSTRAINT `fk_kunjungan_layanan`
    FOREIGN KEY (`idLayanan`) REFERENCES `layanan` (`idLayanan`),
  CONSTRAINT `fk_kunjungan_pasien`
    FOREIGN KEY (`idPasien`) REFERENCES `pasien` (`idPasien`),
  CONSTRAINT `fk_kunjungan_dokter`
    FOREIGN KEY (`idDokter`) REFERENCES `karyawan` (`idKaryawan`),
  CONSTRAINT `fk_kunjungan_perawat`
    FOREIGN KEY (`idPerawat`) REFERENCES `karyawan` (`idKaryawan`),
  CONSTRAINT `chk_kunjungan_dokter_perawat`
    CHECK (`idPerawat` IS NULL OR `idDokter` IS NULL OR `idPerawat` <> `idDokter`),
  CONSTRAINT `chk_kunjungan_status`
    CHECK (`status` IN ('menunggu', 'selesai', 'batal'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Layanan / tindakan yang dilakukan pada satu kunjungan (bisa lebih dari satu).
-- Diisi perawat di tab Pemeriksaan. Jasa dokter, jasa perawat, dan pemasukan klinik
-- dihitung per baris ini: biaya layanan × persentase tarif yang berlaku pada tanggal kunjungan.
CREATE TABLE `kunjungan_layanan` (
  `idKunjunganLayanan` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `idKunjungan` BIGINT UNSIGNED NOT NULL,
  `idLayanan` INT UNSIGNED NOT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idKunjunganLayanan`),
  UNIQUE KEY `uk_kunjungan_layanan` (`idKunjungan`, `idLayanan`),
  KEY `idx_kunjungan_layanan_layanan` (`idLayanan`),
  CONSTRAINT `fk_kunjungan_layanan_kunjungan`
    FOREIGN KEY (`idKunjungan`) REFERENCES `kunjungan` (`idKunjungan`) ON DELETE CASCADE,
  CONSTRAINT `fk_kunjungan_layanan_layanan`
    FOREIGN KEY (`idLayanan`) REFERENCES `layanan` (`idLayanan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `rekam_medis` (
  `idRekamMedis` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `idKunjungan` BIGINT UNSIGNED NOT NULL,
  `idDokter` INT UNSIGNED NOT NULL COMMENT 'Dokter penanggung jawab (penerima jasa dokter setelah diagnosa diisi)',
  `idPerawat` INT UNSIGNED NULL COMMENT 'Perawat yang mengisi pemeriksaan (penerima jasa perawat)',
  `tekananDarah` VARCHAR(10) NULL COMMENT 'mmHg, mis. 118/78',
  `suhu` DECIMAL(4,1) NULL COMMENT 'Celsius',
  `nadi` SMALLINT UNSIGNED NULL COMMENT 'x/menit',
  `lajuNapas` SMALLINT UNSIGNED NULL COMMENT 'x/menit',
  `beratBadan` DECIMAL(5,1) NULL COMMENT 'kg',
  `tinggiBadan` DECIMAL(5,1) NULL COMMENT 'cm',
  `keluhan` TEXT NULL COMMENT 'Keluhan dan temuan',
  `diagnosa` VARCHAR(255) NULL COMMENT 'Diisi dokter di tab Diagnosa; NULL = belum didiagnosa',
  `catatanDokter` TEXT NULL,
  `resepObat` TEXT NULL,
  `idPemasukan` BIGINT UNSIGNED NULL COMMENT 'Baris keuangan: sisa biaya setelah jasa = pemasukan klinik',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idRekamMedis`),
  UNIQUE KEY `uk_rekam_medis_kunjungan` (`idKunjungan`),
  UNIQUE KEY `uk_rekam_medis_pemasukan` (`idPemasukan`),
  KEY `idx_rekam_medis_dokter` (`idDokter`),
  KEY `idx_rekam_medis_perawat` (`idPerawat`),
  CONSTRAINT `fk_rekam_medis_kunjungan`
    FOREIGN KEY (`idKunjungan`) REFERENCES `kunjungan` (`idKunjungan`),
  CONSTRAINT `fk_rekam_medis_dokter`
    FOREIGN KEY (`idDokter`) REFERENCES `karyawan` (`idKaryawan`),
  CONSTRAINT `fk_rekam_medis_perawat`
    FOREIGN KEY (`idPerawat`) REFERENCES `karyawan` (`idKaryawan`),
  CONSTRAINT `fk_rekam_medis_pemasukan`
    FOREIGN KEY (`idPemasukan`) REFERENCES `keuangan` (`idTransaksi`) ON DELETE SET NULL,
  CONSTRAINT `chk_rekam_medis_petugas_beda`
    CHECK (`idPerawat` IS NULL OR `idPerawat` <> `idDokter`)
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
-- Invoice digital & rating pengunjung
-- Admin membuat invoice untuk kunjungan yang sudah selesai (diagnosa terisi),
-- lalu mengirim tautan invoice + rating ke pasien via WhatsApp.
-- ============================================================

CREATE TABLE `invoice` (
  `idInvoice` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `nomorInvoice` VARCHAR(30) NOT NULL COMMENT 'Otomatis: INV-YYYYMMDD-NNN',
  `idKunjungan` BIGINT UNSIGNED NOT NULL,
  `idKeuangan` BIGINT UNSIGNED NULL COMMENT 'Opsional: transaksi arus kas pembayaran',
  `tanggal` DATE NOT NULL,
  `subtotal` DECIMAL(15,2) NOT NULL,
  `totalDiskon` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `totalBayar` DECIMAL(15,2) NOT NULL,
  `tokenPublik` CHAR(32) NOT NULL COMMENT 'Token acak untuk tautan invoice & rating pasien',
  `statusKirim` BOOLEAN NOT NULL DEFAULT FALSE COMMENT 'FALSE: belum dikirim, TRUE: sudah dikirim via WhatsApp',
  `waktuKirim` DATETIME NULL,
  `dibuatOleh` CHAR(36) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idInvoice`),
  UNIQUE KEY `uk_invoice_nomor` (`nomorInvoice`),
  UNIQUE KEY `uk_invoice_kunjungan` (`idKunjungan`),
  UNIQUE KEY `uk_invoice_token` (`tokenPublik`),
  KEY `idx_invoice_tanggal_status` (`tanggal`, `statusKirim`),
  CONSTRAINT `fk_invoice_kunjungan`
    FOREIGN KEY (`idKunjungan`) REFERENCES `kunjungan` (`idKunjungan`),
  CONSTRAINT `fk_invoice_keuangan`
    FOREIGN KEY (`idKeuangan`) REFERENCES `keuangan` (`idTransaksi`) ON DELETE SET NULL,
  CONSTRAINT `fk_invoice_dibuat_oleh`
    FOREIGN KEY (`dibuatOleh`) REFERENCES `users` (`id_user`) ON DELETE SET NULL,
  CONSTRAINT `chk_invoice_total_bayar` CHECK (`totalBayar` >= 0),
  CONSTRAINT `chk_invoice_diskon` CHECK (`totalDiskon` >= 0 AND `totalDiskon` <= `subtotal`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rincian invoice: snapshot tarif & diskon saat invoice dibuat
CREATE TABLE `invoice_detail` (
  `idInvoiceDetail` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `idInvoice` BIGINT UNSIGNED NOT NULL,
  `namaLayanan` VARCHAR(100) NOT NULL,
  `tarif` DECIMAL(15,2) NOT NULL,
  `diskonPersen` DECIMAL(5,2) NOT NULL DEFAULT 0,
  `potongan` DECIMAL(15,2) NOT NULL DEFAULT 0,
  `subtotal` DECIMAL(15,2) NOT NULL,
  PRIMARY KEY (`idInvoiceDetail`),
  KEY `idx_invoice_detail_invoice` (`idInvoice`),
  CONSTRAINT `fk_invoice_detail_invoice`
    FOREIGN KEY (`idInvoice`) REFERENCES `invoice` (`idInvoice`) ON DELETE CASCADE,
  CONSTRAINT `chk_invoice_detail_diskon` CHECK (`diskonPersen` BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rating dari pasien lewat tautan di invoice: satu penilaian per kunjungan,
-- bintang 1-5 untuk dokter, perawat (bila ada perawat pemeriksa), dan klinik.
CREATE TABLE `rating_kunjungan` (
  `idRating` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `idKunjungan` BIGINT UNSIGNED NOT NULL,
  `idDokter` INT UNSIGNED NOT NULL,
  `idPerawat` INT UNSIGNED NULL,
  `nilaiDokter` TINYINT UNSIGNED NOT NULL COMMENT 'Bintang 1-5',
  `nilaiPerawat` TINYINT UNSIGNED NULL COMMENT 'Bintang 1-5; NULL bila tanpa perawat',
  `nilaiKlinik` TINYINT UNSIGNED NOT NULL COMMENT 'Bintang 1-5',
  `ulasan` TEXT NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`idRating`),
  UNIQUE KEY `uk_rating_kunjungan` (`idKunjungan`),
  KEY `idx_rating_dokter_tanggal` (`idDokter`, `created_at`),
  KEY `idx_rating_perawat_tanggal` (`idPerawat`, `created_at`),
  CONSTRAINT `fk_rating_kunjungan`
    FOREIGN KEY (`idKunjungan`) REFERENCES `kunjungan` (`idKunjungan`) ON DELETE CASCADE,
  CONSTRAINT `fk_rating_dokter`
    FOREIGN KEY (`idDokter`) REFERENCES `karyawan` (`idKaryawan`),
  CONSTRAINT `fk_rating_perawat`
    FOREIGN KEY (`idPerawat`) REFERENCES `karyawan` (`idKaryawan`),
  CONSTRAINT `chk_rating_nilai_dokter` CHECK (`nilaiDokter` BETWEEN 1 AND 5),
  CONSTRAINT `chk_rating_nilai_klinik` CHECK (`nilaiKlinik` BETWEEN 1 AND 5),
  CONSTRAINT `chk_rating_nilai_perawat` CHECK (
    (`idPerawat` IS NULL AND `nilaiPerawat` IS NULL)
    OR (`idPerawat` IS NOT NULL AND `nilaiPerawat` BETWEEN 1 AND 5))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- Jasa pelayanan: tarif persentase, klaim pencairan
-- Blok ini berdiri sendiri (DROP + CREATE) sehingga bisa dijalankan
-- terpisah pada database yang sudah ada tanpa menghapus tabel lain.
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `klaim_jasa_detail`;
DROP TABLE IF EXISTS `klaim_jasa`;
DROP TABLE IF EXISTS `tarif_jasa`;
SET FOREIGN_KEY_CHECKS = 1;

-- Persentase jasa per tindakan medis (layanan) & kategori jabatan.
-- Menyimpan riwayat: tarif yang berlaku untuk suatu kunjungan adalah baris
-- dengan berlakuMulai terbaru yang <= tanggal kunjungan.
CREATE TABLE `tarif_jasa` (
  `idTarif` INT UNSIGNED NOT NULL AUTO_INCREMENT,
  `idLayanan` INT UNSIGNED NOT NULL,
  `jabatan` VARCHAR(20) NOT NULL COMMENT 'dokter / perawat',
  `persentase` DECIMAL(5,2) NOT NULL,
  `berlakuMulai` DATE NOT NULL,
  `dibuatOleh` CHAR(36) NULL COMMENT 'id_user super admin yang menetapkan',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idTarif`),
  UNIQUE KEY `uk_tarif_jasa_berlaku` (`idLayanan`, `jabatan`, `berlakuMulai`),
  CONSTRAINT `fk_tarif_jasa_layanan`
    FOREIGN KEY (`idLayanan`) REFERENCES `layanan` (`idLayanan`) ON DELETE CASCADE,
  CONSTRAINT `fk_tarif_jasa_user`
    FOREIGN KEY (`dibuatOleh`) REFERENCES `users` (`id_user`) ON DELETE SET NULL,
  CONSTRAINT `chk_tarif_jasa_jabatan`
    CHECK (`jabatan` IN ('dokter', 'perawat')),
  CONSTRAINT `chk_tarif_jasa_persentase`
    CHECK (`persentase` BETWEEN 0 AND 100)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pengajuan klaim pencairan jasa oleh karyawan
CREATE TABLE `klaim_jasa` (
  `idKlaim` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  `idKaryawan` INT UNSIGNED NOT NULL,
  `totalNominal` DECIMAL(15,2) NOT NULL,
  `status` VARCHAR(20) NOT NULL DEFAULT 'diajukan',
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idKlaim`),
  KEY `idx_klaim_jasa_karyawan_status` (`idKaryawan`, `status`),
  CONSTRAINT `fk_klaim_jasa_karyawan`
    FOREIGN KEY (`idKaryawan`) REFERENCES `karyawan` (`idKaryawan`),
  CONSTRAINT `chk_klaim_jasa_status`
    CHECK (`status` IN ('diajukan', 'disetujui', 'ditolak', 'dicairkan')),
  CONSTRAINT `chk_klaim_jasa_total`
    CHECK (`totalNominal` >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Rincian klaim: satu baris per tindakan (kunjungan_layanan). Nominal disimpan
-- sebagai snapshot supaya perubahan tarif/biaya tidak mengubah klaim lama.
CREATE TABLE `klaim_jasa_detail` (
  `idKlaim` BIGINT UNSIGNED NOT NULL,
  `idKunjunganLayanan` BIGINT UNSIGNED NOT NULL,
  `biayaTindakan` DECIMAL(15,2) NOT NULL,
  `persentase` DECIMAL(5,2) NOT NULL,
  `nominal` DECIMAL(15,2) NOT NULL,
  PRIMARY KEY (`idKlaim`, `idKunjunganLayanan`),
  KEY `idx_klaim_jasa_detail_tindakan` (`idKunjunganLayanan`),
  CONSTRAINT `fk_klaim_jasa_detail_klaim`
    FOREIGN KEY (`idKlaim`) REFERENCES `klaim_jasa` (`idKlaim`) ON DELETE CASCADE,
  CONSTRAINT `fk_klaim_jasa_detail_tindakan`
    FOREIGN KEY (`idKunjunganLayanan`) REFERENCES `kunjungan_layanan` (`idKunjunganLayanan`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
