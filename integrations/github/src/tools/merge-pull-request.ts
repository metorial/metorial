import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let mergePullRequest = SlateTool.create(spec, {
  name: 'Merge Pull Request',
  key: 'merge_pull_request',
  description: `Merge a pull request using the specified merge method (merge commit, squash, or rebase).`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name'),
      pullNumber: z.number().describe('Pull request number'),
      commit_title: z.string().optional().describe('Title for the merge commit'),
      commit_message: z.string().optional().describe('Extra detail for the merge commit'),
      merge_method: z
        .enum(['merge', 'squash', 'rebase'])
        .optional()
        .describe('Merge method (default: merge)')
    })
  )
  .output(
    z.object({
      merged: z.boolean().describe('Whether the merge was successful'),
      sha: z.string().describe('SHA of the merge commit'),
      message: z.string().describe('Merge result message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let result = await client.mergePullRequest(
      ctx.input.owner,
      ctx.input.repo,
      ctx.input.pullNumber,
      {
        commitTitle: ctx.input.commit_title,
        commitMessage: ctx.input.commit_message,
        mergeMethod: ctx.input.merge_method
      }
    );

    return {
      output: {
        merged: result.merged,
        sha: result.sha,
        message: result.message
      },
      message: `Merged PR **#${ctx.input.pullNumber}** in **${ctx.input.owner}/${ctx.input.repo}** using ${ctx.input.merge_method ?? 'merge'} method.`
    };
  })
  .build();
