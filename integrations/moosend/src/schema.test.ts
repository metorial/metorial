import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import legacy from './legacy-schemas.json';
import { spec } from './spec';

describeMcpCompatibleToolSchemas('Moosend tool inputs', provider.actions);
const record = (value: unknown) => z.record(z.string(), z.unknown()).parse(value);
const canonical = (value: unknown): unknown =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(
          Object.entries(value)
            .filter(([key]) => !['description', '$schema'].includes(key))
            .map(([key, item]) => [key, canonical(item)])
        )
      : value;
function compatible(oldValue: unknown, newValue: unknown, input: boolean) {
  const old = record(oldValue),
    current = record(newValue);
  if (!input && !old.anyOf && current.anyOf) {
    const branches = z.array(z.unknown()).parse(current.anyOf);
    const branch = branches.find(value => record(value).type === old.type);
    expect(branch).toBeDefined();
    compatible(old, branch, false);
    return;
  }
  for (const [key, value] of Object.entries(old)) {
    if (key === 'properties') {
      const fields = record(current.properties);
      for (const [field, schema] of Object.entries(record(value)))
        compatible(schema, fields[field], input);
    } else if (key === 'items') compatible(value, current.items, input);
    else if (['anyOf', 'oneOf', 'allOf'].includes(key)) {
      const branches = z.array(z.unknown()).parse(value),
        present = z.array(z.unknown()).parse(current[key]);
      expect(present).toHaveLength(branches.length);
      branches.forEach((branch, index) => compatible(branch, present[index], input));
    } else if (key === 'required') {
      if (input) expect(current.required ?? []).toEqual(value);
      else
        for (const field of z.array(z.string()).parse(current.required ?? [])) {
          if (field in record(old.properties)) expect(value).toContain(field);
        }
    } else if (key === 'enum' && input) {
      for (const item of z.array(z.unknown()).parse(value))
        expect(current.enum).toContainEqual(item);
    } else if (key === 'type' && !input) {
      const types = Array.isArray(value) ? value : [value],
        present = Array.isArray(current.type) ? current.type : [current.type];
      for (const type of types) expect(present).toContain(type);
    } else expect(current[key]).toEqual(value);
  }
  if (input && old.required === undefined) expect(current.required ?? []).toEqual([]);
}
it.each(
  Object.entries(legacy)
)('preserves historical %s inputs and output fields', (key, schemas) => {
  const tool = provider.actions.find(action => action.key === key);
  expect(tool).toBeDefined();
  compatible(
    canonical(schemas.input),
    canonical(z.toJSONSchema(tool?.inputSchema as z.ZodType)),
    true
  );
  compatible(
    canonical(schemas.output),
    canonical(z.toJSONSchema(tool?.outputSchema as z.ZodType)),
    false
  );
});
it('retains stored auth, empty config, 12 legacy keys and short production IDs', () => {
  expect(Object.keys(legacy)).toHaveLength(12);
  expect(provider.actions).toHaveLength(13);
  expect(new Set(provider.actions.map(tool => tool.key)).size).toBe(13);
  for (const tool of provider.actions) expect(`moosend-${tool.key}`.length).toBeLessThan(60);
  expect(spec.authSchema.parse({ token: 'schema-only-key' })).toEqual({
    token: 'schema-only-key'
  });
  expect(spec.configSchema.parse({})).toEqual({});
});
