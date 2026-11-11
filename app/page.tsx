"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Footer from "@/components/layouts/Footer";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { ArrowRight, Eye, EyeOff, LockKeyhole, Mail, Plus } from "lucide-react";
import Image from "next/image";
import { signIn } from "next-auth/react";

export default function Login() {
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const router = useRouter();

  const handleSubmit = async (formData: FormData) => {
    setIsLoading(true);
    setErrorMessage(null);

    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setErrorMessage(result.error);
      setIsLoading(false);
    } else if (result?.ok) {
      router.push("/dashboard");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="z-50 sticky top-0 flex h-17.5 shrink-0 items-center border-b border-foreground/5 bg-surface/80 px-5 shadow-low backdrop-blur md:h-13 md:px-6">
        <div className="mr-2 flex size-9 items-center justify-center rounded-lg bg-primary text-white">
          {/* Ikon logo klinik */}
          <Plus aria-hidden="true" size={22} strokeWidth={2.5} />
        </div>

        <div className="leading-tight">
          <p className="text-sm font-bold text-foreground">KlinikPulse SIM</p>
          <p className="text-[9px] font-medium tracking-wide text-foreground/65">
            PORTAL STAF &amp; MANAJEMEN
          </p>
        </div>

        <ThemeToggle className="ml-auto" />
      </header>

      <main
        className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-4 py-4 md:py-8"
        style={{
          backgroundImage:
            "radial-gradient(ellipse at 50% 48%, rgba(0, 200, 179, 0.13), transparent 34%), radial-gradient(ellipse at 36% 45%, rgba(0, 192, 99, 0.10), transparent 28%)",
        }}
      >
        <section
          aria-labelledby="login-title"
          className="relative z-10 w-full max-w-100 rounded-xl bg-surface px-7 py-8 shadow-high sm:px-10 sm:py-9"
        >
          <h1
            id="login-title"
            className="text-[22px] font-bold tracking-tight sm:text-2xl"
          >
            Masuk ERM &amp; SIM Klinik
          </h1>
          <p className="mt-1 text-sm text-foreground/70">
            Silakan masukkan kredensial resmi faskes Anda untuk mengakses sistem
            ERM &amp; SIM Klinik.
          </p>

          <form className="mt-5 space-y-3" action={handleSubmit}>
            <div>
              <label
                htmlFor="email"
                className="mb-1 block text-xs font-semibold"
              >
                Email
              </label>
              <div className="flex h-11 items-center gap-3 rounded-lg bg-surface-muted px-3 text-foreground/70 focus-within:ring-2 focus-within:ring-primary/40">
                {/* Ikon email */}
                <Mail aria-hidden="true" size={16} />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Contoh: ari@gmail.com"
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground/40"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1 block text-xs font-semibold"
              >
                Kata Sandi
              </label>
              <div className="flex h-11 items-center gap-3 rounded-lg bg-surface-muted px-3 text-foreground/70 focus-within:ring-2 focus-within:ring-primary/40">
                {/* Ikon kata sandi */}
                <LockKeyhole aria-hidden="true" size={16} />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••••••"
                  className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-foreground/40"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="shrink-0"
                  aria-label={
                    showPassword
                      ? "Sembunyikan kata sandi"
                      : "Tampilkan kata sandi"
                  }
                >
                  {showPassword ? (
                    <Eye aria-hidden="true" size={16} />
                  ) : (
                    <EyeOff aria-hidden="true" size={16} />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 pt-0.5 text-xs">
              <label className="flex items-center gap-2 text-foreground/75">
                <input
                  type="checkbox"
                  name="remember"
                  className="size-4 accent-primary"
                />
                Ingat perangkat (30 hari)
              </label>
              <a
                href="#"
                className="shrink-0 font-semibold text-accent-ink hover:underline"
              >
                Lupa Kata Sandi?
              </a>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-lg bg-danger-soft p-3">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.75}
                  className="h-5 w-5 shrink-0 text-danger-ink"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                  />
                </svg>
                <p className="text-sm text-danger-ink">{errorMessage}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-bold text-white shadow-mid transition hover:bg-[#00aa58] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              {/* Tombol masuk */}
              <ArrowRight aria-hidden="true" size={16} />
              {isLoading ? "Memproses..." : "Masuk ke Dashboard"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-[9px] font-semibold tracking-widest text-foreground/65">
              ATAU VERIFIKASI ALTERNATIF
            </span>
            <span className="h-px flex-1 bg-line" />
          </div>

          <button
            type="button"
            className="flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-line bg-surface-muted px-3 text-xs font-semibold transition hover:bg-surface-hover"
          >
            {/* Ikon SSO (pengganti huruf G) */}
            <Image
              src="https://www.vectorlogo.zone/logos/google/google-icon.svg"
              alt="Google"
              width={16}
              height={16}
            />
            Login dengan Google
          </button>
        </section>

        <p className="relative z-10 mt-4 flex items-center gap-1.5 text-xs text-foreground/75">
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            fill="none"
            className="size-4"
          >
            <path
              d="M4 13v-2a8 8 0 0 1 16 0v2m-16 0v4h4v-6H4m16 2v4h-4v-6h4m-4 4c0 2-1.5 3-4 3"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          Kendala akun? IT Helpdesk Ext. 1044
        </p>
      </main>

      <Footer />
    </div>
  );
}
