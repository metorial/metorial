import { SlateTool } from 'slates';
import { z } from 'zod';
import { MezmoClient, type PresetAlertRequest } from '../lib/client';
import { channelSchema } from '../lib/schemas';
import { spec } from '../spec';

let alertOutputSchema = z.object({
  presetAlertId: z.string().min(1).describe('Unique preset alert identifier'),
  name: z.string().min(1).describe('Alert name'),
  channels: z
    .array(
      z.object({
        integration: z.string().describe('Channel type'),
        url: z.string().optional().describe('Webhook URL'),
        emails: z.unknown().optional().describe('Email addresses'),
        key: z
          .string()
          .optional()
          .describe('Legacy field; integration credentials are not returned'),
        triggerlimit: z.number().optional().describe('Trigger limit'),
        triggerinterval: z.unknown().optional().describe('Trigger interval'),
        operator: z.string().optional().describe('Alert operator')
      })
    )
    .describe('Configured alert channels')
});

export let listPresetAlerts = SlateTool.create(spec, {
  name: 'List Preset Alerts',
  key: 'list_preset_alerts',
  description: `List all preset alerts configured in the Mezmo account. Preset alerts are reusable alert configurations that can be attached to multiple views.`,
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({}))
  .output(
    z.object({
      returnedCount: z.number().describe('Number of items returned'),
      alerts: z.array(alertOutputSchema).describe('List of preset alerts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });
    let alerts = await client.listPresetAlerts();

    let mapped = alerts.map(a => ({
      presetAlertId: a.presetid,
      name: a.name,
      channels: a.channels.map(c => ({
        integration: c.integration,
        url: c.url,
        emails: c.emails,
        triggerlimit: c.triggerlimit,
        triggerinterval: c.triggerinterval,
        operator: c.operator
      }))
    }));

    return {
      output: { alerts: mapped, returnedCount: mapped.length },
      message: `Found **${mapped.length}** preset alert(s).`
    };
  })
  .build();

export let createPresetAlert = SlateTool.create(spec, {
  name: 'Create Preset Alert',
  key: 'create_preset_alert',
  description: `Create a reusable preset alert that can be attached to multiple views. Supports email, webhook, PagerDuty, and Slack notification channels.`,
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      name: z.string().min(1).describe('Name of the preset alert'),
      channels: z.array(channelSchema).min(1).describe('Alert notification channels')
    })
  )
  .output(alertOutputSchema)
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });

    let result = await client.createPresetAlert({
      name: ctx.input.name,
      channels: ctx.input.channels
    });

    return {
      output: {
        presetAlertId: result.presetid,
        name: result.name,
        channels: result.channels.map(c => ({
          integration: c.integration,
          url: c.url,
          emails: c.emails,
          triggerlimit: c.triggerlimit,
          triggerinterval: c.triggerinterval,
          operator: c.operator
        }))
      },
      message: `Created preset alert **${result.name}** with ID \`${result.presetid}\`.`
    };
  })
  .build();

export let updatePresetAlert = SlateTool.create(spec, {
  name: 'Update Preset Alert',
  key: 'update_preset_alert',
  description: `Update an existing preset alert's name or notification channels.`,
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      presetAlertId: z.string().min(1).describe('ID of the preset alert to update'),
      name: z.string().min(1).optional().describe('New name for the alert'),
      channels: z.array(channelSchema).optional().describe('Updated alert channels')
    })
  )
  .output(alertOutputSchema)
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });

    let params: Partial<PresetAlertRequest> = {};
    if (ctx.input.name !== undefined) params.name = ctx.input.name;
    if (ctx.input.channels) params.channels = ctx.input.channels;

    let result = await client.updatePresetAlert(ctx.input.presetAlertId, params);

    return {
      output: {
        presetAlertId: result.presetid,
        name: result.name,
        channels: result.channels.map(c => ({
          integration: c.integration,
          url: c.url,
          emails: c.emails,
          triggerlimit: c.triggerlimit,
          triggerinterval: c.triggerinterval,
          operator: c.operator
        }))
      },
      message: `Updated preset alert **${result.name}** (\`${result.presetid}\`).`
    };
  })
  .build();

export let deletePresetAlert = SlateTool.create(spec, {
  name: 'Delete Preset Alert',
  key: 'delete_preset_alert',
  description: `Delete a preset alert. This will also detach it from any views it is attached to.`,
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      presetAlertId: z.string().min(1).describe('ID of the preset alert to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the alert was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MezmoClient({ token: ctx.auth.token });
    await client.deletePresetAlert(ctx.input.presetAlertId);

    return {
      output: { deleted: true },
      message: `Deleted preset alert \`${ctx.input.presetAlertId}\`.`
    };
  })
  .build();
