import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let deleteMessage = SlateTool.create(spec, {
  name: 'Delete Message',
  key: 'delete_message',
  description: `Deletes a message from a chat room. Only the sender of the message can delete it.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      roomId: z.number().describe('ID of the chat room'),
      messageId: z.string().describe('ID of the message to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    await client.deleteMessage(ctx.input.roomId, ctx.input.messageId);

    return {
      output: { success: true },
      message: `Deleted message ${ctx.input.messageId} from room ${ctx.input.roomId}.`
    };
  })
  .build();
