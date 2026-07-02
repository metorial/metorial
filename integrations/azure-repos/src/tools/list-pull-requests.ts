import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPullRequests = SlateTool.create(spec, {
  name: 'List Pull Requests',
  key: 'list_pull_requests',
  description: `Lists pull requests in a repository with filtering by status, creator, reviewer, and branches. Returns PR metadata including title, status, reviewers, and merge info.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      repositoryId: z.string().describe('ID or name of the repository'),
      status: z
        .enum(['active', 'completed', 'abandoned', 'all'])
        .optional()
        .describe('Filter by PR status'),
      creatorId: z.string().optional().describe('Filter by creator user ID'),
      reviewerId: z.string().optional().describe('Filter by reviewer user ID'),
      sourceRefName: z
        .string()
        .optional()
        .describe('Filter by source branch (e.g., "refs/heads/feature")'),
      targetRefName: z
        .string()
        .optional()
        .describe('Filter by target branch (e.g., "refs/heads/main")'),
      top: z.number().optional().describe('Maximum number of pull requests to return'),
      skip: z.number().optional().describe('Number of pull requests to skip')
    })
  )
  .output(
    z.object({
      pullRequests: z.array(
        z.object({
          pullRequestId: z.number().describe('Pull request ID'),
          title: z.string().describe('Title of the pull request'),
          description: z.string().optional().describe('Description of the pull request'),
          status: z.string().describe('Status (active, completed, abandoned)'),
          isDraft: z.boolean().optional().describe('Whether this is a draft PR'),
          createdBy: z.string().describe('Display name of the PR creator'),
          creationDate: z.string().describe('Date the PR was created'),
          closedDate: z.string().optional().describe('Date the PR was closed'),
          sourceBranch: z.string().describe('Source branch ref name'),
          targetBranch: z.string().describe('Target branch ref name'),
          mergeStatus: z.string().optional().describe('Merge status'),
          reviewerCount: z.number().describe('Number of reviewers'),
          repositoryName: z.string().describe('Repository name')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organization: ctx.config.organization,
      project: ctx.config.project
    });

    let prs = await client.listPullRequests(ctx.input.repositoryId, {
      status: ctx.input.status,
      creatorId: ctx.input.creatorId,
      reviewerId: ctx.input.reviewerId,
      sourceRefName: ctx.input.sourceRefName,
      targetRefName: ctx.input.targetRefName,
      top: ctx.input.top,
      skip: ctx.input.skip
    });

    return {
      output: {
        pullRequests: prs.map(pr => ({
          pullRequestId: pr.pullRequestId,
          title: pr.title,
          description: pr.description,
          status: pr.status,
          isDraft: pr.isDraft,
          createdBy: pr.createdBy.displayName,
          creationDate: pr.creationDate,
          closedDate: pr.closedDate,
          sourceBranch: pr.sourceRefName,
          targetBranch: pr.targetRefName,
          mergeStatus: pr.mergeStatus,
          reviewerCount: pr.reviewers?.length ?? 0,
          repositoryName: pr.repository.name
        }))
      },
      message: `Found **${prs.length}** pull requests.`
    };
  })
  .build();
