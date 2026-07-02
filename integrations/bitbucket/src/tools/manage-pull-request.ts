import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let managePullRequestTool = SlateTool.create(spec, {
  name: 'Manage Pull Request',
  key: 'manage_pull_request',
  description: `Perform actions on a pull request: **approve**, **unapprove**, **merge**, **decline**, **request_changes**, or **remove_change_request**.
Use "merge" with optional merge strategy and close-source-branch settings.`,
  instructions: [
    'Choose exactly one action to perform on the pull request.',
    'For "merge", you may optionally specify a mergeStrategy.'
  ]
})
  .input(
    z.object({
      repoSlug: z.string().describe('Repository slug'),
      pullRequestId: z.coerce.number().describe('Pull request ID'),
      action: z
        .enum([
          'approve',
          'unapprove',
          'merge',
          'decline',
          'request_changes',
          'remove_change_request'
        ])
        .describe('Action to perform'),
      mergeStrategy: z
        .enum(['merge_commit', 'squash', 'fast_forward'])
        .optional()
        .describe('Merge strategy (only for "merge" action)'),
      closeSourceBranch: z
        .boolean()
        .optional()
        .describe('Close source branch after merge (only for "merge" action)'),
      mergeMessage: z
        .string()
        .optional()
        .describe('Custom merge commit message (only for "merge" action)')
    })
  )
  .output(
    z.object({
      pullRequestId: z.number(),
      state: z.string().optional(),
      mergeCommit: z.string().optional(),
      actionPerformed: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });
    let { repoSlug, pullRequestId, action } = ctx.input;

    let result: any;

    switch (action) {
      case 'approve':
        result = await client.approvePullRequest(repoSlug, pullRequestId);
        break;
      case 'unapprove':
        await client.unapprovePullRequest(repoSlug, pullRequestId);
        break;
      case 'merge': {
        let mergeBody: Record<string, any> = {};
        if (ctx.input.mergeStrategy) mergeBody.merge_strategy = ctx.input.mergeStrategy;
        if (ctx.input.closeSourceBranch !== undefined)
          mergeBody.close_source_branch = ctx.input.closeSourceBranch;
        if (ctx.input.mergeMessage) mergeBody.message = ctx.input.mergeMessage;
        result = await client.mergePullRequest(repoSlug, pullRequestId, mergeBody);
        break;
      }
      case 'decline':
        result = await client.declinePullRequest(repoSlug, pullRequestId);
        break;
      case 'request_changes':
        result = await client.requestChanges(repoSlug, pullRequestId);
        break;
      case 'remove_change_request':
        await client.removeChangeRequest(repoSlug, pullRequestId);
        break;
    }

    return {
      output: {
        pullRequestId,
        state: result?.state || undefined,
        mergeCommit: result?.merge_commit?.hash || undefined,
        actionPerformed: action
      },
      message: `Performed **${action}** on pull request **#${pullRequestId}**.`
    };
  })
  .build();
