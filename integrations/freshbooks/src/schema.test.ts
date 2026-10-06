import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import legacy from './legacy-schemas.json';
import { spec } from './spec';

describeMcpCompatibleToolSchemas('FreshBooks tool inputs', provider.actions);
const object = (value: unknown) => z.record(z.string(), z.unknown()).parse(value);
const compare = (previous: unknown, current: unknown, input: boolean) => {
  const old = object(previous),
    now = object(current);
  for (const [key, value] of Object.entries(old)) {
    if (['description', '$schema'].includes(key)) continue;
    if (key === 'properties')
      for (const [field, schema] of Object.entries(object(value)))
        compare(schema, object(now.properties)[field], input);
    else if (key === 'items') compare(value, now.items, input);
    else if (key === 'required') {
      if (input) expect(now.required ?? []).toEqual(value);
      else
        for (const field of z.array(z.string()).parse(now.required ?? []))
          if (field in object(old.properties)) expect(value).toContain(field);
    } else if (key === 'enum' && input)
      for (const option of z.array(z.unknown()).parse(value))
        expect(now.enum).toContainEqual(option);
    else expect(now[key]).toEqual(value);
  }
  if (input && old.required === undefined) expect(now.required ?? []).toEqual([]);
};
it.each(
  Object.entries(legacy)
)('preserves original %s input/output field contracts', (key, schemas) => {
  const action = provider.actions.find(action => action.key === key);
  expect(action).toBeDefined();
  if (!action) throw new Error('Original tool metadata is missing.');
  compare(schemas.input, z.toJSONSchema(action.inputSchema as z.ZodType), true);
  compare(schemas.output, z.toJSONSchema(action.outputSchema as z.ZodType), false);
});
it('retains20 legacy keys and registers only three bounded additions with short IDs', () => {
  expect(Object.keys(legacy)).toHaveLength(20);
  expect(provider.actions.filter(action => action.type === 'tool')).toHaveLength(23);
  expect(new Set(provider.actions.map(action => action.key)).size).toBe(23);
  for (const action of provider.actions)
    expect(`freshbooks-${action.key}`.length).toBeLessThan(60);
  expect(spec.authSchema.parse({ token: 'schema-only-token' })).toEqual({
    token: 'schema-only-token'
  });
  expect(spec.configSchema.parse({})).toEqual({});
  expect(spec.configSchema.parse({ accountId: 'legacy_account', businessId: '123' })).toEqual({
    accountId: 'legacy_account',
    businessId: '123'
  });
});
