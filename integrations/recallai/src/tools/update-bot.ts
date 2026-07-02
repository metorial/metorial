import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateBotTool = SlateTool.create(spec, {
  name: 'Update Scheduled Bot',
  key: 'update_bot',
  description: `Update a scheduled bot's configuration before it joins a meeting. You can change the meeting URL, bot name, join time, recording config, and other settings. Only non-dispatched (scheduled) bots can be updated.`,
  instructions: ['Only bots that have not yet started joining can be updated.'],
  constraints: [
    'Rate limit: 300 requests per minute per workspace.',
    'Cannot update a bot that has already been dispatched or joined a meeting.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      botId: z.string().describe('The unique identifier of the scheduled bot to update'),
      meetingUrl: z.string().optional().describe('New meeting URL'),
      botName: z.string().optional().describe('New display name for the bot'),
      joinAt: z.string().optional().describe('New scheduled join time (ISO 8601)'),
      metadata: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Updated custom metadata')
    })
  )
  .output(
    z.object({
      botId: z.string().describe('Bot unique identifier'),
      botName: z.string().describe('Updated bot display name'),
      meetingUrl: z.unknown().describe('Updated meeting URL'),
      joinAt: z.string().nullable().describe('Updated scheduled join time'),
      status: z.string().describe('Current bot status')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let bot = await client.updateBot(ctx.input.botId, {
      meetingUrl: ctx.input.meetingUrl,
      botName: ctx.input.botName,
      joinAt: ctx.input.joinAt,
      metadata: ctx.input.metadata
    });

    return {
      output: {
        botId: bot.id,
        botName: bot.botName,
        meetingUrl: bot.meetingUrl,
        joinAt: bot.joinAt,
        status: bot.status
      },
      message: `Bot **${bot.botName}** (${bot.id}) updated successfully.`
    };
  })
  .build();
