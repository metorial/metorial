import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

describe('CoinMarketCal V1 deprecation contracts', () => {
  for (const [legacyKey, replacementKey] of [
    ['search_events', 'list_events'],
    ['list_coins', 'search_coins'],
    ['list_categories', 'list_event_categories']
  ]) {
    it(`retains ${legacyKey} alongside ${replacementKey}`, () => {
      const legacy = provider.actions.find(action => action.key === legacyKey);
      expect(legacy?.tags).toMatchObject({ readOnly: true, deprecated: true });
      expect(
        legacy?.description?.startsWith(`DEPRECATED — use \`${replacementKey}\` instead.`)
      ).toBe(true);
      expect(
        legacy?.instructions?.some(instruction => instruction.includes(replacementKey!))
      ).toBe(true);
      expect(provider.actions.some(action => action.key === replacementKey)).toBe(true);
    });
  }

  it('retains legacy numeric IDs, required outputs, optional inputs, and enum values', () => {
    const search = provider.actions.find(action => action.key === 'search_events')!;
    const input = z.toJSONSchema(search.inputSchema);
    expect(input.required ?? []).toEqual([]);
    expect(input.properties?.page).toMatchObject({ type: 'number' });
    expect(input.properties?.maxResults).toMatchObject({ type: 'number' });
    expect(input.properties?.sortBy).toMatchObject({ enum: ['created_desc', 'hot_events'] });
    expect(input.properties?.showOnly).toMatchObject({ enum: ['hot_events'] });
    const output = z.toJSONSchema(search.outputSchema);
    expect(output.required).toEqual(['events', 'pageCount']);
    expect(output.properties?.pageCount).toMatchObject({ type: 'number' });
    expect(output.properties?.events).toMatchObject({
      items: {
        required: [
          'eventId',
          'title',
          'coins',
          'eventDate',
          'createdDate',
          'categories',
          'proof',
          'source',
          'isHot',
          'voteCount',
          'positiveVoteCount',
          'percentage',
          'canOccurBefore',
          'description'
        ],
        properties: {
          eventId: { type: 'number' },
          title: { type: 'object' },
          description: { type: 'object' }
        }
      }
    });
    const categories = provider.actions.find(action => action.key === 'list_categories')!;
    expect(z.toJSONSchema(categories.outputSchema).properties?.categories).toMatchObject({
      items: {
        properties: { categoryId: { type: 'number' } },
        required: ['categoryId', 'name']
      }
    });
    const coins = provider.actions.find(action => action.key === 'list_coins')!;
    expect(z.toJSONSchema(coins.outputSchema).properties?.coins).toMatchObject({
      items: {
        properties: { coinId: { type: 'string' }, rank: { type: 'number' } },
        required: ['coinId', 'name', 'symbol']
      }
    });
  });

  it('registers object-root inputs and public IDs below 60 characters', () => {
    expect(provider.actions).toHaveLength(10);
    for (const action of provider.actions) {
      const schema = z.toJSONSchema(action.inputSchema);
      expect(schema.type).toBe('object');
      expect(schema.oneOf).toBeUndefined();
      expect(schema.anyOf).toBeUndefined();
      expect(schema.allOf).toBeUndefined();
      expect(`coinmarketcal-${action.key}`.length).toBeLessThan(60);
    }
  });
});
