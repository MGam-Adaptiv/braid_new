const requests = new Map<string, { count: number; resetAt: number }>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 10;  // per IP per minute

export function checkRateLimit(ip: string): { limited: boolean; headers: Record<string, string> } {
  const now = Date.now();
  const entry = requests.get(ip);

  if (!entry || now > entry.resetAt) {
    requests.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { limited: false, headers: { 'X-RateLimit-Remaining': String(MAX_REQUESTS - 1) } };
  }

  entry.count += 1;

  if (entry.count > MAX_REQUESTS) {
    return {
      limited: true,
      headers: {
        'X-RateLimit-Remaining': '0',
        'Retry-After': String(Math.ceil((entry.resetAt - now) / 1000)),
      },
    };
  }

  return { limited: false, headers: { 'X-RateLimit-Remaining': String(MAX_REQUESTS - entry.count) } };
}

export function getClientIp(headers: Record<string, string | undefined>): string {
  return (
    headers['x-nf-client-connection-ip'] ||
    headers['x-forwarded-for']?.split(',')[0].trim() ||
    'unknown'
  );
}
