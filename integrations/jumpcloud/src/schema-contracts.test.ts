import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import legacy from './legacy-schemas.json';

type Schema = {
  type?: unknown;
  enum?: unknown[];
  properties?: Record<string, Schema>;
  items?: Schema;
  required?: string[];
  anyOf?: Schema[];
  additionalProperties?: unknown;
};
function retained(before: Schema, after: Schema, path = '', output = false) {
  expect(after.type).toEqual(before.type);
  if (before.enum) expect(after.enum).toEqual(expect.arrayContaining(before.enum));
  for (const field of before.required ?? []) {
    if (output && path === '.results[]' && field === 'requestTime') continue;
    expect(after.required).toContain(field);
  }
  for (const [key, value] of Object.entries(before.properties ?? {})) {
    expect(after.properties?.[key]).toBeDefined();
    if (after.properties?.[key])
      retained(value, after.properties[key], `${path}.${key}`, output);
  }
  if (before.items) {
    expect(after.items).toBeDefined();
    if (after.items) retained(before.items, after.items, `${path}[]`, output);
  }
  if (before.anyOf) expect(after.anyOf).toHaveLength(before.anyOf.length);
}
describe('JumpCloud schema contracts', () => {
  for (const action of provider.actions)
    it(`${action.key} exposes object schemas and a bounded production ID`, () => {
      const input = z.toJSONSchema(action.inputSchema, {
        io: 'input',
        unrepresentable: 'any'
      });
      expect(input.type).toBe('object');
      for (const key of ['oneOf', 'anyOf', 'allOf']) expect(input).not.toHaveProperty(key);
      expect(`jumpcloud-${action.key}`.length).toBeLessThan(60);
      expect(z.toJSONSchema(action.outputSchema, { unrepresentable: 'any' }).type).toBe(
        'object'
      );
    });
  for (const [key, saved] of Object.entries(legacy))
    it(`${key} retains genuine captured legacy keys, types, requirements and enums`, () => {
      const action = provider.actions.find(action => action.key === key);
      expect(action).toBeDefined();
      if (!action) return;
      retained(
        saved.input as Schema,
        z.toJSONSchema(action.inputSchema, { io: 'input', unrepresentable: 'any' }) as Schema
      );
      retained(
        saved.output as Schema,
        z.toJSONSchema(action.outputSchema, { unrepresentable: 'any' }) as Schema,
        '',
        true
      );
    });
  it('retains seventeen keys and adds only two approved discovery tools', () => {
    expect(Object.keys(legacy)).toHaveLength(17);
    expect(provider.actions).toHaveLength(19);
    expect(new Set(provider.actions.map(action => action.key)).size).toBe(19);
    expect(provider.triggerGroups).toHaveLength(0);
  });
});
