import type { KaryawanDetail } from "./karyawan";

/** Satu titik data bulanan; `bulan` berformat "YYYY-MM" */
export interface NilaiBulanan {
  bulan: string;
  nilai: number | null; // null = tidak ada data di bulan itu
}

export interface UlasanDokter {
  idRating: number;
  nilai: number;
  ulasan: string;
  tanggal: string;
}

export interface RatingDokterStats {
  rataRata: number | null; // null = belum ada rating
  jumlahUlasan: number;
  /** index 0 = bintang 1 ... index 4 = bintang 5 */
  distribusi: [number, number, number, number, number];
  ratingPerBulan: NilaiBulanan[];
  ulasanTerbaru: UlasanDokter[];
}

export interface LayananDitangani {
  namaLayanan: string;
  jumlah: number;
}

export interface KinerjaDokter {
  pasienDitangani: number;
  pasienPerBulan: NilaiBulanan[];
  layananDitangani: LayananDitangani[];
}

export interface PeriodeKinerja {
  bulan: number; // jumlah bulan ke belakang (termasuk bulan ini)
  mulai: string; // "YYYY-MM-01"
  daftarBulan: string[]; // ["2026-06", ..., "2026-11"]
}

export interface KaryawanDetailPageData {
  karyawan: KaryawanDetail;
  periode: PeriodeKinerja;
  rating: RatingDokterStats;
  kinerja: KinerjaDokter;
}
