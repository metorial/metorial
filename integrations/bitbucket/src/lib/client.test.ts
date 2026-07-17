import { beforeEach, describe, expect, it, vi } from 'vitest';

let axiosMocks = vi.hoisted(() => ({
  api: {
    get: vi.fn(),
    interceptors: {
      response: {
        use: vi.fn()
      }
    }
  },
  createAxios: vi.fn()
}));

vi.mock('@slates/provider', async importOriginal => {
  let actual = await importOriginal<typeof import('@slates/provider')>();
  return {
    ...actual,
    createAxios: axiosMocks.createAxios
  };
});

import { Client } from './client';

beforeEach(() => {
  axiosMocks.api.get.mockReset();
  axiosMocks.api.interceptors.response.use.mockReset();
  axiosMocks.createAxios.mockReset();
  axiosMocks.createAxios.mockReturnValue(axiosMocks.api);
});

describe('Bitbucket code search client', () => {
  it('adds the documented repo modifier when repository scope is provided', async () => {
    axiosMocks.api.get.mockResolvedValue({ data: { values: [], size: 0 } });
    let client = new Client({ token: 'token', workspace: 'acme-workspace' });

    await client.searchCode('needle', {
      repository: 'repo-one',
      page: 2,
      pageLen: 10
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith('/workspaces/acme-workspace/search/code', {
      params: {
        search_query: 'needle repo:repo-one',
        page: '2',
        pagelen: '10'
      }
    });
  });
});
