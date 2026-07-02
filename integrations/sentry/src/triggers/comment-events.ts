import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let commentEventsTrigger = SlateTrigger.create(spec, {
  name: 'Comment Events',
  key: 'comment_events',
  description:
    'Triggers when a comment is created, updated, or deleted on a Sentry issue. Configure the webhook in Settings > Developer Settings.'
})
  .input(
    z.object({
      action: z.string().describe('The action (created, updated, deleted)'),
      commentId: z.string().describe('The comment ID'),
      payload: z.any().describe('Full webhook payload')
    })
  )
  .output(
    z.object({
      commentId: z.string(),
      issueId: z.string().optional(),
      text: z.string().optional(),
      authorName: z.string().optional(),
      authorEmail: z.string().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      projectSlug: z.string().optional()
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let action = body.action || 'created';
      let comment = body.data?.comment || body.data || {};

      return {
        inputs: [
          {
            action,
            commentId: String(comment.id || ''),
            payload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let comment = ctx.input.payload?.data?.comment || ctx.input.payload?.data || {};

      return {
        type: `comment.${ctx.input.action}`,
        id: `comment-${ctx.input.commentId}-${ctx.input.action}-${Date.now()}`,
        output: {
          commentId: String(comment.id || ctx.input.commentId),
          issueId: comment.issue_id
            ? String(comment.issue_id)
            : comment.group_id
              ? String(comment.group_id)
              : undefined,
          text: comment.text || comment.data?.text,
          authorName: comment.user?.name,
          authorEmail: comment.user?.email,
          createdAt: comment.dateCreated,
          updatedAt: comment.dateUpdated,
          projectSlug: comment.project?.slug
        }
      };
    }
  })
  .build();
