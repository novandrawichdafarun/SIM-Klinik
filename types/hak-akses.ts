import type { UserRole } from "./auth";

export type AksiHakAkses = "lihat" | "tambah" | "ubah" | "hapus";

export const AKSI_HAK_AKSES: AksiHakAkses[] = ["lihat", "tambah", "ubah", "hapus"];

/** Kode fitur, sama dengan isi tabel `fitur` */
export type KodeFitur =
  | "rekap_pasien"
  | "input_pasien"
  | "arus_kas"
  | "reimburse"
  | "invoice_digital"
  | "katalog_layanan"
  | "kelola_karyawan"
  | "kinerja_jasa"
  | "dasbor_eksekutif"
  | "kelola_hak_akses";

export interface Fitur {
  kodeFitur: string;
  namaFitur: string;
  deskripsi: string | null;
  grup: string;
  khususSuperAdmin: boolean;
}

export type IzinFitur = Record<AksiHakAkses, boolean>;

/** kodeFitur -> izin */
export type MatriksHakAkses = Record<string, IzinFitur>;

export interface PenggunaHakAkses {
  idUser: string;
  role: UserRole;
  isActive: boolean;
  namaLengkap: string | null;
  email: string;
  NIP: string | null;
  jenisKaryawan: string | null;
  namaPoli: string | null;
  jumlahFiturAktif: number;
}

export interface DetailHakAkses {
  pengguna: PenggunaHakAkses;
  matriks: MatriksHakAkses;
  terakhirDiubah: { waktu: string; oleh: string | null } | null;
}
