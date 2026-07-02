import { SlateTool } from 'slates';
import { z } from 'zod';
import { AtlasClient } from '../lib/client';
import { mongodbServiceError } from '../lib/errors';
import { spec } from '../spec';

let notificationSchema = z
  .object({
    typeName: z
      .string()
      .describe(
        'Notification type (e.g., WEBHOOK, EMAIL, SLACK, PAGER_DUTY, OPS_GENIE, DATADOG)'
      ),
    intervalMin: z.number().optional().describe('Interval in minutes between notifications'),
    delayMin: z.number().optional().describe('Delay in minutes before first notification'),
    emailEnabled: z.boolean().optional().describe('Whether email is enabled'),
    smsEnabled: z.boolean().optional().describe('Whether SMS is enabled'),
    emailAddress: z.string().optional().describe('Email address for notifications'),
    webhookUrl: z.string().optional().describe('Webhook URL for notifications'),
    webhookSecret: z.string().optional().describe('Webhook secret'),
    channelName: z.string().optional().describe('Slack channel name'),
    serviceKey: z.string().optional().describe('PagerDuty/Opsgenie service key'),
    apiToken: z.string().optional().describe('API token for integration'),
    datadogApiKey: z.string().optional().describe('Datadog API key'),
    datadogRegion: z.string().optional().describe('Datadog region')
  })
  .describe('Notification channel configuration');

let matcherSchema = z
  .object({
    fieldName: z
      .string()
      .describe('Field to match (e.g., CLUSTER_NAME, REPLICA_SET_NAME, HOSTNAME_AND_PORT)'),
    operator: z.string().describe('Comparison operator (EQUALS, NOT_EQUALS, CONTAINS, etc.)'),
    value: z.string().describe('Value to compare against')
  })
  .describe('Matcher to filter which resources trigger the alert');

let metricThresholdSchema = z
  .object({
    metricName: z
      .string()
      .describe(
        'Name of the metric (e.g., CONNECTIONS, OPCOUNTER_CMD, DISK_PARTITION_SPACE_FREE)'
      ),
    operator: z.string().describe('Comparison operator (GREATER_THAN, LESS_THAN)'),
    threshold: z.number().describe('Threshold value'),
    units: z
      .string()
      .optional()
      .describe('Units for the threshold (e.g., RAW, BITS, BYTES, GIGABYTES)'),
    mode: z.string().optional().describe('Mode for threshold (AVERAGE, TOTAL)')
  })
  .describe('Metric threshold configuration');

let thresholdSchema = z
  .object({
    operator: z.string().optional().describe('Comparison operator'),
    threshold: z.number().optional().describe('Threshold value'),
    units: z.string().optional().describe('Units for the threshold')
  })
  .describe('Generic threshold configuration');

let alertConfigSchema = z.object({
  alertConfigId: z.string().describe('Unique identifier of the alert configuration'),
  eventTypeName: z
    .string()
    .describe(
      'Event type (e.g., OUTSIDE_METRIC_THRESHOLD, HOST_DOWN, REPLICATION_OPLOG_WINDOW_RUNNING_OUT)'
    ),
  enabled: z.boolean().describe('Whether the alert configuration is enabled'),
  created: z.string().optional().describe('ISO 8601 creation timestamp'),
  updated: z.string().optional().describe('ISO 8601 last update timestamp'),
  notifications: z.array(notificationSchema).optional().describe('Notification channels'),
  matchers: z.array(matcherSchema).optional().describe('Resource matchers'),
  metricThreshold: metricThresholdSchema
    .optional()
    .describe('Metric threshold (for metric-based alerts)'),
  threshold: thresholdSchema.optional().describe('Generic threshold')
});

export let manageAlertConfigurationsTool = SlateTool.create(spec, {
  name: 'Manage Alert Configurations',
  key: 'manage_alert_configurations',
  description: `List, create, update, or delete alert configurations for a MongoDB Atlas project. Alert configurations define what conditions trigger alerts and how notifications are sent (webhook, email, Slack, PagerDuty, etc.).`,
  instructions: [
    'Use eventTypeName "OUTSIDE_METRIC_THRESHOLD" for metric-based alerts, with a metricThreshold.',
    'Use matchers to target specific clusters or replica sets.',
    'Each alert configuration can have multiple notification channels.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      projectId: z
        .string()
        .optional()
        .describe('Project ID. Falls back to configured projectId.'),
      alertConfigId: z
        .string()
        .optional()
        .describe('Alert configuration ID (for get, update, delete)'),
      eventTypeName: z.string().optional().describe('Event type (required for create)'),
      enabled: z.boolean().optional().describe('Whether the alert is enabled'),
      notifications: z.array(notificationSchema).optional().describe('Notification channels'),
      matchers: z.array(matcherSchema).optional().describe('Resource matchers'),
      metricThreshold: metricThresholdSchema.optional().describe('Metric threshold'),
      threshold: thresholdSchema.optional().describe('Generic threshold')
    })
  )
  .output(
    z.object({
      alertConfigs: z
        .array(alertConfigSchema)
        .optional()
        .describe('List of alert configurations'),
      alertConfig: alertConfigSchema.optional().describe('Single alert configuration'),
      totalCount: z.number().optional().describe('Total count for list'),
      deleted: z.boolean().optional().describe('Whether the config was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw mongodbServiceError('projectId is required');

    let client = new AtlasClient(ctx.auth);

    let mapConfig = (c: any) => ({
      alertConfigId: c.id,
      eventTypeName: c.eventTypeName,
      enabled: c.enabled ?? true,
      created: c.created,
      updated: c.updated,
      notifications: c.notifications,
      matchers: c.matchers,
      metricThreshold: c.metricThreshold,
      threshold: c.threshold
    });

    if (ctx.input.action === 'list') {
      let result = await client.listAlertConfigurations(projectId);
      let alertConfigs = (result.results || []).map(mapConfig);
      return {
        output: { alertConfigs, totalCount: result.totalCount ?? alertConfigs.length },
        message: `Found **${alertConfigs.length}** alert configuration(s).`
      };
    }

    if (ctx.input.action === 'get') {
      if (!ctx.input.alertConfigId) throw mongodbServiceError('alertConfigId is required');
      let c = await client.getAlertConfiguration(projectId, ctx.input.alertConfigId);
      return {
        output: { alertConfig: mapConfig(c) },
        message: `Alert config **${c.id}**: ${c.eventTypeName} (${c.enabled ? 'enabled' : 'disabled'}).`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.eventTypeName) throw mongodbServiceError('eventTypeName is required');
      let payload: any = {
        eventTypeName: ctx.input.eventTypeName,
        enabled: ctx.input.enabled ?? true
      };
      if (ctx.input.notifications) payload.notifications = ctx.input.notifications;
      if (ctx.input.matchers) payload.matchers = ctx.input.matchers;
      if (ctx.input.metricThreshold) payload.metricThreshold = ctx.input.metricThreshold;
      if (ctx.input.threshold) payload.threshold = ctx.input.threshold;

      let c = await client.createAlertConfiguration(projectId, payload);
      return {
        output: { alertConfig: mapConfig(c) },
        message: `Created alert configuration **${c.id}** for ${c.eventTypeName}.`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.alertConfigId) throw mongodbServiceError('alertConfigId is required');
      let payload: any = {};
      if (ctx.input.eventTypeName) payload.eventTypeName = ctx.input.eventTypeName;
      if (ctx.input.enabled !== undefined) payload.enabled = ctx.input.enabled;
      if (ctx.input.notifications) payload.notifications = ctx.input.notifications;
      if (ctx.input.matchers) payload.matchers = ctx.input.matchers;
      if (ctx.input.metricThreshold) payload.metricThreshold = ctx.input.metricThreshold;
      if (ctx.input.threshold) payload.threshold = ctx.input.threshold;

      let c = await client.updateAlertConfiguration(
        projectId,
        ctx.input.alertConfigId,
        payload
      );
      return {
        output: { alertConfig: mapConfig(c) },
        message: `Updated alert configuration **${c.id}**.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.alertConfigId) throw mongodbServiceError('alertConfigId is required');
      await client.deleteAlertConfiguration(projectId, ctx.input.alertConfigId);
      return {
        output: { deleted: true },
        message: `Deleted alert configuration **${ctx.input.alertConfigId}**.`
      };
    }

    throw mongodbServiceError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
