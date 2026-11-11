import z from "zod";
const text = (label: string, max: number) => z.string().trim().min(1, `${label} wajib diisi`).max(max, `${label} maksimal ${max} karakter`);
const money = (label: string) => z.preprocess((v) => Number(v), z.number({ error: `${label} tidak valid` }).finite().min(0, `${label} tidak boleh negatif`).max(999999999));
export const layananSchema = z.object({
  namaLayanan: text("Nama layanan", 100), kodeLayanan: text("Kode layanan", 20).regex(/^[A-Z0-9-]+$/, "Kode layanan hanya boleh huruf, angka, dan tanda hubung"),
  idPoli: z.preprocess((v) => Number(v), z.number().int().positive("Pilih poli")), kategori: text("Kategori", 50), tarif: money("Tarif"),
  estimasiDurasi: z.preprocess((v) => Number(v), z.number().int().positive("Durasi harus lebih dari 0").max(1440)), deskripsi: z.string().trim().max(1000),
  statusAktif: z.preprocess((v) => v === "1", z.boolean()), diskonAktif: z.preprocess((v) => v === "1", z.boolean()), namaEvent: z.string().trim().max(100),
  jenisDiskon: z.enum(["persen", "nominal"]), nilaiDiskon: money("Nilai diskon"), mulaiDiskon: z.string(), selesaiDiskon: z.string(),
}).superRefine((d, ctx) => { if (!d.diskonAktif) return; if (!d.namaEvent) ctx.addIssue({ code: "custom", path: ["namaEvent"], message: "Nama event wajib diisi" }); if (d.jenisDiskon === "persen" && d.nilaiDiskon > 100) ctx.addIssue({ code: "custom", path: ["nilaiDiskon"], message: "Diskon persen maksimal 100%" }); if (!d.mulaiDiskon || !d.selesaiDiskon) ctx.addIssue({ code: "custom", path: ["mulaiDiskon"], message: "Periode diskon wajib diisi" }); if (d.mulaiDiskon > d.selesaiDiskon) ctx.addIssue({ code: "custom", path: ["selesaiDiskon"], message: "Tanggal selesai harus setelah tanggal mulai" }); });
export type LayananInput = z.infer<typeof layananSchema>;
