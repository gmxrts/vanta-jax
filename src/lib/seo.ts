const categoryLabels: Record<string, string> = {
  food: 'Food & Dining',
  retail: 'Retail',
  services: 'Services',
  health: 'Health & Wellness',
  nonprofit: 'Nonprofit',
  other: 'Business',
};

export interface BusinessSeoInput {
  name: string;
  category: string;
  city: string;
  state: string;
  description: string | null;
  logo_url: string | null;
  id: string;
}

export interface BusinessMeta {
  title: string;
  description: string;
  canonicalUrl: string;
  ogImage: string;
  jsonLd: object;
}

export function buildBusinessMeta(business: BusinessSeoInput): BusinessMeta {
  const categoryLabel = categoryLabels[business.category] ?? 'Business';

  const title = `${business.name} — Black-Owned ${categoryLabel} in ${business.city}, ${business.state} | VantaJax`;

  const description = business.description
    ? business.description
    : `Discover ${business.name}, a verified Black-owned business in ${business.city}, ${business.state}.`;

  const canonicalUrl = `https://vantajax.com/businesses/${business.id}`;

  const ogImage = business.logo_url || `/api/og/${business.id}`;

  const jsonLd: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: business.name,
    description,
    url: canonicalUrl,
  };

  if (business.logo_url) jsonLd.image = business.logo_url;

  if (business.city || business.state) {
    jsonLd.address = {
      '@type': 'PostalAddress',
      ...(business.city ? { addressLocality: business.city } : {}),
      ...(business.state ? { addressRegion: business.state } : {}),
    };
  }

  return { title, description, canonicalUrl, ogImage, jsonLd };
}
