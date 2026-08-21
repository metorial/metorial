import * as provider from '@slates/provider';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import * as slates from './index';

describe('slates compatibility wrapper', () => {
  it('re-exports the pinned provider implementation and ordinary config contract', () => {
    expect(slates.Slate).toBe(provider.Slate);
    expect(slates.SlateTrigger).toBe(provider.SlateTrigger);
    expect(slates.config).toBe(provider.config);

    let configuration = slates.config(z.object({ endpoint: z.string().url() }));
    expect(
      configuration.configSchema.safeParse({ endpoint: 'https://example.com' }).success
    ).toBe(true);
  });
});
