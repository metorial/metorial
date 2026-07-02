import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageTypingIndicator = SlateTool.create(spec, {
  name: 'Manage Typing Indicator',
  key: 'manage_typing_indicator',
  description: `Start or stop a typing indicator for a bot in a group channel. Provides a natural conversational experience while the bot is generating a response.`,
  constraints: [
    'When there are 100+ members in a group channel, typing indicator events for up to 2 users are delivered.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      channelUrl: z.string().describe('URL of the group channel'),
      botUserId: z.string().describe('User ID of the bot to show/hide typing indicator for'),
      action: z
        .enum(['start', 'stop'])
        .describe('Whether to start or stop the typing indicator')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the typing indicator action was successful'),
      action: z.string().describe('The action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      applicationId: ctx.config.applicationId
    });

    if (ctx.input.action === 'start') {
      await client.startTypingIndicator(ctx.input.channelUrl, [ctx.input.botUserId]);
    } else {
      await client.stopTypingIndicator(ctx.input.channelUrl, [ctx.input.botUserId]);
    }

    return {
      output: {
        success: true,
        action: ctx.input.action
      },
      message: `Typing indicator **${ctx.input.action === 'start' ? 'started' : 'stopped'}** for bot **${ctx.input.botUserId}** in channel.`
    };
  })
  .build();
