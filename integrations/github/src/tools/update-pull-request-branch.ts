import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let updatePullRequestBranch = SlateTool.create(spec, {
  name: 'Update Pull Request Branch',
  key: 'update_pull_request_branch',
  description:
    'Update the branch of a pull request with the latest changes from the base branch.',
  tags: { destructive: false }
})
  .scopes(anyOf('repo', 'public_repo'))
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      pullNumber: z.number().describe('Pull request number'),
      expectedHeadSha: z
        .string()
        .optional()
        .describe("The expected SHA of the pull request's HEAD ref")
    })
  )
  .output(
    z.object({
      pullNumber: z.number(),
      message: z.string(),
      url: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient(ctx.auth);
    let result = await client.updatePullRequestBranch(
      ctx.input.owner,
      ctx.input.repo,
      ctx.input.pullNumber,
      ctx.input.expectedHeadSha
    );

    return {
      output: {
        pullNumber: ctx.input.pullNumber,
        message: result?.message ?? 'Pull request branch update is in progress',
        url: result?.url
      },
      message: `Started updating PR **#${ctx.input.pullNumber}** in **${ctx.input.owner}/${ctx.input.repo}** with its base branch.`
    };
  })
  .build();
