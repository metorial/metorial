import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let pullRequestReviewTrigger = SlateTrigger.create(spec, {
  name: 'Pull Request Review',
  key: 'pull_request_review',
  description: 'Triggered when a pull request review is submitted, edited, or dismissed.'
})
  .input(
    z.object({
      action: z.string().describe('Review event action (submitted, edited, dismissed)'),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      pullNumber: z.number().describe('Pull request number'),
      pullTitle: z.string().describe('Pull request title'),
      reviewId: z.number().describe('Review ID'),
      reviewState: z
        .string()
        .describe('Review state (approved, changes_requested, commented, dismissed)'),
      reviewBody: z.string().nullable().describe('Review body'),
      reviewer: z.string().describe('Reviewer login'),
      reviewHtmlUrl: z.string().describe('URL to the review'),
      submittedAt: z.string().nullable().describe('Submission timestamp'),
      deliveryId: z.string().describe('Webhook delivery ID')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Review event action'),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      pullNumber: z.number().describe('Pull request number'),
      pullTitle: z.string().describe('Pull request title'),
      reviewId: z.number().describe('Review ID'),
      reviewState: z.string().describe('Review state'),
      reviewBody: z.string().nullable().describe('Review body'),
      reviewer: z.string().describe('Reviewer login'),
      reviewHtmlUrl: z.string().describe('URL to the review'),
      submittedAt: z.string().nullable().describe('Submission timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let event = ctx.request.headers.get('x-github-event');
      if (event !== 'pull_request_review') {
        return { inputs: [] };
      }

      let data = (await ctx.request.json()) as any;
      let review = data.review;
      let pr = data.pull_request;
      let deliveryId = ctx.request.headers.get('x-github-delivery') ?? '';

      return {
        inputs: [
          {
            action: data.action,
            owner: data.repository.owner.login,
            repo: data.repository.name,
            pullNumber: pr.number,
            pullTitle: pr.title,
            reviewId: review.id,
            reviewState: review.state,
            reviewBody: review.body,
            reviewer: review.user.login,
            reviewHtmlUrl: review.html_url,
            submittedAt: review.submitted_at ?? null,
            deliveryId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `pull_request_review.${ctx.input.action}`,
        id: ctx.input.deliveryId,
        output: {
          action: ctx.input.action,
          owner: ctx.input.owner,
          repo: ctx.input.repo,
          pullNumber: ctx.input.pullNumber,
          pullTitle: ctx.input.pullTitle,
          reviewId: ctx.input.reviewId,
          reviewState: ctx.input.reviewState,
          reviewBody: ctx.input.reviewBody,
          reviewer: ctx.input.reviewer,
          reviewHtmlUrl: ctx.input.reviewHtmlUrl,
          submittedAt: ctx.input.submittedAt
        }
      };
    }
  })
  .build();
