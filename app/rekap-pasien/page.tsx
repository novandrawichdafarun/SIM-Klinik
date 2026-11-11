import { Suspense } from "react";
import {
  getAksesRekapAction,
  getDaftarPasienAction,
  getKunjunganHariIniAction,
} from "@/actions/rekap-pasien";
import AppShell from "@/components/layouts/AppShell";
import KunjunganView from "@/components/rekap-pasien/KunjunganView";
import AntreanDiagnosaView from "@/components/rekap-pasien/AntreanDiagnosaView";
import PasienListView from "@/components/rekap-pasien/PasienListView";
import { TabLink } from "@/components/rekap-pasien/RekapToolbar";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ErrorBox from "@/components/ui/ErrorBox";

export const metadata = { title: "Rekap Data Pasien - ERM Klinik Pratama" };

type Tab = "kunjungan" | "saya" | "semua";

async function RekapContent({ searchParams }: Pick<PageProps<"/rekap-pasien">, "searchParams">) {
  const sp = await searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const q = str("q");

  // Hak akses menentukan tab yang tampil; dokter hanya mendapat "Pasien Saya"
  const hak = await getAksesRekapAction();
  if (!hak.success || !hak.data) {
    return <ErrorBox message={!hak.success ? hak.error : "Data tidak tersedia."} />;
  }
  const minta = str("tab");
  let tab: Tab = minta === "saya" ? "saya" : minta === "semua" ? "semua" : "kunjungan";
  if (tab === "kunjungan" && !hak.data.bisaLihatKunjungan) tab = "saya";
  if (tab === "semua" && !hak.data.bisaLihatSemuaPasien) tab = "saya";
  const hanyaSatuTab = !hak.data.bisaLihatKunjungan && !hak.data.bisaLihatSemuaPasien;

  const kunjungan =
    tab === "kunjungan" ? await getKunjunganHariIniAction({ tanggal: str("tanggal"), q }) : null;
  const pasien =
    tab !== "kunjungan" ? await getDaftarPasienAction({ q, semua: tab === "semua" }) : null;

  const result = kunjungan ?? pasien;
  if (!result || !result.success || !result.data) {
    return <ErrorBox message={result && !result.success ? result.error : "Data tidak tersedia."} />;
  }
  const akses = result.data.akses;

  return (
    <>
      <div role="tablist" className="mb-5 flex gap-6 border-b border-line">
        {akses.bisaLihatKunjungan && (
          <TabLink href="/rekap-pasien" active={tab === "kunjungan"}>
            Kunjungan Hari Ini
          </TabLink>
        )}
        <TabLink href="/rekap-pasien?tab=saya" active={tab === "saya" || hanyaSatuTab}>
          Pasien Saya
        </TabLink>
        {akses.bisaLihatSemuaPasien && (
          <TabLink href="/rekap-pasien?tab=semua" active={tab === "semua"}>
            Semua Pasien
          </TabLink>
        )}
      </div>

      {kunjungan?.success && kunjungan.data && (
        <KunjunganView
          key={kunjungan.data.tanggal}
          tanggal={kunjungan.data.tanggal}
          items={kunjungan.data.items}
          q={q}
          akses={akses}
        />
      )}
      {pasien?.success && pasien.data?.antrean && (
        <AntreanDiagnosaView items={pasien.data.antrean} q={q} />
      )}
      {pasien?.success && pasien.data && (
        <PasienListView
          items={pasien.data.items}
          q={q}
          akses={akses}
          mode={tab === "semua" ? "semua" : "saya"}
        />
      )}
    </>
  );
}

export default function RekapPasienPage({ searchParams }: PageProps<"/rekap-pasien">) {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <Breadcrumb
          items={[{ label: "Beranda", href: "/dashboard" }, { label: "Rekap Data Pasien" }]}
        />
        <h1 className="mb-5 text-[25px] font-bold tracking-tight md:text-[28px]">
          Rekap Data Pasien
        </h1>
        <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface shadow-sm" />}>
          <RekapContent searchParams={searchParams} />
        </Suspense>
      </main>
    </AppShell>
  );
}
