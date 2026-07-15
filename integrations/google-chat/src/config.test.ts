import { describe, expect, it } from 'vitest';
import { googleChatConfigSchema } from './config';

describe('google-chat config', () => {
  it('accepts no default space and normalizes a configured value', () => {
    expect(googleChatConfigSchema.parse({})).toEqual({});
    expect(googleChatConfigSchema.parse({ defaultSpace: ' spaces/AAAA ' })).toEqual({
      defaultSpace: 'spaces/AAAA'
    });
  });

  it('rejects an empty configured default space', () => {
    expect(googleChatConfigSchema.safeParse({ defaultSpace: '   ' }).success).toBe(false);
  });
});
