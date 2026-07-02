import { SlateTool } from 'slates';
import { z } from 'zod';
import { RenderClient } from '../lib/client';
import { spec } from '../spec';

export let queryLogs = SlateTool.create(spec, {
  name: 'Query Logs',
  key: 'query_logs',
  description: `Query service logs from Render. Filter by resource, time range, log level, and search text. Returns recent log entries for debugging and monitoring.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resourceId: z
        .string()
        .describe('Resource ID to query logs for (service, postgres, or key-value ID)'),
      ownerId: z.string().optional().describe('Workspace/owner ID'),
      start: z.string().optional().describe('Start time (ISO 8601)'),
      end: z.string().optional().describe('End time (ISO 8601)'),
      text: z.string().optional().describe('Text to search for in logs'),
      level: z
        .enum(['info', 'warn', 'error', 'debug'])
        .optional()
        .describe('Log level filter'),
      limit: z.number().optional().describe('Maximum log entries to return (default 100)'),
      direction: z
        .enum(['forward', 'backward'])
        .optional()
        .describe('Direction of log retrieval')
    })
  )
  .output(
    z.object({
      logs: z.array(
        z.object({
          timestamp: z.string().describe('Log entry timestamp'),
          message: z.string().describe('Log message'),
          level: z.string().optional().describe('Log level')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new RenderClient(ctx.auth.token);

    let params: Record<string, any> = {
      resource: [ctx.input.resourceId]
    };
    if (ctx.input.ownerId) params.ownerId = [ctx.input.ownerId];
    if (ctx.input.start) params.start = ctx.input.start;
    if (ctx.input.end) params.end = ctx.input.end;
    if (ctx.input.text) params.text = ctx.input.text;
    if (ctx.input.level) params.level = [ctx.input.level];
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.direction) params.direction = ctx.input.direction;

    let data = await client.queryLogs(params);
    let logs = (data as any[]).map((item: any) => ({
      timestamp: item.timestamp,
      message: item.message,
      level: item.level
    }));

    return {
      output: { logs },
      message: `Retrieved **${logs.length}** log entries for \`${ctx.input.resourceId}\`.${logs.length > 0 ? `\nLatest: ${logs[0]?.message?.slice(0, 100) || 'N/A'}` : ''}`
    };
  })
  .build();
