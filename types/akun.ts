import type { UserRole } from "./auth";

export type StatusAkunFilter = "semua" | "aktif" | "nonaktif";

export interface Akun {
  idUser: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  lastLoginAt: string | null;
  idKaryawan: number | null;
  namaLengkap: string | null;
  jenisKaryawan: string | null;
  namaPoli: string | null;
}

export interface AkunListParams {
  q: string;
  status: StatusAkunFilter;
}
