import { DefaultSession, DefaultUser } from "next-auth";
import { DefaultJWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    error?: "ForceLogout";
    user: {
      id: string;
      role: string;
      sessionToken: string;
    } & DefaultSession["user"];
  }

  interface User extends DefaultUser {
    id: string;
    role: string;
    sessionToken: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT extends DefaultJWT {
    id: string;
    role: string;
    sessionToken: string;
    error?: "ForceLogout";
  }
}
