import z from "zod";

const persen = (label: string) =>
  z.preprocess(
    (v) => (v === "" || v == null ? 0 : Number(String(v).replace(",", "."))),
    z
      .number({ error: `Persentase ${label} tidak valid` })
      .min(0, `Persentase ${label} minimal 0`)
      .max(100, `Persentase ${label} maksimal 100`)
      .refine((n) => Math.round(n * 100) === n * 100, "Maksimal 2 angka di belakang koma"),
  );

/** Pembagian jasa satu layanan; sisa (100 − dokter − perawat) = pemasukan klinik */
export const pembagianJasaSchema = z
  .object({
    idLayanan: z.preprocess(
      (v) => (v === "" || v == null ? undefined : Number(v)),
      z.number({ error: "Layanan tidak valid" }).int().positive("Layanan tidak valid"),
    ),
    persenDokter: persen("dokter"),
    persenPerawat: persen("perawat"),
  })
  .refine((d) => d.persenDokter + d.persenPerawat <= 100, {
    message: "Total persentase dokter dan perawat tidak boleh lebih dari 100%",
    path: ["persenPerawat"],
  });

export const klaimJasaSchema = z
  .array(z.number().int().positive())
  .min(1, "Pilih minimal satu perolehan untuk diklaim")
  .max(200, "Maksimal 200 perolehan per klaim");
