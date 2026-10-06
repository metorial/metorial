import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import legacy from './legacy-inputs.json';

describeMcpCompatibleToolSchemas('People Data Labs tool input schemas', provider.actions);
const withoutDescriptions = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(withoutDescriptions);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key !== 'description')
      .map(([key, item]) => [key, withoutDescriptions(item)])
  );
};
describe('People Data Labs legacy input and retirement contracts', () => {
  for (const [key, schema] of Object.entries(legacy))
    it(`preserves ${key} input fields and types`, () => {
      const action = provider.actions.find(
        action => action.type === 'tool' && action.key === key
      );
      if (!action || action.type !== 'tool') throw new Error('Legacy contract is missing.');
      expect(
        withoutDescriptions(action.inputSchema.toJSONSchema({ unrepresentable: 'any' }))
      ).toEqual(withoutDescriptions(schema));
    });
  it('preserves 13 legacy keys, adds only two batch tools, and keeps safe production IDs', () => {
    const tools = provider.actions.filter(action => action.type === 'tool');
    expect(tools).toHaveLength(15);
    expect(Object.keys(legacy)).toHaveLength(13);
    expect(tools.map(tool => tool.key)).toEqual(
      expect.arrayContaining(['bulk_enrich_person', 'bulk_enrich_company'])
    );
    for (const tool of tools) expect(`people-data-labs-${tool.key}`.length).toBeLessThan(60);
  });
  it('retains the retired skill tool, schemas and explicit deprecation guidance', async () => {
    const action = provider.actions.find(
      action => action.type === 'tool' && action.key === 'enrich_skill'
    );
    if (!action || action.type !== 'tool')
      throw new Error('Retired tool contract is missing.');
    expect(action.tags?.deprecated).toBe(true);
    expect(action.description).toMatch(/^DEPRECATED/);
    expect(action.instructions?.join(' ')).toMatch(/April 2025/);
    expect(
      action.inputSchema.safeParse({ skill: 'machine learn', titlecase: false }).success
    ).toBe(true);
    await expect(action.handleInvocation({} as never)).rejects.toThrow(
      /removed in April 2025/
    );
  });
});
