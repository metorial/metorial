import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a message through a chat-based AI assistant via a configured widget. Messages can be sent across channels like SMS, WhatsApp, or web chat depending on the widget's configuration.`
})
  .input(
    z.object({
      widgetId: z.string().describe('Widget ID to send the message through'),
      to: z
        .string()
        .describe(
          'Recipient identifier (phone number in E.164 format for SMS/WhatsApp, or user ID for chat)'
        ),
      message: z.string().describe('Message text to send')
    })
  )
  .output(
    z.object({
      conversationId: z.string().optional(),
      contactId: z.string().optional(),
      widgetId: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.sendMessage(ctx.input.widgetId, {
      to: ctx.input.to,
      message: ctx.input.message
    });
    let data = result.data || result;

    return {
      output: {
        conversationId: data.conversation_id || data.id,
        contactId: data.contact_id,
        widgetId: data.widget_id
      },
      message: `Sent message to **${ctx.input.to}** via widget \`${ctx.input.widgetId}\`.`
    };
  })
  .build();
