import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelVoiceBroadcast = SlateTool.create(spec, {
  name: 'Cancel Voice Broadcast',
  key: 'cancel_voice_broadcast',
  description: `Cancel a scheduled outgoing voice call broadcast. Only works on broadcasts that have not yet been sent.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      broadcastId: z.string().describe('ID of the voice broadcast to cancel.')
    })
  )
  .output(
    z.object({
      broadcastId: z.string(),
      cancelled: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.cancelCall(ctx.input.broadcastId);

    return {
      output: {
        broadcastId: ctx.input.broadcastId,
        cancelled: true
      },
      message: `Voice broadcast \`${ctx.input.broadcastId}\` cancelled successfully.`
    };
  })
  .build();
