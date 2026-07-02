import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let channelSchema = z.object({
  integration: z.string().describe('Alert integration type: email, webhook, or pagerduty'),
  emails: z.array(z.string()).optional().describe('Email addresses for email alerts'),
  url: z.string().optional().describe('Webhook URL'),
  method: z.string().optional().describe('HTTP method for webhook'),
  headers: z
    .record(z.string(), z.string())
    .optional()
    .describe('Custom HTTP headers for webhook'),
  bodyTemplate: z.string().optional().describe('Body template for webhook'),
  key: z.string().optional().describe('PagerDuty service key'),
  triggerlimit: z.number().optional().describe('Number of log lines before triggering'),
  triggerinterval: z.string().optional().describe('Trigger evaluation interval'),
  operator: z.string().optional().describe('"presence" or "absence"'),
  immediate: z.boolean().optional().describe('Send alert immediately on match'),
  terminal: z.boolean().optional().describe('Whether the alert is terminal'),
  timezone: z.string().optional().describe('Timezone for alert schedule')
});

let alertOutputSchema = z.object({
  alertId: z.string().describe('Unique ID of the preset alert'),
  name: z.string().optional().describe('Name of the preset alert'),
  channels: z.array(z.any()).optional().describe('Alert channels configuration')
});

export let listPresetAlerts = SlateTool.create(spec, {
  name: 'List Preset Alerts',
  key: 'list_preset_alerts',
  description: `List all preset (account-wide) alerts. Preset alerts apply globally across all log data, unlike view-specific alerts.`,
  tags: { destructive: false, readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      alerts: z.array(alertOutputSchema).describe('List of preset alerts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ serviceKey: ctx.auth.token });
    let alerts = await client.listPresetAlerts();
    let alertList = Array.isArray(alerts) ? alerts : [];

    return {
      output: {
        alerts: alertList.map((a: any) => ({
          alertId: a.presetID || a.id || '',
          name: a.name,
          channels: a.channels
        }))
      },
      message: `Found **${alertList.length}** preset alert(s).`
    };
  })
  .build();

export let createPresetAlert = SlateTool.create(spec, {
  name: 'Create Preset Alert',
  key: 'create_preset_alert',
  description: `Create a new account-wide preset alert with one or more notification channels (email, webhook, or PagerDuty). Preset alerts are global and not tied to a specific view.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      name: z.string().describe('Name for the preset alert'),
      channels: z.array(channelSchema).min(1).describe('Notification channels for the alert')
    })
  )
  .output(alertOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ serviceKey: ctx.auth.token });
    let a = await client.createPresetAlert({
      name: ctx.input.name,
      channels: ctx.input.channels
    });

    return {
      output: {
        alertId: a.presetID || a.id || '',
        name: a.name,
        channels: a.channels
      },
      message: `Created preset alert **${a.name || ctx.input.name}**.`
    };
  })
  .build();

export let updatePresetAlert = SlateTool.create(spec, {
  name: 'Update Preset Alert',
  key: 'update_preset_alert',
  description: `Update an existing preset alert's name and/or notification channels.`,
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      alertId: z.string().describe('ID of the preset alert to update'),
      name: z.string().optional().describe('New name for the alert'),
      channels: z.array(channelSchema).optional().describe('Updated notification channels')
    })
  )
  .output(alertOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ serviceKey: ctx.auth.token });
    let updates: any = {};
    if (ctx.input.name) updates.name = ctx.input.name;
    if (ctx.input.channels) updates.channels = ctx.input.channels;
    let a = await client.updatePresetAlert(ctx.input.alertId, updates);

    return {
      output: {
        alertId: a.presetID || a.id || ctx.input.alertId,
        name: a.name,
        channels: a.channels
      },
      message: `Updated preset alert **${a.name || ctx.input.alertId}**.`
    };
  })
  .build();

export let deletePresetAlert = SlateTool.create(spec, {
  name: 'Delete Preset Alert',
  key: 'delete_preset_alert',
  description: `Delete a preset alert by its ID.`,
  tags: { destructive: true, readOnly: false }
})
  .input(
    z.object({
      alertId: z.string().describe('ID of the preset alert to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the alert was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ serviceKey: ctx.auth.token });
    await client.deletePresetAlert(ctx.input.alertId);

    return {
      output: { deleted: true },
      message: `Deleted preset alert **${ctx.input.alertId}**.`
    };
  })
  .build();
