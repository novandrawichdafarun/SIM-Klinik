"use client";

import { SessionProvider, signOut, useSession } from "next-auth/react";
import { useEffect } from "react";

function SessionGuard({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.error === "ForceLogout") {
      signOut({ callbackUrl: "/login", redirect: true });
    }
  }, [session]);

  return <>{children}</>;
}

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider refetchInterval={60} refetchOnWindowFocus={true}>
      <SessionGuard>{children}</SessionGuard>
    </SessionProvider>
  );
}
