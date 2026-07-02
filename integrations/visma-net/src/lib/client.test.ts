import { describe, expect, it } from 'vitest';
import { normalizeBackgroundOperation, serializeVismaNetParams } from './client';

describe('Visma Net client helpers', () => {
  it('normalizes background operation JSON returned as binary data', () => {
    let operation = normalizeBackgroundOperation(
      Buffer.from(
        JSON.stringify({
          id: 'job-123',
          stateLocation: 'https://api.finance.visma.net/v1/background/job-123'
        })
      )
    );

    expect(operation).toEqual({
      id: 'job-123',
      stateLocation: 'https://api.finance.visma.net/v1/background/job-123'
    });
  });

  it('serializes arrays as repeated form-style query parameters', () => {
    expect(
      serializeVismaNetParams({
        inventoryTypes: ['StockItem', 'NonStockItem'],
        pageSize: 100,
        ignored: undefined
      })
    ).toBe('inventoryTypes=StockItem&inventoryTypes=NonStockItem&pageSize=100');
  });
});
