import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import AuthProvider from "@/components/auth/AuthProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "ERM-KLINIK PRATAMA",
  description: "Sistem Informasi Klinik Pratama",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <link rel="icon" href="/logo.png" />
      <link rel="apple-touch-icon" href="/logo.png" />
      <body className="min-h-full flex flex-col">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
