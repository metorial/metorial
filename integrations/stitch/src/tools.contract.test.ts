import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { auth } from './auth';
import { config } from './config';
import { provider } from './index';
import baseline from './legacy-schemas.json';

describeMcpCompatibleToolSchemas('Stitch tool schemas', provider.actions);
type Schema = Record<string, unknown>;
const object = (value: unknown): Schema =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Schema) : {};
const compatible = (before: Schema, after: Schema) => {
  for (const key of ['type', 'const'])
    if (before[key] !== undefined) expect(after[key]).toEqual(before[key]);
  if (Array.isArray(before.enum))
    expect(after.enum).toEqual(expect.arrayContaining(before.enum));
  const fields = object(before.properties);
  for (const key of Array.isArray(after.required) ? after.required : [])
    expect(Array.isArray(before.required) ? before.required : []).toContain(key);
  if (Array.isArray(before.anyOf)) {
    expect(Array.isArray(after.anyOf)).toBe(true);
    for (const branch of before.anyOf)
      expect(
        (Array.isArray(after.anyOf) ? after.anyOf : []).some(candidate => {
          try {
            compatible(object(branch), object(candidate));
            return true;
          } catch {
            return false;
          }
        })
      ).toBe(true);
  }
  for (const [key, value] of Object.entries(fields)) {
    expect(Object.hasOwn(object(after.properties), key)).toBe(true);
    compatible(object(value), object(object(after.properties)[key]));
  }
  if (before.items) compatible(object(before.items), object(after.items));
  if (before.additionalProperties && typeof before.additionalProperties === 'object')
    compatible(object(before.additionalProperties), object(after.additionalProperties));
};
describe('Established Stitch contracts', () => {
  for (const entry of baseline)
    it(`preserves ${entry.key} schemas`, () => {
      const tool = provider.actions.find(item => item.key === entry.key);
      expect(tool).toBeDefined();
      compatible(entry.input, z.toJSONSchema(tool!.inputSchema));
      compatible(entry.output, z.toJSONSchema(tool!.outputSchema));
    });
  it('retains token auth and separate optional Import credentials', () => {
    expect(auth.authStack.map(method => method.key)).toContain('api_token');
    const schema = z.toJSONSchema(auth.outputSchema);
    expect(schema.required).toEqual(['token']);
    expect(schema.properties?.importToken).toMatchObject({ type: 'string' });
  });
  it('moves region to auth and retains the legacy account ID fallback', () => {
    expect(z.toJSONSchema(config.configSchema).properties?.region).toBeUndefined();
    expect(z.toJSONSchema(auth.outputSchema).properties?.region).toMatchObject({
      enum: ['us', 'eu']
    });
    expect(z.toJSONSchema(config.configSchema).properties?.clientId).toMatchObject({
      type: 'string'
    });
    expect(config.configSchema.parse({ region: 'eu', clientId: '123' })).toMatchObject({
      region: 'eu',
      clientId: '123'
    });
  });
  it('registers only approved additions and the hidden log-renewal helper', () => {
    expect(provider.actions).toHaveLength(25);
    expect(provider.actions.map(item => item.key)).toEqual(
      expect.arrayContaining(['get_import_status', 'metorial$getFileUrl'])
    );
    expect(provider.triggerGroups).toHaveLength(0);
    for (const tool of provider.actions) expect(`stitch-${tool.key}`.length).toBeLessThan(60);
  });
});
