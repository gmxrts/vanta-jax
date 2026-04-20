export interface Business {
  id: string;
  name: string;
  category: string;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  description: string | null;
  phone: string | null;
  website: string | null;
  verified: boolean;
  featured: boolean | null;
  woman_owned: boolean | null;
  logo_url: string | null;
  business_type: string | null;
  is_address_public: boolean | null;
  public_location_label: string | null;
  service_area: string | null;
  latitude: number | null;
  longitude: number | null;
  is_archived: boolean | null;
}

export type SuggestionStatus = 'pending' | 'approved' | 'rejected';
export type ClaimStatus = 'pending' | 'approved' | 'rejected';

export type CategorySlug =
  | 'food'
  | 'beauty'
  | 'health'
  | 'retail'
  | 'professional'
  | 'creative'
  | 'home'
  | 'education'
  | 'events'
  | 'finance'
  | 'technology'
  | 'nonprofit'
  | 'other';

export interface Category {
  slug: CategorySlug;
  label: string;
  icon_slug: string | null;
  sort_order: number;
}
