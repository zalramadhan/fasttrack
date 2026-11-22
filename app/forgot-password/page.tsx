import ForgotPasswordForm from "@/components/ForgotPasswordForm";
import { landingFontClass } from "../fonts";

export const dynamic = "force-dynamic";

export default function ForgotPasswordPage() {
  return <ForgotPasswordForm fontClass={landingFontClass} />;
}
