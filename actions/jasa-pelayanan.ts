"use server";

import { requireUser } from "@/libs/authz";
import { klaimJasaSchema } from "@/schemas/tarif-jasa.schema";
import {
  daftarBulanTerakhir,
  getKaryawanByUserService,
  getPerolehanJasaService,
  klaimJasaService,
} from "@/services/jasa-pelayanan.service";
import { ActionResponse } from "@/types/action";
import type { JasaPelayananData } from "@/types/jasa";
import { handleActionError } from "@/utils/error";

/**
 * Use case karyawan "Melihat perolehan jasa pelayanan pribadi" & "Mengklaim jasa pelayanan".
 * Data selalu milik karyawan yang sedang login (diambil dari session, bukan dari parameter),
 * jadi tidak perlu hak akses tambahan.
 */
export async function getJasaPelayananAction(
  bulan?: string,
): Promise<ActionResponse<JasaPelayananData>> {
  try {
    const user = await requireUser();
    const karyawan = await getKaryawanByUserService(user.idUser);
    if (!karyawan.success) return karyawan;
    if (!karyawan.data) return { success: false, error: "Data karyawan tidak ditemukan." };

    const daftar = daftarBulanTerakhir();
    const bulanValid = bulan && daftar.includes(bulan) ? bulan : daftar[0];
    return await getPerolehanJasaService(karyawan.data, bulanValid);
  } catch (error) {
    return handleActionError(error, "Gagal mengambil jasa pelayanan.");
  }
}

export async function klaimJasaAction(
  idItemList: number[],
): Promise<ActionResponse<{ idKlaim: number; total: number; jumlah: number }>> {
  try {
    const user = await requireUser();
    const parsed = klaimJasaSchema.safeParse(idItemList);
    if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

    const karyawan = await getKaryawanByUserService(user.idUser);
    if (!karyawan.success) return karyawan;
    if (!karyawan.data) return { success: false, error: "Data karyawan tidak ditemukan." };

    return await klaimJasaService(karyawan.data, parsed.data);
  } catch (error) {
    return handleActionError(error, "Gagal mengajukan klaim.");
  }
}
