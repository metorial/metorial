import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { auth } from './auth';
import { provider } from './index';
import legacy from './legacy-schemas.json';
import { spec } from './spec';

describeMcpCompatibleToolSchemas('Lever tool inputs', provider.actions);
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
)('preserves original %s input/output contracts', (key, schemas) => {
  const action = provider.actions.find(action => action.key === key);
  expect(action).toBeDefined();
  if (!action) throw new Error('Missing original tool metadata.');
  compare(schemas.input, z.toJSONSchema(action.inputSchema as z.ZodType), true);
  compare(schemas.output, z.toJSONSchema(action.outputSchema as z.ZodType), false);
});
it('retains14 keys, exactly3 bounded additions, four auth methods and short IDs', () => {
  expect(Object.keys(legacy)).toHaveLength(14);
  expect(provider.actions.filter(action => action.type === 'tool')).toHaveLength(17);
  expect(new Set(provider.actions.map(action => action.key)).size).toBe(17);
  for (const action of provider.actions) expect(`lever-${action.key}`.length).toBeLessThan(60);
  expect(provider.triggerGroups).toHaveLength(0);
  expect(spec.configSchema.parse({})).toEqual({});
  expect(spec.authSchema.parse({ token: 'schema-token', environment: 'production' })).toEqual({
    token: 'schema-token',
    environment: 'production'
  });
  expect(auth.authStack.map(method => method.key).sort()).toEqual([
    'api_key_production',
    'api_key_sandbox',
    'oauth_production',
    'oauth_sandbox'
  ]);
});
