"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ClipboardList,
  FileBarChart,
  FileText,
  HandCoins,
  KeyRound,
  LayoutDashboard,
  Shield,
  UsersRound,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import Brand from "../assets/Brand";

type NavLink = { name: string; href: string; icon: LucideIcon };
type NavGroup = { label: string; links: NavLink[]; superAdminOnly?: boolean };

const navGroups: NavGroup[] = [
  {
    label: "MENU",
    links: [
      { name: "Dashboard Utama", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    // Hanya Pimpinan Klinik / Super Admin. Ini sekadar menyembunyikan menu;
    // pengamanan sesungguhnya ada di proxy.ts dan setiap server action.
    label: "SDM",
    superAdminOnly: true,
    links: [
      { name: "Kelola Karyawan", href: "/karyawan", icon: UsersRound },
      { name: "Kelola Akun", href: "/akun", icon: KeyRound },
      { name: "Hak Akses", href: "/hak-akses", icon: Shield },
    ],
  },
  {
    label: "LAYANAN",
    links: [
      { name: "Tarif Jasa Pelayanan", href: "#", icon: HandCoins },
      { name: "Katalog Layanan", href: "#", icon: ClipboardList },
      { name: "Laporan Layanan", href: "#", icon: FileBarChart },
    ],
  },
  {
    label: "KEUANGAN",
    links: [
      { name: "Verifikasi Reimburse", href: "#", icon: Wallet },
      { name: "Laporan Keuangan", href: "#", icon: FileText },
    ],
  },
];

function NavList({
  pathname,
  onNavigate,
}: {
  pathname: string | null;
  onNavigate?: () => void;
}) {
  const { data: session } = useSession();
  const isSuperAdmin = session?.user?.role === "super_admin";

  return (
    <nav className="py-2" aria-label="Menu utama">
      {navGroups
        .filter((group) => !group.superAdminOnly || isSuperAdmin)
        .map((group) => (
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

export default function Sidebar({
  menuOpen,
  onClose,
}: {
  menuOpen: boolean;
  onClose: () => void;
}) {
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
          <aside className="relative h-full w-[260px] bg-surface p-4">
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
