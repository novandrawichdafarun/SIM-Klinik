import { Suspense } from "react";
import AppShell from "@/components/layouts/AppShell";
import UbahKaryawanForm from "@/components/karyawan/UbahKaryawanForm";

export const metadata = { title: "Ubah Data Karyawan - ERM Klinik Pratama" };

export default function UbahKaryawanPage({
  params,
}: PageProps<"/karyawan/[id]/ubah">) {
  return (
    <AppShell>
      <main className="mx-auto max-w-4xl px-4 py-4.5 md:px-6 md:py-6">
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-xl bg-surface" />
          }
        >
          <UbahKaryawanForm params={params} />
        </Suspense>
      </main>
    </AppShell>
  );
}
