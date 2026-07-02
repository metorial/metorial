import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let logOutputSchema = z.object({
  logId: z.string().describe('Log ID.'),
  createdAt: z.string().optional().describe('Log creation timestamp.'),
  event: z.string().optional().describe('Resend event or log type.'),
  emailId: z.string().optional().nullable().describe('Related email ID, when available.'),
  status: z.string().optional().describe('Log status, when available.'),
  data: z.any().optional().describe('Additional provider-specific log payload.')
});

let toLogOutput = (log: any) => ({
  logId: log.id,
  createdAt: log.created_at,
  event: log.event ?? log.type,
  emailId: log.email_id ?? log.email?.id,
  status: log.status,
  data: log
});

export let listLogs = SlateTool.create(spec, {
  name: 'List Logs',
  key: 'list_logs',
  description: `List Resend account logs for recent email and account activity.`,
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
  description: `Retrieve one Resend log entry by ID.`,
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
      message: `Log \`${log.id}\` retrieved.`
    };
  })
  .build();
