import { Suspense } from "react";
import AppShell from "@/components/layouts/AppShell";
import TambahPasienForm from "@/components/rekap-pasien/TambahPasienForm";

export const metadata = { title: "Tambah Pasien - ERM Klinik Pratama" };

export default function TambahPasienPage() {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-xl bg-surface" />
          }
        >
          <TambahPasienForm />
        </Suspense>
      </main>
    </AppShell>
  );
}
