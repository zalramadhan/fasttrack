import LandingPage from "@/components/landing/LandingPage";
import { landingFontClass } from "./fonts";
import { getCurrentUser } from "@/lib/server/auth";
import { LIFETIME_PRICE } from "@/lib/server/config";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await getCurrentUser();

  return (
    <LandingPage
      lifetimePrice={LIFETIME_PRICE}
      fontClass={landingFontClass}
      user={user}
    />
  );
}
