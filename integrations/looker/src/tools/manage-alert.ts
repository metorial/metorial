import { SlateTool } from 'slates';
import { z } from 'zod';
import { LookerClient } from '../lib/client';
import { spec } from '../spec';

let alertOutputSchema = z.object({
  alertId: z.string().describe('Alert ID'),
  customTitle: z.string().optional().describe('Custom alert title'),
  comparisonType: z
    .string()
    .optional()
    .describe('Comparison type (e.g., "EQUAL_TO", "GREATER_THAN")'),
  threshold: z.number().optional().describe('Alert threshold value'),
  cron: z.string().optional().describe('Cron schedule for alert evaluation'),
  dashboardElementId: z.string().optional().describe('Dashboard element ID being monitored'),
  description: z.string().optional().describe('Alert description'),
  isDisabled: z.boolean().optional().describe('Whether the alert is disabled'),
  isPublic: z.boolean().optional().describe('Whether the alert is public'),
  ownerId: z.string().optional().describe('Alert owner user ID'),
  fieldName: z.string().optional().describe('Monitored field name'),
  fieldTitle: z.string().optional().describe('Monitored field title')
});

export let manageAlert = SlateTool.create(spec, {
  name: 'Manage Alert',
  key: 'manage_alert',
  description: `Get, create, update, delete, or list data-driven alerts on dashboard tiles. Alerts trigger notifications when data meets specified conditions.`,
  instructions: [
    'To list alerts: set action to "list".',
    'To get: set action to "get" with alertId.',
    'To create: set action to "create" with dashboardElementId, comparisonType, threshold, cron, field, and destinations.',
    'To update: set action to "update" with alertId and fields to change.',
    'To delete: set action to "delete" with alertId.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['get', 'list', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      alertId: z.string().optional().describe('Alert ID (required for get, update, delete)'),
      dashboardElementId: z.string().optional().describe('Dashboard element ID to monitor'),
      comparisonType: z
        .string()
        .optional()
        .describe(
          'Comparison type (e.g., "EQUAL_TO", "GREATER_THAN", "GREATER_THAN_OR_EQUAL_TO", "LESS_THAN", "LESS_THAN_OR_EQUAL_TO", "INCREASES_BY", "DECREASES_BY")'
        ),
      threshold: z.number().optional().describe('Threshold value'),
      cron: z.string().optional().describe('Cron schedule for evaluation'),
      customTitle: z.string().optional().describe('Custom alert title'),
      description: z.string().optional().describe('Alert description'),
      fieldTitle: z.string().optional().describe('Title of the field to monitor'),
      fieldName: z.string().optional().describe('Name of the field to monitor'),
      destinations: z
        .array(
          z.object({
            destinationType: z
              .string()
              .describe('Destination type (e.g., "EMAIL", "ACTION_HUB")'),
            emailAddress: z.string().optional().describe('Email address for EMAIL type')
          })
        )
        .optional()
        .describe('Alert notification destinations'),
      isDisabled: z.boolean().optional().describe('Whether the alert is disabled'),
      isPublic: z.boolean().optional().describe('Whether the alert is public')
    })
  )
  .output(
    z.object({
      alert: alertOutputSchema.optional().describe('Alert details'),
      alerts: z.array(alertOutputSchema).optional().describe('List of alerts'),
      count: z.number().optional().describe('Number of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LookerClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let mapAlert = (a: any) => ({
      alertId: String(a.id),
      customTitle: a.custom_title,
      comparisonType: a.comparison_type,
      threshold: a.threshold,
      cron: a.cron,
      dashboardElementId: a.dashboard_element_id ? String(a.dashboard_element_id) : undefined,
      description: a.description,
      isDisabled: a.is_disabled,
      isPublic: a.is_public,
      ownerId: a.owner_id ? String(a.owner_id) : undefined,
      fieldName: a.field?.name,
      fieldTitle: a.field?.title
    });

    switch (ctx.input.action) {
      case 'list': {
        let alerts = await client.listAlerts();
        return {
          output: { alerts: (alerts || []).map(mapAlert), count: alerts.length },
          message: `Found **${alerts.length}** alert(s).`
        };
      }
      case 'get': {
        if (!ctx.input.alertId) throw new Error('alertId is required');
        let alert = await client.getAlert(ctx.input.alertId);
        return {
          output: { alert: mapAlert(alert) },
          message: `Retrieved alert **${alert.custom_title || alert.id}**`
        };
      }
      case 'create': {
        if (!ctx.input.dashboardElementId) throw new Error('dashboardElementId is required');
        if (!ctx.input.comparisonType) throw new Error('comparisonType is required');
        if (ctx.input.threshold === undefined) throw new Error('threshold is required');
        if (!ctx.input.cron) throw new Error('cron is required');
        if (!ctx.input.fieldTitle || !ctx.input.fieldName)
          throw new Error('fieldTitle and fieldName are required');
        if (!ctx.input.destinations || ctx.input.destinations.length === 0)
          throw new Error('At least one destination is required');

        let alert = await client.createAlert({
          comparison_type: ctx.input.comparisonType,
          field: {
            title: ctx.input.fieldTitle,
            name: ctx.input.fieldName
          },
          cron: ctx.input.cron,
          custom_title: ctx.input.customTitle,
          dashboard_element_id: ctx.input.dashboardElementId,
          destinations: ctx.input.destinations.map(d => ({
            destination_type: d.destinationType,
            email_address: d.emailAddress
          })),
          threshold: ctx.input.threshold,
          description: ctx.input.description,
          is_disabled: ctx.input.isDisabled,
          is_public: ctx.input.isPublic
        });
        return {
          output: { alert: mapAlert(alert) },
          message: `Created alert **${alert.custom_title || alert.id}**`
        };
      }
      case 'update': {
        if (!ctx.input.alertId) throw new Error('alertId is required');
        let updateBody: Record<string, any> = {};
        if (ctx.input.comparisonType !== undefined)
          updateBody.comparison_type = ctx.input.comparisonType;
        if (ctx.input.threshold !== undefined) updateBody.threshold = ctx.input.threshold;
        if (ctx.input.cron !== undefined) updateBody.cron = ctx.input.cron;
        if (ctx.input.customTitle !== undefined)
          updateBody.custom_title = ctx.input.customTitle;
        if (ctx.input.description !== undefined)
          updateBody.description = ctx.input.description;
        if (ctx.input.isDisabled !== undefined) updateBody.is_disabled = ctx.input.isDisabled;
        if (ctx.input.isPublic !== undefined) updateBody.is_public = ctx.input.isPublic;
        if (ctx.input.destinations !== undefined) {
          updateBody.destinations = ctx.input.destinations.map(d => ({
            destination_type: d.destinationType,
            email_address: d.emailAddress
          }));
        }
        let alert = await client.updateAlert(ctx.input.alertId, updateBody);
        return {
          output: { alert: mapAlert(alert) },
          message: `Updated alert **${alert.custom_title || alert.id}**`
        };
      }
      case 'delete': {
        if (!ctx.input.alertId) throw new Error('alertId is required');
        let alert = await client.getAlert(ctx.input.alertId);
        await client.deleteAlert(ctx.input.alertId);
        return {
          output: { alert: mapAlert(alert) },
          message: `Deleted alert **${alert.custom_title || alert.id}**`
        };
      }
    }
  })
  .build();
