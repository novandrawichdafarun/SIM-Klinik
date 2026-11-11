/** Kategori jabatan penerima jasa pelayanan (kolom tarif_jasa.jabatan) */
export type JabatanJasa = "dokter" | "perawat";

export const JABATAN_JASA_OPTIONS: { value: JabatanJasa; label: string }[] = [
  { value: "dokter", label: "Dokter" },
  { value: "perawat", label: "Perawat" },
];

/** Satu layanan di halaman Tarif Jasa: pembagian persentase yang sedang berlaku */
export interface TarifLayanan {
  idLayanan: number;
  kodeLayanan: string;
  namaLayanan: string;
  namaPoli: string;
  aktif: boolean;
  biaya: number;
  persenDokter: number | null; // null = belum ditetapkan
  persenPerawat: number | null;
  berlakuMulai: string | null; // YYYY-MM-DD
}

export interface TarifJasaPageData {
  layanan: TarifLayanan[];
}

export type StatusPerolehan = "belum_diklaim" | "diklaim";

/** Satu tindakan yang ditangani karyawan beserta jasa pelayanannya */
export interface PerolehanJasa {
  /** id tindakan (kunjungan_layanan) */
  idItem: number;
  /** Peran karyawan pada tindakan ini (menentukan persentase yang dipakai) */
  peran: JabatanJasa;
  tanggal: string; // YYYY-MM-DD
  namaLayanan: string;
  biaya: number;
  persentase: number;
  nominal: number;
  status: StatusPerolehan;
  statusKlaim: string | null; // diajukan / disetujui / dicairkan
}

export interface RingkasanPerolehan {
  total: number;
  jumlahDihitung: number;
  belumDiklaim: number;
  jumlahBelumDiklaim: number;
  sudahDiklaim: number;
  jumlahSudahDiklaim: number;
}

export interface JasaPelayananData {
  bulan: string; // YYYY-MM
  daftarBulan: string[];
  namaKaryawan: string;
  jabatan: JabatanJasa | null; // null = jabatan tidak mendapat jasa pelayanan
  items: PerolehanJasa[];
  ringkasan: RingkasanPerolehan;
}
