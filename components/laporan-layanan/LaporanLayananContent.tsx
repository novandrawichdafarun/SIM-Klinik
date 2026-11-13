import { getLaporanLayananAction } from "@/actions/laporan-layanan";
import { monthStart, today } from "@/utils/date";
import { connection } from "next/server";
import AppShell from "../layouts/AppShell";
import Breadcrumb from "../ui/Breadcrumb";
import LaporanLayananView from "./LaporanLayananView";
import ErrorBox from "../ui/ErrorBox";

type Props = PageProps<"/laporan-layanan">;

export default async function LaporanLayananContent({ searchParams }: Props) {
  const sp = await searchParams;
  await connection();

  const mulai = typeof sp.mulai === "string" ? sp.mulai : monthStart();
  const selesai = typeof sp.selesai === "string" ? sp.selesai : today();
  const poli = typeof sp.poli === "string" ? sp.poli : "Semua";
  const result = await getLaporanLayananAction({ mulai, selesai, poli });

  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <div className="print-hidden">
          <Breadcrumb
            items={[
              { label: "Beranda", href: "/dashboard" },
              { label: "Laporan Layanan" },
            ]}
          />
          <h1 className="text-[25px] font-bold">Laporan Layanan</h1>
        </div>
        <p className="print-hidden mb-5 text-xs text-ink-3">
          Rekap kinerja dan pendapatan layanan berdasarkan periode dan poli.
        </p>
        {result.success && result.data ? (
          <LaporanLayananView report={result.data} />
        ) : (
          <ErrorBox
            message={
              result.success ? "Data laporan tidak tersedia." : result.error
            }
          />
        )}
      </main>
    </AppShell>
  );
}
