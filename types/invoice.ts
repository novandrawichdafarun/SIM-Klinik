/** Kunjungan selesai yang bisa/sudah dibuatkan invoice (halaman Invoice Digital) */
export interface KunjunganTagihan {
  idKunjungan: number;
  kodeKunjungan: string;
  tanggal: string; // YYYY-MM-DD
  jam: string; // HH:MM
  namaPasien: string;
  NoRM: string;
  noHp: string | null;
  jenisPenjamin: string;
  namaLayanan: string;
  namaDokter: string | null;
  /** Total invoice bila sudah dibuat, atau perkiraan dari tarif & diskon saat ini */
  total: number;
  idInvoice: number | null;
  nomorInvoice: string | null;
  statusKirim: boolean;
  sudahRating: boolean;
}

export interface RingkasanInvoice {
  kunjunganSelesai: number;
  invoiceDibuat: number;
  terkirim: number;
  ratingMasuk: number;
  /** Rata-rata rating klinik 30 hari terakhir; null = belum ada */
  rataKlinik: number | null;
}

export interface InvoiceHarianData {
  tanggal: string;
  items: KunjunganTagihan[];
  ringkasan: RingkasanInvoice;
  bisaBuat: boolean;
}

export interface InvoiceItem {
  namaLayanan: string;
  tarif: number;
  diskonPersen: number;
  potongan: number;
  subtotal: number;
}

export interface RatingKunjungan {
  nilaiDokter: number;
  nilaiPerawat: number | null;
  nilaiKlinik: number;
  ulasan: string | null;
  createdAt: string;
}

/** Invoice lengkap. Versi publik (dilihat pasien) tidak berisi noHp & data internal. */
export interface InvoiceData {
  idInvoice: number;
  nomorInvoice: string;
  tanggal: string;
  kodeKunjungan: string;
  tglKunjungan: string;
  namaPasien: string;
  NoRM: string;
  noHp: string | null;
  jenisPenjamin: string;
  namaPoli: string;
  namaDokter: string | null;
  namaPerawat: string | null;
  items: InvoiceItem[];
  subtotal: number;
  totalDiskon: number;
  totalBayar: number;
  token: string;
  statusKirim: boolean;
  waktuKirim: string | null;
  rating: RatingKunjungan | null;
}

export interface InvoiceDetailData {
  invoice: InvoiceData;
  bisaKirim: boolean;
}
