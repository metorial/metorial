import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, flattenResource, type JsonApiResource } from '../lib/client';
import { spec } from '../spec';

export let createHeartbeat = SlateTool.create(spec, {
  name: 'Create Heartbeat',
  key: 'create_heartbeat',
  description: `Create a new heartbeat monitor. Heartbeats expect periodic pings and trigger alerts if a ping is missed.
Configure the expected interval and notification target for when the heartbeat expires.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Heartbeat name'),
      description: z
        .string()
        .optional()
        .describe('Description of what this heartbeat monitors'),
      interval: z.number().describe('Expected ping interval'),
      intervalUnit: z.enum(['minutes', 'hours', 'days']).describe('Unit for the interval'),
      notificationTargetType: z
        .enum(['User', 'Group', 'EscalationPolicy', 'Service'])
        .optional()
        .describe('Type of notification target when heartbeat expires'),
      notificationTargetId: z.string().optional().describe('ID of the notification target'),
      alertSummary: z.string().optional().describe('Alert summary when heartbeat expires'),
      alertUrgencyId: z.string().optional().describe('Alert urgency ID')
    })
  )
  .output(
    z.object({
      heartbeat: z.record(z.string(), z.any()).describe('Created heartbeat details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createHeartbeat({
      name: ctx.input.name,
      description: ctx.input.description,
      interval: ctx.input.interval,
      intervalUnit: ctx.input.intervalUnit,
      notificationTargetType: ctx.input.notificationTargetType,
      notificationTargetId: ctx.input.notificationTargetId,
      alertSummary: ctx.input.alertSummary,
      alertUrgencyId: ctx.input.alertUrgencyId
    });

    let heartbeat = flattenResource(result.data as JsonApiResource);

    return {
      output: {
        heartbeat
      },
      message: `Created heartbeat **${ctx.input.name}** with ${ctx.input.interval} ${ctx.input.intervalUnit} interval.`
    };
  })
  .build();
