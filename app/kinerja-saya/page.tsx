import { Suspense } from "react";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";
import KinerjaContent from "@/components/kinerja-saya/KinerjaContent";

export const metadata = { title: "Kinerja Saya - ERM Klinik Pratama" };

export default function KinerjaSayaPage({
  searchParams,
}: PageProps<"/kinerja-saya">) {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <Breadcrumb
          items={[
            { label: "Beranda", href: "/dashboard" },
            { label: "Kinerja Saya" },
          ]}
        />
        <Suspense
          fallback={
            <div className="space-y-5">
              <div className="h-10 w-72 animate-pulse rounded-lg bg-surface" />
              <div className="h-96 animate-pulse rounded-xl bg-surface" />
            </div>
          }
        >
          <KinerjaContent searchParams={searchParams} />
        </Suspense>
      </main>
    </AppShell>
  );
}
