import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { auth } from './auth';
import { provider } from './index';
import original from './legacy-schemas.json';
import { spec } from './spec';

describeMcpCompatibleToolSchemas('Files.com tool input schemas', provider.actions);
const object = (value: unknown) => z.record(z.string(), z.unknown()).parse(value);
const compatible = (previous: unknown, current: unknown, input: boolean) => {
  const before = object(previous),
    after = object(current);
  for (const [key, value] of Object.entries(before)) {
    if (key === 'description' || key === '$schema') continue;
    if (key === 'properties')
      for (const [field, fieldSchema] of Object.entries(object(value)))
        compatible(fieldSchema, object(after.properties)[field], input);
    else if (key === 'items') compatible(value, after.items, input);
    else if (key === 'required' && input) expect(after.required ?? []).toEqual(value);
    else if (key === 'required')
      for (const field of z.array(z.string()).parse(after.required ?? [])) {
        if (field in object(before.properties)) expect(value).toContain(field);
      }
    else expect(after[key]).toEqual(value);
  }
  if (input && before.required === undefined) expect(after.required ?? []).toEqual([]);
};
it.each(Object.entries(original))('preserves original %s field contracts', (key, schemas) => {
  const tool = provider.actions.find(action => action.key === key);
  expect(tool).toBeDefined();
  if (!tool) return;
  compatible(schemas.input, z.toJSONSchema(tool.inputSchema as z.ZodType), true);
  compatible(
    schemas.output,
    z.toJSONSchema(tool.outputSchema as z.ZodType, { unrepresentable: 'any' }),
    false
  );
});
it('retains twelve legacy keys, four approved essentials and site binding only in auth', () => {
  expect(Object.keys(original)).toHaveLength(12);
  expect(provider.actions.filter(action => action.type === 'tool')).toHaveLength(16);
  expect(new Set(provider.actions.map(action => action.key)).size).toBe(16);
  for (const action of provider.actions)
    expect(`filescom-${action.key}`.length).toBeLessThan(60);
  expect(provider.triggerGroups).toHaveLength(0);
  expect(spec.configSchema.parse({})).toEqual({});
  expect(z.toJSONSchema(spec.configSchema).properties).toEqual({});
  const legacy = { subdomain: 'legacy-site' };
  expect(spec.configSchema.parse(legacy)).toEqual(legacy);
  expect(auth.authStack.map(method => method.key)).toEqual(['api_key']);
  for (const method of auth.authStack) {
    const authSchema = z.toJSONSchema(method.inputSchema as z.ZodType);
    expect(Object.keys(authSchema.properties ?? {})).toEqual(['apiKey', 'subdomain']);
  }
});
