"use server";

import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/libs/authz";
import { karyawanSchema } from "@/schemas/karyawan.schema";
import {
  createKaryawanService,
  getKaryawanDetailService,
  getKaryawanFormService,
  getKaryawanListService,
  getPoliListService,
  updateKaryawanService,
} from "@/services/karyawan.service";
import {
  buatPeriode,
  getKinerjaDokterService,
  getRatingDokterService,
  PERIODE_OPTIONS,
} from "@/services/kinerja.service";
import { ActionResponse } from "@/types/action";
import type { KaryawanFormValues, KaryawanListResult, Poli } from "@/types/karyawan";
import type { KaryawanDetailPageData } from "@/types/kinerja";
import { handleActionError } from "@/utils/error";
import { validateFormData } from "@/utils/validation";

const PAGE_SIZE = 7;

export async function getKaryawanListAction(params: {
  q?: string;
  page?: number;
}): Promise<ActionResponse<KaryawanListResult>> {
  try {
    await requireSuperAdmin();

    const q = (params.q ?? "").trim().slice(0, 100);
    const page = Math.max(1, Math.floor(Number(params.page)) || 1);

    return await getKaryawanListService({ q, page, pageSize: PAGE_SIZE });
  } catch (error) {
    return handleActionError(error, "Gagal mengambil data karyawan.");
  }
}

export async function getKaryawanDetailAction(
  idKaryawan: number,
  periodeBulan?: number,
): Promise<ActionResponse<KaryawanDetailPageData>> {
  try {
    await requireSuperAdmin();
    if (!Number.isInteger(idKaryawan) || idKaryawan <= 0) {
      return { success: false, error: "Karyawan tidak ditemukan." };
    }

    const bulan = (PERIODE_OPTIONS as readonly number[]).includes(Number(periodeBulan))
      ? Number(periodeBulan)
      : 6;
    const periode = buatPeriode(bulan);

    const detail = await getKaryawanDetailService(idKaryawan);
    if (!detail.success) return detail;
    if (!detail.data) return { success: false, error: "Karyawan tidak ditemukan." };

    // Statistik untuk semua karyawan (Pimpinan Klinik juga menangani pasien)
    const [rating, kinerja] = await Promise.all([
      getRatingDokterService(idKaryawan, periode),
      getKinerjaDokterService(idKaryawan, periode),
    ]);
    if (!rating.success) return rating;
    if (!kinerja.success) return kinerja;
    if (!rating.data || !kinerja.data) {
      return { success: false, error: "Statistik karyawan tidak tersedia." };
    }

    return {
      success: true,
      data: {
        karyawan: detail.data,
        periode,
        rating: rating.data,
        kinerja: kinerja.data,
      },
    };
  } catch (error) {
    return handleActionError(error, "Gagal mengambil detail karyawan.");
  }
}

export async function getKaryawanFormDataAction(idKaryawan?: number): Promise<
  ActionResponse<{ poli: Poli[]; values: KaryawanFormValues | null }>
> {
  try {
    await requireSuperAdmin();

    const poli = await getPoliListService();
    if (!poli.success) return poli;

    if (idKaryawan === undefined) {
      return { success: true, data: { poli: poli.data ?? [], values: null } };
    }

    const values = await getKaryawanFormService(idKaryawan);
    if (!values.success) return values;
    return { success: true, data: { poli: poli.data ?? [], values: values.data ?? null } };
  } catch (error) {
    return handleActionError(error, "Gagal mengambil data form karyawan.");
  }
}

/**
 * Dipakai dengan useActionState: saveKaryawanAction.bind(null, idKaryawan | null).
 * Sukses → redirect ke halaman detail.
 */
export async function saveKaryawanAction(
  idKaryawan: number | null,
  _prevState: ActionResponse | null,
  formData: FormData,
): Promise<ActionResponse> {
  let targetId: number;
  try {
    await requireSuperAdmin();

    const { data, error } = validateFormData(formData, karyawanSchema);
    if (error || !data) return { success: false, error: error || "Validasi gagal." };

    if (idKaryawan === null) {
      const created = await createKaryawanService(data);
      if (!created.success) return created;
      if (!created.data) return { success: false, error: "Gagal menyimpan karyawan." };
      targetId = created.data.idKaryawan;
    } else {
      const updated = await updateKaryawanService(idKaryawan, data);
      if (!updated.success) return updated;
      targetId = idKaryawan;
    }
  } catch (error) {
    return handleActionError(error, "Gagal menyimpan data karyawan.");
  }

  redirect(`/karyawan/${targetId}`);
}
