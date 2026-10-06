import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { auth } from './auth';
import { config } from './config';
import { provider } from './index';
import baseline from './legacy-schemas.json';

describeMcpCompatibleToolSchemas('Close tool schemas', provider.actions);
type Schema = Record<string, unknown>;
const object = (value: unknown): Schema =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Schema)
    : {};
const compatible = (before: Schema, after: Schema) => {
  for (const key of [
    'type',
    'const',
    'default',
    'minimum',
    'maximum',
    'minLength',
    'maxLength'
  ])
    if (before[key] !== undefined) expect(after[key]).toEqual(before[key]);
  if (Array.isArray(before.enum))
    expect(after.enum).toEqual(expect.arrayContaining(before.enum));
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
  for (const [key, value] of Object.entries(object(before.properties))) {
    expect(Object.hasOwn(object(after.properties), key)).toBe(true);
    compatible(object(value), object(object(after.properties)[key]));
  }
  if (before.items) compatible(object(before.items), object(after.items));
  if (typeof before.additionalProperties === 'object')
    compatible(object(before.additionalProperties), object(after.additionalProperties));
};
describe('Established Close contracts', () => {
  for (const entry of baseline)
    it(`preserves ${entry.key} inputs and outputs`, () => {
      const tool = provider.actions.find(item => item.key === entry.key);
      expect(tool).toBeDefined();
      compatible(entry.input, z.toJSONSchema(tool!.inputSchema));
      compatible(entry.output, z.toJSONSchema(tool!.outputSchema));
    });
  it('retains authentication keys/scopes and additive organization identity', () => {
    expect(auth.authStack.map(method => method.key)).toEqual(['oauth', 'api_key']);
    const oauth = auth.authStack.find(method => method.type === 'auth.oauth');
    expect(oauth?.scopes?.map(scope => scope.scope)).toEqual([
      'all.full_access',
      'offline_access'
    ]);
    expect(z.toJSONSchema(auth.outputSchema).required).toEqual(['token', 'authType']);
    expect(z.toJSONSchema(config.configSchema).required ?? []).toEqual([]);
  });
  it('registers only three approved additions, valid production IDs and no triggers', () => {
    expect(provider.actions).toHaveLength(20);
    expect(provider.actions.map(tool => tool.key)).toEqual(
      expect.arrayContaining(['get_current_user', 'get_tasks', 'delete_task'])
    );
    for (const tool of provider.actions) expect(`close-${tool.key}`.length).toBeLessThan(60);
    expect(provider.triggerGroups).toHaveLength(0);
  });
});
