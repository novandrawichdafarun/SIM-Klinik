import { Suspense } from "react";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";
import TambahLayananForm from "@/components/katalog-layanan/TambahLayananForm";

export default function Page() {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <Breadcrumb
          items={[
            { label: "Beranda", href: "/dashboard" },
            { label: "Katalog Layanan", href: "/katalog-layanan" },
            { label: "Tambah Layanan" },
          ]}
        />
        <h1 className="mb-6 text-[25px] font-bold">Tambah Layanan</h1>
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-xl bg-surface" />
          }
        >
          <TambahLayananForm />
        </Suspense>
      </main>
    </AppShell>
  );
}
