import { Suspense } from "react";
import AppShell from "@/components/layouts/AppShell";
import UbahPasienForm from "@/components/rekap-pasien/UbahPasienForm";

export const metadata = { title: "Ubah Data Pasien - ERM Klinik Pratama" };

export default function UbahPasienPage({
  params,
}: PageProps<"/rekap-pasien/pasien/[id]/ubah">) {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-xl bg-surface" />
          }
        >
          <UbahPasienForm params={params} />
        </Suspense>
      </main>
    </AppShell>
  );
}
