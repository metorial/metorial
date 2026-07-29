import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import {
  createGitHubDiscussionClient,
  invalidDiscussionInput,
  normalizeDiscussionPageInfo,
  requireDiscussionRepository
} from '../lib/github-discussions';
import { spec } from '../spec';

interface DiscussionComment {
  id: string;
  body: string;
  url: string;
  isAnswer: boolean;
  createdAt: string;
  updatedAt: string;
  author: { login: string } | null;
  replies?: {
    nodes: DiscussionComment[];
    totalCount: number;
  };
}

interface DiscussionCommentsResponse {
  repository: {
    discussion: {
      comments: {
        nodes: DiscussionComment[];
        pageInfo: {
          hasNextPage: boolean;
          hasPreviousPage: boolean;
          startCursor: string | null;
          endCursor: string | null;
        };
        totalCount: number;
      };
    } | null;
  } | null;
}

let commentSchema: z.ZodType<DiscussionComment> = z.object({
  id: z.string().describe('Discussion comment node ID'),
  body: z.string().describe('Comment body in Markdown'),
  url: z.string().describe('Comment URL on GitHub'),
  isAnswer: z.boolean().describe('Whether this comment is the accepted answer'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp'),
  author: z
    .object({ login: z.string().describe('Comment author login') })
    .nullable()
    .describe('Comment author, or null for a deleted account'),
  replies: z
    .object({
      nodes: z
        .array(
          z.object({
            id: z.string().describe('Reply node ID'),
            body: z.string().describe('Reply body in Markdown'),
            url: z.string().describe('Reply URL on GitHub'),
            isAnswer: z.boolean().describe('Whether the reply is the accepted answer'),
            createdAt: z.string().describe('Creation timestamp'),
            updatedAt: z.string().describe('Last update timestamp'),
            author: z.object({ login: z.string().describe('Reply author login') }).nullable()
          })
        )
        .describe('Replies, limited by GitHub to the first 100'),
      totalCount: z.number().describe('Total number of replies')
    })
    .optional()
    .describe('Nested replies when includeReplies is true')
});

let mapComment = (comment: DiscussionComment, includeReplies: boolean) => ({
  id: comment.id,
  body: comment.body,
  url: comment.url,
  isAnswer: comment.isAnswer,
  createdAt: comment.createdAt,
  updatedAt: comment.updatedAt,
  author: comment.author,
  ...(includeReplies
    ? {
        replies: {
          nodes: comment.replies?.nodes ?? [],
          totalCount: comment.replies?.totalCount ?? 0
        }
      }
    : {})
});

export let getDiscussionComments = SlateTool.create(spec, {
  name: 'Get Discussion Comments',
  key: 'get_discussion_comments',
  description:
    'Get a cursor-paginated page of top-level comments from a GitHub Discussion, optionally including up to 100 nested replies per comment.',
  tags: { readOnly: true }
})
  .scopes(anyOf('repo', 'public_repo'))
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      discussionNumber: z.number().describe('Repository-local discussion number'),
      after: z
        .string()
        .optional()
        .describe('Cursor from the previous response’s pageInfo.endCursor'),
      perPage: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Top-level comments to request, from 1 through 100; defaults to 30'),
      includeReplies: z
        .boolean()
        .optional()
        .describe(
          'When true, include up to 100 replies nested under each top-level comment; defaults to false'
        )
    })
  )
  .output(
    z.object({
      repository: z.string().describe('Repository in owner/name format'),
      discussionNumber: z.number().describe('Repository-local discussion number'),
      comments: z.array(commentSchema).describe('Top-level discussion comments'),
      totalCount: z.number().describe('Total number of top-level comments'),
      returnedCount: z.number().describe('Number of top-level comments returned'),
      pageInfo: z
        .object({
          hasNextPage: z.boolean().describe('Whether another comment page is available'),
          hasPreviousPage: z
            .boolean()
            .describe('Whether a previous comment page is available'),
          startCursor: z.string().nullable().describe('Cursor for the first comment'),
          endCursor: z.string().nullable().describe('Cursor for the final comment')
        })
        .describe('GraphQL pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let { owner, repo, discussionNumber, after, perPage } = ctx.input;
    let includeReplies = ctx.input.includeReplies ?? false;
    let replySelection = includeReplies
      ? `replies(first: 100) {
          nodes {
            id
            body
            url
            isAnswer
            createdAt
            updatedAt
            author {
              login
            }
          }
          totalCount
        }`
      : '';
    let client = createGitHubDiscussionClient(ctx.auth);
    let result = await client.requestGraphQL<DiscussionCommentsResponse>(
      `query GetDiscussionComments(
        $owner: String!
        $repo: String!
        $discussionNumber: Int!
        $first: Int!
        $after: String
      ) {
        repository(owner: $owner, name: $repo) {
          discussion(number: $discussionNumber) {
            comments(first: $first, after: $after) {
              nodes {
                id
                body
                url
                isAnswer
                createdAt
                updatedAt
                author {
                  login
                }
                ${replySelection}
              }
              pageInfo {
                hasNextPage
                hasPreviousPage
                startCursor
                endCursor
              }
              totalCount
            }
          }
        }
      }`,
      {
        owner,
        repo,
        discussionNumber,
        first: perPage ?? 30,
        after: after ?? null
      }
    );
    let repository = requireDiscussionRepository(result.repository, owner, repo);
    if (!repository.discussion) {
      throw invalidDiscussionInput(
        `GitHub did not return discussion #${discussionNumber} in "${owner}/${repo}".`,
        'github_discussion_not_found'
      );
    }
    let comments = repository.discussion.comments.nodes.map(comment =>
      mapComment(comment, includeReplies)
    );

    return {
      output: {
        repository: `${owner}/${repo}`,
        discussionNumber,
        comments,
        totalCount: repository.discussion.comments.totalCount,
        returnedCount: comments.length,
        pageInfo: normalizeDiscussionPageInfo(repository.discussion.comments.pageInfo)
      },
      message: `Found **${comments.length}** comments on discussion **#${discussionNumber}** in **${owner}/${repo}**.`
    };
  })
  .build();
