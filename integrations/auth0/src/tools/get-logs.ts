import { SlateTool } from 'slates';
import { z } from 'zod';
import { Auth0Client } from '../lib/client';
import { spec } from '../spec';

export let getLogsTool = SlateTool.create(spec, {
  name: 'Get Logs',
  key: 'get_logs',
  description: `Retrieve tenant log events for authentication activity, user actions, and administrative operations. Supports Lucene query syntax filtering, pagination, and cursor-based retrieval.`,
  instructions: [
    'Use the "from" parameter with a log ID for cursor-based pagination (more efficient for large datasets).',
    'Use "page" and "perPage" for page-based pagination.',
    'Query uses Lucene syntax (e.g., type:"s" for successful logins).'
  ],
  constraints: [
    'Maximum of 100 entries per request.',
    'Log data is available for the retention period configured for your tenant.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .optional()
        .describe('Lucene query string to filter logs (e.g., type:"s" for successful logins)'),
      page: z.number().optional().describe('Page number (zero-based)'),
      perPage: z.number().optional().describe('Results per page (max 100)'),
      sort: z
        .string()
        .optional()
        .describe('Sort field and direction (e.g., "date:-1" for newest first)'),
      from: z.string().optional().describe('Log ID to start from (cursor-based pagination)'),
      take: z
        .number()
        .optional()
        .describe('Number of entries to take when using cursor-based pagination'),
      includeTotals: z.boolean().optional().describe('Include total count in response')
    })
  )
  .output(
    z.object({
      logs: z
        .array(
          z.object({
            logId: z.string().describe('Log event ID'),
            type: z.string().optional().describe('Event type code'),
            description: z.string().optional().describe('Event description'),
            date: z.string().optional().describe('Event timestamp'),
            clientId: z.string().optional().describe('Client ID involved'),
            clientName: z.string().optional().describe('Client name involved'),
            ip: z.string().optional().describe('IP address'),
            userId: z.string().optional().describe('User ID involved'),
            userName: z.string().optional().describe('User name involved'),
            connection: z.string().optional().describe('Connection used')
          })
        )
        .describe('Log events'),
      total: z.number().optional().describe('Total number of matching log events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Auth0Client({
      token: ctx.auth.token,
      domain: ctx.auth.domain
    });

    let result = await client.getLogs({
      q: ctx.input.query,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      sort: ctx.input.sort,
      from: ctx.input.from,
      take: ctx.input.take,
      includeTotals: ctx.input.includeTotals
    });

    let logs = (Array.isArray(result) ? result : (result.logs ?? [])).map((l: any) => ({
      logId: l.log_id || l._id,
      type: l.type,
      description: l.description,
      date: l.date,
      clientId: l.client_id,
      clientName: l.client_name,
      ip: l.ip,
      userId: l.user_id,
      userName: l.user_name,
      connection: l.connection
    }));

    return {
      output: { logs, total: result.total },
      message: `Retrieved **${logs.length}** log event(s).`
    };
  })
  .build();
