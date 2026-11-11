"use server";

import { requireSuperAdmin } from "@/libs/authz";
import { pembagianJasaSchema } from "@/schemas/tarif-jasa.schema";
import { getTarifLayananService, setPembagianJasaService } from "@/services/tarif-jasa.service";
import { ActionResponse } from "@/types/action";
import type { TarifJasaPageData } from "@/types/jasa";
import { handleActionError } from "@/utils/error";
import { validateFormData } from "@/utils/validation";

/** Use case "Menetapkan persentase jasa pelayanan": khusus Pimpinan Klinik (Super Admin) */
export async function getTarifJasaPageAction(): Promise<ActionResponse<TarifJasaPageData>> {
  try {
    await requireSuperAdmin();
    const res = await getTarifLayananService();
    if (!res.success) return res;
    return { success: true, data: { layanan: res.data ?? [] } };
  } catch (error) {
    return handleActionError(error, "Gagal mengambil data tarif jasa.");
  }
}

export async function setPembagianJasaAction(formData: FormData): Promise<ActionResponse> {
  try {
    const user = await requireSuperAdmin();
    const { data, error } = validateFormData(formData, pembagianJasaSchema);
    if (error || !data) return { success: false, error: error || "Validasi gagal." };
    const res = await setPembagianJasaService(data, user.idUser);
    if (!res.success) return res;
    return { success: true, message: res.message };
  } catch (error) {
    return handleActionError(error, "Gagal menyimpan tarif jasa.");
  }
}
