"use client";

import { useI18n } from "@/lib/i18n";
import type { PublicUser } from "@/lib/types";
import { AccountMenu as LandingAccountMenu } from "./landing/AccountMenu";

export default function AccountMenu({ user }: { user: PublicUser }) {
  const { lang } = useI18n();
  return <LandingAccountMenu user={user} locale={lang} />;
}
