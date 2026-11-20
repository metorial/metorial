import { describe, expect, it } from 'vitest';
import { assertNewPageToken, rememberPageToken } from './index';

describe('page token guards', () => {
  it('remembers each token once', () => {
    let seen = new Set<string>();
    expect(rememberPageToken(seen, 'a')).toBe(true);
    expect(rememberPageToken(seen, 'b')).toBe(true);
    expect(rememberPageToken(seen, 'a')).toBe(false);
  });

  it('throws the caller error only for a repeated token', () => {
    let seen = new Set<string>(['start']);
    let repeated = () => new Error('repeated');
    expect(() => assertNewPageToken(seen, undefined, repeated)).not.toThrow();
    expect(() => assertNewPageToken(seen, '', repeated)).not.toThrow();
    expect(() => assertNewPageToken(seen, 'next', repeated)).not.toThrow();
    expect(() => assertNewPageToken(seen, 'next', repeated)).toThrow('repeated');
    expect(() => assertNewPageToken(seen, 'start', repeated)).toThrow('repeated');
  });
});
