import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitLabClient } from '../lib/client';
import { gitLabServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageMergeRequest = SlateTool.create(spec, {
  name: 'Manage Merge Request',
  key: 'manage_merge_request',
  description: `Create, update, or merge a GitLab merge request. Create MRs with source/target branches, reviewers, and labels. Update MR properties, close/reopen, or accept and merge. Use **action** "merge" to accept and merge the MR.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'merge', 'approve'])
        .describe('Operation to perform'),
      projectId: z.string().describe('Project ID or URL-encoded path'),
      mergeRequestIid: z
        .number()
        .optional()
        .describe('Merge request IID (required for update, merge, approve)'),
      title: z.string().optional().describe('MR title (required for create)'),
      description: z.string().optional().describe('MR description (Markdown supported)'),
      sourceBranch: z.string().optional().describe('Source branch (required for create)'),
      targetBranch: z
        .string()
        .optional()
        .describe('Target branch (required for create, optional for update)'),
      assigneeIds: z.array(z.number()).optional().describe('Assignee user IDs'),
      reviewerIds: z.array(z.number()).optional().describe('Reviewer user IDs'),
      labels: z.string().optional().describe('Comma-separated labels'),
      milestoneId: z.number().optional().describe('Milestone ID'),
      squash: z.boolean().optional().describe('Squash commits on merge'),
      removeSourceBranch: z.boolean().optional().describe('Remove source branch after merge'),
      stateEvent: z
        .enum(['close', 'reopen'])
        .optional()
        .describe('Close or reopen the MR (update only)'),
      mergeCommitMessage: z
        .string()
        .optional()
        .describe('Custom merge commit message (merge only)'),
      squashCommitMessage: z
        .string()
        .optional()
        .describe('Custom squash commit message (merge only)')
    })
  )
  .output(
    z.object({
      mergeRequestId: z.number().describe('Global merge request ID'),
      mergeRequestIid: z.number().describe('MR IID within the project'),
      title: z.string().describe('MR title'),
      state: z.string().describe('MR state (opened/closed/merged)'),
      webUrl: z.string().describe('URL to the merge request'),
      sourceBranch: z.string().describe('Source branch'),
      targetBranch: z.string().describe('Target branch'),
      mergeStatus: z.string().nullable().describe('Merge status'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitLabClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });

    let mr: any;

    switch (ctx.input.action) {
      case 'create': {
        if (!ctx.input.sourceBranch)
          throw gitLabServiceError('Source branch is required for create');
        if (!ctx.input.targetBranch)
          throw gitLabServiceError('Target branch is required for create');
        if (!ctx.input.title) throw gitLabServiceError('Title is required for create');
        mr = await client.createMergeRequest(ctx.input.projectId, {
          sourceBranch: ctx.input.sourceBranch,
          targetBranch: ctx.input.targetBranch,
          title: ctx.input.title,
          description: ctx.input.description,
          assigneeIds: ctx.input.assigneeIds,
          reviewerIds: ctx.input.reviewerIds,
          labels: ctx.input.labels,
          milestoneId: ctx.input.milestoneId,
          squash: ctx.input.squash,
          removeSourceBranch: ctx.input.removeSourceBranch
        });
        break;
      }
      case 'update': {
        if (!ctx.input.mergeRequestIid)
          throw gitLabServiceError('Merge request IID is required for update');
        mr = await client.updateMergeRequest(ctx.input.projectId, ctx.input.mergeRequestIid, {
          title: ctx.input.title,
          description: ctx.input.description,
          assigneeIds: ctx.input.assigneeIds,
          reviewerIds: ctx.input.reviewerIds,
          labels: ctx.input.labels,
          milestoneId: ctx.input.milestoneId,
          stateEvent: ctx.input.stateEvent,
          targetBranch: ctx.input.targetBranch,
          squash: ctx.input.squash,
          removeSourceBranch: ctx.input.removeSourceBranch
        });
        break;
      }
      case 'merge': {
        if (!ctx.input.mergeRequestIid)
          throw gitLabServiceError('Merge request IID is required for merge');
        mr = await client.mergeMergeRequest(ctx.input.projectId, ctx.input.mergeRequestIid, {
          mergeCommitMessage: ctx.input.mergeCommitMessage,
          squashCommitMessage: ctx.input.squashCommitMessage,
          squash: ctx.input.squash,
          shouldRemoveSourceBranch: ctx.input.removeSourceBranch
        });
        break;
      }
      case 'approve': {
        if (!ctx.input.mergeRequestIid)
          throw gitLabServiceError('Merge request IID is required for approve');
        await client.approveMergeRequest(ctx.input.projectId, ctx.input.mergeRequestIid);
        mr = await client.getMergeRequest(ctx.input.projectId, ctx.input.mergeRequestIid);
        break;
      }
    }

    let actionVerb = {
      create: 'Created',
      update: 'Updated',
      merge: 'Merged',
      approve: 'Approved'
    }[ctx.input.action];

    return {
      output: {
        mergeRequestId: mr.id,
        mergeRequestIid: mr.iid,
        title: mr.title,
        state: mr.state,
        webUrl: mr.web_url,
        sourceBranch: mr.source_branch,
        targetBranch: mr.target_branch,
        mergeStatus: mr.merge_status || null,
        createdAt: mr.created_at
      },
      message: `${actionVerb} merge request **!${mr.iid}** — [${mr.title}](${mr.web_url}) (${mr.state})`
    };
  })
  .build();
