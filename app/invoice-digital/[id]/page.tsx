import { Suspense } from "react";
import AppShell from "@/components/layouts/AppShell";
import DetailInvoiceContent from "@/components/invoice/DetailInvoiceContent";

export const metadata = { title: "Detail Invoice - ERM Klinik Pratama" };

export default function InvoiceDetailPage({
  params,
}: PageProps<"/invoice-digital/[id]">) {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-xl bg-surface shadow-sm" />
          }
        >
          <DetailInvoiceContent params={params} />
        </Suspense>
      </main>
    </AppShell>
  );
}
