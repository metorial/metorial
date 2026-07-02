import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let newCommentTrigger = SlateTrigger.create(spec, {
  name: 'New Comment',
  key: 'new_comment',
  description:
    'Triggers when a user submits a new comment on a Beamer post. Configure this webhook in the Beamer dashboard under Settings > Webhooks.'
})
  .input(
    z.object({
      commentId: z.number().describe('Comment ID'),
      text: z.string().describe('Comment text'),
      postTitle: z.string().describe('Title of the post'),
      date: z.string().describe('Comment date'),
      userId: z.string().nullable().describe('User ID'),
      userEmail: z.string().nullable().describe('User email'),
      userFirstName: z.string().nullable().describe('User first name'),
      userLastName: z.string().nullable().describe('User last name'),
      userCustomAttributes: z
        .record(z.string(), z.unknown())
        .nullable()
        .describe('Custom user attributes')
    })
  )
  .output(
    z.object({
      commentId: z.number().describe('Unique comment ID'),
      text: z.string().describe('Comment text'),
      postTitle: z.string().describe('Title of the post the comment is on'),
      date: z.string().describe('Comment date (ISO-8601)'),
      userId: z.string().nullable().describe('User ID of the commenter'),
      userEmail: z.string().nullable().describe('Email of the commenter'),
      userFirstName: z.string().nullable().describe('First name'),
      userLastName: z.string().nullable().describe('Last name'),
      userCustomAttributes: z
        .record(z.string(), z.unknown())
        .nullable()
        .describe('Custom user attributes')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any[];
      let events = Array.isArray(data) ? data : [data];

      return {
        inputs: events.map(event => ({
          commentId: event.id,
          text: event.text ?? '',
          postTitle: event.postTitle ?? '',
          date: event.date ?? '',
          userId: event.userId ?? null,
          userEmail: event.userEmail ?? null,
          userFirstName: event.userFirstName ?? null,
          userLastName: event.userLastName ?? null,
          userCustomAttributes: event.userCustomAttributes ?? null
        }))
      };
    },
    handleEvent: async ctx => {
      return {
        type: 'comment.created',
        id: String(ctx.input.commentId),
        output: {
          commentId: ctx.input.commentId,
          text: ctx.input.text,
          postTitle: ctx.input.postTitle,
          date: ctx.input.date,
          userId: ctx.input.userId,
          userEmail: ctx.input.userEmail,
          userFirstName: ctx.input.userFirstName,
          userLastName: ctx.input.userLastName,
          userCustomAttributes: ctx.input.userCustomAttributes
        }
      };
    }
  })
  .build();
