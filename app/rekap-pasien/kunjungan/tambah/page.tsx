import { Suspense } from "react";
import { getKunjunganFormAction } from "@/actions/rekap-pasien";
import AppShell from "@/components/layouts/AppShell";
import KunjunganForm from "@/components/rekap-pasien/KunjunganForm";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ErrorBox from "@/components/ui/ErrorBox";
import { hariIni } from "@/utils/format";

export const metadata = { title: "Daftarkan Kunjungan - ERM Klinik Pratama" };

async function Konten({ searchParams }: Pick<PageProps<"/rekap-pasien/kunjungan/tambah">, "searchParams">) {
  const sp = await searchParams;
  const tanggal =
    typeof sp.tanggal === "string" && /^\d{4}-\d{2}-\d{2}$/.test(sp.tanggal) ? sp.tanggal : hariIni();
  const pasien = typeof sp.pasien === "string" ? Number(sp.pasien) : undefined;

  const res = await getKunjunganFormAction();
  if (!res.success || !res.data) {
    return <ErrorBox message={res.success ? "Data tidak tersedia." : res.error} />;
  }
  return <KunjunganForm {...res.data} defaultPasien={pasien} defaultTanggal={tanggal} />;
}

export default function TambahKunjunganPage({ searchParams }: PageProps<"/rekap-pasien/kunjungan/tambah">) {
  return (
    <AppShell>
      <main className="mx-auto max-w-4xl px-4 py-4.5 md:px-6 md:py-6">
        <Breadcrumb
          items={[{ label: "Rekap Data Pasien", href: "/rekap-pasien" }, { label: "Daftarkan Kunjungan" }]}
        />
        <h1 className="mb-6 text-[25px] font-bold tracking-tight md:text-[28px]">Daftarkan Kunjungan</h1>
        <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface" />}>
          <Konten searchParams={searchParams} />
        </Suspense>
      </main>
    </AppShell>
  );
}
