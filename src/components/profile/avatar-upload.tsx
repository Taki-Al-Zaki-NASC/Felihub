'use client';

import * as React from 'react';
import { useActionState } from 'react';
import { Camera, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormError } from '@/components/ui/field';
import { saveAvatarAction } from '@/server/actions/avatar';
import type { FormResult } from '@/server/actions/profile';

/**
 * Downscales in the browser before upload.
 *
 * A phone camera produces 3–8 MB; the profile renders it at 64px. Sending the
 * original wastes the user's data allowance on an image nobody will ever see
 * at that size — and on a slow connection it is the difference between the
 * upload working and it timing out.
 */
async function downscale(file: File, size = 256): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(size / bitmap.width, size / bitmap.height, 1);
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Your browser could not process that image.');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  return canvas.toDataURL('image/jpeg', 0.82);
}

export function AvatarUpload({
  image, displayName, required,
}: {
  image: string | null;
  displayName: string;
  required?: boolean;
}) {
  const [state, action, pending] = useActionState<FormResult | null, FormData>(
    saveAvatarAction, null,
  );
  const [preview, setPreview] = React.useState(image);
  const [localError, setLocalError] = React.useState<string>();
  const formRef = React.useRef<HTMLFormElement>(null);
  const valueRef = React.useRef<HTMLInputElement>(null);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    setLocalError(undefined);
    if (!file.type.startsWith('image/')) {
      setLocalError('Choose an image file.');
      return;
    }
    try {
      const dataUrl = await downscale(file);
      setPreview(dataUrl);
      if (valueRef.current) valueRef.current.value = dataUrl;
      formRef.current?.requestSubmit();
    } catch (e) {
      console.error('avatar downscale failed', e);
      setLocalError('That image could not be read. Try a JPEG or PNG.');
    }
  };

  const remove = () => {
    setPreview(null);
    if (valueRef.current) valueRef.current.value = 'REMOVE';
    formRef.current?.requestSubmit();
  };

  const error = localError ?? state?.fieldErrors?.image ?? state?.error;

  return (
    <form ref={formRef} action={action} className="space-y-3">
      <input ref={valueRef} type="hidden" name="image" />

      <div className="flex items-center gap-4">
        {preview ? (
          // Deliberately not next/image: this is a data URL, already sized at
          // 256px, and the optimiser has nothing to add to it.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt=""
            className="h-16 w-16 shrink-0 rounded-full border border-border object-cover" />
        ) : (
          <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-teal-tint font-serif text-xl font-semibold text-teal-deep">
            {displayName.charAt(0).toUpperCase()}
          </span>
        )}

        <div className="min-w-0">
          <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-2 rounded-md border border-border-strong bg-surface px-4 text-sm font-semibold hover:bg-backdrop">
            <Camera className="h-4 w-4" />
            {pending ? 'Saving…' : preview ? 'Change photo' : 'Add a photo'}
            <input type="file" accept="image/*" className="sr-only"
              onChange={(e) => pick(e.target.files?.[0])} />
          </label>

          {preview && (
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

      {error && <FormError>{error}</FormError>}
    </form>
  );
}
