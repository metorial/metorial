import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import legacy from './legacy-contracts.json';

describeMcpCompatibleToolSchemas('Loops tool input schemas', provider.actions);
const structural = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(structural);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'description')
      .map(([key, child]) => [key, structural(child)])
  );
};
const objectSchema = (value: unknown) =>
  value as { properties: Record<string, unknown>; required?: string[] };
describe('Loops original public schema contracts', () => {
  for (const [key, schemas] of Object.entries(legacy)) {
    it(`preserves ${key} input and output fields`, () => {
      const action = provider.actions.find(
        action => action.type === 'tool' && action.key === key
      );
      if (!action || action.type !== 'tool') throw new Error('An original tool is missing.');
      const current = objectSchema(
        action.inputSchema.toJSONSchema({ unrepresentable: 'any' })
      );
      const original = objectSchema(schemas.input);
      for (const [field, definition] of Object.entries(original.properties))
        expect(structural(current.properties[field])).toEqual(structural(definition));
      expect(current.required ?? []).toEqual(original.required ?? []);
      expect(structural(action.outputSchema.toJSONSchema({ unrepresentable: 'any' }))).toEqual(
        structural(schemas.output)
      );
    });
  }
  it('keeps nine original keys, two essential additions and short production IDs', () => {
    const tools = provider.actions.filter(action => action.type === 'tool');
    expect(Object.keys(legacy)).toHaveLength(9);
    expect(tools).toHaveLength(11);
    expect(tools.map(tool => tool.key)).toEqual(
      expect.arrayContaining(['get_current_team', 'check_contact_suppression'])
    );
    for (const tool of tools) expect(`loopsso-${tool.key}`.length).toBeLessThan(60);
  });
});
