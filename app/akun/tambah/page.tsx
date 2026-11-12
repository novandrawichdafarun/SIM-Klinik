import { Suspense } from "react";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";
import TambahAkunForm from "@/components/akun/TambahAkunForm";

export const metadata = { title: "Tambah Akun - ERM Klinik Pratama" };

export default function TambahAkunPage({
  searchParams,
}: PageProps<"/akun/tambah">) {
  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-4 py-4.5 md:px-6 md:py-6">
        <Breadcrumb
          items={[
            { label: "Beranda", href: "/dashboard" },
            { label: "Kelola Akun", href: "/akun" },
            { label: "Tambah Akun" },
          ]}
        />
        <h1 className="mb-6 text-[25px] font-bold tracking-tight md:text-[28px]">
          Tambah Akun
        </h1>
        <Suspense
          fallback={
            <div className="h-80 animate-pulse rounded-xl bg-surface" />
          }
        >
          <TambahAkunForm searchParams={searchParams} />
        </Suspense>
      </main>
    </AppShell>
  );
}
