import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import AuthProvider from "@/components/auth/AuthProvider";
import ThemeProvider from "@/components/theme/ThemeProvider";
import { Suspense } from "react";
import FlashToast from "@/components/feedback/FlashToast";
import KonfirmasiHost from "@/components/feedback/KonfirmasiHost";
import Toaster from "@/components/feedback/Toaster";
import IntlProvider from "@/components/language/IntlProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ERM-KLINIK PRATAMA",
  description: "Sistem Informasi Klinik Pratama",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: next-themes menambah class "dark" di <html> sebelum React hidrasi
    <html
      lang="id"
      className={`${inter.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <link rel="icon" href="/logo.png" />
      <link rel="apple-touch-icon" href="/logo.png" />
      <body className="min-h-full flex flex-col">
        <Suspense fallback={null}>
          <IntlProvider>
            <ThemeProvider>
              <AuthProvider>{children}</AuthProvider>
              {/* Feedback global: toast otomatis, dialog konfirmasi, pesan setelah redirect */}
              <Toaster />
              <KonfirmasiHost />
              <Suspense fallback={null}>
                <FlashToast />
              </Suspense>
            </ThemeProvider>
          </IntlProvider>
        </Suspense>
      </body>
    </html>
  );
}
