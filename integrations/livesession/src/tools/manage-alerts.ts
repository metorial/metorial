import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let alertEventSchema = z.object({
  kind: z.number().describe('Event kind identifier'),
  value: z.string().optional().describe('Optional event value filter')
});

let alertSchema = z.object({
  alertId: z.string().describe('Unique alert identifier'),
  name: z.string().optional().describe('Alert name'),
  events: z.array(alertEventSchema).optional().describe('Events that trigger this alert'),
  provider: z.string().optional().describe('Notification provider (slack or webhooks)'),
  slackChannelId: z.string().optional().describe('Slack channel ID if provider is slack'),
  webhookId: z.string().optional().describe('Webhook endpoint ID if provider is webhooks')
});

let mapAlert = (a: any) => ({
  alertId: a.id || a.alert_id,
  name: a.name,
  events: a.events,
  provider: a.provider,
  slackChannelId: a.slack_channel_id,
  webhookId: a.webhook_id
});

export let listAlerts = SlateTool.create(spec, {
  name: 'List Alerts',
  key: 'list_alerts',
  description: `Retrieve all configured alerts from your LiveSession account. Returns alert names, trigger events, and notification destinations.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      alerts: z.array(alertSchema).describe('List of configured alerts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.listAlerts();
    let alerts = (Array.isArray(result) ? result : result.alerts || []).map(mapAlert);

    return {
      output: { alerts },
      message: `Found **${alerts.length}** alerts.`
    };
  })
  .build();

export let createAlert = SlateTool.create(spec, {
  name: 'Create Alert',
  key: 'create_alert',
  description: `Create a new alert in LiveSession. Configure which session events should trigger notifications and where notifications are sent (Slack or webhook endpoint).`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Descriptive name for the alert'),
      events: z.array(alertEventSchema).describe('Events that should trigger this alert'),
      provider: z.enum(['slack', 'webhooks']).describe('Notification delivery method'),
      slackChannelId: z
        .string()
        .optional()
        .describe('Slack channel ID (required if provider is "slack")'),
      webhookId: z
        .string()
        .optional()
        .describe('Webhook endpoint ID (required if provider is "webhooks")')
    })
  )
  .output(alertSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.createAlert({
      name: ctx.input.name,
      events: ctx.input.events,
      provider: ctx.input.provider,
      slackChannelId: ctx.input.slackChannelId,
      webhookId: ctx.input.webhookId
    });

    let alert = mapAlert(result);
    return {
      output: alert,
      message: `Created alert **${alert.name}** (${alert.alertId}).`
    };
  })
  .build();

export let updateAlert = SlateTool.create(spec, {
  name: 'Update Alert',
  key: 'update_alert',
  description: `Update an existing alert's configuration. Modify the alert name, trigger events, or notification destination.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      alertId: z.string().describe('ID of the alert to update'),
      name: z.string().optional().describe('New name for the alert'),
      events: z.array(alertEventSchema).optional().describe('Updated trigger events'),
      provider: z
        .enum(['slack', 'webhooks'])
        .optional()
        .describe('Updated notification provider'),
      slackChannelId: z.string().optional().describe('Updated Slack channel ID'),
      webhookId: z.string().optional().describe('Updated webhook endpoint ID')
    })
  )
  .output(alertSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.updateAlert(ctx.input.alertId, {
      name: ctx.input.name,
      events: ctx.input.events,
      provider: ctx.input.provider,
      slackChannelId: ctx.input.slackChannelId,
      webhookId: ctx.input.webhookId
    });

    let alert = mapAlert(result);
    return {
      output: alert,
      message: `Updated alert **${alert.name}** (${alert.alertId}).`
    };
  })
  .build();

export let deleteAlert = SlateTool.create(spec, {
  name: 'Delete Alert',
  key: 'delete_alert',
  description: `Permanently delete an alert from LiveSession. This stops all notifications for the alert's configured events.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      alertId: z.string().describe('ID of the alert to delete')
    })
  )
  .output(
    z.object({
      alertId: z.string().describe('ID of the deleted alert'),
      deleted: z.boolean().describe('Whether the alert was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.deleteAlert(ctx.input.alertId);

    return {
      output: {
        alertId: result.alert_id || ctx.input.alertId,
        deleted: result.deleted ?? true
      },
      message: `Deleted alert **${ctx.input.alertId}**.`
    };
  })
  .build();
