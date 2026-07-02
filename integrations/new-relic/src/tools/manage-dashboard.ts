import { SlateTool } from 'slates';
import { z } from 'zod';
import { NerdGraphClient } from '../lib/client';
import { spec } from '../spec';

let widgetSchema = z.object({
  title: z.string().describe('Widget title'),
  visualization: z
    .string()
    .describe(
      'Visualization type ID, e.g. "viz.line", "viz.table", "viz.billboard", "viz.bar", "viz.pie", "viz.area", "viz.markdown"'
    ),
  rawConfiguration: z
    .any()
    .describe(
      'Widget configuration including NRQL queries. Example: { "nrqlQueries": [{ "accountIds": [12345], "query": "SELECT count(*) FROM Transaction TIMESERIES" }] }'
    ),
  layout: z
    .object({
      column: z.number().describe('Column position (1-12)'),
      row: z.number().describe('Row position (1+)'),
      width: z.number().describe('Width in columns (1-12)'),
      height: z.number().describe('Height in rows')
    })
    .optional()
    .describe('Widget position and size on the page')
});

let pageSchema = z.object({
  name: z.string().describe('Page name'),
  description: z.string().optional().describe('Page description'),
  widgets: z.array(widgetSchema).describe('Widgets on this page')
});

let dashboardOutputSchema = z.object({
  dashboardGuid: z.string().optional().describe('Dashboard entity GUID'),
  name: z.string().optional().describe('Dashboard name'),
  description: z.string().optional().describe('Dashboard description'),
  permalink: z.string().optional().describe('Direct link to the dashboard in New Relic UI'),
  pages: z
    .array(
      z.object({
        pageGuid: z.string().optional().describe('Page GUID'),
        name: z.string().optional().describe('Page name')
      })
    )
    .optional()
    .describe('Dashboard pages'),
  deleted: z.boolean().optional().describe('Whether the dashboard was deleted')
});

export let manageDashboard = SlateTool.create(spec, {
  name: 'Manage Dashboard',
  key: 'manage_dashboard',
  description: `Create, read, update, or delete New Relic dashboards. Dashboards consist of pages containing widgets (charts, tables, billboards, markdown), each driven by NRQL queries.`,
  instructions: [
    'To create: provide `action: "create"`, a `name`, and at least one page with widgets.',
    'To get: provide `action: "get"` and the `dashboardGuid`.',
    'To update: provide `action: "update"`, the `dashboardGuid`, and the fields to change.',
    'To delete: provide `action: "delete"` and the `dashboardGuid`.',
    'Common visualizations: `viz.line`, `viz.table`, `viz.billboard`, `viz.bar`, `viz.pie`, `viz.area`, `viz.markdown`.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'get', 'update', 'delete']).describe('Action to perform'),
      dashboardGuid: z
        .string()
        .optional()
        .describe('Dashboard entity GUID (required for get/update/delete)'),
      name: z.string().optional().describe('Dashboard name'),
      description: z.string().optional().describe('Dashboard description'),
      permissions: z
        .enum(['PUBLIC_READ_WRITE', 'PUBLIC_READ_ONLY', 'PRIVATE'])
        .optional()
        .describe('Dashboard visibility permissions'),
      pages: z.array(pageSchema).optional().describe('Dashboard pages with widgets')
    })
  )
  .output(dashboardOutputSchema)
  .handleInvocation(async ctx => {
    let client = new NerdGraphClient({
      token: ctx.auth.token,
      region: ctx.config.region,
      accountId: ctx.config.accountId
    });

    let { action } = ctx.input;

    if (action === 'get') {
      if (!ctx.input.dashboardGuid)
        throw new Error('dashboardGuid is required for get action');
      ctx.progress('Fetching dashboard...');
      let dashboard = await client.getDashboard(ctx.input.dashboardGuid);

      return {
        output: {
          dashboardGuid: dashboard?.guid,
          name: dashboard?.name,
          description: dashboard?.description,
          permalink: dashboard?.permalink,
          pages: dashboard?.pages?.map((p: any) => ({
            pageGuid: p.guid,
            name: p.name
          }))
        },
        message: `Dashboard **${dashboard?.name}** retrieved successfully.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.dashboardGuid)
        throw new Error('dashboardGuid is required for delete action');
      ctx.progress('Deleting dashboard...');
      await client.deleteDashboard(ctx.input.dashboardGuid);
      return {
        output: { dashboardGuid: ctx.input.dashboardGuid, deleted: true },
        message: `Dashboard **${ctx.input.dashboardGuid}** deleted successfully.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) throw new Error('name is required for create action');
      if (!ctx.input.pages?.length)
        throw new Error('At least one page is required for create action');

      ctx.progress('Creating dashboard...');
      let result = await client.createDashboard({
        name: ctx.input.name,
        description: ctx.input.description,
        permissions: ctx.input.permissions,
        pages: ctx.input.pages
      });

      return {
        output: {
          dashboardGuid: result?.guid,
          name: result?.name,
          description: result?.description,
          permalink: result?.permalink,
          pages: result?.pages?.map((p: any) => ({
            pageGuid: p.guid,
            name: p.name
          }))
        },
        message: `Dashboard **${result?.name}** created successfully. [View in New Relic](${result?.permalink})`
      };
    }

    // update
    if (!ctx.input.dashboardGuid)
      throw new Error('dashboardGuid is required for update action');

    ctx.progress('Updating dashboard...');
    let result = await client.updateDashboard(ctx.input.dashboardGuid, {
      name: ctx.input.name,
      description: ctx.input.description,
      permissions: ctx.input.permissions,
      pages: ctx.input.pages
    });

    return {
      output: {
        dashboardGuid: result?.guid,
        name: result?.name,
        description: result?.description,
        permalink: result?.permalink,
        pages: result?.pages?.map((p: any) => ({
          pageGuid: p.guid,
          name: p.name
        }))
      },
      message: `Dashboard **${result?.name}** updated successfully.`
    };
  })
  .build();
