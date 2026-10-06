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
    else if (key === 'required' && input)
      for (const field of z.array(z.string()).parse(after.required ?? [])) {
        if (field in object(before.properties)) expect(value).toContain(field);
      }
    else expect(after[key]).toEqual(value);
  }
  if (input && before.required === undefined) expect(after.required ?? []).toEqual([]);
}
describeMcpCompatibleToolSchemas('Formbricks tool input schemas', provider.actions);
it.each(Object.entries(legacy))('preserves legacy %s fields and enums', (key, value) => {
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
it('retains seventeen keys, three approved native reads, and no triggers', () => {
  expect(Object.keys(legacy)).toHaveLength(17);
  expect(provider.actions).toHaveLength(20);
  expect(new Set(provider.actions.map(tool => tool.key)).size).toBe(20);
  expect(provider.triggerGroups).toHaveLength(0);
  for (const tool of provider.actions)
    expect(`formbricks-${tool.key}`.length).toBeLessThan(60);
  expect(auth.authStack.map(method => method.key)).toEqual(['api_key']);
});
it.each([
  'list_attribute_classes',
  'create_attribute_class',
  'delete_attribute_class'
])('keeps %s deprecated with actionable native discovery', key => {
  const tool = provider.actions.find(action => action.key === key);
  expect(tool?.tags?.deprecated).toBe(true);
  expect(tool?.description).toContain('DEPRECATED');
  expect(
    provider.actions.find(action => action.key === 'list_contact_attribute_keys')
  ).toBeDefined();
});
