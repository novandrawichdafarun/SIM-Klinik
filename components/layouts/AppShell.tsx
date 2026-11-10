"use client";

import { useState, type ReactNode } from "react";
import Header from "@/components/layouts/Header";
import Sidebar from "@/components/layouts/Sidebar";

export default function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background font-sans text-ink">
      <Sidebar menuOpen={menuOpen} onClose={() => setMenuOpen(false)} />

      <div className="lg:ml-55">
        <Header onMenuClick={() => setMenuOpen(true)} />
        {children}
      </div>
    </div>
  );
}
