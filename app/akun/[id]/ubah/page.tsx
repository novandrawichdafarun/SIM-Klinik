import { Suspense } from "react";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";
import UbahAkunForm from "@/components/akun/UbahAkunForm";

export const metadata = { title: "Ubah Akun - ERM Klinik Pratama" };

export default function UbahAkunPage({ params }: PageProps<"/akun/[id]/ubah">) {
  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-4 py-4.5 md:px-6 md:py-6">
        <Breadcrumb
          items={[
            { label: "Beranda", href: "/dashboard" },
            { label: "Kelola Akun", href: "/akun" },
            { label: "Ubah Akun" },
          ]}
        />
        <h1 className="mb-6 text-[25px] font-bold tracking-tight md:text-[28px]">
          Ubah Akun
        </h1>
        <Suspense
          fallback={
            <div className="h-80 animate-pulse rounded-xl bg-surface" />
          }
        >
          <UbahAkunForm params={params} />
        </Suspense>
      </main>
    </AppShell>
  );
}
