"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ClipboardList,
  FileBarChart,
  FileText,
  HandCoins,
  IdCard,
  KeyRound,
  LayoutDashboard,
  Shield,
  UsersRound,
  Wallet,
  X,
  type LucideIcon,
  Star,
  ReceiptText,
} from "lucide-react";
import Brand from "../assets/Brand";
import { getAksesMenuAction, type AksesMenu } from "@/actions/menu";

/**
 * Aturan tampil menu (harus sama dengan pengecekan di halaman/server action):
 *  - "semua"      : setiap akun yang login
 *  - "superAdmin" : hanya Pimpinan Klinik / Super Admin
 *  - fitur[]      : Super Admin, atau akun yang dicentang "Lihat" salah satu fitur di Hak Akses
 * Menyembunyikan menu hanya untuk tampilan; pengamanan tetap di proxy.ts & server action.
 */
type Aturan = "semua" | "superAdmin" | (keyof AksesMenu["lihat"])[];
type NavLink = { name: string; href: string; icon: LucideIcon; akses: Aturan };
type NavGroup = { label: string; links: NavLink[] };

const navGroups: NavGroup[] = [
  {
    label: "MENU",
    links: [{ name: "Dashboard Utama", href: "/dashboard", icon: LayoutDashboard, akses: "semua" }],
  },
  {
    label: "PASIEN",
    links: [
      {
        name: "Rekap Data Pasien",
        href: "/rekap-pasien",
        icon: IdCard,
        akses: ["rekap_pasien", "input_pasien"],
      },
    ],
  },
  {
    // Data pribadi karyawan (termasuk Pimpinan Klinik yang juga menangani pasien)
    label: "SAYA",
    links: [
      { name: "Kinerja Saya", href: "/kinerja-saya", icon: Star, akses: "semua" },
      { name: "Jasa Pelayanan Saya", href: "/jasa-pelayanan", icon: Wallet, akses: "semua" },
    ],
  },
  {
    label: "SDM",
    links: [
      { name: "Kelola Karyawan", href: "/karyawan", icon: UsersRound, akses: "superAdmin" },
      { name: "Kelola Akun", href: "/akun", icon: KeyRound, akses: "superAdmin" },
      { name: "Hak Akses", href: "/hak-akses", icon: Shield, akses: "superAdmin" },
    ],
  },
  {
    label: "LAYANAN",
    links: [
      { name: "Tarif Jasa Pelayanan", href: "/tarif-jasa", icon: HandCoins, akses: "superAdmin" },
      {
        name: "Katalog Layanan",
        href: "/katalog-layanan",
        icon: ClipboardList,
        akses: ["katalog_layanan"],
      },
      {
        name: "Laporan Layanan",
        href: "/laporan-layanan",
        icon: FileBarChart,
        akses: "superAdmin",
      },
    ],
  },
  {
    label: "KEUANGAN",
    links: [
      {
        name: "Invoice Digital",
        href: "/invoice-digital",
        icon: ReceiptText,
        akses: ["invoice_digital"],
      },
      { name: "Verifikasi Reimburse", href: "#", icon: Wallet, akses: ["reimburse"] },
      { name: "Laporan Keuangan", href: "#", icon: FileText, akses: ["arus_kas"] },
    ],
  },
];

function boleh(aturan: Aturan, akses: AksesMenu | null): boolean {
  if (aturan === "semua") return true;
  if (!akses) return false; // belum dimuat → sembunyikan dulu
  if (akses.isSuperAdmin) return true;
  if (aturan === "superAdmin") return false;
  return aturan.some((f) => akses.lihat[f]);
}

/** Cache per akun selama tab terbuka, supaya menu tidak berkedip tiap pindah halaman */
const cacheAkses = new Map<string, AksesMenu>();

function useAksesMenu(): AksesMenu | null {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [state, setState] = useState<{ userId: string; akses: AksesMenu } | null>(null);

  useEffect(() => {
    if (!userId) return;
    let batal = false;
    // Selalu ambil ulang di latar belakang: perubahan Hak Akses langsung terlihat
    getAksesMenuAction()
      .catch(() => null)
      .then((akses) => {
        if (batal || !akses) return;
        cacheAkses.set(userId, akses);
        setState({ userId, akses });
      });
    return () => {
      batal = true;
    };
  }, [userId]);

  if (!userId) return null;
  if (state?.userId === userId) return state.akses;
  return cacheAkses.get(userId) ?? null;
}

function NavList({ pathname, onNavigate }: { pathname: string | null; onNavigate?: () => void }) {
  const akses = useAksesMenu();
  // Grup tanpa menu yang boleh dibuka ikut disembunyikan
  const groups = navGroups
    .map((g) => ({ ...g, links: g.links.filter((l) => boleh(l.akses, akses)) }))
    .filter((g) => g.links.length > 0);

  return (
    <nav className="py-2" aria-label="Menu utama">
      {groups.map((group) => (
        <section className="mt-3" key={group.label}>
          <p className="px-4 pb-1.5 text-[10px] font-bold tracking-wide text-ink-3">
            {group.label}
          </p>
          {group.links.map(({ name, href, icon: Icon }) => {
            const active =
              pathname !== null &&
              href !== "#" &&
              (pathname === href || pathname.startsWith(`${href}/`));

            return (
              <Link
                key={name}
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                className={`mx-1 flex h-8.5 items-center gap-2.5 rounded-md px-3 text-[12px] ${
                  active
                    ? "bg-emerald-500 text-white font-semibold"
                    : "text-ink-3 hover:bg-surface-hover"
                }`}
              >
                <Icon aria-hidden="true" size={14} strokeWidth={1.8} />
                {name}
              </Link>
            );
          })}
        </section>
      ))}
    </nav>
  );
}

function ActiveNavList({ onNavigate }: { onNavigate?: () => void }) {
  return <NavList pathname={usePathname()} onNavigate={onNavigate} />;
}

/** usePathname() dibaca di dalam Suspense (wajib di route dinamis dengan cacheComponents) */
function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Suspense fallback={<NavList pathname={null} onNavigate={onNavigate} />}>
      <ActiveNavList onNavigate={onNavigate} />
    </Suspense>
  );
}

export default function Sidebar({ menuOpen, onClose }: { menuOpen: boolean; onClose: () => void }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-55 border-r border-line bg-surface lg:block">
        <div className="flex h-16.5 items-center border-b border-line px-4">
          <Brand />
        </div>
        <Navigation />
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Tutup menu"
            className="absolute inset-0 size-full bg-black/30"
            onClick={onClose}
          />
          <aside className="relative h-full w-65 bg-surface p-4">
            <div className="flex items-center justify-between border-b pb-4">
              <Brand />
              <button aria-label="Tutup menu" onClick={onClose}>
                <X size={20} />
              </button>
            </div>
            <Navigation onNavigate={onClose} />
          </aside>
        </div>
      )}
    </>
  );
}
