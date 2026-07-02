import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPullRequestTool = SlateTool.create(spec, {
  name: 'Get Pull Request',
  key: 'get_pull_request',
  description: `Retrieve detailed information about a specific pull request including its description, reviewers, merge details, and comments summary.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      repoSlug: z.string().describe('Repository slug'),
      pullRequestId: z.coerce.number().describe('Pull request ID')
    })
  )
  .output(
    z.object({
      pullRequestId: z.number(),
      title: z.string(),
      description: z.string().optional(),
      state: z.string(),
      author: z.string().optional(),
      authorUuid: z.string().optional(),
      sourceBranch: z.string().optional(),
      sourceRepoFullName: z.string().optional(),
      destinationBranch: z.string().optional(),
      mergeCommit: z.string().optional(),
      closedBy: z.string().optional(),
      reviewers: z
        .array(
          z.object({
            displayName: z.string(),
            uuid: z.string().optional()
          })
        )
        .optional(),
      participants: z
        .array(
          z.object({
            displayName: z.string(),
            role: z.string(),
            approved: z.boolean(),
            state: z.string().optional()
          })
        )
        .optional(),
      createdOn: z.string().optional(),
      updatedOn: z.string().optional(),
      htmlUrl: z.string().optional(),
      commentCount: z.number().optional(),
      taskCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, workspace: ctx.config.workspace });

    let pr = await client.getPullRequest(ctx.input.repoSlug, ctx.input.pullRequestId);

    return {
      output: {
        pullRequestId: pr.id,
        title: pr.title,
        description: pr.description || undefined,
        state: pr.state,
        author: pr.author?.display_name || undefined,
        authorUuid: pr.author?.uuid || undefined,
        sourceBranch: pr.source?.branch?.name || undefined,
        sourceRepoFullName: pr.source?.repository?.full_name || undefined,
        destinationBranch: pr.destination?.branch?.name || undefined,
        mergeCommit: pr.merge_commit?.hash || undefined,
        closedBy: pr.closed_by?.display_name || undefined,
        reviewers: (pr.reviewers || []).map((r: any) => ({
          displayName: r.display_name,
          uuid: r.uuid || undefined
        })),
        participants: (pr.participants || []).map((p: any) => ({
          displayName: p.user?.display_name || '',
          role: p.role,
          approved: p.approved,
          state: p.state || undefined
        })),
        createdOn: pr.created_on,
        updatedOn: pr.updated_on,
        htmlUrl: pr.links?.html?.href || undefined,
        commentCount: pr.comment_count,
        taskCount: pr.task_count
      },
      message: `Pull request **#${pr.id}: ${pr.title}** — state: **${pr.state}**, ${pr.source?.branch?.name} → ${pr.destination?.branch?.name}.`
    };
  })
  .build();
