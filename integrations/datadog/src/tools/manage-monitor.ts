import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let monitorOptionsSchema = z
  .object({
    thresholds: z
      .object({
        critical: z.number().optional(),
        warning: z.number().optional(),
        ok: z.number().optional(),
        criticalRecovery: z.number().optional(),
        warningRecovery: z.number().optional()
      })
      .optional()
      .describe('Alert threshold values'),
    notifyNoData: z.boolean().optional().describe('Whether to notify on no data'),
    noDataTimeframe: z.number().optional().describe('Minutes before notifying on no data'),
    renotifyInterval: z.number().optional().describe('Minutes between re-notification'),
    escalationMessage: z.string().optional().describe('Message for escalations'),
    includeTags: z
      .boolean()
      .optional()
      .describe('Include triggering tags in notification title'),
    requireFullWindow: z
      .boolean()
      .optional()
      .describe('Require a full window of data for evaluation'),
    evaluationDelay: z.number().optional().describe('Delay in seconds before evaluating')
  })
  .optional()
  .describe('Monitor configuration options');

export let manageMonitor = SlateTool.create(spec, {
  name: 'Manage Monitor',
  key: 'manage_monitor',
  description: `Create or update a Datadog monitor. Monitors evaluate queries and trigger alerts based on threshold conditions.
Supports metric alerts, log alerts, anomaly detection, forecast, outlier, APM, and composite monitors.`,
  instructions: [
    'To create a new monitor, omit monitorId and provide name, type, and query.',
    'To update an existing monitor, provide the monitorId along with fields to change.',
    'Common monitor types: "metric alert", "query alert", "service check", "event alert", "log alert", "composite".',
    'The query format depends on the monitor type, e.g. "avg(last_5m):avg:system.cpu.user{*} > 90".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      monitorId: z
        .number()
        .optional()
        .describe('Monitor ID to update. Omit to create a new monitor.'),
      name: z.string().optional().describe('Monitor name (required for creation)'),
      type: z
        .string()
        .optional()
        .describe('Monitor type (required for creation), e.g. "metric alert", "query alert"'),
      query: z.string().optional().describe('Monitor query (required for creation)'),
      message: z
        .string()
        .optional()
        .describe('Notification message, supports @mentions and markdown'),
      tags: z.array(z.string()).optional().describe('Tags for the monitor'),
      priority: z.number().optional().describe('Monitor priority (1-5)'),
      options: monitorOptionsSchema
    })
  )
  .output(
    z.object({
      monitorId: z.number().describe('ID of the monitor'),
      name: z.string().describe('Monitor name'),
      type: z.string().describe('Monitor type'),
      query: z.string().describe('Monitor query'),
      overallState: z.string().optional().describe('Current state of the monitor'),
      message: z.string().optional().describe('Notification message'),
      tags: z.array(z.string()).optional().describe('Monitor tags'),
      created: z.string().optional().describe('Creation timestamp'),
      modified: z.string().optional().describe('Last modification timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let { monitorId, options, ...data } = ctx.input;

    let apiOptions: any;
    if (options) {
      apiOptions = {} as any;
      if (options.thresholds) {
        apiOptions.thresholds = {} as any;
        if (options.thresholds.critical !== undefined)
          apiOptions.thresholds.critical = options.thresholds.critical;
        if (options.thresholds.warning !== undefined)
          apiOptions.thresholds.warning = options.thresholds.warning;
        if (options.thresholds.ok !== undefined)
          apiOptions.thresholds.ok = options.thresholds.ok;
        if (options.thresholds.criticalRecovery !== undefined)
          apiOptions.thresholds.critical_recovery = options.thresholds.criticalRecovery;
        if (options.thresholds.warningRecovery !== undefined)
          apiOptions.thresholds.warning_recovery = options.thresholds.warningRecovery;
      }
      if (options.notifyNoData !== undefined) apiOptions.notify_no_data = options.notifyNoData;
      if (options.noDataTimeframe !== undefined)
        apiOptions.no_data_timeframe = options.noDataTimeframe;
      if (options.renotifyInterval !== undefined)
        apiOptions.renotify_interval = options.renotifyInterval;
      if (options.escalationMessage !== undefined)
        apiOptions.escalation_message = options.escalationMessage;
      if (options.includeTags !== undefined) apiOptions.include_tags = options.includeTags;
      if (options.requireFullWindow !== undefined)
        apiOptions.require_full_window = options.requireFullWindow;
      if (options.evaluationDelay !== undefined)
        apiOptions.evaluation_delay = options.evaluationDelay;
    }

    let monitor: any;
    let isCreating = !monitorId;

    if (monitorId) {
      monitor = await client.updateMonitor(monitorId, {
        ...data,
        options: apiOptions
      });
    } else {
      if (!data.name || !data.type || !data.query) {
        throw new Error('name, type, and query are required when creating a new monitor.');
      }
      monitor = await client.createMonitor({
        name: data.name,
        type: data.type,
        query: data.query,
        message: data.message,
        tags: data.tags,
        priority: data.priority,
        options: apiOptions
      });
    }

    return {
      output: {
        monitorId: monitor.id,
        name: monitor.name,
        type: monitor.type,
        query: monitor.query,
        overallState: monitor.overall_state,
        message: monitor.message,
        tags: monitor.tags,
        created: monitor.created,
        modified: monitor.modified
      },
      message: isCreating
        ? `Created monitor **${monitor.name}** (ID: ${monitor.id})`
        : `Updated monitor **${monitor.name}** (ID: ${monitor.id})`
    };
  })
  .build();
