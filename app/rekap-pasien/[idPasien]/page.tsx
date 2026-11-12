import { Suspense } from "react";
import AppShell from "@/components/layouts/AppShell";
import DetailRekapContent from "@/components/rekap-pasien/DetailRekapContent";

export const metadata = { title: "Detail Pasien - ERM Klinik Pratama" };

export default function DetailPasienPage({
  params,
}: PageProps<"/rekap-pasien/[idPasien]">) {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-xl bg-surface shadow-sm" />
          }
        >
          <DetailRekapContent params={params} />
        </Suspense>
      </main>
    </AppShell>
  );
}
