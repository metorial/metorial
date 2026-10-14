import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendMessage = SlateTool.create(spec, {
  name: 'Send Message',
  key: 'send_message',
  description: `Send a text message through a widget connected to SMS or WhatsApp. Use a recipient phone number including its country code.`
})
  .input(
    z.object({
      widgetId: z.string().describe('Widget ID to send the message through'),
      to: z
        .string()
        .describe(
          'Recipient identifier (phone number in E.164 format for SMS/WhatsApp, or user ID for chat)'
        ),
      message: z.string().describe('Message text to send'),
      startNewConversation: z
        .boolean()
        .optional()
        .describe('Start a new conversation instead of using the latest one'),
      conversationId: z.string().optional().describe('Existing conversation ID to use'),
      widgetParameters: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Channel-specific parameters, including WhatsApp templates')
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
      message: ctx.input.message,
      start_new_conversation: ctx.input.startNewConversation,
      conversation_id: ctx.input.conversationId,
      widget_parameters: ctx.input.widgetParameters
    });
    let data = result?.data ?? result ?? {};

    return {
      output: {
        conversationId: data.conversation_id || data.id,
        contactId: data.contact_id ?? undefined,
        widgetId: data.widget_id ?? undefined
      },
      message: `Sent message to **${ctx.input.to}** via widget \`${ctx.input.widgetId}\`.`
    };
  })
  .build();
