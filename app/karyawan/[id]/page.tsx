import { Suspense } from "react";
import AppShell from "@/components/layouts/AppShell";
import DetailKaryawanContent from "@/components/karyawan/DetailKaryawanContent";

export const metadata = { title: "Detail Karyawan - ERM Klinik Pratama" };

type Props = PageProps<"/karyawan/[id]">;

export default function KaryawanDetailPage({ params, searchParams }: Props) {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <Suspense
          fallback={
            <div className="space-y-5">
              <div className="h-10 w-72 animate-pulse rounded-lg bg-surface" />
              <div className="h-96 animate-pulse rounded-xl bg-surface" />
            </div>
          }
        >
          <DetailKaryawanContent params={params} searchParams={searchParams} />
        </Suspense>
      </main>
    </AppShell>
  );
}
