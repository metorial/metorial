import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let logTimeTool = SlateTool.create(spec, {
  name: 'Log Time',
  key: 'log_time',
  description: `Log time spent on a card. Allows tracking work hours or minutes with an optional comment describing the work performed.`
})
  .input(
    z.object({
      cardId: z.number().describe('ID of the card to log time on'),
      time: z.number().describe('Amount of time to log'),
      timeUnit: z
        .enum(['minutes', 'hours'])
        .optional()
        .describe('Unit of time. Defaults to hours.'),
      comment: z.string().optional().describe('Description of the work performed')
    })
  )
  .output(
    z.object({
      cardId: z.number().describe('Card ID'),
      logged: z.boolean().describe('Whether time was logged successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.auth.subdomain
    });

    await client.logTime(ctx.input.cardId, {
      time: ctx.input.time,
      timeUnit: ctx.input.timeUnit,
      comment: ctx.input.comment
    });

    return {
      output: {
        cardId: ctx.input.cardId,
        logged: true
      },
      message: `Logged **${ctx.input.time} ${ctx.input.timeUnit ?? 'hours'}** on card **${ctx.input.cardId}**.`
    };
  })
  .build();
