export type ServiceDiscountType = "persen" | "nominal";
export type ServiceDiscount = { enabled: boolean; eventName: string; type: ServiceDiscountType; value: number; startDate: string; endDate: string };
export type Layanan = { id: number; code: string; name: string; poliId: number; poli: string; category: string; price: number; duration: number; description: string; active: boolean; discount: ServiceDiscount };
