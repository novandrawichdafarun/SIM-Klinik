import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { headers } from "next/headers";
import { RowDataPacket } from "mysql2";
import { loginUserService } from "@/services/auth.service";
import { getMySQLPool } from "@/database/mysql-client";

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email dan Password harus diisi");
        }

        const headersList = await headers();
        const userAgent =
          headersList.get("user-agent") || "Perangkat Tidak Dikenal";

        const result = await loginUserService(
          credentials.email,
          credentials.password,
          userAgent,
        );

        if (!result.success) {
          throw new Error(result.error);
        }

        if (!result.data) {
          throw new Error("Kredensial tidak valid");
        }

        return result.data;
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.sessionToken = user.sessionToken;
      }

      // Verifikasi session_token masih ada di DB.
      // Kalau row-nya sudah di-delete (karena limit 3-device kick),
      // set ForceLogout supaya user diminta login ulang.
      if (token.sessionToken) {
        try {
          const pool = getMySQLPool();
          const [rows] = await pool.execute<RowDataPacket[]>({
            sql: `SELECT session_token FROM user_sessions
                  WHERE session_token = ? LIMIT 1`,
            values: [token.sessionToken],
          });
          if (rows.length === 0) {
            token.error = "ForceLogout";
            return token;
          }
        } catch (err) {
          // DB error → same behavior as original (Supabase silent-error):
          // treat as session-not-found untuk safety.
          console.error("[NextAuth JWT] Session verify error:", err);
          token.error = "ForceLogout";
          return token;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token.error === "ForceLogout") {
        session.error = "ForceLogout";
        session.user = {
          id: "",
          role: "",
          sessionToken: "",
          name: "",
          email: "",
          image: "",
        };
        return session;
      }

      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.sessionToken = token.sessionToken as string;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET, //! WAJIB ADA DI .env
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
