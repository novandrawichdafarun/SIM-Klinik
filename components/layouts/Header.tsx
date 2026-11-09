import { Bell, CircleHelp, Menu, UserRound } from "lucide-react";
import Brand from "../assets/Brand";

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  return (
    <header className="flex h-16.5 items-center justify-between border-b border-[#eeeaf0] bg-white px-4 lg:justify-end lg:px-6">
      <button
        aria-label="Buka menu"
        className="text-[#29263a] lg:hidden"
        onClick={onMenuClick}
      >
        <Menu size={23} />
      </button>

      <div className="ml-3 mr-auto lg:hidden">
        <Brand compact />
      </div>

      <div className="flex items-center gap-3 lg:gap-4">
        <button aria-label="Notifikasi" className="relative text-[#29263a]">
          <Bell size={17} />
          <span className="absolute -right-1 -top-1 size-2.5 rounded-full bg-red-600" />
        </button>
        <button aria-label="Bantuan" className="hidden text-[#29263a] sm:block">
          <CircleHelp size={17} />
        </button>
        <span className="hidden h-8 border-l border-[#eeeaf0] sm:block" />
        <div className="hidden text-right text-[10px] font-semibold sm:block">
          dr. Sarah Ramadhani Sp.PD
          <small className="mt-1 block text-[8px] font-bold text-emerald-700">
            DOKTER UMUM
          </small>
        </div>
        <button
          aria-label="Profil"
          className="grid size-8 place-items-center rounded-full bg-emerald-800 text-white"
        >
          <UserRound size={17} />
        </button>
      </div>
    </header>
  );
}
