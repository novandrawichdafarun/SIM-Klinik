-- Hak penuh modul pasien dan katalog layanan untuk admin aktif pada data seed.
-- Aman dijalankan berulang; akun Yuli Hartati (nonaktif) sengaja tidak disertakan.
START TRANSACTION;

INSERT IGNORE INTO `hak_akses`
  (`id_user`, `kodeFitur`, `bisaLihat`, `bisaTambah`, `bisaUbah`, `bisaHapus`, `diubahOleh`)
VALUES
  ('10000000-0000-4000-8000-000000000002', 'rekap_pasien', TRUE, TRUE, TRUE, TRUE, '10000000-0000-4000-8000-000000000003'),
  ('10000000-0000-4000-8000-000000000002', 'input_pasien', TRUE, TRUE, TRUE, TRUE, '10000000-0000-4000-8000-000000000003'),
  ('10000000-0000-4000-8000-000000000002', 'katalog_layanan', TRUE, TRUE, TRUE, TRUE, '10000000-0000-4000-8000-000000000003'),
  ('10000000-0000-4000-8000-000000000004', 'rekap_pasien', TRUE, TRUE, TRUE, TRUE, '10000000-0000-4000-8000-000000000003'),
  ('10000000-0000-4000-8000-000000000004', 'input_pasien', TRUE, TRUE, TRUE, TRUE, '10000000-0000-4000-8000-000000000003'),
  ('10000000-0000-4000-8000-000000000004', 'katalog_layanan', TRUE, TRUE, TRUE, TRUE, '10000000-0000-4000-8000-000000000003');

UPDATE `hak_akses`
   SET `bisaLihat` = TRUE,
       `bisaTambah` = TRUE,
       `bisaUbah` = TRUE,
       `bisaHapus` = TRUE,
       `diubahOleh` = '10000000-0000-4000-8000-000000000003'
 WHERE `id_user` IN (
         '10000000-0000-4000-8000-000000000002',
         '10000000-0000-4000-8000-000000000004'
       )
   AND `kodeFitur` IN ('rekap_pasien', 'input_pasien', 'katalog_layanan');

COMMIT;
