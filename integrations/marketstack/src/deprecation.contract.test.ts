import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

it('retains the original analyst-ratings contract alongside the single-ticker replacement', () => {
  let legacy = provider.actions.find(action => action.key === 'get_analyst_ratings');
  let replacement = provider.actions.find(action => action.key === 'get_company_ratings');
  expect(legacy).toBeDefined();
  expect(replacement).toBeDefined();
  expect(legacy?.tags).toMatchObject({ readOnly: true, deprecated: true });
  expect(
    legacy?.description?.startsWith('DEPRECATED — use `get_company_ratings` instead.')
  ).toBe(true);
  expect(
    legacy?.instructions?.some(instruction => instruction.includes('get_company_ratings'))
  ).toBe(true);
  let input = z.toJSONSchema(legacy!.inputSchema);
  let output = z.toJSONSchema(legacy!.outputSchema);
  expect(input.required).toEqual(['symbols']);
  expect(Object.keys(input.properties ?? {})).toEqual([
    'symbols',
    'dateFrom',
    'dateTo',
    'limit',
    'offset'
  ]);
  expect(input.properties?.limit).toMatchObject({ type: 'number' });
  expect(input.properties?.offset).toMatchObject({ type: 'number' });
  expect(output.required).toEqual(['pagination', 'ratings']);
  expect(output.properties?.pagination).toMatchObject({
    required: ['limit', 'offset', 'count', 'total']
  });
  expect(output.properties?.ratings).toMatchObject({
    items: {
      required: [
        'symbol',
        'date',
        'analyst',
        'rating',
        'priceTarget',
        'consensusBuy',
        'consensusSell',
        'consensusHold'
      ]
    }
  });
});
