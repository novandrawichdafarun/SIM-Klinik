import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getKaryawanFormDataAction } from "@/actions/karyawan";
import KaryawanForm from "@/components/karyawan/KaryawanForm";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ErrorBox from "@/components/ui/ErrorBox";

export const metadata = { title: "Ubah Data Karyawan - ERM Klinik Pratama" };

async function UbahKaryawanForm({
  params,
}: Pick<PageProps<"/karyawan/[id]/ubah">, "params">) {
  const { id } = await params;
  const idKaryawan = Number(id);
  if (!Number.isInteger(idKaryawan) || idKaryawan <= 0) notFound();

  const result = await getKaryawanFormDataAction(idKaryawan);
  if (!result.success || !result.data) {
    return (
      <ErrorBox
        message={result.success ? "Data tidak tersedia." : result.error}
      />
    );
  }

  const { poli, values } = result.data;
  return (
    <>
      <Breadcrumb
        items={[
          { label: "Beranda", href: "/dashboard" },
          { label: "Kelola Karyawan", href: "/karyawan" },
          {
            label: values?.namaLengkap ?? "Karyawan",
            href: `/karyawan/${idKaryawan}`,
          },
          { label: "Ubah Data" },
        ]}
      />
      <h1 className="mb-6 text-[25px] font-bold tracking-tight md:text-[28px]">
        Ubah Data Karyawan
      </h1>
      <KaryawanForm poli={poli} initialValues={values} />
    </>
  );
}

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
