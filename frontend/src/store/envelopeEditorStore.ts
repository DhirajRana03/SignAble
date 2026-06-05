/**
 * Field placement editor state.
 *
 * In Zustand because:
 * - mutated rapidly during drag (too noisy for server / query cache)
 * - shared across FieldToolbar, FieldOverlay, DraggableField without prop drilling
 * - represents draft state before user clicks "Save fields"
 */
import { nanoid } from '@/lib/nanoid';
import type {
  FieldOptions,
  FieldType,
  SignatureField,
} from '@/types/envelope.types';
import { create } from 'zustand';

export interface EditorField {
  tempId: string;            // client-only id; replaced by server id after save
  serverId?: string;          // populated once persisted
  recipientId: string;
  pageNumber: number;
  xPct: number;
  yPct: number;
  widthPct: number;
  heightPct: number;
  fieldType: FieldType;
  /** Display label from palette tile (Name, Email, etc) — overrides generic type label on chip. */
  label?: string;
  required: boolean;
  readOnly?: boolean;
  options: FieldOptions;
}

interface EditorState {
  envelopeId: string | null;
  fields: EditorField[];
  selectedTempId: string | null;
  activeRecipientId: string | null;
  /**
   * Visibility filter. null = show all recipients' chips; otherwise the
   * recipient whose chips render at full opacity (others dim).
   */
  filterRecipientId: string | null;
  dirty: boolean;
  init: (envelopeId: string, existing: SignatureField[]) => void;
  setActiveRecipient: (recipientId: string | null) => void;
  setFilterRecipient: (recipientId: string | null) => void;
  addField: (field: Omit<EditorField, 'tempId'>) => void;
  updateField: (tempId: string, patch: Partial<EditorField>) => void;
  removeField: (tempId: string) => void;
  select: (tempId: string | null) => void;
  markClean: () => void;
  reset: () => void;
}

export const useEnvelopeEditorStore = create<EditorState>((set) => ({
  envelopeId: null,
  fields: [],
  selectedTempId: null,
  activeRecipientId: null,
  filterRecipientId: null,
  dirty: false,

  init: (envelopeId, existing) => {
    set({
      envelopeId,
      fields: existing.map((f) => ({
        tempId: nanoid(),
        serverId: f.id,
        recipientId: f.recipientId,
        pageNumber: f.pageNumber,
        xPct: f.xPct,
        yPct: f.yPct,
        widthPct: f.widthPct,
        heightPct: f.heightPct,
        fieldType: f.fieldType,
        required: f.required,
        // Hydrate label + readOnly when the envelope has been saved
        // before; both are stored on the server.
        label: f.label ?? undefined,
        readOnly: f.readOnly ?? false,
        options: f.options ?? null,
      })),
      selectedTempId: null,
      filterRecipientId: null,
      dirty: false,
    });
  },

  setActiveRecipient: (recipientId) =>
    set({ activeRecipientId: recipientId }),

  setFilterRecipient: (recipientId) =>
    set({ filterRecipientId: recipientId }),

  addField: (field) =>
    set((s) => ({
      fields: [...s.fields, { ...field, tempId: nanoid() }],
      dirty: true,
    })),

  updateField: (tempId, patch) =>
    set((s) => ({
      fields: s.fields.map((f) =>
        f.tempId === tempId ? { ...f, ...patch } : f,
      ),
      dirty: true,
    })),

  removeField: (tempId) =>
    set((s) => ({
      fields: s.fields.filter((f) => f.tempId !== tempId),
      selectedTempId: s.selectedTempId === tempId ? null : s.selectedTempId,
      dirty: true,
    })),

  select: (tempId) => set({ selectedTempId: tempId }),

  markClean: () => set({ dirty: false }),

  reset: () =>
    set({
      envelopeId: null,
      fields: [],
      selectedTempId: null,
      activeRecipientId: null,
      filterRecipientId: null,
      dirty: false,
    }),
}));
