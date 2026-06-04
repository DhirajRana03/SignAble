'use client';

import { create } from 'zustand';

/**
 * Cross-component coordination for composer unsaved-state guard.
 * Composer marks itself dirty; Sidebar intercepts nav clicks and
 * defers navigation via pendingHref until user resolves the prompt.
 */
interface ComposerGuardState {
  dirty: boolean;
  pendingHref: string | null;
  setDirty: (dirty: boolean) => void;
  requestNavigate: (href: string) => void;
  clearPending: () => void;
  /** Save-as-draft handler registered by composer. */
  saveDraft: (() => Promise<void> | void) | null;
  setSaveDraft: (fn: (() => Promise<void> | void) | null) => void;
}

export const useComposerGuardStore = create<ComposerGuardState>((set) => ({
  dirty: false,
  pendingHref: null,
  saveDraft: null,
  setDirty: (dirty) => set({ dirty }),
  requestNavigate: (href) => set({ pendingHref: href }),
  clearPending: () => set({ pendingHref: null }),
  setSaveDraft: (saveDraft) => set({ saveDraft }),
}));
