import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GiteaClient } from '../lib/client';
import { integerInput } from '../lib/validation';
import { spec } from '../spec';

let reviewOutputSchema = z.object({
  reviewId: z.number().describe('Review ID'),
  body: z.string().describe('Review comment body'),
  state: z.string().describe('Review state (APPROVED, REQUEST_CHANGES, COMMENT, PENDING)'),
  reviewerLogin: z.string().describe('Reviewer username; empty for a team review request'),
  reviewerTeamName: z.string().optional().describe('Team name for a team review request'),
  htmlUrl: z.string().describe('Web URL of the review'),
  submittedAt: z.string().describe('Submission timestamp'),
  commitSha: z.string().describe('Commit SHA the review was made against'),
  commentsCount: z.number().optional().describe('Number of line comments in this review')
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
      owner: z.string().min(1).describe('Repository owner'),
      repo: z.string().min(1).describe('Repository name'),
      prNumber: integerInput(1).describe('Pull request number'),
      page: integerInput(1).optional().describe('Page number'),
      limit: integerInput(0).optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      reviews: z.array(reviewOutputSchema)
    })
  )
  .handleInvocation(async ctx => {
    let client = new GiteaClient(ctx.auth);
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
          reviewerLogin: r.user?.login || '',
          reviewerTeamName: r.team?.name,
          htmlUrl: r.html_url,
          submittedAt: r.submitted_at,
          commitSha: r.commit_id,
          commentsCount: r.comments_count
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
      owner: z.string().min(1).describe('Repository owner'),
      repo: z.string().min(1).describe('Repository name'),
      prNumber: integerInput(1).describe('Pull request number'),
      event: z.enum(['APPROVED', 'REQUEST_CHANGES', 'COMMENT']).describe('Review action'),
      body: z.string().optional().describe('Review body comment'),
      comments: z
        .array(
          z.object({
            path: z.string().describe('File path to comment on'),
            body: z.string().describe('Comment body'),
            newPosition: integerInput(0)
              .optional()
              .describe(
                'Line number in the new file; zero or omission means the comment uses the other side'
              ),
            oldPosition: integerInput(0)
              .optional()
              .describe(
                'Line number in the old file; zero or omission means the comment uses the other side'
              )
          })
        )
        .optional()
        .describe('Line-level review comments')
    })
  )
  .output(reviewOutputSchema)
  .handleInvocation(async ctx => {
    let client = new GiteaClient(ctx.auth);
    if (
      ctx.input.comments?.some(
        comment =>
          (comment.newPosition ?? 0) > 0 === (comment.oldPosition ?? 0) > 0 ||
          !comment.path.trim() ||
          !comment.body.trim()
      )
    )
      throw createApiServiceError(
        'Each line comment requires a path, body, and one positive newPosition or oldPosition. Omit the other position or set it to zero.'
      );
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
        reviewerLogin: r.user?.login || '',
        reviewerTeamName: r.team?.name,
        htmlUrl: r.html_url,
        submittedAt: r.submitted_at,
        commitSha: r.commit_id,
        commentsCount: r.comments_count
      },
      message: `Submitted **${ctx.input.event}** review on PR **#${ctx.input.prNumber}**`
    };
  })
  .build();
