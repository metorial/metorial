import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  type ApiResource,
  nextUrlSchema,
  notificationBody,
  notificationsSchema,
  type ResourceResponse,
  requireFields,
  teamNameSchema
} from '../lib/api';
import { TelemetryClient } from '../lib/telemetry-client';
import { spec } from '../spec';

let alertSchema = z.object({
  alertId: z.string().describe('Alert ID'),
  name: z.string().nullable().describe('Alert name'),
  alertType: z
    .string()
    .nullable()
    .describe('Provider alert type: threshold, relative or anomaly_rrcf'),
  enabled: z.boolean().nullable().describe('Whether the alert is enabled'),
  sourceId: z.string().nullable().describe('Source ID'),
  dashboardId: z.string().optional().describe('Containing dashboard ID, when applicable'),
  chartId: z.string().optional().describe('Containing dashboard chart ID, when applicable'),
  explorationId: z.string().optional().describe('Containing exploration ID, when applicable'),
  query: z.string().nullable().describe('Alert query'),
  threshold: z.number().nullable().describe('Alert threshold value'),
  operator: z.string().optional().describe('Condition comparison operator'),
  checkPeriodSeconds: z.number().optional().describe('Evaluation frequency in seconds'),
  paused: z.boolean().optional().describe('Whether evaluation is paused'),
  confirmationPeriodSeconds: z.number().nullable().describe('Confirmation period in seconds'),
  recoveryPeriodSeconds: z.number().nullable().describe('Recovery period in seconds'),
  createdAt: z.string().nullable().describe('Creation timestamp'),
  updatedAt: z.string().nullable().describe('Last update timestamp')
});

export let manageAlert = SlateTool.create(spec, {
  name: 'Manage Alert',
  key: 'manage_alert',
  description: `List, get, create, update, or delete telemetry alerts. Create an alert on an existing compatible dashboard chart or exploration. Enabled alerts evaluate data and can create incidents and notify people; create with enabled false to keep evaluation paused.`,
  tags: { readOnly: false, destructive: true },
  instructions: [
    'Use action "list" to list all telemetry alerts.',
    'Use action "get" to retrieve a specific alert.',
    'For create, provide name and alertType plus explorationId, or both dashboardId and chartId. Threshold and relative alerts also need operator, checkPeriodSeconds and threshold or stringValue.',
    'Use action "update" to modify an existing alert.',
    'Use action "delete" to remove an alert.'
  ]
})
  .input(
    z.object({
      teamName: teamNameSchema,
      ...notificationsSchema.omit({ teamWait: true }).shape,
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      alertId: z.string().optional().describe('Alert ID (required for get, update, delete)'),
      name: z.string().optional().describe('Alert name'),
      alertType: z
        .string()
        .optional()
        .describe(
          'Create-only type: threshold, relative, anomaly_rrcf; anomaly is accepted as an alias'
        ),
      dashboardId: z
        .string()
        .optional()
        .describe('Dashboard containing the chart for creation; use list_dashboards'),
      chartId: z
        .string()
        .optional()
        .describe('Compatible chart ID returned by list_dashboards with dashboardId'),
      explorationId: z
        .string()
        .optional()
        .describe('Existing exploration ID for creation, instead of dashboardId and chartId'),
      sourceId: z
        .string()
        .optional()
        .describe(
          'Legacy field unsupported by the current alert API; select the source on the chart or exploration'
        ),
      query: z
        .string()
        .optional()
        .describe(
          'Legacy field unsupported by the current alert API; edit the query on the chart or exploration'
        ),
      threshold: z.number().optional().describe('Threshold value for the alert'),
      operator: z
        .string()
        .optional()
        .describe(
          'Threshold: equal, not_equal, higher_than, higher_than_or_equal, lower_than, lower_than_or_equal. Relative: increases_by, decreases_by, changes_by'
        ),
      stringValue: z
        .string()
        .optional()
        .describe(
          'Exact string condition for threshold alerts with equal or not_equal, instead of threshold'
        ),
      checkPeriodSeconds: z
        .number()
        .optional()
        .describe(
          'Evaluation frequency in seconds, required for threshold and relative creation'
        ),
      anomalySensitivity: z
        .number()
        .optional()
        .describe('Anomaly deviation sensitivity from 1 to 10'),
      enabled: z.boolean().optional().describe('Enable/disable the alert'),
      confirmationPeriodSeconds: z
        .number()
        .optional()
        .describe('Time to wait before confirming alert'),
      recoveryPeriodSeconds: z.number().optional().describe('Time to wait before recovering'),
      policyId: z.string().optional().describe('Escalation policy ID'),
      nextUrl: nextUrlSchema,
      page: z.number().optional().describe('Page number for list action'),
      perPage: z.number().optional().describe('Results per page for list action')
    })
  )
  .output(
    z.object({
      alerts: z.array(alertSchema).optional().describe('List of alerts'),
      alert: alertSchema.optional().describe('Single alert'),
      nextUrl: z.string().optional().describe('Next-page URL, when available'),
      hasMore: z.boolean().optional().describe('Whether more results are available'),
      deleted: z.boolean().optional().describe('Whether the alert was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelemetryClient({
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType,
      teamName: ctx.input.teamName ?? ctx.config.teamName
    });

    let { action, alertId } = ctx.input;

    let mapAlert = (item: ApiResource) => {
      let attrs = item.attributes;
      return {
        alertId: String(item.id),
        name: attrs.name || null,
        alertType: attrs.alert_type || null,
        enabled: attrs.paused == null ? (attrs.enabled ?? null) : !attrs.paused,
        sourceId: attrs.source_id ? String(attrs.source_id) : null,
        dashboardId: attrs.dashboard_id == null ? undefined : String(attrs.dashboard_id),
        chartId: attrs.chart_id == null ? undefined : String(attrs.chart_id),
        explorationId: attrs.exploration_id == null ? undefined : String(attrs.exploration_id),
        query: attrs.query || null,
        threshold: attrs.value ?? attrs.threshold ?? null,
        operator: attrs.operator ?? undefined,
        checkPeriodSeconds: attrs.check_period ?? undefined,
        paused: attrs.paused ?? undefined,
        confirmationPeriodSeconds: attrs.confirmation_period ?? null,
        recoveryPeriodSeconds: attrs.recovery_period ?? null,
        createdAt: attrs.created_at || null,
        updatedAt: attrs.updated_at || null
      };
    };

    if (action === 'list') {
      let result = await client.listAlerts({
        nextUrl: ctx.input.nextUrl,
        page: ctx.input.page,
        perPage: ctx.input.perPage
      });
      let alerts = (result.data || []).map(mapAlert);
      return {
        output: {
          alerts,
          hasMore: !!result.pagination?.next,
          nextUrl: result.pagination?.next ?? undefined
        },
        message: `Found **${alerts.length}** alert(s).`
      };
    }

    if (action === 'get') {
      if (!alertId) throw createApiServiceError('alertId is required for get action');
      let result = await client.getAlert(alertId);
      return {
        output: { alert: mapAlert(result.data || result) },
        message: `Alert retrieved.`
      };
    }

    if (action === 'delete') {
      if (!alertId) throw createApiServiceError('alertId is required for delete action');
      await client.deleteAlert(alertId);
      return {
        output: { deleted: true },
        message: `Alert **${alertId}** deleted.`
      };
    }

    let body: Record<string, unknown> = notificationBody(ctx.input);
    if (ctx.input.sourceId !== undefined || ctx.input.query !== undefined)
      throw createApiServiceError(
        'sourceId and query are not alert request fields. Select the source and query on the existing chart or exploration.'
      );
    if (ctx.input.name) body.name = ctx.input.name;
    const alertType = ctx.input.alertType === 'anomaly' ? 'anomaly_rrcf' : ctx.input.alertType;
    if (alertType !== undefined) {
      if (!['threshold', 'relative', 'anomaly_rrcf'].includes(alertType))
        throw createApiServiceError(
          'alertType must be threshold, relative, anomaly_rrcf or anomaly.'
        );
      if (action === 'update')
        throw createApiServiceError(
          'Alert type cannot be changed after creation. Omit alertType when updating.'
        );
      body.alert_type = alertType;
    }
    if (ctx.input.threshold !== undefined) body.value = ctx.input.threshold;
    if (ctx.input.stringValue !== undefined) body.string_value = ctx.input.stringValue;
    if (ctx.input.operator !== undefined) body.operator = ctx.input.operator;
    if (ctx.input.checkPeriodSeconds !== undefined) {
      if (!Number.isInteger(ctx.input.checkPeriodSeconds) || ctx.input.checkPeriodSeconds <= 0)
        throw createApiServiceError('checkPeriodSeconds must be a positive integer.');
      body.check_period = ctx.input.checkPeriodSeconds;
    }
    if (ctx.input.anomalySensitivity !== undefined) {
      if (ctx.input.anomalySensitivity < 1 || ctx.input.anomalySensitivity > 10)
        throw createApiServiceError('anomalySensitivity must be between 1 and 10.');
      body.anomaly_sensitivity = ctx.input.anomalySensitivity;
    }
    if (ctx.input.enabled !== undefined) body.paused = !ctx.input.enabled;
    if (ctx.input.confirmationPeriodSeconds !== undefined)
      body.confirmation_period = ctx.input.confirmationPeriodSeconds;
    if (ctx.input.recoveryPeriodSeconds !== undefined)
      body.recovery_period = ctx.input.recoveryPeriodSeconds;
    if (ctx.input.policyId !== undefined) {
      const policyId = Number(ctx.input.policyId);
      if (!Number.isSafeInteger(policyId) || policyId <= 0)
        throw createApiServiceError('policyId must identify a numeric escalation policy.');
      body.escalation_target = { policy_id: policyId };
    }

    let result: ResourceResponse;
    if (action === 'create') {
      requireFields(ctx.input.name, alertType);
      if (alertType === 'threshold' || alertType === 'relative') {
        requireFields(ctx.input.operator, ctx.input.checkPeriodSeconds);
        const operators =
          alertType === 'threshold'
            ? [
                'equal',
                'not_equal',
                'higher_than',
                'higher_than_or_equal',
                'lower_than',
                'lower_than_or_equal'
              ]
            : ['increases_by', 'decreases_by', 'changes_by'];
        if (!operators.includes(ctx.input.operator ?? ''))
          throw createApiServiceError(
            `Select an operator documented for ${alertType} alerts.`
          );
        if (ctx.input.threshold === undefined && ctx.input.stringValue === undefined)
          throw createApiServiceError('Provide threshold or stringValue for this alert type.');
      }
      if (
        ctx.input.stringValue !== undefined &&
        (alertType !== 'threshold' ||
          !['equal', 'not_equal'].includes(ctx.input.operator ?? '') ||
          ctx.input.threshold !== undefined)
      )
        throw createApiServiceError(
          'stringValue requires a threshold alert with equal or not_equal; omit threshold.'
        );
      if (
        alertType === 'anomaly_rrcf' &&
        [ctx.input.threshold, ctx.input.operator, ctx.input.checkPeriodSeconds].some(
          value => value !== undefined
        )
      )
        throw createApiServiceError(
          'Anomaly alerts do not accept threshold, operator or checkPeriodSeconds.'
        );
      if (ctx.input.anomalySensitivity !== undefined && alertType !== 'anomaly_rrcf')
        throw createApiServiceError('anomalySensitivity applies only to anomaly alerts.');
      result = await client.createAlert(body, {
        dashboardId: ctx.input.dashboardId,
        chartId: ctx.input.chartId,
        explorationId: ctx.input.explorationId
      });
    } else {
      if (!alertId) throw createApiServiceError('alertId is required for update action');
      result = await client.updateAlert(alertId, body);
    }

    let alert = mapAlert(result.data || result);
    return {
      output: { alert },
      message: `Alert **${alert.name || alert.alertId}** ${action === 'create' ? 'created' : 'updated'}.`
    };
  })
  .build();
