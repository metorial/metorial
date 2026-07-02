import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, flattenResource, type JsonApiResource } from '../lib/client';
import { spec } from '../spec';

export let createAlert = SlateTool.create(spec, {
  name: 'Create Alert',
  key: 'create_alert',
  description: `Ingest a new alert into Rootly from an external source. Alerts can be routed to escalation policies, services, or specific users.
Supports deduplication keys to prevent duplicate alerts and labels for categorization.`,
  constraints: ['Alert creation is limited to 50 per minute per API key.'],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      source: z
        .string()
        .describe('Alert source identifier (e.g., "datadog", "custom-monitor")'),
      summary: z.string().describe('Short summary of the alert'),
      description: z.string().optional().describe('Detailed description of the alert'),
      status: z.enum(['open', 'triggered']).optional().describe('Initial alert status'),
      serviceIds: z.array(z.string()).optional().describe('IDs of affected services'),
      groupIds: z.array(z.string()).optional().describe('Team/group IDs for routing'),
      environmentIds: z.array(z.string()).optional().describe('Environment IDs'),
      externalId: z.string().optional().describe('External identifier from the source system'),
      externalUrl: z.string().optional().describe('URL to the alert in the source system'),
      alertUrgencyId: z.string().optional().describe('Alert urgency ID'),
      notificationTargetType: z
        .enum(['User', 'Group', 'EscalationPolicy', 'Service'])
        .optional()
        .describe('Type of notification target'),
      notificationTargetId: z.string().optional().describe('ID of the notification target'),
      deduplicationKey: z
        .string()
        .optional()
        .describe('Deduplication key to prevent duplicate alerts'),
      labels: z
        .array(
          z.object({
            key: z.string(),
            value: z.string()
          })
        )
        .optional()
        .describe('Labels for categorization')
    })
  )
  .output(
    z.object({
      alert: z.record(z.string(), z.any()).describe('Created alert details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.createAlert({
      source: ctx.input.source,
      summary: ctx.input.summary,
      description: ctx.input.description,
      status: ctx.input.status,
      serviceIds: ctx.input.serviceIds,
      groupIds: ctx.input.groupIds,
      environmentIds: ctx.input.environmentIds,
      externalId: ctx.input.externalId,
      externalUrl: ctx.input.externalUrl,
      alertUrgencyId: ctx.input.alertUrgencyId,
      notificationTargetType: ctx.input.notificationTargetType,
      notificationTargetId: ctx.input.notificationTargetId,
      deduplicationKey: ctx.input.deduplicationKey,
      labels: ctx.input.labels
    });

    let alert = flattenResource(result.data as JsonApiResource);

    return {
      output: {
        alert
      },
      message: `Created alert from source **${ctx.input.source}**: "${ctx.input.summary}" (ID: ${alert.id}).`
    };
  })
  .build();
