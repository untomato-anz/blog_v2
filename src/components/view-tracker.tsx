"use client";

import { useEffect } from "react";
import { recordView } from "@/app/actions/views";

export function ViewTracker({ postId }: { postId: string }) {
  useEffect(() => {
    void recordView(postId);
  }, [postId]);
  return null;
}
