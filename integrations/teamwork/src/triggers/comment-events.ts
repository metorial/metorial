import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let commentEvents = SlateTrigger.create(spec, {
  name: 'Comment Events',
  key: 'comment_events',
  description:
    'Triggers when a comment is created, updated, or deleted on any resource (tasks, milestones, notebooks, files) in Teamwork.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of comment event'),
      commentId: z.string().describe('ID of the affected comment'),
      eventPayload: z.any().describe('Raw webhook event payload')
    })
  )
  .output(
    z.object({
      commentId: z.string().describe('ID of the affected comment'),
      body: z.string().optional().describe('Comment body text'),
      resourceType: z.string().optional().describe('Type of resource the comment is on'),
      resourceId: z.string().optional().describe('ID of the parent resource'),
      projectId: z.string().optional().describe('Project ID'),
      authorId: z.string().optional().describe('ID of the comment author'),
      authorName: z.string().optional().describe('Name of the comment author'),
      createdAt: z.string().optional().describe('When the comment was created')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;
      let event = data.event || data;
      let comment = event.comment || event.objectData || {};
      let eventType = event.event || data.event || 'unknown';
      let commentId = comment.id
        ? String(comment.id)
        : event.objectId
          ? String(event.objectId)
          : '';

      if (!commentId) return { inputs: [] };

      return {
        inputs: [
          {
            eventType: String(eventType),
            commentId,
            eventPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let payload = ctx.input.eventPayload;
      let event = payload?.event || payload;
      let comment = event?.comment || event?.objectData || {};
      let user = event?.user || event?.eventCreator || comment?.author || {};

      return {
        type: `comment.${ctx.input.eventType.replace(/^COMMENT\./, '').toLowerCase()}`,
        id: `comment-${ctx.input.commentId}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          commentId: ctx.input.commentId,
          body: comment.body || comment.htmlBody || undefined,
          resourceType: comment.objectType || comment['commentable-type'] || undefined,
          resourceId: comment.objectId
            ? String(comment.objectId)
            : comment['commentable-id']
              ? String(comment['commentable-id'])
              : undefined,
          projectId: comment.projectId
            ? String(comment.projectId)
            : comment['project-id']
              ? String(comment['project-id'])
              : undefined,
          authorId: user.id ? String(user.id) : undefined,
          authorName: user.firstName
            ? `${user.firstName} ${user.lastName || ''}`.trim()
            : user['first-name']
              ? `${user['first-name']} ${user['last-name'] || ''}`.trim()
              : undefined,
          createdAt:
            comment['created-on'] || comment.createdOn || comment.createdAt || undefined
        }
      };
    }
  })
  .build();
