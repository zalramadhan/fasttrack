import VerifyEmailForm from "@/components/VerifyEmailForm";
import { landingFontClass } from "../../fonts";

export const dynamic = "force-dynamic";

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <VerifyEmailForm token={token ?? ""} fontClass={landingFontClass} />;
}
