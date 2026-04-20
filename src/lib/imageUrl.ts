import { supabase } from './supabaseClient';

/**
 * These transform params are processed by Supabase on paid plans and safely ignored on the free tier.
 * Always use this function to render logos instead of raw logo_url strings.
 */
export function businessLogoUrl(
  storagePath: string | null | undefined,
  opts?: { width?: number; height?: number; quality?: number; format?: 'webp' | 'avif' | 'origin' }
): string | null {
  if (!storagePath) return null;

  const { data } = supabase.storage.from('business-logos').getPublicUrl(storagePath);
  const { width = 200, quality = 80, format = 'webp', height } = opts ?? {};

  const params = new URLSearchParams();
  if (width !== undefined) params.set('width', String(width));
  if (height !== undefined) params.set('height', String(height));
  if (quality !== undefined) params.set('quality', String(quality));
  if (format !== undefined) params.set('format', format);

  const query = params.toString();
  return query ? `${data.publicUrl}?${query}` : data.publicUrl;
}
