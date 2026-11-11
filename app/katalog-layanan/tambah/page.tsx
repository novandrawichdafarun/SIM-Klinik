import { requireSuperAdminPage } from "@/libs/authz";
import { getPoliListService } from "@/services/karyawan.service";
import AppShell from "@/components/layouts/AppShell";
import Breadcrumb from "@/components/ui/Breadcrumb";
import LayananForm from "@/components/katalog-layanan/LayananForm";
export default async function Page() { await requireSuperAdminPage(); const r=await getPoliListService(); return <AppShell><main className="px-4 py-4.5 md:px-6 md:py-6"><Breadcrumb items={[{label:"Katalog Layanan",href:"/katalog-layanan"},{label:"Tambah Layanan"}]}/><h1 className="mb-6 text-[25px] font-bold">Tambah Layanan</h1>{r.success?<LayananForm poli={r.data??[]}/>:<p>{r.error}</p>}</main></AppShell>; }
