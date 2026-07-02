import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelEsignSession = SlateTool.create(spec, {
  name: 'Cancel E-Sign Session',
  key: 'cancel_esign_session',
  description: `Cancels an active e-signature signing session. Cannot cancel sessions that are already completed.`,
  constraints: ['Cannot cancel completed sessions.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('The e-signature session ID to cancel.'),
      reason: z.string().optional().describe('Optional reason for cancellation.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the cancellation was successful.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.cancelEsignSession(ctx.input.sessionId, ctx.input.reason);

    return {
      output: {
        success: true
      },
      message: `Cancelled e-sign session **${ctx.input.sessionId}**.`
    };
  })
  .build();
