import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let newReactionTrigger = SlateTrigger.create(spec, {
  name: 'New Reaction',
  key: 'new_reaction',
  description:
    'Triggers when a user sends a reaction to a Beamer post. Reactions can be positive, neutral, or negative. Configure this webhook in the Beamer dashboard under Settings > Webhooks.'
})
  .input(
    z.object({
      reactionId: z.number().describe('Reaction ID'),
      reaction: z.string().describe('Reaction type'),
      postTitle: z.string().describe('Title of the post'),
      date: z.string().describe('Reaction date'),
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
      reactionId: z.number().describe('Unique reaction ID'),
      reaction: z.string().describe('Reaction type (positive, neutral, or negative)'),
      postTitle: z.string().describe('Title of the post'),
      date: z.string().describe('Reaction date (ISO-8601)'),
      userId: z.string().nullable().describe('User ID of the reactor'),
      userEmail: z.string().nullable().describe('Email of the reactor'),
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
          reactionId: event.id,
          reaction: event.reaction ?? '',
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
        type: `reaction.${ctx.input.reaction}`,
        id: String(ctx.input.reactionId),
        output: {
          reactionId: ctx.input.reactionId,
          reaction: ctx.input.reaction,
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
