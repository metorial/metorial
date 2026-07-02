import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let removeBotFromCallTool = SlateTool.create(spec, {
  name: 'Remove Bot From Call',
  key: 'remove_bot_from_call',
  description: `Remove a bot from an active meeting. This is **irreversible** — the bot will leave the call and cannot rejoin. Use this to end a bot's participation in a meeting early.`,
  constraints: [
    'This action is irreversible.',
    'Rate limit: 300 requests per minute per workspace.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      botId: z.string().describe('The unique identifier of the bot to remove from the call')
    })
  )
  .output(
    z.object({
      botId: z.string().describe('ID of the bot that was removed'),
      removed: z.boolean().describe('Whether the removal was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    await client.removeBotFromCall(ctx.input.botId);

    return {
      output: {
        botId: ctx.input.botId,
        removed: true
      },
      message: `Bot ${ctx.input.botId} has been removed from the call.`
    };
  })
  .build();
