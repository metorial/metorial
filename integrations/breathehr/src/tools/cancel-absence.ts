import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelAbsence = SlateTool.create(spec, {
  name: 'Cancel Absence',
  key: 'cancel_absence',
  description: `Cancel an existing absence request in Breathe HR. Optionally provide a cancellation reason.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      absenceId: z.string().describe('The ID of the absence to cancel'),
      reason: z.string().optional().describe('Reason for cancellation')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the cancellation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    await client.cancelAbsence(ctx.input.absenceId, ctx.input.reason);

    return {
      output: { success: true },
      message: `Cancelled absence **${ctx.input.absenceId}**.`
    };
  })
  .build();
