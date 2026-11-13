export type LaporanLayananFilter = {
  mulai: string;
  selesai: string;
  poli: string;
};

export type LaporanLayanan = {
  filter: LaporanLayananFilter;
  ringkasan: {
    totalPendapatan: number;
    jumlahLayanan: number;
    layananTertinggi: string;
    poliTertinggi: string;
    rataRata: number;
  };
  pendapatanPoli: Array<{
    poli: string;
    pendapatan: number;
    persentase: number;
  }>;
  trenMingguan: Array<{
    label: string;
    poli: string;
    pendapatan: number;
  }>;
  rekap: Array<{
    namaLayanan: string;
    poli: string;
    tarif: number;
    jumlah: number;
    pendapatan: number;
    persentase: number;
    peringkat: number;
  }>;
};
