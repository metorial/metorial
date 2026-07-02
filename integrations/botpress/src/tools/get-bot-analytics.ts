import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdminClient } from '../lib/client';
import { spec } from '../spec';

export let getBotAnalyticsTool = SlateTool.create(spec, {
  name: 'Get Bot Analytics',
  key: 'get_bot_analytics',
  description: `Retrieve analytics data for a bot including conversation counts, message volumes, and user engagement metrics. Optionally filter by date range.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      botId: z.string().optional().describe('Bot ID. Falls back to config botId.'),
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID. Falls back to config workspaceId.'),
      startDate: z.string().optional().describe('Start date for analytics period (ISO 8601)'),
      endDate: z.string().optional().describe('End date for analytics period (ISO 8601)')
    })
  )
  .output(
    z.object({
      analytics: z
        .record(z.string(), z.unknown())
        .describe('Analytics data returned by Botpress')
    })
  )
  .handleInvocation(async ctx => {
    let botId = ctx.input.botId || ctx.config.botId;
    if (!botId) throw new Error('botId is required (provide in input or config)');

    let client = new AdminClient({
      token: ctx.auth.token,
      workspaceId: ctx.input.workspaceId || ctx.config.workspaceId
    });

    let result = await client.getBotAnalytics(botId, {
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });

    return {
      output: { analytics: result },
      message: `Retrieved analytics for bot **${botId}**.`
    };
  })
  .build();
