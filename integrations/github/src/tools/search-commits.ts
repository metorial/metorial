import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';
import { commitSchema, mapCommit, paginationInputShape } from './repository-read-contracts';

export let searchCommits = SlateTool.create(spec, {
  name: 'Search Commits',
  key: 'search_commits',
  description:
    "Search for commits across GitHub repositories using GitHub's commit search syntax. Searches commit messages on default branches only.",
  tags: { readOnly: true }
})
  .input(
    z.object({
      query: z
        .string()
        .describe(
          'Commit search query. Scope with repo:owner/repo, org:, or user:. Supports author:, committer:, author-date:, committer-date:, merge:, hash:, tree:, and parent: qualifiers.'
        ),
      sort: z
        .enum(['author-date', 'committer-date'])
        .optional()
        .describe('Sort by author or committer date; omit for best match'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      ...paginationInputShape
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of matching commits'),
      incompleteResults: z.boolean().describe('Whether GitHub reports incomplete results'),
      page: z.number().describe('Requested page'),
      perPage: z.number().describe('Requested results per page'),
      commits: z.array(
        commitSchema.extend({
          repository: z.object({
            fullName: z.string().describe('Repository in owner/name form'),
            htmlUrl: z.string().describe('Repository URL'),
            private: z.boolean().describe('Whether the repository is private')
          })
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient(ctx.auth);
    let result = await client.searchCommits(ctx.input.query, ctx.input);
    let commits = (result.items ?? []).map((item: any) => ({
      ...mapCommit(item, 'none'),
      repository: {
        fullName: item.repository?.full_name ?? '',
        htmlUrl: item.repository?.html_url ?? '',
        private: item.repository?.private ?? false
      }
    }));

    return {
      output: {
        totalCount: result.total_count ?? commits.length,
        incompleteResults: result.incomplete_results ?? false,
        page: ctx.input.page ?? 1,
        perPage: ctx.input.perPage ?? 30,
        commits
      },
      message: `Found **${result.total_count ?? commits.length}** matching commits.`
    };
  })
  .build();
