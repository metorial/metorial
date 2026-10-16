import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import legacySchemas from './legacy-tiktok-schemas.json';

describe('Adyntel numeric TikTok detail deprecation contract', () => {
  it('retains the old tool and points to the string-ID replacement', () => {
    let legacy = provider.actions.find(action => action.key === 'get_tiktok_ad_details');
    expect(legacy?.tags).toMatchObject({ readOnly: true, deprecated: true });
    expect(legacy?.description?.startsWith('DEPRECATED — use `get_tiktok_ad` instead.')).toBe(
      true
    );
    expect(
      legacy?.instructions?.some(instruction => instruction.includes('get_tiktok_ad'))
    ).toBe(true);
    expect(provider.actions.some(action => action.key === 'get_tiktok_ad')).toBe(true);
  });

  it('preserves the complete input and output schemas from the refresh baseline', () => {
    let legacy = provider.actions.find(action => action.key === 'get_tiktok_ad_details');
    expect(legacy).toBeDefined();
    if (!legacy) return;
    expect(z.toJSONSchema(legacy.inputSchema, { unrepresentable: 'any' })).toEqual(
      legacySchemas.input
    );
    expect(z.toJSONSchema(legacy.outputSchema, { unrepresentable: 'any' })).toEqual(
      legacySchemas.output
    );
  });

  it('preserves the original legacy handler without invoking the provider', () => {
    let source = readFileSync(
      new URL('./tools/get-tiktok-ad-details.ts', import.meta.url),
      'utf8'
    );
    let handler = source.slice(source.indexOf('  .handleInvocation'));
    // Baseline c455f13e5899b077e59260226c1c56dd9e41c158.
    expect(createHash('sha256').update(handler).digest('hex')).toBe(
      '74287d641ff98d5bae82862c08996c48c76aaebd2f559ab1dec55ac9130c620f'
    );
  });
});
