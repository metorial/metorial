import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

let clientMocks = vi.hoisted(() => ({
  searchCatalog: vi.fn()
}));

vi.mock('../lib/client', () => ({
  GenesisClient: vi.fn(() => clientMocks)
}));

import { searchCatalog } from './search-catalog';

let createCtx = (input: Record<string, unknown>) =>
  ({
    input,
    auth: { token: 'token' },
    config: { language: 'en' }
  }) as never;

beforeEach(() => {
  clientMocks.searchCatalog.mockReset();
  clientMocks.searchCatalog.mockResolvedValue({ data: [] });
});

describe('Destatis catalog search', () => {
  it('rejects a blank term locally with ServiceError and does not call the API', async () => {
    await expect(
      searchCatalog.handleInvocation(createCtx({ term: '   ' }))
    ).rejects.toBeInstanceOf(ServiceError);
    expect(clientMocks.searchCatalog).not.toHaveBeenCalled();
  });

  it.each([
    ['all', 'all'],
    ['tables', 'table'],
    ['statistics', 'statistic'],
    ['cubes', 'cube'],
    ['variables', 'variable'],
    ['time_series', 'time_series']
  ] as const)('maps public category %s to client category %s', async (category, expected) => {
    await searchCatalog.handleInvocation(createCtx({ term: ' population ', category }));

    expect(clientMocks.searchCatalog).toHaveBeenCalledWith({
      language: 'en',
      searchTerm: 'population',
      category: expected,
      pageLength: 50,
      allowNoResult: true
    });
  });

  it('rejects page lengths over 1000 locally without calling the API', async () => {
    await expect(
      searchCatalog.handleInvocation(createCtx({ term: 'population', pageLength: 1001 }))
    ).rejects.toBeInstanceOf(ServiceError);
    expect(clientMocks.searchCatalog).not.toHaveBeenCalled();
  });

  it('maps mixed table and variable results to stable fields only', async () => {
    clientMocks.searchCatalog.mockResolvedValueOnce({
      data: [
        {
          category: 'table',
          Code: '12411-0001',
          Content: 'Population: Germany, years',
          State: 'complete with values',
          Time: '1950-2025',
          LatestUpdate: '01.09.2026 12:30:00h',
          Information: 'false',
          Parameter: { username: 'must-not-escape' }
        },
        {
          category: 'variable',
          Code: 'GES',
          Content: 'Sex',
          Type: 'classifying',
          Values: '3',
          Information: 'true',
          Unexpected: 'must-not-escape'
        }
      ],
      warning: 'Partial result',
      copyright: '© Destatis'
    });

    let result = await searchCatalog.handleInvocation(
      createCtx({ term: 'population', category: 'all', pageLength: 25 })
    );

    expect(result.output).toEqual({
      items: [
        {
          type: 'table',
          code: '12411-0001',
          title: 'Population: Germany, years',
          state: 'complete with values',
          timeRange: '1950-2025',
          lastUpdated: '01.09.2026 12:30:00h',
          hasInformation: false
        },
        {
          type: 'variable',
          code: 'GES',
          title: 'Sex',
          valueCount: 3,
          hasInformation: true
        }
      ],
      warning: 'Partial result',
      copyright: '© Destatis'
    });
  });

  it('preserves warning and copyright for a code-104 empty result', async () => {
    clientMocks.searchCatalog.mockResolvedValueOnce({
      data: [],
      warning: 'No objects found',
      copyright: '© Destatis'
    });

    let result = await searchCatalog.handleInvocation(createCtx({ term: 'missing' }));

    expect(result.output).toEqual({
      items: [],
      warning: 'No objects found',
      copyright: '© Destatis'
    });
  });

  it('exports a bounded top-level object schema and safe read-only tags', () => {
    let defaults = searchCatalog.inputSchema.safeParse({ term: ' population ' });
    let jsonSchema = z.toJSONSchema(searchCatalog.inputSchema) as Record<string, unknown>;

    expect(defaults).toMatchObject({
      success: true,
      data: { term: 'population', category: 'all', pageLength: 50 }
    });
    expect(
      searchCatalog.inputSchema.safeParse({ term: 'population', pageLength: 1001 }).success
    ).toBe(false);
    expect(
      searchCatalog.inputSchema.safeParse({ term: 'population', category: 'table' }).success
    ).toBe(false);
    expect(jsonSchema.type).toBe('object');
    expect(jsonSchema.oneOf).toBeUndefined();
    expect(jsonSchema.anyOf).toBeUndefined();
    expect(jsonSchema.allOf).toBeUndefined();
    expect(searchCatalog.tags).toMatchObject({ readOnly: true, destructive: false });
  });
});
