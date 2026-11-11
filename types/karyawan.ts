import type { UserRole } from "./auth";

/** Satu baris di tabel Kelola Karyawan */
export interface Karyawan {
  idKaryawan: number;
  namaLengkap: string;
  NIP: string;
  NIK: string;
  jenisKaryawan: string; // jabatan
  noHp: string | null;
  statusAktif: boolean;
  STR: string | null;
  SIP: string | null;
  idUser: string | null; // NULL = belum punya akun
  role: UserRole | null; // NULL = belum punya akun
  akunAktif: boolean | null;
  namaPoli: string; // unit kerja: Poli Umum / Poli Gigi
}

export interface KaryawanListParams {
  q: string;
  page: number;
  pageSize: number;
}

export interface KaryawanListResult {
  items: Karyawan[];
  total: number;
  page: number;
  pageSize: number;
}

/** Data lengkap untuk form ubah karyawan */
export interface KaryawanFormValues {
  idKaryawan?: number;
  namaLengkap: string;
  NIP: string;
  NIK: string;
  jenisKaryawan: string;
  idPoli: number | null; // null hanya untuk form tambah yang masih kosong
  noHp: string | null;
  STR: string | null;
  SIP: string | null;
  statusAktif: boolean;
}

export interface Poli {
  idPoli: number;
  namaPoli: string;
}

/** Halaman detail karyawan */
export interface KaryawanDetail extends Karyawan {
  idPoli: number;
  email: string | null;
  lastLoginAt: string | null;
  jumlahFiturAktif: number;
}

export interface KaryawanOption {
  idKaryawan: number;
  namaLengkap: string;
  jenisKaryawan: string;
  namaPoli: string;
}
