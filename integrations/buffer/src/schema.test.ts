import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import legacy from './legacy-schemas.json';
import { spec } from './spec';

describeMcpCompatibleToolSchemas('Buffer tool inputs', provider.actions);
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
function compatible(previous: unknown, present: unknown, input: boolean): void {
  const old = record(previous),
    current = record(present);
  for (const [key, value] of Object.entries(old)) {
    if (key === 'properties') {
      const properties = record(current.properties);
      for (const [name, schema] of Object.entries(record(value)))
        compatible(schema, properties[name], input);
    } else if (key === 'items') compatible(value, current.items, input);
    else if (key === 'required') {
      if (input) expect(current.required ?? []).toEqual(value);
      else
        for (const field of z.array(z.string()).parse(current.required ?? []))
          if (field in record(old.properties)) expect(value).toContain(field);
    } else if (key === 'enum' && input) {
      for (const option of z.array(z.unknown()).parse(value))
        expect(current.enum).toContainEqual(option);
    } else expect(current[key]).toEqual(value);
  }
  if (input && old.required === undefined) expect(current.required ?? []).toEqual([]);
}
it.each(
  Object.entries(legacy)
)('preserves original %s input and output field contracts', (key, schemas) => {
  const tool = provider.actions.find(action => action.key === key);
  expect(tool).toBeDefined();
  if (!tool) throw new Error('Original tool metadata is missing.');
  compatible(
    canonical(schemas.input),
    canonical(z.toJSONSchema(tool.inputSchema as z.ZodType)),
    true
  );
  compatible(
    canonical(schemas.output),
    canonical(z.toJSONSchema(tool.outputSchema as z.ZodType)),
    false
  );
});
it('retains12 original keys, stored token auth, empty config and short production IDs', () => {
  expect(Object.keys(legacy)).toHaveLength(12);
  expect(provider.actions.filter(action => action.type === 'tool')).toHaveLength(13);
  expect(new Set(provider.actions.map(action => action.key)).size).toBe(13);
  for (const action of provider.actions)
    expect(`buffer-${action.key}`.length).toBeLessThan(60);
  expect(spec.authSchema.parse({ token: 'schema-only-token' })).toEqual({
    token: 'schema-only-token'
  });
  expect(spec.configSchema.parse({})).toEqual({});
});
