import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let commentEvents = SlateTrigger.create(spec, {
  name: 'Comment Created',
  key: 'comment_created',
  description:
    'Triggered when a new comment is posted on an idea in a Storm. Configure the webhook URL in Stormboard account settings (My Account → Webhooks).',
  instructions: [
    'Configure the webhook in your Stormboard account at My Account → Webhooks.',
    'Set the Payload URL to the provided webhook URL and select "Comment Created" events.'
  ]
})
  .input(
    z.object({
      eventId: z.number().describe('Unique event ID'),
      date: z.string().describe('Event timestamp'),
      stormId: z.number().describe('Storm ID'),
      stormTitle: z.string().describe('Storm title'),
      ideaId: z.number().describe('Idea ID the comment was posted on'),
      ideaType: z.number().optional().describe('Idea type identifier'),
      ideaText: z.string().optional().describe('Idea text content'),
      comment: z.string().describe('Comment text'),
      userName: z.string().optional().describe('Name of the commenter'),
      userFullName: z.string().optional().describe('Full name of the commenter'),
      userId: z.number().optional().describe('Commenter user ID')
    })
  )
  .output(
    z.object({
      ideaId: z.number().describe('ID of the idea commented on'),
      stormId: z.number().describe('ID of the Storm'),
      stormTitle: z.string().describe('Title of the Storm'),
      ideaText: z.string().optional().describe('Text content of the idea'),
      comment: z.string().describe('Comment text'),
      userName: z.string().optional().describe('Name of the commenter'),
      userFullName: z.string().optional().describe('Full name of the commenter'),
      userId: z.number().optional().describe('Commenter user ID')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body = (await ctx.request.json()) as any;
      let events = Array.isArray(body) ? body : [body];

      let inputs = events
        .filter((evt: any) => evt.type === 'CommentCreated')
        .map((evt: any) => ({
          eventId: evt.id,
          date: evt.date,
          stormId: evt.storm?.id,
          stormTitle: evt.storm?.title,
          ideaId: evt.idea?.id,
          ideaType: evt.idea?.type,
          ideaText: evt.idea?.text,
          comment: evt.data?.comment,
          userName: evt.user?.name,
          userFullName: evt.user?.full,
          userId: evt.user?.id
        }));

      return { inputs };
    },

    handleEvent: async ctx => {
      return {
        type: 'comment.created',
        id: `${ctx.input.eventId}`,
        output: {
          ideaId: ctx.input.ideaId,
          stormId: ctx.input.stormId,
          stormTitle: ctx.input.stormTitle,
          ideaText: ctx.input.ideaText,
          comment: ctx.input.comment,
          userName: ctx.input.userName,
          userFullName: ctx.input.userFullName,
          userId: ctx.input.userId
        }
      };
    }
  })
  .build();
