import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import legacy from './legacy-contract.json';

const node = z
  .object({
    type: z.unknown().optional(),
    properties: z.record(z.string(), z.unknown()).optional(),
    items: z.unknown().optional(),
    enum: z.array(z.unknown()).optional(),
    required: z.array(z.string()).optional()
  })
  .passthrough();
function preserved(before: unknown, after: unknown) {
  const old = node.parse(before),
    next = node.parse(after);
  if (old.type !== undefined) expect(next.type).toEqual(old.type);
  if (old.enum) for (const item of old.enum) expect(next.enum).toContain(item);
  for (const field of next.required ?? []) expect(old.required ?? []).toContain(field);
  if (old.properties)
    for (const [key, value] of Object.entries(old.properties)) {
      expect(next.properties?.[key]).toBeDefined();
      preserved(value, next.properties![key]);
    }
  if (old.items) preserved(old.items, next.items);
}
describeMcpCompatibleToolSchemas('Spotify tool schemas', provider.actions);
describe('Spotify genuine legacy input contracts', () => {
  it('retains eleven unique public keys and bounded IDs without triggers', () => {
    expect(provider.actions).toHaveLength(11);
    expect(new Set(provider.actions.map(tool => tool.key)).size).toBe(11);
    for (const tool of provider.actions) expect(`spotify-${tool.key}`.length).toBeLessThan(60);
    expect(provider.actions.every(action => action.type === 'tool')).toBe(true);
  });
  it.each(
    Object.entries(legacy)
  )('preserves all existing input types and alternatives: %s', (key, before) => {
    const tool = provider.actions.find(value => value.key === key);
    expect(tool).toBeDefined();
    preserved(before.input, z.toJSONSchema(tool!.inputSchema, { unrepresentable: 'any' }));
    const output = node.parse(z.toJSONSchema(tool!.outputSchema, { unrepresentable: 'any' }));
    for (const field of Object.keys(before.output.properties ?? {}))
      expect(output.properties?.[field]).toBeDefined();
  });
});
