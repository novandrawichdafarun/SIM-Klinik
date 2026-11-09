import KaryawanTabel from "@/components/karyawan/KaryawanTabel";
import AppShell from "@/components/layouts/AppShell";

export default function KaryawanPage() {
  return (
    <AppShell>
      <main className="px-4 py-4.5 md:px-6 md:py-6">
        <div className="mb-2 text-[10px] text-[#514d5c]">
          Beranda › SDM &amp; Kepegawaian ›{" "}
          <strong>Kelola Data Karyawan</strong>
        </div>
        <h1 className="mb-5 text-[25px] font-bold tracking-tight md:mb-14.5 md:text-[28px]">
          Kelola Data Karyawan
        </h1>

        <KaryawanTabel />
      </main>
    </AppShell>
  );
}
