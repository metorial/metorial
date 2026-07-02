import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let cancelTextBroadcast = SlateTool.create(spec, {
  name: 'Cancel Text Broadcast',
  key: 'cancel_text_broadcast',
  description: `Cancel a scheduled outgoing text message broadcast. Only works on broadcasts that have not yet been sent.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      broadcastId: z.string().describe('ID of the text broadcast to cancel.')
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
    await client.cancelText(ctx.input.broadcastId);

    return {
      output: {
        broadcastId: ctx.input.broadcastId,
        cancelled: true
      },
      message: `Text broadcast \`${ctx.input.broadcastId}\` cancelled successfully.`
    };
  })
  .build();
