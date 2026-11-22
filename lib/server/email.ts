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

async function sendEmail(input: {
  to: string;
  subject: string;
  text: string;
  html: string;
}) {
  if (!emailConfigured()) {
    return { ok: false, error: "Email service is not configured yet." } as const;
  }

  try {
    const res = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      signal: AbortSignal.timeout(10_000),
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.EMAIL_FROM,
        to: [input.to],
        subject: input.subject,
        text: input.text,
        html: input.html,
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

function shell(title: string, body: string) {
  return `
    <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;padding:28px 22px;color:#16161a">
      <p style="margin:0 0 18px;font-size:13px;letter-spacing:.12em;text-transform:uppercase;color:#059669">fasttrack</p>
      <h1 style="margin:0 0 12px;font-size:24px;line-height:1.25">${title}</h1>
      ${body}
    </div>
  `;
}

export async function sendVerificationEmail(input: {
  to: string;
  name: string;
  url: string;
}) {
  const name = input.name || input.to.split("@")[0];
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(input.url);

  return sendEmail({
    to: input.to,
    subject: "Verifikasi email fasttrack",
    text: [
      `Halo ${name},`,
      "",
      "Konfirmasi email kamu untuk bisa export video dari fasttrack:",
      input.url,
      "",
      "Link ini berlaku 24 jam. Kalau kamu tidak membuat akun, abaikan email ini.",
    ].join("\n"),
    html: shell(
      "Konfirmasi email kamu",
      `<p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#555">Halo ${safeName}, konfirmasi email ini supaya kamu bisa export video dari fasttrack.</p>
       <p style="margin:0 0 22px">
         <a href="${safeUrl}" style="display:inline-block;background:#16161a;color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px;font-size:14px;font-weight:600">Verifikasi email</a>
       </p>
       <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#85847d">Link berlaku 24 jam. Kalau tombol tidak bekerja, buka link ini:</p>
       <p style="margin:0;font-size:12px;line-height:1.6;word-break:break-all;color:#555">${safeUrl}</p>`,
    ),
  });
}

export async function sendPasswordResetEmail(input: {
  to: string;
  name: string;
  url: string;
}) {
  const name = input.name || input.to.split("@")[0];
  const safeName = escapeHtml(name);
  const safeUrl = escapeHtml(input.url);

  return sendEmail({
    to: input.to,
    subject: "Reset password fasttrack",
    text: [
      `Halo ${name},`,
      "",
      "Kami menerima permintaan untuk mengatur ulang password akun fasttrack kamu.",
      "Buka link ini untuk membuat password baru:",
      input.url,
      "",
      "Link ini berlaku 1 jam dan hanya bisa dipakai sekali.",
      "Kalau kamu tidak meminta reset password, abaikan email ini.",
    ].join("\n"),
    html: shell(
      "Atur ulang password",
      `<p style="margin:0 0 18px;font-size:14px;line-height:1.7;color:#555">Halo ${safeName}, kami menerima permintaan untuk mengatur ulang password akun fasttrack kamu.</p>
       <p style="margin:0 0 22px">
         <a href="${safeUrl}" style="display:inline-block;background:#16161a;color:#fff;text-decoration:none;padding:11px 18px;border-radius:8px;font-size:14px;font-weight:600">Buat password baru</a>
       </p>
       <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#85847d">Link berlaku 1 jam dan hanya bisa dipakai sekali. Kalau tombol tidak bekerja, buka link ini:</p>
       <p style="margin:0;font-size:12px;line-height:1.6;word-break:break-all;color:#555">${safeUrl}</p>
       <p style="margin:18px 0 0;font-size:12px;line-height:1.6;color:#85847d">Kalau kamu tidak meminta reset password, abaikan email ini.</p>`,
    ),
  });
}
