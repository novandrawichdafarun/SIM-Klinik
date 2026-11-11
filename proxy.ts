import { NextResponse } from "next/server";
import { withAuth } from "next-auth/middleware";

/** Route yang hanya boleh dibuka Pimpinan Klinik / Super Admin */
const SUPER_ADMIN_PREFIXES = ["/karyawan", "/akun", "/hak-akses", "/tarif-jasa"];

export default withAuth(
  function proxy(req) {
    const { pathname } = req.nextUrl;
    const isSuperAdminRoute = SUPER_ADMIN_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

    // Penyaring awal berdasarkan role di JWT. Pengecekan final tetap di server
    // (libs/authz.ts) karena role di JWT bisa basi setelah diubah.
    if (isSuperAdminRoute && req.nextauth.token?.role !== "super_admin") {
      return NextResponse.redirect(new URL("/errors/403", req.url));
    }
    return NextResponse.next();
  },
  {
    pages: {
      signIn: "/",
    },
  },
);

export const config = {
  matcher: [
    //? Masukkan route yang HANYA boleh diakses kalau sudah login
    "/dashboard/:path*",
    "/karyawan/:path*",
    "/akun/:path*",
    "/hak-akses/:path*",
    "/tarif-jasa/:path*",
    "/jasa-pelayanan/:path*",
    "/kinerja-saya/:path*",
    "/invoice-digital/:path*",
    "/rekap-pasien/:path*",
  ],
};
