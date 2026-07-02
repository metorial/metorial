import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwoChatClient } from '../lib/client';
import { spec } from '../spec';

export let deleteWhatsAppMessage = SlateTool.create(spec, {
  name: 'Delete WhatsApp Message',
  key: 'delete_whatsapp_message',
  description: `Delete a previously sent WhatsApp message by its UUID.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      fromNumber: z.string().describe('Your connected WhatsApp number (with country code)'),
      messageUuid: z.string().describe('UUID of the message to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the message was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwoChatClient({ token: ctx.auth.token });
    let result = await client.deleteMessage(ctx.input.fromNumber, ctx.input.messageUuid);

    return {
      output: {
        success: result.success ?? true
      },
      message: `Deleted message **${ctx.input.messageUuid}**.`
    };
  })
  .build();
