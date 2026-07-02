import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let sendChatMessageTool = SlateTool.create(spec, {
  name: 'Send Chat Message',
  key: 'send_chat_message',
  description: `Send a chat message through a bot in an active meeting. The message will appear in the meeting's chat from the bot.`,
  constraints: [
    'Rate limit: 300 requests per minute per workspace.',
    'The bot must be actively in a meeting to send chat messages.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      botId: z.string().describe('The unique identifier of the bot to send the message from'),
      message: z.string().describe('The chat message text to send')
    })
  )
  .output(
    z.object({
      botId: z.string().describe('Bot ID that sent the message'),
      sent: z.boolean().describe('Whether the message was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    await client.sendChatMessage(ctx.input.botId, ctx.input.message);

    return {
      output: {
        botId: ctx.input.botId,
        sent: true
      },
      message: `Chat message sent via bot ${ctx.input.botId}.`
    };
  })
  .build();
