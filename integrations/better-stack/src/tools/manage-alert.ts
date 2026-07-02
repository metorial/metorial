import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelemetryClient } from '../lib/telemetry-client';
import { spec } from '../spec';

let alertSchema = z.object({
  alertId: z.string().describe('Alert ID'),
  name: z.string().nullable().describe('Alert name'),
  alertType: z.string().nullable().describe('Alert type (threshold, relative, anomaly)'),
  enabled: z.boolean().nullable().describe('Whether the alert is enabled'),
  sourceId: z.string().nullable().describe('Source ID'),
  query: z.string().nullable().describe('Alert query'),
  threshold: z.number().nullable().describe('Alert threshold value'),
  confirmationPeriodSeconds: z.number().nullable().describe('Confirmation period in seconds'),
  recoveryPeriodSeconds: z.number().nullable().describe('Recovery period in seconds'),
  createdAt: z.string().nullable().describe('Creation timestamp'),
  updatedAt: z.string().nullable().describe('Last update timestamp')
});

export let manageAlert = SlateTool.create(spec, {
  name: 'Manage Alert',
  key: 'manage_alert',
  description: `List, get, create, update, or delete telemetry alerts. Supports threshold alerts, relative alerts, and anomaly detection alerts with configurable confirmation and recovery periods.`,
  instructions: [
    'Use action "list" to list all telemetry alerts.',
    'Use action "get" to retrieve a specific alert.',
    'Use action "create" to create a new alert.',
    'Use action "update" to modify an existing alert.',
    'Use action "delete" to remove an alert.'
  ]
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      alertId: z.string().optional().describe('Alert ID (required for get, update, delete)'),
      name: z.string().optional().describe('Alert name'),
      alertType: z.string().optional().describe('Alert type: threshold, relative, anomaly'),
      sourceId: z.string().optional().describe('Source ID to associate the alert with'),
      query: z.string().optional().describe('Alert query expression'),
      threshold: z.number().optional().describe('Threshold value for the alert'),
      enabled: z.boolean().optional().describe('Enable/disable the alert'),
      confirmationPeriodSeconds: z
        .number()
        .optional()
        .describe('Time to wait before confirming alert'),
      recoveryPeriodSeconds: z.number().optional().describe('Time to wait before recovering'),
      policyId: z.string().optional().describe('Escalation policy ID'),
      page: z.number().optional().describe('Page number for list action'),
      perPage: z.number().optional().describe('Results per page for list action')
    })
  )
  .output(
    z.object({
      alerts: z.array(alertSchema).optional().describe('List of alerts'),
      alert: alertSchema.optional().describe('Single alert'),
      hasMore: z.boolean().optional().describe('Whether more results are available'),
      deleted: z.boolean().optional().describe('Whether the alert was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelemetryClient({
      token: ctx.auth.token,
      teamName: ctx.config.teamName
    });

    let { action, alertId } = ctx.input;

    let mapAlert = (item: any) => {
      let attrs = item.attributes || item;
      return {
        alertId: String(item.id),
        name: attrs.name || null,
        alertType: attrs.alert_type || null,
        enabled: attrs.enabled ?? null,
        sourceId: attrs.source_id ? String(attrs.source_id) : null,
        query: attrs.query || null,
        threshold: attrs.threshold ?? null,
        confirmationPeriodSeconds: attrs.confirmation_period ?? null,
        recoveryPeriodSeconds: attrs.recovery_period ?? null,
        createdAt: attrs.created_at || null,
        updatedAt: attrs.updated_at || null
      };
    };

    if (action === 'list') {
      let result = await client.listAlerts({
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let alerts = (result.data || []).map(mapAlert);
      return {
        output: { alerts, hasMore: !!result.pagination?.next },
        message: `Found **${alerts.length}** alert(s).`
      };
    }

    if (action === 'get') {
      if (!alertId) throw new Error('alertId is required for get action');
      let result = await client.getAlert(alertId);
      return {
        output: { alert: mapAlert(result.data || result) },
        message: `Alert retrieved.`
      };
    }

    if (action === 'delete') {
      if (!alertId) throw new Error('alertId is required for delete action');
      await client.deleteAlert(alertId);
      return {
        output: { deleted: true },
        message: `Alert **${alertId}** deleted.`
      };
    }

    let body: Record<string, any> = {};
    if (ctx.input.name) body.name = ctx.input.name;
    if (ctx.input.alertType) body.alert_type = ctx.input.alertType;
    if (ctx.input.sourceId) body.source_id = ctx.input.sourceId;
    if (ctx.input.query) body.query = ctx.input.query;
    if (ctx.input.threshold !== undefined) body.threshold = ctx.input.threshold;
    if (ctx.input.enabled !== undefined) body.enabled = ctx.input.enabled;
    if (ctx.input.confirmationPeriodSeconds !== undefined)
      body.confirmation_period = ctx.input.confirmationPeriodSeconds;
    if (ctx.input.recoveryPeriodSeconds !== undefined)
      body.recovery_period = ctx.input.recoveryPeriodSeconds;
    if (ctx.input.policyId) body.policy_id = ctx.input.policyId;

    let result: any;
    if (action === 'create') {
      result = await client.createAlert(body);
    } else {
      if (!alertId) throw new Error('alertId is required for update action');
      result = await client.updateAlert(alertId, body);
    }

    let alert = mapAlert(result.data || result);
    return {
      output: { alert },
      message: `Alert **${alert.name || alert.alertId}** ${action === 'create' ? 'created' : 'updated'}.`
    };
  })
  .build();
