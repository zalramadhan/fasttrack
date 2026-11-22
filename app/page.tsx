import {
  Bricolage_Grotesque,
  DM_Sans,
  JetBrains_Mono,
  Playfair_Display,
} from "next/font/google";
import Home from "@/components/Home";
import { getCurrentUser } from "@/lib/server/auth";
import { LIFETIME_PRICE } from "@/lib/server/config";
import { getProject, getSetting } from "@/lib/server/db";
import type { SavedProject } from "@/lib/types";

export const dynamic = "force-dynamic";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});
const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});
const landingFontClass = [
  bricolage.variable,
  dmSans.variable,
  jetbrainsMono.variable,
  playfair.variable,
].join(" ");

export default async function Page() {
  const user = await getCurrentUser();
  let savedProject: SavedProject | null = null;
  let projectUpdatedAt: number | null = null;

  if (user) {
    const row = await getProject(user.id);
    if (row) {
      projectUpdatedAt = row.updated_at;
      try {
        const parsed = JSON.parse(row.data) as SavedProject;
        if (
          parsed.version === 1 &&
          Array.isArray(parsed.clips) &&
          parsed.clips.length > 0
        ) {
          savedProject = parsed;
        }
      } catch {
        // Ignore a corrupt project and let the user start fresh.
      }
    }
  }

  return (
    <Home
      user={user}
      savedProject={
        savedProject && projectUpdatedAt
          ? { project: savedProject, updatedAt: projectUpdatedAt }
          : null
      }
      shopeeUrl={(await getSetting("shopee_url")) ?? ""}
      lifetimePrice={LIFETIME_PRICE}
      landingFontClass={landingFontClass}
    />
  );
}
