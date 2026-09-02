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
