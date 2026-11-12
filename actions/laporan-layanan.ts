"use server";
import { requireSuperAdmin } from "@/libs/authz";
import { getLaporanLayananService } from "@/services/laporan-layanan.service";
import type { LaporanLayananFilter } from "@/types/laporan-layanan";
import { handleActionError } from "@/utils/error";
export async function getLaporanLayananAction(filter: LaporanLayananFilter) {
  try {
    await requireSuperAdmin();
    return getLaporanLayananService(filter);
  } catch (error) {
    return handleActionError(error, "Gagal mengambil laporan layanan.");
  }
}
