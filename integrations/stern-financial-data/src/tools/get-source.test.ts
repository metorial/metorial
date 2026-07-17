import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { provider } from '../index';
import { SternFinancialDataClient } from '../lib/client';
import { getSource } from './get-source';

describeMcpCompatibleToolSchemas('Stern Financial Data tool input schemas', provider.actions);

let createCtx = (input: Record<string, unknown>) =>
  ({
    input,
    auth: {},
    config: {}
  }) as any;

beforeEach(() => {
  vi.restoreAllMocks();
});

describe('get_source Stern dataset aliases', () => {
  it.each([
    {
      source: 'betas' as const,
      canonicalSource: 'us_industry_betas' as const,
      searchInput: { industrySearch: 'Retail (Distributors)' },
      row: { industryName: 'Retail (Distributors)', rowType: 'industry', raw: {} }
    },
    {
      source: 'ctryprem' as const,
      canonicalSource: 'erp' as const,
      searchInput: { countrySearch: 'Norway' },
      row: { country: 'Norway', raw: {} }
    }
  ])('normalizes $source while preserving filters and controls', async testCase => {
    let getSourceSpy = vi
      .spyOn(SternFinancialDataClient.prototype, 'getSource')
      .mockResolvedValue({
        metadata: {
          source: testCase.canonicalSource,
          title: 'Test source',
          pageUrl: 'https://example.com/page',
          workbookUrl: 'https://example.com/workbook',
          retrievedAt: '2026-07-17T00:00:00.000Z',
          sourceType: 'workbook'
        },
        rows: [testCase.row]
      } as any);

    let input = getSource.inputSchema.parse({
      source: testCase.source,
      ...testCase.searchInput,
      limit: 5,
      offset: 0,
      returnAll: false,
      includeRaw: false
    });
    let result = await getSource.handleInvocation(createCtx(input));

    expect(getSourceSpy).toHaveBeenCalledWith(testCase.canonicalSource);
    expect(result.output.metadata.source).toBe(testCase.canonicalSource);
    expect(result.output.returnedRowCount).toBe(1);
    expect(result.output.rows[0]).not.toHaveProperty('raw');
  });
});
