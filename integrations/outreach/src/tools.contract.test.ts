import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { auth } from './auth';
import { config } from './config';
import { provider } from './index';
import baseline from './legacy-schemas.json';

describeMcpCompatibleToolSchemas('Outreach tool input schemas', provider.actions);
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
describe('Outreach established contracts', () => {
  for (const old of baseline)
    it(`preserves ${old.key} input/output fields and enum choices`, () => {
      const action = provider.actions.find(tool => tool.key === old.key);
      expect(action).toBeDefined();
      compatible(old.input, z.toJSONSchema(action!.inputSchema, { unrepresentable: 'any' }));
      compatible(old.output, z.toJSONSchema(action!.outputSchema, { unrepresentable: 'any' }));
    });
  it('retains OAuth, empty configuration, 19 tools and no triggers', () => {
    expect(auth.authStack.map(method => method.key)).toEqual(['oauth']);
    expect(z.toJSONSchema(config.configSchema).properties).toEqual({});
    expect(provider.actions).toHaveLength(19);
    expect(provider.triggerGroups).toHaveLength(0);
    for (const action of provider.actions)
      expect(`outreach-${action.key}`.length).toBeLessThan(60);
  });
  it('keeps compatibility fields with explicit read-only/provider-managed guidance', () => {
    for (const [key, field] of [
      ['manage_template', 'bodyText'],
      ['manage_snippet', 'bodyText'],
      ['manage_opportunity', 'externalSource'],
      ['create_call', 'disposition']
    ]) {
      const schema = z.toJSONSchema(
        provider.actions.find(action => action.key === key)!.inputSchema
      );
      expect(object(object(schema.properties)[field!]).description).toMatch(/deprecated/i);
    }
  });
});
