import { Suspense } from "react";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";
import InvoiceDigitalContent from "@/components/invoice/InvoiceDigitalContent";

export const metadata = { title: "Invoice Digital - ERM Klinik Pratama" };

export default function InvoiceDigitalPage({
  searchParams,
}: PageProps<"/invoice-digital">) {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <Breadcrumb
          items={[
            { label: "Beranda", href: "/dashboard" },
            { label: "Invoice Digital" },
          ]}
        />
        <h1 className="text-[25px] font-bold tracking-tight md:text-[28px]">
          Invoice Digital
        </h1>
        <p className="mt-1 mb-6 text-sm text-ink-3">
          Buat invoice untuk kunjungan yang sudah selesai, lalu kirim invoice
          dan tautan rating ke pasien via WhatsApp.
        </p>
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-xl bg-surface shadow-sm" />
          }
        >
          <InvoiceDigitalContent searchParams={searchParams} />
        </Suspense>
      </main>
    </AppShell>
  );
}
