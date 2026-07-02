import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let newNpsScoreTrigger = SlateTrigger.create(spec, {
  name: 'New NPS Score',
  key: 'new_nps_score',
  description:
    'Triggers when a user submits an NPS (Net Promoter Score) survey response. Includes the score (0-10), optional feedback text, and user information. Configure this webhook in the Beamer dashboard under Settings > Webhooks.'
})
  .input(
    z.object({
      npsId: z.number().describe('NPS response ID'),
      score: z.number().describe('NPS score (0-10)'),
      feedback: z.string().nullable().describe('Feedback text'),
      date: z.string().describe('Response date'),
      url: z.string().nullable().describe('Referring URL'),
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
      npsId: z.number().describe('Unique NPS response ID'),
      score: z.number().describe('NPS score (0-10)'),
      feedback: z.string().nullable().describe('Optional feedback text'),
      category: z
        .string()
        .describe('NPS category: "promoter" (9-10), "passive" (7-8), or "detractor" (0-6)'),
      date: z.string().describe('Response date (ISO-8601)'),
      referringUrl: z.string().nullable().describe('URL where the user submitted the NPS'),
      userId: z.string().nullable().describe('User ID'),
      userEmail: z.string().nullable().describe('User email'),
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
          npsId: event.id,
          score: event.score ?? 0,
          feedback: event.feedback ?? null,
          date: event.date ?? '',
          url: event.url ?? null,
          userId: event.userId ?? null,
          userEmail: event.userEmail ?? null,
          userFirstName: event.userFirstName ?? null,
          userLastName: event.userLastName ?? null,
          userCustomAttributes: event.userCustomAttributes ?? null
        }))
      };
    },
    handleEvent: async ctx => {
      let category: string;
      if (ctx.input.score >= 9) {
        category = 'promoter';
      } else if (ctx.input.score >= 7) {
        category = 'passive';
      } else {
        category = 'detractor';
      }

      return {
        type: 'nps_score.submitted',
        id: String(ctx.input.npsId),
        output: {
          npsId: ctx.input.npsId,
          score: ctx.input.score,
          feedback: ctx.input.feedback,
          category,
          date: ctx.input.date,
          referringUrl: ctx.input.url,
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
