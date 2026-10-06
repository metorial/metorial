import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import legacyInputs from './legacy-input-contracts.json';
import legacyOutputs from './legacy-output-contracts.json';
import { spec } from './spec';

describeMcpCompatibleToolSchemas('Folk tool input schemas', provider.actions);
const canonical = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => !['description', '$schema'].includes(key))
      .map(([key, item]) => [key, canonical(item)])
  );
};
const record = (value: unknown) => z.record(z.string(), z.unknown()).parse(value);
const preserveFields = (before: unknown, after: unknown) => {
  const previous = record(before),
    current = record(after);
  for (const [key, value] of Object.entries(previous)) {
    if (key === 'properties') {
      const fields = record(current.properties);
      for (const [field, schema] of Object.entries(record(value)))
        preserveFields(schema, fields[field]);
    } else if (key === 'items') preserveFields(value, current.items);
    else expect(current[key]).toEqual(value);
  }
  expect(current.required ?? []).toEqual(previous.required ?? []);
};
it.each(
  Object.entries(legacyInputs)
)('preserves historical %s input contracts', (key, schema) => {
  const action = provider.actions.find(action => action.key === key);
  expect(action).toBeDefined();
  preserveFields(
    canonical(schema),
    canonical(z.toJSONSchema(action?.inputSchema as z.ZodType))
  );
});
it.each(
  Object.entries(legacyOutputs)
)('preserves historical %s output contracts', (key, schema) => {
  const action = provider.actions.find(action => action.key === key);
  expect(action).toBeDefined();
  preserveFields(
    canonical(schema),
    canonical(z.toJSONSchema(action?.outputSchema as z.ZodType))
  );
});
it.each([
  'create_reminder',
  'list_reminders',
  'delete_reminder'
])('preserves deprecated %s alongside its current task replacement', key => {
  const action = provider.actions.find(action => action.key === key);
  expect(action?.tags?.deprecated).toBe(true);
  expect(action?.description).toMatch(/^DEPRECATED/);
  expect(
    provider.actions.some(
      action => action.key === (key === 'list_reminders' ? 'list_tasks' : 'manage_task')
    )
  ).toBe(true);
});
it('retains the complete inventory and existing stored auth/config', () => {
  expect(provider.actions).toHaveLength(27);
  expect(new Set(provider.actions.map(action => action.key)).size).toBe(27);
  for (const action of provider.actions) expect(`folk-${action.key}`.length).toBeLessThan(60);
  expect(spec.authSchema.parse({ token: 'schema-only-token' })).toEqual({
    token: 'schema-only-token'
  });
  expect(spec.configSchema.parse({})).toEqual({});
});
