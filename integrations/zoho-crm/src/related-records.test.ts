import { beforeEach, describe, expect, it, vi } from 'vitest';

let http = vi.hoisted(() => ({
  configs: [] as Record<string, unknown>[],
  calls: [] as Array<{ path: string; config?: unknown }>
}));

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();
  return {
    ...actual,
    createAxios: vi.fn((config: Record<string, unknown>) => {
      http.configs.push(config);
      return {
        get: vi.fn((path: string, requestConfig?: unknown) => {
          http.calls.push({ path, config: requestConfig });
          return Promise.resolve({
            data: { data: [{ id: 'note-1', Note_Title: 'Example' }], info: {} }
          });
        })
      };
    })
  };
});

import { getRelatedRecords } from './tools/get-related-records';

let invoke = (input: Record<string, unknown>) =>
  getRelatedRecords.handleInvocation({
    auth: { token: 'access-token', apiDomain: 'https://www.zohoapis.eu' },
    input
  } as any);

beforeEach(() => {
  http.configs.length = 0;
  http.calls.length = 0;
});

describe('Zoho CRM related-record fields', () => {
  it('sends id when callers omit the mandatory V8 fields parameter', async () => {
    let result = await invoke({
      module: 'Leads',
      recordId: 'lead-1',
      relatedModule: 'Notes',
      page: 2,
      perPage: 10
    });

    expect(http.calls).toEqual([
      {
        path: '/Leads/lead-1/Notes',
        config: { params: { fields: 'id', page: '2', per_page: '10' } }
      }
    ]);
    expect(result.output.records).toEqual([{ id: 'note-1', Note_Title: 'Example' }]);
  });

  it('forwards explicit related-module field API names', async () => {
    await invoke({
      module: 'Leads',
      recordId: 'lead-1',
      relatedModule: 'Notes',
      fields: ['id', 'Note_Title', 'Note_Content']
    });

    expect(http.calls[0]).toEqual({
      path: '/Leads/lead-1/Notes',
      config: { params: { fields: 'id,Note_Title,Note_Content' } }
    });
  });
});
