import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import legacy from './legacy-schema.json';

type Shape = {
  type?: unknown;
  properties?: Record<string, Shape>;
  items?: Shape;
  enum?: unknown[];
  [key: string]: unknown;
};
function schemaObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function retained(before: Shape, after: unknown) {
  expect(schemaObject(after)).toBe(true);
  if (!schemaObject(after)) return;
  if (before.type !== undefined) expect(after.type).toEqual(before.type);
  if (before.enum) for (const value of before.enum) expect(after.enum).toContain(value);
  if (before.properties) {
    expect(schemaObject(after.properties)).toBe(true);
    if (!schemaObject(after.properties)) return;
    for (const [key, value] of Object.entries(before.properties)) {
      expect(after.properties).toHaveProperty(key);
      retained(value, after.properties[key]);
    }
  }
  if (before.items) retained(before.items, after.items);
}
describeMcpCompatibleToolSchemas('NetSuite tool schemas', provider.actions);
describe('Released native tool contracts', () => {
  for (const [key, shape] of Object.entries(legacy))
    it(`${key} preserves released keys and field types`, () => {
      const action = provider.actions.find(a => a.key === key)!;
      expect(action).toBeDefined();
      retained(shape.input, z.toJSONSchema(action.inputSchema));
      retained(shape.output, z.toJSONSchema(action.outputSchema));
    });
  it('contains only the ten approved tools with bounded IDs and no triggers', () => {
    expect(provider.actions).toHaveLength(10);
    expect(
      provider.actions.every(a => a.type === 'tool' && `netsuite-${a.key}`.length < 60)
    ).toBe(true);
    expect(provider.actions.map(a => a.key)).toContain('list_record_types');
  });
});
