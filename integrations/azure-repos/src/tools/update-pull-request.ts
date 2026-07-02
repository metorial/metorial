import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updatePullRequest = SlateTool.create(spec, {
  name: 'Update Pull Request',
  key: 'update_pull_request',
  description: `Updates a pull request's properties. Can change title, description, status (complete/abandon/reactivate), draft state, target branch, and auto-complete settings. Also supports adding/removing reviewers and voting.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      repositoryId: z.string().describe('ID or name of the repository'),
      pullRequestId: z.number().describe('Pull request ID'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      status: z
        .enum(['active', 'completed', 'abandoned'])
        .optional()
        .describe('New status — set to "completed" to merge, "abandoned" to close'),
      targetBranch: z.string().optional().describe('New target branch'),
      isDraft: z.boolean().optional().describe('Toggle draft state'),
      autoCompleteUserId: z
        .string()
        .optional()
        .describe('User ID to enable auto-complete (set to empty string to disable)'),
      mergeStrategy: z
        .enum(['noFastForward', 'squash', 'rebase', 'rebaseMerge'])
        .optional()
        .describe('Merge strategy for completion'),
      deleteSourceBranch: z.boolean().optional().describe('Delete source branch after merge'),
      mergeCommitMessage: z.string().optional().describe('Custom merge commit message'),
      addReviewerIds: z.array(z.string()).optional().describe('User IDs of reviewers to add'),
      removeReviewerIds: z
        .array(z.string())
        .optional()
        .describe('User IDs of reviewers to remove'),
      vote: z
        .object({
          reviewerId: z.string().describe('User ID of the reviewer voting'),
          value: z
            .number()
            .describe(
              'Vote value: 10=approve, 5=approve with suggestions, 0=no vote, -5=wait, -10=reject'
            )
        })
        .optional()
        .describe('Cast a vote on the pull request')
    })
  )
  .output(
    z.object({
      pullRequestId: z.number().describe('Pull request ID'),
      title: z.string().describe('Title of the pull request'),
      status: z.string().describe('Updated status'),
      isDraft: z.boolean().optional().describe('Draft state'),
      mergeStatus: z.string().optional().describe('Merge status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organization: ctx.config.organization,
      project: ctx.config.project
    });

    let targetRefName = ctx.input.targetBranch
      ? ctx.input.targetBranch.startsWith('refs/')
        ? ctx.input.targetBranch
        : `refs/heads/${ctx.input.targetBranch}`
      : undefined;

    let hasCompletionOptions =
      ctx.input.mergeStrategy ||
      ctx.input.deleteSourceBranch !== undefined ||
      ctx.input.mergeCommitMessage;

    let updates = {
      title: ctx.input.title,
      description: ctx.input.description,
      status: ctx.input.status,
      targetRefName,
      isDraft: ctx.input.isDraft,
      autoCompleteSetBy:
        ctx.input.autoCompleteUserId !== undefined
          ? ctx.input.autoCompleteUserId === ''
            ? null
            : { id: ctx.input.autoCompleteUserId }
          : undefined,
      completionOptions: hasCompletionOptions
        ? {
            mergeStrategy: ctx.input.mergeStrategy,
            deleteSourceBranch: ctx.input.deleteSourceBranch,
            mergeCommitMessage: ctx.input.mergeCommitMessage
          }
        : undefined
    };

    let hasPullRequestUpdate =
      updates.title !== undefined ||
      updates.description !== undefined ||
      updates.status !== undefined ||
      updates.targetRefName !== undefined ||
      updates.isDraft !== undefined ||
      updates.autoCompleteSetBy !== undefined ||
      updates.completionOptions !== undefined;

    let hasReviewerMutation =
      (ctx.input.addReviewerIds?.length ?? 0) > 0 ||
      (ctx.input.removeReviewerIds?.length ?? 0) > 0 ||
      ctx.input.vote !== undefined;

    if (!hasPullRequestUpdate && !hasReviewerMutation) {
      throw new Error('No pull request changes provided.');
    }

    let pr = hasPullRequestUpdate
      ? await client.updatePullRequest(
          ctx.input.repositoryId,
          ctx.input.pullRequestId,
          updates
        )
      : await client.getPullRequest(ctx.input.repositoryId, ctx.input.pullRequestId);

    // Handle reviewer additions
    if (ctx.input.addReviewerIds) {
      for (let reviewerId of ctx.input.addReviewerIds) {
        await client.addPullRequestReviewer(
          ctx.input.repositoryId,
          ctx.input.pullRequestId,
          reviewerId
        );
      }
    }

    // Handle reviewer removals
    if (ctx.input.removeReviewerIds) {
      for (let reviewerId of ctx.input.removeReviewerIds) {
        await client.removePullRequestReviewer(
          ctx.input.repositoryId,
          ctx.input.pullRequestId,
          reviewerId
        );
      }
    }

    // Handle voting
    if (ctx.input.vote) {
      await client.addPullRequestReviewer(
        ctx.input.repositoryId,
        ctx.input.pullRequestId,
        ctx.input.vote.reviewerId,
        { vote: ctx.input.vote.value }
      );
    }

    if (hasReviewerMutation) {
      pr = await client.getPullRequest(ctx.input.repositoryId, ctx.input.pullRequestId);
    }

    return {
      output: {
        pullRequestId: pr.pullRequestId,
        title: pr.title,
        status: pr.status,
        isDraft: pr.isDraft,
        mergeStatus: pr.mergeStatus
      },
      message: `Updated pull request **#${pr.pullRequestId}: ${pr.title}** — status: **${pr.status}**.`
    };
  })
  .build();
