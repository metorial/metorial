import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { auth } from './auth';
import { config } from './config';
import { provider } from './index';
import baseline from './legacy-schemas.json';

describeMcpCompatibleToolSchemas('RudderStack tool input schemas', provider.actions);
type Schema = Record<string, unknown>;
const object = (value: unknown): Schema =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Schema) : {};
const compatible = (before: Schema, after: Schema) => {
  for (const field of ['type', 'const'])
    if (before[field] !== undefined) expect(after[field]).toEqual(before[field]);
  if (Array.isArray(before.enum))
    expect(after.enum).toEqual(expect.arrayContaining(before.enum));
  const oldRequired = Array.isArray(before.required) ? before.required : [];
  const oldProperties = object(before.properties);
  for (const required of Array.isArray(after.required) ? after.required : [])
    if (Object.hasOwn(oldProperties, String(required)))
      expect(oldRequired).toContain(required);
  for (const [key, value] of Object.entries(oldProperties)) {
    expect(Object.hasOwn(object(after.properties), key)).toBe(true);
    compatible(object(value), object(object(after.properties)[key]));
  }
  if (before.items) compatible(object(before.items), object(after.items));
  if (before.additionalProperties && typeof before.additionalProperties === 'object')
    compatible(object(before.additionalProperties), object(after.additionalProperties));
};
describe('RudderStack established schemas', () => {
  for (const old of baseline)
    it(`preserves ${old.key} input/output contracts`, () => {
      const tool = provider.actions.find(action => action.key === old.key);
      expect(tool).toBeDefined();
      compatible(old.input, z.toJSONSchema(tool!.inputSchema));
      compatible(old.output, z.toJSONSchema(tool!.outputSchema));
    });
  it('retains auth keys and optional source credentials', () => {
    expect(auth.authStack.map(method => method.key)).toContain('access_token');
    expect(z.toJSONSchema(auth.outputSchema).required).toEqual(['token']);
  });
  it('retains the old Data Plane URL spelling as an optional fallback', () => {
    const schema = z.toJSONSchema(config.configSchema);
    expect(schema.properties?.datePlaneUrl).toMatchObject({ type: 'string' });
    expect(schema.properties?.dataPlaneUrl).toMatchObject({ type: 'string' });
  });
  it('keeps 17 tool keys and empty legacy triggers', () => {
    expect(provider.actions).toHaveLength(17);
    expect(provider.triggerGroups).toHaveLength(0);
    for (const action of provider.actions)
      expect(`rudderstack-${action.key}`.length).toBeLessThan(60);
  });
  it('exposes optional audit continuation without removing established fields', () => {
    const tool = provider.actions.find(action => action.key === 'get_audit_logs')!;
    const schema = z.toJSONSchema(tool.outputSchema);
    expect(schema.properties?.nextOffset).toMatchObject({ type: 'number' });
    expect(schema.properties?.hasMore).toMatchObject({ type: 'boolean' });
    expect(schema.required).not.toContain('nextOffset');
    expect(schema.required).not.toContain('hasMore');
  });
});
