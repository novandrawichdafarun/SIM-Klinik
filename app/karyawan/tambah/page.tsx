import { Suspense } from "react";
import { getKaryawanFormDataAction } from "@/actions/karyawan";
import KaryawanForm from "@/components/karyawan/KaryawanForm";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ErrorBox from "@/components/ui/ErrorBox";

export const metadata = { title: "Tambah Karyawan - ERM Klinik Pratama" };

async function TambahKaryawanForm() {
  const result = await getKaryawanFormDataAction();
  if (!result.success || !result.data) {
    return (
      <ErrorBox
        message={result.success ? "Data tidak tersedia." : result.error}
      />
    );
  }
  return <KaryawanForm poli={result.data.poli} initialValues={null} />;
}

export default function TambahKaryawanPage() {
  return (
    <AppShell>
      <main className="mx-auto max-w-4xl px-4 py-4.5 md:px-6 md:py-6">
        <Breadcrumb
          items={[
            { label: "Beranda", href: "/dashboard" },
            { label: "Kelola Karyawan", href: "/karyawan" },
            { label: "Tambah Karyawan" },
          ]}
        />
        <h1 className="mb-6 text-[25px] font-bold tracking-tight md:text-[28px]">
          Tambah Karyawan Baru
        </h1>
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-xl bg-surface" />
          }
        >
          <TambahKaryawanForm />
        </Suspense>
      </main>
    </AppShell>
  );
}
