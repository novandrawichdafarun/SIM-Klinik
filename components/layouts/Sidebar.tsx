"use client";

import {
  ClipboardList,
  FileBarChart,
  FileText,
  HandCoins,
  LayoutDashboard,
  Shield,
  UserRound,
  UsersRound,
  Wallet,
  X,
} from "lucide-react";
import Brand from "../assets/Brand";

const navGroups = [
  {
    label: "MENU",
    links: [
      { name: "Dashboard Utama", href: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "SDM",
    links: [
      { name: "Kelola Karyawan", href: "/karyawan", icon: UsersRound },
      { name: "Kelola Akun", href: "#", icon: UserRound },
      { name: "Hak Akses", href: "#", icon: Shield },
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
      { name: "Verifikasi Pembayaran", href: "#", icon: Wallet },
      { name: "Laporan Keuangan", href: "#", icon: FileText },
    ],
  },
];

function Navigation({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <nav className="py-2">
      {navGroups.map((group) => (
        <section className="mt-3" key={group.label}>
          <p className="px-4 pb-1.5 text-[8px] font-bold tracking-wide text-[#777383]">
            {group.label}
          </p>
          {group.links.map(({ name, href, icon: Icon }) => {
            const active = name === "Kelola Karyawan";

            return (
              <a
                key={name}
                href={href}
                onClick={onNavigate}
                className={`mx-1 flex h-[34px] items-center gap-2.5 rounded-md px-3 text-[11px] ${
                  active
                    ? "bg-emerald-500 text-white"
                    : "text-[#555263] hover:bg-gray-50"
                }`}
              >
                <Icon size={14} strokeWidth={1.8} />
                {name}
              </a>
            );
          })}
        </section>
      ))}
    </nav>
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
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[220px] border-r border-[#eeeaf0] bg-white lg:block">
        <div className="flex h-[66px] items-center border-b border-[#f1edf2] px-4">
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
          <aside className="relative h-full w-[260px] bg-white p-4">
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
