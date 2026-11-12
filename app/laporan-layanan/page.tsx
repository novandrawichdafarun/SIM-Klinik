import { Suspense } from "react";
import AppShell from "@/components/layouts/AppShell";
import LaporanLayananContent from "@/components/laporan-layanan/LaporanLayananContent";

export const metadata = { title: "Laporan Layanan - ERM Klinik Pratama" };

type Props = PageProps<"/laporan-layanan">;

export default function Page(props: Props) {
  return (
    <Suspense
      fallback={
        <AppShell>
          <main className="px-4 py-4.5 md:px-6 md:py-6">Memuat laporan...</main>
        </AppShell>
      }
    >
      <LaporanLayananContent {...props} />
    </Suspense>
  );
}
