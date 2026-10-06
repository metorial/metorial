import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import legacy from './legacy-schemas.json';
import { spec } from './spec';

describeMcpCompatibleToolSchemas('Ashby tool input schemas', provider.actions);
const record = (value: unknown) => z.record(z.string(), z.unknown()).parse(value);
const preserves = (previous: unknown, current: unknown, input: boolean) => {
  const old = record(previous),
    now = record(current);
  for (const [key, value] of Object.entries(old)) {
    if (key === 'description' || key === '$schema') continue;
    if (key === 'properties')
      for (const [field, schema] of Object.entries(record(value)))
        preserves(schema, record(now.properties)[field], input);
    else if (key === 'items') preserves(value, now.items, input);
    else if (key === 'required') {
      if (input) expect(now.required ?? []).toEqual(value);
      else
        for (const field of z.array(z.string()).parse(now.required ?? []))
          if (field in record(old.properties)) expect(value).toContain(field);
    } else if (key === 'enum' && input)
      for (const option of z.array(z.unknown()).parse(value))
        expect(now.enum).toContainEqual(option);
    else expect(now[key]).toEqual(value);
  }
  if (input && old.required === undefined) expect(now.required ?? []).toEqual([]);
};
it.each(Object.entries(legacy))('retains %s original fields and types', (key, schemas) => {
  const action = provider.actions.find(action => action.key === key);
  expect(action).toBeDefined();
  if (!action) throw new Error('Legacy action metadata missing.');
  preserves(schemas.input, z.toJSONSchema(action.inputSchema as z.ZodType), true);
  preserves(schemas.output, z.toJSONSchema(action.outputSchema as z.ZodType), false);
});
it('keeps 13 legacy keys, 15 public tools, one file renewal helper and no triggers', () => {
  expect(Object.keys(legacy)).toHaveLength(13);
  expect(provider.actions).toHaveLength(16);
  expect(provider.actions.filter(action => action.key !== 'metorial$getFileUrl')).toHaveLength(
    15
  );
  expect(new Set(provider.actions.map(action => action.key)).size).toBe(16);
  for (const action of provider.actions) expect(`ashby-${action.key}`.length).toBeLessThan(60);
  expect(provider.triggerGroups).toHaveLength(0);
  expect(spec.configSchema.parse({})).toEqual({});
  expect(spec.authSchema.parse({ token: 'contract-only-key' })).toEqual({
    token: 'contract-only-key'
  });
});
