import { describe, expect, it } from 'vitest';
import z from 'zod';
import { configV2 } from './config';
import { compileConfigRedactionPolicy, redactConfigDenyByDefault } from './redaction';

describe('config redaction policy', () => {
  let config = configV2({
    fields: {
      endpoint: { schema: z.string(), visibility: 'plain', lifecycle: 'none' },
      signingMaterial: {
        schema: z.string(),
        visibility: 'secret',
        lifecycle: 'projection'
      }
    }
  });
  let policy = compileConfigRedactionPolicy(
    config.wireSchema?.version === 2 ? config.wireSchema : null
  );

  it('projects secret presence while retaining declared plain values', () => {
    expect(
      policy.projectPresence({
        endpoint: 'https://example.com',
        signingMaterial: 'sentinel',
        undeclared: 'drop-me'
      })
    ).toEqual({
      endpoint: 'https://example.com',
      signingMaterial: { configured: true }
    });
  });

  it('redacts nested classified artifacts and error causes', () => {
    let cause = new Error('nested');
    (cause as Error & { cause?: unknown }).cause = { invocationGrant: 'grant-value' };
    let redacted = policy.redact({
      arrays: [{ encryptedValue: 'ciphertext' }],
      cause
    }) as any;
    expect(redacted.arrays[0].encryptedValue).toBe('[redacted]');
    expect(redacted.cause.cause.invocationGrant).toBe('[redacted]');
    expect(
      policy.redact({ nested: { endpoint: 'safe', signingMaterial: 'sentinel' } })
    ).toEqual({ nested: { endpoint: 'safe', signingMaterial: { configured: true } } });
  });

  it('deep-freezes the canonical descriptor snapshot', () => {
    let field = { schema: z.string(), visibility: 'plain', lifecycle: 'none' } as const;
    let frozen = configV2({ fields: { endpoint: field } });
    let wire = frozen.wireSchema!;
    let hash = wire.version === 2 ? wire.hash : '';

    expect(Object.isFrozen(wire)).toBe(true);
    expect(Object.isFrozen(wire.jsonSchema)).toBe(true);
    expect(Object.isFrozen(wire.version === 2 ? wire.fields.endpoint : null)).toBe(true);
    expect(() => ((wire as any).hash = '0'.repeat(64))).toThrow();
    expect(frozen.wireSchema?.version === 2 && frozen.wireSchema.hash).toBe(hash);
  });

  it('fails closed for missing/stale schemas', () => {
    expect(redactConfigDenyByDefault({ unknown: 'secret' })).toEqual({});
    expect(
      compileConfigRedactionPolicy({
        ...config.wireSchema!,
        hash: 'stale'
      } as any).projectPresence({ endpoint: 'drop' })
    ).toEqual({});
  });

  it('rejects provider attempts to return classified config fields', () => {
    expect(() => policy.assertProviderOutput({ signingMaterial: 'sentinel' })).toThrow(
      /classified config fields/
    );
    expect(() => policy.assertProviderOutput({ endpoint: 'safe' })).not.toThrow();
  });
});
