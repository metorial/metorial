import { SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { spec } from '../spec';

let reviewOutputSchema = z.object({
  reviewId: z.number().describe('Review ID'),
  body: z.string().describe('Review comment body'),
  state: z.string().describe('Review state (APPROVED, CHANGES_REQUESTED, COMMENT, PENDING)'),
  reviewerLogin: z.string().describe('Reviewer username'),
  htmlUrl: z.string().describe('Web URL of the review'),
  submittedAt: z.string().describe('Submission timestamp'),
  commitSha: z.string().describe('Commit SHA the review was made against')
});

export let listPullRequestReviews = SlateTool.create(spec, {
  name: 'List Pull Request Reviews',
  key: 'list_pull_request_reviews',
  description: `List all reviews on a pull request including their approval status and review comments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      prNumber: z.number().describe('Pull request number'),
      page: z.number().optional().describe('Page number'),
      limit: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      reviews: z.array(reviewOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let reviews = await client.listPullRequestReviews(
      ctx.input.owner,
      ctx.input.repo,
      ctx.input.prNumber,
      {
        page: ctx.input.page,
        limit: ctx.input.limit
      }
    );

    return {
      output: {
        reviews: reviews.map(r => ({
          reviewId: r.id,
          body: r.body || '',
          state: r.state,
          reviewerLogin: r.user.login,
          htmlUrl: r.html_url,
          submittedAt: r.submitted_at,
          commitSha: r.commit_id
        }))
      },
      message: `Found **${reviews.length}** reviews on PR **#${ctx.input.prNumber}**`
    };
  })
  .build();

export let createPullRequestReview = SlateTool.create(spec, {
  name: 'Create Pull Request Review',
  key: 'create_pull_request_review',
  description: `Submit a review on a pull request. Can approve, request changes, or leave a general comment. Optionally include line-level review comments.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      prNumber: z.number().describe('Pull request number'),
      event: z.enum(['APPROVED', 'REQUEST_CHANGES', 'COMMENT']).describe('Review action'),
      body: z.string().optional().describe('Review body comment'),
      comments: z
        .array(
          z.object({
            path: z.string().describe('File path to comment on'),
            body: z.string().describe('Comment body'),
            newPosition: z.number().optional().describe('Line number in the new file'),
            oldPosition: z.number().optional().describe('Line number in the old file')
          })
        )
        .optional()
        .describe('Line-level review comments')
    })
  )
  .output(reviewOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GiteaClient({ token: ctx.auth.token, baseUrl: ctx.auth.baseUrl });
    let r = await client.createPullRequestReview(
      ctx.input.owner,
      ctx.input.repo,
      ctx.input.prNumber,
      {
        event: ctx.input.event,
        body: ctx.input.body,
        comments: ctx.input.comments?.map(c => ({
          path: c.path,
          body: c.body,
          new_position: c.newPosition,
          old_position: c.oldPosition
        }))
      }
    );

    return {
      output: {
        reviewId: r.id,
        body: r.body || '',
        state: r.state,
        reviewerLogin: r.user.login,
        htmlUrl: r.html_url,
        submittedAt: r.submitted_at,
        commitSha: r.commit_id
      },
      message: `Submitted **${ctx.input.event}** review on PR **#${ctx.input.prNumber}**`
    };
  })
  .build();
