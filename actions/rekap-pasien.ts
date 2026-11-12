"use server";

import { redirect } from "next/navigation";
import { hasPermission, requireUser, type CurrentUser } from "@/libs/authz";
import { setFlash } from "@/libs/flash";
import {
  diagnosaSchema,
  kunjunganSchema,
  pasienSchema,
  pemeriksaanSchema,
} from "@/schemas/rekap-pasien.schema";
import {
  getKaryawanByUserService,
  type KaryawanJasa,
} from "@/services/jasa-pelayanan.service";
import {
  createKunjunganService,
  createPasienService,
  getAntreanDiagnosaService,
  getBiayaPemeriksaanService,
  deletePasienService,
  getKunjunganByIdService,
  getKunjunganByTanggalService,
  getOpsiKunjunganService,
  getPasienByIdService,
  getPasienByIdUntukDokterService,
  getPasienListService,
  getPasienOptionsService,
  getPemeriksaanService,
  getRiwayatPasienService,
  getTindakanOptionsService,
  simpanDiagnosaService,
  simpanPemeriksaanService,
  updatePasienService,
} from "@/services/rekap-pasien.service";
import { ActionResponse } from "@/types/action";
import type {
  AksesRekap,
  AntreanDiagnosa,
  KunjunganItem,
  PoliOption,
  Pasien,
  PasienRingkas,
  PemeriksaanData,
  PetugasOption,
  RiwayatPenanganan,
} from "@/types/rekap-pasien";
import { handleActionError } from "@/utils/error";
import { hariIni } from "@/utils/date";
import { validateFormData } from "@/utils/validation";

interface Konteks {
  user: CurrentUser;
  karyawan: KaryawanJasa | null;
  akses: AksesRekap;
  bisaLihatRekap: boolean;
  hanyaDokter: boolean;
  /** Dokter yang boleh mengisi diagnosa (kunjungan yang ia tangani) */
  bisaDiagnosa: boolean;
  /** Perawat yang boleh mengisi tab Pemeriksaan (semua kunjungan) */
  bisaPeriksaPerawat: boolean;
}

/** Hak akses pengguna untuk modul Rekap Data Pasien (dibaca dari DB setiap request) */
async function konteks(): Promise<Konteks> {
  const user = await requireUser();
  const [
    kar,
    rekapLihat,
    rekapUbah,
    inputLihat,
    inputTambah,
    inputUbah,
    inputHapus,
  ] = await Promise.all([
    getKaryawanByUserService(user.idUser),
    hasPermission(user, "rekap_pasien", "lihat"),
    hasPermission(user, "rekap_pasien", "ubah"),
    hasPermission(user, "input_pasien", "lihat"),
    hasPermission(user, "input_pasien", "tambah"),
    hasPermission(user, "input_pasien", "ubah"),
    hasPermission(user, "input_pasien", "hapus"),
  ]);
  const karyawan = kar.success && kar.data ? kar.data : null;
  /**
   * Dokter (selain Super Admin) hanya bekerja di tab "Pasien Saya": pendaftaran pasien &
   * kunjungan adalah tugas admin, jadi hak Input Data Pasien diabaikan untuk dokter.
   */
  const dokterSaja = karyawan?.jabatan === "dokter" && !user.isSuperAdmin;
  const input = (izin: boolean) => izin && !dokterSaja;
  return {
    user,
    karyawan,
    hanyaDokter: dokterSaja,
    akses: {
      bisaTambahPasien: input(inputTambah),
      bisaUbahPasien: input(inputUbah),
      bisaHapusPasien: input(inputHapus),
      bisaLihatSemuaPasien: input(inputLihat),
      bisaLihatDiagnosa: rekapLihat || inputLihat,
      hanyaDokter: dokterSaja,
      bisaLihatKunjungan: !dokterSaja && (rekapLihat || inputLihat),
    },
    bisaLihatRekap: rekapLihat || inputLihat,
    bisaDiagnosa: rekapUbah && karyawan?.jabatan === "dokter",
    // Perawat mengisi pemeriksaan fisik & tindakan (bagian dari "CRUD data pasien")
    bisaPeriksaPerawat:
      (rekapUbah || input(inputUbah)) && karyawan?.jabatan === "perawat",
  };
}

const TOLAK = "Anda tidak memiliki akses ke Rekap Data Pasien.";

/** Hak akses tab Rekap Data Pasien (untuk menentukan tab yang tampil) */
export async function getAksesRekapAction(): Promise<
  ActionResponse<AksesRekap>
> {
  try {
    const k = await konteks();
    if (!k.bisaLihatRekap) return { success: false, error: TOLAK };
    return { success: true, data: k.akses };
  } catch (error) {
    return handleActionError(error, "Gagal memeriksa hak akses.");
  }
}

// ---------------- Kunjungan hari ini ----------------

export async function getKunjunganHariIniAction(params: {
  tanggal?: string;
  q?: string;
}): Promise<
  ActionResponse<{ tanggal: string; items: KunjunganItem[]; akses: AksesRekap }>
> {
  try {
    const k = await konteks();
    if (!k.akses.bisaLihatKunjungan) return { success: false, error: TOLAK };

    const tanggal =
      params.tanggal && /^\d{4}-\d{2}-\d{2}$/.test(params.tanggal)
        ? params.tanggal
        : hariIni();
    // Dokter melihat antrean miliknya; perawat, admin, dan Super Admin melihat semua
    const hanyaDokter =
      k.karyawan?.jabatan === "dokter" && !k.user.isSuperAdmin
        ? k.karyawan.idKaryawan
        : null;

    const res = await getKunjunganByTanggalService({
      tanggal,
      q: (params.q ?? "").slice(0, 100),
      hanyaDokter,
      pemeriksa:
        k.karyawan && k.bisaDiagnosa
          ? { peran: "dokter", idKaryawan: k.karyawan.idKaryawan }
          : k.karyawan && k.bisaPeriksaPerawat
            ? { peran: "perawat", idKaryawan: k.karyawan.idKaryawan }
            : null,
    });
    if (!res.success) return res;
    return {
      success: true,
      data: { tanggal, items: res.data ?? [], akses: k.akses },
    };
  } catch (error) {
    return handleActionError(error, "Gagal mengambil kunjungan.");
  }
}

// ---------------- Daftar pasien ----------------

export async function getDaftarPasienAction(params: {
  q?: string;
  semua?: boolean;
}): Promise<
  ActionResponse<{
    items: PasienRingkas[];
    antrean: AntreanDiagnosa[] | null;
    akses: AksesRekap;
  }>
> {
  try {
    const k = await konteks();
    if (!k.bisaLihatRekap) return { success: false, error: TOLAK };
    if (params.semua && !k.akses.bisaLihatSemuaPasien) {
      return {
        success: false,
        error: "Anda tidak memiliki akses ke daftar semua pasien.",
      };
    }
    const q = (params.q ?? "").slice(0, 100);
    // Dokter: kunjungan yang menunggu diagnosanya tampil di atas "Pasien Saya"
    const denganAntrean = !params.semua && k.bisaDiagnosa && !!k.karyawan;
    const [res, antrean] = await Promise.all([
      getPasienListService({
        q,
        // "Pasien Saya" = pernah ditangani karyawan ini sebagai dokter/perawat
        idKaryawan:
          params.semua || k.hanyaDokter ? null : (k.karyawan?.idKaryawan ?? -1),
        idDokter:
          !params.semua && k.hanyaDokter
            ? (k.karyawan?.idKaryawan ?? -1)
            : null,
        denganDiagnosa: k.akses.bisaLihatDiagnosa,
      }),
      denganAntrean
        ? getAntreanDiagnosaService(k.karyawan!.idKaryawan, q)
        : null,
    ]);
    if (!res.success) return res;
    if (antrean && !antrean.success) return antrean;
    return {
      success: true,
      data: {
        items: res.data ?? [],
        antrean: antrean?.data ?? null,
        akses: k.akses,
      },
    };
  } catch (error) {
    return handleActionError(error, "Gagal mengambil daftar pasien.");
  }
}

// ---------------- Detail pasien ----------------

export async function getPasienDetailAction(
  idPasien: number,
): Promise<
  ActionResponse<{
    pasien: Pasien;
    riwayat: RiwayatPenanganan[];
    akses: AksesRekap;
  }>
> {
  try {
    const k = await konteks();
    if (!k.bisaLihatRekap) return { success: false, error: TOLAK };
    if (!Number.isSafeInteger(idPasien) || idPasien <= 0) {
      return { success: false, error: "Pasien tidak ditemukan." };
    }
    const idDokter = k.hanyaDokter ? (k.karyawan?.idKaryawan ?? -1) : null;
    const pasien =
      idDokter === null
        ? await getPasienByIdService(idPasien)
        : await getPasienByIdUntukDokterService(idPasien, idDokter);
    if (!pasien.success) return pasien;
    if (!pasien.data)
      return { success: false, error: "Pasien tidak ditemukan." };
    const riwayat = await getRiwayatPasienService(
      idPasien,
      k.akses.bisaLihatDiagnosa,
      idDokter,
    );
    if (!riwayat.success) return riwayat;
    return {
      success: true,
      data: {
        pasien: pasien.data,
        riwayat: riwayat.data ?? [],
        akses: k.akses,
      },
    };
  } catch (error) {
    return handleActionError(error, "Gagal mengambil detail pasien.");
  }
}

export async function getPasienFormAction(
  idPasien?: number,
): Promise<ActionResponse<Pasien | null>> {
  try {
    const k = await konteks();
    const boleh =
      idPasien === undefined
        ? k.akses.bisaTambahPasien
        : k.akses.bisaUbahPasien;
    if (!boleh)
      return {
        success: false,
        error: "Anda tidak memiliki akses untuk mengelola data pasien.",
      };
    if (idPasien === undefined) return { success: true, data: null };
    return await getPasienByIdService(idPasien);
  } catch (error) {
    return handleActionError(error, "Gagal mengambil data pasien.");
  }
}

/** useActionState: savePasienAction.bind(null, idPasien | null) */
export async function savePasienAction(
  idPasien: number | null,
  _prev: ActionResponse | null,
  fd: FormData,
): Promise<ActionResponse> {
  let target: number;
  try {
    const k = await konteks();
    const boleh =
      idPasien === null ? k.akses.bisaTambahPasien : k.akses.bisaUbahPasien;
    if (!boleh)
      return {
        success: false,
        error: "Anda tidak memiliki akses untuk mengelola data pasien.",
      };

    const { data, error } = validateFormData(fd, pasienSchema);
    if (error || !data)
      return { success: false, error: error || "Validasi gagal." };

    if (idPasien === null) {
      const res = await createPasienService(data);
      if (!res.success) return res;
      if (!res.data)
        return { success: false, error: "Gagal menyimpan pasien." };
      target = res.data.idPasien;
    } else {
      const res = await updatePasienService(idPasien, data);
      if (!res.success) return res;
      target = idPasien;
    }
  } catch (error) {
    return handleActionError(error, "Gagal menyimpan data pasien.");
  }
  await setFlash(
    idPasien === null
      ? "Pasien berhasil ditambahkan."
      : "Data pasien berhasil diperbarui.",
  );
  redirect(`/rekap-pasien/pasien/${target}`);
}

export async function deletePasienAction(
  idPasien: number,
): Promise<ActionResponse> {
  try {
    const k = await konteks();
    if (!k.akses.bisaHapusPasien) {
      return {
        success: false,
        error: "Anda tidak memiliki akses untuk menghapus pasien.",
      };
    }
    return await deletePasienService(idPasien);
  } catch (error) {
    return handleActionError(error, "Gagal menghapus pasien.");
  }
}

// ---------------- Daftarkan kunjungan ----------------

export async function getKunjunganFormAction(): Promise<
  ActionResponse<{
    pasien: {
      idPasien: number;
      NoRM: string;
      namaLengkap: string;
      NIK: string;
    }[];
    poli: PoliOption[];
    dokter: PetugasOption[];
    perawat: PetugasOption[];
  }>
> {
  try {
    const k = await konteks();
    if (!k.akses.bisaTambahPasien) {
      return {
        success: false,
        error: "Anda tidak memiliki akses untuk mendaftarkan kunjungan.",
      };
    }
    const [pasien, opsi] = await Promise.all([
      getPasienOptionsService(),
      getOpsiKunjunganService(),
    ]);
    if (!pasien.success) return pasien;
    if (!opsi.success) return opsi;
    return {
      success: true,
      data: {
        pasien: pasien.data ?? [],
        poli: opsi.data?.poli ?? [],
        dokter: opsi.data?.dokter ?? [],
        perawat: opsi.data?.perawat ?? [],
      },
    };
  } catch (error) {
    return handleActionError(error, "Gagal mengambil data form kunjungan.");
  }
}

export async function createKunjunganAction(
  _prev: ActionResponse | null,
  fd: FormData,
): Promise<ActionResponse> {
  let tanggal: string;
  let pesan: string;
  try {
    const k = await konteks();
    if (!k.akses.bisaTambahPasien) {
      return {
        success: false,
        error: "Anda tidak memiliki akses untuk mendaftarkan kunjungan.",
      };
    }
    const { data, error } = validateFormData(fd, kunjunganSchema);
    if (error || !data)
      return { success: false, error: error || "Validasi gagal." };
    const res = await createKunjunganService(data);
    if (!res.success) return res;
    tanggal = data.tglKunjungan;
    pesan = res.message ?? "Kunjungan berhasil didaftarkan.";
  } catch (error) {
    return handleActionError(error, "Gagal mendaftarkan kunjungan.");
  }
  await setFlash(pesan);
  redirect(`/rekap-pasien?tanggal=${tanggal}`);
}

// ---------------- Pemeriksaan (perawat) & diagnosa (dokter) ----------------

/**
 * Halaman Pemeriksaan & Diagnosa boleh dibuka oleh:
 *  - perawat yang ditugaskan saat pendaftaran (hak Rekap Pasien/Input Data Pasien "Ubah")
 *    → mengisi tab Pemeriksaan (tanda vital & keluhan)
 *  - dokter penanggung jawab dengan hak Rekap Pasien "Ubah" → kedua tab; layanan/tindakan
 *    dan diagnosa diisi di tab Diagnosa
 */
async function aksesPemeriksaan(idKunjungan: number) {
  const k = await konteks();
  const kj = await getKunjunganByIdService(idKunjungan);
  if (!kj.success) return { error: kj.error } as const;
  if (!kj.data) return { error: "Kunjungan tidak ditemukan." } as const;
  const dokterPj =
    k.bisaDiagnosa &&
    !!k.karyawan &&
    kj.data.idDokter === k.karyawan.idKaryawan;
  const perawatTugas =
    k.bisaPeriksaPerawat &&
    !!k.karyawan &&
    kj.data.idPerawat === k.karyawan.idKaryawan;
  const readonlyAdmin =
    k.bisaLihatRekap &&
    k.akses.bisaLihatDiagnosa &&
    (k.user.role === "admin" || k.user.isSuperAdmin);
  if (!dokterPj && !perawatTugas && !readonlyAdmin) {
    return {
      error:
        "Anda tidak memiliki akses untuk mengisi pemeriksaan kunjungan ini.",
    } as const;
  }
  return {
    kunjungan: kj.data,
    karyawan: k.karyawan,
    peran: dokterPj
      ? ("dokter" as const)
      : perawatTugas
        ? ("perawat" as const)
        : ("readonly" as const),
  } as const;
}

export async function getPemeriksaanAction(
  idKunjungan: number,
): Promise<ActionResponse<PemeriksaanData>> {
  try {
    const a = await aksesPemeriksaan(idKunjungan);
    if ("error" in a)
      return { success: false, error: a.error ?? "Akses ditolak." };

    const [pem, opsi] = await Promise.all([
      getPemeriksaanService(idKunjungan),
      getTindakanOptionsService(a.kunjungan.idPoli),
    ]);
    if (!pem.success) return pem;
    if (!opsi.success) return opsi;
    const biaya = await getBiayaPemeriksaanService(
      a.kunjungan.idPoli,
      a.kunjungan.tanggal,
    );
    if (!biaya.success) return biaya;
    const biayaPemeriksaan = biaya.data ?? null;
    const errorBiayaPemeriksaan = biayaPemeriksaan
      ? null
      : "Tarif pemeriksaan aktif untuk poli kunjungan belum tersedia. Hubungi administrator klinik.";
    const t = pem.data!;
    const s = (v: unknown) =>
      v === null || v === undefined ? "" : String(v).replace(/\.0$/, "");
    const n = t.nilai;
    const diagnosa = {
      diagnosa: s(n.diagnosa),
      catatanDokter: s(n.catatanDokter),
      layanan: t.layanan,
      obat:
        t.rincianBiaya?.obat.map(({ nama, jumlah, satuan, hargaSatuan }) => ({
          nama,
          jumlah,
          satuan,
          hargaSatuan,
        })) ?? [],
      suntik:
        t.rincianBiaya?.suntik.map(({ nama, jumlah, satuan, hargaSatuan }) => ({
          nama,
          jumlah,
          satuan,
          hargaSatuan,
        })) ?? [],
      resepLama: t.resepLama,
    };

    return {
      success: true,
      data: {
        kunjungan: { ...a.kunjungan, bisaPeriksa: a.peran !== "readonly" },
        peran: a.peran,
        bisaUbahPemeriksaan: !t.terkunci,
        bisaDiagnosa: a.peran === "dokter" && !t.terkunci,
        terkunci: t.terkunci,
        namaPerawat: t.namaPerawat ?? a.kunjungan.namaPerawat,
        layananOptions: opsi.data ?? [],
        biayaPemeriksaan,
        errorBiayaPemeriksaan,
        pemeriksaan: {
          tekananDarah: s(n.tekananDarah),
          suhu: s(n.suhu).replace(".", ","),
          nadi: s(n.nadi),
          lajuNapas: s(n.lajuNapas),
          beratBadan: s(n.beratBadan).replace(".", ","),
          tinggiBadan: s(n.tinggiBadan).replace(".", ","),
          keluhan: s(n.keluhan),
        },
        // Perawat yang ditugaskan dapat melihat hasil; hanya dokter pemilik yang dapat menyimpan.
        diagnosa,
      },
    };
  } catch (error) {
    return handleActionError(error, "Gagal mengambil data pemeriksaan.");
  }
}

/** Simpan tab Pemeriksaan. useActionState: simpanPemeriksaanAction.bind(null, idKunjungan) */
export async function simpanPemeriksaanAction(
  idKunjungan: number,
  _prev: ActionResponse | null,
  fd: FormData,
): Promise<ActionResponse> {
  try {
    const a = await aksesPemeriksaan(idKunjungan);
    if ("error" in a)
      return { success: false, error: a.error ?? "Akses ditolak." };
    if (a.peran === "readonly") {
      return {
        success: false,
        error: "Akses hanya untuk melihat hasil pemeriksaan.",
      };
    }
    const { data, error } = validateFormData(fd, pemeriksaanSchema);
    if (error || !data)
      return { success: false, error: error || "Validasi gagal." };
    // Perawat pemeriksa (penerima jasa perawat) = perawat yang dipilih saat pendaftaran
    return await simpanPemeriksaanService(idKunjungan, data);
  } catch (error) {
    return handleActionError(error, "Gagal menyimpan pemeriksaan.");
  }
}

/** Simpan tab Diagnosa (dokter penanggung jawab). Sukses → kembali ke daftar kunjungan. */
export async function simpanDiagnosaAction(
  idKunjungan: number,
  _prev: ActionResponse | null,
  fd: FormData,
): Promise<ActionResponse> {
  let tanggal: string;
  try {
    const a = await aksesPemeriksaan(idKunjungan);
    if ("error" in a)
      return { success: false, error: a.error ?? "Akses ditolak." };
    if (a.peran !== "dokter") {
      return {
        success: false,
        error: "Diagnosa hanya dapat diisi dokter penanggung jawab.",
      };
    }
    if (!a.karyawan) {
      return { success: false, error: "Data karyawan dokter tidak ditemukan." };
    }
    const { data, error } = validateFormData(fd, diagnosaSchema);
    if (error || !data)
      return { success: false, error: error || "Validasi gagal." };
    const res = await simpanDiagnosaService(
      idKunjungan,
      a.karyawan.idKaryawan,
      data,
    );
    if (!res.success) return res;
    tanggal = a.kunjungan.tanggal;
  } catch (error) {
    return handleActionError(error, "Gagal menyimpan diagnosa.");
  }
  await setFlash("Diagnosa berhasil disimpan. Kunjungan selesai.");
  redirect(`/rekap-pasien?tanggal=${tanggal}`);
}
