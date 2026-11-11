"use server";

import { hasPermission, requireUser } from "@/libs/authz";
import { POLA_TOKEN } from "@/libs/klinik";
import { ratingSchema } from "@/schemas/invoice.schema";
import {
  createInvoiceService,
  getInvoiceByIdService,
  getInvoiceByTokenService,
  getKunjunganTagihanService,
  simpanRatingService,
  tandaiTerkirimService,
} from "@/services/invoice.service";
import { ActionResponse } from "@/types/action";
import type { InvoiceData, InvoiceDetailData, InvoiceHarianData } from "@/types/invoice";
import { handleActionError } from "@/utils/error";
import { hariIni } from "@/utils/format";
import { validateFormData } from "@/utils/validation";

const TOLAK = "Anda tidak memiliki akses ke Invoice Digital.";

/** Hak akses Invoice Digital: Lihat = membuka halaman, Tambah = membuat & mengirim invoice */
async function akses() {
  const user = await requireUser();
  const [lihat, tambah] = await Promise.all([
    hasPermission(user, "invoice_digital", "lihat"),
    hasPermission(user, "invoice_digital", "tambah"),
  ]);
  return { user, lihat: lihat || tambah, tambah };
}

export async function getInvoiceHarianAction(params: {
  tanggal?: string;
  q?: string;
}): Promise<ActionResponse<InvoiceHarianData>> {
  try {
    const a = await akses();
    if (!a.lihat) return { success: false, error: TOLAK };
    const tanggal =
      params.tanggal && /^\d{4}-\d{2}-\d{2}$/.test(params.tanggal) ? params.tanggal : hariIni();
    const res = await getKunjunganTagihanService(tanggal, (params.q ?? "").slice(0, 100));
    if (!res.success) return res;
    if (!res.data) return { success: false, error: "Data tidak tersedia." };
    return { success: true, data: { tanggal, ...res.data, bisaBuat: a.tambah } };
  } catch (error) {
    return handleActionError(error, "Gagal mengambil daftar invoice.");
  }
}

export async function createInvoiceAction(
  idKunjungan: number,
): Promise<ActionResponse<{ idInvoice: number; nomorInvoice: string }>> {
  try {
    const a = await akses();
    if (!a.tambah)
      return { success: false, error: "Anda tidak memiliki akses untuk membuat invoice." };
    if (!Number.isInteger(idKunjungan) || idKunjungan <= 0) {
      return { success: false, error: "Kunjungan tidak valid." };
    }
    return await createInvoiceService(idKunjungan, a.user.idUser);
  } catch (error) {
    return handleActionError(error, "Gagal membuat invoice.");
  }
}

export async function getInvoiceDetailAction(
  idInvoice: number,
): Promise<ActionResponse<InvoiceDetailData>> {
  try {
    const a = await akses();
    if (!a.lihat) return { success: false, error: TOLAK };
    const res = await getInvoiceByIdService(idInvoice);
    if (!res.success) return res;
    if (!res.data) return { success: false, error: "Invoice tidak ditemukan." };
    return { success: true, data: { invoice: res.data, bisaKirim: a.tambah } };
  } catch (error) {
    return handleActionError(error, "Gagal mengambil invoice.");
  }
}

export async function tandaiTerkirimAction(idInvoice: number): Promise<ActionResponse> {
  try {
    const a = await akses();
    if (!a.tambah)
      return { success: false, error: "Anda tidak memiliki akses untuk mengirim invoice." };
    return await tandaiTerkirimService(idInvoice);
  } catch (error) {
    return handleActionError(error, "Gagal memperbarui status kirim.");
  }
}

// ---------------- Publik (pasien, tanpa login) ----------------

/** Invoice & form rating untuk pasien. Akses hanya dengan token acak dari tautan WhatsApp. */
export async function getInvoicePublikAction(token: string): Promise<ActionResponse<InvoiceData>> {
  try {
    if (!POLA_TOKEN.test(token)) {
      return { success: false, error: "Tautan tidak valid atau sudah tidak berlaku." };
    }
    return await getInvoiceByTokenService(token);
  } catch (error) {
    return handleActionError(error, "Gagal membuka invoice.");
  }
}

/** useActionState: kirimRatingAction.bind(null, token) */
export async function kirimRatingAction(
  token: string,
  _prev: ActionResponse | null,
  fd: FormData,
): Promise<ActionResponse> {
  try {
    if (!POLA_TOKEN.test(token)) return { success: false, error: "Tautan rating tidak valid." };
    const { data, error } = validateFormData(fd, ratingSchema);
    if (error || !data) return { success: false, error: error || "Validasi gagal." };
    return await simpanRatingService(token, data);
  } catch (error) {
    return handleActionError(error, "Gagal mengirim penilaian.");
  }
}
