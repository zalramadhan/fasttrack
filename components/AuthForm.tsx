"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n";

type Mode = "login" | "register";

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

export default function AuthForm({
  mode,
  fontClass,
}: {
  mode: Mode;
  fontClass?: string;
}) {
  const { t, lang, setLang } = useI18n();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isLogin = mode === "login";

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setError(null);
    setBusy(true);
    const data = new FormData(event.currentTarget);
    const payload = {
      email: String(data.get("email") ?? ""),
      password: String(data.get("password") ?? ""),
      name: String(data.get("name") ?? ""),
      whatsapp: String(data.get("whatsapp") ?? ""),
    };

    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(body.error ?? t("common.genericError"));
        setBusy(false);
        return;
      }
      window.location.assign("/");
    } catch {
      setError(t("common.genericError"));
      setBusy(false);
    }
  }

  const copy =
    lang === "id"
      ? {
          back: "Kembali ke beranda",
          eyebrow: isLogin ? "SELAMAT DATANG KEMBALI" : "MULAI GRATIS",
          sideEyebrow: "CARA EDIT YANG LEBIH RINGKAS",
          sideTitleA: "Buat setiap klip",
          sideTitleB: "layak ditonton.",
          sideBody:
            "Dari tautan atau klip mentah menjadi video card siap tayang. Edit, beri teks, dan ekspor MP4 dalam satu tab.",
          bullets: [
            "Timeline 6 klip · 180 detik",
            "25 transisi dan teks animasi",
            "Ekspor MP4 720p gratis",
          ],
          divider: "atau",
          freeNote: "Gratis: ekspor 720p, 2 Mbps, watermark.",
        }
      : {
          back: "Back to home",
          eyebrow: isLogin ? "WELCOME BACK" : "START FREE",
          sideEyebrow: "A BETTER WAY TO EDIT",
          sideTitleA: "Make every clip",
          sideTitleB: "worth watching.",
          sideBody:
            "Turn links or raw footage into a ready-to-post video card. Edit, add text, and export MP4 in one tab.",
          bullets: [
            "6-clip timeline · 180 seconds",
            "25 transitions and animated text",
            "Free 720p MP4 export",
          ],
          divider: "or",
          freeNote: "Free plan: 720p export, 2 Mbps, watermark.",
        };

  return (
    <div
      className={`landing-page relative min-h-screen overflow-hidden bg-[#101110] text-[#F4F5F1] ${fontClass ?? ""}`}
    >
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="hero-grid-pattern absolute inset-0 opacity-45"
          style={{
            maskImage:
              "radial-gradient(900px circle at 72% 24%, rgba(0,0,0,0.9), transparent 72%)",
            WebkitMaskImage:
              "radial-gradient(900px circle at 72% 24%, rgba(0,0,0,0.9), transparent 72%)",
          }}
        />
        <div className="animate-studio-light-a absolute -top-56 -right-52 h-[620px] w-[760px] rounded-full bg-[radial-gradient(ellipse,rgba(195,243,107,0.1)_0%,transparent_68%)]" />
        <div className="absolute bottom-[-260px] left-[-180px] h-[520px] w-[640px] rounded-full bg-[radial-gradient(ellipse,rgba(128,164,132,0.08)_0%,transparent_70%)]" />
      </div>

      <header className="relative z-10 border-b border-white/10 bg-[#101110]/55 backdrop-blur-xl">
        <div className="mx-auto flex h-[74px] max-w-[1160px] items-center justify-between gap-4 px-6">
          <a
            href="/"
            className="font-display text-[22px] font-bold tracking-[-0.04em] text-[#F4F5F1]"
          >
            fasttrack
          </a>
          <div className="flex items-center gap-4">
            <a
              href="/"
              className="hidden text-[12px] font-medium text-[#A0A59B] transition hover:text-white sm:inline"
            >
              {copy.back}
            </a>
            <div
              role="group"
              aria-label={t("common.language")}
              className="inline-flex items-center rounded-lg border border-[#30332F] bg-[#181A18] p-0.5 text-[11px] font-semibold"
            >
              {(["en", "id"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setLang(value)}
                  aria-pressed={lang === value}
                  className={`rounded-md px-2 py-1 uppercase tracking-[0.08em] transition ${
                    lang === value
                      ? "bg-[#C3F36B] text-[#151810]"
                      : "text-[#A0A59B] hover:text-white"
                  }`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid min-h-[calc(100vh-74px)] max-w-[1160px] items-center gap-12 px-6 py-12 lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-20 lg:py-16">
        <section className="hidden lg:block">
          <p className="text-xs font-bold uppercase tracking-[1.6px] text-[#C3F36B]">
            {copy.sideEyebrow}
          </p>
          <h2
            className="font-display mt-5 max-w-[12ch] font-semibold leading-[1.02] tracking-[-0.04em] text-[#F4F5F1]"
            style={{ fontSize: "clamp(3rem, 5vw, 4.5rem)" }}
          >
            {copy.sideTitleA}{" "}
            <span className="text-[#C3F36B]">{copy.sideTitleB}</span>
          </h2>
          <p className="mt-6 max-w-[480px] text-base leading-relaxed text-[#A0A59B]">
            {copy.sideBody}
          </p>

          <ul className="mt-8 space-y-3 text-sm text-[#D9DDD4]">
            {copy.bullets.map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full border border-[#C3F36B]/30 bg-[#C3F36B]/10 text-[11px] font-bold text-[#C3F36B]">
                  ✓
                </span>
                {item}
              </li>
            ))}
          </ul>

          <div className="relative mt-10 max-w-[520px] overflow-hidden rounded-[18px] border border-white/10 bg-[#181A18]">
            <img
              src="/landing/hero_video_frame_1795330081443.jpg"
              alt=""
              className="h-[190px] w-full object-cover opacity-85"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#101110] via-[#101110]/20 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[1.5px] text-[#C3F36B]">
                  {lang === "id" ? "Ruang kerja" : "Studio workspace"}
                </p>
                <p className="font-display mt-1 text-xl font-semibold tracking-[-0.03em]">
                  {lang === "id" ? "Satu tab, hasil siap posting." : "One tab, ready to post."}
                </p>
              </div>
              <span className="font-mono text-[10px] text-[#A0A59B]">MP4 · 1080p</span>
            </div>
          </div>
        </section>

        <section className="w-full max-w-[440px] justify-self-center lg:justify-self-end">
          <div className="rounded-[22px] border border-[#30332F] bg-[#181A18] p-6 shadow-[0_30px_100px_rgba(0,0,0,0.4)] sm:p-7">
            <p className="text-[10px] font-bold uppercase tracking-[1.6px] text-[#C3F36B]">
              {copy.eyebrow}
            </p>
            <h1 className="font-display mt-3 text-[30px] font-semibold leading-[1.08] tracking-[-0.035em] text-[#F4F5F1] sm:text-[34px]">
              {t(isLogin ? "auth.loginTitle" : "auth.registerTitle")}
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-[#A0A59B]">
              {t(isLogin ? "auth.loginSub" : "auth.registerSub")}
            </p>

            <form onSubmit={submit} className="mt-6 space-y-4">
              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[1.3px] text-[#8C9287]">
                  {t("auth.email")}
                </span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className="h-11 w-full rounded-[10px] border border-[#30332F] bg-[#101110] px-3.5 text-sm text-[#F4F5F1] outline-none transition placeholder:text-[#6F756B] focus:border-[#C3F36B]"
                  placeholder="you@example.com"
                />
              </label>

              {!isLogin && (
                <>
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-[1.3px] text-[#8C9287]">
                      {t("auth.name")}
                    </span>
                    <input
                      name="name"
                      autoComplete="name"
                      className="h-11 w-full rounded-[10px] border border-[#30332F] bg-[#101110] px-3.5 text-sm text-[#F4F5F1] outline-none transition placeholder:text-[#6F756B] focus:border-[#C3F36B]"
                    />
                  </label>
                  <label className="block space-y-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-[1.3px] text-[#8C9287]">
                      {t("auth.whatsapp")}
                    </span>
                    <input
                      name="whatsapp"
                      inputMode="tel"
                      autoComplete="tel"
                      className="h-11 w-full rounded-[10px] border border-[#30332F] bg-[#101110] px-3.5 text-sm text-[#F4F5F1] outline-none transition placeholder:text-[#6F756B] focus:border-[#C3F36B]"
                      placeholder="08…"
                    />
                  </label>
                </>
              )}

              <label className="block space-y-1.5">
                <span className="text-[10px] font-bold uppercase tracking-[1.3px] text-[#8C9287]">
                  {t("auth.password")}
                </span>
                <input
                  name="password"
                  type="password"
                  autoComplete={isLogin ? "current-password" : "new-password"}
                  required
                  minLength={isLogin ? undefined : 8}
                  className="h-11 w-full rounded-[10px] border border-[#30332F] bg-[#101110] px-3.5 text-sm text-[#F4F5F1] outline-none transition placeholder:text-[#6F756B] focus:border-[#C3F36B]"
                />
                {!isLogin && (
                  <span className="block text-[10.5px] text-[#777D73]">
                    {t("auth.passwordHint")}
                  </span>
                )}
              </label>

              {isLogin && (
                <div className="flex justify-end">
                  <a
                    href="/forgot-password"
                    className="text-[11px] font-medium text-[#A0A59B] underline decoration-[#30332F] underline-offset-4 transition hover:text-[#C3F36B]"
                  >
                    {t("auth.forgot")}
                  </a>
                </div>
              )}

              {error && (
                <p
                  role="alert"
                  className="rounded-xl border border-[#FCA5A5]/25 bg-[#FCA5A5]/10 px-3 py-2 text-[12px] leading-relaxed text-[#FCA5A5]"
                >
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="inline-flex min-h-[50px] w-full items-center justify-center rounded-[10px] bg-[#C3F36B] px-5 text-sm font-bold text-[#151810] transition hover:bg-[#A9DF4E] disabled:cursor-wait disabled:opacity-60"
              >
                {busy ? "…" : t(isLogin ? "auth.login" : "auth.register")}
              </button>
            </form>

            <div className="my-5 flex items-center gap-3 text-[10px] uppercase tracking-[0.14em] text-[#6F756B]">
              <span className="h-px flex-1 bg-[#30332F]" />
              {copy.divider}
              <span className="h-px flex-1 bg-[#30332F]" />
            </div>

            <a
              href="/api/auth/google"
              className="inline-flex min-h-[48px] w-full items-center justify-center gap-2.5 rounded-[10px] border border-[#30332F] bg-[#101110] px-4 text-[13px] font-semibold text-[#F4F5F1] transition hover:border-[#555B50] hover:bg-[#202320]"
            >
              <GoogleLogoIcon />
              {t("auth.google")}
            </a>

            <p className="mt-5 text-center text-[12px] text-[#A0A59B]">
              {t(isLogin ? "auth.needAccount" : "auth.haveAccount")}{" "}
              <a
                href={isLogin ? "/register" : "/login"}
                className="font-semibold text-[#C3F36B] hover:underline"
              >
                {t(isLogin ? "auth.toRegister" : "auth.toLogin")}
              </a>
            </p>
          </div>

          <p className="mt-4 text-center text-[10.5px] leading-relaxed text-[#777D73]">
            {copy.freeNote}
          </p>
          <p className="mt-2 text-center text-[10.5px] leading-relaxed text-[#777D73]">
            <a href="/help" className="underline decoration-[#30332F] underline-offset-4 hover:text-[#C3F36B]">
              {t("account.help")}
            </a>
            {" · "}
            {t("start.legal")}
          </p>
        </section>
      </main>
    </div>
  );
}
