"use client";

import { createContext, useCallback, useContext, useState, type ReactNode } from "react";

// PRD M7: "Triggered when the parse flags shouldSplit, or on demand." The
// flag itself (core/heuristic.ts's `estimateMin > 180`, or whatever the live
// Gemini provider decides) lives only on the transient ParsedTask a parse
// resolves to — it is never persisted onto the Task document, so there is
// nothing in core/types.ts to read it back from later. This context is the
// bridge: ui/capture/CaptureBar.tsx marks a freshly-created task's id here
// the moment requestParse says shouldSplit, and ui/board/TaskCard.tsx reads
// it to show a quiet, dismissible breakdown offer — never forcing one.
// Session-only by design: reloading the board simply drops the suggestion,
// which is fine, since the on-demand "Break into steps" action is always
// available regardless of whether this flag is set.
interface SplitSuggestionContextValue {
  isSuggested: (taskId: string) => boolean;
  suggest: (taskId: string) => void;
  dismiss: (taskId: string) => void;
}

const SplitSuggestionContext = createContext<SplitSuggestionContextValue | null>(null);

export function useSplitSuggestion(): SplitSuggestionContextValue {
  const ctx = useContext(SplitSuggestionContext);
  if (!ctx) throw new Error("useSplitSuggestion must be used within SplitSuggestionProvider");
  return ctx;
}

export function SplitSuggestionProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<ReadonlySet<string>>(() => new Set());

  const suggest = useCallback((taskId: string) => {
    setIds((prev) => (prev.has(taskId) ? prev : new Set(prev).add(taskId)));
  }, []);

  const dismiss = useCallback((taskId: string) => {
    setIds((prev) => {
      if (!prev.has(taskId)) return prev;
      const next = new Set(prev);
      next.delete(taskId);
      return next;
    });
  }, []);

  const isSuggested = useCallback((taskId: string) => ids.has(taskId), [ids]);

  return (
    <SplitSuggestionContext.Provider value={{ isSuggested, suggest, dismiss }}>
      {children}
    </SplitSuggestionContext.Provider>
  );
}
