"use server";

import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/libs/authz";
import { setFlash } from "@/libs/flash";
import { createAkunSchema, updateAkunSchema } from "@/schemas/akun.schema";
import {
  createAkunService,
  deleteAkunService,
  getAkunByIdService,
  getAkunListService,
  updateAkunService,
} from "@/services/akun.service";
import { getKaryawanTanpaAkunService } from "@/services/karyawan.service";
import { ActionResponse } from "@/types/action";
import type { Akun, StatusAkunFilter } from "@/types/akun";
import { AKSI_HAK_AKSES, type MatriksHakAkses } from "@/types/hak-akses";
import type { KaryawanOption } from "@/types/karyawan";
import { handleActionError } from "@/utils/error";
import { validateFormData } from "@/utils/validation";

export async function getAkunListAction(params: {
  q?: string;
  status?: string;
}): Promise<ActionResponse<{ items: Akun[]; currentUserId: string }>> {
  try {
    const user = await requireSuperAdmin();
    const status: StatusAkunFilter =
      params.status === "aktif" || params.status === "nonaktif" ? params.status : "semua";

    const result = await getAkunListService({
      q: (params.q ?? "").trim().slice(0, 100),
      status,
    });
    if (!result.success) return result;
    return { success: true, data: { items: result.data ?? [], currentUserId: user.idUser } };
  } catch (error) {
    return handleActionError(error, "Gagal mengambil data akun.");
  }
}

export async function getKaryawanTanpaAkunAction(): Promise<ActionResponse<KaryawanOption[]>> {
  try {
    await requireSuperAdmin();
    return await getKaryawanTanpaAkunService();
  } catch (error) {
    return handleActionError(error, "Gagal mengambil data karyawan.");
  }
}

export async function getAkunByIdAction(
  idUser: string,
): Promise<ActionResponse<{ akun: Akun; isSelf: boolean }>> {
  try {
    const user = await requireSuperAdmin();
    const result = await getAkunByIdService(idUser);
    if (!result.success) return result;
    if (!result.data) return { success: false, error: "Akun tidak ditemukan." };
    return { success: true, data: { akun: result.data, isSelf: idUser === user.idUser } };
  } catch (error) {
    return handleActionError(error, "Gagal mengambil data akun.");
  }
}

/** Baca matriks hak akses awal (JSON) dari form; data client dibentuk ulang hanya berisi boolean */
function parseHakAksesAwal(raw: FormDataEntryValue | null): MatriksHakAkses {
  if (typeof raw !== "string" || raw === "") return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return {};
    const bersih: MatriksHakAkses = {};
    for (const [kode, izin] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof izin !== "object" || izin === null) continue;
      const rec = izin as Record<string, unknown>;
      bersih[kode] = { lihat: false, tambah: false, ubah: false, hapus: false };
      for (const aksi of AKSI_HAK_AKSES) bersih[kode][aksi] = rec[aksi] === true;
    }
    return bersih;
  } catch {
    return {};
  }
}

/** useActionState. Sukses → kembali ke daftar akun. */
export async function createAkunAction(
  _prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const user = await requireSuperAdmin();
    const { data, error } = validateFormData(formData, createAkunSchema);
    if (error || !data) return { success: false, error: error || "Validasi gagal." };

    const result = await createAkunService(
      data,
      parseHakAksesAwal(formData.get("hakAkses")),
      user.idUser,
    );
    if (!result.success) return result;
  } catch (error) {
    return handleActionError(error, "Gagal membuat akun.");
  }
  await setFlash("Akun berhasil dibuat.");
  redirect("/akun");
}

/** useActionState: updateAkunAction.bind(null, idUser). */
export async function updateAkunAction(
  idUser: string,
  _prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  try {
    const user = await requireSuperAdmin();
    const { data, error } = validateFormData(formData, updateAkunSchema);
    if (error || !data) return { success: false, error: error || "Validasi gagal." };

    const result = await updateAkunService(idUser, data, user.idUser);
    if (!result.success) return result;
  } catch (error) {
    return handleActionError(error, "Gagal memperbarui akun.");
  }
  await setFlash("Akun berhasil diperbarui.");
  redirect("/akun");
}

export async function deleteAkunAction(idUser: string): Promise<ActionResponse> {
  try {
    const user = await requireSuperAdmin();
    return await deleteAkunService(idUser, user.idUser);
  } catch (error) {
    return handleActionError(error, "Gagal menghapus akun.");
  }
}
