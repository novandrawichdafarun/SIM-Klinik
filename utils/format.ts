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

export const JABATAN_PIMPINAN = "Pimpinan Klinik";

/** Jabatan Pimpinan Klinik selalu memakai akun Super Admin */
export function isJabatanPimpinan(jenisKaryawan: string | null | undefined): boolean {
  return (jenisKaryawan ?? "").trim().toLowerCase() === JABATAN_PIMPINAN.toLowerCase();
}

/** Jabatan berawalan "Dokter" / "dr." / "drg." dianggap dokter (punya rating & rekam medis) */
export function isJabatanDokter(jenisKaryawan: string | null | undefined): boolean {
  return /^(dokter|dr\.?|drg\.?)\b/i.test((jenisKaryawan ?? "").trim());
}
