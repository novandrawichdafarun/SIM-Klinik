import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getKaryawanDetailAction } from "@/actions/karyawan";
import KaryawanDetailView from "@/components/karyawan/KaryawanDetailView";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ErrorBox from "@/components/ui/ErrorBox";

export const metadata = { title: "Detail Karyawan - ERM Klinik Pratama" };

type Props = PageProps<"/karyawan/[id]">;

async function DetailContent({
  params,
  searchParams,
}: Pick<Props, "params" | "searchParams">) {
  const [{ id }, sp] = await Promise.all([params, searchParams]);
  const idKaryawan = Number(id);
  if (!Number.isInteger(idKaryawan) || idKaryawan <= 0) notFound();

  const periode =
    typeof sp.periode === "string" ? Number(sp.periode) : undefined;
  const result = await getKaryawanDetailAction(idKaryawan, periode);

  if (!result.success || !result.data) {
    return (
      <>
        <Breadcrumb
          items={[
            { label: "Beranda", href: "/dashboard" },
            { label: "Kelola Karyawan", href: "/karyawan" },
            { label: "Detail" },
          ]}
        />
        <ErrorBox
          message={result.success ? "Data tidak tersedia." : result.error}
        />
      </>
    );
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: "Beranda", href: "/dashboard" },
          { label: "Kelola Karyawan", href: "/karyawan" },
          { label: result.data.karyawan.namaLengkap },
        ]}
      />
      <KaryawanDetailView data={result.data} />
    </>
  );
}

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
          <DetailContent params={params} searchParams={searchParams} />
        </Suspense>
      </main>
    </AppShell>
  );
}
