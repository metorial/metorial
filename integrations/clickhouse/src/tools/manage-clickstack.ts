import { SlateTool } from 'slates';
import { z } from 'zod';
import { ClickHouseClient } from '../lib/client';
import { clickhouseServiceError } from '../lib/errors';
import { spec } from '../spec';

let ensureBodyHasFields = (body: Record<string, any>, label: string) => {
  if (Object.keys(body).length === 0) {
    throw clickhouseServiceError(`Provide at least one ${label} field to update.`);
  }
};

// ── Dashboards ──────────────────────────────────────────

export let listDashboards = SlateTool.create(spec, {
  name: 'List ClickStack Dashboards',
  key: 'list_clickstack_dashboards',
  description: `List all ClickStack observability dashboards for a service. ClickStack is the built-in observability platform for ClickHouse Cloud.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service')
    })
  )
  .output(
    z.object({
      dashboards: z.array(
        z.object({
          dashboardId: z.string(),
          name: z.string().optional(),
          tags: z.array(z.string()).optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let dashboards = await client.listDashboards(ctx.input.serviceId);
    let items = Array.isArray(dashboards) ? dashboards : [];

    return {
      output: {
        dashboards: items.map((d: any) => ({
          dashboardId: d.id,
          name: d.name,
          tags: d.tags
        }))
      },
      message: `Found **${items.length}** ClickStack dashboards.`
    };
  })
  .build();

export let createDashboard = SlateTool.create(spec, {
  name: 'Create ClickStack Dashboard',
  key: 'create_clickstack_dashboard',
  description: `Create a new ClickStack observability dashboard for a service. Dashboards can contain tiles with charts configured with SQL or Lucene queries and aggregation functions.`
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service'),
      name: z.string().describe('Name for the dashboard'),
      tiles: z
        .array(z.record(z.string(), z.any()))
        .describe('Dashboard tiles/chart configurations'),
      tags: z.array(z.string()).optional().describe('Tags to apply to the dashboard'),
      filters: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Dashboard filter keys to apply across tiles'),
      savedQuery: z
        .string()
        .nullable()
        .optional()
        .describe('Optional default dashboard query'),
      savedQueryLanguage: z
        .enum(['sql', 'lucene'])
        .nullable()
        .optional()
        .describe('Language used by savedQuery'),
      savedFilterValues: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Optional default dashboard filter values')
    })
  )
  .output(
    z.object({
      dashboardId: z.string(),
      name: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = { name: ctx.input.name };
    body.tiles = ctx.input.tiles;
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.filters) body.filters = ctx.input.filters;
    if (ctx.input.savedQuery !== undefined) body.savedQuery = ctx.input.savedQuery;
    if (ctx.input.savedQueryLanguage !== undefined)
      body.savedQueryLanguage = ctx.input.savedQueryLanguage;
    if (ctx.input.savedFilterValues) body.savedFilterValues = ctx.input.savedFilterValues;

    let result = await client.createDashboard(ctx.input.serviceId, body);

    return {
      output: {
        dashboardId: result.id,
        name: result.name
      },
      message: `Dashboard **${result.name}** created.`
    };
  })
  .build();

export let getDashboard = SlateTool.create(spec, {
  name: 'Get ClickStack Dashboard',
  key: 'get_clickstack_dashboard',
  description: `Retrieve a ClickStack dashboard, including tiles, tags, filters, and saved query defaults.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service'),
      dashboardId: z.string().describe('ID of the dashboard')
    })
  )
  .output(
    z.object({
      dashboardId: z.string(),
      name: z.string().optional(),
      dashboard: z.record(z.string(), z.any())
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let dashboard = await client.getDashboard(ctx.input.serviceId, ctx.input.dashboardId);

    return {
      output: {
        dashboardId: dashboard.id || ctx.input.dashboardId,
        name: dashboard.name,
        dashboard
      },
      message: `Retrieved dashboard **${dashboard.name || ctx.input.dashboardId}**.`
    };
  })
  .build();

export let updateDashboard = SlateTool.create(spec, {
  name: 'Update ClickStack Dashboard',
  key: 'update_clickstack_dashboard',
  description: `Update a ClickStack dashboard. The official API expects a full dashboard body including name and tiles.`
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service'),
      dashboardId: z.string().describe('ID of the dashboard'),
      name: z.string().describe('Updated dashboard name'),
      tiles: z.array(z.record(z.string(), z.any())).describe('Full updated tile list'),
      tags: z.array(z.string()).optional().describe('Updated dashboard tags'),
      filters: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Updated dashboard filters'),
      savedQuery: z
        .string()
        .nullable()
        .optional()
        .describe('Optional default dashboard query'),
      savedQueryLanguage: z
        .enum(['sql', 'lucene'])
        .nullable()
        .optional()
        .describe('Language used by savedQuery'),
      savedFilterValues: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Optional default dashboard filter values')
    })
  )
  .output(
    z.object({
      dashboardId: z.string(),
      name: z.string().optional(),
      dashboard: z.record(z.string(), z.any())
    })
  )
  .handleInvocation(async ctx => {
    let body: Record<string, any> = {
      name: ctx.input.name,
      tiles: ctx.input.tiles
    };
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.filters) body.filters = ctx.input.filters;
    if (ctx.input.savedQuery !== undefined) body.savedQuery = ctx.input.savedQuery;
    if (ctx.input.savedQueryLanguage !== undefined)
      body.savedQueryLanguage = ctx.input.savedQueryLanguage;
    if (ctx.input.savedFilterValues) body.savedFilterValues = ctx.input.savedFilterValues;

    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let dashboard = await client.updateDashboard(
      ctx.input.serviceId,
      ctx.input.dashboardId,
      body
    );

    return {
      output: {
        dashboardId: dashboard.id || ctx.input.dashboardId,
        name: dashboard.name,
        dashboard
      },
      message: `Updated dashboard **${dashboard.name || ctx.input.dashboardId}**.`
    };
  })
  .build();

export let deleteDashboard = SlateTool.create(spec, {
  name: 'Delete ClickStack Dashboard',
  key: 'delete_clickstack_dashboard',
  description: `Delete a ClickStack dashboard from a service.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service'),
      dashboardId: z.string().describe('ID of the dashboard to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    await client.deleteDashboard(ctx.input.serviceId, ctx.input.dashboardId);

    return {
      output: { deleted: true },
      message: `Dashboard **${ctx.input.dashboardId}** deleted.`
    };
  })
  .build();

// ── Alerts ──────────────────────────────────────────────

export let listAlerts = SlateTool.create(spec, {
  name: 'List ClickStack Alerts',
  key: 'list_clickstack_alerts',
  description: `List all ClickStack alerts configured for a service. Alerts support webhook notifications to services like Slack and PagerDuty.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service')
    })
  )
  .output(
    z.object({
      alerts: z.array(
        z.object({
          alertId: z.string(),
          name: z.string().optional(),
          threshold: z.number().optional(),
          thresholdType: z.string().optional(),
          interval: z.string().optional()
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let alerts = await client.listAlerts(ctx.input.serviceId);
    let items = Array.isArray(alerts) ? alerts : [];

    return {
      output: {
        alerts: items.map((a: any) => ({
          alertId: a.id,
          name: a.name,
          threshold: a.threshold,
          thresholdType: a.thresholdType,
          interval: a.interval
        }))
      },
      message: `Found **${items.length}** ClickStack alerts.`
    };
  })
  .build();

export let createAlert = SlateTool.create(spec, {
  name: 'Create ClickStack Alert',
  key: 'create_clickstack_alert',
  description: `Create a new ClickStack alert for a service. Alerts monitor metrics and send notifications via webhooks (Slack, PagerDuty, etc.) when thresholds are breached.`
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service'),
      name: z.string().describe('Name for the alert'),
      alertMessage: z.string().optional().describe('Alert notification message'),
      threshold: z.number().describe('Threshold value that triggers the alert'),
      thresholdMax: z
        .number()
        .nullable()
        .optional()
        .describe('Upper bound for between and not_between threshold types'),
      thresholdType: z
        .enum([
          'above',
          'below',
          'above_exclusive',
          'below_or_equal',
          'equal',
          'not_equal',
          'between',
          'not_between'
        ])
        .describe('Threshold comparison direction'),
      interval: z
        .enum(['1m', '5m', '15m', '30m', '1h', '6h', '12h', '1d'])
        .describe('Evaluation interval'),
      source: z.enum(['saved_search', 'tile']).optional().describe('Alert source type'),
      channel: z
        .record(z.string(), z.any())
        .optional()
        .describe('Notification channel configuration (webhook URL and type)'),
      dashboardId: z.string().optional().describe('Dashboard ID the alert is linked to'),
      tileId: z.string().optional().describe('Tile ID the alert monitors'),
      savedSearchId: z.string().nullable().optional().describe('Saved search ID to monitor'),
      groupBy: z
        .string()
        .nullable()
        .optional()
        .describe('Group-by key for saved search alerts'),
      scheduleOffsetMinutes: z
        .number()
        .nullable()
        .optional()
        .describe('Offset from the interval boundary in minutes'),
      scheduleStartAt: z
        .string()
        .nullable()
        .optional()
        .describe('Absolute UTC start time anchor')
    })
  )
  .output(
    z.object({
      alertId: z.string(),
      name: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let body: Record<string, any> = {
      name: ctx.input.name,
      threshold: ctx.input.threshold,
      thresholdType: ctx.input.thresholdType,
      interval: ctx.input.interval
    };
    if (ctx.input.alertMessage) body.message = ctx.input.alertMessage;
    if (ctx.input.thresholdMax !== undefined) body.thresholdMax = ctx.input.thresholdMax;
    if (ctx.input.source) body.source = ctx.input.source;
    if (ctx.input.channel) body.channel = ctx.input.channel;
    if (ctx.input.dashboardId) body.dashboardId = ctx.input.dashboardId;
    if (ctx.input.tileId) body.tileId = ctx.input.tileId;
    if (ctx.input.savedSearchId !== undefined) body.savedSearchId = ctx.input.savedSearchId;
    if (ctx.input.groupBy !== undefined) body.groupBy = ctx.input.groupBy;
    if (ctx.input.scheduleOffsetMinutes !== undefined)
      body.scheduleOffsetMinutes = ctx.input.scheduleOffsetMinutes;
    if (ctx.input.scheduleStartAt !== undefined)
      body.scheduleStartAt = ctx.input.scheduleStartAt;

    let result = await client.createAlert(ctx.input.serviceId, body);

    return {
      output: {
        alertId: result.id,
        name: result.name
      },
      message: `Alert **${result.name}** created.`
    };
  })
  .build();

export let getAlert = SlateTool.create(spec, {
  name: 'Get ClickStack Alert',
  key: 'get_clickstack_alert',
  description: `Retrieve a ClickStack alert, including state, schedule, threshold, and notification channel details.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service'),
      alertId: z.string().describe('ID of the alert')
    })
  )
  .output(
    z.object({
      alertId: z.string(),
      name: z.string().nullable().optional(),
      state: z.string().optional(),
      alert: z.record(z.string(), z.any())
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let alert = await client.getAlert(ctx.input.serviceId, ctx.input.alertId);

    return {
      output: {
        alertId: alert.id || ctx.input.alertId,
        name: alert.name,
        state: alert.state,
        alert
      },
      message: `Retrieved alert **${alert.name || ctx.input.alertId}**.`
    };
  })
  .build();

export let updateAlert = SlateTool.create(spec, {
  name: 'Update ClickStack Alert',
  key: 'update_clickstack_alert',
  description: `Update a ClickStack alert. Pass the alert fields supported by the official ClickStack alert update request.`
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service'),
      alertId: z.string().describe('ID of the alert'),
      alertSettings: z
        .record(z.string(), z.any())
        .describe(
          'Alert update body, such as name, threshold, interval, source, channel, tileId, or dashboardId'
        )
    })
  )
  .output(
    z.object({
      alertId: z.string(),
      name: z.string().nullable().optional(),
      state: z.string().optional(),
      alert: z.record(z.string(), z.any())
    })
  )
  .handleInvocation(async ctx => {
    ensureBodyHasFields(ctx.input.alertSettings, 'alert');

    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let alert = await client.updateAlert(
      ctx.input.serviceId,
      ctx.input.alertId,
      ctx.input.alertSettings
    );

    return {
      output: {
        alertId: alert.id || ctx.input.alertId,
        name: alert.name,
        state: alert.state,
        alert
      },
      message: `Updated alert **${alert.name || ctx.input.alertId}**.`
    };
  })
  .build();

export let deleteAlert = SlateTool.create(spec, {
  name: 'Delete ClickStack Alert',
  key: 'delete_clickstack_alert',
  description: `Delete a ClickStack alert from a service.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service'),
      alertId: z.string().describe('ID of the alert to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    await client.deleteAlert(ctx.input.serviceId, ctx.input.alertId);

    return {
      output: { deleted: true },
      message: `Alert **${ctx.input.alertId}** deleted.`
    };
  })
  .build();

export let listClickStackSources = SlateTool.create(spec, {
  name: 'List ClickStack Sources',
  key: 'list_clickstack_sources',
  description: `List ClickStack data sources for a service. Source IDs are needed when creating or updating dashboard tiles.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service')
    })
  )
  .output(
    z.object({
      sources: z.array(z.record(z.string(), z.any()))
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let sources = await client.listClickStackSources(ctx.input.serviceId);
    let items = Array.isArray(sources) ? sources : [];

    return {
      output: { sources: items },
      message: `Found **${items.length}** ClickStack sources.`
    };
  })
  .build();

export let listClickStackWebhooks = SlateTool.create(spec, {
  name: 'List ClickStack Webhooks',
  key: 'list_clickstack_webhooks',
  description: `List ClickStack webhook destinations for a service. Webhook IDs are needed for alert notification channels.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('ID of the service')
    })
  )
  .output(
    z.object({
      webhooks: z.array(z.record(z.string(), z.any()))
    })
  )
  .handleInvocation(async ctx => {
    let client = new ClickHouseClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let webhooks = await client.listClickStackWebhooks(ctx.input.serviceId);
    let items = Array.isArray(webhooks) ? webhooks : [];

    return {
      output: { webhooks: items },
      message: `Found **${items.length}** ClickStack webhooks.`
    };
  })
  .build();
