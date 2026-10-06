import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { auth } from './auth';
import original from './compatibility.schemas.json';
import { config } from './config';
import { provider } from './index';

const schema = (value: unknown) => {
  const simplify = (item: unknown): unknown => {
    if (Array.isArray(item)) return item.map(simplify);
    if (item && typeof item === 'object')
      return Object.fromEntries(
        Object.entries(item)
          .filter(([key]) => !['description', '$schema'].includes(key))
          .map(([key, child]) => [key, simplify(child)])
      );
    return item;
  };
  return simplify(z.toJSONSchema(value as z.ZodType, { unrepresentable: 'any' }));
};
describeMcpCompatibleToolSchemas('RocketReach tool input schemas', provider.actions);
describe('preserved RocketReach contracts', () => {
  it('preserves API-key auth and empty configuration', () => {
    expect(auth.authStack.map(method => method.key)).toEqual(['api_key']);
    expect(z.toJSONSchema(config.configSchema).properties).toEqual({});
  });
  it('preserves six original keys and tool ID limits without triggers', () => {
    expect(provider.actions.map(action => action.key).sort()).toEqual(
      Object.keys(original).sort()
    );
    for (const action of provider.actions)
      expect(`rocketreach-${action.key}`.length).toBeLessThan(60);
    expect(provider.triggerGroups).toHaveLength(0);
  });
  for (const [key, saved] of Object.entries(original)) {
    it(`${key} preserves every original input field type and optionality`, () => {
      const action = provider.actions.find(value => value.key === key);
      expect(schema(action?.inputSchema)).toEqual(saved.input);
    });
    it(`${key} preserves original output fields and adds only compatible optional fields`, () => {
      const action = provider.actions.find(value => value.key === key);
      expect(schema(action?.outputSchema)).toMatchObject(saved.output);
    });
  }
  it('declares retained/billable enrichment effects while searches and status remain reads', () => {
    for (const key of ['lookup_person', 'lookup_company']) {
      expect(provider.actions.find(action => action.key === key)?.tags).toMatchObject({
        readOnly: false,
        destructive: true
      });
    }
    for (const key of [
      'get_account',
      'search_people',
      'search_companies',
      'check_lookup_status'
    ])
      expect(provider.actions.find(action => action.key === key)?.tags?.readOnly).toBe(true);
  });
});
