import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelemetryClient } from '../lib/telemetry-client';
import { spec } from '../spec';

let dashboardSchema = z.object({
  dashboardId: z.string().describe('Dashboard ID'),
  name: z.string().nullable().describe('Dashboard name'),
  description: z.string().nullable().describe('Dashboard description'),
  createdAt: z.string().nullable().describe('Creation timestamp'),
  updatedAt: z.string().nullable().describe('Last update timestamp'),
  widgets: z
    .array(z.record(z.string(), z.any()))
    .nullable()
    .describe('Dashboard widget configurations')
});

export let listDashboards = SlateTool.create(spec, {
  name: 'List Dashboards',
  key: 'list_dashboards',
  description: `List telemetry dashboards in your Better Stack team. Retrieve dashboard configurations including widgets, descriptions, and metadata. Use the dashboardId to get full details of a specific dashboard.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page'),
      dashboardId: z
        .string()
        .optional()
        .describe('Specific dashboard ID to retrieve full details')
    })
  )
  .output(
    z.object({
      dashboards: z.array(dashboardSchema).optional().describe('List of dashboards'),
      dashboard: dashboardSchema.optional().describe('Single dashboard with full details'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelemetryClient({
      token: ctx.auth.token,
      teamName: ctx.config.teamName
    });

    let mapDashboard = (item: any) => {
      let attrs = item.attributes || item;
      return {
        dashboardId: String(item.id),
        name: attrs.name || null,
        description: attrs.description || null,
        createdAt: attrs.created_at || null,
        updatedAt: attrs.updated_at || null,
        widgets: attrs.widgets || null
      };
    };

    if (ctx.input.dashboardId) {
      let result = await client.getDashboard(ctx.input.dashboardId);
      let dashboard = mapDashboard(result.data || result);
      return {
        output: { dashboard },
        message: `Dashboard **${dashboard.name || dashboard.dashboardId}** retrieved.`
      };
    }

    let result = await client.listDashboards({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });
    let dashboards = (result.data || []).map(mapDashboard);

    return {
      output: { dashboards, hasMore: !!result.pagination?.next },
      message: `Found **${dashboards.length}** dashboard(s).`
    };
  })
  .build();
