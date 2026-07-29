import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import {
  createGitHubDiscussionClient,
  discussionRepositoryName,
  normalizeDiscussionPageInfo,
  requireDiscussionRepository
} from '../lib/github-discussions';
import { spec } from '../spec';

let pageInfoSchema = z.object({
  hasNextPage: z.boolean().describe('Whether another category page is available'),
  hasPreviousPage: z.boolean().describe('Whether a previous category page is available'),
  startCursor: z.string().nullable().describe('Cursor for the first returned category'),
  endCursor: z.string().nullable().describe('Cursor for the final returned category')
});

interface DiscussionCategoriesResponse {
  repository: {
    discussionCategories: {
      nodes: Array<{ id: string; name: string }>;
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

export let listDiscussionCategories = SlateTool.create(spec, {
  name: 'List Discussion Categories',
  key: 'list_discussion_categories',
  description:
    'List GitHub Discussion category node IDs and names for a repository, or for an organization through its .github repository.',
  instructions: [
    'Use each returned category ID with list_discussions category filtering or discussion creation.',
    'When repo is omitted, GitHub organization-level categories are read from the owner’s .github repository.'
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
          'Repository name. Omit to list organization-level categories from the .github repository.'
        )
    })
  )
  .output(
    z.object({
      repository: z.string().describe('Repository used to resolve the categories'),
      categories: z
        .array(
          z.object({
            id: z.string().describe('Discussion category node ID'),
            name: z.string().describe('Discussion category name')
          })
        )
        .describe('Discussion categories'),
      totalCount: z.number().describe('Total number of discussion categories'),
      pageInfo: pageInfoSchema.describe('GraphQL pagination metadata')
    })
  )
  .handleInvocation(async ctx => {
    let repo = discussionRepositoryName(ctx.input.repo);
    let client = createGitHubDiscussionClient(ctx.auth);
    let result = await client.requestGraphQL<DiscussionCategoriesResponse>(
      `query ListDiscussionCategories(
        $owner: String!
        $repo: String!
        $first: Int!
      ) {
        repository(owner: $owner, name: $repo) {
          discussionCategories(first: $first) {
            nodes {
              id
              name
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
        owner: ctx.input.owner,
        repo,
        first: 25
      }
    );
    let repository = requireDiscussionRepository(result.repository, ctx.input.owner, repo);
    let categories = repository.discussionCategories.nodes;

    return {
      output: {
        repository: `${ctx.input.owner}/${repo}`,
        categories,
        totalCount: repository.discussionCategories.totalCount,
        pageInfo: normalizeDiscussionPageInfo(repository.discussionCategories.pageInfo)
      },
      message: `Found **${categories.length}** discussion categories for **${ctx.input.owner}/${repo}**.`
    };
  })
  .build();
