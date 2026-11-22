"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

const STORAGE_KEY = "fasttrack.onboarded";

export default function OnboardingTutorial() {
  const { lang } = useI18n();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(STORAGE_KEY)) setOpen(true);
    } catch {
      // storage unavailable
    }
  }, []);

  function close() {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // ignore
    }
    setOpen(false);
  }

  if (!open) return null;

  const steps =
    lang === "id"
      ? [
          "Tambahkan video: tempel link atau upload file di panel sumber.",
          "Atur trim, transisi, framing, dan audio di panel kiri.",
          "Tambahkan teks dan animasi pada tab Teks.",
          "Verifikasi email, lalu export MP4 di tab Export.",
        ]
      : [
          "Add a video: paste a link or upload a file in the source panel.",
          "Trim clips, set transitions, framing, and audio in the left panels.",
          "Add text layers and animations on the Text tab.",
          "Verify your email, then export the MP4 on the Export tab.",
        ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-md rounded-2xl border border-line bg-surface p-6 shadow-xl">
        <h2 className="text-[18px] font-semibold text-ink">
          {lang === "id" ? "Selamat datang di fasttrack" : "Welcome to fasttrack"}
        </h2>
        <p className="mt-1 text-[12px] text-muted">
          {lang === "id"
            ? "Ikuti langkah singkat ini untuk mulai."
            : "A quick walkthrough to get started."}
        </p>
        <ol className="mt-4 space-y-2 text-[13px] text-ink">
          {steps.map((step, index) => (
            <li key={index} className="flex gap-2">
              <span className="font-semibold text-muted">{index + 1}.</span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={close}
          className="btn btn-primary mt-5 w-full"
        >
          {lang === "id" ? "Mengerti" : "Got it"}
        </button>
      </div>
    </div>
  );
}
