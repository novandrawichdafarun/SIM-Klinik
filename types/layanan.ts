/** Diskon event selalu dalam persen (0-100) dari tarif */
export type ServiceDiscount = {
  enabled: boolean;
  eventName: string;
  value: number;
  startDate: string;
  endDate: string;
};
export type Layanan = {
  id: number;
  /** Dibuat otomatis (LYN-001) dan tidak bisa diubah */
  code: string;
  name: string;
  poliId: number;
  poli: string;
  category: string;
  price: number;
  description: string;
  active: boolean;
  discount: ServiceDiscount;
};
