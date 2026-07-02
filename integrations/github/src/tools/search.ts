import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let search = SlateTool.create(spec, {
  name: 'Search GitHub',
  key: 'search',
  description: `Search across GitHub for repositories, code, issues/pull requests, or users using GitHub's search syntax.
Supports qualifiers for filtering (e.g., "language:python stars:>100" for repositories).`,
  instructions: [
    'Use GitHub search qualifiers in the query for precise results (e.g., "repo:owner/name", "language:go", "is:pr is:merged").',
    'For issues vs PRs, use "is:issue" or "is:pr" qualifier in the query when searching type "issues".'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      type: z
        .enum(['repositories', 'code', 'issues', 'users'])
        .describe('Type of resource to search'),
      query: z.string().describe('Search query with optional GitHub search qualifiers'),
      sort: z
        .string()
        .optional()
        .describe('Sort field (varies by type, e.g., "stars", "updated", "comments")'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      perPage: z.number().optional().describe('Results per page (max 100)'),
      page: z.number().optional().describe('Page number')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching results'),
      incompleteResults: z.boolean().describe('Whether results may be incomplete'),
      items: z
        .array(z.record(z.string(), z.any()))
        .describe('Search result items (shape depends on search type)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let { type, query, ...params } = ctx.input;
    let result: any;

    switch (type) {
      case 'repositories':
        result = await client.searchRepositories(query, params);
        break;
      case 'code':
        result = await client.searchCode(query, params);
        break;
      case 'issues':
        result = await client.searchIssues(query, params);
        break;
      case 'users':
        result = await client.searchUsers(query, params);
        break;
    }

    return {
      output: {
        totalCount: result.total_count,
        incompleteResults: result.incomplete_results,
        items: result.items
      },
      message: `Found **${result.total_count}** results for "${query}" (${type}).`
    };
  })
  .build();
