import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Polygon tool input schemas', provider.actions);

describe('Polygon API migration contracts', () => {
  for (let [legacyKey, replacementKey] of [
    ['get_stock_financials', 'get_financial_statements'],
    ['get_splits_dividends', 'get_corporate_actions']
  ]) {
    it(`retains ${legacyKey} with guidance to ${replacementKey}`, () => {
      let legacy = provider.actions.find(action => action.key === legacyKey);
      expect(legacy?.tags).toMatchObject({ readOnly: true, deprecated: true });
      expect(
        legacy?.description
          ?.trimStart()
          .startsWith(`DEPRECATED — use \`${replacementKey}\` instead.`)
      ).toBe(true);
      expect(
        legacy?.instructions?.some(instruction => instruction.includes(replacementKey!))
      ).toBe(true);
      expect(provider.actions.some(action => action.key === replacementKey)).toBe(true);
    });
  }

  it('preserves the legacy financial and corporate-action schemas', () => {
    let financials = provider.actions.find(action => action.key === 'get_stock_financials')!;
    let input = z.toJSONSchema(financials.inputSchema);
    expect(input.required).toEqual(['ticker']);
    expect(input.properties?.period).toMatchObject({ enum: ['annual', 'quarterly', 'ttm'] });
    expect(input.properties?.timeframe).toMatchObject({
      enum: ['annual', 'quarterly', 'ttm']
    });
    expect(z.toJSONSchema(financials.outputSchema).required).toEqual(['filings']);
    let actions = provider.actions.find(action => action.key === 'get_splits_dividends')!;
    expect(z.toJSONSchema(actions.inputSchema).properties?.dataType).toMatchObject({
      enum: ['splits', 'dividends']
    });
    expect(z.toJSONSchema(actions.outputSchema).properties?.splits).toMatchObject({
      items: { properties: { splitFrom: { type: 'number' }, splitTo: { type: 'number' } } }
    });
  });

  it('registers 23 read-only tools with valid public IDs and condition types', () => {
    expect(provider.actions).toHaveLength(23);
    let reference = provider.actions.find(action => action.key === 'get_reference_data')!;
    expect(z.toJSONSchema(reference.inputSchema).properties?.marketDataType).toMatchObject({
      enum: ['trade', 'bbo', 'nbbo']
    });
    for (let action of provider.actions) {
      expect(action.tags?.readOnly).toBe(true);
      expect(`polygon-${action.key}`.length).toBeLessThan(60);
    }
  });
});
