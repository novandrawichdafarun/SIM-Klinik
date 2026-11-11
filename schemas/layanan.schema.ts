import z from "zod";

export const layananSchema = z.object({
  namaLayanan: z.string().trim().min(1, "Nama layanan wajib diisi").max(100),
  idPoli: z.preprocess((v) => Number(v), z.number().int().positive("Pilih poli")),
  kategori: z.string().trim().min(1, "Kategori wajib diisi").max(50),
  tarif: z.preprocess((v) => Number(v), z.number().finite().min(0, "Tarif tidak boleh negatif")),
  diskon: z.preprocess((v) => Number(v), z.number().finite().min(0).max(100, "Diskon maksimal 100%")),
});

export type LayananInput = z.infer<typeof layananSchema>;
