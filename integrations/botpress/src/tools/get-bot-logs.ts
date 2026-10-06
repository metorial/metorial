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

export let getBotLogsTool = SlateTool.create(spec, {
  name: 'Get Bot Logs',
  key: 'get_bot_logs',
  description: `Retrieve activity logs for a bot. Useful for debugging, monitoring bot behavior, and auditing conversation flows. Call list_workspaces to discover workspace IDs, then list_bots to discover bot IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      botId: botIdSchema,
      workspaceId: workspaceIdSchema,
      nextToken: z.string().optional().describe('Pagination token'),
      sortOrder: z
        .enum(['asc', 'desc'])
        .optional()
        .describe(
          'Sort entries within the returned page by timestamp; provider pagination order is unchanged.'
        ),
      timeStart: z
        .string()
        .optional()
        .describe(
          'ISO 8601 start time; defaults to 24 hours before timeEnd. Reuse this value when following nextToken.'
        ),
      timeEnd: z
        .string()
        .optional()
        .describe(
          'ISO 8601 end time; defaults to now. Reuse this value when following nextToken.'
        ),
      level: z.string().optional().describe('Filter by log level.'),
      userId: z.string().optional().describe('Filter by user ID.'),
      workflowId: z.string().optional().describe('Filter by workflow ID.'),
      conversationId: z.string().optional().describe('Filter by conversation ID.'),
      messageContains: z
        .string()
        .optional()
        .describe('Filter by a substring of the log message.')
    })
  )
  .output(
    z.object({
      logs: z.array(z.record(z.string(), z.unknown())),
      nextToken: z.string().optional(),
      timeStart: z.string().optional(),
      timeEnd: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let botId = resolveBotId(ctx.input.botId, ctx.config);

    let client = new AdminClient({
      token: ctx.auth.token,
      workspaceId: resolveWorkspaceId(ctx.input.workspaceId, ctx.config)
    });

    const range = resolveTimeRange(ctx.input.timeStart, ctx.input.timeEnd, 1);
    let result = await client.getBotLogs(botId, {
      nextToken: ctx.input.nextToken,
      timeStart: range.startDate,
      timeEnd: range.endDate,
      level: ctx.input.level,
      userId: ctx.input.userId,
      workflowId: ctx.input.workflowId,
      conversationId: ctx.input.conversationId,
      messageContains: ctx.input.messageContains
    });

    let logs = result.logs || [];
    if (ctx.input.sortOrder)
      logs.sort(
        (a: Record<string, unknown>, b: Record<string, unknown>) =>
          (ctx.input.sortOrder === 'asc' ? 1 : -1) *
          String(a.timestamp).localeCompare(String(b.timestamp))
      );
    return {
      output: {
        logs,
        nextToken: result.nextToken,
        timeStart: range.startDate,
        timeEnd: range.endDate
      },
      message: `Retrieved **${logs.length}** log entries for bot **${botId}**.`
    };
  })
  .build();
