"use client";

import { useState } from "react";
import Editor from "./Editor";
import StartScreen from "./StartScreen";
import type { MediaAsset } from "@/lib/types";

export default function Home() {
  const [asset, setAsset] = useState<MediaAsset | null>(null);

  if (!asset) return <StartScreen onReady={setAsset} />;
  return <Editor bootAsset={asset} />;
}
