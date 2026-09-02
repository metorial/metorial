import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

let clientMocks = vi.hoisted(() => ({
  listVariableValues: vi.fn()
}));

vi.mock('../lib/client', () => ({
  GenesisClient: vi.fn(() => clientMocks)
}));

import { listVariableValues } from './list-variable-values';

let createCtx = (input: Record<string, unknown>) =>
  ({
    input,
    auth: { token: 'token' },
    config: { language: 'de' }
  }) as never;

beforeEach(() => {
  clientMocks.listVariableValues.mockReset();
  clientMocks.listVariableValues.mockResolvedValue({ data: [] });
});

describe('Destatis variable value discovery', () => {
  it('trims inputs and maps wildcard/default criteria, area, page length, and language', async () => {
    await listVariableValues.handleInvocation(createCtx({ variableCode: ' GES ' }));

    expect(clientMocks.listVariableValues).toHaveBeenCalledWith({
      language: 'de',
      variableCode: 'GES',
      selection: '*',
      searchCriterion: 'code',
      sortCriterion: 'code',
      area: 'public',
      pageLength: 100,
      allowNoResult: true
    });
  });

  it('passes explicit content criteria and trimmed selection', async () => {
    await listVariableValues.handleInvocation(
      createCtx({
        variableCode: ' GES ',
        selection: ' female ',
        searchCriterion: 'content',
        sortCriterion: 'content',
        area: 'all',
        pageLength: 1000
      })
    );

    expect(clientMocks.listVariableValues).toHaveBeenCalledWith({
      language: 'de',
      variableCode: 'GES',
      selection: 'female',
      searchCriterion: 'content',
      sortCriterion: 'content',
      area: 'all',
      pageLength: 1000,
      allowNoResult: true
    });
  });

  it.each([
    { variableCode: '   ' },
    { variableCode: '1234567890123456' },
    { variableCode: 'GES', selection: '   ' },
    { variableCode: 'GES', selection: '1234567890123456' },
    { variableCode: 'GES', pageLength: 1001 }
  ])('rejects invalid bounded value discovery input %#', async input => {
    await expect(listVariableValues.handleInvocation(createCtx(input))).rejects.toBeInstanceOf(
      ServiceError
    );
    expect(clientMocks.listVariableValues).not.toHaveBeenCalled();
  });

  it('maps provider List entries to stable fields without Parameter or unknown data', async () => {
    clientMocks.listVariableValues.mockResolvedValueOnce({
      data: [
        {
          Code: '1',
          Content: 'Male',
          Variables: '12',
          Information: 'true',
          Parameter: { username: 'must-not-escape' },
          Unexpected: 'must-not-escape'
        },
        {
          Code: '2',
          Content: 'Female',
          Variables: 13,
          Information: false
        }
      ],
      warning: 'Partial result',
      copyright: '© Destatis'
    });

    let result = await listVariableValues.handleInvocation(createCtx({ variableCode: 'GES' }));

    expect(result.output).toEqual({
      variableCode: 'GES',
      values: [
        { code: '1', title: 'Male', variableCount: 12, hasInformation: true },
        { code: '2', title: 'Female', variableCount: 13, hasInformation: false }
      ],
      warning: 'Partial result',
      copyright: '© Destatis'
    });
  });

  it.each([
    null,
    {},
    ['bad'],
    [{ Code: '1' }],
    [{ Content: 'No code' }]
  ])('fails malformed value payload %# rather than returning false empty success', async data => {
    clientMocks.listVariableValues.mockResolvedValueOnce({ data });
    await expect(
      listVariableValues.handleInvocation(createCtx({ variableCode: 'GES' }))
    ).rejects.toBeInstanceOf(ServiceError);
  });

  it('retains a usable empty warning result', async () => {
    clientMocks.listVariableValues.mockResolvedValueOnce({
      data: [],
      warning: 'No values found',
      copyright: '© Destatis'
    });

    let result = await listVariableValues.handleInvocation(createCtx({ variableCode: 'GES' }));
    expect(result.output).toEqual({
      variableCode: 'GES',
      values: [],
      warning: 'No values found',
      copyright: '© Destatis'
    });
  });

  it('exports a bounded top-level object schema and safe read-only tags', () => {
    let defaults = listVariableValues.inputSchema.safeParse({ variableCode: ' GES ' });
    let jsonSchema = z.toJSONSchema(listVariableValues.inputSchema) as Record<string, unknown>;

    expect(defaults).toMatchObject({
      success: true,
      data: {
        variableCode: 'GES',
        selection: '*',
        searchCriterion: 'code',
        sortCriterion: 'code',
        area: 'public',
        pageLength: 100
      }
    });
    expect(jsonSchema.type).toBe('object');
    expect(jsonSchema.oneOf).toBeUndefined();
    expect(jsonSchema.anyOf).toBeUndefined();
    expect(jsonSchema.allOf).toBeUndefined();
    expect(listVariableValues.tags).toMatchObject({
      readOnly: true,
      destructive: false
    });
  });
});
