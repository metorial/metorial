import { SlateTool } from 'slates';
import { z } from 'zod';
import { AzureDevOpsClient } from '../lib/client';
import { spec } from '../spec';

export let managePullRequestTool = SlateTool.create(spec, {
  name: 'Manage Pull Requests',
  key: 'manage_pull_request',
  description: `Create, list, get, update, and complete pull requests. Add reviewers, add comments, approve or reject, and complete (merge) pull requests. Covers the full pull request lifecycle.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      project: z
        .string()
        .optional()
        .describe('Project name or ID. Uses default project from config if not provided.'),
      repositoryId: z.string().describe('Repository name or ID'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'add_reviewer', 'add_comment'])
        .describe('Action to perform'),
      pullRequestId: z
        .number()
        .optional()
        .describe('Pull request ID (required for get, update, add_reviewer, add_comment)'),

      // Create fields
      sourceRefName: z
        .string()
        .optional()
        .describe('Source branch ref (e.g. "refs/heads/feature"). Required for create.'),
      targetRefName: z
        .string()
        .optional()
        .describe('Target branch ref (e.g. "refs/heads/main"). Required for create.'),
      title: z
        .string()
        .optional()
        .describe('PR title (required for create, optional for update)'),
      description: z.string().optional().describe('PR description'),
      isDraft: z.boolean().optional().describe('Create as draft PR'),
      reviewerIds: z.array(z.string()).optional().describe('Reviewer identity IDs for create'),

      // Update fields
      status: z
        .enum(['active', 'abandoned', 'completed'])
        .optional()
        .describe('Set PR status (for update)'),
      autoComplete: z.boolean().optional().describe('Enable auto-complete (for update)'),
      autoCompleteUserId: z
        .string()
        .optional()
        .describe('User ID to set as auto-complete initiator'),

      // Add reviewer
      reviewerId: z
        .string()
        .optional()
        .describe('Identity ID of the reviewer (for add_reviewer)'),
      vote: z
        .number()
        .optional()
        .describe(
          'Vote: 10=approved, 5=approved with suggestions, 0=no vote, -5=waiting for author, -10=rejected (for add_reviewer)'
        ),

      // Add comment
      commentContent: z
        .string()
        .optional()
        .describe('Comment text in markdown (for add_comment)'),

      // List filters
      listStatus: z
        .enum(['active', 'abandoned', 'completed', 'all'])
        .optional()
        .describe('Filter PRs by status (for list)'),
      top: z.number().optional().describe('Max results (for list)')
    })
  )
  .output(
    z.object({
      pullRequest: z
        .object({
          pullRequestId: z.number(),
          title: z.string(),
          description: z.string().optional(),
          status: z.string(),
          sourceRefName: z.string(),
          targetRefName: z.string(),
          createdBy: z.string().optional(),
          creationDate: z.string().optional(),
          mergeStatus: z.string().optional(),
          isDraft: z.boolean().optional(),
          url: z.string().optional()
        })
        .optional(),
      pullRequests: z
        .array(
          z.object({
            pullRequestId: z.number(),
            title: z.string(),
            status: z.string(),
            sourceRefName: z.string(),
            targetRefName: z.string(),
            createdBy: z.string().optional(),
            creationDate: z.string().optional(),
            isDraft: z.boolean().optional()
          })
        )
        .optional(),
      threadId: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new AzureDevOpsClient({
      token: ctx.auth.token,
      organization: ctx.config.organization
    });
    let project = ctx.input.project || ctx.config.project;
    if (!project) throw new Error('Project is required.');

    let mapPR = (pr: any) => ({
      pullRequestId: pr.pullRequestId,
      title: pr.title,
      description: pr.description,
      status: pr.status,
      sourceRefName: pr.sourceRefName,
      targetRefName: pr.targetRefName,
      createdBy: pr.createdBy?.displayName,
      creationDate: pr.creationDate,
      mergeStatus: pr.mergeStatus,
      isDraft: pr.isDraft,
      url: pr._links?.web?.href || pr.url
    });

    if (ctx.input.action === 'list') {
      let result = await client.listPullRequests(project, ctx.input.repositoryId, {
        status: ctx.input.listStatus,
        top: ctx.input.top
      });
      let prs = (result.value || []).map(mapPR);
      return {
        output: { pullRequests: prs },
        message: `Found **${prs.length}** pull requests.`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.pullRequestId) throw new Error('pullRequestId is required for "get"');
      let pr = await client.getPullRequest(
        project,
        ctx.input.repositoryId,
        ctx.input.pullRequestId
      );
      return {
        output: { pullRequest: mapPR(pr) },
        message: `PR **#${pr.pullRequestId}**: "${pr.title}" — ${pr.status}`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.sourceRefName || !ctx.input.targetRefName || !ctx.input.title) {
        throw new Error('sourceRefName, targetRefName, and title are required for "create"');
      }
      let pr = await client.createPullRequest(project, ctx.input.repositoryId, {
        sourceRefName: ctx.input.sourceRefName,
        targetRefName: ctx.input.targetRefName,
        title: ctx.input.title,
        description: ctx.input.description,
        reviewerIds: ctx.input.reviewerIds,
        isDraft: ctx.input.isDraft
      });
      return {
        output: { pullRequest: mapPR(pr) },
        message: `Created PR **#${pr.pullRequestId}**: "${pr.title}"`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.pullRequestId) throw new Error('pullRequestId is required for "update"');
      let updateData: Record<string, any> = {};
      if (ctx.input.title) updateData.title = ctx.input.title;
      if (ctx.input.description !== undefined) updateData.description = ctx.input.description;
      if (ctx.input.status) updateData.status = ctx.input.status;
      if (ctx.input.autoComplete && ctx.input.autoCompleteUserId) {
        updateData.autoCompleteSetBy = { id: ctx.input.autoCompleteUserId };
      }
      let pr = await client.updatePullRequest(
        project,
        ctx.input.repositoryId,
        ctx.input.pullRequestId,
        updateData
      );
      return {
        output: { pullRequest: mapPR(pr) },
        message: `Updated PR **#${pr.pullRequestId}**: "${pr.title}" — ${pr.status}`
      };
    }

    if (ctx.input.action === 'add_reviewer') {
      if (!ctx.input.pullRequestId || !ctx.input.reviewerId) {
        throw new Error('pullRequestId and reviewerId are required for "add_reviewer"');
      }
      await client.createPullRequestReviewer(
        project,
        ctx.input.repositoryId,
        ctx.input.pullRequestId,
        ctx.input.reviewerId,
        ctx.input.vote
      );
      let pr = await client.getPullRequest(
        project,
        ctx.input.repositoryId,
        ctx.input.pullRequestId
      );
      return {
        output: { pullRequest: mapPR(pr) },
        message: `Added reviewer to PR **#${ctx.input.pullRequestId}**${ctx.input.vote ? ` with vote ${ctx.input.vote}` : ''}`
      };
    }

    if (ctx.input.action === 'add_comment') {
      if (!ctx.input.pullRequestId || !ctx.input.commentContent) {
        throw new Error('pullRequestId and commentContent are required for "add_comment"');
      }
      let thread = await client.createPullRequestThread(
        project,
        ctx.input.repositoryId,
        ctx.input.pullRequestId,
        ctx.input.commentContent
      );
      return {
        output: { threadId: thread.id },
        message: `Added comment to PR **#${ctx.input.pullRequestId}**`
      };
    }

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
