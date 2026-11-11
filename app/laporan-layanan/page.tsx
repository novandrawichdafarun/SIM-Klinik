import { getLaporanLayananAction } from "@/actions/laporan-layanan";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";
import ErrorBox from "@/components/ui/ErrorBox";
import LaporanLayananView from "@/components/laporan-layanan/LaporanLayananView";
function monthStart() { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`; }
function today() { return new Date().toISOString().slice(0,10); }
export const metadata = { title: "Laporan Layanan - ERM Klinik Pratama" };
export default async function Page({ searchParams }: PageProps<"/laporan-layanan">) { const sp=await searchParams; const mulai=typeof sp.mulai === "string" ? sp.mulai : monthStart(); const selesai=typeof sp.selesai === "string" ? sp.selesai : today(); const poli=typeof sp.poli === "string" ? sp.poli : "Semua"; const result=await getLaporanLayananAction({mulai,selesai,poli}); return <AppShell><main className="px-4 py-4.5 md:px-6 md:py-6"><Breadcrumb items={[{label:"Beranda",href:"/dashboard"},{label:"Laporan Layanan"}]}/><h1 className="text-[25px] font-bold">Laporan Layanan</h1><p className="mb-5 text-xs text-ink-3">Rekap kinerja dan pendapatan layanan berdasarkan periode dan poli.</p>{result.success&&result.data?<LaporanLayananView report={result.data}/>:<ErrorBox message={result.success?"Data laporan tidak tersedia.":result.error}/>}</main></AppShell>; }
