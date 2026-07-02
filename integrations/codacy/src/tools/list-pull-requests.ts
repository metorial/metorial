import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listPullRequests = SlateTool.create(spec, {
  name: 'List Pull Requests',
  key: 'list_pull_requests',
  description: `List pull requests for a repository with their analysis status. Returns PR title, status, quality gate results, and issue counts. Useful for monitoring PR quality across a repository.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      repositoryName: z.string().describe('Name of the repository to list pull requests for.'),
      search: z.string().optional().describe('Search text to filter pull requests by title.'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response.'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of pull requests to return (1-100).')
    })
  )
  .output(
    z.object({
      pullRequests: z
        .array(
          z.object({
            pullRequestNumber: z.number().describe('Pull request number.'),
            title: z.string().optional().describe('Pull request title.'),
            status: z
              .string()
              .optional()
              .describe('Pull request status (open, merged, closed).'),
            originBranch: z.string().optional().describe('Source branch name.'),
            targetBranch: z.string().optional().describe('Target branch name.'),
            ownerName: z.string().optional().describe('PR author name.'),
            isUpToStandards: z
              .boolean()
              .optional()
              .describe('Whether the PR passes quality gates.'),
            newIssues: z.number().optional().describe('Number of new issues introduced.'),
            fixedIssues: z.number().optional().describe('Number of issues fixed.'),
            coverage: z.number().optional().describe('Diff coverage percentage.'),
            updated: z.string().optional().describe('Last update timestamp.'),
            gitHref: z.string().optional().describe('Link to the PR on the Git provider.')
          })
        )
        .describe('List of pull requests.'),
      cursor: z.string().optional().describe('Pagination cursor for the next page.'),
      total: z.number().optional().describe('Total number of pull requests.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let response = await client.listRepositoryPullRequests(ctx.input.repositoryName, {
      search: ctx.input.search,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let pullRequests = (response.data ?? []).map((pr: any) => ({
      pullRequestNumber: pr.pullRequest?.number ?? pr.number ?? 0,
      title: pr.pullRequest?.title ?? pr.title ?? undefined,
      status: pr.pullRequest?.status ?? pr.status ?? undefined,
      originBranch: pr.pullRequest?.originBranch ?? pr.originBranch ?? undefined,
      targetBranch: pr.pullRequest?.targetBranch ?? pr.targetBranch ?? undefined,
      ownerName: pr.pullRequest?.owner?.name ?? pr.owner?.name ?? undefined,
      isUpToStandards: pr.isUpToStandards ?? undefined,
      newIssues: pr.newIssues ?? undefined,
      fixedIssues: pr.fixedIssues ?? undefined,
      coverage: pr.coverage?.diffCoverage?.value ?? undefined,
      updated: pr.pullRequest?.updated ?? pr.updated ?? undefined,
      gitHref: pr.pullRequest?.gitHref ?? pr.gitHref ?? undefined
    }));

    return {
      output: {
        pullRequests,
        cursor: response.pagination?.cursor,
        total: response.pagination?.total
      },
      message: `Found **${pullRequests.length}** pull request(s) in **${ctx.input.repositoryName}**.`
    };
  })
  .build();
