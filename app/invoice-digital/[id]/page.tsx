import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getInvoiceDetailAction } from "@/actions/invoice";
import InvoiceKertas from "@/components/invoice/InvoiceKertas";
import KirimInvoicePanel from "@/components/invoice/KirimInvoicePanel";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ErrorBox from "@/components/ui/ErrorBox";

export const metadata = { title: "Detail Invoice - ERM Klinik Pratama" };

async function DetailContent({ params }: Pick<PageProps<"/invoice-digital/[id]">, "params">) {
  const { id } = await params;
  const idInvoice = Number(id);
  if (!Number.isInteger(idInvoice) || idInvoice <= 0) notFound();

  const res = await getInvoiceDetailAction(idInvoice);
  if (!res.success || !res.data) {
    return <ErrorBox message={res.success ? "Invoice tidak ditemukan." : res.error} />;
  }
  const { invoice, bisaKirim } = res.data;
  return (
    <>
      <Breadcrumb
        items={[
          { label: "Invoice Digital", href: `/invoice-digital?tanggal=${invoice.tglKunjungan}` },
          { label: invoice.nomorInvoice },
        ]}
      />
      <h1 className="mb-6 text-[25px] font-bold tracking-tight md:text-[28px]">
        {invoice.nomorInvoice}
      </h1>
      <div className="grid gap-5 xl:grid-cols-[1fr_minmax(320px,380px)]">
        <InvoiceKertas invoice={invoice} />
        <KirimInvoicePanel invoice={invoice} bisaKirim={bisaKirim} />
      </div>
    </>
  );
}

export default function InvoiceDetailPage({ params }: PageProps<"/invoice-digital/[id]">) {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <Suspense fallback={<div className="h-96 animate-pulse rounded-xl bg-surface shadow-sm" />}>
          <DetailContent params={params} />
        </Suspense>
      </main>
    </AppShell>
  );
}
