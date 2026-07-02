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
      pageSize: z.number().min(1).max(250).optional().describe('Number of results per page'),
      after: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      alerts: z.array(
        z.object({
          alertId: z.string(),
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
      after: ctx.input.after
    });

    let alerts = result.alerts.map((a: any) => ({
      alertId: a.id,
      title: a.title || undefined,
      status: a.status || undefined,
      createdAt: a.created_at || undefined
    }));

    return {
      output: {
        alerts,
        nextCursor: result.pagination_meta?.after || undefined
      },
      message: `Found **${alerts.length}** alert(s).`
    };
  })
  .build();
