/** Identitas klinik yang tampil di invoice & halaman rating pasien */
export const NAMA_KLINIK = "Klinik Pratama Unusa";

/**
 * Nomor HP Indonesia → format wa.me (62xxxxxxxx). null bila tidak valid.
 * Contoh: "0812-9843-2213" → "6281298432213", "+62 812..." → "62812..."
 */
export function nomorWhatsApp(noHp: string | null | undefined): string | null {
  const digit = (noHp ?? "").replace(/\D/g, "");
  let n = digit;
  if (n.startsWith("0")) n = `62${n.slice(1)}`;
  else if (n.startsWith("8")) n = `62${n}`;
  return /^628\d{7,12}$/.test(n) ? n : null;
}

/** Token publik invoice/rating: 32 karakter heksadesimal */
export const POLA_TOKEN = /^[0-9a-f]{32}$/;
