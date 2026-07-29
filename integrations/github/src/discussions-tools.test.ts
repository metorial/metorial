import { ServiceError } from '@lowerdeck/error';
import { expectMcpCompatibleToolSchema } from '@slates/test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { GitHubClient } from './lib/client';
import { discussionCommentWrite } from './tools/discussion-comment-write';
import { getDiscussion } from './tools/get-discussion';
import { getDiscussionComments } from './tools/get-discussion-comments';
import { listDiscussionCategories } from './tools/list-discussion-categories';
import { listDiscussions } from './tools/list-discussions';

let discussionTools = [
  listDiscussionCategories,
  listDiscussions,
  getDiscussion,
  getDiscussionComments,
  discussionCommentWrite
];

let schema = (tool: any) => z.toJSONSchema(tool.inputSchema) as any;

let invoke = (tool: any, input: Record<string, unknown>) =>
  tool.handleInvocation({
    auth: { token: 'test-token', instanceUrl: 'https://github.com' },
    config: {},
    input
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('GitHub synced discussion tool schemas', () => {
  it('keeps every discussion schema MCP-compatible and every ID below 60 characters', () => {
    for (let tool of discussionTools) {
      expectMcpCompatibleToolSchema(tool);
      expect(`github-${tool.key}`.length).toBeLessThan(60);
    }
  });

  it('matches the official discussion read contracts', () => {
    let categories = schema(listDiscussionCategories);
    expect(Object.keys(categories.properties)).toEqual(['owner', 'repo']);
    expect(categories.required).toEqual(['owner']);

    let list = schema(listDiscussions);
    expect(Object.keys(list.properties)).toEqual([
      'owner',
      'repo',
      'after',
      'perPage',
      'category',
      'query',
      'orderBy',
      'direction'
    ]);
    expect(list.required).toEqual(['owner']);
    expect(list.properties.perPage).toMatchObject({ minimum: 1, maximum: 100 });
    expect(list.properties.orderBy.enum).toEqual(['CREATED_AT', 'UPDATED_AT']);
    expect(list.properties.direction.enum).toEqual(['ASC', 'DESC']);

    let get = schema(getDiscussion);
    expect(Object.keys(get.properties)).toEqual(['owner', 'repo', 'discussionNumber']);
    expect(get.required).toEqual(['owner', 'repo', 'discussionNumber']);

    let comments = schema(getDiscussionComments);
    expect(Object.keys(comments.properties)).toEqual([
      'owner',
      'repo',
      'discussionNumber',
      'after',
      'perPage',
      'includeReplies'
    ]);
    expect(comments.required).toEqual(['owner', 'repo', 'discussionNumber']);
    expect(comments.properties.perPage).toMatchObject({
      minimum: 1,
      maximum: 100
    });
  });

  it('keeps discussion_comment_write as one top-level object with conditional fields', () => {
    let write = schema(discussionCommentWrite);
    expect(Object.keys(write.properties)).toEqual([
      'method',
      'owner',
      'repo',
      'discussionNumber',
      'body',
      'commentNodeID'
    ]);
    expect(write.required).toEqual(['method']);
    expect(write.properties.method.enum).toEqual([
      'add',
      'reply',
      'update',
      'delete',
      'mark_answer',
      'unmark_answer'
    ]);
    expect(write).not.toHaveProperty('oneOf');
    expect(write).not.toHaveProperty('anyOf');
    expect(write).not.toHaveProperty('allOf');
  });
});

describe('GitHub discussion read requests', () => {
  it('uses the .github repository for organization categories and discussions', async () => {
    let requestGraphQL = vi
      .spyOn(GitHubClient.prototype, 'requestGraphQL')
      .mockResolvedValueOnce({
        repository: {
          discussionCategories: {
            nodes: [{ id: 'DIC_general', name: 'General' }],
            pageInfo: {
              hasNextPage: false,
              hasPreviousPage: false,
              startCursor: 'category-start',
              endCursor: 'category-end'
            },
            totalCount: 1
          }
        }
      })
      .mockResolvedValueOnce({
        repository: {
          discussions: {
            nodes: [
              {
                number: 1,
                title: 'Release planning',
                body: 'Discuss the launch',
                url: 'https://github.com/octo-org/.github/discussions/1',
                createdAt: '2026-07-28T00:00:00Z',
                updatedAt: '2026-07-29T00:00:00Z',
                closed: false,
                isAnswered: false,
                answerChosenAt: null,
                author: { login: 'octocat' },
                category: { id: 'DIC_general', name: 'General' }
              },
              {
                number: 2,
                title: 'Introductions',
                body: 'Say hello',
                url: 'https://github.com/octo-org/.github/discussions/2',
                createdAt: '2026-07-27T00:00:00Z',
                updatedAt: '2026-07-27T00:00:00Z',
                closed: false,
                isAnswered: false,
                answerChosenAt: null,
                author: { login: 'hubot' },
                category: { id: 'DIC_general', name: 'General' }
              }
            ],
            pageInfo: {
              hasNextPage: true,
              hasPreviousPage: false,
              startCursor: 'discussion-start',
              endCursor: 'discussion-end'
            },
            totalCount: 42
          }
        }
      });

    let categories = await invoke(listDiscussionCategories, { owner: 'octo-org' });
    let discussions = await invoke(listDiscussions, {
      owner: 'octo-org',
      category: 'DIC_general',
      query: 'LAUNCH',
      orderBy: 'UPDATED_AT',
      direction: 'DESC',
      perPage: 50,
      after: 'previous-cursor'
    });

    expect(requestGraphQL.mock.calls[0]![1]).toEqual({
      owner: 'octo-org',
      repo: '.github',
      first: 25
    });
    expect(categories.output).toMatchObject({
      repository: 'octo-org/.github',
      totalCount: 1,
      categories: [{ id: 'DIC_general', name: 'General' }]
    });
    expect(requestGraphQL.mock.calls[1]![1]).toEqual({
      owner: 'octo-org',
      repo: '.github',
      first: 50,
      after: 'previous-cursor',
      categoryId: 'DIC_general',
      orderBy: { field: 'UPDATED_AT', direction: 'DESC' }
    });
    expect(discussions.output).toMatchObject({
      repository: 'octo-org/.github',
      totalCount: 42,
      returnedCount: 1,
      discussions: [{ number: 1, title: 'Release planning' }],
      pageInfo: { hasNextPage: true, endCursor: 'discussion-end' }
    });
  });

  it('rejects incomplete discussion ordering with a ServiceError', async () => {
    let requestGraphQL = vi.spyOn(GitHubClient.prototype, 'requestGraphQL');

    await expect(
      invoke(listDiscussions, {
        owner: 'octocat',
        repo: 'hello-world',
        orderBy: 'CREATED_AT'
      })
    ).rejects.toBeInstanceOf(ServiceError);
    expect(requestGraphQL).not.toHaveBeenCalled();
  });

  it('gets discussion details and cursor-paginates comments with nested replies', async () => {
    let discussion = {
      id: 'D_main',
      number: 7,
      title: 'How should this work?',
      body: 'Question body',
      url: 'https://github.com/octocat/hello-world/discussions/7',
      createdAt: '2026-07-28T00:00:00Z',
      updatedAt: '2026-07-29T00:00:00Z',
      closed: false,
      isAnswered: true,
      answerChosenAt: '2026-07-29T01:00:00Z',
      author: { login: 'octocat' },
      category: { id: 'DIC_qa', name: 'Q&A' }
    };
    let requestGraphQL = vi
      .spyOn(GitHubClient.prototype, 'requestGraphQL')
      .mockResolvedValueOnce({ repository: { discussion } })
      .mockResolvedValueOnce({
        repository: {
          discussion: {
            comments: {
              nodes: [
                {
                  id: 'DC_answer',
                  body: 'Use the API.',
                  url: `${discussion.url}#discussioncomment-1`,
                  isAnswer: true,
                  createdAt: '2026-07-28T02:00:00Z',
                  updatedAt: '2026-07-28T02:00:00Z',
                  author: { login: 'hubot' },
                  replies: {
                    nodes: [
                      {
                        id: 'DC_reply',
                        body: 'Thanks!',
                        url: `${discussion.url}#discussioncomment-2`,
                        isAnswer: false,
                        createdAt: '2026-07-28T03:00:00Z',
                        updatedAt: '2026-07-28T03:00:00Z',
                        author: { login: 'octocat' }
                      }
                    ],
                    totalCount: 1
                  }
                }
              ],
              pageInfo: {
                hasNextPage: false,
                hasPreviousPage: true,
                startCursor: 'comment-start',
                endCursor: 'comment-end'
              },
              totalCount: 3
            }
          }
        }
      });

    let getResult = await invoke(getDiscussion, {
      owner: 'octocat',
      repo: 'hello-world',
      discussionNumber: 7
    });
    let commentsResult = await invoke(getDiscussionComments, {
      owner: 'octocat',
      repo: 'hello-world',
      discussionNumber: 7,
      after: 'prior-page',
      perPage: 10,
      includeReplies: true
    });

    expect(getResult.output.discussion).toEqual(discussion);
    expect(requestGraphQL.mock.calls[0]![1]).toEqual({
      owner: 'octocat',
      repo: 'hello-world',
      discussionNumber: 7
    });
    expect(requestGraphQL.mock.calls[1]![0]).toContain('replies(first: 100)');
    expect(requestGraphQL.mock.calls[1]![1]).toEqual({
      owner: 'octocat',
      repo: 'hello-world',
      discussionNumber: 7,
      first: 10,
      after: 'prior-page'
    });
    expect(commentsResult.output).toMatchObject({
      totalCount: 3,
      returnedCount: 1,
      comments: [
        {
          id: 'DC_answer',
          isAnswer: true,
          replies: {
            totalCount: 1,
            nodes: [{ id: 'DC_reply', body: 'Thanks!' }]
          }
        }
      ]
    });
  });
});

describe('GitHub discussion comment writes', () => {
  it('resolves a discussion node and adds a comment', async () => {
    let requestGraphQL = vi
      .spyOn(GitHubClient.prototype, 'requestGraphQL')
      .mockResolvedValueOnce({
        repository: { discussion: { id: 'D_main' } }
      })
      .mockResolvedValueOnce({
        addDiscussionComment: {
          comment: {
            id: 'DC_new',
            url: 'https://github.com/octocat/hello-world/discussions/7#discussioncomment-3'
          }
        }
      });

    let result = await invoke(discussionCommentWrite, {
      method: 'add',
      owner: 'octocat',
      repo: 'hello-world',
      discussionNumber: 7,
      body: 'A new comment'
    });

    expect(requestGraphQL.mock.calls[0]![1]).toEqual({
      owner: 'octocat',
      repo: 'hello-world',
      discussionNumber: 7
    });
    expect(requestGraphQL.mock.calls[1]![1]).toEqual({
      input: {
        discussionId: 'D_main',
        body: 'A new comment'
      }
    });
    expect(result.output).toEqual({
      method: 'add',
      comment: {
        id: 'DC_new',
        url: 'https://github.com/octocat/hello-world/discussions/7#discussioncomment-3'
      }
    });
  });

  it('validates reply ownership before adding the nested comment', async () => {
    let requestGraphQL = vi
      .spyOn(GitHubClient.prototype, 'requestGraphQL')
      .mockResolvedValueOnce({
        repository: { discussion: { id: 'D_main' } }
      })
      .mockResolvedValueOnce({
        node: { id: 'DC_parent', discussion: { id: 'D_main' } }
      })
      .mockResolvedValueOnce({
        addDiscussionComment: {
          comment: {
            id: 'DC_reply',
            url: 'https://github.com/octocat/hello-world/discussions/7#discussioncomment-4'
          }
        }
      });

    await invoke(discussionCommentWrite, {
      method: 'reply',
      owner: 'octocat',
      repo: 'hello-world',
      discussionNumber: 7,
      body: 'A nested reply',
      commentNodeID: 'DC_parent'
    });

    expect(requestGraphQL.mock.calls[1]![1]).toEqual({ replyToID: 'DC_parent' });
    expect(requestGraphQL.mock.calls[2]![1]).toEqual({
      input: {
        discussionId: 'D_main',
        body: 'A nested reply',
        replyToId: 'DC_parent'
      }
    });
  });

  it('maps update, delete, and answer mutations to their official inputs', async () => {
    let requestGraphQL = vi
      .spyOn(GitHubClient.prototype, 'requestGraphQL')
      .mockResolvedValueOnce({
        updateDiscussionComment: {
          comment: { id: 'DC_target', url: 'https://github.com/comment' }
        }
      })
      .mockResolvedValueOnce({
        deleteDiscussionComment: {
          comment: { id: 'DC_target', url: 'https://github.com/comment' }
        }
      })
      .mockResolvedValueOnce({
        markDiscussionCommentAsAnswer: {
          discussion: { id: 'D_main', url: 'https://github.com/discussion' }
        }
      })
      .mockResolvedValueOnce({
        unmarkDiscussionCommentAsAnswer: {
          discussion: { id: 'D_main', url: 'https://github.com/discussion' }
        }
      });

    await invoke(discussionCommentWrite, {
      method: 'update',
      commentNodeID: 'DC_target',
      body: 'Updated body'
    });
    await invoke(discussionCommentWrite, {
      method: 'delete',
      commentNodeID: 'DC_target'
    });
    await invoke(discussionCommentWrite, {
      method: 'mark_answer',
      commentNodeID: 'DC_target'
    });
    await invoke(discussionCommentWrite, {
      method: 'unmark_answer',
      commentNodeID: 'DC_target'
    });

    expect(requestGraphQL.mock.calls.map(call => call[1])).toEqual([
      { input: { commentId: 'DC_target', body: 'Updated body' } },
      { input: { id: 'DC_target' } },
      { input: { id: 'DC_target' } },
      { input: { id: 'DC_target' } }
    ]);
    expect(requestGraphQL.mock.calls.map(call => call[0])).toEqual([
      expect.stringContaining('mutation UpdateDiscussionComment'),
      expect.stringContaining('mutation DeleteDiscussionComment'),
      expect.stringContaining('mutation MarkDiscussionCommentAsAnswer'),
      expect.stringContaining('mutation UnmarkDiscussionCommentAsAnswer')
    ]);
  });

  it('rejects missing conditional fields with ServiceError validation', async () => {
    let requestGraphQL = vi.spyOn(GitHubClient.prototype, 'requestGraphQL');

    await expect(
      invoke(discussionCommentWrite, {
        method: 'reply',
        owner: 'octocat',
        repo: 'hello-world',
        discussionNumber: 7,
        body: 'Missing the parent node ID'
      })
    ).rejects.toBeInstanceOf(ServiceError);
    await expect(
      invoke(discussionCommentWrite, {
        method: 'update',
        commentNodeID: 'DC_target'
      })
    ).rejects.toBeInstanceOf(ServiceError);
    expect(requestGraphQL).not.toHaveBeenCalled();
  });
});
