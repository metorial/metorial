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
  id: 'request-1',
  repositories: [{ url: 'https://bitbucket.org/acme-workspace/repo-one', name: 'repo-one' }],
  matched_files: [
    {
      path: 'src/index.ts',
      url: 'https://bitbucket.org/acme-workspace/repo-one/src/abc123/src/index.ts',
      matched_chunks: [
        {
          source_code: 'let a = 1;\nneedle();\nlet b = 2;',
          line_range: { start: 11, end: 13 },
          matched_line_numbers: [12]
        }
      ]
    }
  ],
  metadata: { total_count: 1 },
  pagination: { has_more: true, next_cursor: 'cursor-2' }
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
      pageLen: 10
    });

    expect(bitbucketClientMocks.clients).toEqual([
      { token: 'test-token', workspace: 'acme-workspace' }
    ]);
    expect(bitbucketClientMocks.searchCode).toHaveBeenCalledWith({
      query: {
        search_term: 'needle',
        filters: { attribute: 'repository', eq: 'repo-one' }
      },
      config: { max_results: 10 }
    });
    expect(result.output).toEqual({
      results: [
        {
          repoSlug: 'repo-one',
          repoFullName: 'acme-workspace/repo-one',
          filePath: 'src/index.ts',
          matchingLines: [{ line: 12, text: 'needle();' }]
        }
      ],
      totalCount: 1,
      hasNextPage: true,
      nextPageToken: btoa(JSON.stringify({ requestId: 'request-1', cursor: 'cursor-2' }))
    });
    expect(result.message).toContain('in **repo-one**');
  });

  it('accepts the legacy searchQuery field', async () => {
    let client = createBitbucketToolTestClient();

    await client.invokeTool('search_code', { searchQuery: '  legacy term  ' });

    expect(bitbucketClientMocks.searchCode).toHaveBeenCalledWith({
      query: { search_term: 'legacy term' }
    });
  });

  it('prefers query when both query fields are supplied', async () => {
    let client = createBitbucketToolTestClient();

    await client.invokeTool('search_code', {
      query: 'canonical term',
      searchQuery: 'legacy term'
    });

    expect(bitbucketClientMocks.searchCode).toHaveBeenCalledWith({
      query: { search_term: 'canonical term' }
    });
  });

  it('turns query modifiers into filters and resumes from a page token', async () => {
    let client = createBitbucketToolTestClient();

    await client.invokeTool('search_code', {
      query: 'needle repo:repo-* lang:go',
      pageToken: btoa(JSON.stringify({ requestId: 'request-1', cursor: 'cursor-2' }))
    });

    expect(bitbucketClientMocks.searchCode).toHaveBeenCalledWith({
      query: {
        search_term: 'needle',
        filters: {
          and: [
            { attribute: 'repository', wildcard: 'repo-*' },
            { attribute: 'language', eq: 'go' }
          ]
        }
      },
      request_id: 'request-1',
      pagination: { next_cursor: 'cursor-2' }
    });
  });

  it.each([
    ['neither query field', {}, 'Provide a code search query.'],
    ['blank query', { query: '   ' }, 'Provide a code search query.'],
    ['blank legacy query', { searchQuery: '\t' }, 'Provide a code search query.'],
    [
      'both query fields blank',
      { query: ' ', searchQuery: '  ' },
      'Provide a code search query.'
    ],
    [
      'repository scope in both fields',
      { query: 'needle repo:repo-two', repository: 'repo-one' },
      'Provide repository either with the repository field or a repo: modifier in query, not both.'
    ],
    [
      'a page number without a page token',
      { query: 'needle', page: 2 },
      'Bitbucket code search does not support page numbers.'
    ],
    ['an out-of-range pageLen', { query: 'needle', pageLen: 500 }, 'pageLen must be'],
    ['a malformed page token', { query: 'needle', pageToken: 'nope' }, 'Invalid pageToken.']
  ])('rejects %s before calling Bitbucket', async (_label, input, message) => {
    let client = createBitbucketToolTestClient();

    await expect(client.invokeTool('search_code', input)).rejects.toThrow(message);

    expect(bitbucketClientMocks.searchCode).not.toHaveBeenCalled();
  });
});
