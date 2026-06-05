'use client';

import { X } from 'lucide-react';
import {
  forwardRef,
  type MutableRefObject,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import SignatureCanvas from 'react-signature-canvas';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import type {
  AdoptedSignature,
  AdoptSignaturePayload,
} from '@/types/signing.types';

type Tab = 'style' | 'draw' | 'upload';

/**
 * Curated script font palette for the SELECT STYLE tab. Loaded once
 * from Google Fonts (see effect below). Keep this in sync with the
 * @font-face injection so the rendered canvas matches what the user
 * previews.
 */
const SCRIPT_FONTS: { family: string; label: string }[] = [
  { family: 'Caveat', label: 'Caveat' },
  { family: 'Dancing Script', label: 'Dancing' },
  { family: 'Great Vibes', label: 'Vibes' },
  { family: 'Allura', label: 'Allura' },
];

/**
 * Render a styled signature/initials string to a transparent PNG. The
 * canvas size is generous so the signed PDF stays crisp when scaled
 * down by the processor. Returns a data URL ready for upload + reuse.
 */
function renderTextToPng(text: string, font: string): string {
  const canvas = document.createElement('canvas');
  canvas.width = 600;
  canvas.height = 200;
  const ctx = canvas.getContext('2d')!;
  // Wait one paint cycle for FontFace API to finish loading; we cap
  // the fallback in case the user goes offline.
  ctx.fillStyle = '#111827';
  ctx.font = `64px "${font}", cursive`;
  ctx.textBaseline = 'middle';
  ctx.fillText(text, 20, 100);
  return canvas.toDataURL('image/png');
}

/**
 * Deterministic short hash used for the recipient ID line in the
 * preview tile (mirrors the DocuSign mockup). Not cryptographically
 * meaningful — purely a visual artifact.
 */
function shortHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = (h * 0x01000193) >>> 0;
  }
  return h.toString(16).toUpperCase().padStart(8, '0');
}

function initialsFromName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((p) => p[0] ?? '')
    .join('')
    .slice(0, 3)
    .toUpperCase();
}

/**
 * DocuSign "Adopt Your Signature" modal. Captures one signature image
 * + one initials image, reusable across every SIGNATURE / INITIALS
 * field in the envelope. Three tabs:
 *
 *  - SELECT STYLE: type-driven, font picker, instant preview.
 *  - DRAW: free-hand canvas for both signature + initials.
 *  - UPLOAD: image file for each.
 *
 * `onAdopt` receives the finalized payload; the parent handles the API
 * call + state update. Loading state is owned by the parent so the
 * modal can show a button spinner.
 */
export function AdoptSignatureModal({
  initialName,
  initialAdopted,
  busy = false,
  onAdopt,
  onCancel,
}: {
  initialName: string;
  initialAdopted: AdoptedSignature | null;
  busy?: boolean;
  onAdopt: (payload: AdoptSignaturePayload) => void;
  onCancel: () => void;
}) {
  const [tab, setTab] = useState<Tab>('style');
  const [fullName, setFullName] = useState(
    initialAdopted?.fullName ?? initialName,
  );
  const [initialsText, setInitialsText] = useState(
    initialAdopted?.initialsText ?? initialsFromName(initialName),
  );
  const [font, setFont] = useState(SCRIPT_FONTS[0].family);

  // Draw tab — separate canvases for signature + initials so the user
  // can compose both before adopting.
  const signaturePadRef = useRef<SignatureCanvas | null>(null);
  const initialsPadRef = useRef<SignatureCanvas | null>(null);

  // Upload tab — independent files for signature + initials.
  const [uploadedSig, setUploadedSig] = useState<string | null>(
    initialAdopted?.signature ?? null,
  );
  const [uploadedInit, setUploadedInit] = useState<string | null>(
    initialAdopted?.initials ?? null,
  );

  // Inject the script font stylesheet exactly once per page lifetime.
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const id = 'signable-script-fonts';
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=Dancing+Script:wght@600&family=Great+Vibes&family=Allura&display=swap';
    document.head.appendChild(link);
  }, []);

  // Auto-sync initials when the user edits the full name, but only
  // while they haven't manually overridden the initials field.
  const initialsManuallyEditedRef = useRef(false);
  useEffect(() => {
    if (initialsManuallyEditedRef.current) return;
    setInitialsText(initialsFromName(fullName));
  }, [fullName]);

  const id = useMemo(
    () => shortHash(fullName || initialName || 'signer'),
    [fullName, initialName],
  );

  const canAdopt = (() => {
    if (!fullName.trim() || !initialsText.trim()) return false;
    if (tab === 'style') return true;
    if (tab === 'upload') return !!uploadedSig && !!uploadedInit;
    if (tab === 'draw') {
      return (
        !!signaturePadRef.current &&
        !signaturePadRef.current.isEmpty() &&
        !!initialsPadRef.current &&
        !initialsPadRef.current.isEmpty()
      );
    }
    return false;
  })();

  const handleAdopt = () => {
    if (!fullName.trim() || !initialsText.trim()) return;
    if (tab === 'style') {
      const signature = renderTextToPng(fullName, font);
      const initials = renderTextToPng(initialsText, font);
      onAdopt({ signature, initials, fullName, initialsText });
      return;
    }
    if (tab === 'draw') {
      const sig = signaturePadRef.current;
      const init = initialsPadRef.current;
      if (!sig || !init || sig.isEmpty() || init.isEmpty()) return;
      onAdopt({
        signature: sig.getTrimmedCanvas().toDataURL('image/png'),
        initials: init.getTrimmedCanvas().toDataURL('image/png'),
        fullName,
        initialsText,
      });
      return;
    }
    if (tab === 'upload') {
      if (!uploadedSig || !uploadedInit) return;
      onAdopt({
        signature: uploadedSig,
        initials: uploadedInit,
        fullName,
        initialsText,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="adopt-signature-title"
    >
      <div
        className="absolute inset-0 bg-ink/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-3xl bg-white rounded-md shadow-xl overflow-hidden border border-border">
        {/* Header */}
        <header className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h2
            id="adopt-signature-title"
            className="text-lg font-semibold text-ink"
          >
            Adopt Your Signature
          </h2>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Close"
            className="h-7 w-7 grid place-items-center rounded-md text-ink-3 hover:text-ink hover:bg-surface-sunken transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* Identity inputs */}
        <div className="px-6 py-5 border-b border-border">
          <p className="text-[13px] text-ink-2 mb-4">
            Confirm your name, initials and signature.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-[3fr_1fr] gap-4">
            <Field
              label="Full Name"
              required
              value={fullName}
              onChange={(v) => setFullName(v)}
            />
            <Field
              label="Initials"
              required
              value={initialsText}
              onChange={(v) => {
                initialsManuallyEditedRef.current = true;
                setInitialsText(v.toUpperCase());
              }}
              maxLength={6}
            />
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-border">
          <div className="flex gap-6">
            <TabButton
              active={tab === 'style'}
              onClick={() => setTab('style')}
              label="SELECT STYLE"
            />
            <TabButton
              active={tab === 'draw'}
              onClick={() => setTab('draw')}
              label="DRAW"
            />
            <TabButton
              active={tab === 'upload'}
              onClick={() => setTab('upload')}
              label="UPLOAD"
            />
          </div>
        </div>

        {/* Tab content */}
        <div className="px-6 py-5">
          {tab === 'style' ? (
            <SelectStyleTab
              fullName={fullName}
              initialsText={initialsText}
              shortId={id}
              font={font}
              onChangeStyle={() => {
                // Round-robin to the next font so "Change Style"
                // visibly cycles without forcing a separate picker UI.
                const idx = SCRIPT_FONTS.findIndex((f) => f.family === font);
                const next =
                  SCRIPT_FONTS[(idx + 1) % SCRIPT_FONTS.length].family;
                setFont(next);
              }}
            />
          ) : null}

          {tab === 'draw' ? (
            <DrawTab
              sigRef={signaturePadRef}
              initRef={initialsPadRef}
            />
          ) : null}

          {tab === 'upload' ? (
            <UploadTab
              signatureUrl={uploadedSig}
              initialsUrl={uploadedInit}
              onSignatureChange={setUploadedSig}
              onInitialsChange={setUploadedInit}
            />
          ) : null}
        </div>

        {/* Legal copy */}
        <div className="px-6 py-4 border-t border-border bg-surface-sunken/40">
          <p className="text-[12.5px] text-ink-2 leading-relaxed">
            By selecting <strong>Adopt and Sign</strong>, I agree that the
            signature and initials will be the electronic representation of
            my signature and initials for all purposes when I (or my agent)
            use them on documents, including legally binding contracts.
          </p>
        </div>

        {/* Footer actions */}
        <footer className="flex items-center gap-2 px-6 py-4 border-t border-border bg-white">
          <Button
            variant="primary"
            size="md"
            onClick={handleAdopt}
            disabled={!canAdopt || busy}
            loading={busy}
          >
            Adopt and Sign
          </Button>
          <Button variant="ghost" size="md" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
        </footer>
      </div>
    </div>
  );
}

/* ─────────────── Inline field ─────────────── */

function Field({
  label,
  required,
  value,
  onChange,
  maxLength,
}: {
  label: string;
  required?: boolean;
  value: string;
  onChange: (v: string) => void;
  maxLength?: number;
}) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-ink mb-1.5">
        {label}
        {required ? <span className="text-danger ml-0.5">*</span> : null}
      </span>
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
      />
    </label>
  );
}

/* ─────────────── Tab button ─────────────── */

function TabButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative py-3 text-[12.5px] font-semibold tracking-[0.08em] uppercase transition-colors',
        active ? 'text-accent-deep' : 'text-ink-3 hover:text-ink',
      )}
    >
      {label}
      {active ? (
        <span className="absolute left-0 right-0 -bottom-px h-[2px] bg-accent-deep" />
      ) : null}
    </button>
  );
}

/* ─────────────── Tab: SELECT STYLE ─────────────── */

function SelectStyleTab({
  fullName,
  initialsText,
  shortId,
  font,
  onChangeStyle,
}: {
  fullName: string;
  initialsText: string;
  shortId: string;
  font: string;
  onChangeStyle: () => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11.5px] font-semibold tracking-[0.1em] uppercase text-ink-3">
          Preview
        </span>
        <button
          type="button"
          onClick={onChangeStyle}
          className="text-[13px] font-medium text-accent-deep hover:text-accent transition-colors"
        >
          Change Style
        </button>
      </div>
      <div className="border border-border rounded-md p-5 bg-surface-sunken/30">
        <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-5">
          <PreviewCard label="Signed by:" id={shortId}>
            <span
              className="block text-4xl text-ink truncate"
              style={{ fontFamily: `"${font}", cursive` }}
            >
              {fullName || 'Your name'}
            </span>
          </PreviewCard>
          <PreviewCard label="DS">
            <span
              className="block text-4xl text-ink truncate"
              style={{ fontFamily: `"${font}", cursive` }}
            >
              {initialsText || 'YN'}
            </span>
          </PreviewCard>
        </div>
      </div>
    </div>
  );
}

function PreviewCard({
  label,
  id,
  children,
}: {
  label: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="relative border-l-2 border-r-2 border-accent rounded-sm bg-white px-4 py-3">
      <span className="block text-[11.5px] font-semibold text-ink mb-1">
        {label}
      </span>
      {children}
      {id ? (
        <span className="block mt-2 text-[11px] font-mono font-semibold tracking-wider text-ink-2">
          {id}…
        </span>
      ) : null}
    </div>
  );
}

/* ─────────────── Tab: DRAW ─────────────── */

const DrawCanvas = forwardRef<SignatureCanvas, { height?: number }>(
  function DrawCanvas({ height = 180 }, ref) {
    return (
      <div className="border border-border rounded-sm bg-white relative">
        <SignatureCanvas
          ref={ref}
          canvasProps={{
            width: 600,
            height,
            className: 'w-full',
            style: { width: '100%', height },
          }}
          penColor="#111827"
          backgroundColor="rgba(255,255,255,0)"
        />
        <div className="absolute bottom-3 left-3 right-3 border-b border-ink-faint" />
      </div>
    );
  },
);

function DrawTab({
  sigRef,
  initRef,
}: {
  sigRef: MutableRefObject<SignatureCanvas | null>;
  initRef: MutableRefObject<SignatureCanvas | null>;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-5">
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11.5px] font-semibold tracking-[0.1em] uppercase text-ink-3">
            Signature
          </span>
          <button
            type="button"
            onClick={() => sigRef.current?.clear()}
            className="text-[11.5px] font-semibold tracking-[0.08em] uppercase text-ink-3 hover:text-accent transition-colors"
          >
            Clear
          </button>
        </div>
        <DrawCanvas ref={sigRef} />
      </div>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-[11.5px] font-semibold tracking-[0.1em] uppercase text-ink-3">
            Initials
          </span>
          <button
            type="button"
            onClick={() => initRef.current?.clear()}
            className="text-[11.5px] font-semibold tracking-[0.08em] uppercase text-ink-3 hover:text-accent transition-colors"
          >
            Clear
          </button>
        </div>
        <DrawCanvas ref={initRef} />
      </div>
    </div>
  );
}

/* ─────────────── Tab: UPLOAD ─────────────── */

function UploadTab({
  signatureUrl,
  initialsUrl,
  onSignatureChange,
  onInitialsChange,
}: {
  signatureUrl: string | null;
  initialsUrl: string | null;
  onSignatureChange: (v: string | null) => void;
  onInitialsChange: (v: string | null) => void;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[3fr_2fr] gap-5">
      <UploadCell
        label="Signature"
        value={signatureUrl}
        onChange={onSignatureChange}
      />
      <UploadCell
        label="Initials"
        value={initialsUrl}
        onChange={onInitialsChange}
      />
    </div>
  );
}

function UploadCell({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const handleFile = (file?: File) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };
  return (
    <div>
      <span className="block text-[11.5px] font-semibold tracking-[0.1em] uppercase text-ink-3 mb-2">
        {label}
      </span>
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-sm p-6 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors"
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={value}
            alt={`${label} preview`}
            className="mx-auto max-h-24"
          />
        ) : (
          <>
            <p className="text-[13px] text-ink-2">Click to upload</p>
            <p className="text-[11px] text-ink-3 mt-1">PNG or JPG</p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {value ? (
        <button
          type="button"
          onClick={() => onChange(null)}
          className="mt-2 text-[11px] font-semibold tracking-[0.08em] uppercase text-ink-3 hover:text-accent transition-colors"
        >
          Remove
        </button>
      ) : null}
    </div>
  );
}
