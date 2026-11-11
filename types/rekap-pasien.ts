export type StatusKunjungan = "menunggu" | "selesai" | "batal";

export const JENIS_PENJAMIN = ["Umum", "BPJS Kesehatan (JKN)", "Asuransi Swasta"] as const;
export const GOLONGAN_DARAH = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const;
export const STATUS_PERNIKAHAN = ["Belum menikah", "Menikah", "Cerai hidup", "Cerai mati"] as const;
export const AGAMA = [
  "Islam",
  "Kristen",
  "Katolik",
  "Hindu",
  "Buddha",
  "Konghucu",
  "Lainnya",
] as const;

/** Data lengkap pasien (tab Identitas & form) */
export interface Pasien {
  idPasien: number;
  NoRM: string;
  namaLengkap: string;
  NIK: string;
  jenisKelamin: "L" | "P";
  tempatLahir: string | null;
  tanggalLahir: string | null; // YYYY-MM-DD
  golonganDarah: string | null;
  statusPernikahan: string | null;
  agama: string | null;
  pekerjaan: string | null;
  noHp: string | null;
  email: string | null;
  alamat: string | null;
  alamatDomisili: string | null;
  kecamatan: string | null;
  kotaKabupaten: string | null;
  provinsi: string | null;
  jenisPenjamin: string;
  noBpjs: string | null;
  fktpAsal: string | null;
  createdAt: string;
}

/** Baris tab "Kunjungan Hari Ini" */
export interface KunjunganItem {
  idKunjungan: number;
  kodeKunjungan: string;
  tanggal: string; // YYYY-MM-DD
  jam: string; // HH:MM
  status: StatusKunjungan;
  idPasien: number;
  namaPasien: string;
  NoRM: string;
  NIK: string;
  noBpjs: string | null;
  /** Semua layanan/tindakan kunjungan (diisi dokter), dipisah koma; "" = belum ada */
  namaLayanan: string;
  idPoli: number;
  namaPoli: string;
  idDokter: number | null;
  namaDokter: string | null;
  /** Perawat yang membantu (dipilih saat pendaftaran) */
  idPerawat: number | null;
  namaPerawat: string | null;
  /** true = pengguna boleh membuka halaman Pemeriksaan & Diagnosa kunjungan ini */
  bisaPeriksa: boolean;
}

/** Baris tab "Pasien Saya" / "Semua Pasien" */
export interface PasienRingkas {
  idPasien: number;
  NoRM: string;
  namaLengkap: string;
  NIK: string;
  noBpjs: string | null;
  pemeriksaanTerakhir: string | null; // YYYY-MM-DD
  diagnosaTerakhir: string | null; // null bila pengguna bukan dokter
}

/** Baris tab "Riwayat Penanganan" di detail pasien */
export interface RiwayatPenanganan {
  idKunjungan: number;
  kodeKunjungan: string;
  tanggal: string;
  jam: string;
  namaPoli: string;
  namaLayanan: string;
  namaDokter: string | null;
  namaPerawat: string | null;
  status: StatusKunjungan;
  diagnosa: string | null; // null bila pengguna bukan dokter
}

export interface PetugasOption {
  idKaryawan: number;
  namaLengkap: string;
  idPoli: number;
}

export interface PoliOption {
  idPoli: number;
  namaPoli: string;
}

/** Akses pengguna terhadap modul rekap pasien */
export interface AksesRekap {
  bisaTambahPasien: boolean;
  bisaUbahPasien: boolean;
  bisaHapusPasien: boolean;
  bisaLihatSemuaPasien: boolean;
  bisaLihatDiagnosa: boolean;
  /** Tab "Kunjungan Hari Ini" (tugas admin/perawat); dokter hanya melihat "Pasien Saya" */
  bisaLihatKunjungan: boolean;
}

/** Kunjungan dokter yang belum didiagnosa (ditampilkan di tab "Pasien Saya" dokter) */
export interface AntreanDiagnosa extends KunjunganItem {
  /** Perawat sudah mengisi tab Pemeriksaan → diagnosa bisa diisi */
  sudahDiperiksa: boolean;
}

/** Layanan yang bisa ditambahkan sebagai tindakan (poli yang sama dengan kunjungan) */
export interface TindakanOption {
  idLayanan: number;
  kodeLayanan: string;
  namaLayanan: string;
  kategori: string;
}

/** Data untuk halaman Pemeriksaan & Diagnosa */
export interface PemeriksaanData {
  kunjungan: KunjunganItem;
  /** Peran pengguna di kunjungan ini */
  peran: "dokter" | "perawat";
  /** Tab Pemeriksaan boleh diubah (perawat, atau dokter penanggung jawab) */
  bisaUbahPemeriksaan: boolean;
  /** Tab Diagnosa terbuka (hanya dokter penanggung jawab) */
  bisaDiagnosa: boolean;
  /** Sudah ada jasa yang diklaim → data dikunci */
  terkunci: boolean;
  namaPerawat: string | null;
  layananOptions: TindakanOption[];
  pemeriksaan: {
    tekananDarah: string;
    suhu: string;
    nadi: string;
    lajuNapas: string;
    beratBadan: string;
    tinggiBadan: string;
    keluhan: string;
  };
  diagnosa: {
    diagnosa: string;
    catatanDokter: string;
    layanan: number[];
  };
}
