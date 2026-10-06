import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import legacy from './legacy-schemas.json';

type Schema = {
  type?: unknown;
  enum?: unknown[];
  properties?: Record<string, Schema>;
  items?: Schema;
  anyOf?: Schema[];
  required?: string[];
};
function retained(before: Schema, after: Schema) {
  expect(after.type).toEqual(before.type);
  if (before.enum) expect(after.enum).toEqual(expect.arrayContaining(before.enum));
  if (before.properties)
    for (const [key, value] of Object.entries(before.properties)) {
      expect(after.properties).toHaveProperty(key);
      retained(value, after.properties![key]!);
    }
  if (before.items) retained(before.items, after.items!);
  if (before.anyOf) expect(after.anyOf).toHaveLength(before.anyOf.length);
}
describe('Aircall schema contracts', () => {
  for (const action of provider.actions) {
    it(`${action.key} exposes bounded object schemas and ID`, () => {
      const input = z.toJSONSchema(action.inputSchema, {
        io: 'input',
        unrepresentable: 'any'
      }) as Schema;
      expect(input.type).toBe('object');
      for (const key of ['oneOf', 'anyOf', 'allOf']) expect(input).not.toHaveProperty(key);
      expect(`aircall-${action.key}`.length).toBeLessThan(60);
      expect(z.toJSONSchema(action.outputSchema, { unrepresentable: 'any' }).type).toBe(
        'object'
      );
    });
  }
  for (const [key, saved] of Object.entries(legacy)) {
    it(`${key} retains genuine legacy field types and enum values`, () => {
      const action = provider.actions.find(a => a.key === key)!;
      expect(action).toBeDefined();
      retained(
        saved.input as Schema,
        z.toJSONSchema(action.inputSchema, { io: 'input', unrepresentable: 'any' }) as Schema
      );
      retained(
        saved.output as Schema,
        z.toJSONSchema(action.outputSchema, { unrepresentable: 'any' }) as Schema
      );
    });
  }
  it('retains fourteen legacy keys, seventeen public keys and one reserved renewal key', () => {
    expect(Object.keys(legacy)).toHaveLength(14);
    expect(provider.actions).toHaveLength(18);
    expect(provider.actions.filter(a => !a.key.startsWith('metorial$'))).toHaveLength(17);
    expect(provider.triggerGroups).toHaveLength(0);
  });
  it('supports safe legacy and exact call identifiers without top-level unions', () => {
    const schema = provider.actions.find(a => a.key === 'get_call')!.inputSchema;
    expect(schema.safeParse({ callId: 12 }).success).toBe(true);
    expect(schema.safeParse({ callIdExact: '9007199254740993' }).success).toBe(true);
  });
});
