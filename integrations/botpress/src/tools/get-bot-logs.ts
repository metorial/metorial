import { SlateTool } from 'slates';
import { z } from 'zod';
import { AdminClient } from '../lib/client';
import { spec } from '../spec';

export let getBotLogsTool = SlateTool.create(spec, {
  name: 'Get Bot Logs',
  key: 'get_bot_logs',
  description: `Retrieve activity logs for a bot. Useful for debugging, monitoring bot behavior, and auditing conversation flows.`,
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
      nextToken: z.string().optional().describe('Pagination token'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort order for logs')
    })
  )
  .output(
    z.object({
      logs: z.array(z.record(z.string(), z.unknown())),
      nextToken: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let botId = ctx.input.botId || ctx.config.botId;
    if (!botId) throw new Error('botId is required (provide in input or config)');

    let client = new AdminClient({
      token: ctx.auth.token,
      workspaceId: ctx.input.workspaceId || ctx.config.workspaceId
    });

    let result = await client.getBotLogs(botId, {
      nextToken: ctx.input.nextToken,
      sortOrder: ctx.input.sortOrder
    });

    let logs = result.logs || [];
    return {
      output: { logs, nextToken: result.meta?.nextToken },
      message: `Retrieved **${logs.length}** log entries for bot **${botId}**.`
    };
  })
  .build();
