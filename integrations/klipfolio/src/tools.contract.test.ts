import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { auth } from './auth';
import { config } from './config';
import { provider } from './index';
import baseline from './legacy-schemas.json';

describeMcpCompatibleToolSchemas('Klipfolio tool input schemas', provider.actions);
type Schema = Record<string, unknown>;
const object = (value: unknown): Schema =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Schema) : {};
const compatible = (before: Schema, after: Schema) => {
  for (const key of ['type', 'const'])
    if (before[key] !== undefined) expect(after[key]).toEqual(before[key]);
  if (Array.isArray(before.enum))
    expect(after.enum).toEqual(expect.arrayContaining(before.enum));
  const oldRequired = Array.isArray(before.required) ? before.required : [];
  const properties = object(before.properties);
  for (const required of Array.isArray(after.required) ? after.required : [])
    if (Object.hasOwn(properties, String(required))) expect(oldRequired).toContain(required);
  for (const [key, value] of Object.entries(properties)) {
    expect(Object.hasOwn(object(after.properties), key)).toBe(true);
    compatible(object(value), object(object(after.properties)[key]));
  }
  if (before.items) compatible(object(before.items), object(after.items));
  if (before.additionalProperties && typeof before.additionalProperties === 'object')
    compatible(object(before.additionalProperties), object(after.additionalProperties));
};
describe('Klipfolio established contracts', () => {
  for (const old of baseline)
    it(`preserves ${old.key} input/output fields`, () => {
      const action = provider.actions.find(tool => tool.key === old.key);
      expect(action).toBeDefined();
      compatible(old.input, z.toJSONSchema(action!.inputSchema));
      compatible(old.output, z.toJSONSchema(action!.outputSchema));
    });
  it('keeps API key authentication, empty config and all 26 tools', () => {
    expect(auth.authStack.map(method => method.key)).toEqual(['api_key']);
    expect(z.toJSONSchema(auth.outputSchema).required).toEqual(['token']);
    expect(z.toJSONSchema(config.configSchema).properties).toEqual({});
    expect(provider.actions).toHaveLength(26);
    expect(provider.triggerGroups).toHaveLength(0);
    for (const action of provider.actions)
      expect(`klipfolio-${action.key}`.length).toBeLessThan(60);
  });
  it('retains deprecated inline data and the current file download', () => {
    const old = provider.actions.find(tool => tool.key === 'get_datasource_instance_data');
    expect(old?.tags?.deprecated).toBe(true);
    expect(old?.description).toMatch(/^DEPRECATED/);
    const current = provider.actions.find(
      tool => tool.key === 'download_datasource_instance_data'
    );
    expect(current).toBeDefined();
    const schema = z.toJSONSchema(current!.outputSchema);
    expect(schema.properties).not.toHaveProperty('rows');
    expect(schema.properties).not.toHaveProperty('data');
    expect(schema.properties).not.toHaveProperty('content');
  });
});
