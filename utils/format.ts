import type { UserRole } from "@/types/auth";

export const ROLE_LABEL: Record<UserRole, string> = {
  super_admin: "Super Admin",
  admin: "Admin",
  dokter: "Dokter",
};

export const ROLE_OPTIONS = Object.entries(ROLE_LABEL) as [UserRole, string][];

export function roleLabel(role: string | null | undefined): string {
  if (!role) return "-";
  return ROLE_LABEL[role as UserRole] ?? role;
}

/** "dr. Farhan Maulana" → "FM", "drg. Sarah Ramadhani, Sp.KG" → "SR" */
export function getInitials(name: string | null | undefined): string {
  if (!name) return "?";
  return (
    name
      .replace(/^(dr|drg)\.\s*/i, "")
      .split(",")[0]
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join("") || "?"
  );
}

const BULAN_PENDEK = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

/** "2026-10" → "Okt" */
export function labelBulan(yyyyMm: string): string {
  const month = Number(yyyyMm.slice(5, 7));
  return BULAN_PENDEK[month - 1] ?? yyyyMm;
}

/**
 * Format TIMESTAMP MySQL ("2026-10-14 08:12:00") → "14 Okt 2026, 08.12".
 * Sengaja tanpa konversi zona waktu: nilai ditampilkan apa adanya dari DB.
 */
export function formatTanggalWaktu(value: string | null | undefined): string {
  if (!value) return "-";
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(value);
  if (!match) return value;
  const [, y, m, d, hh, mm] = match;
  return `${d} ${BULAN_PENDEK[Number(m) - 1]} ${y}, ${hh}.${mm}`;
}

/** "2026-10-31 ..." → "31 Okt 2026" */
export function formatTanggal(value: string | null | undefined): string {
  if (!value) return "-";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return value;
  const [, y, m, d] = match;
  return `${d} ${BULAN_PENDEK[Number(m) - 1]} ${y}`;
}

/** 4.666 → "4,7" */
export function formatDesimal(value: number, digits = 1): string {
  return value.toLocaleString("id-ID", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

/** NIP otomatis dari idKaryawan: 7 → "KRY-0007". Sama dengan rumus di migrasi SQL. */
export function generateNip(idKaryawan: number): string {
  return `KRY-${String(idKaryawan).padStart(4, "0")}`;
}

/** Kode layanan otomatis dari idLayanan: 7 → "LYN-007". Sama dengan format di Seed.sql. */
export function generateKodeLayanan(idLayanan: number): string {
  return `LYN-${String(idLayanan).padStart(3, "0")}`;
}

/** No. RM otomatis dari idPasien: 89255 → "RM-089255" */
export function generateNoRM(idPasien: number): string {
  return `RM-${String(idPasien).padStart(6, "0")}`;
}

/** "3174052309920003" → "3174••••••••0003" */
export function maskNik(nik: string): string {
  return nik.length === 16 ? `${nik.slice(0, 4)}${"•".repeat(8)}${nik.slice(-4)}` : nik;
}

const HARI = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];

/** "2026-11-02" → "Senin, 02 Nov 2026" */
export function formatHariTanggal(yyyyMmDd: string): string {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  const hari = HARI[new Date(y, m - 1, d).getDay()];
  return `${hari}, ${formatTanggal(yyyyMmDd)}`;
}

/** Umur dalam tahun dari tanggal lahir YYYY-MM-DD */
export function hitungUsia(tanggalLahir: string | null, today = new Date()): number | null {
  if (!tanggalLahir) return null;
  const [y, m, d] = tanggalLahir.split("-").map(Number);
  let usia = today.getFullYear() - y;
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < d)) usia--;
  return usia;
}

/** Tanggal hari ini (zona waktu server) dalam format YYYY-MM-DD */
export function hariIni(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export const JABATAN_PIMPINAN = "Pimpinan Klinik";

/** Jabatan Pimpinan Klinik selalu memakai akun Super Admin */
export function isJabatanPimpinan(jenisKaryawan: string | null | undefined): boolean {
  return (jenisKaryawan ?? "").trim().toLowerCase() === JABATAN_PIMPINAN.toLowerCase();
}

/** Jabatan berawalan "Dokter" / "dr." / "drg." dianggap dokter (punya rating & rekam medis) */
export function isJabatanDokter(jenisKaryawan: string | null | undefined): boolean {
  return /^(dokter|dr\.?|drg\.?)\b/i.test((jenisKaryawan ?? "").trim());
}

/** 160000 → "Rp 160.000" */
export function formatRupiah(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return `Rp ${Math.round(value).toLocaleString("id-ID")}`;
}

const BULAN_PANJANG = [
  "Januari", "Februari", "Maret", "April", "Mei", "Juni",
  "Juli", "Agustus", "September", "Oktober", "November", "Desember",
];

/** "2026-10" → "Oktober 2026" */
export function labelBulanTahun(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-");
  return `${BULAN_PANJANG[Number(m) - 1] ?? m} ${y}`;
}

/**
 * Kategori jabatan untuk tarif jasa pelayanan:
 * dokter (termasuk Pimpinan Klinik yang juga dokter Poli Umum) atau perawat/bidan.
 * Jabatan lain (administrasi, kasir, dll.) tidak mendapat jasa pelayanan.
 */
export function kategoriJabatanJasa(
  jenisKaryawan: string | null | undefined,
): "dokter" | "perawat" | null {
  if (isJabatanDokter(jenisKaryawan) || isJabatanPimpinan(jenisKaryawan)) return "dokter";
  if (/perawat|bidan/i.test(jenisKaryawan ?? "")) return "perawat";
  return null;
}
