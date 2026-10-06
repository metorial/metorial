import { readFileSync } from 'node:fs';
import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, test } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import { spec } from './spec';

type Schema = {
  type?: string | string[];
  required?: string[];
  properties?: Record<string, Schema>;
  items?: Schema;
  enum?: unknown[];
};
let original = JSON.parse(
  readFileSync(new URL('./legacy-schemas.json', import.meta.url), 'utf8')
) as Record<string, { input: Schema; output: Schema }>;

describeMcpCompatibleToolSchemas('Hootsuite tool input schemas', provider.actions);

let compatible = (previous: Schema, current: Schema) => {
  if (previous.type !== undefined) expect(current.type).toEqual(previous.type);
  for (let value of previous.enum ?? []) expect(current.enum).toContain(value);
  for (let required of current.required ?? []) {
    if (previous.properties && Object.hasOwn(previous.properties, required))
      expect(previous.required ?? []).toContain(required);
    else throw new Error('A new field became required in a preserved schema.');
  }
  for (let [key, schema] of Object.entries(previous.properties ?? {})) {
    expect(current.properties).toHaveProperty(key);
    compatible(schema, current.properties![key]!);
  }
  if (previous.items) {
    expect(current.items).toBeDefined();
    compatible(previous.items, current.items!);
  }
};

for (let [key, schemas] of Object.entries(original)) {
  test(`${key} preserves legacy input fields, types, enum values and optionality`, () => {
    let action = provider.actions.find(action => action.key === key);
    expect(action).toBeDefined();
    compatible(schemas.input, z.toJSONSchema(action!.inputSchema) as Schema);
  });
  test(`${key} preserves legacy output fields and types with compatible additions or optional relaxations`, () => {
    let action = provider.actions.find(action => action.key === key);
    expect(action?.outputSchema).toBeDefined();
    compatible(schemas.output, z.toJSONSchema(action!.outputSchema!) as Schema);
  });
}

test('preserves all nine public keys and registers only the reserved media renewal helper', () => {
  let keys = provider.actions.map(action => action.key);
  expect(keys).toHaveLength(10);
  expect(new Set(keys).size).toBe(10);
  expect(keys.filter(key => key !== 'metorial$getFileUrl').sort()).toEqual(
    Object.keys(original).sort()
  );
  for (let key of keys) expect(`hootsuite-${key}`.length).toBeLessThan(60);
});

test('retains OAuth output and empty setup compatibility', () => {
  expect(spec.configSchema.safeParse({}).success).toBe(true);
  expect(
    spec.authSchema.safeParse({
      token: 'synthetic-access',
      refreshToken: 'synthetic-refresh',
      expiresAt: '2026-10-05T00:00:00Z'
    }).success
  ).toBe(true);
});
