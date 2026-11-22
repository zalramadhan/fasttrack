"use client";

import { useEffect, useRef, useState } from "react";
import {
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  Phone,
  User,
  UserPlus,
  X,
} from "lucide-react";
import type { Locale } from "./content";

export type AuthMode = "login" | "signup";

interface AuthModalProps {
  mode: AuthMode | null;
  locale: Locale;
  mediaLabel?: string;
  onClose: () => void;
  onSwitch: (next: AuthMode) => void;
}

function GoogleLogoIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" className="shrink-0">
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );
}

const copy = {
  en: {
    loginTitle: "Log in to fasttrack",
    loginSub: "Continue editing your saved clips.",
    signupTitle: "Create free account",
    signupSub: "No credit card needed. Export 720p immediately.",
    queued: "Queued media: ",
    name: "Name (optional)",
    whatsapp: "WhatsApp (optional)",
    email: "Email",
    password: "Password",
    passwordHint: "At least 8 characters.",
    forgot: "Forgot password?",
    login: "Log in",
    signup: "Create free account",
    or: "or",
    googleLogin: "Sign in with Google",
    googleSignup: "Sign up with Google",
    haveAccount: "Already have an account?",
    noAccount: "New to fasttrack?",
    toLogin: "Log in",
    toSignup: "Create free account",
    freeNote: "Free plan: 720p export, 2 Mbps, watermark.",
    genericError: "Something went wrong. Try again.",
    close: "Close",
    showPassword: "Show password",
    hidePassword: "Hide password",
  },
  id: {
    loginTitle: "Masuk ke fasttrack",
    loginSub: "Lanjutkan mengedit klip tersimpanmu.",
    signupTitle: "Buat akun gratis",
    signupSub: "Tanpa kartu kredit. Langsung ekspor 720p.",
    queued: "Video siap edit: ",
    name: "Nama (opsional)",
    whatsapp: "WhatsApp (opsional)",
    email: "Email",
    password: "Kata sandi",
    passwordHint: "Minimal 8 karakter.",
    forgot: "Lupa kata sandi?",
    login: "Masuk",
    signup: "Buat akun gratis",
    or: "atau",
    googleLogin: "Masuk dengan Google",
    googleSignup: "Daftar dengan Google",
    haveAccount: "Sudah punya akun?",
    noAccount: "Baru di fasttrack?",
    toLogin: "Masuk",
    toSignup: "Buat akun gratis",
    freeNote: "Gratis: ekspor 720p, 2 Mbps, watermark.",
    genericError: "Terjadi kesalahan. Coba lagi.",
    close: "Tutup",
    showPassword: "Tampilkan kata sandi",
    hidePassword: "Sembunyikan kata sandi",
  },
};

export function AuthModal({ mode, locale, mediaLabel, onClose, onSwitch }: AuthModalProps) {
  const t = copy[locale];
  const isLogin = mode === "login";
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!mode) return;
    setError(null);
    setBusy(false);
    setShowPassword(false);
    const timer = window.setTimeout(() => firstInputRef.current?.focus(), 50);
    return () => window.clearTimeout(timer);
  }, [mode]);

  useEffect(() => {
    if (!mode) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [mode]);

  if (!mode) return null;

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);

    const data = new FormData(event.currentTarget);
    const endpoint = isLogin ? "login" : "register";
    try {
      const response = await fetch(`/api/auth/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: String(data.get("email") ?? "").trim(),
          password: String(data.get("password") ?? ""),
          name: String(data.get("name") ?? "").trim(),
          whatsapp: String(data.get("whatsapp") ?? "").trim(),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      if (!response.ok) {
        setError(body.error ?? t.genericError);
        setBusy(false);
        return;
      }
      // The modal lives on `/`, where assigning the same URL is a no-op.
      // Reload so the server sees the new session and renders the workspace.
      window.location.reload();
    } catch {
      setError(t.genericError);
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-modal-title"
        onClick={(event) => event.stopPropagation()}
        className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-[20px] border border-[#30332F] bg-[#181A18] p-6 text-[#F4F5F1] shadow-[0_30px_100px_rgba(0,0,0,0.5)]"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold tracking-[1.6px] uppercase text-[#C3F36B]">
              {isLogin ? "WELCOME BACK" : "START FREE"}
            </p>
            <h2
              id="auth-modal-title"
              className="font-display mt-2 text-[26px] font-semibold leading-[1.08] tracking-[-0.035em]"
            >
              {isLogin ? t.loginTitle : t.signupTitle}
            </h2>
            <p className="mt-1.5 text-xs leading-relaxed text-[#A0A59B]">
              {isLogin ? t.loginSub : t.signupSub}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.close}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#30332F] bg-[#202320] text-[#A0A59B] transition hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {mediaLabel && (
          <div className="mt-4 rounded-xl border border-[#C3F36B]/30 bg-[#C3F36B]/10 px-3.5 py-2.5 text-xs">
            <span className="font-semibold text-[#C3F36B]">{t.queued}</span>
            <span className="break-all text-[#F4F5F1]">{mediaLabel}</span>
          </div>
        )}

        <form onSubmit={submit} className="mt-5 space-y-3.5">
          <label className="block">
            <span className="block text-xs font-medium text-[#B7BBB2]">{t.email}</span>
            <div className="relative mt-1">
              <Mail
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#777D73]"
              />
              <input
                ref={firstInputRef}
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="you@example.com"
                className="h-11 w-full rounded-[10px] border border-[#30332F] bg-[#101110] pr-3 pl-10 text-sm text-[#F4F5F1] outline-none transition placeholder:text-[#777D73] focus:border-[#C3F36B]"
              />
            </div>
          </label>

          {!isLogin && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="block text-xs font-medium text-[#B7BBB2]">{t.name}</span>
                <div className="relative mt-1">
                  <User
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#777D73]"
                  />
                  <input
                    name="name"
                    autoComplete="name"
                    className="h-11 w-full rounded-[10px] border border-[#30332F] bg-[#101110] pr-3 pl-10 text-sm text-[#F4F5F1] outline-none transition placeholder:text-[#777D73] focus:border-[#C3F36B]"
                  />
                </div>
              </label>
              <label className="block">
                <span className="block text-xs font-medium text-[#B7BBB2]">{t.whatsapp}</span>
                <div className="relative mt-1">
                  <Phone
                    aria-hidden="true"
                    className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#777D73]"
                  />
                  <input
                    name="whatsapp"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="08…"
                    className="h-11 w-full rounded-[10px] border border-[#30332F] bg-[#101110] pr-3 pl-10 text-sm text-[#F4F5F1] outline-none transition placeholder:text-[#777D73] focus:border-[#C3F36B]"
                  />
                </div>
              </label>
            </div>
          )}

          <label className="block">
            <span className="block text-xs font-medium text-[#B7BBB2]">{t.password}</span>
            <div className="relative mt-1">
              <Lock
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-[#777D73]"
              />
              <input
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={isLogin ? "current-password" : "new-password"}
                required
                minLength={isLogin ? undefined : 8}
                placeholder="••••••••"
                className="h-11 w-full rounded-[10px] border border-[#30332F] bg-[#101110] pr-11 pl-10 text-sm text-[#F4F5F1] outline-none transition placeholder:text-[#777D73] focus:border-[#C3F36B]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? t.hidePassword : t.showPassword}
                aria-pressed={showPassword}
                className="absolute top-1/2 right-1.5 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-[#8E938A] transition hover:bg-[#202320] hover:text-[#F4F5F1]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {!isLogin && (
              <span className="mt-1 block text-[10.5px] text-[#777D73]">{t.passwordHint}</span>
            )}
          </label>

          {isLogin && (
            <div className="flex justify-end">
              <a
                href="/forgot-password"
                className="text-[11px] font-medium text-[#A0A59B] underline decoration-[#30332F] underline-offset-4 transition hover:text-[#C3F36B]"
              >
                {t.forgot}
              </a>
            </div>
          )}

          {error && (
            <p
              role="alert"
              className="rounded-xl border border-[#FCA5A5]/25 bg-[#FCA5A5]/10 px-3 py-2 text-xs leading-relaxed text-[#FCA5A5]"
            >
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-[10px] bg-[#C3F36B] px-4 text-sm font-bold text-[#151810] transition hover:bg-[#A9DF4E] disabled:cursor-wait disabled:opacity-60"
          >
            {isLogin ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
            <span>{busy ? "…" : isLogin ? t.login : t.signup}</span>
          </button>
        </form>

        <div className="my-4 flex items-center gap-3 text-[11px] font-medium text-[#777D73]">
          <div className="h-px flex-1 bg-[#30332F]" />
          <span>{t.or}</span>
          <div className="h-px flex-1 bg-[#30332F]" />
        </div>

        <a
          href="/api/auth/google"
          className="flex h-11 w-full items-center justify-center gap-3 rounded-[10px] border border-[#3C4043] bg-[#0B0C0B] px-4 text-sm font-medium text-[#F4F5F1] transition hover:border-[#5F6368] hover:bg-[#141615]"
        >
          <GoogleLogoIcon />
          <span>{isLogin ? t.googleLogin : t.googleSignup}</span>
        </a>

        <p className="mt-4 text-center text-xs text-[#A0A59B]">
          {isLogin ? t.noAccount : t.haveAccount}{" "}
          <button
            type="button"
            onClick={() => onSwitch(isLogin ? "signup" : "login")}
            className="font-semibold text-[#C3F36B] hover:underline"
          >
            {isLogin ? t.toSignup : t.toLogin}
          </button>
        </p>

        <p className="mt-3 text-center text-[10.5px] leading-relaxed text-[#777D73]">
          {t.freeNote}
        </p>
      </div>
    </div>
  );
}
