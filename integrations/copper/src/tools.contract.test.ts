import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { auth } from './auth';
import { config } from './config';
import { provider } from './index';
import baseline from './legacy-schemas.json';

describeMcpCompatibleToolSchemas('Copper tool input schemas', provider.actions);
type Schema = Record<string, unknown>;
const object = (value: unknown): Schema =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Schema) : {};
const compatible = (before: Schema, after: Schema) => {
  for (const key of ['type', 'const'])
    if (before[key] !== undefined) expect(after[key]).toEqual(before[key]);
  if (Array.isArray(before.enum))
    expect(after.enum).toEqual(expect.arrayContaining(before.enum));
  const properties = object(before.properties);
  for (const required of Array.isArray(after.required) ? after.required : [])
    if (Object.hasOwn(properties, String(required)))
      expect(before.required ?? []).toContain(required);
  for (const [key, value] of Object.entries(properties)) {
    expect(Object.hasOwn(object(after.properties), key)).toBe(true);
    compatible(object(value), object(object(after.properties)[key]));
  }
  if (before.items) compatible(object(before.items), object(after.items));
  for (const variant of ['anyOf', 'oneOf', 'allOf'])
    if (Array.isArray(before[variant])) {
      expect(after[variant]).toHaveLength(before[variant].length);
      for (let i = 0; i < before[variant].length; i++)
        compatible(object(before[variant][i]), object((after[variant] as unknown[])[i]));
    }
};
describe('Copper established contracts', () => {
  for (const old of baseline)
    it(`preserves ${old.key} input/output fields`, () => {
      const action = provider.actions.find(tool => tool.key === old.key);
      expect(action).toBeDefined();
      compatible(old.input, z.toJSONSchema(action!.inputSchema, { unrepresentable: 'any' }));
      compatible(old.output, z.toJSONSchema(action!.outputSchema, { unrepresentable: 'any' }));
    });
  it('keeps both distinct auth methods, empty config and 45 tools without triggers', () => {
    expect(auth.authStack.map(method => method.key)).toEqual(['api_key', 'oauth']);
    expect(z.toJSONSchema(config.configSchema).properties).toEqual({});
    expect(provider.actions).toHaveLength(45);
    expect(provider.triggerGroups).toHaveLength(0);
    for (const action of provider.actions)
      expect(`copper-${action.key}`.length).toBeLessThan(60);
  });
});
