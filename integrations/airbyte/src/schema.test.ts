import { readFileSync } from 'node:fs';
import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

const object = (value: unknown) => z.record(z.string(), z.unknown()).parse(value);
const previous = object(
  JSON.parse(readFileSync(new URL('./legacy-input-contracts.json', import.meta.url), 'utf8'))
);
const preserves = (value: unknown, previous: unknown) => {
  const actual = object(value);
  const old = object(previous);
  if (old.type !== undefined) expect(actual.type).toEqual(old.type);
  if (old.enum)
    expect(actual.enum).toEqual(expect.arrayContaining(z.array(z.unknown()).parse(old.enum)));
  if (old.properties) {
    expect(old.required ?? []).toEqual(
      expect.arrayContaining(z.array(z.string()).parse(actual.required ?? []))
    );
    const properties = object(actual.properties);
    for (const [key, value] of Object.entries(object(old.properties))) {
      expect(actual.properties).toHaveProperty(key);
      preserves(properties[key] ?? {}, value);
    }
  }
  if (old.items) preserves(actual.items ?? {}, old.items);
  if (old.anyOf) {
    const branches = z.array(z.unknown()).parse(actual.anyOf);
    const previous = z.array(z.unknown()).parse(old.anyOf);
    expect(branches).toHaveLength(previous.length);
    previous.forEach((value, index) => preserves(branches[index] ?? {}, value));
  }
};
describeMcpCompatibleToolSchemas('Airbyte public API inputs', provider.actions);
for (const [key, contract] of Object.entries(previous))
  it(`preserves the original ${key} input`, () => {
    const tool = provider.actions.find(action => action.key === key);
    expect(tool).toBeDefined();
    if (tool) preserves(z.toJSONSchema(tool.inputSchema), contract);
  });
it('retains 31 original tools and adds four discovery/readback tools', () => {
  expect(Object.keys(previous)).toHaveLength(31);
  expect(provider.actions).toHaveLength(35);
  for (const tool of provider.actions) expect(`airbyte-${tool.key}`.length).toBeLessThan(60);
});
