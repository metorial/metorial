import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let searchIssues = SlateTool.create(spec, {
  name: 'Search Issues',
  key: 'search_issues',
  description: `Search and filter code quality issues in a repository. Filter by severity level (Error, Warning, Info), category (Security, CodeStyle, ErrorProne, etc.), language, branch, pattern, and author. Returns issue details including file path, line number, message, tool, and severity.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      repositoryName: z.string().describe('Name of the repository to search issues in.'),
      branchName: z.string().optional().describe('Branch name to filter issues by.'),
      levels: z
        .array(z.enum(['Error', 'Warning', 'Info']))
        .optional()
        .describe('Severity levels to filter by.'),
      categories: z
        .array(z.string())
        .optional()
        .describe(
          'Issue categories to filter by (e.g. Security, CodeStyle, ErrorProne, Performance, Compatibility, UnusedCode, Complexity, BestPractice, Comprehensibility, Documentation).'
        ),
      languages: z
        .array(z.string())
        .optional()
        .describe('Programming languages to filter by (e.g. Java, Python, JavaScript).'),
      patternIds: z
        .array(z.string())
        .optional()
        .describe('Specific pattern IDs to filter by.'),
      authorEmails: z
        .array(z.string())
        .optional()
        .describe('Author email addresses to filter by.'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response.'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of issues to return (1-100).')
    })
  )
  .output(
    z.object({
      issues: z
        .array(
          z.object({
            issueId: z.string().describe('Unique issue identifier.'),
            filePath: z.string().optional().describe('File path where the issue was found.'),
            lineNumber: z.number().optional().describe('Line number of the issue.'),
            message: z.string().optional().describe('Issue description message.'),
            level: z.string().optional().describe('Issue severity level.'),
            category: z.string().optional().describe('Issue category.'),
            patternId: z.string().optional().describe('Pattern that detected the issue.'),
            toolName: z
              .string()
              .optional()
              .describe('Name of the analysis tool that found the issue.'),
            language: z.string().optional().describe('Programming language of the file.'),
            commitSha: z
              .string()
              .optional()
              .describe('Commit SHA where the issue was introduced.')
          })
        )
        .describe('List of issues matching the search criteria.'),
      cursor: z.string().optional().describe('Pagination cursor for the next page.'),
      total: z.number().optional().describe('Total number of matching issues.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let body: any = {};
    if (ctx.input.branchName) body.branchName = ctx.input.branchName;
    if (ctx.input.levels) body.levels = ctx.input.levels;
    if (ctx.input.categories) body.categories = ctx.input.categories;
    if (ctx.input.languages) body.languages = ctx.input.languages;
    if (ctx.input.patternIds) body.patternIds = ctx.input.patternIds;
    if (ctx.input.authorEmails) body.authorEmails = ctx.input.authorEmails;

    let response = await client.searchRepositoryIssues(ctx.input.repositoryName, body, {
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let issues = (response.data ?? []).map((issue: any) => ({
      issueId: issue.issueId ?? '',
      filePath: issue.filePath ?? undefined,
      lineNumber: issue.lineNumber ?? undefined,
      message: issue.message ?? undefined,
      level: issue.patternInfo?.level ?? undefined,
      category: issue.patternInfo?.category ?? undefined,
      patternId: issue.patternInfo?.id ?? undefined,
      toolName: issue.toolInfo?.name ?? undefined,
      language: issue.language ?? undefined,
      commitSha: issue.commitInfo?.sha ?? undefined
    }));

    return {
      output: {
        issues,
        cursor: response.pagination?.cursor,
        total: response.pagination?.total
      },
      message: `Found **${issues.length}** issue(s) in **${ctx.input.repositoryName}**.${response.pagination?.total ? ` Total: ${response.pagination.total}.` : ''}`
    };
  })
  .build();
