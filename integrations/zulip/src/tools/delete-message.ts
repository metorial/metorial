import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteMessage = SlateTool.create(spec, {
  name: 'Delete Message',
  key: 'delete_message',
  description: `Permanently delete a Zulip message. The authenticated user must have permission to delete the message.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      messageId: z.number().describe('ID of the message to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serverUrl: ctx.auth.serverUrl,
      email: ctx.auth.email,
      token: ctx.auth.token
    });

    await client.deleteMessage(ctx.input.messageId);

    return {
      output: { success: true },
      message: `Message ${ctx.input.messageId} deleted successfully`
    };
  })
  .build();
