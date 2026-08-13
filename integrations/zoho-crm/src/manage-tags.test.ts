import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type HttpCall = {
  method: 'get' | 'post';
  path: string;
  body?: unknown;
  config?: unknown;
};

let http = vi.hoisted(() => ({
  configs: [] as Record<string, unknown>[],
  calls: [] as HttpCall[],
  responses: [] as unknown[]
}));

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();
  let response = () => Promise.resolve({ data: http.responses.shift() });

  return {
    ...actual,
    createAxios: vi.fn((config: Record<string, unknown>) => {
      http.configs.push(config);
      return {
        get: vi.fn((path: string, requestConfig?: unknown) => {
          http.calls.push({ method: 'get', path, config: requestConfig });
          return response();
        }),
        post: vi.fn((path: string, body?: unknown) => {
          http.calls.push({ method: 'post', path, body });
          return response();
        })
      };
    })
  };
});

import { manageTags } from './tools/manage-tags';

let invoke = (input: Record<string, unknown>) =>
  manageTags.handleInvocation({
    auth: { token: 'access-token', apiDomain: 'https://www.zohoapis.eu' },
    input
  } as any);

let queue = (...responses: unknown[]) => http.responses.push(...responses);

beforeEach(() => {
  http.configs.length = 0;
  http.calls.length = 0;
  http.responses.length = 0;
});

describe('Zoho CRM V8 tag contract', () => {
  it('lists module tags with the documented query and maps the tags response', async () => {
    let tag = {
      id: '3652397000000371014',
      name: 'Pharma',
      color_code: '#57B1FD',
      created_time: '2018-12-28T16:49:07+05:30',
      modified_time: '2019-02-18T23:17:47+05:30',
      created_by: { id: '3652397000000186017', name: 'Patricia Boyle' },
      modified_by: { id: '3652397000000186017', name: 'Patricia Boyle' }
    };
    queue({ tags: [tag], info: { count: 1, allowed_count: 20 } });

    let result = await invoke({ action: 'list', module: 'Leads', myTags: true });

    expect(http.configs[0]).toMatchObject({
      baseURL: 'https://www.zohoapis.eu/crm/v8',
      headers: { Authorization: 'Zoho-oauthtoken access-token' }
    });
    expect(http.calls).toEqual([
      {
        method: 'get',
        path: '/settings/tags',
        config: { params: { module: 'Leads', my_tags: 'true' } }
      }
    ]);
    expect(result.output).toEqual({ tags: [tag] });
  });

  it('adds tags with documented names, record IDs, and overwrite payload', async () => {
    let mutation = {
      code: 'SUCCESS',
      details: {
        id: '4876876000003643731',
        tags: [
          { name: 'Nurturing Lead', id: '4876876000001140124', color_code: null },
          { name: 'Active', id: '4876876000001143001', color_code: '#F17574' }
        ]
      },
      message: 'tags updated successfully',
      status: 'success'
    };
    queue({ data: [mutation], success_count: '1', locked_count: '0' });

    let result = await invoke({
      action: 'add',
      module: 'Leads',
      recordIds: ['4876876000003643731'],
      tagNames: ['Nurturing Lead', 'Active'],
      overWrite: true
    });

    expect(http.calls).toEqual([
      {
        method: 'post',
        path: '/Leads/actions/add_tags',
        body: {
          ids: ['4876876000003643731'],
          tags: [{ name: 'Nurturing Lead' }, { name: 'Active' }],
          over_write: true
        }
      }
    ]);
    expect(result.output).toEqual({ results: [mutation] });
  });

  it('removes tags with the documented names and record IDs payload', async () => {
    let mutation = {
      code: 'SUCCESS',
      details: {
        id: '554023000000793002',
        tags: [{ name: 'Nurture', id: '554023000002555018', color_code: '#57B1FD' }]
      },
      message: 'tags updated successfully',
      status: 'success'
    };
    queue({ data: [mutation], locked_count: '0' });

    let result = await invoke({
      action: 'remove',
      module: 'Leads',
      recordIds: ['554023000000793002'],
      tagNames: ['Prime', 'Attend First']
    });

    expect(http.calls).toEqual([
      {
        method: 'post',
        path: '/Leads/actions/remove_tags',
        body: {
          ids: ['554023000000793002'],
          tags: [{ name: 'Prime' }, { name: 'Attend First' }]
        }
      }
    ]);
    expect(result.output).toEqual({ results: [mutation] });
  });

  it.each([
    'add',
    'remove'
  ] as const)('rejects incomplete %s requests before HTTP', async action => {
    await expect(invoke({ action, module: 'Leads' })).rejects.toBeInstanceOf(ServiceError);
    expect(http.calls).toHaveLength(0);
  });
});
