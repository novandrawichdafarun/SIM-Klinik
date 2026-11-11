-- Jalankan sekali pada database lama yang sudah dibuat sebelum modul Katalog Layanan.
ALTER TABLE layanan
  ADD COLUMN IF NOT EXISTS kodeLayanan VARCHAR(20) NOT NULL DEFAULT '' AFTER idKeuangan,
  ADD COLUMN IF NOT EXISTS kategori VARCHAR(50) NOT NULL DEFAULT 'Pemeriksaan' AFTER namaLayanan,
  ADD COLUMN IF NOT EXISTS tarif DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER kategori,
  ADD COLUMN IF NOT EXISTS estimasiDurasi SMALLINT UNSIGNED NOT NULL DEFAULT 15 AFTER tarif,
  ADD COLUMN IF NOT EXISTS deskripsi TEXT NULL AFTER estimasiDurasi,
  ADD COLUMN IF NOT EXISTS statusAktif BOOLEAN NOT NULL DEFAULT TRUE AFTER deskripsi,
  ADD COLUMN IF NOT EXISTS diskonAktif BOOLEAN NOT NULL DEFAULT FALSE AFTER diskon,
  ADD COLUMN IF NOT EXISTS namaEvent VARCHAR(100) NULL AFTER diskonAktif,
  ADD COLUMN IF NOT EXISTS jenisDiskon ENUM('persen', 'nominal') NOT NULL DEFAULT 'persen' AFTER namaEvent,
  ADD COLUMN IF NOT EXISTS nilaiDiskon DECIMAL(15,2) NOT NULL DEFAULT 0 AFTER jenisDiskon,
  ADD COLUMN IF NOT EXISTS mulaiDiskon DATE NULL AFTER nilaiDiskon,
  ADD COLUMN IF NOT EXISTS selesaiDiskon DATE NULL AFTER mulaiDiskon;
UPDATE layanan SET kodeLayanan = CONCAT('LYN-', LPAD(idLayanan, 3, '0')) WHERE kodeLayanan = '';
ALTER TABLE layanan ADD UNIQUE KEY IF NOT EXISTS uk_layanan_kode (kodeLayanan);
