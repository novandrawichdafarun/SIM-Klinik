import z from "zod";
import { AGAMA, GOLONGAN_DARAH, JENIS_PENJAMIN, STATUS_PERNIKAHAN } from "@/types/rekap-pasien";

const trimmed = (v: unknown) => (typeof v === "string" ? v.trim() : "");
const tanggalValid = (v: string) => {
  const [tahun, bulan, hari] = v.split("-").map(Number);
  const tanggal = new Date(0);
  tanggal.setUTCFullYear(tahun, bulan - 1, hari);
  return (
    tanggal.getUTCFullYear() === tahun &&
    tanggal.getUTCMonth() === bulan - 1 &&
    tanggal.getUTCDate() === hari
  );
};

const wajib = (label: string, max: number) =>
  z.preprocess(
    trimmed,
    z.string().min(1, `${label} wajib diisi`).max(max, `${label} maksimal ${max} karakter`),
  );

const opsional = (label: string, max: number) =>
  z
    .preprocess(trimmed, z.string().max(max, `${label} maksimal ${max} karakter`))
    .transform((v) => (v === "" ? null : v));

/** Pilihan dari daftar tetap; kosong = null */
const pilihan = <T extends readonly string[]>(label: string, list: T) =>
  z
    .preprocess(trimmed, z.string())
    .refine((v) => v === "" || (list as readonly string[]).includes(v), `${label} tidak valid`)
    .transform((v) => (v === "" ? null : v));

const angkaOpsional = (label: string, min: number, max: number, int = false) =>
  z
    .preprocess(
      (v) => {
        const s = trimmed(v).replace(",", ".");
        return s === "" ? null : Number(s);
      },
      z.number({ error: `${label} tidak valid` }).nullable(),
    )
    .refine((v) => v === null || (v >= min && v <= max), `${label} harus antara ${min}–${max}`)
    .refine((v) => v === null || !int || Number.isInteger(v), `${label} harus bilangan bulat`);

// ---------------- Pasien (No. RM tidak diterima: dibuat otomatis) ----------------
export const pasienSchema = z
  .object({
    namaLengkap: wajib("Nama lengkap", 100),
    NIK: z.preprocess(trimmed, z.string().regex(/^\d{16}$/, "NIK harus tepat 16 digit angka")),
    jenisKelamin: z.enum(["L", "P"], { error: "Pilih jenis kelamin" }),
    tempatLahir: opsional("Tempat lahir", 100),
    tanggalLahir: z
      .preprocess(trimmed, z.string())
      .refine((v) => v === "" || /^\d{4}-\d{2}-\d{2}$/.test(v), "Tanggal lahir tidak valid")
      .refine((v) => v === "" || tanggalValid(v), "Tanggal lahir tidak valid")
      .transform((v) => (v === "" ? null : v)),
    golonganDarah: pilihan("Golongan darah", GOLONGAN_DARAH),
    statusPernikahan: pilihan("Status pernikahan", STATUS_PERNIKAHAN),
    agama: pilihan("Agama", AGAMA),
    pekerjaan: opsional("Pekerjaan", 100),
    noHp: opsional("No. WhatsApp", 20).refine(
      (v) => {
        if (v === null) return true;
        const digitCount = v.replace(/\D/g, "").length;
        return /^[0-9+\-\s]{8,20}$/.test(v) && digitCount >= 8 && digitCount <= 18;
      },
      "Format No. WhatsApp tidak valid",
    ),
    email: opsional("Email", 254).refine(
      (v) => v === null || z.email().safeParse(v).success,
      "Format email tidak valid",
    ),
    alamat: opsional("Alamat", 255),
    alamatDomisili: opsional("Alamat domisili", 255),
    kecamatan: opsional("Kecamatan", 100),
    kotaKabupaten: opsional("Kota / Kabupaten", 100),
    provinsi: opsional("Provinsi", 100),
    jenisPenjamin: z.enum(JENIS_PENJAMIN, { error: "Pilih jenis penjamin" }),
    noBpjs: opsional("Nomor kartu BPJS", 20),
    fktpAsal: opsional("FKTP asal", 150),
  })
  .superRefine((d, ctx) => {
    if (d.jenisPenjamin === "BPJS Kesehatan (JKN)" && !d.noBpjs) {
      ctx.addIssue({ code: "custom", path: ["noBpjs"], message: "Nomor kartu BPJS wajib diisi" });
    }
    if (d.jenisPenjamin === "BPJS Kesehatan (JKN)" && !d.fktpAsal) {
      ctx.addIssue({ code: "custom", path: ["fktpAsal"], message: "FKTP asal wajib diisi" });
    }
    if (d.noBpjs && !/^\d{13}$/.test(d.noBpjs)) {
      ctx.addIssue({
        code: "custom",
        path: ["noBpjs"],
        message: "Nomor kartu BPJS harus 13 digit",
      });
    }
    if (d.tanggalLahir && d.tanggalLahir > new Date().toISOString().slice(0, 10)) {
      ctx.addIssue({
        code: "custom",
        path: ["tanggalLahir"],
        message: "Tanggal lahir tidak boleh di masa depan",
      });
    }
  });
export type PasienInput = z.infer<typeof pasienSchema>;

// ---------------- Daftarkan kunjungan ----------------
export const kunjunganSchema = z.object({
  idPasien: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number({ error: "Pilih pasien" }).int().positive("Pilih pasien"),
  ),
  idPoli: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number({ error: "Pilih poli tujuan" }).int().positive("Pilih poli tujuan"),
  ),
  idDokter: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number({ error: "Pilih dokter" }).int().positive("Pilih dokter"),
  ),
  idPerawat: z.preprocess(
    (v) => (v === "" || v == null ? undefined : Number(v)),
    z.number({ error: "Pilih perawat" }).int().positive("Pilih perawat"),
  ),
  tglKunjungan: z.preprocess(
    trimmed,
    z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal kunjungan tidak valid"),
  ),
  jamKunjungan: z.preprocess(
    trimmed,
    z.string().regex(/^\d{2}:\d{2}$/, "Jam kunjungan tidak valid"),
  ),
});
export type KunjunganInput = z.infer<typeof kunjunganSchema>;

// ---------------- Pemeriksaan (perawat / dokter) ----------------
export const pemeriksaanSchema = z.object({
  tekananDarah: opsional("Tekanan darah", 10).refine(
    (v) => v === null || /^\d{2,3}\/\d{2,3}$/.test(v),
    "Tekanan darah ditulis seperti 120/80",
  ),
  suhu: angkaOpsional("Suhu", 30, 45),
  nadi: angkaOpsional("Nadi", 20, 250, true),
  lajuNapas: angkaOpsional("Laju napas", 5, 80, true),
  beratBadan: angkaOpsional("Berat badan", 0.5, 400),
  tinggiBadan: angkaOpsional("Tinggi badan", 20, 250),
  keluhan: wajib("Keluhan dan temuan", 5000),
});
export type PemeriksaanInput = z.infer<typeof pemeriksaanSchema>;

// ---------------- Diagnosa (dokter penanggung jawab) ----------------
const itemDiagnosaSchema = z.object({
  nama: wajib("Nama obat/suntik", 100),
  jumlah: z.preprocess(
    (v) => (typeof v === "number" ? v : Number(v)),
    z
      .number({ error: "Jumlah tidak valid" })
      .finite()
      .gt(0, "Jumlah harus lebih dari 0")
      .max(10000, "Jumlah maksimal 10.000"),
  ),
  satuan: wajib("Satuan", 40),
  hargaSatuan: z.preprocess(
    (v) => (typeof v === "number" ? v : Number(v)),
    z
      .number({ error: "Harga satuan tidak valid" })
      .finite()
      .min(0, "Harga satuan tidak boleh negatif")
      .max(999999999, "Harga satuan terlalu besar"),
  ),
});

const itemDiagnosaListSchema = z
  .preprocess((value) => {
    if (value == null || value === "") return [];
    if (typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }, z.array(itemDiagnosaSchema).max(30, "Maksimal 30 item per kategori"))
  .superRefine((items, ctx) => {
    const names = new Set<string>();
    items.forEach((item, index) => {
      const key = item.nama.trim().toLocaleLowerCase("id-ID");
      if (names.has(key)) {
        ctx.addIssue({
          code: "custom",
          path: [index, "nama"],
          message: "Item yang sama gabungkan melalui jumlah, bukan baris baru",
        });
      }
      names.add(key);
    });
  });

export const diagnosaSchema = z.object({
  // Diketik manual oleh dokter (boleh menyertakan kode ICD-10, mis. "ISPA (J06.9)")
  diagnosa: wajib("Diagnosa", 255),
  // Layanan/tindakan diisi dokter bersama diagnosa. Daftar idLayanan dikirim sebagai "1,5,7"
  layanan: z
    .preprocess(
      (v) =>
        trimmed(v)
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
          .map(Number),
      z.array(z.number().int().positive()),
    )
    .refine((a) => a.length > 0, "Tambahkan minimal satu layanan / tindakan")
    .refine((a) => a.length <= 20, "Maksimal 20 layanan per kunjungan")
    .transform((a) => [...new Set(a)]),
  catatanDokter: opsional("Catatan dokter", 5000),
  obat: itemDiagnosaListSchema,
  suntik: itemDiagnosaListSchema,
});
export type DiagnosaInput = z.infer<typeof diagnosaSchema>;
