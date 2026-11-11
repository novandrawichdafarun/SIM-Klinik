import z from "zod";
const text = (label: string, max: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} wajib diisi`)
    .max(max, `${label} maksimal ${max} karakter`);
const money = (label: string) =>
  z.preprocess(
    (v) => Number(v),
    z
      .number({ error: `${label} tidak valid` })
      .finite()
      .min(0, `${label} tidak boleh negatif`)
      .max(999999999),
  );
// Kode layanan tidak diterima dari form: dibuat otomatis oleh server & tidak bisa diubah.
export const layananSchema = z
  .object({
    namaLayanan: text("Nama layanan", 100),
    idPoli: z.preprocess(
      (v) => Number(v),
      z.number().int().positive("Pilih poli"),
    ),
    kategori: text("Kategori", 50),
    tarif: money("Tarif"),
    deskripsi: z.string().trim().max(1000),
    statusAktif: z.preprocess((v) => v === "1", z.boolean()),
    diskonAktif: z.preprocess((v) => v === "1", z.boolean()),
    namaEvent: z.string().trim().max(100),
    // Diskon event selalu dalam persen
    nilaiDiskon: z.preprocess(
      (v) => Number(v),
      z
        .number({ error: "Nilai diskon tidak valid" })
        .finite()
        .min(0, "Nilai diskon tidak boleh negatif")
        .max(100, "Diskon maksimal 100%"),
    ),
    mulaiDiskon: z.string(),
    selesaiDiskon: z.string(),
  })
  .superRefine((d, ctx) => {
    if (!d.diskonAktif) return;
    if (!d.namaEvent)
      ctx.addIssue({
        code: "custom",
        path: ["namaEvent"],
        message: "Nama event wajib diisi",
      });
    if (d.nilaiDiskon <= 0)
      ctx.addIssue({
        code: "custom",
        path: ["nilaiDiskon"],
        message: "Nilai diskon harus lebih dari 0%",
      });
    if (!d.mulaiDiskon || !d.selesaiDiskon)
      ctx.addIssue({
        code: "custom",
        path: ["mulaiDiskon"],
        message: "Periode diskon wajib diisi",
      });
    if (d.mulaiDiskon > d.selesaiDiskon)
      ctx.addIssue({
        code: "custom",
        path: ["selesaiDiskon"],
        message: "Tanggal selesai harus setelah tanggal mulai",
      });
  });
export type LayananInput = z.infer<typeof layananSchema>;
