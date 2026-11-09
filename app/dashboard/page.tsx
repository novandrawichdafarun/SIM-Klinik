import AppShell from "@/components/layouts/AppShell";

export default function DashboardPage() {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <div className="mb-2 text-[10px] text-[#514d5c]">
          Beranda › SDM &amp; Kepegawaian
        </div>
        <h1 className="text-[25px] font-bold tracking-tight md:text-[28px]">
          Dashboard Utama
        </h1>
      </main>
    </AppShell>
  );
}
