import { supabase } from './supabaseClient';
import type { Category } from './types';

let cache: Category[] | null = null;

export async function getCategories(): Promise<Category[]> {
  if (cache) return cache;

  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .order('sort_order');

  if (error) throw error;

  cache = data as Category[];
  return cache;
}
