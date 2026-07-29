import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import {
  createGitHubDiscussionClient,
  discussionRepositoryName,
  invalidDiscussionInput,
  normalizeDiscussionPageInfo,
  requireDiscussionRepository
} from '../lib/github-discussions';
import { spec } from '../spec';

let pageInfoSchema = z.object({
  hasNextPage: z.boolean().describe('Whether another discussion page is available'),
  hasPreviousPage: z.boolean().describe('Whether a previous discussion page is available'),
  startCursor: z.string().nullable().describe('Cursor for the first returned discussion'),
  endCursor: z.string().nullable().describe('Cursor for the final returned discussion')
});

let discussionSummarySchema = z.object({
  number: z.number().describe('Repository-local discussion number'),
  title: z.string().describe('Discussion title'),
  body: z.string().describe('Discussion body in Markdown'),
  url: z.string().describe('Discussion URL on GitHub'),
  createdAt: z.string().describe('Creation timestamp'),
  updatedAt: z.string().describe('Last update timestamp'),
  closed: z.boolean().describe('Whether the discussion is closed'),
  isAnswered: z.boolean().describe('Whether a Q&A discussion has an accepted answer'),
  answerChosenAt: z
    .string()
    .nullable()
    .describe('Timestamp when an answer was chosen, or null'),
  author: z
    .object({ login: z.string().describe('Discussion author login') })
    .nullable()
    .describe('Discussion author, or null for a deleted account'),
  category: z.object({
    id: z.string().describe('Discussion category node ID'),
    name: z.string().describe('Discussion category name')
  })
});

interface DiscussionSummary {
  number: number;
  title: string;
  body: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  closed: boolean;
  isAnswered: boolean;
  answerChosenAt: string | null;
  author: { login: string } | null;
  category: { id: string; name: string };
}

interface DiscussionsResponse {
  repository: {
    discussions: {
      nodes: DiscussionSummary[];
      pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor: string | null;
        endCursor: string | null;
      };
      totalCount: number;
    };
  } | null;
}

let filterDiscussions = (discussions: DiscussionSummary[], query?: string) => {
  let normalizedQuery = query?.trim().toLocaleLowerCase();
  if (!normalizedQuery) return discussions;
  return discussions.filter(
    discussion =>
      discussion.title.toLocaleLowerCase().includes(normalizedQuery) ||
      discussion.body.toLocaleLowerCase().includes(normalizedQuery)
  );
};

export let listDiscussions = SlateTool.create(spec, {
  name: 'List Discussions',
  key: 'list_discussions',
  description:
    'List GitHub Discussions for a repository or organization, with cursor pagination, category filtering, paired ordering controls, and optional title/body filtering of the fetched page.',
  instructions: [
    'Use list_discussion_categories first when you need a category node ID.',
    'Provide orderBy and direction together.',
    'The query input filters the fetched GraphQL page locally; totalCount and pageInfo continue to describe the unfiltered GitHub connection.'
  ],
  tags: { readOnly: true }
})
  .scopes(anyOf('repo', 'public_repo'))
  .input(
    z.object({
      owner: z.string().describe('Repository owner or organization login'),
      repo: z
        .string()
        .optional()
        .describe(
          'Repository name. Omit to list organization-level discussions from the .github repository.'
        ),
      after: z
        .string()
        .optional()
        .describe('Cursor from the previous response’s pageInfo.endCursor'),
      perPage: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Results to request from GitHub, from 1 through 100; defaults to 30'),
      category: z
        .string()
        .optional()
        .describe('Discussion category node ID used to filter results'),
      query: z
        .string()
        .optional()
        .describe(
          'Case-insensitive text filter applied to discussion titles and bodies within the fetched page'
        ),
      orderBy: z
        .enum(['CREATED_AT', 'UPDATED_AT'])
        .optional()
        .describe('Field used to order discussions; requires direction'),
      direction: z
        .enum(['ASC', 'DESC'])
        .optional()
        .describe('Ordering direction; requires orderBy')
    })
  )
  .output(
    z.object({
      repository: z.string().describe('Repository used to resolve discussions'),
      discussions: z.array(discussionSummarySchema).describe('Returned discussions'),
      totalCount: z
        .number()
        .describe('Provider-reported total before the optional page-local query filter'),
      returnedCount: z.number().describe('Number of discussions returned after filtering'),
      pageInfo: pageInfoSchema.describe('GraphQL pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let { owner, after, perPage, category, query, orderBy, direction } = ctx.input;
    if ((orderBy === undefined) !== (direction === undefined)) {
      throw invalidDiscussionInput(
        'orderBy and direction must be provided together.',
        'github_list_discussions_incomplete_ordering'
      );
    }

    let repo = discussionRepositoryName(ctx.input.repo);
    let client = createGitHubDiscussionClient(ctx.auth);
    let result = await client.requestGraphQL<DiscussionsResponse>(
      `query ListDiscussions(
        $owner: String!
        $repo: String!
        $first: Int!
        $after: String
        $categoryId: ID
        $orderBy: DiscussionOrder
      ) {
        repository(owner: $owner, name: $repo) {
          discussions(
            first: $first
            after: $after
            categoryId: $categoryId
            orderBy: $orderBy
          ) {
            nodes {
              number
              title
              body
              url
              createdAt
              updatedAt
              closed
              isAnswered
              answerChosenAt
              author {
                login
              }
              category {
                id
                name
              }
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
      }`,
      {
        owner,
        repo,
        first: perPage ?? 30,
        after: after ?? null,
        categoryId: category ?? null,
        orderBy:
          orderBy && direction
            ? {
                field: orderBy,
                direction
              }
            : null
      }
    );
    let repository = requireDiscussionRepository(result.repository, owner, repo);
    let discussions = filterDiscussions(repository.discussions.nodes, query);

    return {
      output: {
        repository: `${owner}/${repo}`,
        discussions,
        totalCount: repository.discussions.totalCount,
        returnedCount: discussions.length,
        pageInfo: normalizeDiscussionPageInfo(repository.discussions.pageInfo)
      },
      message: `Found **${discussions.length}** discussions for **${owner}/${repo}**${query ? ` matching "${query}" on this page` : ''}.`
    };
  })
  .build();
