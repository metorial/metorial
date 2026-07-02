import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let managePullRequestTool = SlateTool.create(spec, {
  name: 'Manage Pull Request',
  key: 'manage_pull_request',
  description: `Create, get, update, or list pull requests on a Postman collection. Pull requests enable reviewers to review forked collection changes before merging them into the parent collection.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'update', 'list']).describe('Operation to perform'),
      collectionId: z
        .string()
        .optional()
        .describe('Collection ID (required for create and list)'),
      pullRequestId: z
        .string()
        .optional()
        .describe('Pull request ID (required for get and update)'),
      title: z.string().optional().describe('PR title (required for create)'),
      description: z.string().optional().describe('PR description'),
      sourceUid: z.string().optional().describe('Forked collection UID (required for create)'),
      destinationUid: z
        .string()
        .optional()
        .describe('Parent collection UID (required for create)'),
      reviewers: z.array(z.string()).optional().describe('User IDs of reviewers')
    })
  )
  .output(
    z.object({
      pullRequest: z.any().optional(),
      pullRequests: z.array(z.any()).optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.collectionId) throw new Error('collectionId is required for create.');
      if (!ctx.input.title || !ctx.input.sourceUid || !ctx.input.destinationUid) {
        throw new Error('title, sourceUid, and destinationUid are required for create.');
      }
      let result = await client.createPullRequest(ctx.input.collectionId, {
        title: ctx.input.title,
        description: ctx.input.description,
        source: ctx.input.sourceUid,
        destination: ctx.input.destinationUid,
        reviewers: ctx.input.reviewers
      });
      return {
        output: { pullRequest: result },
        message: `Created pull request **"${ctx.input.title}"**.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.pullRequestId) throw new Error('pullRequestId is required for get.');
      let result = await client.getPullRequest(ctx.input.pullRequestId);
      return {
        output: { pullRequest: result },
        message: `Retrieved pull request **"${result?.title ?? ctx.input.pullRequestId}"**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.pullRequestId) throw new Error('pullRequestId is required for update.');
      let result = await client.updatePullRequest(ctx.input.pullRequestId, {
        title: ctx.input.title,
        description: ctx.input.description
      });
      return {
        output: { pullRequest: result },
        message: `Updated pull request **${ctx.input.pullRequestId}**.`
      };
    }

    if (!ctx.input.collectionId) throw new Error('collectionId is required for list.');
    let result = await client.listPullRequests(ctx.input.collectionId);
    return {
      output: { pullRequests: result },
      message: `Found **${result.length}** pull request(s).`
    };
  })
  .build();
