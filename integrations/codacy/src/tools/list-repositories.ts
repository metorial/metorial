import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listRepositories = SlateTool.create(spec, {
  name: 'List Repositories',
  key: 'list_repositories',
  description: `List repositories in the configured organization with their analysis information including quality grade, issue counts, coverage, complexity, and duplication metrics. Can filter by name and supports pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      search: z.string().optional().describe('Filter repositories by name.'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response.'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of repositories to return (1-100).')
    })
  )
  .output(
    z.object({
      repositories: z
        .array(
          z.object({
            repositoryName: z.string().describe('Repository name.'),
            provider: z.string().optional().describe('Git provider.'),
            owner: z.string().optional().describe('Repository owner.'),
            gradeLetter: z.string().optional().describe('Quality grade letter (A-F).'),
            grade: z.number().optional().describe('Quality grade (0-100).'),
            totalIssues: z.number().optional().describe('Total number of issues.'),
            coverage: z.number().optional().describe('Code coverage percentage.'),
            totalComplexFiles: z.number().optional().describe('Total complex files count.'),
            totalDuplicatedFiles: z
              .number()
              .optional()
              .describe('Total duplicated files count.'),
            lastAnalysedCommitSha: z
              .string()
              .optional()
              .describe('SHA of the last analyzed commit.'),
            lastUpdated: z.string().optional().describe('Last update timestamp.')
          })
        )
        .describe('List of repositories with analysis data.'),
      cursor: z.string().optional().describe('Pagination cursor for the next page.'),
      total: z.number().optional().describe('Total number of repositories.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let response = await client.listRepositoriesWithAnalysis({
      search: ctx.input.search,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let repositories = (response.data ?? []).map((item: any) => ({
      repositoryName: item.repository?.name ?? '',
      provider: item.repository?.provider ?? undefined,
      owner: item.repository?.owner ?? undefined,
      gradeLetter: item.gradeLetter ?? undefined,
      grade: item.grade ?? undefined,
      totalIssues: item.totalIssues ?? undefined,
      coverage: item.coverage ?? undefined,
      totalComplexFiles: item.totalComplexFiles ?? undefined,
      totalDuplicatedFiles: item.totalDuplicatedFiles ?? undefined,
      lastAnalysedCommitSha: item.lastAnalysedCommit ?? undefined,
      lastUpdated: item.repository?.lastUpdated ?? undefined
    }));

    return {
      output: {
        repositories,
        cursor: response.pagination?.cursor,
        total: response.pagination?.total
      },
      message: `Found **${repositories.length}** repositor${repositories.length === 1 ? 'y' : 'ies'}.${response.pagination?.total ? ` Total: ${response.pagination.total}.` : ''}`
    };
  })
  .build();
