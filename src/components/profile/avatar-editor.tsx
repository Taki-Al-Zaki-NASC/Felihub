'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Camera, Loader2, Trash2, ZoomIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/field';
import { Avatar } from '@/components/ui/avatar';
import { saveAvatarAction } from '@/server/actions/avatar';
import type { FormResult } from '@/server/actions/profile';

/** The square we store. Generous for a retina 64px render, still ~25 KB, and
 *  served as a cached file rather than inlined, so the size is paid once. */
const OUTPUT = 320;
/** The on-screen crop window. */
const VIEW = 240;

/**
 * Pick a photo, frame it, save it.
 *
 * The previous version used `createImageBitmap(file)` and failed on two very
 * ordinary inputs: HEIC photos straight from an iPhone, which Chrome cannot
 * decode that way, and anything with EXIF orientation, which it ignores — so a
 * portrait photo saved sideways. Both looked to the user like "the upload does
 * not work".
 *
 * Decoding through an `<img>` element fixes both. Browsers apply EXIF
 * orientation to `<img>` automatically and hand `drawImage` the corrected
 * pixels, and an `<img>` decodes every format the browser supports rather than
 * the narrower set `createImageBitmap` accepts.
 *
 * Cropping is not decoration here: a profile photo is rendered in a circle, and
 * without a crop step people's heads sit off-centre or get cut in half by the
 * mask. Framing it themselves is the difference between a profile that looks
 * deliberate and one that looks broken.
 */
export function AvatarEditor({ username, displayName, hasImage, required }: {
  username: string;
  displayName: string;
  hasImage: boolean;
  required?: boolean;
}) {
  const [state, action, pending] = useActionState<FormResult | null, FormData>(
    saveAvatarAction, null,
  );

  const [source, setSource] = React.useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = React.useState(1);
  const [offset, setOffset] = React.useState({ x: 0, y: 0 });
  const [busy, setBusy] = React.useState(false);
  const [localError, setLocalError] = React.useState<string>();
  const [cleared, setCleared] = React.useState(false);
  const [saved, setSaved] = React.useState<string | null>(null);

  const formRef = React.useRef<HTMLFormElement>(null);
  const valueRef = React.useRef<HTMLInputElement>(null);
  const drag = React.useRef<{ x: number; y: number } | null>(null);
  /** The object URL backing the image being cropped. Held until the editor is
   *  finished with it — revoking it early leaves the crop preview blank, since
   *  the <img> in the DOM re-resolves the same src. */
  const objectUrl = React.useRef<string | null>(null);

  const releaseSource = React.useCallback(() => {
    if (objectUrl.current) {
      URL.revokeObjectURL(objectUrl.current);
      objectUrl.current = null;
    }
    setSource(null);
  }, []);

  // A picked-but-abandoned photo should not outlive the page.
  React.useEffect(() => () => {
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
  }, []);

  /** Cover scale: the smallest zoom at which the image still fills the window. */
  const baseScale = source
    ? Math.max(VIEW / source.naturalWidth, VIEW / source.naturalHeight)
    : 1;
  const effective = baseScale * zoom;

  /** Keeps the window covered — you can never drag a gap into the frame. */
  const clamp = React.useCallback((next: { x: number; y: number }) => {
    if (!source) return next;
    const w = source.naturalWidth * effective;
    const h = source.naturalHeight * effective;
    return {
      x: Math.min(0, Math.max(VIEW - w, next.x)),
      y: Math.min(0, Math.max(VIEW - h, next.y)),
    };
  }, [source, effective]);

  React.useEffect(() => { setOffset((o) => clamp(o)); }, [clamp]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setLocalError(undefined);
    if (!file.type.startsWith('image/') && !/\.(hei[cf])$/i.test(file.name)) {
      setLocalError('That is not an image. Choose a JPEG, PNG, WebP or HEIC.');
      return;
    }
    setBusy(true);
    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current);
    const url = URL.createObjectURL(file);
    objectUrl.current = url;
    try {
      const img = await loadImage(url);
      setSource(img);
      setZoom(1);
      // Centre it: the middle of a photo is where the subject usually is.
      const w = img.naturalWidth * Math.max(VIEW / img.naturalWidth, VIEW / img.naturalHeight);
      const h = img.naturalHeight * Math.max(VIEW / img.naturalWidth, VIEW / img.naturalHeight);
      setOffset({ x: (VIEW - w) / 2, y: (VIEW - h) / 2 });
    } catch {
      setLocalError(
        'That image could not be opened. If it came from an iPhone, try '
        + 'sharing it as a JPEG, or take a screenshot of it and use that.',
      );
    } finally {
      setBusy(false);
    }
  };

  const save = () => {
    if (!source) return;
    setLocalError(undefined);
    const canvas = document.createElement('canvas');
    canvas.width = OUTPUT;
    canvas.height = OUTPUT;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setLocalError('Your browser could not process that image.'); return; }

    // The visible window maps back onto the source: everything outside it is
    // what the user chose to crop away.
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(
      source,
      -offset.x / effective, -offset.y / effective,
      VIEW / effective, VIEW / effective,
      0, 0, OUTPUT, OUTPUT,
    );

    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    if (valueRef.current) valueRef.current.value = dataUrl;
    setSaved(dataUrl);
    releaseSource();
    setCleared(false);
    formRef.current?.requestSubmit();
  };

  const remove = () => {
    setSaved(null);
    releaseSource();
    setCleared(true);
    if (valueRef.current) valueRef.current.value = 'REMOVE';
    formRef.current?.requestSubmit();
  };

  const showing = saved ?? null;
  const hasAny = Boolean(saved) || (hasImage && !cleared);
  const error = localError ?? state?.fieldErrors?.image ?? state?.error;

  const onPointerDown = (e: React.PointerEvent) => {
    drag.current = { x: e.clientX - offset.x, y: e.clientY - offset.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current) return;
    setOffset(clamp({ x: e.clientX - drag.current.x, y: e.clientY - drag.current.y }));
  };
  const onPointerUp = () => { drag.current = null; };

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <input ref={valueRef} type="hidden" name="image" />

      {source ? (
        <div>
          <p className="text-sm font-semibold">Frame your photo</p>
          <p className="mt-1 text-xs text-ink-muted">
            Drag to move it, and zoom until it looks right. The circle is what
            everyone sees.
          </p>

          <div
            style={{ width: VIEW, height: VIEW }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
            className="relative mt-3 max-w-full cursor-grab touch-none overflow-hidden rounded-lg border border-border-strong bg-ink/5 active:cursor-grabbing"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={source.src}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                left: offset.x,
                top: offset.y,
                width: source.naturalWidth * effective,
                height: source.naturalHeight * effective,
                maxWidth: 'none',
              }}
            />
            {/* The circular mask, drawn over the image so the crop is honest
                about what will be kept. */}
            <div className="pointer-events-none absolute inset-0"
              style={{
                boxShadow: `0 0 0 ${VIEW}px rgba(27,36,48,.55)`,
                borderRadius: '9999px',
              }}
              aria-hidden />
          </div>

          <label className="mt-4 flex items-center gap-3">
            <ZoomIn className="h-4 w-4 shrink-0 text-ink-muted" />
            <span className="sr-only">Zoom</span>
            <input type="range" min={1} max={4} step={0.01} value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-2 w-full max-w-[240px] accent-teal" />
          </label>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="primary" onClick={save} disabled={pending}>
              {pending ? 'Saving…' : 'Save photo'}
            </Button>
            <Button type="button" variant="ghost" onClick={releaseSource}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-4">
          {showing ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={showing} alt=""
              className="h-16 w-16 shrink-0 rounded-full border border-border object-cover" />
          ) : cleared ? (
            <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-teal-tint font-serif text-xl font-semibold text-teal-deep">
              {displayName.charAt(0).toUpperCase()}
            </span>
          ) : (
            <Avatar username={username} name={displayName} size={64} />
          )}

          <div className="min-w-0">
            <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-surface px-4 text-sm font-semibold hover:bg-backdrop">
              {busy
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <Camera className="h-4 w-4" />}
              {busy ? 'Opening…' : pending ? 'Saving…' : hasAny ? 'Change photo' : 'Add a photo'}
              <input type="file" accept="image/*,.heic,.heif" className="sr-only"
                onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ''; }} />
            </label>

            {hasAny && (
              <Button type="button" variant="ghost" size="sm" onClick={remove}
                className="ml-2 text-ink-muted">
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </Button>
            )}

            <p className="mt-1.5 text-xs text-ink-muted">
              {required
                ? 'Required before you can bid — clients skip faceless profiles.'
                : 'Optional, but profiles with a face get more replies.'}
            </p>
          </div>
        </div>
      )}

      {error && <FormError>{error}</FormError>}
    </form>
  );
}

/**
 * Decodes a file through an `<img>`.
 *
 * This is the compatibility path: it applies EXIF orientation, which
 * `createImageBitmap` ignores by default, and it accepts every format the
 * browser can render — including the HEIC that iOS hands over when someone
 * picks a photo from their camera roll.
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      if (img.naturalWidth === 0) reject(new Error('empty image'));
      else resolve(img);
    };
    img.onerror = () => reject(new Error('decode failed'));
    img.src = url;
  });
}
