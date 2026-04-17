export interface CompletenessResult {
  score: number;
  missing: string[];
  complete: string[];
}

const FIELDS: { key: string; label: string; weight: number }[] = [
  { key: 'description',    label: 'Business description', weight: 20 },
  { key: 'logo_url',       label: 'Logo',                 weight: 20 },
  { key: 'hours',          label: 'Business hours',       weight: 15 },
  { key: 'website',        label: 'Website',              weight: 10 },
  { key: 'phone',          label: 'Phone number',         weight: 10 },
  { key: 'address',        label: 'Address',              weight: 10 },
  { key: 'social_instagram', label: 'Instagram',          weight:  5 },
  { key: 'social_facebook',  label: 'Facebook',           weight:  5 },
  { key: 'category',       label: 'Category',             weight:  5 },
];

function isFilled(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true;
}

export function getCompletenessScore(business: Record<string, unknown>): CompletenessResult {
  let score = 0;
  const missing: string[] = [];
  const complete: string[] = [];

  for (const field of FIELDS) {
    if (isFilled(business[field.key])) {
      score += field.weight;
      complete.push(field.label);
    } else {
      missing.push(field.label);
    }
  }

  return { score, missing, complete };
}
