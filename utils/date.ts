export const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

export const BULAN_PENDEK = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

export const HARI = [
  "Minggu",
  "Senin",
  "Selasa",
  "Rabu",
  "Kamis",
  "Jumat",
  "Sabtu",
];

/** "2026-10" → "Okt" */
export function labelBulan(yyyyMm: string): string {
  const month = Number(yyyyMm.slice(5, 7));
  return BULAN_PENDEK[month - 1] ?? yyyyMm;
}

/** "2026-10" → "Oktober 2026" */
export function labelBulanTahun(yyyyMm: string): string {
  const [y, m] = yyyyMm.split("-");
  return `${BULAN[Number(m) - 1] ?? m} ${y}`;
}

export function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

/** "1992-09-23" → "23 September 1992" */
export const tanggalPanjang = (v: string | null) => {
  if (!v) return "-";
  const [y, m, d] = v.split("-");
  return `${Number(d)} ${BULAN[Number(m) - 1]} ${y}`;
};

/** Tanggal hari ini (zona waktu server) dalam format YYYY-MM-DD */
export function hariIni(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
