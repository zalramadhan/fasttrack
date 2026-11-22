"use client";

import { useEffect, useRef, useState } from "react";
import Editor from "./Editor";
import { importFromLink, uploadMedia } from "@/lib/media";
import { clearPendingSource, readPendingSource } from "@/lib/pending-source";
import { useI18n } from "@/lib/i18n";
import type { MediaAsset, PublicUser, SavedProject } from "@/lib/types";
import { SpinnerIcon } from "./icons";
import { Wordmark } from "./Logo";

export type SavedProjectState = {
  project: SavedProject;
  updatedAt: number;
};

export default function Home({
  user,
  savedProject,
  shopeeUrl,
}: {
  user: PublicUser;
  savedProject: SavedProjectState | null;
  shopeeUrl: string;
}) {
  const { t, errorText } = useI18n();
  const [asset, setAsset] = useState<MediaAsset | null>(null);
  const [pendingError, setPendingError] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);
  const pendingStarted = useRef(false);

  useEffect(() => {
    if (pendingStarted.current) return;
    pendingStarted.current = true;

    void (async () => {
      const pending = await readPendingSource().catch(() => null);
      if (pending) {
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
          setAsset(next);
        } catch (error) {
          setPendingError(
            error instanceof Error
              ? errorText(error.message)
              : t("common.uploadFailed"),
          );
        } finally {
          // The queued source is consumed once we try it, pass or fail.
          await clearPendingSource().catch(() => {});
        }
      }
      setResolved(true);
    })();
  }, [errorText, t]);

  if (!resolved) {
    return (
      <div className="grid min-h-screen place-items-center bg-paper text-ink">
        <div className="flex flex-col items-center gap-3">
          <Wordmark
            markClassName="h-8 w-8 text-accent"
            textClassName="text-[24px] text-ink"
          />
          <p className="flex items-center gap-2 text-[12px] text-muted">
            <SpinnerIcon className="h-3.5 w-3.5" /> {t("start.opening")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <Editor
      user={user}
      bootAsset={asset}
      initialProject={!asset && savedProject ? savedProject.project : null}
      initialError={pendingError}
      shopeeUrl={shopeeUrl}
    />
  );
}
