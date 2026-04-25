import { supabase } from './supabaseClient';
import { assertCity } from './cities';
import type { Business } from './types';

export async function searchBusinesses(
  query: string,
  citySlug: string,
  filters: { category?: string; verifiedOnly?: boolean; womanOwned?: boolean },
): Promise<Business[]> {
  const city = assertCity(citySlug);

  if (!query.trim()) {
    let q = supabase
      .from('businesses')
      .select('*')
      .eq('city', city.name)
      .eq('is_archived', false)
      .order('name');

    if (filters.category) q = q.eq('category', filters.category);
    if (filters.verifiedOnly) q = q.eq('verified', true);
    if (filters.womanOwned) q = q.eq('woman_owned', true);

    const { data, error } = await q;
    if (error) throw new Error(`searchBusinesses failed: ${error.message}`);
    return data as Business[];
  }

  // Combined trigram + tsvector search via RPC
  const { data: rpcData, error: rpcError } = await supabase.rpc('search_businesses', {
    query,
    city_name: city.name,
    category: filters.category ?? null,
    verified_only: filters.verifiedOnly ?? false,
    woman_owned: filters.womanOwned ?? false,
  });

  if (!rpcError) return rpcData as Business[];

  // Fallback: tsvector-only search if RPC is unavailable (pg_trgm not yet enabled)
  let q = supabase
    .from('businesses')
    .select('*')
    .eq('city', city.name)
    .eq('is_archived', false)
    .textSearch('search_vector', query, { type: 'plain', config: 'english' });

  if (filters.category) q = q.eq('category', filters.category);
  if (filters.verifiedOnly) q = q.eq('verified', true);
  if (filters.womanOwned) q = q.eq('woman_owned', true);

  const { data, error } = await q;
  if (error) throw new Error(`searchBusinesses failed: ${error.message}`);
  return data as Business[];
}
