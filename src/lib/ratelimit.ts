import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

function buildLimiters() {
  const url = import.meta.env.UPSTASH_REDIS_URL;
  const token = import.meta.env.UPSTASH_REDIS_TOKEN;
  if (!url || !token) return null;

  const redis = new Redis({ url, token });
  return {
    suggestion: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 h'),  prefix: 'rl:suggestion' }),
    view:       new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), prefix: 'rl:view' }),
    claim:      new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '24 h'), prefix: 'rl:claim' }),
  };
}

export const limiters = buildLimiters();

export async function checkRateLimit(
  limiter: Ratelimit | undefined,
  request: Request
): Promise<{ allowed: boolean; remaining: number }> {
  if (!limiter) return { allowed: true, remaining: 999 };

  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : (request.headers.get('x-real-ip') ?? '127.0.0.1');

  const result = await limiter.limit(ip);
  return { allowed: result.success, remaining: result.remaining };
}
