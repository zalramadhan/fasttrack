const RESEND_ENDPOINT = "https://api.resend.com/emails";

export function emailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export async function sendVerificationEmail(input: {
  to: string;
  name: string;
  url: string;
}) {
  if (!emailConfigured()) {
    return {
      ok: false,
      error: "Email service is not configured yet.",
    } as const;
  }

  const name = input.name || input.to.split("@")[0];
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(input.url);

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      signal: AbortSignal.timeout(8000),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [input.to],
        subject: "Verifikasi email fasttrack",
        text: [
          `Halo ${name},`,
          "",
          "Konfirmasi email kamu untuk bisa export video dari fasttrack:",
          input.url,
          "",
          "Link ini berlaku 24 jam. Kalau kamu tidak membuat akun, abaikan email ini.",
        ].join("\n"),
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px 22px;color:#16161a">
            <p style="margin:0 0 18px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#059669">fasttrack</p>
            <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25">Konfirmasi email kamu</h1>
            <p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#555">Halo ${safeName}, konfirmasi email ini supaya kamu bisa export video dari fasttrack.</p>
            <p style="margin:0 0 22px">
              <a href="${safeUrl}" style="display:inline-block;background:#16161a;color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px;font-size:14px;font-weight:600">Verifikasi email</a>
            </p>
            <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#85847d">Link berlaku 24 jam. Kalau tombol tidak bekerja, buka link ini:</p>
            <p style="margin:0;font-size:12px;line-height:1.6;word-break:break-all;color:#555">${safeUrl}</p>
          </div>
        `,
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("[email] resend rejected", res.status, detail.slice(0, 500));
      return { ok: false, error: "Email could not be sent." } as const;
    }
    return { ok: true } as const;
  } catch (error) {
    console.error("[email] send failed", error);
    return { ok: false, error: "Email could not be sent." } as const;
  }
}
