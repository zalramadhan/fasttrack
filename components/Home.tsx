"use client";

import { useEffect, useRef, useState } from "react";
import Editor from "./Editor";
import StartScreen from "./StartScreen";
import LandingPage from "./landing/LandingPage";
import { importFromLink, uploadMedia } from "@/lib/media";
import {
  clearPendingSource,
  readPendingSource,
} from "@/lib/pending-source";
import { useI18n } from "@/lib/i18n";
import type { MediaAsset, PublicUser, SavedProject } from "@/lib/types";

export type SavedProjectState = {
  project: SavedProject;
  updatedAt: number;
};

export default function Home({
  user,
  savedProject,
  shopeeUrl,
  lifetimePrice,
  landingFontClass,
}: {
  user: PublicUser | null;
  savedProject: SavedProjectState | null;
  shopeeUrl: string;
  lifetimePrice: number;
  landingFontClass?: string;
}) {
  const { t, errorText } = useI18n();
  const [asset, setAsset] = useState<MediaAsset | null>(null);
  const [openSaved, setOpenSaved] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const pendingStarted = useRef(false);

  useEffect(() => {
    if (!user || pendingStarted.current || asset || openSaved) return;
    pendingStarted.current = true;

    void (async () => {
      const pending = await readPendingSource().catch(() => null);
      if (!pending) return;
      setPreparing(true);
      setPendingError(null);
      try {
        const next =
          pending.kind === "link"
            ? await importFromLink(pending.url)
            : await uploadMedia(
                new File([pending.blob], pending.name, {
                  type: pending.blob.type || "video/mp4",
                }),
                "video",
              );
        await clearPendingSource();
        setAsset(next);
      } catch (error) {
        setPendingError(
          error instanceof Error
            ? errorText(error.message)
            : t("common.uploadFailed"),
        );
      } finally {
        setPreparing(false);
      }
    })();
  }, [asset, errorText, openSaved, t, user]);

  if (!user) {
    return (
      <LandingPage
        lifetimePrice={lifetimePrice}
        fontClass={landingFontClass}
      />
    );
  }

  if (openSaved && savedProject) {
    return (
      <Editor
        user={user}
        initialProject={savedProject.project}
        shopeeUrl={shopeeUrl}
      />
    );
  }
  if (!asset) {
    return (
      <StartScreen
        user={user}
        onReady={setAsset}
        savedProject={savedProject}
        onContinue={() => setOpenSaved(true)}
        pendingError={pendingError}
        preparing={preparing}
        lifetimePrice={lifetimePrice}
      />
    );
  }
  return <Editor user={user} bootAsset={asset} shopeeUrl={shopeeUrl} />;
}
