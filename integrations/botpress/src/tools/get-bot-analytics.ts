import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdminClient } from '../lib/client';
import {
  botIdSchema,
  resolveBotId,
  resolveTimeRange,
  resolveWorkspaceId,
  workspaceIdSchema
} from '../lib/schemas';
import { spec } from '../spec';

export let getBotAnalyticsTool = SlateTool.create(spec, {
  name: 'Get Bot Analytics',
  key: 'get_bot_analytics',
  description: `Retrieve analytics data for a bot including conversation counts, message volumes, and user engagement metrics. Optionally filter by date range. Call list_workspaces to discover workspace IDs, then list_bots to discover bot IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      botId: botIdSchema,
      workspaceId: workspaceIdSchema,
      startDate: z
        .string()
        .optional()
        .describe('Inclusive ISO 8601 start date; defaults to seven days before endDate.'),
      endDate: z.string().optional().describe('Inclusive ISO 8601 end date; defaults to now.')
    })
  )
  .output(
    z.object({
      analytics: z
        .record(z.string(), z.unknown())
        .describe('Analytics data returned by Botpress'),
      startDate: z.string().optional(),
      endDate: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let botId = resolveBotId(ctx.input.botId, ctx.config);

    let client = new AdminClient({
      token: ctx.auth.token,
      workspaceId: resolveWorkspaceId(ctx.input.workspaceId, ctx.config)
    });

    const range = resolveTimeRange(ctx.input.startDate, ctx.input.endDate, 7);
    let result = await client.getBotAnalytics(botId, range);

    return {
      output: { analytics: result, ...range },
      message: `Retrieved analytics for bot **${botId}**.`
    };
  })
  .build();
