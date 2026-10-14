import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMessage = SlateTool.create(spec, {
  name: 'Get Message',
  key: 'get_message',
  description:
    'Retrieves a message from a group channel by its ID, including text, sender, type, and creation time. Use the ID returned by send_bot_message to read a sent bot message.',
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      channelUrl: z
        .string()
        .min(1)
        .describe('Group channel URL. Call list_bot_channels to discover joined channels.'),
      messageId: z
        .number()
        .refine(
          value => Number.isSafeInteger(value) && value > 0,
          'Use a positive whole-number message ID'
        )
        .describe('Message ID, such as the ID returned by send_bot_message')
    })
  )
  .output(
    z.object({
      messageId: z.number(),
      channelUrl: z.string(),
      messageType: z.string().optional(),
      message: z.string().optional(),
      senderUserId: z.string().optional(),
      createdAt: z.number().describe('Message creation time in Unix milliseconds'),
      customType: z.string().optional(),
      data: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      applicationId: ctx.auth.applicationId ?? ctx.config.applicationId
    });
    let result = await client.getMessage(ctx.input.channelUrl, ctx.input.messageId);
    return {
      output: {
        messageId: result.message_id,
        channelUrl: result.channel_url ?? ctx.input.channelUrl,
        messageType: result.type,
        message: result.message,
        senderUserId: result.user?.user_id,
        createdAt: result.created_at,
        customType: result.custom_type,
        data: result.data
      },
      message: `Retrieved message **${result.message_id}**.`
    };
  })
  .build();
