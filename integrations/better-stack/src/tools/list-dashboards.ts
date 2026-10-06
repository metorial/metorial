import { SlateTool } from 'slates';
import { z } from 'zod';
import { type ApiResource, nextUrlSchema, teamNameSchema } from '../lib/api';
import { TelemetryClient } from '../lib/telemetry-client';
import { spec } from '../spec';

let dashboardSchema = z.object({
  dashboardId: z.string().describe('Dashboard ID'),
  name: z.string().nullable().describe('Dashboard name'),
  description: z.string().nullable().describe('Dashboard description'),
  createdAt: z.string().nullable().describe('Creation timestamp'),
  updatedAt: z.string().nullable().describe('Last update timestamp'),
  widgets: z
    .array(z.record(z.string(), z.unknown()))
    .nullable()
    .describe('Legacy widget configurations, when supplied by the provider'),
  charts: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe('Charts and their IDs in a full dashboard response'),
  sections: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe('Sections in a full dashboard response'),
  variables: z
    .array(z.record(z.string(), z.unknown()))
    .optional()
    .describe('Variables in a full dashboard response'),
  teamName: z.string().optional().describe('Owning team')
});

export let listDashboards = SlateTool.create(spec, {
  name: 'List Dashboards',
  key: 'list_dashboards',
  description: `List or search telemetry dashboards. Provide dashboardId to retrieve full details, including chart IDs, sections and variables. Use chart IDs when creating dashboard alerts.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      teamName: teamNameSchema,
      nextUrl: nextUrlSchema,
      page: z.number().optional().describe('Page number (default: 1)'),
      perPage: z.number().optional().describe('Results per page'),
      query: z.string().optional().describe('Search dashboards by name'),
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
      nextUrl: z.string().optional().describe('Next-page URL, when available'),
      hasMore: z.boolean().optional().describe('Whether more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelemetryClient({
      token: ctx.auth.token,
      tokenType: ctx.auth.tokenType,
      teamName: ctx.input.teamName ?? ctx.config.teamName
    });

    let mapDashboard = (item: ApiResource) => {
      let attrs = item.attributes;
      return {
        dashboardId: String(item.id),
        name: attrs.name || null,
        description: attrs.description || null,
        createdAt: attrs.created_at || null,
        updatedAt: attrs.updated_at || null,
        widgets: attrs.widgets || null,
        charts: attrs.charts ?? undefined,
        sections: attrs.sections ?? undefined,
        variables: attrs.variables ?? undefined,
        teamName: attrs.team_name ?? undefined
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
      nextUrl: ctx.input.nextUrl,
      page: ctx.input.page,
      perPage: ctx.input.perPage,
      query: ctx.input.query
    });
    let dashboards = (result.data || []).map(mapDashboard);

    return {
      output: {
        dashboards,
        hasMore: !!result.pagination?.next,
        nextUrl: result.pagination?.next ?? undefined
      },
      message: `Found **${dashboards.length}** dashboard(s).`
    };
  })
  .build();
