import { describe, expect, it, vi } from 'vitest';
import z from 'zod';

let { metricAdd } = vi.hoisted(() => ({ metricAdd: vi.fn() }));
vi.mock('@opentelemetry/api', () => ({
  metrics: {
    getMeter: () => ({ createCounter: () => ({ add: metricAdd }) })
  }
}));

import { configV1Compatibility, configV2 } from './config';

describe('configV2 declarations', () => {
  it('creates a canonical ordered v2 descriptor map and strict runtime schema', () => {
    let config = configV2({
      fields: {
        secret: { schema: z.string(), visibility: 'secret', lifecycle: 'reregister' },
        endpoint: { schema: z.string().url(), visibility: 'plain', lifecycle: 'none' }
      }
    });
    expect(config.wireSchema).toMatchObject({
      version: 2,
      hash: expect.stringMatching(/^[a-f0-9]{64}$/),
      fieldOrder: ['endpoint', 'secret'],
      fields: {
        endpoint: { visibility: 'plain', lifecycle: 'none' },
        secret: { visibility: 'secret', lifecycle: 'reregister' }
      }
    });
    expect(() =>
      config.configSchema.parse({ endpoint: 'https://example.com', secret: 'x', extra: 1 })
    ).toThrow();
    expect(
      config.providerConfigSchema.parse({
        endpoint: 'https://example.com',
        secret: { configured: true }
      })
    ).toEqual({ endpoint: 'https://example.com', secret: { configured: true } });
  });

  it('round-trips the explicit empty declaration', () => {
    let config = configV2({ fields: {} });
    expect(config.wireSchema).toMatchObject({ version: 2, fieldOrder: [], fields: {} });
    expect(config.configSchema.parse({})).toEqual({});
  });

  it('hashes independently of object key order while preserving descriptor changes', () => {
    let first = configV2({
      fields: {
        b: { schema: z.string(), visibility: 'plain', lifecycle: 'none' },
        a: { schema: z.string(), visibility: 'secret', lifecycle: 'renew' }
      }
    });
    let reordered = configV2({
      fields: {
        a: { schema: z.string(), visibility: 'secret', lifecycle: 'renew' },
        b: { schema: z.string(), visibility: 'plain', lifecycle: 'none' }
      }
    });
    let changed = configV2({
      fields: {
        a: { schema: z.string(), visibility: 'secret', lifecycle: 'reregister' },
        b: { schema: z.string(), visibility: 'plain', lifecycle: 'none' }
      }
    });
    expect(first.wireSchema?.version).toBe(2);
    expect(reordered.wireSchema?.version).toBe(2);
    expect(changed.wireSchema?.version).toBe(2);
    if (
      first.wireSchema?.version !== 2 ||
      reordered.wireSchema?.version !== 2 ||
      changed.wireSchema?.version !== 2
    ) {
      throw new Error('Expected config schema v2');
    }
    expect(first.wireSchema.hash).toBe(reordered.wireSchema.hash);
    expect(first.wireSchema.hash).not.toBe(changed.wireSchema.hash);
  });

  it('rejects missing or extra classifications at compile/runtime boundaries', () => {
    expect(() =>
      configV2({
        fields: {
          bad: { schema: z.string(), visibility: 'plain' } as any
        }
      })
    ).toThrow(/lifecycle/);
    expect(() =>
      configV2({
        fields: {
          bad: {
            schema: z.string(),
            visibility: 'classified' as any,
            lifecycle: 'none'
          }
        }
      })
    ).toThrow(/visibility/);
  });

  it('timeboxes v1 compatibility and emits migration telemetry', () => {
    configV1Compatibility({
      schema: z.looseObject({}),
      compatibility: {
        integrationId: 'looker',
        owner: 'team',
        expiresAt: '2099-02-01T00:00:00.000Z',
        cutoffAt: '2099-01-01T00:00:00.000Z'
      }
    });
    expect(metricAdd).toHaveBeenCalledWith(1, {
      'slates.integration.id': 'looker',
      'slates.config.schema.version': 1
    });
    expect(() =>
      configV1Compatibility({
        schema: z.looseObject({}),
        compatibility: {
          integrationId: 'tableau',
          owner: 'team',
          expiresAt: '2001-02-01T00:00:00.000Z',
          cutoffAt: '2001-01-01T00:00:00.000Z'
        }
      })
    ).toThrow(/expired/);
    expect(() =>
      configV1Compatibility({
        schema: z.looseObject({}),
        compatibility: {
          integrationId: 'other' as any,
          owner: 'team',
          expiresAt: '2099-02-01T00:00:00.000Z',
          cutoffAt: '2099-01-01T00:00:00.000Z'
        }
      })
    ).toThrow(/Only Looker and Tableau/);
  });
});
