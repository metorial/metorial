import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';
import legacy from './legacy-schema.json';

describeMcpCompatibleToolSchemas('Tavily tool schemas', provider.actions);
function retained(before: Record<string, any>, after: Record<string, any>) {
  for (const name of ['type', 'const'])
    if (before[name] !== undefined) expect(after[name]).toEqual(before[name]);
  if (before.enum) for (const value of before.enum) expect(after.enum).toContain(value);
  if (before.properties)
    for (const [key, value] of Object.entries(before.properties)) {
      expect(after.properties).toHaveProperty(key);
      retained(value as Record<string, any>, after.properties[key]);
    }
  if (before.items) retained(before.items, after.items);
  for (const name of ['anyOf', 'oneOf'])
    if (before[name])
      for (const value of before[name])
        expect(after[name]).toEqual(expect.arrayContaining([expect.objectContaining(value)]));
}
describe('Released tool contracts', () => {
  for (const [key, shape] of Object.entries(legacy))
    it(`${key} preserves released fields and types`, () => {
      const action = provider.actions.find(action => action.key === key)!;
      expect(action).toBeDefined();
      retained(shape.input, z.toJSONSchema(action.inputSchema));
      retained(shape.output, z.toJSONSchema(action.outputSchema));
    });
  it('exposes exactly seven tools with bounded production IDs', () => {
    expect(provider.actions).toHaveLength(7);
    expect(
      provider.actions.every(a => a.type === 'tool' && `tavily-${a.key}`.length < 60)
    ).toBe(true);
    expect(provider.actions.map(a => a.key)).toContain('get_research');
  });
});
