import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import legacy from './legacy-schemas.json';
import { spec } from './spec';

describeMcpCompatibleToolSchemas('Salesflare input schemas', provider.actions);
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
// Omitted pipeline flags/stages remain unknown rather than becoming false or empty.
const relaxed = new Set([
  'list_pipelines.pipelines[].isDefault',
  'list_pipelines.pipelines[].recurring',
  'list_pipelines.pipelines[].stages'
]);
function compatible(
  previousValue: unknown,
  currentValue: unknown,
  path: string,
  input: boolean
) {
  const previous = record(previousValue),
    current = record(currentValue);
  for (const [key, value] of Object.entries(previous)) {
    if (key === 'properties') {
      const fields = record(current.properties);
      for (const [field, schema] of Object.entries(record(value)))
        compatible(schema, fields[field], `${path}.${field}`, input);
    } else if (key === 'items') compatible(value, current.items, `${path}[]`, input);
    else if (key === 'anyOf' || key === 'oneOf' || key === 'allOf') {
      const previousBranches = z.array(z.unknown()).parse(value),
        currentBranches = z.array(z.unknown()).parse(current[key]);
      expect(currentBranches).toHaveLength(previousBranches.length);
      previousBranches.forEach((branch, index) =>
        compatible(branch, currentBranches[index], path, input)
      );
    } else if (key === 'required') {
      const oldRequired = z.array(z.string()).parse(value),
        newRequired =
          current.required === undefined ? [] : z.array(z.string()).parse(current.required);
      for (const field of oldRequired)
        if (input || !relaxed.has(`${path}.${field}`)) expect(newRequired).toContain(field);
      if (input) for (const field of newRequired) expect(oldRequired).toContain(field);
    } else if (key === 'enum' && input) {
      for (const option of z.array(z.unknown()).parse(value))
        expect(current.enum).toContainEqual(option);
    } else expect(current[key]).toEqual(value);
  }
  if (input && previous.required === undefined) expect(current.required ?? []).toEqual([]);
}
it.each(
  Object.entries(legacy)
)('preserves historical %s contracts with documented DTO relaxations', (key, schemas) => {
  const action = provider.actions.find(candidate => candidate.key === key);
  expect(action).toBeDefined();
  compatible(
    schemas.input,
    canonical(z.toJSONSchema(action?.inputSchema as z.ZodType)),
    key,
    true
  );
  compatible(
    schemas.output,
    canonical(z.toJSONSchema(action?.outputSchema as z.ZodType)),
    key,
    false
  );
});
it('retains all raw keys, short production IDs and stored API-key auth', () => {
  expect(provider.actions).toHaveLength(36);
  expect(new Set(provider.actions.map(action => action.key)).size).toBe(36);
  for (const action of provider.actions)
    expect(`salesflare-${action.key}`.length).toBeLessThan(60);
  expect(spec.authSchema.parse({ token: 'schema-only-key' })).toEqual({
    token: 'schema-only-key'
  });
  expect(spec.configSchema.parse({})).toEqual({});
});
