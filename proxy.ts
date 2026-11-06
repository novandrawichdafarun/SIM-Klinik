import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/",
  },
});

export const config = {
  matcher: [
    //? Masukkan route yang HANYA boleh diakses kalau sudah login
    "/dashboard/:path*",
    // "/rekam-medis/:path*", //! contoh lain
  ],
};
