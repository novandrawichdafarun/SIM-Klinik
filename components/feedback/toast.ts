/**
 * Notifikasi ringan (toast) yang hilang otomatis. Bisa dipanggil dari komponen klien mana pun:
 *   toast.success("Pasien berhasil disimpan.")
 *   toast.error(res.error)
 * Ditampilkan oleh <Toaster /> yang dipasang sekali di root layout.
 */

export type ToastTipe = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: number;
  tipe: ToastTipe;
  judul?: string;
  pesan: string;
  /** milidetik; null = tidak hilang otomatis */
  durasi: number | null;
}

interface ToastOpsi {
  judul?: string;
  /** Override durasi (ms); null = tetap tampil sampai ditutup */
  durasi?: number | null;
}

/**
 * Durasi tampil mengikuti panjang pesan:
 *  - pendek (1-3 kata)          : 2,5 detik
 *  - sedang (± 1 kalimat)       : 5 detik
 *  - panjang / lebih dari 1 kalimat : 9 detik (selalu ada tombol tutup)
 * Pesan error minimal 5 detik supaya sempat terbaca.
 */
export function durasiOtomatis(pesan: string, tipe: ToastTipe): number {
  const teks = pesan.trim();
  const kata = teks.split(/\s+/).filter(Boolean).length;
  const kalimat = teks.split(/[.!?](\s|$)/).filter((s) => s && s.trim()).length;
  let durasi = kata <= 3 ? 2500 : kata <= 15 && kalimat <= 1 ? 5000 : 9000;
  if (tipe === "error") durasi = Math.max(durasi, 5000);
  return durasi;
}

const MAKS_TAMPIL = 4;
let daftar: ToastItem[] = [];
let idBerikut = 1;
const pendengar = new Set<() => void>();

function umumkan() {
  for (const fn of pendengar) fn();
}

export function langgananToast(fn: () => void) {
  pendengar.add(fn);
  return () => {
    pendengar.delete(fn);
  };
}

export function ambilToast(): ToastItem[] {
  return daftar;
}

export function tutupToast(id: number) {
  daftar = daftar.filter((t) => t.id !== id);
  umumkan();
}

function tampilkan(tipe: ToastTipe, pesan: string, opsi: ToastOpsi = {}): number {
  const id = idBerikut++;
  const durasi = opsi.durasi === undefined ? durasiOtomatis(pesan, tipe) : opsi.durasi;
  // Pesan yang sama persis tidak ditumpuk dua kali
  daftar = daftar.filter((t) => !(t.pesan === pesan && t.tipe === tipe));
  daftar = [...daftar, { id, tipe, pesan, judul: opsi.judul, durasi }].slice(-MAKS_TAMPIL);
  umumkan();
  return id;
}

export const toast = {
  success: (pesan: string, opsi?: ToastOpsi) => tampilkan("success", pesan, opsi),
  error: (pesan: string, opsi?: ToastOpsi) => tampilkan("error", pesan, opsi),
  warning: (pesan: string, opsi?: ToastOpsi) => tampilkan("warning", pesan, opsi),
  info: (pesan: string, opsi?: ToastOpsi) => tampilkan("info", pesan, opsi),
  tutup: tutupToast,
};
