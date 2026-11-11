import { z } from "zod";

const bintang = (label: string) =>
  z.coerce
    .number({ message: `Beri bintang untuk ${label}` })
    .int()
    .min(1, `Beri bintang untuk ${label}`)
    .max(5, `Bintang ${label} maksimal 5`);

/** Rating pasien: bintang 1-5 untuk dokter, perawat (bila ada), dan klinik */
export const ratingSchema = z.object({
  nilaiDokter: bintang("dokter"),
  nilaiPerawat: z.preprocess(
    (v) => (v === "" || v === null || v === undefined ? null : v),
    bintang("perawat").nullable(),
  ),
  nilaiKlinik: bintang("klinik"),
  ulasan: z.preprocess(
    (v) => (typeof v === "string" ? v.trim() : ""),
    z
      .string()
      .max(1000, "Ulasan maksimal 1000 karakter")
      .transform((v) => (v === "" ? null : v)),
  ),
});
export type RatingInput = z.infer<typeof ratingSchema>;
