import { Suspense } from "react";
import { getAkunByIdAction } from "@/actions/akun";
import AkunForm from "@/components/akun/AkunForm";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ErrorBox from "@/components/ui/ErrorBox";

export const metadata = { title: "Ubah Akun - ERM Klinik Pratama" };

async function UbahAkunForm({ params }: Pick<PageProps<"/akun/[id]/ubah">, "params">) {
  const { id } = await params;
  const result = await getAkunByIdAction(id);
  if (!result.success || !result.data) {
    return <ErrorBox message={result.success ? "Akun tidak ditemukan." : result.error} />;
  }
  return <AkunForm mode="edit" akun={result.data.akun} isSelf={result.data.isSelf} />;
}

export default function UbahAkunPage({ params }: PageProps<"/akun/[id]/ubah">) {
  return (
    <AppShell>
      <main className="mx-auto max-w-3xl px-4 py-4.5 md:px-6 md:py-6">
        <Breadcrumb items={[{ label: "Kelola Akun", href: "/akun" }, { label: "Ubah Akun" }]} />
        <h1 className="mb-6 text-[25px] font-bold tracking-tight md:text-[28px]">Ubah Akun</h1>
        <Suspense fallback={<div className="h-80 animate-pulse rounded-xl bg-surface" />}>
          <UbahAkunForm params={params} />
        </Suspense>
      </main>
    </AppShell>
  );
}
