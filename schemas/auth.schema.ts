import z from "zod";

export const requestOtpSchema = z.object({
  email: z.email("Format email tidak valid").trim().toLowerCase(),
});

export const verifyOtpSchema = z.object({
  email: z.email("Format email tidak valid").trim().toLowerCase(),
  token: z
    .string()
    .trim()
    .length(6, "Token OTP harus tepat 6 digit")
    .regex(/^\d+$/, "Token OTP hanya boleh berisi angka"),
});

export const resetPasswordSchema = z
  .object({
    email: z.email("Format email tidak valid").trim().toLowerCase(),
    token: z
      .string()
      .trim()
      .length(6, "Token OTP harus tepat 6 digit")
      .regex(/^\d+$/, "Token OTP hanya berisi angka"),

    newPassword: z
      .string()
      .min(6, "Kata sandi minimal 6 karakter")
      .max(50, "Kata sandi maksimal 50 karakter"),
    confirmPassword: z
      .string()
      .min(6, "Konfirmasi kata sandi minimal 6 karakter")
      .max(50, "Konfirmasi kata sandi maksimal 50 karakter"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Kata sandi dan konfirmasi kata sandi tidak cocok!",
    path: ["confirmPassword"], // Menandai field mana yang error
  });
