import { expectMcpCompatibleToolSchema } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { GitHubClient } from './lib/client';
import {
  GitHubPullRequestWritesApi,
  splitPullRequestReviewers
} from './lib/github-pull-request-writes';
import { managePullRequest } from './tools/manage-pull-request';
import { reviewPullRequest } from './tools/review-pull-request';

let schema = (tool: any) => z.toJSONSchema(tool.inputSchema) as any;
let invoke = (tool: any, input: Record<string, unknown>) =>
  tool.handleInvocation({
    auth: { token: 'test-token', instanceUrl: 'https://github.com' },
    config: {},
    input
  });

let pullRequestFixture = {
  id: 10,
  number: 7,
  title: 'Roadmap',
  state: 'open',
  html_url: 'https://github.com/octo-org/roadmap/pull/7',
  user: { login: 'octocat' },
  head: { ref: 'feature' },
  base: { ref: 'main' },
  draft: false,
  merged: false,
  mergeable: true,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-02T00:00:00Z'
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GitHub pull request analog schemas', () => {
  it('keeps both tools MCP-compatible and their production IDs below 60 characters', () => {
    for (let tool of [managePullRequest, reviewPullRequest]) {
      expectMcpCompatibleToolSchema(tool);
      expect(`github-${tool.key}`.length).toBeLessThan(60);
    }
  });

  it('adds the complete create_pull_request and update_pull_request surface', () => {
    let input = schema(managePullRequest);
    expect(input.required).toEqual(['owner', 'repo']);
    expect(Object.keys(input.properties)).toEqual([
      'owner',
      'repo',
      'pullNumber',
      'title',
      'body',
      'head',
      'base',
      'draft',
      'state',
      'maintainer_can_modify',
      'reviewers',
      'maintainerCanModify'
    ]);
    expect(input.properties.state.enum).toEqual(['open', 'closed']);
    expect(input.properties).toHaveProperty('maintainer_can_modify');
    expect(input.properties).toHaveProperty('reviewers');
  });

  it('adds every official review write, pending comment, and reply field', () => {
    let input = schema(reviewPullRequest);
    expect(input.required).toEqual(['owner', 'repo']);
    expect(input.properties.method.enum).toEqual([
      'create',
      'submit_pending',
      'delete_pending',
      'resolve_thread',
      'unresolve_thread',
      'add_comment_to_pending_review',
      'add_reply_to_pull_request_comment'
    ]);
    expect(input.properties.event.enum).toEqual(['APPROVE', 'REQUEST_CHANGES', 'COMMENT']);
    expect(input.properties.subjectType.enum).toEqual(['FILE', 'LINE']);
    expect(input.properties.side.enum).toEqual(['LEFT', 'RIGHT']);
    expect(input.properties.reaction.enum).toEqual([
      '+1',
      '-1',
      'laugh',
      'confused',
      'heart',
      'hooray',
      'rocket',
      'eyes'
    ]);
    for (let field of [
      'commitID',
      'threadId',
      'path',
      'line',
      'startLine',
      'startSide',
      'commentId'
    ]) {
      expect(input.properties).toHaveProperty(field);
    }
  });
});

describe('Manage pull request analog behavior', () => {
  it('creates a pull request with official maintainer and mixed reviewer fields', async () => {
    let create = vi
      .spyOn(GitHubPullRequestWritesApi.prototype, 'createPullRequest')
      .mockResolvedValue(pullRequestFixture);

    let result = await invoke(managePullRequest, {
      owner: 'octo-org',
      repo: 'roadmap',
      title: 'Roadmap',
      head: 'feature',
      base: 'main',
      draft: true,
      maintainer_can_modify: false,
      reviewers: ['octocat', 'octo-org/platform']
    });

    expect(create).toHaveBeenCalledWith('octo-org', 'roadmap', {
      title: 'Roadmap',
      head: 'feature',
      base: 'main',
      body: undefined,
      draft: true,
      maintainerCanModify: false,
      reviewers: ['octocat', 'octo-org/platform']
    });
    expect(result.output).toMatchObject({
      pullNumber: 7,
      pullRequestId: 10,
      htmlUrl: pullRequestFixture.html_url
    });
  });

  it('updates every official field and retains the legacy maintainer alias', async () => {
    let update = vi
      .spyOn(GitHubPullRequestWritesApi.prototype, 'updatePullRequest')
      .mockResolvedValue(pullRequestFixture);

    await invoke(managePullRequest, {
      owner: 'octo-org',
      repo: 'roadmap',
      pullNumber: 7,
      title: '',
      body: '',
      state: 'closed',
      base: 'release',
      draft: false,
      maintainerCanModify: true,
      reviewers: ['octocat']
    });

    expect(update).toHaveBeenCalledWith('octo-org', 'roadmap', 7, {
      title: '',
      body: '',
      state: 'closed',
      base: 'release',
      draft: false,
      maintainerCanModify: true,
      reviewers: ['octocat']
    });
  });

  it('rejects conflicting aliases and empty updates with ServiceError-compatible errors', async () => {
    await expect(
      invoke(managePullRequest, {
        owner: 'octocat',
        repo: 'hello-world',
        pullNumber: 2,
        maintainer_can_modify: true,
        maintainerCanModify: false
      })
    ).rejects.toThrow('maintainer_can_modify and maintainerCanModify must match');

    await expect(
      invoke(managePullRequest, {
        owner: 'octocat',
        repo: 'hello-world',
        pullNumber: 2
      })
    ).rejects.toThrow('No update parameters provided.');
  });
});

describe('Review pull request analog routing', () => {
  it('preserves existing action-based reviews, inline comments, and reviewer requests', async () => {
    let action = vi
      .spyOn(GitHubPullRequestWritesApi.prototype, 'createActionReview')
      .mockResolvedValue({
        id: 5,
        state: 'APPROVED',
        html_url: 'https://example.test/review'
      });
    let request = vi
      .spyOn(GitHubPullRequestWritesApi.prototype, 'requestReviewers')
      .mockResolvedValue({ requested_reviewers: [{ login: 'octocat' }] });

    await invoke(reviewPullRequest, {
      owner: 'octo-org',
      repo: 'roadmap',
      pullNumber: 7,
      action: 'APPROVE',
      body: 'Looks good',
      comments: [{ path: 'src/a.ts', position: 3, body: 'Nice' }]
    });
    await invoke(reviewPullRequest, {
      owner: 'octo-org',
      repo: 'roadmap',
      pullNumber: 7,
      action: 'request_reviewers',
      reviewers: ['octocat'],
      teamReviewers: ['platform']
    });

    expect(action).toHaveBeenCalledWith({
      owner: 'octo-org',
      repo: 'roadmap',
      pullNumber: 7,
      body: 'Looks good',
      event: 'APPROVE',
      comments: [{ path: 'src/a.ts', position: 3, body: 'Nice' }]
    });
    expect(request).toHaveBeenCalledWith('octo-org', 'roadmap', 7, ['octocat'], ['platform']);
  });

  it('routes create, submit_pending, and delete_pending methods', async () => {
    let create = vi
      .spyOn(GitHubPullRequestWritesApi.prototype, 'createReview')
      .mockResolvedValue({ id: 'PRR_1', state: 'PENDING' });
    let submit = vi
      .spyOn(GitHubPullRequestWritesApi.prototype, 'submitPendingReview')
      .mockResolvedValue({ id: 'PRR_1', state: 'APPROVED' });
    let remove = vi
      .spyOn(GitHubPullRequestWritesApi.prototype, 'deletePendingReview')
      .mockResolvedValue({ reviewId: 'PRR_1', deleted: true });

    await invoke(reviewPullRequest, {
      method: 'create',
      owner: 'octo-org',
      repo: 'roadmap',
      pullNumber: 7,
      commitID: 'abc123'
    });
    await invoke(reviewPullRequest, {
      method: 'submit_pending',
      owner: 'octo-org',
      repo: 'roadmap',
      pullNumber: 7,
      event: 'APPROVE',
      body: 'Ship it'
    });
    await invoke(reviewPullRequest, {
      method: 'delete_pending',
      owner: 'octo-org',
      repo: 'roadmap',
      pullNumber: 7
    });

    expect(create).toHaveBeenCalledWith({
      owner: 'octo-org',
      repo: 'roadmap',
      pullNumber: 7,
      body: undefined,
      event: undefined,
      commitID: 'abc123'
    });
    expect(submit).toHaveBeenCalledWith({
      owner: 'octo-org',
      repo: 'roadmap',
      pullNumber: 7,
      event: 'APPROVE',
      body: 'Ship it'
    });
    expect(remove).toHaveBeenCalledWith('octo-org', 'roadmap', 7);
  });

  it('routes resolve and unresolve using only thread IDs', async () => {
    let setResolved = vi
      .spyOn(GitHubPullRequestWritesApi.prototype, 'setThreadResolved')
      .mockImplementation(async (threadId, resolved) => ({
        id: threadId,
        isResolved: resolved
      }));

    await invoke(reviewPullRequest, {
      method: 'resolve_thread',
      owner: 'unused',
      repo: 'unused',
      threadId: 'PRRT_1'
    });
    await invoke(reviewPullRequest, {
      method: 'unresolve_thread',
      owner: 'unused',
      repo: 'unused',
      threadId: 'PRRT_2'
    });

    expect(setResolved.mock.calls).toEqual([
      ['PRRT_1', true],
      ['PRRT_2', false]
    ]);
  });

  it('routes FILE and LINE pending review comments', async () => {
    let add = vi
      .spyOn(GitHubPullRequestWritesApi.prototype, 'addPendingReviewComment')
      .mockResolvedValue({ id: 'PRRT_1', isResolved: false });

    await invoke(reviewPullRequest, {
      method: 'add_comment_to_pending_review',
      owner: 'octo-org',
      repo: 'roadmap',
      pullNumber: 7,
      path: 'src/a.ts',
      body: 'File note',
      subjectType: 'FILE'
    });
    await invoke(reviewPullRequest, {
      method: 'add_comment_to_pending_review',
      owner: 'octo-org',
      repo: 'roadmap',
      pullNumber: 7,
      path: 'src/a.ts',
      body: 'Range note',
      subjectType: 'LINE',
      line: 10,
      side: 'RIGHT',
      startLine: 5,
      startSide: 'RIGHT'
    });

    expect(add.mock.calls[0]?.[0]).toMatchObject({
      subjectType: 'FILE',
      line: undefined
    });
    expect(add.mock.calls[1]?.[0]).toMatchObject({
      subjectType: 'LINE',
      line: 10,
      side: 'RIGHT',
      startLine: 5,
      startSide: 'RIGHT'
    });
  });

  it('routes reply-only, reaction-only, and combined comment operations', async () => {
    let reply = vi
      .spyOn(GitHubPullRequestWritesApi.prototype, 'addReplyOrReaction')
      .mockResolvedValue({ id: 11 });

    await invoke(reviewPullRequest, {
      method: 'add_reply_to_pull_request_comment',
      owner: 'octo-org',
      repo: 'roadmap',
      pullNumber: 7,
      commentId: 10,
      body: 'Thanks'
    });
    await invoke(reviewPullRequest, {
      method: 'add_reply_to_pull_request_comment',
      owner: 'octo-org',
      repo: 'roadmap',
      commentId: 10,
      reaction: 'rocket'
    });
    await invoke(reviewPullRequest, {
      method: 'add_reply_to_pull_request_comment',
      owner: 'octo-org',
      repo: 'roadmap',
      pullNumber: 7,
      commentId: 10,
      body: 'Thanks',
      reaction: '+1'
    });

    expect(reply.mock.calls).toEqual([
      [
        {
          owner: 'octo-org',
          repo: 'roadmap',
          pullNumber: 7,
          commentId: 10,
          body: 'Thanks',
          reaction: undefined
        }
      ],
      [
        {
          owner: 'octo-org',
          repo: 'roadmap',
          pullNumber: undefined,
          commentId: 10,
          body: undefined,
          reaction: 'rocket'
        }
      ],
      [
        {
          owner: 'octo-org',
          repo: 'roadmap',
          pullNumber: 7,
          commentId: 10,
          body: 'Thanks',
          reaction: '+1'
        }
      ]
    ]);
  });

  it('validates review conditionals and line ranges before provider calls', async () => {
    let base = {
      owner: 'octo-org',
      repo: 'roadmap',
      pullNumber: 7
    };
    await expect(
      invoke(reviewPullRequest, {
        ...base,
        method: 'submit_pending'
      })
    ).rejects.toThrow('event is required for submit_pending');
    await expect(
      invoke(reviewPullRequest, {
        ...base,
        method: 'add_comment_to_pending_review',
        path: 'src/a.ts',
        body: 'Bad file location',
        subjectType: 'FILE',
        line: 2
      })
    ).rejects.toThrow('FILE comments must omit line');
    await expect(
      invoke(reviewPullRequest, {
        ...base,
        method: 'add_comment_to_pending_review',
        path: 'src/a.ts',
        body: 'Missing side',
        subjectType: 'LINE',
        line: 2
      })
    ).rejects.toThrow('LINE comments require');
    await expect(
      invoke(reviewPullRequest, {
        ...base,
        method: 'add_comment_to_pending_review',
        path: 'src/a.ts',
        body: 'Bad range',
        subjectType: 'LINE',
        line: 5,
        side: 'RIGHT',
        startLine: 5,
        startSide: 'RIGHT'
      })
    ).rejects.toThrow('startLine must be less than line');
    await expect(
      invoke(reviewPullRequest, {
        ...base,
        method: 'add_comment_to_pending_review',
        path: 'src/a.ts',
        body: 'Bad sides',
        subjectType: 'LINE',
        line: 5,
        side: 'RIGHT',
        startLine: 2,
        startSide: 'LEFT'
      })
    ).rejects.toThrow('startSide must match side');
    await expect(
      invoke(reviewPullRequest, {
        owner: 'octo-org',
        repo: 'roadmap',
        method: 'add_reply_to_pull_request_comment',
        commentId: 10
      })
    ).rejects.toThrow('At least one of body or reaction is required');
  });
});

describe('Pull request analog provider mapping', () => {
  it('splits ORG/team-slug reviewers and maps create requests', async () => {
    expect(splitPullRequestReviewers(['octocat', 'octo-org/platform', 'a/b/c'])).toEqual({
      users: ['octocat', 'a/b/c'],
      teams: ['platform']
    });

    let requestRest = vi
      .spyOn(GitHubClient.prototype, 'requestRest')
      .mockResolvedValueOnce(pullRequestFixture)
      .mockResolvedValueOnce({ requested_reviewers: [{ login: 'octocat' }] });
    let api = new GitHubPullRequestWritesApi({
      token: 'test-token',
      instanceUrl: 'https://github.com'
    });
    await api.createPullRequest('octo org', 'hello/world', {
      title: 'Roadmap',
      head: 'feature',
      base: 'main',
      maintainerCanModify: false,
      reviewers: ['octocat', 'octo-org/platform']
    });

    expect(requestRest.mock.calls[0]?.[0]).toMatchObject({
      method: 'POST',
      path: '/repos/octo%20org/hello%2Fworld/pulls',
      body: {
        title: 'Roadmap',
        head: 'feature',
        base: 'main',
        maintainer_can_modify: false
      }
    });
    expect(requestRest.mock.calls[1]?.[0]).toMatchObject({
      path: '/repos/octo%20org/hello%2Fworld/pulls/7/requested_reviewers',
      body: {
        reviewers: ['octocat'],
        team_reviewers: ['platform']
      }
    });
  });

  it('maps REST updates, GraphQL draft transitions, and final-state reads', async () => {
    let requestRest = vi
      .spyOn(GitHubClient.prototype, 'requestRest')
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce(pullRequestFixture);
    let requestGraphQL = vi
      .spyOn(GitHubClient.prototype, 'requestGraphQL')
      .mockResolvedValueOnce({
        repository: { pullRequest: { id: 'PR_1', isDraft: true } }
      })
      .mockResolvedValueOnce({
        markPullRequestReadyForReview: {
          pullRequest: { id: 'PR_1', isDraft: false }
        }
      });
    let api = new GitHubPullRequestWritesApi({
      token: 'test-token',
      instanceUrl: 'https://github.com'
    });

    await api.updatePullRequest('octocat', 'hello-world', 7, {
      title: '',
      state: 'open',
      draft: false,
      maintainerCanModify: true
    });

    expect(requestRest.mock.calls[0]?.[0]).toMatchObject({
      method: 'PATCH',
      path: '/repos/octocat/hello-world/pulls/7',
      body: {
        title: '',
        state: 'open',
        maintainer_can_modify: true
      }
    });
    expect(requestGraphQL.mock.calls[1]?.[0]).toContain('markPullRequestReadyForReview');
    expect(requestGraphQL.mock.calls[1]?.[1]).toEqual({
      input: { pullRequestId: 'PR_1' }
    });
    expect(requestRest.mock.calls[1]?.[0]).toMatchObject({
      method: 'GET',
      path: '/repos/octocat/hello-world/pulls/7'
    });
  });

  it('maps reply and reaction requests to their distinct REST endpoints', async () => {
    let requestRest = vi
      .spyOn(GitHubClient.prototype, 'requestRest')
      .mockResolvedValueOnce({ id: 20, content: 'rocket' })
      .mockResolvedValueOnce({ id: 21, body: 'Thanks' });
    let api = new GitHubPullRequestWritesApi({
      token: 'test-token',
      instanceUrl: 'https://github.com'
    });

    await api.addReplyOrReaction({
      owner: 'octocat',
      repo: 'hello-world',
      pullNumber: 7,
      commentId: 10,
      body: 'Thanks',
      reaction: 'rocket'
    });

    expect(requestRest.mock.calls[0]?.[0]).toMatchObject({
      path: '/repos/octocat/hello-world/pulls/comments/10/reactions',
      body: { content: 'rocket' }
    });
    expect(requestRest.mock.calls[1]?.[0]).toMatchObject({
      path: '/repos/octocat/hello-world/pulls/7/comments/10/replies',
      body: { body: 'Thanks' }
    });
  });

  it('maps review creation and thread mutations to the official GraphQL inputs', async () => {
    let requestGraphQL = vi
      .spyOn(GitHubClient.prototype, 'requestGraphQL')
      .mockResolvedValueOnce({
        repository: { pullRequest: { id: 'PR_1' } }
      })
      .mockResolvedValueOnce({
        addPullRequestReview: {
          pullRequestReview: { id: 'PRR_1', state: 'COMMENTED' }
        }
      })
      .mockResolvedValueOnce({
        resolveReviewThread: {
          thread: { id: 'PRRT_1', isResolved: true }
        }
      });
    let api = new GitHubPullRequestWritesApi({
      token: 'test-token',
      instanceUrl: 'https://github.com'
    });

    await api.createReview({
      owner: 'octocat',
      repo: 'hello-world',
      pullNumber: 7,
      body: 'A comment',
      event: 'COMMENT',
      commitID: 'abc123'
    });
    await api.setThreadResolved('PRRT_1', true);

    expect(requestGraphQL.mock.calls[1]?.[0]).toContain('addPullRequestReview');
    expect(requestGraphQL.mock.calls[1]?.[1]).toEqual({
      input: {
        pullRequestId: 'PR_1',
        commitOID: 'abc123',
        event: 'COMMENT',
        body: 'A comment'
      }
    });
    expect(requestGraphQL.mock.calls[2]?.[0]).toContain('resolveReviewThread');
    expect(requestGraphQL.mock.calls[2]?.[1]).toEqual({
      input: { threadId: 'PRRT_1' }
    });
  });

  it('finds the viewer pending review before submitting and adding a comment', async () => {
    let requestGraphQL = vi
      .spyOn(GitHubClient.prototype, 'requestGraphQL')
      .mockResolvedValueOnce({ viewer: { login: 'octocat' } })
      .mockResolvedValueOnce({
        repository: {
          pullRequest: {
            reviews: {
              nodes: [{ id: 'PRR_1', state: 'PENDING' }]
            }
          }
        }
      })
      .mockResolvedValueOnce({
        submitPullRequestReview: {
          pullRequestReview: { id: 'PRR_1', state: 'APPROVED' }
        }
      })
      .mockResolvedValueOnce({ viewer: { login: 'octocat' } })
      .mockResolvedValueOnce({
        repository: {
          pullRequest: {
            reviews: {
              nodes: [{ id: 'PRR_1', state: 'PENDING' }]
            }
          }
        }
      })
      .mockResolvedValueOnce({
        addPullRequestReviewThread: {
          thread: { id: 'PRRT_1', isResolved: false }
        }
      });
    let api = new GitHubPullRequestWritesApi({
      token: 'test-token',
      instanceUrl: 'https://github.com'
    });

    await api.submitPendingReview({
      owner: 'octocat',
      repo: 'hello-world',
      pullNumber: 7,
      event: 'APPROVE',
      body: 'Ship it'
    });
    await api.addPendingReviewComment({
      owner: 'octocat',
      repo: 'hello-world',
      pullNumber: 7,
      path: 'src/a.ts',
      body: 'Please adjust',
      subjectType: 'LINE',
      line: 8,
      side: 'RIGHT',
      startLine: 4,
      startSide: 'RIGHT'
    });

    expect(requestGraphQL.mock.calls[2]?.[1]).toEqual({
      input: {
        pullRequestReviewId: 'PRR_1',
        event: 'APPROVE',
        body: 'Ship it'
      }
    });
    expect(requestGraphQL.mock.calls[5]?.[1]).toEqual({
      input: {
        pullRequestReviewId: 'PRR_1',
        path: 'src/a.ts',
        body: 'Please adjust',
        subjectType: 'LINE',
        line: 8,
        side: 'RIGHT',
        startLine: 4,
        startSide: 'RIGHT'
      }
    });
  });
});
