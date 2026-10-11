import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let logOutputSchema = z.object({
  logId: z.string().describe('Log ID.'),
  createdAt: z.string().optional().describe('Log creation timestamp.'),
  endpoint: z
    .string()
    .optional()
    .describe('API endpoint path that was called, such as /emails.'),
  method: z.string().optional().describe('HTTP method of the API request.'),
  responseStatus: z.number().optional().describe('HTTP status code Resend returned.'),
  userAgent: z.string().optional().nullable().describe('User agent of the API client.'),
  requestBody: z
    .any()
    .optional()
    .describe('Request body sent to Resend. Only returned by Get Log.'),
  responseBody: z
    .any()
    .optional()
    .describe('Response body Resend returned. Only returned by Get Log.'),
  event: z
    .string()
    .optional()
    .describe('Legacy field; Resend API request logs do not set it.'),
  emailId: z
    .string()
    .optional()
    .nullable()
    .describe('Related email ID, when the response body contains one.'),
  status: z.string().optional().describe('Legacy field; use responseStatus instead.'),
  data: z.any().optional().describe('Raw log record as returned by Resend.')
});

let toLogOutput = (log: any) => ({
  logId: log.id,
  createdAt: log.created_at,
  endpoint: log.endpoint,
  method: log.method,
  responseStatus: log.response_status,
  userAgent: log.user_agent,
  requestBody: log.request_body,
  responseBody: log.response_body,
  event: log.event ?? log.type,
  emailId:
    log.email_id ??
    log.email?.id ??
    (log.method === 'POST' &&
    log.endpoint === '/emails' &&
    typeof log.response_body?.id === 'string'
      ? log.response_body.id
      : undefined),
  status: log.status,
  data: log
});

export let listLogs = SlateTool.create(spec, {
  name: 'List Logs',
  key: 'list_logs',
  description: `List Resend API request logs, including endpoint, HTTP method, response status, and user agent. Use Get Log for request and response bodies.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Max results (default 20, max 100).'),
      after: z.string().optional().describe('Cursor for forward pagination.'),
      before: z.string().optional().describe('Cursor for backward pagination.')
    })
  )
  .output(
    z.object({
      logs: z.array(logOutputSchema).describe('Resend logs.'),
      hasMore: z.boolean().describe('Whether more results are available.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listLogs({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });
    let logs = (result.data || []).map(toLogOutput);

    return {
      output: {
        logs,
        hasMore: result.has_more ?? false
      },
      message: `Found **${logs.length}** log(s).`
    };
  })
  .build();

export let getLog = SlateTool.create(spec, {
  name: 'Get Log',
  key: 'get_log',
  description: `Retrieve one Resend API request log by ID, including the request and response bodies.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      logId: z.string().describe('Log ID.')
    })
  )
  .output(logOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let log = await client.getLog(ctx.input.logId);

    return {
      output: toLogOutput(log),
      message: `Log \`${log.id}\` — **${log.method ?? ''} ${log.endpoint ?? ''}** returned ${log.response_status ?? 'unknown status'}.`
    };
  })
  .build();
