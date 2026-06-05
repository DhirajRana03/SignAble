'use client';

import { create } from 'zustand';

/**
 * Cross-component coordination for the composer leave-page guard.
 * Composer marks itself dirty; Sidebar intercepts nav clicks and
 * defers navigation via pendingHref until the user resolves the
 * Stay / Discard modal.
 *
 * Note: draft persistence was moved to the prepare-envelope settings,
 * so this store no longer carries a saveDraft handler.
 */
interface ComposerGuardState {
  dirty: boolean;
  pendingHref: string | null;
  setDirty: (dirty: boolean) => void;
  requestNavigate: (href: string) => void;
  clearPending: () => void;
}

export const useComposerGuardStore = create<ComposerGuardState>((set) => ({
  dirty: false,
  pendingHref: null,
  setDirty: (dirty) => set({ dirty }),
  requestNavigate: (href) => set({ pendingHref: href }),
  clearPending: () => set({ pendingHref: null }),
}));
