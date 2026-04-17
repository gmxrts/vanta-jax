import { supabase } from './supabaseClient';

export type UserRole = 'user' | 'owner' | 'admin';

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: UserRole;
}

export async function getCurrentProfile(): Promise<Profile | null> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', user.id)
    .single();

  if (error || !data) return null;
  return data as Profile;
}

export async function isAdmin(): Promise<boolean> {
  const profile = await getCurrentProfile();
  return profile?.role === 'admin';
}

export async function requireAdmin(request: Request): Promise<boolean> {
  const url = new URL(request.url);
  const keyParam = url.searchParams.get('key');
  const adminKey = import.meta.env.ADMIN_ACCESS_KEY;

  if (adminKey && keyParam === adminKey) return true;
  return isAdmin();
}
