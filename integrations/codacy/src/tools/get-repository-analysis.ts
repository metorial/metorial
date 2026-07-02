import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getRepositoryAnalysis = SlateTool.create(spec, {
  name: 'Get Repository Analysis',
  key: 'get_repository_analysis',
  description: `Retrieve detailed code analysis results for a specific repository including quality grade, issues, complexity, duplication, coverage, and analysis progress. Provides a comprehensive quality overview of the repository.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      repositoryName: z.string().describe('Name of the repository to get analysis for.'),
      includeProgress: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to also fetch analysis progress status.')
    })
  )
  .output(
    z.object({
      repositoryName: z.string().describe('Repository name.'),
      provider: z.string().optional().describe('Git provider.'),
      gradeLetter: z.string().optional().describe('Quality grade letter (A-F).'),
      grade: z.number().optional().describe('Quality grade (0-100).'),
      totalIssues: z.number().optional().describe('Total number of issues.'),
      coverage: z.number().optional().describe('Code coverage percentage.'),
      totalComplexFiles: z.number().optional().describe('Total complex files.'),
      totalDuplicatedFiles: z.number().optional().describe('Total duplicated files.'),
      lastAnalysedCommitSha: z
        .string()
        .optional()
        .describe('SHA of the last analyzed commit.'),
      analysisProgress: z
        .object({
          isAnalysing: z.boolean().optional(),
          percentage: z.number().optional()
        })
        .optional()
        .describe('Current analysis progress, if requested.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let repoData = await client.getRepositoryWithAnalysis(ctx.input.repositoryName);
    let data = repoData.data ?? repoData;

    let result: any = {
      repositoryName: data.repository?.name ?? ctx.input.repositoryName,
      provider: data.repository?.provider ?? undefined,
      gradeLetter: data.gradeLetter ?? undefined,
      grade: data.grade ?? undefined,
      totalIssues: data.totalIssues ?? undefined,
      coverage: data.coverage ?? undefined,
      totalComplexFiles: data.totalComplexFiles ?? undefined,
      totalDuplicatedFiles: data.totalDuplicatedFiles ?? undefined,
      lastAnalysedCommitSha: data.lastAnalysedCommit ?? undefined
    };

    if (ctx.input.includeProgress) {
      let progress = await client.getAnalysisProgress(ctx.input.repositoryName);
      let progressData = progress.data ?? progress;
      result.analysisProgress = {
        isAnalysing: progressData.isAnalysing ?? undefined,
        percentage: progressData.percentage ?? undefined
      };
    }

    return {
      output: result,
      message: `Repository **${result.repositoryName}**: Grade **${result.gradeLetter ?? 'N/A'}**, ${result.totalIssues ?? 0} issues, ${result.coverage != null ? `${result.coverage}% coverage` : 'no coverage data'}.`
    };
  })
  .build();
