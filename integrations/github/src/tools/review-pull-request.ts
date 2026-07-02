import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let reviewPullRequest = SlateTool.create(spec, {
  name: 'Review Pull Request',
  key: 'review_pull_request',
  description: `Submit a review on a pull request with an approve, request changes, or comment action.
Optionally include inline comments on specific files and lines. Can also request reviewers.`,
  instructions: [
    'Set action to "request_reviewers" to request reviewers instead of submitting a review.',
    'For inline comments, provide the file path and position (line in the diff).'
  ]
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner (user or organization)'),
      repo: z.string().describe('Repository name'),
      pullNumber: z.number().describe('Pull request number'),
      action: z
        .enum(['APPROVE', 'REQUEST_CHANGES', 'COMMENT', 'request_reviewers'])
        .describe('Review action or request reviewers'),
      body: z.string().optional().describe('Review body in Markdown'),
      comments: z
        .array(
          z.object({
            path: z.string().describe('File path relative to repo root'),
            position: z.number().optional().describe('Position in the diff'),
            body: z.string().describe('Comment body')
          })
        )
        .optional()
        .describe('Inline review comments'),
      reviewers: z
        .array(z.string())
        .optional()
        .describe('Usernames to request review from (only for request_reviewers action)'),
      teamReviewers: z
        .array(z.string())
        .optional()
        .describe('Team slugs to request review from (only for request_reviewers action)')
    })
  )
  .output(
    z.object({
      reviewId: z.number().optional().describe('Review ID (when submitting a review)'),
      state: z.string().optional().describe('Review state'),
      htmlUrl: z.string().optional().describe('URL to the review on GitHub'),
      requestedReviewers: z
        .array(z.string())
        .optional()
        .describe('Requested reviewer usernames')
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient({
      token: ctx.auth.token,
      instanceUrl: ctx.auth.instanceUrl
    });
    let { owner, repo, pullNumber, action } = ctx.input;

    if (action === 'request_reviewers') {
      let result = await client.requestReviewers(owner, repo, pullNumber, {
        reviewers: ctx.input.reviewers,
        teamReviewers: ctx.input.teamReviewers
      });

      let requested = (result.requested_reviewers ?? []).map((r: any) => r.login);
      return {
        output: {
          requestedReviewers: requested
        },
        message: `Requested reviews from ${requested.join(', ')} on PR **#${pullNumber}**.`
      };
    }

    let review = await client.createPullRequestReview(owner, repo, pullNumber, {
      body: ctx.input.body,
      event: action,
      comments: ctx.input.comments
    });

    return {
      output: {
        reviewId: review.id,
        state: review.state,
        htmlUrl: review.html_url
      },
      message: `Submitted **${review.state}** review on PR **#${pullNumber}** in **${owner}/${repo}**.`
    };
  })
  .build();
