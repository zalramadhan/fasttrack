import HelpGuide from "@/components/HelpGuide";
import { getCurrentUser } from "@/lib/server/auth";

export const dynamic = "force-dynamic";

export default async function HelpPage() {
  const user = await getCurrentUser();
  return <HelpGuide user={user} />;
}
