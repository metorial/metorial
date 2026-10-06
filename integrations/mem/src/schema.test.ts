import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { auth } from './auth';
import { provider } from './index';
import legacy from './legacy-schemas.json';

const object = (value: unknown) => z.record(z.string(), z.unknown()).parse(value);
function compatible(previous: unknown, current: unknown, input: boolean) {
  const before = object(previous),
    after = object(current);
  for (const [key, value] of Object.entries(before)) {
    if (key === 'description' || key === '$schema') continue;
    if (key === 'properties')
      for (const [field, schema] of Object.entries(object(value)))
        compatible(schema, object(after.properties)[field], input);
    else if (key === 'items') compatible(value, after.items, input);
    else if (key === 'required') {
      if (input) expect(after.required ?? []).toEqual(value);
      else
        for (const field of z.array(z.string()).parse(value))
          expect(after.required).toContain(field);
    } else expect(after[key]).toEqual(value);
  }
  if (input && before.required === undefined) expect(after.required ?? []).toEqual([]);
}
describeMcpCompatibleToolSchemas('Mem tool input schemas', provider.actions);
it.each(Object.entries(legacy))('preserves legacy %s contracts', (key, value) => {
  const tool = provider.actions.find(action => action.key === key);
  expect(tool).toBeDefined();
  if (!tool) return;
  compatible(value.input, z.toJSONSchema(tool.inputSchema), true);
  compatible(
    value.output,
    z.toJSONSchema(tool.outputSchema, { unrepresentable: 'any' }),
    false
  );
});
it('retains eleven keys plus three approved native mutations without triggers', () => {
  expect(Object.keys(legacy)).toHaveLength(11);
  expect(provider.actions).toHaveLength(14);
  expect(new Set(provider.actions.map(tool => tool.key)).size).toBe(14);
  expect(
    provider.actions
      .filter(tool => !(tool.key in legacy))
      .map(tool => tool.key)
      .sort()
  ).toEqual(['manage_collection_membership', 'update_collection', 'update_note']);
  for (const tool of provider.actions) expect(`mem-${tool.key}`.length).toBeLessThan(60);
  expect(provider.triggerGroups).toHaveLength(0);
  expect(auth.authStack.map(method => method.key)).toEqual(['api_key']);
});
