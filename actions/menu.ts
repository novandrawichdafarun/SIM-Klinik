"use server";

import { getCurrentUser, hasPermission } from "@/libs/authz";
import type { KodeFitur } from "@/types/hak-akses";

/** Fitur yang menentukan tampil/tidaknya menu di sidebar (cukup izin "Lihat") */
const FITUR_MENU = [
  "rekap_pasien",
  "input_pasien",
  "reimburse",
  "invoice_digital",
  "arus_kas",
] as const satisfies readonly KodeFitur[];

export interface AksesMenu {
  isSuperAdmin: boolean;
  lihat: Record<(typeof FITUR_MENU)[number], boolean>;
}

/**
 * Hak akses untuk menyusun sidebar, dibaca dari database (bukan dari JWT),
 * sehingga perubahan di menu Hak Akses langsung berlaku.
 * Ini hanya untuk menyembunyikan menu; pengamanan tetap di proxy & setiap server action.
 */
export async function getAksesMenuAction(): Promise<AksesMenu | null> {
  try {
    const user = await getCurrentUser();
    if (!user) return null;
    const hasil = await Promise.all(FITUR_MENU.map((f) => hasPermission(user, f, "lihat")));
    return {
      isSuperAdmin: user.isSuperAdmin,
      lihat: Object.fromEntries(FITUR_MENU.map((f, i) => [f, hasil[i]])) as AksesMenu["lihat"],
    };
  } catch {
    return null;
  }
}
