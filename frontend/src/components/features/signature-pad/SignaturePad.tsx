'use client';

import { Brush, Type, Upload as UploadIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

type Mode = 'draw' | 'type' | 'upload';

const SCRIPT_FONTS = [
  { family: 'Caveat', label: 'Caveat' },
  { family: 'Dancing Script', label: 'Dancing' },
  { family: 'Great Vibes', label: 'Vibes' },
  { family: 'Allura', label: 'Allura' },
];

/**
 * Tri-modal signature input: draw / type / upload.
 * On confirm: returns base64 PNG of the signature image.
 */
export function SignaturePad({
  onConfirm,
  onCancel,
  signerName,
}: {
  onConfirm: (dataUrl: string) => void;
  onCancel: () => void;
  signerName: string;
}) {
  const [mode, setMode] = useState<Mode>('draw');
  const sigRef = useRef<SignatureCanvas>(null);
  const [typedFont, setTypedFont] = useState(SCRIPT_FONTS[0].family);
  const [typedName, setTypedName] = useState(signerName);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);

  // Inject script fonts once
  useEffect(() => {
    const id = 'signable-script-fonts';
    if (typeof document === 'undefined') return;
    if (document.getElementById(id)) return;
    const link = document.createElement('link');
    link.id = id;
    link.rel = 'stylesheet';
    link.href =
      'https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=Dancing+Script:wght@600&family=Great+Vibes&family=Allura&display=swap';
    document.head.appendChild(link);
  }, []);

  const handleConfirm = () => {
    if (mode === 'draw') {
      const sig = sigRef.current;
      if (!sig || sig.isEmpty()) return;
      onConfirm(sig.getTrimmedCanvas().toDataURL('image/png'));
    } else if (mode === 'type') {
      const canvas = document.createElement('canvas');
      canvas.width = 600;
      canvas.height = 200;
      const ctx = canvas.getContext('2d')!;
      ctx.fillStyle = '#000';
      ctx.font = `64px "${typedFont}", cursive`;
      ctx.textBaseline = 'middle';
      ctx.fillText(typedName, 20, 100);
      onConfirm(canvas.toDataURL('image/png'));
    } else if (mode === 'upload' && uploadedUrl) {
      onConfirm(uploadedUrl);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-1 border-b border-border">
        {(['draw', 'type', 'upload'] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px',
              mode === m
                ? 'border-accent text-accent'
                : 'border-transparent text-ink-soft hover:text-ink',
            )}
          >
            {m === 'draw' ? <Brush className="h-3.5 w-3.5" /> : null}
            {m === 'type' ? <Type className="h-3.5 w-3.5" /> : null}
            {m === 'upload' ? <UploadIcon className="h-3.5 w-3.5" /> : null}
            <span className="capitalize">{m}</span>
          </button>
        ))}
      </div>

      <div className="min-h-[200px]">
        {mode === 'draw' && (
          <DrawPanel ref={sigRef} />
        )}
        {mode === 'type' && (
          <TypePanel
            value={typedName}
            onChange={setTypedName}
            font={typedFont}
            onFontChange={setTypedFont}
          />
        )}
        {mode === 'upload' && (
          <UploadPanel value={uploadedUrl} onChange={setUploadedUrl} />
        )}
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="accent" onClick={handleConfirm}>
          Apply signature
        </Button>
      </div>
    </div>
  );
}

const DrawPanel = ({ ref }: { ref: React.Ref<SignatureCanvas> }) => (
  <div className="space-y-2">
    <div className="border border-border rounded-sm bg-paper relative">
      <SignatureCanvas
        ref={ref}
        canvasProps={{
          width: 600,
          height: 200,
          className: 'w-full',
          style: { width: '100%', height: 200 },
        }}
        penColor="#1a1f2e"
        backgroundColor="rgba(255,255,255,0)"
      />
      <div className="absolute bottom-2 left-2 label-mono">
        sign within the line
      </div>
      <div className="absolute bottom-3 right-2 left-12 border-b border-ink-faint" />
    </div>
    <button
      onClick={() => {
        const r = ref as React.MutableRefObject<SignatureCanvas | null>;
        r.current?.clear();
      }}
      className="text-xs text-ink-faint hover:text-accent font-mono uppercase tracking-wider"
    >
      Clear
    </button>
  </div>
);

function TypePanel({
  value,
  onChange,
  font,
  onFontChange,
}: {
  value: string;
  onChange: (v: string) => void;
  font: string;
  onFontChange: (f: string) => void;
}) {
  return (
    <div className="space-y-3">
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Type your full name"
      />
      <div className="grid grid-cols-2 gap-2">
        {SCRIPT_FONTS.map((f) => (
          <button
            key={f.family}
            onClick={() => onFontChange(f.family)}
            className={cn(
              'border rounded-sm p-3 text-left transition-all',
              font === f.family
                ? 'border-accent bg-accent/5'
                : 'border-border hover:border-ink-faint',
            )}
          >
            <span className="label-mono">{f.label}</span>
            <p
              className="text-2xl mt-1 truncate"
              style={{ fontFamily: `"${f.family}", cursive` }}
            >
              {value || 'Your name'}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}

function UploadPanel({
  value,
  onChange,
}: {
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
    <div className="space-y-3">
      <div
        onClick={() => inputRef.current?.click()}
        className="border-2 border-dashed border-border rounded-sm p-8 text-center cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors"
      >
        <UploadIcon className="h-6 w-6 mx-auto text-ink-faint mb-2" />
        <p className="text-sm">Click to upload an image of your signature</p>
        <p className="text-xs text-ink-faint mt-1">PNG or JPG, transparent background recommended</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </div>
      {value ? (
        <div className="border border-border rounded-sm p-4 bg-paper-dim flex items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt="Uploaded signature"
            className="max-h-32"
          />
        </div>
      ) : null}
    </div>
  );
}
