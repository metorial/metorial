import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import legacy from './legacy-inputs.json';

describeMcpCompatibleToolSchemas('Instantly tool input schemas', provider.actions);

type Schema = {
  description?: string;
  type?: unknown;
  enum?: unknown[];
  required?: string[];
  properties?: Record<string, Schema | boolean>;
  items?: Schema | boolean | (Schema | boolean)[];
  minimum?: number;
  maximum?: number;
  minItems?: number;
  maxItems?: number;
  anyOf?: Schema[];
  oneOf?: Schema[];
};
const compatible = (
  before: Schema | boolean | (Schema | boolean)[],
  current: Schema | boolean | (Schema | boolean)[] | undefined
) => {
  if (typeof before === 'boolean' || Array.isArray(before)) {
    expect(current).toEqual(before);
    return;
  }
  if (current === undefined || typeof current === 'boolean' || Array.isArray(current)) {
    throw new Error('A legacy schema object was removed or replaced.');
  }
  if (before.type !== undefined) expect(current.type).toEqual(before.type);
  if (before.enum) for (const value of before.enum) expect(current.enum).toContain(value);
  for (const required of current.required ?? [])
    expect(before.required ?? []).toContain(required);
  for (const [key, schema] of Object.entries(before.properties ?? {})) {
    expect(current.properties).toHaveProperty(key);
    compatible(schema, current.properties![key]!);
  }
  if (before.items) compatible(before.items, current.items!);
  for (const key of ['minimum', 'maximum', 'minItems', 'maxItems'] as const) {
    if (before[key] !== undefined) expect(current[key]).toBe(before[key]);
  }
  if (before.anyOf) expect(current.anyOf).toEqual(before.anyOf);
  if (before.oneOf) expect(current.oneOf).toEqual(before.oneOf);
};
describe('Instantly legacy input compatibility', () => {
  for (const [key, schema] of Object.entries(legacy)) {
    it(`preserves ${key}`, () => {
      const action = provider.actions.find(
        action => action.type === 'tool' && action.key === key
      );
      if (!action || action.type !== 'tool') throw new Error('Legacy tool is missing.');
      compatible(schema, action.inputSchema.toJSONSchema({ unrepresentable: 'any' }));
    });
  }
  it('preserves all legacy keys and safe production identifiers', () => {
    const tools = provider.actions.filter(action => action.type === 'tool');
    expect(tools).toHaveLength(26);
    expect(Object.keys(legacy)).toHaveLength(23);
    for (const tool of tools) expect(`instantly-${tool.key}`.length).toBeLessThan(60);
  });
});
