import { cookies } from "next/headers";
import type { ToastTipe } from "@/components/feedback/toast";

export const NAMA_COOKIE_FLASH = "flash_toast";

/**
 * Pesan sekali tampil untuk aksi server yang diakhiri redirect (simpan lalu pindah halaman).
 * Disimpan di cookie pendek, lalu dibaca & dihapus oleh <FlashToast /> di halaman tujuan.
 * Panggil SEBELUM `redirect(...)`.
 */
export async function setFlash(pesan: string, tipe: ToastTipe = "success") {
  (await cookies()).set(NAMA_COOKIE_FLASH, JSON.stringify({ pesan, tipe }), {
    path: "/",
    maxAge: 60,
    sameSite: "lax",
    httpOnly: false, // dibaca oleh komponen klien
  });
}
