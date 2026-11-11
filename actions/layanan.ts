"use server";
import { redirect } from "next/navigation";
import { requireSuperAdmin } from "@/libs/authz";
import { setFlash } from "@/libs/flash";
import { layananSchema } from "@/schemas/layanan.schema";
import {
  createLayananService,
  deleteLayananService,
  getLayananByIdService,
  getLayananListService,
  updateLayananService,
} from "@/services/layanan.service";
import type { ActionResponse } from "@/types/action";
import { handleActionError } from "@/utils/error";
import { validateFormData } from "@/utils/validation";
export async function getLayananListAction(p: {
  q?: string;
  poli?: string;
  discount?: boolean;
}) {
  try {
    await requireSuperAdmin();
    return getLayananListService(
      p.q ?? "",
      p.poli ?? "Semua",
      p.discount ?? false,
    );
  } catch (e) {
    return handleActionError(e, "Gagal mengambil katalog layanan.");
  }
}
export async function getLayananByIdAction(id: number) {
  try {
    await requireSuperAdmin();
    return getLayananByIdService(id);
  } catch (e) {
    return handleActionError(e, "Gagal mengambil layanan.");
  }
}
export async function saveLayananAction(
  id: number | null,
  _prev: ActionResponse | null,
  fd: FormData,
): Promise<ActionResponse> {
  try {
    await requireSuperAdmin();
    const { data, error } = validateFormData(fd, layananSchema);
    if (error || !data)
      return { success: false, error: error || "Validasi gagal." };
    const r =
      id === null
        ? await createLayananService(data)
        : await updateLayananService(id, data);
    if (!r.success) return r;
  } catch (e) {
    return handleActionError(e, "Gagal menyimpan layanan.");
  }
  await setFlash(id === null ? "Layanan berhasil ditambahkan." : "Layanan berhasil diperbarui.");
  redirect("/katalog-layanan");
}
export async function deleteLayananAction(id: number): Promise<ActionResponse> {
  try {
    await requireSuperAdmin();
    return deleteLayananService(id);
  } catch (e) {
    return handleActionError(e, "Gagal menghapus layanan.");
  }
}
