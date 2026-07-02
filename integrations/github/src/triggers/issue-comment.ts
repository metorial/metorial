import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let issueCommentTrigger = SlateTrigger.create(spec, {
  name: 'Issue Comment',
  key: 'issue_comment',
  description:
    'Triggered when a comment is created, edited, or deleted on an issue or pull request.'
})
  .input(
    z.object({
      action: z.string().describe('Comment event action (created, edited, deleted)'),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      issueNumber: z.number().describe('Issue or PR number'),
      issueTitle: z.string().describe('Issue or PR title'),
      isPullRequest: z.boolean().describe('Whether the comment is on a pull request'),
      commentId: z.number().describe('Comment ID'),
      commentBody: z.string().describe('Comment body'),
      commentAuthor: z.string().describe('Comment author login'),
      commentHtmlUrl: z.string().describe('URL to the comment'),
      commentCreatedAt: z.string().describe('Comment creation timestamp'),
      deliveryId: z.string().describe('Webhook delivery ID')
    })
  )
  .output(
    z.object({
      action: z.string().describe('Comment event action'),
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      issueNumber: z.number().describe('Issue or PR number'),
      issueTitle: z.string().describe('Issue or PR title'),
      isPullRequest: z.boolean().describe('Whether the comment is on a pull request'),
      commentId: z.number().describe('Comment ID'),
      commentBody: z.string().describe('Comment body'),
      commentAuthor: z.string().describe('Comment author login'),
      commentHtmlUrl: z.string().describe('URL to the comment'),
      commentCreatedAt: z.string().describe('Comment creation timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let event = ctx.request.headers.get('x-github-event');
      if (event !== 'issue_comment') {
        return { inputs: [] };
      }

      let data = (await ctx.request.json()) as any;
      let comment = data.comment;
      let issue = data.issue;
      let deliveryId = ctx.request.headers.get('x-github-delivery') ?? '';

      return {
        inputs: [
          {
            action: data.action,
            owner: data.repository.owner.login,
            repo: data.repository.name,
            issueNumber: issue.number,
            issueTitle: issue.title,
            isPullRequest: !!issue.pull_request,
            commentId: comment.id,
            commentBody: comment.body,
            commentAuthor: comment.user.login,
            commentHtmlUrl: comment.html_url,
            commentCreatedAt: comment.created_at,
            deliveryId
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `issue_comment.${ctx.input.action}`,
        id: ctx.input.deliveryId,
        output: {
          action: ctx.input.action,
          owner: ctx.input.owner,
          repo: ctx.input.repo,
          issueNumber: ctx.input.issueNumber,
          issueTitle: ctx.input.issueTitle,
          isPullRequest: ctx.input.isPullRequest,
          commentId: ctx.input.commentId,
          commentBody: ctx.input.commentBody,
          commentAuthor: ctx.input.commentAuthor,
          commentHtmlUrl: ctx.input.commentHtmlUrl,
          commentCreatedAt: ctx.input.commentCreatedAt
        }
      };
    }
  })
  .build();
