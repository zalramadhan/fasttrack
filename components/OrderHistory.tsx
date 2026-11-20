"use client";

import type { PublicUser, UserOrder } from "@/lib/types";
import { useI18n } from "@/lib/i18n";
import AccountMenu from "./AccountMenu";
import LanguageToggle from "./LanguageToggle";
import ThemeToggle from "./ThemeToggle";
import LogoMark from "./Logo";

function formatDate(value: number, lang: "en" | "id") {
  return new Date(value).toLocaleString(lang === "id" ? "id-ID" : "en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export default function OrderHistory({
  user,
  orders,
}: {
  user: PublicUser;
  orders: UserOrder[];
}) {
  const { t, lang } = useI18n();
  const currency = new Intl.NumberFormat(lang === "id" ? "id-ID" : "en-US", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  });

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-paper/85 backdrop-blur-md">
        <div className="mx-auto flex h-[56px] max-w-3xl items-center justify-between px-4">
          <a href="/" className="flex items-center gap-2.5">
            <LogoMark className="h-7 w-7 text-ink" />
            <span className="text-[14.5px] font-semibold tracking-[-0.02em] text-ink">
              fasttrack
            </span>
          </a>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <AccountMenu user={user} />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="label">account</p>
            <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.03em] text-ink">
              {t("orders.title")}
            </h1>
            <p className="mt-1 text-[12.5px] text-muted">{t("orders.subtitle")}</p>
          </div>
          <a href="/" className="btn">
            {t("orders.back")}
          </a>
        </div>

        <div className="mt-5 space-y-2">
          {orders.length === 0 && (
            <div className="rounded-xl border border-line bg-surface p-4">
              <p className="text-[13px] font-medium text-ink">{t("orders.empty")}</p>
              <p className="mt-1 text-[11.5px] text-muted">{t("orders.emptyHint")}</p>
            </div>
          )}

          {orders.map((order) => {
            const statusKey =
              order.status === "paid"
                ? "orders.paid"
                : order.status === "cancelled"
                  ? "orders.cancelled"
                  : "orders.pending";
            const statusClass =
              order.status === "paid"
                ? "border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                : order.status === "pending"
                  ? "border-amber-500/40 text-amber-700 dark:text-amber-300"
                  : "";

            return (
              <section key={order.id} className="card p-3.5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="label">{t("orders.code")}</p>
                    <p className="mt-0.5 font-mono text-[13px] font-medium text-ink">
                      {order.code}
                    </p>
                  </div>
                  <span className={`chip ${statusClass}`}>{t(statusKey)}</span>
                </div>

                <dl className="mt-3 grid grid-cols-2 gap-3 text-[11.5px]">
                  <div>
                    <dt className="label">{t("orders.amount")}</dt>
                    <dd className="mt-0.5 font-medium tabular-nums text-ink">
                      {currency.format(order.amount)}
                    </dd>
                  </div>
                  <div>
                    <dt className="label">{t("orders.created")}</dt>
                    <dd className="mt-0.5 text-muted">{formatDate(order.createdAt, lang)}</dd>
                  </div>
                </dl>

                {order.confirmedAt && (
                  <p className="mt-2 text-[10.5px] text-muted">
                    {t("orders.confirmed")} · {formatDate(order.confirmedAt, lang)}
                  </p>
                )}

                {order.note && (
                  <p className="mt-2 rounded-lg border border-line bg-paper/60 px-2.5 py-2 text-[11px] leading-relaxed text-muted">
                    {t("orders.note")}: {order.note}
                  </p>
                )}

                {order.status === "pending" && order.whatsappUrl && (
                  <a
                    href={order.whatsappUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn btn-primary mt-3 w-full sm:w-auto"
                  >
                    {t("orders.pay")}
                  </a>
                )}
              </section>
            );
          })}
        </div>
      </main>
    </div>
  );
}
