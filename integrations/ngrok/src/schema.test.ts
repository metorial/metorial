import { readFileSync } from 'node:fs';
import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

type Contract = {
  type?: string;
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, Contract>;
  items?: Contract;
  anyOf?: Contract[];
};
const legacy: Record<string, Contract> = JSON.parse(
  readFileSync(new URL('./legacy-input-contracts.json', import.meta.url), 'utf8')
);
const preserves = (value: unknown, previous: Contract) => {
  const actual = z.record(z.string(), z.unknown()).parse(value);
  if (previous.type !== undefined) expect(actual.type).toBe(previous.type);
  if (previous.enum) expect(actual.enum).toEqual(expect.arrayContaining(previous.enum));
  if (previous.properties) {
    expect(actual.required ?? []).toEqual(previous.required ?? []);
    const properties = z.record(z.string(), z.unknown()).parse(actual.properties);
    for (const [key, field] of Object.entries(previous.properties)) {
      expect(properties).toHaveProperty(key);
      preserves(properties[key] ?? {}, field);
    }
  }
  if (previous.items) preserves(actual.items ?? {}, previous.items);
  if (previous.anyOf) {
    const branches = z.array(z.unknown()).parse(actual.anyOf);
    expect(branches).toHaveLength(previous.anyOf.length);
    for (const [index, branch] of previous.anyOf.entries())
      preserves(branches[index] ?? {}, branch);
  }
};

describeMcpCompatibleToolSchemas('ngrok tool input schemas', provider.actions);
for (const [key, previous] of Object.entries(legacy))
  it(`preserves the legacy ${key} input contract`, () => {
    const tool = provider.actions.find(action => action.key === key);
    expect(tool).toBeDefined();
    if (tool) preserves(z.toJSONSchema(tool.inputSchema), previous);
  });

it('preserves all 72 legacy keys and adds only session inspection', () => {
  expect(Object.keys(legacy)).toHaveLength(72);
  expect(provider.actions).toHaveLength(73);
  expect(provider.actions.some(tool => tool.key === 'get_tunnel_session')).toBe(true);
  for (const tool of provider.actions) {
    expect(`ngrok-${tool.key}`.length).toBeLessThan(60);
    expect(z.toJSONSchema(tool.inputSchema).type).toBe('object');
  }
});
