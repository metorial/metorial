import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import legacyInputs from './legacy-input-contracts.json';
import legacyOutputs from './legacy-output-contracts.json';
import { spec } from './spec';

describeMcpCompatibleToolSchemas('Mode tool input schemas', provider.actions);

const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'description' && key !== '$schema')
      .map(([key, item]) => [key, canonical(item)])
  );
};
it.each(
  Object.entries(legacyInputs)
)('preserves historical %s input fields and requiredness', (key, schema) => {
  const action = provider.actions.find(action => action.key === key);
  expect(action).toBeDefined();
  const current = canonical(z.toJSONSchema(action?.inputSchema as z.ZodType)) as {
    properties: Record<string, unknown>;
    required?: string[];
  };
  const previous = schema as { properties: Record<string, unknown>; required?: string[] };
  for (const [field, value] of Object.entries(previous.properties))
    expect(current.properties[field]).toEqual(value);
  expect(current.required ?? []).toEqual(previous.required ?? []);
});
const record = (value: unknown) => z.record(z.string(), z.unknown()).parse(value);
const compatibleOutput = (before: unknown, after: unknown) => {
  const previous = record(before);
  const current = record(after);
  for (const [key, value] of Object.entries(previous)) {
    if (key === 'properties') {
      const fields = record(current.properties);
      for (const [field, schema] of Object.entries(record(value)))
        compatibleOutput(schema, fields[field]);
    } else if (key === 'items') compatibleOutput(value, current.items);
    else expect(current[key]).toEqual(value);
  }
  expect(current.required ?? []).toEqual(previous.required ?? []);
};
it.each(
  Object.entries(legacyOutputs)
)('preserves historical %s output fields and requiredness', (key, schema) => {
  const action = provider.actions.find(action => action.key === key);
  expect(action).toBeDefined();
  compatibleOutput(schema, canonical(z.toJSONSchema(action?.outputSchema as z.ZodType)));
});
it('retains the full tool inventory and supported stored connections', () => {
  expect(provider.actions).toHaveLength(19);
  expect(new Set(provider.actions.map(action => action.key)).size).toBe(19);
  for (const action of provider.actions) expect(`mode-${action.key}`.length).toBeLessThan(60);
  const oldConfig = { workspaceName: 'schema-only-workspace' };
  expect(spec.configSchema.parse(oldConfig)).toEqual(oldConfig);
  expect(z.toJSONSchema(spec.configSchema).properties).not.toHaveProperty('workspaceName');
  const stored = { token: 'schema-only-token', secret: 'schema-only-secret' };
  expect(spec.authSchema.parse(stored)).toEqual(stored);
  expect(spec.authSchema.parse({ ...stored, workspaceName: 'schema-only-workspace' })).toEqual(
    { ...stored, workspaceName: 'schema-only-workspace' }
  );
});
