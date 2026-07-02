import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getSessionLogs = SlateTool.create(spec, {
  name: 'Get Session Logs',
  key: 'get_session_logs',
  description: `Retrieve CDP (Chrome DevTools Protocol) logs for a browser session. Returns detailed request/response data for each CDP method call, useful for debugging automation issues.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      sessionId: z.string().describe('The session ID to retrieve logs for')
    })
  )
  .output(
    z.object({
      logs: z.array(
        z.object({
          method: z.string().describe('CDP method name'),
          pageId: z.number().describe('Page identifier'),
          sessionId: z.string().describe('Session identifier'),
          timestamp: z.number().describe('Event timestamp in milliseconds since UNIX epoch'),
          request: z
            .object({
              timestamp: z.number().describe('Request timestamp'),
              params: z.record(z.string(), z.unknown()).describe('CDP request parameters'),
              rawBody: z.string().describe('Raw request body')
            })
            .describe('Request details'),
          response: z
            .object({
              timestamp: z.number().describe('Response timestamp'),
              result: z.record(z.string(), z.unknown()).describe('CDP response result'),
              rawBody: z.string().describe('Raw response body')
            })
            .describe('Response details')
        })
      ),
      totalCount: z.number().describe('Total number of log entries')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let logs = await client.getSessionLogs(ctx.input.sessionId);

    return {
      output: {
        logs: logs.map(log => ({
          method: log.method,
          pageId: log.pageId,
          sessionId: log.sessionId,
          timestamp: log.timestamp,
          request: log.request,
          response: log.response
        })),
        totalCount: logs.length
      },
      message: `Retrieved **${logs.length}** CDP log entries for session **${ctx.input.sessionId}**.`
    };
  })
  .build();
