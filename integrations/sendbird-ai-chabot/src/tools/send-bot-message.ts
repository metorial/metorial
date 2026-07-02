import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendBotMessage = SlateTool.create(spec, {
  name: 'Send Bot Message',
  key: 'send_bot_message',
  description: `Sends a text message from a bot to a specific channel. The bot must have already joined the channel.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      botUserId: z.string().describe('User ID of the bot sending the message'),
      channelUrl: z.string().describe('URL of the target channel'),
      message: z.string().describe('Text content of the message to send'),
      customType: z.string().optional().describe('Custom message type for categorization')
    })
  )
  .output(
    z.object({
      messageId: z.number().describe('Unique ID of the sent message'),
      message: z.string().describe('Text content of the sent message'),
      channelUrl: z.string().describe('URL of the channel the message was sent to'),
      createdAt: z.number().describe('Unix timestamp (ms) when the message was created'),
      customType: z.string().optional().describe('Custom type of the message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      applicationId: ctx.config.applicationId
    });

    let result = await client.sendBotMessage(
      ctx.input.botUserId,
      ctx.input.channelUrl,
      ctx.input.message,
      ctx.input.customType
    );

    let msg = result.message_info || result;
    return {
      output: {
        messageId: msg.message_id ?? result.message_id,
        message: msg.message ?? ctx.input.message,
        channelUrl: msg.channel_url ?? ctx.input.channelUrl,
        createdAt: msg.created_at ?? 0,
        customType: msg.custom_type
      },
      message: `Bot **${ctx.input.botUserId}** sent a message to channel.`
    };
  })
  .build();
