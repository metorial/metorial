import { beforeEach, describe, expect, it, vi } from 'vitest';

let axiosMocks = vi.hoisted(() => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
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
  axiosMocks.api.post.mockReset();
  axiosMocks.api.post.mockResolvedValue({ data: {} });
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

describe('Bitbucket source client', () => {
  it.each([
    'e5626804d6c3c238dac1add29e754cf2190d2417',
    '071b90683'
  ])('uses commit revision %s without probing refs', async revision => {
    axiosMocks.api.get.mockResolvedValue({ data: 'file contents' });
    let client = new Client({ token: 'token', workspace: 'acme-workspace' });

    await client.getSource('repo-one', {
      revision,
      path: 'src/file name.ts'
    });

    expect(axiosMocks.api.get).toHaveBeenCalledTimes(1);
    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      `/repositories/acme-workspace/repo-one/src/${revision}/src/file%20name.ts`
    );
  });
});

describe('Bitbucket repository paths', () => {
  it('accepts a repository full name from the configured workspace', async () => {
    axiosMocks.api.get.mockResolvedValue({ data: { values: [] } });
    let client = new Client({ token: 'token', workspace: 'acme-workspace' });

    await client.getRepository('acme-workspace/repo-one');
    await client.listPullRequests('acme-workspace/repo-one');
    await client.getPullRequest('acme-workspace/repo-one', 42);
    await client.createPullRequest('acme-workspace/repo-one', {
      title: 'Repository path test'
    });
    await client.listPullRequestComments('acme-workspace/repo-one', 42);
    await client.getSource('acme-workspace/repo-one', {
      revision: 'e5626804d6c3c238dac1add29e754cf2190d2417',
      path: 'README.md'
    });

    expect(axiosMocks.api.get.mock.calls.map(([path]) => path)).toEqual([
      '/repositories/acme-workspace/repo-one',
      '/repositories/acme-workspace/repo-one/pullrequests',
      '/repositories/acme-workspace/repo-one/pullrequests/42',
      '/repositories/acme-workspace/repo-one/pullrequests/42/comments',
      '/repositories/acme-workspace/repo-one/src/e5626804d6c3c238dac1add29e754cf2190d2417/README.md'
    ]);
    expect(axiosMocks.api.post).toHaveBeenCalledWith(
      '/repositories/acme-workspace/repo-one/pullrequests',
      { title: 'Repository path test' }
    );
  });
});

describe('Bitbucket commits client', () => {
  it('passes slash-containing branch names through the documented include query', async () => {
    axiosMocks.api.get.mockResolvedValue({ data: { values: [] } });
    let client = new Client({ token: 'token', workspace: 'acme-workspace' });

    await client.listCommits('acme-workspace/repo-one', {
      branch: 'build/OPS/update-runtime',
      page: 2,
      pageLen: 10
    });

    expect(axiosMocks.api.get).toHaveBeenCalledWith(
      '/repositories/acme-workspace/repo-one/commits',
      {
        params: {
          include: 'build/OPS/update-runtime',
          page: '2',
          pagelen: '10'
        }
      }
    );
  });
});
