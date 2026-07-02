import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createPullRequestTool = SlateTool.create(spec, {
  name: 'Create Pull Request',
  key: 'create_pull_request',
  description: `Create a new pull request to merge changes from a source branch into a destination branch. Supports setting title, description, reviewers, and close-source-branch option.`
})
  .input(
    z.object({
      repoSlug: z.string().describe('Repository slug'),
      title: z.string().describe('Pull request title'),
      sourceBranch: z.string().describe('Source branch name'),
      destinationBranch: z.string().describe('Destination/target branch name'),
      description: z
        .string()
        .optional()
        .describe('Pull request description (supports Markdown)'),
      reviewerUuids: z.array(z.string()).optional().describe('List of reviewer user UUIDs'),
      closeSourceBranch: z
        .boolean()
        .optional()
        .describe('Whether to close the source branch after merge')
    })
  )
  .output(
    z.object({
      pullRequestId: z.number(),
      title: z.string(),
      state: z.string(),
      htmlUrl: z.string().optional(),
      sourceBranch: z.string().optional(),
      destinationBranch: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

    let body: Record<string, any> = {
      title: ctx.input.title,
      source: { branch: { name: ctx.input.sourceBranch } },
      destination: { branch: { name: ctx.input.destinationBranch } }
    };
    if (ctx.input.description) body.description = ctx.input.description;
    if (ctx.input.closeSourceBranch !== undefined)
      body.close_source_branch = ctx.input.closeSourceBranch;
    if (ctx.input.reviewerUuids?.length) {
      body.reviewers = ctx.input.reviewerUuids.map(uuid => ({ uuid }));
    }

    let pr = await client.createPullRequest(ctx.input.repoSlug, body);

    return {
      output: {
        pullRequestId: pr.id,
        title: pr.title,
        state: pr.state,
        htmlUrl: pr.links?.html?.href || undefined,
        sourceBranch: pr.source?.branch?.name || undefined,
        destinationBranch: pr.destination?.branch?.name || undefined
      },
      message: `Created pull request **#${pr.id}: ${pr.title}** (${ctx.input.sourceBranch} → ${ctx.input.destinationBranch}).`
    };
  })
  .build();
