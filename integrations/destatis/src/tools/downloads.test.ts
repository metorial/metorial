import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

let clientMocks = vi.hoisted(() => ({
  downloadTable: vi.fn(),
  downloadCube: vi.fn()
}));

vi.mock('../lib/client', () => ({
  GenesisClient: vi.fn(() => clientMocks)
}));

import { downloadCube } from './download-cube';
import { downloadTable } from './download-table';

let createCtx = (input: Record<string, unknown>) =>
  ({
    input,
    auth: { token: 'token' },
    config: { language: 'en' }
  }) as never;

let tableFile = {
  contentBase64: Buffer.from('PK\u0003\u0004table').toString('base64'),
  mimeType: 'application/zip',
  byteLength: 9,
  fileName: '12411-0001.zip',
  isArchive: true
};

let cubeFile = {
  contentBase64: Buffer.from('code,value\nA,1\n').toString('base64'),
  mimeType: 'text/csv',
  byteLength: 15,
  fileName: '12411BJ01.csv',
  isArchive: false
};

beforeEach(() => {
  clientMocks.downloadTable.mockReset();
  clientMocks.downloadCube.mockReset();
  clientMocks.downloadTable.mockResolvedValue(tableFile);
  clientMocks.downloadCube.mockResolvedValue(cubeFile);
});

describe('download_table', () => {
  it('trims the code, applies documented defaults, and returns one file with metadata only', async () => {
    let result = await downloadTable.handleInvocation(
      createCtx({ tableCode: ' 12411-0001 ' })
    );

    expect(clientMocks.downloadTable).toHaveBeenCalledWith({
      language: 'en',
      tableCode: '12411-0001',
      area: 'public',
      format: 'ffcsv',
      compress: false,
      transpose: false,
      contents: undefined,
      startYear: undefined,
      endYear: undefined,
      timeSlices: undefined,
      regionalSelection: undefined,
      classifyingSelections: undefined,
      updatedAfter: undefined
    });
    expect(result.output).toEqual({
      tableCode: '12411-0001',
      format: 'ffcsv',
      fileName: '12411-0001.zip',
      mimeType: 'application/zip',
      byteLength: 9,
      isArchive: true
    });
    expect(result.attachments).toHaveLength(1);
    expect(result.output).not.toHaveProperty('contentBase64');
    expect(result.output).not.toHaveProperty('content');
    expect(result.output).not.toHaveProperty('attachmentCount');
    expect(JSON.stringify(result.output)).not.toContain(tableFile.contentBase64);
  });

  it('passes bounded contents, periods, and structured filters without exposing job', async () => {
    await downloadTable.handleInvocation(
      createCtx({
        tableCode: '12411-0001',
        area: 'all',
        format: 'xlsx',
        compress: true,
        transpose: true,
        contents: [' BEV ', 'RATE'],
        startYear: '2020/21',
        endYear: '2024/25',
        timeSlices: 5,
        regionalSelection: { variableCode: ' DLAND ', valueCodes: [' 01 '] },
        classifyingSelections: [{ variableCode: 'GES', valueCodes: ['1', '2'] }],
        updatedAfter: '29.02.2024 23:59',
        job: true
      })
    );

    expect(clientMocks.downloadTable).toHaveBeenCalledWith({
      language: 'en',
      tableCode: '12411-0001',
      area: 'all',
      format: 'xlsx',
      compress: true,
      transpose: true,
      contents: ['BEV', 'RATE'],
      startYear: '2020/21',
      endYear: '2024/25',
      timeSlices: 5,
      regionalSelection: { variableCode: 'DLAND', valueCodes: ['01'] },
      classifyingSelections: [{ variableCode: 'GES', valueCodes: ['1', '2'] }],
      updatedAfter: '29.02.2024 23:59'
    });
    expect(downloadTable.inputSchema.safeParse({ tableCode: '1', job: true })).toMatchObject({
      success: true,
      data: expect.not.objectContaining({ job: expect.anything() })
    });
  });

  it.each([
    { tableCode: '' },
    { tableCode: '12345678901' },
    { tableCode: '1', contents: [] },
    { tableCode: '1', contents: ['1234567'] },
    { tableCode: '1', contents: [','] },
    { tableCode: '1', contents: ['1,2'] },
    { tableCode: '1', contents: ['A\u0000B'] },
    { tableCode: '1', contents: ['A\nB'] },
    { tableCode: '1', contents: ['A\u007fB'] },
    { tableCode: '1', contents: ['BEV', ' BEV '] },
    { tableCode: '1', startYear: '1899' },
    { tableCode: '1', startYear: '2101' },
    { tableCode: '1', startYear: '2024-25' },
    { tableCode: '1', startYear: '2025', endYear: '2024' },
    { tableCode: '1', timeSlices: 0 },
    { tableCode: '1', updatedAfter: '31.02.2024' },
    { tableCode: '1', updatedAfter: '29.02.2023' },
    { tableCode: '1', updatedAfter: '01.01.2024 24:00' },
    { tableCode: '1', regionalSelection: { variableCode: 'DLAND', valueCodes: [] } },
    {
      tableCode: '1',
      regionalSelection: { variableCode: 'DLAND', valueCodes: ['01', ' 01 '] }
    },
    {
      tableCode: '1',
      regionalSelection: { variableCode: 'DLAND', valueCodes: [','] }
    },
    {
      tableCode: '1',
      regionalSelection: { variableCode: 'D,L', valueCodes: ['01'] }
    },
    {
      tableCode: '1',
      classifyingSelections: [{ variableCode: 'GES', valueCodes: ['1,2'] }]
    },
    {
      tableCode: '1',
      classifyingSelections: [{ variableCode: 'G\nS', valueCodes: ['1'] }]
    },
    { tableCode: '1', classifyingSelections: [] },
    {
      tableCode: '1',
      classifyingSelections: [
        { variableCode: 'GES', valueCodes: ['1'] },
        { variableCode: 'GES', valueCodes: ['2'] }
      ]
    },
    {
      tableCode: '1',
      classifyingSelections: Array.from({ length: 6 }, (_, index) => ({
        variableCode: `V${index}`,
        valueCodes: ['*']
      }))
    }
  ])('rejects invalid table input %# before transport', async input => {
    await expect(downloadTable.handleInvocation(createCtx(input))).rejects.toBeInstanceOf(
      ServiceError
    );
    expect(clientMocks.downloadTable).not.toHaveBeenCalled();
  });

  it('documents compress as shape suppression and hides job from the public schema', () => {
    let jsonSchema = z.toJSONSchema(downloadTable.inputSchema) as {
      type?: unknown;
      properties?: Record<string, { description?: string }>;
    };
    expect(jsonSchema.type).toBe('object');
    expect(jsonSchema.properties?.compress?.description).toMatch(/suppress empty rows/i);
    expect(jsonSchema.properties?.compress?.description).toMatch(/does not control ZIP/i);
    expect(jsonSchema.properties?.job).toBeUndefined();
  });

  it('documents the outer response and expanded archive/XML safety limits', () => {
    let constraints = (downloadTable.constraints ?? []).join(' ');
    expect(constraints).toMatch(/64 MiB.*response/i);
    expect(constraints).toMatch(/32 MiB after expansion/i);
    expect(constraints).toMatch(/4,096.*entries/i);
    expect(constraints).toMatch(/200 times.*1 MiB/i);
    expect(constraints).toMatch(/GENML\/XML.*32 MiB/i);
  });

  it('accepts provider codes containing URL-encoded literals and internal spaces', async () => {
    await downloadTable.handleInvocation(
      createCtx({
        tableCode: '1',
        contents: ['A&B', 'A=B', 'A/B', 'A B'],
        regionalSelection: { variableCode: 'D&=/', valueCodes: ['A&B'] },
        classifyingSelections: [{ variableCode: 'G &', valueCodes: ['X=Y', 'X/Y', 'X Y'] }]
      })
    );

    expect(clientMocks.downloadTable).toHaveBeenCalledWith(
      expect.objectContaining({
        contents: ['A&B', 'A=B', 'A/B', 'A B'],
        regionalSelection: { variableCode: 'D&=/', valueCodes: ['A&B'] },
        classifyingSelections: [{ variableCode: 'G &', valueCodes: ['X=Y', 'X/Y', 'X Y'] }]
      })
    );
  });
});

describe('download_cube', () => {
  it('applies cube defaults and returns one CSV file with metadata only', async () => {
    let result = await downloadCube.handleInvocation(createCtx({ cubeCode: ' 12411BJ01 ' }));

    expect(clientMocks.downloadCube).toHaveBeenCalledWith({
      language: 'en',
      cubeCode: '12411BJ01',
      area: 'public',
      includeValues: true,
      includeMetadata: true,
      includeAdditionalMetadata: false,
      contents: undefined,
      startYear: undefined,
      endYear: undefined,
      timeSlices: undefined,
      regionalSelection: undefined,
      classifyingSelections: undefined,
      updatedAfter: undefined
    });
    expect(result.output).toEqual({
      cubeCode: '12411BJ01',
      format: 'csv',
      fileName: '12411BJ01.csv',
      mimeType: 'text/csv',
      byteLength: 15,
      isArchive: false
    });
    expect(result.attachments).toHaveLength(1);
    expect(result.output).not.toHaveProperty('contentBase64');
    expect(result.output).not.toHaveProperty('content');
    expect(result.output).not.toHaveProperty('attachmentCount');
  });

  it('documents the CSV response size limit without implying archive expansion', () => {
    let constraints = (downloadCube.constraints ?? []).join(' ');
    expect(constraints).toMatch(/CSV response.*64 MiB/i);
    expect(constraints).not.toMatch(/expanded ZIP|GENML/i);
  });

  it('passes explicit cube-only flags and at most three selections', async () => {
    await downloadCube.handleInvocation(
      createCtx({
        cubeCode: '12411BJ01',
        includeValues: false,
        includeMetadata: false,
        includeAdditionalMetadata: true,
        classifyingSelections: [
          { variableCode: 'GES', valueCodes: ['1'] },
          { variableCode: 'ALTER', valueCodes: ['A01'] },
          { variableCode: 'JAHR', valueCodes: ['2024'] }
        ]
      })
    );

    expect(clientMocks.downloadCube).toHaveBeenCalledWith(
      expect.objectContaining({
        includeValues: false,
        includeMetadata: false,
        includeAdditionalMetadata: true,
        classifyingSelections: [
          { variableCode: 'GES', valueCodes: ['1'] },
          { variableCode: 'ALTER', valueCodes: ['A01'] },
          { variableCode: 'JAHR', valueCodes: ['2024'] }
        ]
      })
    );
  });

  it.each([
    { cubeCode: '' },
    { cubeCode: '12345678901' },
    { cubeCode: '1', contents: ['A,B'] },
    { cubeCode: '1', contents: ['A\rB'] },
    {
      cubeCode: '1',
      classifyingSelections: [{ variableCode: 'GES', valueCodes: ['1', ' 1 '] }]
    },
    { cubeCode: '1', classifyingSelections: [] },
    { cubeCode: '1', updatedAfter: '00.01.2024' },
    {
      cubeCode: '1',
      classifyingSelections: Array.from({ length: 4 }, (_, index) => ({
        variableCode: `V${index}`,
        valueCodes: ['*']
      }))
    }
  ])('rejects invalid cube input %# before transport', async input => {
    await expect(downloadCube.handleInvocation(createCtx(input))).rejects.toBeInstanceOf(
      ServiceError
    );
    expect(clientMocks.downloadCube).not.toHaveBeenCalled();
  });

  it('does not expose a format input because cube downloads always use CSV', () => {
    let jsonSchema = z.toJSONSchema(downloadCube.inputSchema) as {
      properties?: Record<string, unknown>;
    };
    expect(jsonSchema.properties?.format).toBeUndefined();
  });
});
