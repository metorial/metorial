import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

let clientMocks = vi.hoisted(() => ({
  getMetadata: vi.fn()
}));

vi.mock('../lib/client', () => ({
  GenesisClient: vi.fn(() => clientMocks)
}));

import { getMetadata } from './get-metadata';

let createCtx = (input: Record<string, unknown>) =>
  ({
    input,
    auth: { token: 'token' },
    config: { language: 'en' }
  }) as never;

beforeEach(() => {
  clientMocks.getMetadata.mockReset();
  clientMocks.getMetadata.mockResolvedValue({ data: { Code: '12411-0001' } });
});

describe('Destatis metadata discovery', () => {
  it.each([
    'table',
    'cube',
    'statistic',
    'time_series',
    'variable',
    'value'
  ] as const)('passes the fixed %s object type to the client with trimmed code and defaults', async objectType => {
    await getMetadata.handleInvocation(createCtx({ objectType, code: ' 12411-0001 ' }));

    expect(clientMocks.getMetadata).toHaveBeenCalledWith({
      language: 'en',
      objectType,
      code: '12411-0001',
      area: 'public'
    });
  });

  it.each([
    { objectType: 'tables', code: '12411-0001' },
    { objectType: '../data/tablefile', code: '12411-0001' },
    { objectType: 'table', code: '   ' },
    { objectType: 'table', code: '1234567890123456' }
  ])('rejects invalid bounded metadata input %#', async input => {
    await expect(getMetadata.handleInvocation(createCtx(input))).rejects.toBeInstanceOf(
      ServiceError
    );
    expect(clientMocks.getMetadata).not.toHaveBeenCalled();
  });

  it('maps table metadata, summarizes dimensions, and preserves the raw object', async () => {
    let rawMetadata = {
      Code: '12411-0001',
      Content: 'Population by sex and year',
      Updated: '01.09.2026 12:30:00h',
      Time: { From: '1950', To: '2025' },
      Structure: {
        Columns: [
          {
            Code: 'JAHR',
            Content: 'Year',
            Type: 'time',
            Values: '76',
            Selected: '5'
          }
        ],
        Rows: {
          Code: 'GES',
          Content: 'Sex',
          Type: 'classifying',
          Values: 3,
          Selected: 2
        }
      },
      ProviderSpecific: { nested: true }
    };
    clientMocks.getMetadata.mockResolvedValueOnce({
      data: rawMetadata,
      warning: 'Partial metadata',
      copyright: '© Destatis'
    });

    let result = await getMetadata.handleInvocation(
      createCtx({ objectType: 'table', code: '12411-0001' })
    );

    expect(result.output).toEqual({
      objectType: 'table',
      code: '12411-0001',
      title: 'Population by sex and year',
      updatedAt: '01.09.2026 12:30:00h',
      timeRange: '1950-2025',
      dimensions: [
        {
          code: 'JAHR',
          title: 'Year',
          type: 'time',
          valueCount: 76,
          selectedCount: 5
        },
        {
          code: 'GES',
          title: 'Sex',
          type: 'classifying',
          valueCount: 3,
          selectedCount: 2
        }
      ],
      metadata: rawMetadata,
      warning: 'Partial metadata',
      copyright: '© Destatis'
    });
  });

  it('accepts top-level table row and column aliases defensively', async () => {
    clientMocks.getMetadata.mockResolvedValueOnce({
      data: {
        Code: '12411-0001',
        Columns: [{ Code: 'JAHR', Content: 'Year' }],
        Rows: [{ Code: 'GES', Content: 'Sex' }]
      }
    });

    let result = await getMetadata.handleInvocation(
      createCtx({ objectType: 'table', code: '12411-0001' })
    );

    expect(result.output).toMatchObject({
      dimensions: [
        { code: 'JAHR', title: 'Year' },
        { code: 'GES', title: 'Sex' }
      ]
    });
  });

  it('summarizes the documented cube Structure.Axis shape without losing related contents', async () => {
    let rawMetadata = {
      Code: '12411BJ001',
      Content: 'Population cube',
      Structure: {
        Axis: [
          {
            Code: 'GES',
            Content: 'Sex',
            Type: 'classifying',
            Values: '3',
            Contents: [{ Code: 'BEV', Content: 'Population' }]
          },
          { Code: 'JAHR', Content: 'Year', Type: 'time', Values: 76, Selected: '1' },
          null,
          'malformed'
        ]
      }
    };
    clientMocks.getMetadata.mockResolvedValueOnce({ data: rawMetadata });

    let result = await getMetadata.handleInvocation(
      createCtx({ objectType: 'cube', code: '12411BJ001' })
    );

    expect(result.output).toMatchObject({
      objectType: 'cube',
      code: '12411BJ001',
      dimensions: [
        { code: 'GES', title: 'Sex', type: 'classifying', valueCount: 3 },
        { code: 'JAHR', title: 'Year', type: 'time', valueCount: 76, selectedCount: 1 }
      ],
      metadata: rawMetadata
    });
  });

  it('accepts small defensive cube-axis aliases while ignoring malformed entries', async () => {
    let rawMetadata = {
      Code: '12411BJ001',
      Axes: [{ Code: 'GES', Content: 'Sex', Values: 3 }],
      Structure: {
        Dimensions: [{ Code: 'JAHR', Content: 'Year', Values: 76 }]
      }
    };
    clientMocks.getMetadata.mockResolvedValueOnce({ data: rawMetadata });

    let result = await getMetadata.handleInvocation(
      createCtx({ objectType: 'cube', code: '12411BJ001' })
    );

    expect(result.output).toMatchObject({
      dimensions: [
        { code: 'GES', title: 'Sex', valueCount: 3 },
        { code: 'JAHR', title: 'Year', valueCount: 76 }
      ]
    });
  });

  it.each([
    null,
    [],
    {},
    { Content: 'No code' }
  ])('fails malformed metadata payload %# instead of reporting success', async data => {
    clientMocks.getMetadata.mockResolvedValueOnce({ data });
    await expect(
      getMetadata.handleInvocation(createCtx({ objectType: 'table', code: '12411-0001' }))
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it('exports a bounded top-level object schema and safe read-only tags', () => {
    let defaults = getMetadata.inputSchema.safeParse({
      objectType: 'table',
      code: ' 12411-0001 '
    });
    let jsonSchema = z.toJSONSchema(getMetadata.inputSchema) as Record<string, unknown>;
    let properties = jsonSchema.properties as Record<
      string,
      { description?: string } | undefined
    >;

    expect(defaults).toMatchObject({
      success: true,
      data: { objectType: 'table', code: '12411-0001', area: 'public' }
    });
    expect(jsonSchema.type).toBe('object');
    expect(jsonSchema.oneOf).toBeUndefined();
    expect(jsonSchema.anyOf).toBeUndefined();
    expect(jsonSchema.allOf).toBeUndefined();
    expect(properties.code?.description).toContain('search_catalog');
    expect(properties.code?.description).toContain('list_variable_values');
    expect(getMetadata.instructions?.join(' ')).toContain('list_variable_values');
    expect(getMetadata.tags).toMatchObject({ readOnly: true, destructive: false });
  });
});
