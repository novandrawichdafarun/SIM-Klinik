SET NAMES utf8mb4;
SET SQL_MODE = 'STRICT_TRANS_TABLES,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

SET FOREIGN_KEY_CHECKS = 0;

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
  `id_user` CHAR(36) NOT NULL,
  `namaLengkap` VARCHAR(100) NOT NULL,
  `jenisKaryawan` VARCHAR(100) NOT NULL,
  `statusAktif` BOOLEAN NOT NULL DEFAULT TRUE,
  `STR` VARCHAR(255) NULL,
  `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`idKaryawan`),
  UNIQUE KEY `uk_karyawan_user` (`id_user`),
  KEY `idx_karyawan_jenis_status` (`jenisKaryawan`, `statusAktif`),
  CONSTRAINT `fk_karyawan_user`
    FOREIGN KEY (`id_user`) REFERENCES `users` (`id_user`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
