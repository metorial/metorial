import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getPullRequest = SlateTool.create(spec, {
  name: 'Get Pull Request',
  key: 'get_pull_request',
  description: `Gets detailed information about a specific pull request, including reviewers, vote status, completion options, labels, and comment threads.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      repositoryId: z.string().describe('ID or name of the repository'),
      pullRequestId: z.number().describe('Pull request ID'),
      includeThreads: z.boolean().optional().describe('Also fetch comment threads for this PR')
    })
  )
  .output(
    z.object({
      pullRequestId: z.number().describe('Pull request ID'),
      title: z.string().describe('Title of the pull request'),
      description: z.string().optional().describe('Description of the pull request'),
      status: z.string().describe('Status (active, completed, abandoned)'),
      isDraft: z.boolean().optional().describe('Whether this is a draft PR'),
      createdBy: z
        .object({
          displayName: z.string(),
          userId: z.string()
        })
        .describe('PR creator'),
      creationDate: z.string().describe('Date the PR was created'),
      closedDate: z.string().optional().describe('Date the PR was closed'),
      sourceBranch: z.string().describe('Source branch ref name'),
      targetBranch: z.string().describe('Target branch ref name'),
      mergeStatus: z.string().optional().describe('Merge status'),
      reviewers: z
        .array(
          z.object({
            displayName: z.string(),
            reviewerId: z.string(),
            vote: z
              .number()
              .describe(
                'Vote: 10=approved, 5=approved with suggestions, 0=no vote, -5=waiting, -10=rejected'
              ),
            isRequired: z.boolean().optional(),
            hasDeclined: z.boolean().optional()
          })
        )
        .describe('List of reviewers'),
      completionOptions: z
        .object({
          mergeStrategy: z.string().optional(),
          deleteSourceBranch: z.boolean().optional(),
          squashMerge: z.boolean().optional(),
          mergeCommitMessage: z.string().optional()
        })
        .optional()
        .describe('Auto-complete settings'),
      labels: z
        .array(
          z.object({
            labelId: z.string(),
            name: z.string(),
            active: z.boolean()
          })
        )
        .optional()
        .describe('Labels attached to the PR'),
      threads: z
        .array(
          z.object({
            threadId: z.number(),
            status: z.string().optional(),
            filePath: z.string().optional(),
            comments: z.array(
              z.object({
                commentId: z.number(),
                author: z.string(),
                content: z.string(),
                publishedDate: z.string()
              })
            )
          })
        )
        .optional()
        .describe('Comment threads (if includeThreads is true)'),
      repositoryName: z.string().describe('Repository name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      organization: ctx.config.organization,
      project: ctx.config.project
    });

    let pr = await client.getPullRequest(ctx.input.repositoryId, ctx.input.pullRequestId);

    let threads: any;
    if (ctx.input.includeThreads) {
      let rawThreads = await client.listCommentThreads(
        ctx.input.repositoryId,
        ctx.input.pullRequestId
      );
      threads = rawThreads.map(t => ({
        threadId: t.id,
        status: t.status,
        filePath: t.threadContext?.filePath,
        comments: t.comments.map(c => ({
          commentId: c.id,
          author: c.author.displayName,
          content: c.content,
          publishedDate: c.publishedDate
        }))
      }));
    }

    return {
      output: {
        pullRequestId: pr.pullRequestId,
        title: pr.title,
        description: pr.description,
        status: pr.status,
        isDraft: pr.isDraft,
        createdBy: {
          displayName: pr.createdBy.displayName,
          userId: pr.createdBy.id
        },
        creationDate: pr.creationDate,
        closedDate: pr.closedDate,
        sourceBranch: pr.sourceRefName,
        targetBranch: pr.targetRefName,
        mergeStatus: pr.mergeStatus,
        reviewers: (pr.reviewers ?? []).map(r => ({
          displayName: r.displayName,
          reviewerId: r.id,
          vote: r.vote,
          isRequired: r.isRequired,
          hasDeclined: r.hasDeclined
        })),
        completionOptions: pr.completionOptions
          ? {
              mergeStrategy: pr.completionOptions.mergeStrategy,
              deleteSourceBranch: pr.completionOptions.deleteSourceBranch,
              squashMerge: pr.completionOptions.squashMerge,
              mergeCommitMessage: pr.completionOptions.mergeCommitMessage
            }
          : undefined,
        labels: pr.labels?.map(l => ({
          labelId: l.id,
          name: l.name,
          active: l.active
        })),
        threads,
        repositoryName: pr.repository.name
      },
      message: `Pull request **#${pr.pullRequestId}: ${pr.title}** — status: **${pr.status}**, reviewers: ${pr.reviewers?.length ?? 0}.`
    };
  })
  .build();
