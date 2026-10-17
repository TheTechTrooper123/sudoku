import { describe, expect, it } from 'vitest';
import { bannedIps, isBannedIp } from '../server/lib/access.ts';

describe('ban list', () => {
  it('parses a comma separated list and ignores blanks', () => {
    const env = { BANNED_IPS: ' 203.0.113.9 , 198.51.100.* ,, ' } as NodeJS.ProcessEnv;
    expect(bannedIps(env)).toEqual(['203.0.113.9', '198.51.100.*']);
  });

  it('is empty when the variable is unset', () => {
    expect(bannedIps({} as NodeJS.ProcessEnv)).toEqual([]);
  });

  it('matches an exact IP', () => {
    expect(isBannedIp('203.0.113.9', ['203.0.113.9'])).toBe(true);
    expect(isBannedIp('203.0.113.10', ['203.0.113.9'])).toBe(false);
  });

  it('matches a prefix wildcard', () => {
    expect(isBannedIp('198.51.100.42', ['198.51.100.*'])).toBe(true);
    expect(isBannedIp('198.51.101.42', ['198.51.100.*'])).toBe(false);
  });

  it('never matches an empty address', () => {
    expect(isBannedIp('', ['*'])).toBe(false);
  });
});
