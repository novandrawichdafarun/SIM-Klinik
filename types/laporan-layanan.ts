export type LaporanLayananFilter = { mulai: string; selesai: string; poli: string };
export type LaporanLayanan = {
  filter: LaporanLayananFilter;
  ringkasan: { totalPendapatan: number; jumlahLayanan: number; poliTertinggi: string; rataRata: number };
  pendapatanPoli: { poli: string; pendapatan: number; persentase: number }[];
  trenMingguan: { label: string; poli: string; pendapatan: number }[];
  rekap: { namaLayanan: string; poli: string; tarif: number; jumlah: number; pendapatan: number; porsi: number }[];
};
