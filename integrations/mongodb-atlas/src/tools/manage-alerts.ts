import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { invalidAction, requireString, resolveProjectId } from '../lib/validation';
import { spec } from '../spec';

let notificationSchema = z.object({
  typeName: z
    .string()
    .describe(
      'Notification type (e.g., WEBHOOK, EMAIL, SLACK, PAGER_DUTY, OPS_GENIE, DATADOG, MICROSOFT_TEAMS, GROUP, USER, ORG)'
    ),
  delayMin: z.number().optional().describe('Delay in minutes before sending'),
  intervalMin: z.number().optional().describe('Interval in minutes between notifications'),
  emailAddress: z.string().optional().describe('Email address for EMAIL type'),
  emailEnabled: z.boolean().optional(),
  smsEnabled: z.boolean().optional(),
  username: z.string().optional().describe('Atlas username for USER type'),
  teamId: z.string().optional().describe('Team ID for TEAM type'),
  webhookUrl: z.string().optional().describe('Webhook URL'),
  webhookSecret: z.string().optional().describe('Webhook secret'),
  datadogApiKey: z.string().optional(),
  datadogRegion: z.string().optional(),
  opsGenieApiKey: z.string().optional(),
  opsGenieRegion: z.string().optional(),
  serviceKey: z.string().optional().describe('PagerDuty service key'),
  microsoftTeamsWebhookUrl: z.string().optional(),
  channelName: z.string().optional().describe('Slack channel name'),
  apiToken: z.string().optional().describe('Slack API token')
});

let matcherSchema = z.object({
  fieldName: z
    .string()
    .describe('Field to match (e.g., CLUSTER_NAME, HOSTNAME, REPLICA_SET_NAME)'),
  operator: z.string().describe('Comparison operator (EQUALS, NOT_EQUALS, CONTAINS, etc.)'),
  value: z.string().describe('Value to match against')
});

let metricThresholdSchema = z.object({
  metricName: z
    .string()
    .describe(
      'Metric name (e.g., NORMALIZED_SYSTEM_CPU_USER, SYSTEM_MEMORY_PERCENT_USED, CONNECTIONS, OPCOUNTER_CMD)'
    ),
  operator: z.enum(['GREATER_THAN', 'LESS_THAN']).describe('Comparison operator'),
  threshold: z.number().describe('Threshold value'),
  units: z.string().optional().describe('Units for the threshold'),
  mode: z.enum(['AVERAGE', 'MAX']).optional().describe('Mode for evaluation')
});

let thresholdSchema = z.object({
  operator: z.enum(['GREATER_THAN', 'LESS_THAN']).optional(),
  threshold: z.number().optional(),
  units: z.string().optional()
});

export let manageAlertsTool = SlateTool.create(spec, {
  name: 'Manage Alerts',
  key: 'manage_alerts',
  description: `Create, update, list, or delete alert configurations in a MongoDB Atlas project. Configure metric-based alerts (CPU, memory, disk, connections) and event-based alerts (host down, failover). Set up notification channels including webhooks, email, Slack, PagerDuty, Datadog, OpsGenie, and Microsoft Teams.

Also allows viewing and acknowledging active alerts.`,
  instructions: [
    'Common event types: HOST, CLUSTER, REPLICATION, CPS_BACKUP, OUTSIDE_METRIC_THRESHOLD.',
    'For metric alerts, use eventTypeName "OUTSIDE_METRIC_THRESHOLD" with a metricThreshold.',
    'To acknowledge an alert, use action "acknowledge" with alertId.'
  ]
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Atlas Project ID. Uses config projectId if not provided.'),
      action: z
        .enum([
          'list_configs',
          'get_config',
          'create_config',
          'update_config',
          'delete_config',
          'list_alerts',
          'get_alert',
          'acknowledge'
        ])
        .describe('Action to perform'),
      alertConfigId: z
        .string()
        .optional()
        .describe('Alert configuration ID (for get/update/delete config)'),
      alertId: z.string().optional().describe('Alert ID (for get/acknowledge alert)'),
      enabled: z.boolean().optional().describe('Enable or disable the alert config'),
      eventTypeName: z.string().optional().describe('Event type that triggers the alert'),
      metricThreshold: metricThresholdSchema
        .optional()
        .describe('Metric threshold for metric-based alerts'),
      threshold: thresholdSchema.optional().describe('Threshold for event-based alerts'),
      notifications: z.array(notificationSchema).optional().describe('Notification channels'),
      matchers: z
        .array(matcherSchema)
        .optional()
        .describe('Conditions to filter which resources trigger the alert'),
      acknowledgedUntil: z
        .string()
        .optional()
        .describe('ISO 8601 date until which the alert is acknowledged'),
      acknowledgementComment: z
        .string()
        .optional()
        .describe('Comment for acknowledging the alert'),
      alertStatus: z
        .string()
        .optional()
        .describe('Filter alerts by status (OPEN, TRACKING, CLOSED)')
    })
  )
  .output(
    z.object({
      alertConfig: z.any().optional(),
      alertConfigs: z.array(z.any()).optional(),
      alert: z.any().optional(),
      alerts: z.array(z.any()).optional(),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let projectId = resolveProjectId(ctx.input.projectId, ctx.config.projectId);

    let { action } = ctx.input;

    if (action === 'list_configs') {
      let result = await client.listAlertConfigurations(projectId);
      let configs = result.results || [];
      return {
        output: { alertConfigs: configs, totalCount: result.totalCount || configs.length },
        message: `Found **${configs.length}** alert configuration(s).`
      };
    }

    if (action === 'get_config') {
      let alertConfigId = requireString(ctx.input.alertConfigId, 'alertConfigId');
      let config = await client.getAlertConfiguration(projectId, alertConfigId);
      return {
        output: { alertConfig: config },
        message: `Retrieved alert config **${alertConfigId}**.`
      };
    }

    if (action === 'create_config') {
      let data: any = {
        eventTypeName: ctx.input.eventTypeName,
        enabled: ctx.input.enabled !== undefined ? ctx.input.enabled : true,
        notifications: ctx.input.notifications || []
      };
      if (ctx.input.metricThreshold) data.metricThreshold = ctx.input.metricThreshold;
      if (ctx.input.threshold) data.threshold = ctx.input.threshold;
      if (ctx.input.matchers) data.matchers = ctx.input.matchers;

      let config = await client.createAlertConfiguration(projectId, data);
      return {
        output: { alertConfig: config },
        message: `Created alert config for event type **${ctx.input.eventTypeName}**.`
      };
    }

    if (action === 'update_config') {
      let alertConfigId = requireString(ctx.input.alertConfigId, 'alertConfigId');
      let data: any = {};
      if (ctx.input.enabled !== undefined) data.enabled = ctx.input.enabled;
      if (ctx.input.eventTypeName) data.eventTypeName = ctx.input.eventTypeName;
      if (ctx.input.metricThreshold) data.metricThreshold = ctx.input.metricThreshold;
      if (ctx.input.threshold) data.threshold = ctx.input.threshold;
      if (ctx.input.notifications) data.notifications = ctx.input.notifications;
      if (ctx.input.matchers) data.matchers = ctx.input.matchers;

      let config = await client.updateAlertConfiguration(projectId, alertConfigId, data);
      return {
        output: { alertConfig: config },
        message: `Updated alert config **${alertConfigId}**.`
      };
    }

    if (action === 'delete_config') {
      let alertConfigId = requireString(ctx.input.alertConfigId, 'alertConfigId');
      await client.deleteAlertConfiguration(projectId, alertConfigId);
      return {
        output: {},
        message: `Deleted alert config **${alertConfigId}**.`
      };
    }

    if (action === 'list_alerts') {
      let result = await client.listAlerts(projectId, {
        status: ctx.input.alertStatus
      });
      let alerts = result.results || [];
      return {
        output: { alerts, totalCount: result.totalCount || alerts.length },
        message: `Found **${alerts.length}** alert(s).`
      };
    }

    if (action === 'get_alert') {
      let alertId = requireString(ctx.input.alertId, 'alertId');
      let alert = await client.getAlert(projectId, alertId);
      return {
        output: { alert },
        message: `Retrieved alert **${alertId}** (status: ${alert.status}).`
      };
    }

    if (action === 'acknowledge') {
      let alertId = requireString(ctx.input.alertId, 'alertId');
      let acknowledgedUntil = requireString(ctx.input.acknowledgedUntil, 'acknowledgedUntil');
      let alert = await client.acknowledgeAlert(projectId, alertId, {
        acknowledgedUntil,
        acknowledgementComment: ctx.input.acknowledgementComment
      });
      return {
        output: { alert },
        message: `Acknowledged alert **${alertId}** until ${acknowledgedUntil}.`
      };
    }

    return invalidAction(action);
  })
  .build();
