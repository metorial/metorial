import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let newPullRequests = SlateTrigger.create(spec, {
  name: 'New Pull Requests',
  key: 'new_pull_requests',
  description:
    'Triggers when new pull requests are detected in a repository, including their analysis results and quality gate status.'
})
  .input(
    z.object({
      repositoryName: z.string().describe('Repository name.'),
      pullRequestNumber: z.number().describe('Pull request number.'),
      title: z.string().optional().describe('Pull request title.'),
      status: z.string().optional().describe('PR status.'),
      originBranch: z.string().optional().describe('Source branch.'),
      targetBranch: z.string().optional().describe('Target branch.'),
      ownerName: z.string().optional().describe('PR author.'),
      isUpToStandards: z.boolean().optional().describe('Whether the PR passes quality gates.'),
      newIssues: z.number().optional().describe('New issues introduced.'),
      fixedIssues: z.number().optional().describe('Issues fixed.'),
      updated: z.string().optional().describe('Last update timestamp.'),
      gitHref: z.string().optional().describe('Link to the PR on the Git provider.')
    })
  )
  .output(
    z.object({
      pullRequestNumber: z.number().describe('Pull request number.'),
      title: z.string().optional().describe('Pull request title.'),
      status: z.string().optional().describe('PR status.'),
      originBranch: z.string().optional().describe('Source branch.'),
      targetBranch: z.string().optional().describe('Target branch.'),
      ownerName: z.string().optional().describe('PR author.'),
      isUpToStandards: z.boolean().optional().describe('Whether the PR passes quality gates.'),
      newIssues: z.number().optional().describe('New issues introduced.'),
      fixedIssues: z.number().optional().describe('Issues fixed.'),
      updated: z.string().optional().describe('Last update timestamp.'),
      gitHref: z.string().optional().describe('Link to the PR on the Git provider.'),
      repositoryName: z.string().describe('Repository name.')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);
      let repositoryName = (ctx.state as any)?.repositoryName;

      if (!repositoryName) {
        return { inputs: [], updatedState: ctx.state };
      }

      let response = await client.listRepositoryPullRequests(repositoryName, { limit: 50 });
      let pullRequests = response.data ?? [];

      let knownIds: string[] = (ctx.state as any)?.knownPullRequestIds ?? [];
      let knownSet = new Set(knownIds);

      let newPrs = pullRequests.filter((pr: any) => {
        let prNumber = pr.pullRequest?.number ?? pr.number;
        return prNumber && !knownSet.has(String(prNumber));
      });

      let allIds = pullRequests
        .map((pr: any) => String(pr.pullRequest?.number ?? pr.number))
        .filter(Boolean);

      return {
        inputs: newPrs.map((pr: any) => ({
          repositoryName,
          pullRequestNumber: pr.pullRequest?.number ?? pr.number ?? 0,
          title: pr.pullRequest?.title ?? pr.title ?? undefined,
          status: pr.pullRequest?.status ?? pr.status ?? undefined,
          originBranch: pr.pullRequest?.originBranch ?? pr.originBranch ?? undefined,
          targetBranch: pr.pullRequest?.targetBranch ?? pr.targetBranch ?? undefined,
          ownerName: pr.pullRequest?.owner?.name ?? pr.owner?.name ?? undefined,
          isUpToStandards: pr.isUpToStandards ?? undefined,
          newIssues: pr.newIssues ?? undefined,
          fixedIssues: pr.fixedIssues ?? undefined,
          updated: pr.pullRequest?.updated ?? pr.updated ?? undefined,
          gitHref: pr.pullRequest?.gitHref ?? pr.gitHref ?? undefined
        })),
        updatedState: {
          repositoryName,
          knownPullRequestIds: allIds
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'pull_request.created',
        id: `pr-${ctx.input.repositoryName}-${ctx.input.pullRequestNumber}`,
        output: {
          pullRequestNumber: ctx.input.pullRequestNumber,
          title: ctx.input.title,
          status: ctx.input.status,
          originBranch: ctx.input.originBranch,
          targetBranch: ctx.input.targetBranch,
          ownerName: ctx.input.ownerName,
          isUpToStandards: ctx.input.isUpToStandards,
          newIssues: ctx.input.newIssues,
          fixedIssues: ctx.input.fixedIssues,
          updated: ctx.input.updated,
          gitHref: ctx.input.gitHref,
          repositoryName: ctx.input.repositoryName
        }
      };
    }
  })
  .build();
