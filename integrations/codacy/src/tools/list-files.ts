import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let listFiles = SlateTool.create(spec, {
  name: 'List Repository Files',
  key: 'list_files',
  description: `List files in a repository with their code quality metrics including grade, number of issues, complexity, coverage, and duplication. Useful for identifying problematic files in a codebase.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      repositoryName: z.string().describe('Name of the repository.'),
      branchName: z.string().optional().describe('Branch name to get file metrics for.'),
      search: z.string().optional().describe('Filter files by path.'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response.'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of files to return (1-100).')
    })
  )
  .output(
    z.object({
      files: z
        .array(
          z.object({
            path: z.string().describe('File path.'),
            gradeLetter: z.string().optional().describe('Quality grade letter (A-F).'),
            totalIssues: z.number().optional().describe('Total number of issues in the file.'),
            complexity: z.number().optional().describe('File complexity score.'),
            coverage: z.number().optional().describe('Code coverage percentage.'),
            duplication: z.number().optional().describe('Duplication percentage.')
          })
        )
        .describe('List of files with quality metrics.'),
      cursor: z.string().optional().describe('Pagination cursor for the next page.'),
      total: z.number().optional().describe('Total number of files.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let response = await client.listFiles(ctx.input.repositoryName, {
      branchName: ctx.input.branchName,
      search: ctx.input.search,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let files = (response.data ?? []).map((file: any) => ({
      path: file.path ?? '',
      gradeLetter: file.gradeLetter ?? undefined,
      totalIssues: file.totalIssues ?? undefined,
      complexity: file.complexity ?? undefined,
      coverage: file.coverage ?? undefined,
      duplication: file.duplication ?? undefined
    }));

    return {
      output: {
        files,
        cursor: response.pagination?.cursor,
        total: response.pagination?.total
      },
      message: `Found **${files.length}** file(s) in **${ctx.input.repositoryName}**.${response.pagination?.total ? ` Total: ${response.pagination.total}.` : ''}`
    };
  })
  .build();
