import { SlateTool } from 'slates';
import { z } from 'zod';
import { TwoChatClient } from '../lib/client';
import { spec } from '../spec';

export let deleteWhatsAppMessage = SlateTool.create(spec, {
  name: 'Delete WhatsApp Message',
  key: 'delete_whatsapp_message',
  description: `Request deletion of a WhatsApp message. WhatsApp deletion depends on message age and group permissions; acceptance does not guarantee removal from every device.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      fromNumber: z.string().describe('Your connected WhatsApp number (with country code)'),
      messageUuid: z.string().describe('UUID of the message to delete'),
      sessionKey: z
        .string()
        .optional()
        .describe(
          'Session key returned by Get WhatsApp Messages. Omit only for a message in the newest 100 messages of this number.'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the message was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TwoChatClient({ token: ctx.auth.token });
    let result = await client.deleteMessage(
      ctx.input.fromNumber,
      ctx.input.messageUuid,
      ctx.input.sessionKey
    );

    return {
      output: {
        success: result.success === true
      },
      message: `Deletion request accepted for message **${ctx.input.messageUuid}**.`
    };
  })
  .build();
