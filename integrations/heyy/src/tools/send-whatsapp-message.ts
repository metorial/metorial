import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendWhatsAppMessageTool = SlateTool.create(spec, {
  name: 'Send WhatsApp Message',
  key: 'send_whatsapp_message',
  description: `Send a WhatsApp message to a contact through a specified channel. Supports text messages, template messages, and media messages (image, video, document, audio).
For **text** messages, provide the body text directly.
For **template** messages, provide a message template ID and optional variables.
For **media** messages, provide a file ID obtained from the file upload tool.
Messages can optionally be scheduled for future delivery.`,
  instructions: [
    'Use the List Channels tool to find your WhatsApp channel ID.',
    'For template messages, use the List Message Templates tool to find available templates.',
    'For media messages, upload the file first using the Upload File tool to get a file ID.'
  ]
})
  .input(
    z.object({
      channelId: z.string().describe('WhatsApp channel ID to send the message through'),
      phoneNumber: z.string().describe('Recipient phone number'),
      type: z
        .enum(['TEXT', 'TEMPLATE', 'IMAGE', 'VIDEO', 'DOCUMENT', 'AUDIO'])
        .describe('Type of message to send'),
      bodyText: z
        .string()
        .max(4096)
        .optional()
        .describe('Message body text (required for TEXT, optional for IMAGE/VIDEO/DOCUMENT)'),
      messageTemplateId: z
        .string()
        .optional()
        .describe('Message template ID (required for TEMPLATE type)'),
      variables: z
        .array(
          z.object({
            name: z.string().describe('Variable name'),
            value: z.string().describe('Variable value')
          })
        )
        .optional()
        .describe('Template variables (for TEMPLATE type)'),
      fileId: z
        .string()
        .optional()
        .describe(
          'File ID for media messages (required for IMAGE, VIDEO, DOCUMENT, AUDIO types)'
        ),
      scheduledAt: z
        .string()
        .optional()
        .describe('ISO datetime to schedule the message for future delivery')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('Unique identifier of the sent message'),
      phoneNumber: z.string().describe('Recipient phone number'),
      status: z.string().describe('Message delivery status'),
      createdAt: z.string().optional().describe('When the message was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.sendWhatsAppMessage(ctx.input.channelId, {
      phoneNumber: ctx.input.phoneNumber,
      type: ctx.input.type,
      bodyText: ctx.input.bodyText,
      messageTemplateId: ctx.input.messageTemplateId,
      variables: ctx.input.variables,
      fileId: ctx.input.fileId,
      scheduledAt: ctx.input.scheduledAt
    });

    return {
      output: {
        messageId: result.id,
        phoneNumber: result.phoneNumber,
        status: result.status,
        createdAt: result.createdAt
      },
      message: `Sent **${ctx.input.type}** message to **${ctx.input.phoneNumber}** — status: **${result.status}**.`
    };
  })
  .build();
