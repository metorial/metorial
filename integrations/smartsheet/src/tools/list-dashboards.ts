import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmartsheetClient } from '../lib/client';
import { spec } from '../spec';

export let listDashboards = SlateTool.create(spec, {
  name: 'List Dashboards',
  key: 'list_dashboards',
  description: `List all dashboards accessible to the current user, or get details for a specific dashboard. Dashboards (also known as Sights) aggregate information from sheets and reports into visual displays.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      dashboardId: z
        .string()
        .optional()
        .describe('Get a specific dashboard by ID. If omitted, lists all dashboards.')
    })
  )
  .output(
    z.object({
      dashboards: z
        .array(
          z.object({
            dashboardId: z.number().describe('Dashboard ID'),
            name: z.string().describe('Dashboard name'),
            accessLevel: z.string().optional().describe('Access level'),
            permalink: z.string().optional().describe('URL to the dashboard'),
            createdAt: z.string().optional().describe('When the dashboard was created'),
            modifiedAt: z.string().optional().describe('When the dashboard was last modified')
          })
        )
        .optional()
        .describe('List of dashboards'),
      dashboard: z
        .object({
          dashboardId: z.number().describe('Dashboard ID'),
          name: z.string().describe('Dashboard name'),
          accessLevel: z.string().optional().describe('Access level'),
          permalink: z.string().optional().describe('URL to the dashboard'),
          widgets: z
            .array(
              z.object({
                widgetId: z.number().optional().describe('Widget ID'),
                type: z.string().optional().describe('Widget type'),
                title: z.string().optional().describe('Widget title'),
                contents: z.any().optional().describe('Widget contents')
              })
            )
            .optional()
            .describe('Dashboard widgets')
        })
        .optional()
        .describe('Full dashboard data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });

    if (ctx.input.dashboardId) {
      let dash = await client.getDashboard(ctx.input.dashboardId);

      return {
        output: {
          dashboard: {
            dashboardId: dash.id,
            name: dash.name,
            accessLevel: dash.accessLevel,
            permalink: dash.permalink,
            widgets: (dash.widgets || []).map((w: any) => ({
              widgetId: w.id,
              type: w.type,
              title: w.title,
              contents: w.contents
            }))
          }
        },
        message: `Retrieved dashboard **${dash.name}** with ${(dash.widgets || []).length} widget(s).`
      };
    }

    let result = await client.listDashboards({ includeAll: true });
    let dashboards = (result.data || []).map((d: any) => ({
      dashboardId: d.id,
      name: d.name,
      accessLevel: d.accessLevel,
      permalink: d.permalink,
      createdAt: d.createdAt,
      modifiedAt: d.modifiedAt
    }));

    return {
      output: { dashboards },
      message: `Found **${dashboards.length}** dashboard(s).`
    };
  })
  .build();
