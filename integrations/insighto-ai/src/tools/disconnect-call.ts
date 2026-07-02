import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let disconnectCall = SlateTool.create(spec, {
  name: 'Disconnect Call',
  key: 'disconnect_call',
  description: `Disconnect an active AI voice call by its conversation ID. Use this to programmatically end ongoing calls or implement custom call flow logic.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      conversationId: z.string().describe('Conversation ID of the active call to disconnect')
    })
  )
  .output(
    z.object({
      conversationId: z.string(),
      disconnected: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    await client.disconnectCall(ctx.input.conversationId);

    return {
      output: {
        conversationId: ctx.input.conversationId,
        disconnected: true
      },
      message: `Disconnected call for conversation \`${ctx.input.conversationId}\`.`
    };
  })
  .build();
