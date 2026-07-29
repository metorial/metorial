import { describe, expect, it, vi } from 'vitest';
import { GitHubClient } from './lib/client';
import {
  createBranch,
  createRepository,
  getFileContents,
  getGlobalSecurityAdvisory,
  getRepositoryTree,
  issueRead,
  listGlobalSecurityAdvisories,
  mergePullRequest,
  pullRequestRead,
  pushFiles,
  subIssueWrite,
  updatePullRequestBranch
} from './tools';
import { mapCommit, mapRelease } from './tools/repository-read-contracts';

const invoke = (tool: any, input: unknown) =>
  tool.handleInvocation({
    auth: {
      token: 'test-token',
      instanceUrl: 'https://github.com'
    },
    config: {},
    input
  });

describe('GitHub read-tool runtime validation', () => {
  it('returns file content as an attachment without exposing transport metadata', async () => {
    const getContent = vi.spyOn(GitHubClient.prototype, 'getContent').mockResolvedValue({
      type: 'file',
      path: 'docs/runbook.md',
      sha: 'file-sha',
      size: 5,
      html_url: 'https://github.com/octocat/hello-world/blob/main/docs/runbook.md',
      download_url:
        'https://raw.githubusercontent.com/octocat/hello-world/main/docs/runbook.md',
      encoding: 'base64',
      content: 'aGVsbG8='
    });

    try {
      const result = await invoke(getFileContents, {
        owner: 'octocat',
        repo: 'hello-world',
        path: 'docs/runbook.md',
        ref: 'main'
      });

      expect(result.output).toMatchObject({
        type: 'file',
        path: 'docs/runbook.md',
        ref: 'main',
        sha: 'file-sha',
        size: 5
      });
      expect(result.output).not.toHaveProperty('attachmentReturned');
      expect(result.attachments).toEqual([
        {
          mimeType: 'application/octet-stream',
          content: {
            type: 'content',
            encoding: 'base64',
            content: 'aGVsbG8='
          }
        }
      ]);
    } finally {
      getContent.mockRestore();
    }
  });

  it('rejects REST pagination for non-paginated issue reads', async () => {
    await expect(
      invoke(issueRead, {
        method: 'get',
        owner: 'octocat',
        repo: 'hello-world',
        issue_number: 1,
        page: 2
      })
    ).rejects.toThrow('page and perPage are only supported');
  });

  it('keeps cursor and REST pagination separate for pull request reads', async () => {
    await expect(
      invoke(pullRequestRead, {
        method: 'get_review_comments',
        owner: 'octocat',
        repo: 'hello-world',
        pullNumber: 1,
        page: 2
      })
    ).rejects.toThrow('page cannot be used with "get_review_comments"');

    await expect(
      invoke(pullRequestRead, {
        method: 'get_files',
        owner: 'octocat',
        repo: 'hello-world',
        pullNumber: 1,
        after: 'cursor'
      })
    ).rejects.toThrow('after is only supported for "get_review_comments"');
  });

  it('enriches issue get results with hierarchy and custom-field signals', async () => {
    const getIssue = vi.spyOn(GitHubClient.prototype, 'getIssue').mockResolvedValue({
      id: 1,
      number: 17,
      title: 'Parent-aware issue',
      state: 'open',
      html_url: 'https://github.com/octocat/hello-world/issues/17',
      user: { login: 'octocat' },
      labels: [],
      assignees: [],
      comments: 0
    });
    const getIssueReadEnrichment = vi
      .spyOn(GitHubClient.prototype, 'getIssueReadEnrichment')
      .mockResolvedValue({
        hasParent: true,
        hasChildren: true,
        parent: {
          number: 3,
          title: 'Parent',
          state: 'OPEN',
          url: 'https://github.com/octocat/hello-world/issues/3',
          repository: { nameWithOwner: 'octocat/hello-world' }
        },
        subIssuesSummary: { total: 2, completed: 1, percentCompleted: 50 },
        fieldValues: [{ field: 'Priority', value: 'P1' }]
      });

    try {
      const result = await invoke(issueRead, {
        method: 'get',
        owner: 'octocat',
        repo: 'hello-world',
        issue_number: 17
      });

      expect(result.output.issue).toMatchObject({
        issueNumber: 17,
        hasParent: true,
        hasChildren: true,
        parent: { issueNumber: 3, repository: 'octocat/hello-world' },
        subIssuesSummary: { total: 2, completed: 1, percentCompleted: 50 },
        fieldValues: [{ field: 'Priority', value: 'P1' }]
      });
    } finally {
      getIssue.mockRestore();
      getIssueReadEnrichment.mockRestore();
    }
  });

  it('validates sub-issue operations with user-facing service errors', async () => {
    await expect(
      invoke(subIssueWrite, {
        method: 'reprioritize',
        owner: 'octocat',
        repo: 'hello-world',
        issue_number: 1,
        sub_issue_id: 42
      })
    ).rejects.toThrow('exactly one of after_id or before_id');

    await expect(
      invoke(subIssueWrite, {
        method: 'remove',
        owner: 'octocat',
        repo: 'hello-world',
        issue_number: 1,
        sub_issue_id: 42,
        replace_parent: true
      })
    ).rejects.toThrow('replace_parent is only supported');
  });
});

describe('GitHub read response mapping', () => {
  it('omits commit file details at none detail and includes patches at full_patch', () => {
    const value = {
      sha: 'abc123',
      html_url: 'https://github.com/octocat/hello-world/commit/abc123',
      commit: {
        message: 'Fix cache invalidation',
        author: { name: 'Octo Cat', email: 'octo@example.com', date: '2026-07-28T00:00:00Z' },
        committer: {
          name: 'Octo Cat',
          email: 'octo@example.com',
          date: '2026-07-28T00:00:00Z'
        }
      },
      parents: [],
      stats: { additions: 2, deletions: 1, total: 3 },
      files: [
        {
          filename: 'src/cache.ts',
          status: 'modified',
          additions: 2,
          deletions: 1,
          changes: 3,
          patch: '@@ -1 +1 @@'
        }
      ]
    };

    expect(mapCommit(value, 'none')).toMatchObject({
      sha: 'abc123',
      stats: undefined,
      files: undefined
    });
    expect(mapCommit(value, 'full_patch')).toMatchObject({
      stats: { additions: 2, deletions: 1, total: 3 },
      files: [{ filename: 'src/cache.ts', patch: '@@ -1 +1 @@' }]
    });
  });

  it('maps release assets and nullable release fields', () => {
    expect(
      mapRelease({
        id: 42,
        tag_name: 'v1.2.3',
        html_url: 'https://github.com/octocat/hello-world/releases/tag/v1.2.3',
        draft: false,
        prerelease: false,
        created_at: '2026-07-28T00:00:00Z',
        updated_at: '2026-07-28T00:00:00Z',
        assets: [
          {
            id: 7,
            name: 'artifact.zip',
            label: null,
            state: 'uploaded',
            content_type: 'application/zip',
            size: 1024,
            download_count: 3,
            browser_download_url: 'https://example.com/artifact.zip',
            created_at: '2026-07-28T00:00:00Z',
            updated_at: '2026-07-28T00:00:00Z'
          }
        ]
      })
    ).toMatchObject({
      releaseId: 42,
      tagName: 'v1.2.3',
      name: null,
      body: null,
      publishedAt: null,
      assets: [{ assetId: 7, name: 'artifact.zip', size: 1024 }]
    });
  });
});

describe('GitHub read request mapping', () => {
  it('maps list_issues inputs to the cursor-based GraphQL contract', async () => {
    const post = vi.fn().mockResolvedValue({
      data: {
        data: {
          repository: {
            issues: {
              totalCount: 1,
              pageInfo: {
                hasNextPage: false,
                hasPreviousPage: true,
                startCursor: 'start',
                endCursor: 'end'
              },
              nodes: [
                {
                  number: 17,
                  title: 'Issue',
                  state: 'OPEN',
                  url: 'https://github.com/octocat/hello-world/issues/17',
                  author: { login: 'octocat' },
                  assignees: { nodes: [] },
                  labels: { nodes: [{ name: 'bug' }] },
                  comments: { totalCount: 2 },
                  createdAt: '2026-07-28T00:00:00Z',
                  updatedAt: '2026-07-29T00:00:00Z',
                  issueFieldValues: { nodes: [] }
                }
              ]
            }
          }
        }
      }
    });
    const client = new GitHubClient({
      token: 'test-token',
      instanceUrl: 'https://github.com'
    });
    (client as any).http = { post };

    await expect(
      client.listIssues('octocat', 'hello-world', {
        state: 'OPEN',
        labels: ['bug'],
        orderBy: 'COMMENTS',
        direction: 'ASC',
        since: '2026-07-28',
        perPage: 10,
        after: 'previous-end'
      })
    ).resolves.toMatchObject({
      totalCount: 1,
      pageInfo: { endCursor: 'end' },
      nodes: [{ number: 17, fieldValues: [] }]
    });

    expect(post).toHaveBeenCalledWith(
      'https://api.github.com/graphql',
      expect.objectContaining({
        variables: {
          owner: 'octocat',
          repo: 'hello-world',
          first: 10,
          after: 'previous-end',
          states: ['OPEN'],
          labels: ['bug'],
          orderBy: { field: 'COMMENTS', direction: 'ASC' },
          since: '2026-07-28T00:00:00Z',
          issueFieldValues: []
        }
      }),
      { headers: { 'GraphQL-Features': 'issue_fields,repo_issue_fields' } }
    );
    const query = (post.mock.calls[0]?.[1] as { query?: string } | undefined)?.query;
    expect(query).toContain('... on IssueFieldText');
    expect(query).toContain('... on IssueFieldNumber');
    expect(query).toContain('... on IssueFieldDate');
    expect(query).toContain('... on IssueFieldSingleSelect');

    post.mockClear();
    await client.listIssues('octocat', 'hello-world', { labels: [] });

    const unfilteredRequest = post.mock.calls[0]?.[1] as
      | { query?: string; variables?: Record<string, unknown> }
      | undefined;
    expect(unfilteredRequest?.variables).toEqual({
      owner: 'octocat',
      repo: 'hello-world',
      first: 30,
      after: null,
      states: ['OPEN', 'CLOSED'],
      orderBy: { field: 'CREATED_AT', direction: 'DESC' },
      issueFieldValues: []
    });
    expect(unfilteredRequest?.query).not.toContain('$labels:');
    expect(unfilteredRequest?.query).not.toContain('labels: $labels');
    expect(unfilteredRequest?.query).not.toContain('$since:');
    expect(unfilteredRequest?.query).not.toContain('since: $since');
  });

  it('applies the official create and merge public input mappings', async () => {
    expect(
      (createRepository as any).inputSchema.parse({ name: 'private-by-default' })
    ).toEqual({
      name: 'private-by-default',
      private: true
    });

    const merge = vi.spyOn(GitHubClient.prototype, 'mergePullRequest').mockResolvedValue({
      merged: true,
      sha: 'merge-sha',
      message: 'merged'
    });
    try {
      await invoke(mergePullRequest, {
        owner: 'octocat',
        repo: 'hello-world',
        pullNumber: 7,
        commit_title: 'Merge title',
        commit_message: 'Merge detail',
        merge_method: 'squash'
      });

      expect(merge).toHaveBeenCalledWith('octocat', 'hello-world', 7, {
        commitTitle: 'Merge title',
        commitMessage: 'Merge detail',
        mergeMethod: 'squash'
      });
    } finally {
      merge.mockRestore();
    }
  });

  it('maps the added write tool inputs to their client operations', async () => {
    const create = vi.spyOn(GitHubClient.prototype, 'createBranch').mockResolvedValue({
      ref: 'refs/heads/feature',
      object: { sha: 'base-sha' },
      url: 'https://api.github.com/repos/octocat/hello-world/git/refs/heads/feature'
    });
    const push = vi.spyOn(GitHubClient.prototype, 'pushFiles').mockResolvedValue({
      ref: { ref: 'refs/heads/feature' },
      commit: { sha: 'commit-sha' },
      tree: { sha: 'tree-sha' }
    });
    const update = vi
      .spyOn(GitHubClient.prototype, 'updatePullRequestBranch')
      .mockResolvedValue({
        message: 'Updating pull request branch.',
        url: 'https://api.github.com'
      });
    const reprioritize = vi
      .spyOn(GitHubClient.prototype, 'reprioritizeSubIssue')
      .mockResolvedValue({ id: 42 });

    try {
      await invoke(createBranch, {
        owner: 'octocat',
        repo: 'hello-world',
        branch: 'feature',
        from_branch: 'main'
      });
      expect(create).toHaveBeenCalledWith('octocat', 'hello-world', 'feature', 'main');

      let pushResult = await invoke(pushFiles, {
        owner: 'octocat',
        repo: 'hello-world',
        branch: 'feature',
        files: [{ path: 'src/index.ts', content: 'export {};' }],
        message: 'Add entrypoint'
      });
      expect(push).toHaveBeenCalledWith(
        'octocat',
        'hello-world',
        'feature',
        [{ path: 'src/index.ts', content: 'export {};' }],
        'Add entrypoint'
      );
      expect(pushResult.output).toMatchObject({
        commitSha: 'commit-sha',
        treeSha: 'tree-sha'
      });

      await invoke(updatePullRequestBranch, {
        owner: 'octocat',
        repo: 'hello-world',
        pullNumber: 7,
        expectedHeadSha: 'head-sha'
      });
      expect(update).toHaveBeenCalledWith('octocat', 'hello-world', 7, 'head-sha');

      await invoke(subIssueWrite, {
        method: 'reprioritize',
        owner: 'octocat',
        repo: 'hello-world',
        issue_number: 5,
        sub_issue_id: 42,
        after_id: 41
      });
      expect(reprioritize).toHaveBeenCalledWith('octocat', 'hello-world', 5, 42, {
        afterId: 41,
        beforeId: undefined
      });
    } finally {
      create.mockRestore();
      push.mockRestore();
      update.mockRestore();
      reprioritize.mockRestore();
    }
  });

  it('maps repository tree and global advisory tool inputs', async () => {
    const getTree = vi.spyOn(GitHubClient.prototype, 'getRepositoryTree').mockResolvedValue({
      sha: 'tree-sha',
      truncated: false,
      tree: [
        {
          path: 'src/index.ts',
          type: 'blob',
          size: 12,
          mode: '100644',
          sha: 'blob-sha',
          url: 'https://api.github.com/tree/blob-sha'
        }
      ],
      tree_sha: 'main',
      owner: 'octocat',
      repo: 'hello-world',
      recursive: true,
      count: 1
    });
    const getAdvisory = vi
      .spyOn(GitHubClient.prototype, 'getGlobalSecurityAdvisory')
      .mockResolvedValue({ ghsa_id: 'GHSA-abcd-efgh-ijkl' });
    const listAdvisories = vi
      .spyOn(GitHubClient.prototype, 'listGlobalSecurityAdvisories')
      .mockResolvedValue([{ ghsa_id: 'GHSA-abcd-efgh-ijkl' }]);

    try {
      await invoke(getRepositoryTree, {
        owner: 'octocat',
        repo: 'hello-world',
        tree_sha: 'main',
        recursive: true,
        path_filter: 'src/'
      });
      expect(getTree).toHaveBeenCalledWith('octocat', 'hello-world', {
        treeSha: 'main',
        recursive: true,
        pathFilter: 'src/'
      });

      await invoke(getGlobalSecurityAdvisory, { ghsaId: 'GHSA-abcd-efgh-ijkl' });
      expect(getAdvisory).toHaveBeenCalledWith('GHSA-abcd-efgh-ijkl');

      let listResult = await invoke(listGlobalSecurityAdvisories, {
        ecosystem: 'npm',
        severity: 'high',
        cwes: ['79'],
        isWithdrawn: false
      });
      expect(listAdvisories).toHaveBeenCalledWith({
        ecosystem: 'npm',
        severity: 'high',
        cwes: ['79'],
        isWithdrawn: false
      });
      expect(listResult.output.returnedCount).toBe(1);
    } finally {
      getTree.mockRestore();
      getAdvisory.mockRestore();
      listAdvisories.mockRestore();
    }
  });

  it('encodes commit refs and maps pagination to GitHub query names', async () => {
    const get = vi.fn().mockResolvedValue({ data: { sha: 'abc123' } });
    const client = new GitHubClient({
      token: 'test-token',
      instanceUrl: 'https://github.com'
    });
    (client as any).http = { get };

    await client.getCommit('octocat', 'hello-world', 'refs/heads/feature one', {
      page: 2,
      perPage: 75
    });

    expect(get).toHaveBeenCalledWith(
      '/repos/octocat/hello-world/commits/refs%2Fheads%2Ffeature%20one',
      { params: { page: 2, per_page: 75 } }
    );
  });

  it('creates branches from encoded source refs through the Git data API', async () => {
    const get = vi.fn().mockResolvedValue({
      data: {
        ref: 'refs/heads/release/1.0',
        object: { sha: 'source-sha' }
      }
    });
    const post = vi.fn().mockResolvedValue({
      data: {
        ref: 'refs/heads/feature/new',
        object: { sha: 'source-sha' }
      }
    });
    const client = new GitHubClient({
      token: 'test-token',
      instanceUrl: 'https://github.com'
    });
    (client as any).http = { get, post };

    await client.createBranch('octocat', 'hello-world', 'feature/new', 'release/1.0');

    expect(get).toHaveBeenCalledWith(
      '/repos/octocat/hello-world/git/ref/heads/release/1.0',
      undefined
    );
    expect(post).toHaveBeenCalledWith('/repos/octocat/hello-world/git/refs', {
      ref: 'refs/heads/feature/new',
      sha: 'source-sha'
    });
  });

  it('pushes files by creating a tree and commit before a non-force ref update', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          ref: 'refs/heads/main',
          object: { sha: 'base-sha' }
        }
      })
      .mockResolvedValueOnce({
        data: {
          sha: 'base-sha',
          tree: { sha: 'base-tree-sha' }
        }
      });
    const post = vi
      .fn()
      .mockResolvedValueOnce({ data: { sha: 'new-tree-sha' } })
      .mockResolvedValueOnce({ data: { sha: 'new-commit-sha' } });
    const patch = vi.fn().mockResolvedValue({
      data: {
        ref: 'refs/heads/main',
        object: { sha: 'new-commit-sha' }
      }
    });
    const client = new GitHubClient({
      token: 'test-token',
      instanceUrl: 'https://github.com'
    });
    (client as any).http = { get, post, patch };

    await client.pushFiles(
      'octocat',
      'hello-world',
      'main',
      [{ path: 'src/index.ts', content: 'export {};' }],
      'Add entrypoint'
    );

    expect(post).toHaveBeenNthCalledWith(1, '/repos/octocat/hello-world/git/trees', {
      base_tree: 'base-tree-sha',
      tree: [
        {
          path: 'src/index.ts',
          mode: '100644',
          type: 'blob',
          content: 'export {};'
        }
      ]
    });
    expect(post).toHaveBeenNthCalledWith(2, '/repos/octocat/hello-world/git/commits', {
      message: 'Add entrypoint',
      tree: 'new-tree-sha',
      parents: ['base-sha']
    });
    expect(patch).toHaveBeenCalledWith('/repos/octocat/hello-world/git/refs/heads/main', {
      sha: 'new-commit-sha',
      force: false
    });
  });

  it('initializes an empty repository before pushing files to its default branch', async () => {
    const emptyRepositoryError = {
      response: {
        status: 409,
        data: { message: 'Git Repository is empty.' }
      }
    };
    const get = vi
      .fn()
      .mockRejectedValueOnce(emptyRepositoryError)
      .mockResolvedValueOnce({ data: { default_branch: 'main' } })
      .mockResolvedValueOnce({
        data: {
          ref: 'refs/heads/main',
          object: { sha: 'initial-sha' }
        }
      })
      .mockResolvedValueOnce({
        data: {
          sha: 'initial-sha',
          tree: { sha: 'initial-tree-sha' }
        }
      });
    const put = vi.fn().mockResolvedValue({
      data: { commit: { sha: 'initial-sha' } }
    });
    const post = vi
      .fn()
      .mockResolvedValueOnce({ data: { sha: 'new-tree-sha' } })
      .mockResolvedValueOnce({ data: { sha: 'new-commit-sha' } });
    const patch = vi.fn().mockResolvedValue({
      data: {
        ref: 'refs/heads/main',
        object: { sha: 'new-commit-sha' }
      }
    });
    const client = new GitHubClient({
      token: 'test-token',
      instanceUrl: 'https://github.com'
    });
    (client as any).http = { get, put, post, patch };

    await client.pushFiles(
      'octocat',
      'empty-repository',
      'main',
      [{ path: 'src/index.ts', content: 'export {};' }],
      'Add entrypoint'
    );

    expect(put).toHaveBeenCalledWith('/repos/octocat/empty-repository/contents/README.md', {
      message: 'Initial commit',
      content: '',
      branch: 'main'
    });
    expect(post).toHaveBeenNthCalledWith(1, '/repos/octocat/empty-repository/git/trees', {
      base_tree: 'initial-tree-sha',
      tree: [
        {
          path: 'src/index.ts',
          mode: '100644',
          type: 'blob',
          content: 'export {};'
        }
      ]
    });
    expect(patch).toHaveBeenCalledWith('/repos/octocat/empty-repository/git/refs/heads/main', {
      sha: 'new-commit-sha',
      force: false
    });
  });

  it('maps list pagination without leaking camel-case query parameters', async () => {
    const get = vi.fn().mockResolvedValue({ data: [] });
    const client = new GitHubClient({
      token: 'test-token',
      instanceUrl: 'https://github.com'
    });
    (client as any).http = { get };

    await client.listPullRequests('octocat', 'hello-world', {
      state: 'open',
      head: 'octocat:feature',
      base: 'main',
      sort: 'updated',
      direction: 'desc',
      perPage: 25,
      page: 2
    });
    await client.listCommits('octocat', 'hello-world', {
      sha: 'main',
      path: 'src/index.ts',
      author: 'octocat',
      since: '2026-07-01',
      until: '2026-07-29',
      perPage: 50,
      page: 3
    });

    expect(get).toHaveBeenNthCalledWith(1, '/repos/octocat/hello-world/pulls', {
      params: {
        state: 'open',
        head: 'octocat:feature',
        base: 'main',
        sort: 'updated',
        direction: 'desc',
        per_page: 25,
        page: 2
      }
    });
    expect(get).toHaveBeenNthCalledWith(2, '/repos/octocat/hello-world/commits', {
      params: {
        sha: 'main',
        path: 'src/index.ts',
        author: 'octocat',
        since: '2026-07-01',
        until: '2026-07-29',
        per_page: 50,
        page: 3
      }
    });
  });

  it('rejects invalid calendar dates in issue field filters', async () => {
    const post = vi.fn().mockResolvedValue({
      data: {
        data: {
          repository: {
            issueFields: {
              nodes: [
                {
                  __typename: 'IssueFieldDate',
                  id: 'IF_1',
                  fullDatabaseId: 1,
                  name: 'Due date',
                  description: null,
                  dataType: 'DATE',
                  visibility: 'ALL'
                }
              ]
            }
          }
        }
      }
    });
    const client = new GitHubClient({
      token: 'test-token',
      instanceUrl: 'https://github.com'
    });
    (client as any).http = { post };

    await expect(
      client.listIssues('octocat', 'hello-world', {
        fieldFilters: [{ fieldName: 'Due date', value: '2026-02-30' }]
      })
    ).rejects.toThrow('is not a valid date');
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('wraps GraphQL transport failures as GitHub service errors', async () => {
    const post = vi.fn().mockRejectedValue({
      response: {
        status: 503,
        statusText: 'Service Unavailable',
        data: { message: 'Try again later.' }
      }
    });
    const client = new GitHubClient({
      token: 'test-token',
      instanceUrl: 'https://github.com'
    });
    (client as any).http = { post };

    await expect(client.listIssues('octocat', 'hello-world')).rejects.toMatchObject({
      data: { reason: 'github_graphql_request_failed', upstreamStatus: 503 }
    });
  });

  it('maps advisory filters and issue hierarchy mutations to official API fields', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({ data: [{ ghsa_id: 'GHSA-abcd-efgh-ijkl' }] })
      .mockResolvedValueOnce({ data: { ghsa_id: 'GHSA-abcd-efgh-ijkl' } });
    const post = vi.fn().mockResolvedValue({ data: { id: 42 } });
    const patch = vi
      .fn()
      .mockResolvedValueOnce({ data: { id: 42 } })
      .mockResolvedValueOnce({ data: { message: 'Updating pull request branch.' } });
    const del = vi.fn().mockResolvedValue({ data: { id: 42 } });
    const put = vi.fn().mockResolvedValue({
      data: { message: 'Updating pull request branch.' }
    });
    const client = new GitHubClient({
      token: 'test-token',
      instanceUrl: 'https://github.com'
    });
    (client as any).http = { get, post, patch, delete: del, put };

    await client.listGlobalSecurityAdvisories({
      ghsaId: 'GHSA-abcd-efgh-ijkl',
      type: 'reviewed',
      cveId: 'CVE-2026-1234',
      ecosystem: 'npm',
      severity: 'high',
      cwes: ['79', '284'],
      isWithdrawn: false
    });
    expect(get).toHaveBeenNthCalledWith(1, '/advisories', {
      params: expect.objectContaining({
        ghsa_id: 'GHSA-abcd-efgh-ijkl',
        type: 'reviewed',
        cve_id: 'CVE-2026-1234',
        ecosystem: 'npm',
        severity: 'high',
        cwes: '79,284',
        is_withdrawn: false
      })
    });

    await client.getGlobalSecurityAdvisory('GHSA-abcd-efgh-ijkl');
    expect(get).toHaveBeenNthCalledWith(2, '/advisories/GHSA-abcd-efgh-ijkl', undefined);

    await client.addSubIssue('octocat', 'hello-world', 5, 42, true);
    expect(post).toHaveBeenCalledWith('/repos/octocat/hello-world/issues/5/sub_issues', {
      sub_issue_id: 42,
      replace_parent: true
    });

    await client.reprioritizeSubIssue('octocat', 'hello-world', 5, 42, {
      beforeId: 41
    });
    expect(patch).toHaveBeenCalledWith(
      '/repos/octocat/hello-world/issues/5/sub_issues/priority',
      {
        sub_issue_id: 42,
        before_id: 41
      }
    );

    await client.removeSubIssue('octocat', 'hello-world', 5, 42);
    expect(del).toHaveBeenCalledWith('/repos/octocat/hello-world/issues/5/sub_issue', {
      data: { sub_issue_id: 42 }
    });

    await client.updatePullRequestBranch('octocat', 'hello-world', 7, 'head-sha');
    expect(put).toHaveBeenCalledWith('/repos/octocat/hello-world/pulls/7/update-branch', {
      expected_head_sha: 'head-sha'
    });
  });

  it('resolves annotated tags after reading the tag reference', async () => {
    const get = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          ref: 'refs/tags/v1.2.3',
          object: { type: 'tag', sha: 'tag-object-sha' }
        }
      })
      .mockResolvedValueOnce({
        data: {
          sha: 'tag-object-sha',
          object: { type: 'commit', sha: 'commit-sha' }
        }
      });
    const client = new GitHubClient({
      token: 'test-token',
      instanceUrl: 'https://github.com'
    });
    (client as any).http = { get };

    const result = await client.getTag('octocat', 'hello-world', 'v1.2.3');

    expect(get).toHaveBeenNthCalledWith(
      1,
      '/repos/octocat/hello-world/git/ref/tags/v1.2.3',
      undefined
    );
    expect(get).toHaveBeenNthCalledWith(
      2,
      '/repos/octocat/hello-world/git/tags/tag-object-sha',
      undefined
    );
    expect(result.tagObject.object.sha).toBe('commit-sha');
  });

  it('uses the current GitHub API version for remote secret scanning', async () => {
    const post = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          jsonrpc: '2.0',
          id: 1,
          result: { protocolVersion: '2025-06-18' }
        },
        headers: {}
      })
      .mockResolvedValueOnce({ data: undefined })
      .mockResolvedValueOnce({
        data: {
          jsonrpc: '2.0',
          id: 2,
          result: {
            content: [{ type: 'text', text: 'No secrets detected.' }]
          }
        }
      });
    const client = new GitHubClient({
      token: 'test-token',
      instanceUrl: 'https://github.com'
    });
    (client as any).mcpHttp = { post };

    await expect(
      client.runSecretScanning('octocat', 'hello-world', 'const token = process.env.TOKEN;')
    ).resolves.toBe('No secrets detected.');
    expect(post.mock.calls[0]?.[2]?.headers).toMatchObject({
      'X-MCP-Toolsets': 'secret_protection',
      'X-MCP-Tools': 'run_secret_scanning'
    });
    expect(post.mock.calls[0]?.[2]?.headers).not.toHaveProperty('X-GitHub-Api-Version');
  });

  it('reports an unavailable repository instead of dereferencing null issue fields', async () => {
    const post = vi.fn().mockResolvedValue({
      data: {
        data: { repository: null }
      }
    });
    const client = new GitHubClient({
      token: 'test-token',
      instanceUrl: 'https://github.com'
    });
    (client as any).http = { post };

    await expect(
      client.listIssueFields('missing-owner', 'missing-repository')
    ).rejects.toThrow('does not expose issue fields');
  });
});
