"use server";

import { requireUser } from "@/libs/authz";
import { getKaryawanDetailService } from "@/services/karyawan.service";
import { getKaryawanByUserService } from "@/services/jasa-pelayanan.service";
import {
  buatPeriode,
  getKinerjaDokterService,
  getRatingDokterService,
  getRiwayatDitanganiService,
  PERIODE_OPTIONS,
} from "@/services/kinerja.service";
import { ActionResponse } from "@/types/action";
import type { KinerjaSayaData } from "@/types/kinerja";
import { handleActionError } from "@/utils/error";

/**
 * Kinerja pribadi karyawan yang sedang login. Data diambil dari session (bukan parameter),
 * jadi setiap akun yang terhubung dengan data karyawan boleh melihatnya.
 */
export async function getKinerjaSayaAction(
  periodeBulan?: number,
): Promise<ActionResponse<KinerjaSayaData>> {
  try {
    const user = await requireUser();
    const kar = await getKaryawanByUserService(user.idUser);
    if (!kar.success) return kar;
    if (!kar.data) return { success: false, error: "Data karyawan tidak ditemukan." };
    const { idKaryawan, jabatan } = kar.data;

    const bulan = (PERIODE_OPTIONS as readonly number[]).includes(Number(periodeBulan))
      ? Number(periodeBulan)
      : 6;
    const periode = buatPeriode(bulan);
    // Diagnosa hanya untuk dokter; rating pengunjung untuk dokter & perawat
    const dokter = jabatan === "dokter";
    const dinilai = jabatan !== null;

    const [detail, kinerja, rating, riwayat] = await Promise.all([
      getKaryawanDetailService(idKaryawan),
      getKinerjaDokterService(idKaryawan, periode),
      dinilai ? getRatingDokterService(idKaryawan, periode) : null,
      getRiwayatDitanganiService(idKaryawan, periode, dokter),
    ]);
    if (!detail.success) return detail;
    if (!kinerja.success) return kinerja;
    if (rating && !rating.success) return rating;
    if (!riwayat.success) return riwayat;
    if (!kinerja.data) return { success: false, error: "Statistik kinerja tidak tersedia." };

    return {
      success: true,
      data: {
        namaLengkap: kar.data.namaLengkap,
        jenisKaryawan: detail.data?.jenisKaryawan ?? null,
        namaPoli: detail.data?.namaPoli ?? null,
        jabatan,
        periode,
        rating: rating?.data ?? null,
        kinerja: kinerja.data,
        riwayat: riwayat.data ?? [],
      },
    };
  } catch (error) {
    return handleActionError(error, "Gagal mengambil kinerja.");
  }
}
