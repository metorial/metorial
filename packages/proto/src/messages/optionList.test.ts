import { describe, expect, it } from 'vitest';
import { slatesRequestsByMethod, slatesResponsesByMethod } from './index';
import {
  slatesMessageOptionListOptionsListRequest,
  slatesMessageOptionListOptionsListResponse
} from './optionList';

describe('option list wire contract', () => {
  it('registers the options list method', () => {
    expect(slatesRequestsByMethod['slates/option_list.options_list']).toBe(
      slatesMessageOptionListOptionsListRequest
    );
    expect(slatesResponsesByMethod['slates/option_list.options_list']).toBe(
      slatesMessageOptionListOptionsListResponse
    );
  });

  it('accepts optional query, page token and params', () => {
    let request = (params: Record<string, unknown>) =>
      slatesMessageOptionListOptionsListRequest.safeParse({
        jsonrpc: '2.0',
        id: '1',
        method: 'slates/option_list.options_list',
        params
      }).success;

    expect(request({ optionListId: 'files' })).toBe(true);
    expect(
      request({
        optionListId: 'files',
        query: null,
        pageToken: { offset: 1 },
        params: { kind: 'sheet' }
      })
    ).toBe(true);
    expect(request({ query: 'x' })).toBe(false);

    expect(
      slatesMessageOptionListOptionsListResponse.parse({
        jsonrpc: '2.0',
        id: '1',
        result: { options: [{ value: 1, label: 'One' }], nextPageToken: null }
      }).result
    ).toEqual({ options: [{ value: 1, label: 'One' }], nextPageToken: null });
  });
});
