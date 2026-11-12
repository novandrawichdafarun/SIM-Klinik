import { Suspense } from "react";
import AppShell from "@/components/layouts/AppShell";
import UbahLayananForm from "@/components/katalog-layanan/UbahLayananForm";

export default function Page({
  params,
}: PageProps<"/katalog-layanan/[id]/ubah">) {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <Suspense
          fallback={
            <div className="h-96 animate-pulse rounded-xl bg-surface" />
          }
        >
          <UbahLayananForm params={params} />
        </Suspense>
      </main>
    </AppShell>
  );
}
