import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import legacy from './legacy-contract.json';

const schema = z
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
  const old = schema.parse(before),
    next = schema.parse(after);
  if (old.type !== undefined) expect(next.type).toEqual(old.type);
  if (old.enum) for (const value of old.enum) expect(next.enum).toContain(value);
  if (old.properties)
    for (const [key, value] of Object.entries(old.properties)) {
      expect(next.properties?.[key]).toBeDefined();
      compatible(value, next.properties![key]!);
    }
  if (old.items) {
    expect(next.items).toBeDefined();
    compatible(old.items, next.items!);
  }
  for (const key of next.required ?? []) expect(old.required ?? []).toContain(key);
}
describe('Bubble tool schemas and legacy contracts', () => {
  it('registers exactly ten unique public keys', () => {
    expect(provider.actions).toHaveLength(10);
    expect(new Set(provider.actions.map(a => a.key)).size).toBe(10);
  });
  it.each(provider.actions)('serializes an object input: $key', tool => {
    const schema = z.toJSONSchema(tool.inputSchema, { unrepresentable: 'any' });
    expect(schema.type).toBe('object');
    expect(schema.oneOf ?? schema.anyOf ?? schema.allOf).toBeUndefined();
    expect(`bubble-${tool.key}`.length).toBeLessThan(60);
  });
  it.each(Object.entries(legacy))('preserves released fields: %s', (key, before) => {
    const tool = provider.actions.find(a => a.key === key);
    expect(tool).toBeDefined();
    compatible(before.input, z.toJSONSchema(tool!.inputSchema, { unrepresentable: 'any' }));
    compatible(before.output, z.toJSONSchema(tool!.outputSchema, { unrepresentable: 'any' }));
  });
  it('preserves opaque string IDs without numeric coercion', () => {
    const tool = provider.actions.find(a => a.key === 'get_record')!;
    expect(
      tool.inputSchema.parse({ dataType: 'Thing', recordId: '9007199254740993' }).recordId
    ).toBe('9007199254740993');
    expect(
      tool.inputSchema.safeParse({ dataType: 'Thing', recordId: 9007199254740992 }).success
    ).toBe(false);
  });
  it('retains GET and POST workflow selection in one existing key', () => {
    const tool = provider.actions.find(a => a.key === 'trigger_workflow')!;
    for (const method of ['GET', 'POST'])
      expect(tool.inputSchema.safeParse({ workflowName: 'controlled', method }).success).toBe(
        true
      );
  });
});
