import z from "zod";

/** Ambil string dari FormData & trim; field yang tidak ada dianggap "" */
const trimmed = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const teksWajib = (label: string, max: number) =>
  z.preprocess(
    trimmed,
    z
      .string()
      .min(1, `${label} wajib diisi`)
      .max(max, `${label} maksimal ${max} karakter`),
  );

const teksOpsional = (label: string, max: number) =>
  z
    .preprocess(trimmed, z.string().max(max, `${label} maksimal ${max} karakter`))
    .transform((v) => (v === "" ? null : v));

export const karyawanSchema = z.object({
  namaLengkap: teksWajib("Nama lengkap", 100),
  NIK: z.preprocess(
    trimmed,
    z.string().regex(/^\d{16}$/, "NIK harus tepat 16 digit angka"),
  ),
  jenisKaryawan: teksWajib("Jabatan", 100),
  idPoli: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z
      .number({ error: "Pilih unit kerja (Poli Umum / Poli Gigi)" })
      .int()
      .positive("Unit kerja tidak valid"),
  ),
  noHp: teksOpsional("No. HP", 20).refine(
    (v) => v === null || /^[0-9+\-\s]{8,20}$/.test(v),
    "No. HP hanya boleh berisi angka, spasi, + dan - (8-20 karakter)",
  ),
  STR: teksOpsional("Nomor STR", 255),
  SIP: teksOpsional("Nomor SIP", 255),
  statusAktif: z.preprocess((v) => v === "1" || v === "on", z.boolean()),
});

export type KaryawanInput = z.infer<typeof karyawanSchema>;
