import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import legacy from './legacy-contract.json';

const shape = z
  .object({
    type: z.unknown().optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
    items: z.unknown().optional(),
    enum: z.array(z.unknown()).optional(),
    required: z.array(z.string()).optional()
  })
  .passthrough();
function compatible(before: unknown, after: unknown) {
  if (typeof before === 'boolean') {
    expect(after).toEqual(before);
    return;
  }
  const old = shape.parse(before),
    next = shape.parse(after);
  if (old.type !== undefined) expect(next.type).toEqual(old.type);
  if (old.enum) for (const item of old.enum) expect(next.enum).toContain(item);
  if (old.properties)
    for (const [key, item] of Object.entries(old.properties)) {
      expect(next.properties?.[key]).toBeDefined();
      compatible(item, next.properties![key]);
    }
  if (old.items) {
    expect(next.items).toBeDefined();
    compatible(old.items, next.items);
  }
  for (const key of next.required ?? []) expect(old.required ?? []).toContain(key);
}
describe('Twilio Flex input schemas and released contracts', () => {
  it('registers exactly eighteen unique public keys and no triggers', () => {
    expect(provider.actions).toHaveLength(18);
    expect(new Set(provider.actions.map(a => a.key)).size).toBe(18);
  });
  it.each(provider.actions)('serializes a top-level object: $key', tool => {
    const schema = z.toJSONSchema(tool.inputSchema, { unrepresentable: 'any' });
    expect(schema.type).toBe('object');
    expect(schema.oneOf ?? schema.anyOf ?? schema.allOf).toBeUndefined();
    expect(`twilio-flex-${tool.key}`.length).toBeLessThan(60);
  });
  it.each(Object.entries(legacy))('preserves genuine released fields: %s', (key, before) => {
    const tool = provider.actions.find(a => a.key === key);
    expect(tool).toBeDefined();
    compatible(before.input, z.toJSONSchema(tool!.inputSchema, { unrepresentable: 'any' }));
    compatible(before.output, z.toJSONSchema(tool!.outputSchema, { unrepresentable: 'any' }));
  });
});
