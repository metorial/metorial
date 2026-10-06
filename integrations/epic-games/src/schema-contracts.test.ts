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
function retained(before: Schema, after: Schema, path = '') {
  if (path.endsWith('.displayName') && before.type === 'string' && after.anyOf)
    expect(after.anyOf.map(item => item.type)).toEqual(['string', 'null']);
  else expect(after.type).toEqual(before.type);
  if (before.enum) expect(after.enum).toEqual(expect.arrayContaining(before.enum));
  if (before.properties)
    for (const [key, value] of Object.entries(before.properties)) {
      const next = after.properties?.[key];
      expect(next).toBeDefined();
      if (next) retained(value, next, `${path}.${key}`);
    }
  if (before.items) {
    expect(after.items).toBeDefined();
    if (after.items) retained(before.items, after.items, `${path}[]`);
  }
  if (before.anyOf) expect(after.anyOf).toHaveLength(before.anyOf.length);
}
describe('Epic Games schema contracts', () => {
  for (const action of provider.actions)
    it(`${action.key} exposes object schemas and a bounded ID`, () => {
      const input = z.toJSONSchema(action.inputSchema, {
        io: 'input',
        unrepresentable: 'any'
      });
      expect(input.type).toBe('object');
      for (const key of ['oneOf', 'anyOf', 'allOf']) expect(input).not.toHaveProperty(key);
      expect(`epic-games-${action.key}`.length).toBeLessThan(60);
      expect(z.toJSONSchema(action.outputSchema, { unrepresentable: 'any' }).type).toBe(
        'object'
      );
    });
  for (const [key, saved] of Object.entries(legacy))
    it(`${key} retains genuine legacy keys, types and enum values`, () => {
      const action = provider.actions.find(action => action.key === key);
      expect(action).toBeDefined();
      if (!action) return;
      retained(
        saved.input as Schema,
        z.toJSONSchema(action.inputSchema, { io: 'input', unrepresentable: 'any' }) as Schema
      );
      retained(
        saved.output as Schema,
        z.toJSONSchema(action.outputSchema, { unrepresentable: 'any' }) as Schema
      );
    });
  it('retains twelve legacy tools and adds only the documented context read', () => {
    expect(Object.keys(legacy)).toHaveLength(12);
    expect(provider.actions).toHaveLength(13);
    expect(new Set(provider.actions.map(action => action.key)).size).toBe(13);
    expect(provider.triggerGroups).toHaveLength(0);
  });
});
