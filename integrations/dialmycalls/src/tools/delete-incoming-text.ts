import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteIncomingText = SlateTool.create(spec, {
  name: 'Delete Incoming Text',
  key: 'delete_incoming_text',
  description:
    'Delete a received text message from your account. Use list_incoming_texts to find the message ID.',
  tags: { destructive: true }
})
  .input(
    z.object({
      incomingTextId: z
        .string()
        .describe('ID of the received text. Use list_incoming_texts to find message IDs.')
    })
  )
  .output(z.object({ incomingTextId: z.string(), deleted: z.boolean() }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteIncomingText(ctx.input.incomingTextId);
    return {
      output: { incomingTextId: ctx.input.incomingTextId, deleted: true },
      message: `Incoming text \`${ctx.input.incomingTextId}\` deleted.`
    };
  })
  .build();
