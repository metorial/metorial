import { SlateTool } from 'slates';
import { z } from 'zod';
import { BroadcastClient } from '../lib/broadcast-client';
import { spec } from '../spec';

export let broadcastMessage = SlateTool.create(spec, {
  name: 'Broadcast Message',
  key: 'broadcast_message',
  description: `Send text messages to a specific chatbot user via the BotStar broadcast API. Requires a bot-level access token (configured as "botToken" in authentication). The user must be an existing audience member of the bot.`,
  instructions: [
    'The botToken (bot-level access token) must be provided in authentication settings. It is different from the account-level API token.',
    'Ensure compliance with Messenger Platform messaging policies when sending messages.'
  ]
})
  .input(
    z.object({
      userId: z.string().describe('ID of the user to send the message to'),
      messages: z
        .array(
          z.object({
            text: z.string().describe('Text content of the message')
          })
        )
        .min(1)
        .describe('Array of text messages to send')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the broadcast was sent successfully')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.auth.botToken) {
      throw new Error(
        'Bot-level access token (botToken) is required for broadcasting messages. Configure it in authentication settings.'
      );
    }

    let client = new BroadcastClient(ctx.auth.botToken);
    await client.broadcastMessage(ctx.input.userId, ctx.input.messages);

    return {
      output: { success: true },
      message: `Sent **${ctx.input.messages.length}** message(s) to user **${ctx.input.userId}**.`
    };
  })
  .build();
