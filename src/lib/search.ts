import { supabase } from './supabaseClient';
import { assertCity } from './cities';
import type { Business } from './types';

export async function searchBusinesses(
  query: string,
  citySlug: string,
  filters: { category?: string; verifiedOnly?: boolean; womanOwned?: boolean },
): Promise<Business[]> {
  const city = assertCity(citySlug);

  let q = supabase
    .from('businesses')
    .select('*')
    .eq('city', city.name)
    .eq('is_archived', false);

  if (query.trim()) {
    q = q.textSearch('search_vector', query, { type: 'plain', config: 'english' });
  } else {
    q = q.order('name');
  }

  if (filters.category) q = q.eq('category', filters.category);
  if (filters.verifiedOnly) q = q.eq('verified', true);
  if (filters.womanOwned) q = q.eq('woman_owned', true);

  const { data, error } = await q;
  if (error) throw new Error(`searchBusinesses failed: ${error.message}`);

  return data as Business[];
}
