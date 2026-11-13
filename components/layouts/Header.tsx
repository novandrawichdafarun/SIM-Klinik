"use client";

import { konfirmasi } from "@/components/feedback/konfirmasi";
import { useEffect, useState } from "react";
import { signOut, useSession } from "next-auth/react";
import { LogOut, Menu, UserRound } from "lucide-react";
import Brand from "../assets/Brand";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { clearDbSessionAction } from "@/actions/auth";
import { getProfileAction } from "@/actions/profile";
import type { UserProfile } from "@/types/profile";
import { roleLabel } from "@/utils/format";

type ProfileState = {
  userId: string;
  profile: UserProfile | null;
};

export default function Header({ onMenuClick }: { onMenuClick: () => void }) {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const [profileState, setProfileState] = useState<ProfileState | null>(null);

  // Ambil profil setiap kali user yang login berubah
  useEffect(() => {
    if (!userId) return;

    let cancelled = false;
    getProfileAction()
      .catch(() => null)
      .then((res) => {
        if (cancelled) return;
        setProfileState({
          userId,
          profile: res?.success && res.data ? res.data : null,
        });
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Hasil milik user sebelumnya (setelah ganti akun) dianggap belum dimuat
  const isLoading = !profileState || profileState.userId !== userId;
  const profile =
    profileState && profileState.userId === userId
      ? profileState.profile
      : null;

  const displayName =
    profile?.namaLengkap || profile?.email || "Profil tidak tersedia";
  const displayRole =
    profile?.jenisKaryawan || (profile ? roleLabel(profile.role) : "");
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    const setuju = await konfirmasi({
      judul: "Keluar dari aplikasi?",
      pesan: "Anda perlu masuk kembali untuk melanjutkan pekerjaan.",
      teksYa: "Ya, keluar",
      tipe: "peringatan",
    });
    if (!setuju) return;
    setIsLoggingOut(true);
    // Hapus baris user_sessions supaya slot perangkat (maks. 3) ikut dibebaskan
    const sessionToken = session?.user?.sessionToken;
    if (sessionToken)
      await clearDbSessionAction(sessionToken).catch(() => null);
    await signOut({ callbackUrl: "/" });
  }

  return (
    <header className="flex h-16.5 items-center justify-between border-b border-line bg-surface px-4 lg:justify-end lg:px-6 print:hidden">
      <button
        aria-label="Buka menu"
        className="text-ink lg:hidden"
        onClick={onMenuClick}
      >
        <Menu size={23} />
      </button>

      <div className="ml-3 mr-auto lg:hidden">
        <Brand compact />
      </div>

      <div className="flex items-center gap-3 lg:gap-4">
        <ThemeToggle />
        <span className="hidden h-8 border-l border-line sm:block" />
        <div className="hidden text-right text-[10px] font-semibold sm:block">
          {isLoading ? (
            <>
              <span className="block h-3 w-28 animate-pulse rounded bg-line" />
              <span className="ml-auto mt-1 block h-2 w-16 animate-pulse rounded bg-line" />
            </>
          ) : (
            <>
              <p className="truncate text-[12px] font-bold text-ink">
                {displayName}
              </p>
              {displayRole && (
                <small className="mt-1 block text-[10px] font-bold uppercase text-accent-ink">
                  {displayRole}
                </small>
              )}
            </>
          )}
        </div>
        <button
          aria-label="Profil"
          className="grid size-8 place-items-center rounded-full bg-emerald-800 text-white"
        >
          <UserRound size={17} />
        </button>
        <button
          type="button"
          onClick={handleLogout}
          disabled={isLoggingOut}
          className="flex h-8 items-center gap-1.5 rounded-lg border border-line px-2.5 text-[11px] font-semibold text-ink hover:bg-surface-hover disabled:opacity-60"
        >
          <LogOut aria-hidden="true" size={16} />
          <span className="hidden sm:inline">
            {isLoggingOut ? "Keluar..." : "Keluar"}
          </span>
          <span className="sr-only sm:hidden">Keluar</span>
        </button>
      </div>
    </header>
  );
}
