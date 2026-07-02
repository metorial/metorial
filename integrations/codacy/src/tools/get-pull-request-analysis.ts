import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getPullRequestAnalysis = SlateTool.create(spec, {
  name: 'Get Pull Request Analysis',
  key: 'get_pull_request_analysis',
  description: `Retrieve detailed analysis results for a specific pull request, including quality gate status, new/fixed issues, coverage metrics, and affected files. Optionally includes the list of issues found in the PR.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      repositoryName: z.string().describe('Name of the repository.'),
      pullRequestNumber: z.number().describe('Pull request number.'),
      includeIssues: z
        .boolean()
        .optional()
        .default(false)
        .describe('Whether to also fetch the list of issues in the PR.')
    })
  )
  .output(
    z.object({
      pullRequestNumber: z.number().describe('Pull request number.'),
      title: z.string().optional().describe('Pull request title.'),
      status: z.string().optional().describe('PR status.'),
      isUpToStandards: z.boolean().optional().describe('Whether the PR passes quality gates.'),
      isAnalysing: z.boolean().optional().describe('Whether analysis is still in progress.'),
      newIssues: z.number().optional().describe('Number of new issues introduced.'),
      fixedIssues: z.number().optional().describe('Number of issues fixed.'),
      diffCoverage: z.number().optional().describe('Diff coverage percentage.'),
      coverageVariation: z.number().optional().describe('Coverage variation percentage.'),
      originBranch: z.string().optional().describe('Source branch.'),
      targetBranch: z.string().optional().describe('Target branch.'),
      headCommitSha: z.string().optional().describe('Head commit SHA.'),
      gitHref: z.string().optional().describe('Link to the PR on the Git provider.'),
      issues: z
        .array(
          z.object({
            issueId: z.string().describe('Issue identifier.'),
            filePath: z.string().optional().describe('File path.'),
            lineNumber: z.number().optional().describe('Line number.'),
            message: z.string().optional().describe('Issue message.'),
            level: z.string().optional().describe('Severity level.'),
            toolName: z.string().optional().describe('Analysis tool name.')
          })
        )
        .optional()
        .describe('Issues found in the PR, if requested.')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let response = await client.getPullRequestWithAnalysis(
      ctx.input.repositoryName,
      ctx.input.pullRequestNumber
    );
    let data = response.data ?? response;

    let result: any = {
      pullRequestNumber: data.pullRequest?.number ?? ctx.input.pullRequestNumber,
      title: data.pullRequest?.title ?? undefined,
      status: data.pullRequest?.status ?? undefined,
      isUpToStandards: data.isUpToStandards ?? undefined,
      isAnalysing: data.isAnalysing ?? undefined,
      newIssues: data.newIssues ?? undefined,
      fixedIssues: data.fixedIssues ?? undefined,
      diffCoverage: data.coverage?.diffCoverage?.value ?? undefined,
      coverageVariation: data.coverage?.coverageVariation?.value ?? undefined,
      originBranch: data.pullRequest?.originBranch ?? undefined,
      targetBranch: data.pullRequest?.targetBranch ?? undefined,
      headCommitSha: data.pullRequest?.headCommitSha ?? undefined,
      gitHref: data.pullRequest?.gitHref ?? undefined
    };

    if (ctx.input.includeIssues) {
      let issuesResponse = await client.listPullRequestIssues(
        ctx.input.repositoryName,
        ctx.input.pullRequestNumber,
        { limit: 100 }
      );
      result.issues = (issuesResponse.data ?? []).map((issue: any) => ({
        issueId: issue.issueId ?? '',
        filePath: issue.filePath ?? undefined,
        lineNumber: issue.lineNumber ?? undefined,
        message: issue.message ?? undefined,
        level: issue.patternInfo?.level ?? undefined,
        toolName: issue.toolInfo?.name ?? undefined
      }));
    }

    let statusText =
      result.isUpToStandards === true
        ? 'passes quality gates'
        : result.isUpToStandards === false
          ? 'does not pass quality gates'
          : 'quality gate status unknown';

    return {
      output: result,
      message: `PR #${result.pullRequestNumber} "${result.title ?? ''}": **${statusText}**. ${result.newIssues ?? 0} new issues, ${result.fixedIssues ?? 0} fixed.${result.diffCoverage != null ? ` Diff coverage: ${result.diffCoverage}%.` : ''}`
    };
  })
  .build();
