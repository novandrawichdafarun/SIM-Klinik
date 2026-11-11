/**
 * Dialog konfirmasi (modal) yang menunggu jawaban pengguna. Tidak pernah hilang otomatis.
 *   if (!(await konfirmasi({ judul: "Hapus pasien?", pesan: "...", tipe: "bahaya" }))) return;
 * Ditampilkan oleh <KonfirmasiHost /> yang dipasang sekali di root layout.
 */

export interface KonfirmasiOpsi {
  judul: string;
  pesan?: string;
  /** Teks tombol setuju, default "Ya, lanjutkan" */
  teksYa?: string;
  /** Teks tombol batal, default "Batal" */
  teksTidak?: string;
  /** "bahaya" untuk aksi yang tidak dapat dibatalkan (hapus), "peringatan", atau "biasa" */
  tipe?: "bahaya" | "peringatan" | "biasa";
}

export interface KonfirmasiAktif extends KonfirmasiOpsi {
  jawab: (ya: boolean) => void;
}

let aktif: KonfirmasiAktif | null = null;
const pendengar = new Set<() => void>();

function umumkan() {
  for (const fn of pendengar) fn();
}

export function langgananKonfirmasi(fn: () => void) {
  pendengar.add(fn);
  return () => {
    pendengar.delete(fn);
  };
}

export function ambilKonfirmasi() {
  return aktif;
}

export function konfirmasi(opsi: KonfirmasiOpsi): Promise<boolean> {
  // Konfirmasi sebelumnya yang belum dijawab dianggap batal
  aktif?.jawab(false);
  return new Promise((resolve) => {
    const item: KonfirmasiAktif = {
      ...opsi,
      jawab: (ya) => {
        if (aktif === item) {
          aktif = null;
          umumkan();
        }
        resolve(ya);
      },
    };
    aktif = item;
    umumkan();
  });
}
