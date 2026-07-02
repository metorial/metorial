import { SlateTool } from 'slates';
import { z } from 'zod';
import { WebexClient } from '../lib/client';
import { spec } from '../spec';

export let deleteMessage = SlateTool.create(spec, {
  name: 'Delete Message',
  key: 'delete_message',
  description: `Permanently delete a message from a Webex space. The message must belong to the authenticated user, or the user must be a moderator of the space.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      messageId: z.string().describe('ID of the message to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the message was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new WebexClient({ token: ctx.auth.token });

    await client.deleteMessage(ctx.input.messageId);

    return {
      output: { deleted: true },
      message: `Message **${ctx.input.messageId}** deleted successfully.`
    };
  })
  .build();
