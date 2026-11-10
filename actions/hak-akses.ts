"use server";

import { requireSuperAdmin } from "@/libs/authz";
import {
  getDetailHakAksesService,
  getFiturListService,
  getPenggunaHakAksesListService,
  saveHakAksesService,
} from "@/services/hak-akses.service";
import { ActionResponse } from "@/types/action";
import {
  AKSI_HAK_AKSES,
  type DetailHakAkses,
  type Fitur,
  type MatriksHakAkses,
  type PenggunaHakAkses,
} from "@/types/hak-akses";
import { handleActionError } from "@/utils/error";

export async function getHakAksesPageAction(selectedIdUser?: string): Promise<
  ActionResponse<{
    fitur: Fitur[];
    pengguna: PenggunaHakAkses[];
    detail: DetailHakAkses | null;
  }>
> {
  try {
    await requireSuperAdmin();

    const [fitur, pengguna] = await Promise.all([
      getFiturListService(),
      getPenggunaHakAksesListService(),
    ]);
    if (!fitur.success) return fitur;
    if (!pengguna.success) return pengguna;

    const daftarFitur = fitur.data ?? [];
    const daftarPengguna = pengguna.data ?? [];

    // Default: karyawan pertama di daftar
    const idUser =
      daftarPengguna.find((p) => p.idUser === selectedIdUser)?.idUser ??
      daftarPengguna[0]?.idUser;

    let detail: DetailHakAkses | null = null;
    if (idUser) {
      const result = await getDetailHakAksesService(idUser, daftarFitur);
      if (!result.success) return result;
      detail = result.data ?? null;
    }

    return {
      success: true,
      data: { fitur: daftarFitur, pengguna: daftarPengguna, detail },
    };
  } catch (error) {
    return handleActionError(error, "Gagal mengambil data hak akses.");
  }
}

export async function saveHakAksesAction(
  idUser: string,
  matriks: MatriksHakAkses,
): Promise<ActionResponse<{ jumlahBerubah: number }>> {
  try {
    const user = await requireSuperAdmin();

    // Data dari client tidak dipercaya: bentuk ulang hanya dengan boolean
    if (typeof idUser !== "string" || typeof matriks !== "object" || matriks === null) {
      return { success: false, error: "Data hak akses tidak valid." };
    }
    const bersih: MatriksHakAkses = {};
    for (const [kodeFitur, izin] of Object.entries(matriks)) {
      if (typeof izin !== "object" || izin === null) continue;
      const record = izin as Record<string, unknown>;
      bersih[kodeFitur] = {
        lihat: false,
        tambah: false,
        ubah: false,
        hapus: false,
      };
      for (const aksi of AKSI_HAK_AKSES) {
        bersih[kodeFitur][aksi] = record[aksi] === true;
      }
    }

    return await saveHakAksesService(idUser, bersih, user.idUser);
  } catch (error) {
    return handleActionError(error, "Gagal menyimpan hak akses.");
  }
}
