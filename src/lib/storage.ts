import { supabase } from './supabaseClient';

const BUCKET = 'business-logos';
const MAX_BYTES = 2_000_000;
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']);

export async function uploadBusinessLogo(
  file: File,
  businessId: string,
): Promise<{ path: string; publicUrl: string }> {
  if (file.size > MAX_BYTES) {
    throw new Error(`Logo must be under 2 MB (uploaded file is ${(file.size / 1_000_000).toFixed(1)} MB).`);
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error(`Unsupported file type "${file.type}". Allowed: JPEG, PNG, WEBP, SVG.`);
  }

  const ext = file.name.split('.').pop() ?? 'bin';
  const path = `${businessId}/${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { path, publicUrl: data.publicUrl };
}

export function businessLogoUrl(
  storagePath: string | null | undefined,
  opts?: { width?: number; quality?: number },
): string | null {
  if (!storagePath) return null;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);
  const params = new URLSearchParams({ format: 'webp' });
  if (opts?.width != null) params.set('width', String(opts.width));
  if (opts?.quality != null) params.set('quality', String(opts.quality));

  return `${data.publicUrl}?${params.toString()}`;
}
