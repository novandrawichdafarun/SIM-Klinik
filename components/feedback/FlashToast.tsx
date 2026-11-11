"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { toast, type ToastTipe } from "./toast";

const NAMA = "flash_toast"; // sama dengan NAMA_COOKIE_FLASH di libs/flash.ts

/** Tampilkan pesan flash dari server (setFlash) setiap kali halaman berganti */
export default function FlashToast() {
  const pathname = usePathname();
  const params = useSearchParams();
  const kunci = `${pathname}?${params.toString()}`;

  useEffect(() => {
    const cocok = document.cookie.split("; ").find((c) => c.startsWith(`${NAMA}=`));
    if (!cocok) return;
    document.cookie = `${NAMA}=; path=/; max-age=0; samesite=lax`;
    // Nilai cookie bisa ter-encode lebih dari sekali; decode sampai menjadi JSON
    let nilai = cocok.slice(NAMA.length + 1);
    for (let i = 0; i < 3 && !nilai.startsWith("{"); i++) {
      try {
        nilai = decodeURIComponent(nilai);
      } catch {
        break;
      }
    }
    try {
      const { pesan, tipe } = JSON.parse(nilai) as { pesan?: string; tipe?: ToastTipe };
      if (pesan) toast[tipe && tipe in toast ? tipe : "success"](pesan);
    } catch {
      // cookie rusak: abaikan
    }
  }, [kunci]);

  return null;
}
