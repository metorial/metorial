import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSplunkClient } from '../lib/helpers';
import { spec } from '../spec';

export let listFiredAlerts = SlateTool.create(spec, {
  name: 'List Fired Alerts',
  key: 'list_fired_alerts',
  description: `List recently fired alerts on the Splunk instance. Returns alert names, trigger counts, and identifiers. Useful for monitoring alert activity.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      count: z.number().optional().describe('Number of alerts to return (default 30)'),
      offset: z.number().optional().describe('Offset for pagination'),
      namespace: z
        .object({
          owner: z.string().optional().describe('Namespace owner'),
          app: z.string().optional().describe('Namespace app context')
        })
        .optional()
        .describe('Optional app/owner namespace context')
    })
  )
  .output(
    z.object({
      alerts: z.array(
        z.object({
          name: z.string().optional(),
          triggeredAlertCount: z.any().optional(),
          alertId: z.string().optional()
        })
      ),
      total: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = createSplunkClient(ctx);
    let response = await client.listFiredAlerts({
      count: ctx.input.count,
      offset: ctx.input.offset,
      namespace: ctx.input.namespace
    });

    return {
      output: {
        alerts: response.alerts.map(a => ({
          name: a.name,
          triggeredAlertCount: a.triggeredAlertCount,
          alertId: a.id
        })),
        total: response.total
      },
      message: `Found **${response.total}** fired alerts. Returned **${response.alerts.length}**.`
    };
  })
  .build();
