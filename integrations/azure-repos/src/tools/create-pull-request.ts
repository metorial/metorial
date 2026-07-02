import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createPullRequest = SlateTool.create(spec, {
  name: 'Create Pull Request',
  key: 'create_pull_request',
  description: `Creates a new pull request in a repository. Supports draft PRs, auto-complete with configurable merge strategies, and initial reviewer assignment.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      repositoryId: z.string().describe('ID or name of the repository'),
      title: z.string().describe('Title of the pull request'),
      description: z
        .string()
        .optional()
        .describe('Description of the pull request (supports markdown)'),
      sourceBranch: z
        .string()
        .describe(
          'Source branch (e.g., "feature/my-feature" or "refs/heads/feature/my-feature")'
        ),
      targetBranch: z.string().describe('Target branch (e.g., "main" or "refs/heads/main")'),
      isDraft: z.boolean().optional().describe('Create as a draft pull request'),
      reviewerIds: z.array(z.string()).optional().describe('User IDs of reviewers to add'),
      autoCompleteUserId: z
        .string()
        .optional()
        .describe('User ID to set auto-complete (typically the PR creator)'),
      mergeStrategy: z
        .enum(['noFastForward', 'squash', 'rebase', 'rebaseMerge'])
        .optional()
        .describe('Merge strategy for auto-complete'),
      deleteSourceBranch: z.boolean().optional().describe('Delete source branch after merge'),
      mergeCommitMessage: z.string().optional().describe('Custom merge commit message')
    })
  )
  .output(
    z.object({
      pullRequestId: z.number().describe('Created pull request ID'),
      title: z.string().describe('Title of the pull request'),
      status: z.string().describe('Status of the pull request'),
      sourceBranch: z.string().describe('Source branch ref name'),
      targetBranch: z.string().describe('Target branch ref name'),
      webUrl: z.string().describe('URL of the pull request'),
      isDraft: z.boolean().optional().describe('Whether this is a draft PR'),
      createdBy: z.string().describe('Display name of the PR creator')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organization: ctx.config.organization,
      project: ctx.config.project
    });

    let sourceRefName = ctx.input.sourceBranch.startsWith('refs/')
      ? ctx.input.sourceBranch
      : `refs/heads/${ctx.input.sourceBranch}`;
    let targetRefName = ctx.input.targetBranch.startsWith('refs/')
      ? ctx.input.targetBranch
      : `refs/heads/${ctx.input.targetBranch}`;

    let pr = await client.createPullRequest(ctx.input.repositoryId, {
      title: ctx.input.title,
      description: ctx.input.description,
      sourceRefName,
      targetRefName,
      isDraft: ctx.input.isDraft,
      reviewers: ctx.input.reviewerIds?.map(id => ({ id })),
      autoCompleteSetBy: ctx.input.autoCompleteUserId
        ? { id: ctx.input.autoCompleteUserId }
        : undefined,
      completionOptions:
        ctx.input.mergeStrategy ||
        ctx.input.deleteSourceBranch !== undefined ||
        ctx.input.mergeCommitMessage
          ? {
              mergeStrategy: ctx.input.mergeStrategy,
              deleteSourceBranch: ctx.input.deleteSourceBranch,
              mergeCommitMessage: ctx.input.mergeCommitMessage
            }
          : undefined
    });

    let webUrl = `https://dev.azure.com/${ctx.config.organization}/${ctx.config.project}/_git/${pr.repository.name}/pullrequest/${pr.pullRequestId}`;

    return {
      output: {
        pullRequestId: pr.pullRequestId,
        title: pr.title,
        status: pr.status,
        sourceBranch: pr.sourceRefName,
        targetBranch: pr.targetRefName,
        webUrl,
        isDraft: pr.isDraft,
        createdBy: pr.createdBy.displayName
      },
      message: `Created pull request **#${pr.pullRequestId}: ${pr.title}** (${pr.sourceRefName} → ${pr.targetRefName}).`
    };
  })
  .build();
