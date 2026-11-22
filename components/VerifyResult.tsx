"use client";

import { useI18n } from "@/lib/i18n";
import {
  AuthShell,
  authPrimaryButtonClass,
  authSecondaryButtonClass,
} from "./auth/AuthShell";

export default function VerifyResult({
  ok,
  signedIn,
  fontClass,
}: {
  ok: boolean;
  signedIn: boolean;
  fontClass?: string;
}) {
  const { t, lang } = useI18n();

  return (
    <AuthShell
      fontClass={fontClass}
      eyebrow={lang === "id" ? "VERIFIKASI EMAIL" : "EMAIL VERIFICATION"}
      title={t(ok ? "verify.successTitle" : "verify.invalidTitle")}
      subtitle={t(ok ? "verify.successBody" : "verify.invalidBody")}
    >
      <div className="space-y-4">
        <div
          className={`mx-auto grid h-14 w-14 place-items-center rounded-full border ${
            ok
              ? "border-[#C3F36B]/30 bg-[#C3F36B]/10 text-[#C3F36B]"
              : "border-[#FCA5A5]/30 bg-[#FCA5A5]/10 text-[#FCA5A5]"
          }`}
        >
          <span className="text-[22px]">{ok ? "✓" : "!"}</span>
        </div>

        <a href={signedIn ? "/editor" : "/login"} className={authPrimaryButtonClass}>
          {t(signedIn ? "verify.openEditor" : "verify.login")}
        </a>
        <a href="/help" className={authSecondaryButtonClass}>
          {t("account.help")}
        </a>
      </div>
    </AuthShell>
  );
}
