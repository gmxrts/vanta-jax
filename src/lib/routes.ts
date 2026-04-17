export const routes = {
  home:            '/',
  businesses:      '/businesses',
  business:        (id: string) => `/businesses/${id}`,
  claim:           (id: string) => `/claim/${id}`,
  suggestBusiness: '/suggest-business',
  login:           '/login',
  dashboard:       '/dashboard',
  admin:           '/admin',
  metrics:         '/metrics',
  about:           '/about',
  terms:           '/terms',
  privacy:         '/privacy',
} as const;
