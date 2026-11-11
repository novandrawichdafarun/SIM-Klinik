import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getPemeriksaanAction } from "@/actions/rekap-pasien";
import AppShell from "@/components/layouts/AppShell";
import PemeriksaanForm from "@/components/rekap-pasien/PemeriksaanForm";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ErrorBox from "@/components/ui/ErrorBox";

export const metadata = { title: "Pemeriksaan & Diagnosa - ERM Klinik Pratama" };

async function Konten({
  params,
  searchParams,
}: Pick<PageProps<"/rekap-pasien/kunjungan/[id]/periksa">, "params" | "searchParams">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const idKunjungan = Number(id);
  if (!Number.isInteger(idKunjungan) || idKunjungan <= 0) notFound();

  const res = await getPemeriksaanAction(idKunjungan);
  if (!res.success || !res.data) {
    return <ErrorBox message={res.success ? "Kunjungan tidak ditemukan." : res.error} />;
  }
  const k = res.data.kunjungan;
  return (
    <>
      <Breadcrumb
        items={[
          { label: "Rekap Data Pasien", href: "/rekap-pasien" },
          { label: k.namaPasien, href: `/rekap-pasien/pasien/${k.idPasien}` },
          { label: "Pemeriksaan" },
        ]}
      />
      <h1 className="mb-6 text-[25px] font-bold tracking-tight md:text-[28px]">
        Pemeriksaan &amp; Diagnosa
      </h1>
      <PemeriksaanForm {...res.data} tabAwal={sp.tab === "diagnosa" ? "diagnosa" : "pemeriksaan"} />
    </>
  );
}

export default function PeriksaPage({
  params,
  searchParams,
}: PageProps<"/rekap-pasien/kunjungan/[id]/periksa">) {
  return (
    <AppShell>
      <main className="mx-auto max-w-5xl px-4 py-4.5 md:px-6 md:py-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface" />}>
          <Konten params={params} searchParams={searchParams} />
        </Suspense>
      </main>
    </AppShell>
  );
}
