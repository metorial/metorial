import { describe, expect, it } from 'vitest';
import { computeSlateConfigSchemaV2Hash, slateConfigSchemaWire } from './config';

let withCanonicalHash = <
  Schema extends {
    version: 2;
    fieldOrder: string[];
    fields: Record<string, unknown>;
    jsonSchema: Record<string, unknown>;
  }
>(
  schema: Schema
) => ({ ...schema, hash: computeSlateConfigSchemaV2Hash(schema) });

describe('SlateConfig schema wire', () => {
  it('round-trips explicit-empty v2 and exact classifications', () => {
    let empty = withCanonicalHash({
      version: 2 as const,
      fieldOrder: [],
      fields: {},
      jsonSchema: { type: 'object', properties: {}, additionalProperties: false }
    });
    expect(slateConfigSchemaWire.parse(empty)).toEqual(empty);
    let classified = withCanonicalHash({
      ...empty,
      fieldOrder: ['plain', 'secret'],
      fields: {
        plain: { visibility: 'plain' as const, lifecycle: 'none' as const },
        secret: { visibility: 'secret' as const, lifecycle: 'reregister' as const }
      }
    });
    expect(slateConfigSchemaWire.parse(classified)).toEqual(classified);
  });

  it('rejects noncanonical order and incomplete/extra descriptors', () => {
    let base = withCanonicalHash({
      version: 2,
      fieldOrder: ['b', 'a'],
      fields: {
        a: { visibility: 'plain', lifecycle: 'none' },
        b: { visibility: 'secret', lifecycle: 'renew' }
      },
      jsonSchema: {}
    } as const);
    expect(slateConfigSchemaWire.safeParse(base).success).toBe(false);
    expect(
      slateConfigSchemaWire.safeParse({
        ...base,
        fieldOrder: ['a', 'b'],
        fields: { a: { visibility: 'plain' } }
      }).success
    ).toBe(false);
    expect(
      slateConfigSchemaWire.safeParse({
        ...base,
        fieldOrder: ['a'],
        fields: {
          a: { visibility: 'plain', lifecycle: 'none', secret: true }
        }
      }).success
    ).toBe(false);
  });

  it('rejects a fabricated or stale descriptor hash', () => {
    let valid = withCanonicalHash({
      version: 2 as const,
      fieldOrder: ['token'],
      fields: { token: { visibility: 'secret', lifecycle: 'renew' } },
      jsonSchema: { type: 'object', properties: { token: { type: 'string' } } }
    });
    expect(slateConfigSchemaWire.parse(valid)).toEqual(valid);
    expect(slateConfigSchemaWire.safeParse({ ...valid, hash: '0'.repeat(64) }).success).toBe(
      false
    );
    expect(
      slateConfigSchemaWire.safeParse({
        ...valid,
        fields: { token: { visibility: 'secret', lifecycle: 'reregister' } }
      }).success
    ).toBe(false);
  });
});
