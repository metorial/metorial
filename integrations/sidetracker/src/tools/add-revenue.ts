import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addRevenue = SlateTool.create(spec, {
  name: 'Add Revenue',
  key: 'add_revenue',
  description: `Add revenue data to a tracked visitor session. Links a financial outcome (sale amount) to a specific session, enabling marketing attribution and ROI tracking back to the original traffic source.`
})
  .input(
    z.object({
      sessionId: z.string().describe('Session ID to attribute the revenue to'),
      amount: z.number().describe('Revenue amount to add to the session')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the revenue was successfully added'),
      result: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Response data from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.addRevenue(ctx.input.sessionId, ctx.input.amount);

    return {
      output: {
        success: true,
        result
      },
      message: `Added revenue of **${ctx.input.amount}** to session \`${ctx.input.sessionId}\`.`
    };
  })
  .build();
