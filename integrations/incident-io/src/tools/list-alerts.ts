import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAlerts = SlateTool.create(spec, {
  name: 'List Alerts',
  key: 'list_alerts',
  description: `List all alerts in your incident.io account with pagination support. Returns alert details including title, status, and source information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      pageSize: z
        .number()
        .min(1)
        .max(250)
        .optional()
        .describe('Number of results per page; the provider maximum is 50'),
      after: z.string().optional().describe('Cursor for pagination'),
      deduplicationKey: z.string().optional().describe('Exact alert deduplication key'),
      alertSourceId: z
        .string()
        .optional()
        .describe('Filter by source ID from List Alert Sources'),
      status: z.enum(['firing', 'resolved']).optional()
    })
  )
  .output(
    z.object({
      returnedCount: z.number().int().nonnegative(),
      alerts: z.array(
        z.object({
          alertId: z.string(),
          alertSourceId: z
            .string()
            .optional()
            .describe('Source ID for filtering and discovery'),
          deduplicationKey: z
            .string()
            .optional()
            .describe('Deduplication key to resolve this alert through its source'),
          title: z.string().optional(),
          status: z.string().optional(),
          createdAt: z.string().optional()
        })
      ),
      nextCursor: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listAlerts({
      pageSize: ctx.input.pageSize,
      after: ctx.input.after,
      deduplicationKey: ctx.input.deduplicationKey,
      alertSourceId: ctx.input.alertSourceId,
      status: ctx.input.status
    });

    let alerts = result.alerts.map(a => ({
      alertId: a.id,
      alertSourceId: a.alert_source_id,
      deduplicationKey: a.deduplication_key,
      title: a.title || undefined,
      status: a.status || undefined,
      createdAt: a.created_at || undefined
    }));

    return {
      output: {
        alerts,
        returnedCount: alerts.length,
        nextCursor: result.pagination_meta?.after || undefined
      },
      message: `Found **${alerts.length}** alert(s).`
    };
  })
  .build();
