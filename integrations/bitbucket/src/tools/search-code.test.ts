import { createLocalSlateTestClient } from '@slates/test';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let bitbucketClientMocks = vi.hoisted(() => ({
  clients: [] as Array<{ token: string; workspace: string }>,
  searchCode: vi.fn()
}));

vi.mock('../lib/client', () => ({
  Client: class {
    constructor(params: { token: string; workspace: string }) {
      bitbucketClientMocks.clients.push(params);
    }

    searchCode(...args: unknown[]) {
      return bitbucketClientMocks.searchCode(...args);
    }
  }
}));

import { provider } from '../index';

let createBitbucketToolTestClient = () =>
  createLocalSlateTestClient({
    slate: provider as any,
    state: {
      config: { workspace: 'acme-workspace' },
      auth: {
        authenticationMethodId: 'oauth',
        output: { token: 'test-token' }
      }
    }
  });

let searchResponse = {
  values: [
    {
      file: {
        path: 'src/index.ts',
        links: {
          self: {
            href: 'https://api.bitbucket.org/2.0/repositories/acme-workspace/repo-one/src/abc123/src/index.ts'
          }
        }
      },
      content_matches: [
        {
          lines: [
            {
              line: 12,
              segments: [{ text: 'needle', match: true }]
            }
          ]
        }
      ]
    }
  ],
  size: 1,
  next: 'next-page'
};

beforeEach(() => {
  bitbucketClientMocks.clients.splice(0);
  bitbucketClientMocks.searchCode.mockReset();
  bitbucketClientMocks.searchCode.mockResolvedValue(searchResponse);
});

describe('Bitbucket search_code input compatibility', () => {
  it('uses query, trims repository scope, and maps matching results', async () => {
    let client = createBitbucketToolTestClient();
    let result = await client.invokeTool('search_code', {
      query: '  needle  ',
      repository: '  repo-one  ',
      page: 2,
      pageLen: 10
    });

    expect(bitbucketClientMocks.clients).toEqual([
      { token: 'test-token', workspace: 'acme-workspace' }
    ]);
    expect(bitbucketClientMocks.searchCode).toHaveBeenCalledWith('needle', {
      repository: 'repo-one',
      page: 2,
      pageLen: 10
    });
    expect(result.output).toEqual({
      results: [
        {
          repoSlug: 'repo-one',
          repoFullName: 'acme-workspace/repo-one',
          filePath: 'src/index.ts',
          matchingLines: [{ line: 12, text: 'needle' }]
        }
      ],
      totalCount: 1,
      hasNextPage: true
    });
    expect(result.message).toContain('in **repo-one**');
  });

  it('accepts the legacy searchQuery field', async () => {
    let client = createBitbucketToolTestClient();

    await client.invokeTool('search_code', { searchQuery: '  legacy term  ' });

    expect(bitbucketClientMocks.searchCode).toHaveBeenCalledWith('legacy term', {
      repository: undefined,
      page: undefined,
      pageLen: undefined
    });
  });

  it('prefers query when both query fields are supplied', async () => {
    let client = createBitbucketToolTestClient();

    await client.invokeTool('search_code', {
      query: 'canonical term',
      searchQuery: 'legacy term'
    });

    expect(bitbucketClientMocks.searchCode).toHaveBeenCalledWith('canonical term', {
      repository: undefined,
      page: undefined,
      pageLen: undefined
    });
  });

  it.each([
    ['neither query field', {}],
    ['blank query', { query: '   ' }],
    ['blank legacy query', { searchQuery: '\t' }],
    ['both query fields blank', { query: ' ', searchQuery: '  ' }]
  ])('rejects %s before calling Bitbucket', async (_label, input) => {
    let client = createBitbucketToolTestClient();

    await expect(client.invokeTool('search_code', input)).rejects.toThrow(
      'Provide a code search query.'
    );

    expect(bitbucketClientMocks.searchCode).not.toHaveBeenCalled();
  });

  it('rejects repository scope supplied in both fields', async () => {
    let client = createBitbucketToolTestClient();

    await expect(
      client.invokeTool('search_code', {
        query: 'needle repo:repo-two',
        repository: 'repo-one'
      })
    ).rejects.toThrow(
      'Provide repository either with the repository field or a repo: modifier in query, not both.'
    );

    expect(bitbucketClientMocks.searchCode).not.toHaveBeenCalled();
  });
});
