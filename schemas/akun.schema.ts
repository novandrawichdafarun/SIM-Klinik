import z from "zod";

const trimmed = (v: unknown) => (typeof v === "string" ? v.trim() : "");

const roleSchema = z.enum(["super_admin", "admin", "dokter"], {
  error: "Role tidak valid",
});

const emailSchema = z.preprocess(
  trimmed,
  z.email("Format email tidak valid").max(254).toLowerCase(),
);

export const createAkunSchema = z
  .object({
    idKaryawan: z.preprocess(
      (v) => Number(v),
      z.number({ error: "Pilih karyawan" }).int().positive("Pilih karyawan"),
    ),
    email: emailSchema,
    role: roleSchema,
    password: z
      .string()
      .min(8, "Kata sandi minimal 8 karakter")
      .max(50, "Kata sandi maksimal 50 karakter"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok",
    path: ["confirmPassword"],
  });

export const updateAkunSchema = z
  .object({
    email: emailSchema,
    role: roleSchema,
    isActive: z.preprocess((v) => v === "1", z.boolean()),
    // Kosong = kata sandi tidak diubah
    password: z
      .string()
      .max(50, "Kata sandi maksimal 50 karakter")
      .refine((v) => v === "" || v.length >= 8, "Kata sandi minimal 8 karakter"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Konfirmasi kata sandi tidak cocok",
    path: ["confirmPassword"],
  });

export type CreateAkunInput = z.infer<typeof createAkunSchema>;
export type UpdateAkunInput = z.infer<typeof updateAkunSchema>;
