import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getCommitAnalysis = SlateTool.create(spec, {
  name: 'Get Commit Analysis',
  key: 'get_commit_analysis',
  description: `Retrieve analysis results for a specific commit, including quality metrics, issues introduced, and coverage data. Can also list recent commits with their analysis status for a repository.`,
  instructions: [
    'To get a specific commit, provide the commitSha.',
    'To list recent commits, omit commitSha and optionally provide a branchName.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      repositoryName: z.string().describe('Name of the repository.'),
      commitSha: z
        .string()
        .optional()
        .describe(
          'Specific commit SHA to get analysis for. If omitted, lists recent commits.'
        ),
      branchName: z
        .string()
        .optional()
        .describe('Branch name to filter commits (used when listing commits).'),
      cursor: z.string().optional().describe('Pagination cursor for listing commits.'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of commits to return when listing (1-100).')
    })
  )
  .output(
    z.object({
      commit: z
        .object({
          sha: z.string().optional().describe('Commit SHA.'),
          message: z.string().optional().describe('Commit message.'),
          authorName: z.string().optional().describe('Commit author name.'),
          authorEmail: z.string().optional().describe('Commit author email.'),
          timestamp: z.string().optional().describe('Commit timestamp.'),
          grade: z.number().optional().describe('Quality grade (0-100).'),
          gradeLetter: z.string().optional().describe('Quality grade letter (A-F).'),
          totalIssues: z.number().optional().describe('Total number of issues.'),
          newIssues: z.number().optional().describe('New issues introduced.'),
          fixedIssues: z.number().optional().describe('Issues fixed.'),
          coverage: z.number().optional().describe('Coverage percentage.')
        })
        .optional()
        .describe('Single commit analysis (when commitSha provided).'),
      commits: z
        .array(
          z.object({
            sha: z.string().optional().describe('Commit SHA.'),
            message: z.string().optional().describe('Commit message.'),
            authorName: z.string().optional().describe('Author name.'),
            timestamp: z.string().optional().describe('Commit timestamp.'),
            gradeLetter: z.string().optional().describe('Quality grade letter.'),
            totalIssues: z.number().optional().describe('Total issues.')
          })
        )
        .optional()
        .describe('List of commits (when listing).'),
      cursor: z.string().optional().describe('Pagination cursor for the next page.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    if (ctx.input.commitSha) {
      let response = await client.getCommitWithAnalysis(
        ctx.input.repositoryName,
        ctx.input.commitSha
      );
      let data = response.data ?? response;

      return {
        output: {
          commit: {
            sha: data.commit?.sha ?? data.sha ?? ctx.input.commitSha,
            message: data.commit?.message ?? data.message ?? undefined,
            authorName: data.commit?.authorName ?? data.authorName ?? undefined,
            authorEmail: data.commit?.authorEmail ?? data.authorEmail ?? undefined,
            timestamp: data.commit?.timestamp ?? data.timestamp ?? undefined,
            grade: data.grade ?? undefined,
            gradeLetter: data.gradeLetter ?? undefined,
            totalIssues: data.totalIssues ?? undefined,
            newIssues: data.newIssues ?? undefined,
            fixedIssues: data.fixedIssues ?? undefined,
            coverage: data.coverage ?? undefined
          }
        },
        message: `Commit **${ctx.input.commitSha.substring(0, 7)}**: Grade **${data.gradeLetter ?? 'N/A'}**, ${data.totalIssues ?? 0} total issues.`
      };
    }

    let response = await client.listRepositoryCommits(ctx.input.repositoryName, {
      branchName: ctx.input.branchName,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let commits = (response.data ?? []).map((item: any) => ({
      sha: item.commit?.sha ?? item.sha ?? '',
      message: item.commit?.message ?? item.message ?? undefined,
      authorName: item.commit?.authorName ?? item.authorName ?? undefined,
      timestamp: item.commit?.timestamp ?? item.timestamp ?? undefined,
      gradeLetter: item.gradeLetter ?? undefined,
      totalIssues: item.totalIssues ?? undefined
    }));

    return {
      output: {
        commits,
        cursor: response.pagination?.cursor
      },
      message: `Found **${commits.length}** commit(s) in **${ctx.input.repositoryName}**.`
    };
  })
  .build();
