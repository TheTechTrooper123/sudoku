/**
 * Abuse protection: a manual IP block list plus a short log line for
 * *suspicious* traffic only.
 *
 * Nothing is stored by this module. Normal visitors are never logged; only
 * requests that are blocked or that trip the rate limiter produce a log line.
 * Those lines end up in the hosting provider's runtime logs (Vercel: Project →
 * Logs), where the operator can spot an offending IP and add it to the
 * `BANNED_IPS` environment variable to block it for good.
 *
 * `BANNED_IPS` is a comma separated list. An entry is either an exact IP or a
 * prefix ending in `*`, e.g. `203.0.113.9,198.51.100.*`.
 */

export type AbuseReason = 'banned' | 'rate-limit';

/** Parses the `BANNED_IPS` environment variable into a clean list. */
export function bannedIps(env: NodeJS.ProcessEnv = process.env): string[] {
  return (env.BANNED_IPS ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

/** True when `ip` matches the block list (exact IP or `prefix*`). */
export function isBannedIp(ip: string, list: string[] = bannedIps()): boolean {
  if (!ip) return false;
  for (const pattern of list) {
    if (pattern.endsWith('*')) {
      if (ip.startsWith(pattern.slice(0, -1))) return true;
    } else if (pattern === ip) {
      return true;
    }
  }
  return false;
}

export interface AbuseDetails {
  method?: string;
  url?: string;
  userAgent?: string;
}

/**
 * Writes one structured line about a suspicious request to the runtime log.
 * Deliberately terse: enough to identify and ban the source, nothing more.
 */
export function logAbuse(reason: AbuseReason, ip: string, details: AbuseDetails = {}): void {
  const ua = (details.userAgent ?? '-').slice(0, 160);
  console.warn(
    `[abuse] reason=${reason} ip=${ip} method=${details.method ?? '-'} path=${details.url ?? '-'} ua="${ua}"`,
  );
}
