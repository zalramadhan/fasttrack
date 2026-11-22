"use client";

import { useRef, useState } from "react";
import { importFromLink, uploadMedia } from "@/lib/media";
import { savePendingSource } from "@/lib/pending-source";
import type { MediaAsset, PublicUser, SavedProject } from "@/lib/types";
import {
  GithubIcon,
  HelpIcon,
  InstagramIcon,
  LinkIcon,
  SaveIcon,
  SpinnerIcon,
  UploadIcon,
} from "./icons";
import ThemeToggle from "./ThemeToggle";
import LanguageToggle from "./LanguageToggle";
import AccountMenu from "./AccountMenu";
import LogoMark from "./Logo";
import { useI18n } from "@/lib/i18n";

type Props = {
  user?: PublicUser | null;
  onReady?: (asset: MediaAsset) => void;
  savedProject?: { project: SavedProject; updatedAt: number } | null;
  onContinue?: () => void;
  pendingError?: string | null;
  preparing?: boolean;
};

export default function StartScreen({
  user,
  onReady,
  savedProject,
  onContinue,
  pendingError,
  preparing = false,
}: Props) {
  const { t, errorText, lang } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState("");
  const [busy, setBusy] = useState<null | "link" | "upload">(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  async function handleFile(file: File | undefined | null) {
    if (!file || busy) return;
    setError(null);
    setBusy("upload");
    try {
      if (!user) {
        await savePendingSource({
          kind: "file",
          blob: file,
          name: file.name,
          createdAt: Date.now(),
        });
        window.location.assign("/register");
        return;
      }
      const asset = await uploadMedia(file, "video");
      onReady?.(asset);
    } catch (err) {
      setError(err instanceof Error ? errorText(err.message) : t("common.uploadFailed"));
      setBusy(null);
    }
  }

  async function handleLink() {
    if (busy) return;
    if (!link.trim()) {
      setError(t("common.pasteLinkFirst"));
      return;
    }
    setError(null);
    setBusy("link");
    try {
      if (!user) {
        await savePendingSource({
          kind: "link",
          url: link.trim(),
          createdAt: Date.now(),
        });
        window.location.assign("/register");
        return;
      }
      const asset = await importFromLink(link.trim());
      onReady?.(asset);
    } catch (err) {
      setError(err instanceof Error ? errorText(err.message) : t("common.linkFailed"));
      setBusy(null);
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
        <div className="mx-auto flex h-[56px] max-w-6xl items-center justify-between px-5">
          <div className="flex items-center gap-2.5">
            <LogoMark className="h-7 w-7 shrink-0 text-ink" />
            <span className="text-[14.5px] font-semibold tracking-[-0.02em] text-ink">
              fasttrack
            </span>
            <span className="hidden text-[11px] text-muted sm:inline">video → mp4</span>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="hidden sm:inline-flex">
              <LanguageToggle />
            </span>
            <ThemeToggle />
            {user ? (
              <AccountMenu user={user} />
            ) : (
              <>
                <a
                  href="/login"
                  className="focus-ring rounded-lg px-2 py-1.5 text-[11.5px] font-medium text-muted transition hover:text-ink"
                >
                  {t("start.signIn")}
                </a>
                <a
                  href="/register"
                  className="focus-ring rounded-lg bg-ink px-2.5 py-1.5 text-[11.5px] font-medium text-on-ink transition hover:bg-ink/90"
                >
                  {t("start.createAccount")}
                </a>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">
        <section
          id="start"
          className="mx-auto flex w-full max-w-6xl scroll-mt-16 flex-col items-center justify-center px-5 py-10 sm:py-14"
        >
          <div className="w-full max-w-[620px] text-center">
          <p className="inline-flex items-center gap-2 rounded-full border border-line bg-surface px-2.5 py-1 text-[11px] font-medium text-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            {t("start.badge")}
          </p>

          <h1 className="mt-5 text-[36px] font-semibold leading-[1.04] tracking-[-0.035em] text-ink sm:text-[46px]">
            {t("start.titleA")}
            <br className="hidden sm:block" /> {t("start.titleB")}
          </h1>
          <p className="mx-auto mt-4 max-w-[46ch] text-[13.5px] leading-relaxed text-muted sm:text-[14px]">
            {t("start.subtitle")}
          </p>

          <div className="mx-auto mt-8 w-full max-w-[540px] text-left">
            <div className="rounded-[16px] border border-line bg-surface p-2 shadow-[0_24px_60px_-40px_rgba(20,20,25,0.45)] transition focus-within:border-ink/25">
              <div className="flex items-center gap-1">
                <LinkIcon className="ml-2 h-4 w-4 shrink-0 text-muted" />
                <input
                  value={link}
                  onChange={(event) => setLink(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void handleLink();
                  }}
                  placeholder={t("start.linkPlaceholder")}
                  disabled={busy !== null}
                  className="h-10 min-w-0 flex-1 bg-transparent px-1.5 text-[13px] text-ink outline-none placeholder:text-muted/70 disabled:opacity-60"
                  aria-label={t("start.linkAria")}
                />
                <button
                  type="button"
                  onClick={() => void handleLink()}
                  disabled={busy !== null}
                  className="focus-ring inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[10px] bg-ink px-4 text-[12.5px] font-medium text-on-ink transition hover:bg-ink/90 disabled:opacity-60"
                >
                  {busy === "link" ? (
                    <>
                      <SpinnerIcon className="h-3.5 w-3.5" /> {t("start.fetching")}
                    </>
                  ) : (
                    t("start.create")
                  )}
                </button>
              </div>

              <div className="my-1.5 flex items-center gap-2 px-3 text-[10px] uppercase tracking-[0.12em] text-muted">
                <span className="h-px flex-1 bg-line" />
                {t("common.or")}
                <span className="h-px flex-1 bg-line" />
              </div>

              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault();
                  setDragging(false);
                  void handleFile(event.dataTransfer.files?.[0]);
                }}
                disabled={busy !== null}
                className={`focus-ring flex w-full items-center justify-center gap-2 rounded-[10px] border border-dashed px-3 py-2.5 text-[12.5px] font-medium text-ink transition disabled:opacity-60 ${
                  dragging
                    ? "border-ink/40 bg-ink/[0.04]"
                    : "border-line-strong hover:border-ink/30 hover:bg-ink/[0.02]"
                }`}
              >
                {busy === "upload" ? (
                  <SpinnerIcon className="h-3.5 w-3.5" />
                ) : (
                  <UploadIcon className="h-3.5 w-3.5" />
                )}
                {busy === "upload" ? t("common.uploading") : t("start.chooseFile")}
              </button>
            </div>

            <input
              ref={inputRef}
              type="file"
              accept="video/mp4,video/quicktime,video/webm,video/x-m4v,video/x-matroska"
              hidden
              onChange={(event) => {
                void handleFile(event.target.files?.[0]);
                event.target.value = "";
              }}
            />

            {error && <p className="alert mt-3">{error}</p>}
            {pendingError && <p className="alert mt-3">{pendingError}</p>}
            {preparing && (
              <p className="mt-3 flex items-center justify-center gap-2 text-[11.5px] text-muted">
                <SpinnerIcon className="h-3.5 w-3.5" /> {t("start.preparing")}
              </p>
            )}

            {!user && (
              <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
                {t("start.publicNote")}
              </p>
            )}

            {savedProject && user && onContinue && (
              <button
                type="button"
                onClick={onContinue}
                className="focus-ring mt-4 flex w-full items-center gap-3 rounded-[14px] border border-emerald-500/30 bg-emerald-500/[0.06] px-3 py-3 text-left transition hover:border-emerald-500/50 hover:bg-emerald-500/[0.1]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-emerald-500/30 bg-surface text-emerald-700 dark:text-emerald-300">
                  <SaveIcon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[12.5px] font-semibold text-ink">
                    {t("project.continue")}
                  </span>
                  <span className="mt-0.5 block text-[10.5px] text-muted">
                    {t("project.continueMeta", {
                      count: savedProject.project.clips.length,
                      date: new Date(savedProject.updatedAt).toLocaleDateString(
                        lang === "id" ? "id-ID" : "en-US",
                        { day: "numeric", month: "short", year: "numeric" },
                      ),
                    })}
                  </span>
                </span>
                <span className="shrink-0 text-[11px] font-medium text-emerald-700 dark:text-emerald-300">
                  →
                </span>
              </button>
            )}

            <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
              {t("start.sources")}
            </p>
          </div>

            <p className="mt-8 text-[10.5px] uppercase tracking-[0.14em] text-muted">
              {t("start.features")}
            </p>
          </div>
        </section>

      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[10.5px] text-muted">
            {t("start.legal")}
          </p>
          <div className="flex items-center gap-4">
            <a
              href="/help"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-ink"
            >
              <HelpIcon className="h-3.5 w-3.5" /> {t("account.help")}
            </a>
            <a
              href="https://github.com/zalramadhan"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-ink"
            >
              <GithubIcon className="h-3.5 w-3.5" /> GitHub
            </a>
            <a
              href="https://instagram.com/zalsomeone"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted transition hover:text-ink"
            >
              <InstagramIcon className="h-3.5 w-3.5" /> @zalsomeone
            </a>
            <span className="hidden text-[10.5px] text-muted/70 sm:inline">{t("start.madeBy")}</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
