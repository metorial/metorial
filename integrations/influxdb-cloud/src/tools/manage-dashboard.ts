import { SlateTool } from 'slates';
import { z } from 'zod';
import { optionalString, requireArray, resource } from '../lib/client';
import { createClient, orgIdInput } from '../lib/helpers';
import { spec } from '../spec';

export let dashboardSchema = z.object({
  raw: z.any().optional().describe('Complete provider resource'),
  dashboardId: z.string().describe('Unique dashboard ID'),
  name: z.string().describe('Dashboard name'),
  description: z.string().optional().describe('Dashboard description'),
  orgId: z.string().optional().describe('Organization ID'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  cells: z.array(z.any()).optional().describe('Dashboard cells'),
  labels: z.array(z.any()).optional().describe('Associated labels')
});

export let listDashboards = SlateTool.create(spec, {
  name: 'List Dashboards',
  key: 'list_dashboards',
  description: `List a page of dashboards in the organization. Dashboards contain cells with configurable queries and visualization types for monitoring time-series data.`,
  instructions: [
    'Call list_organizations to discover orgId when organization scope is needed.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orgId: orgIdInput,
      limit: z.number().optional().describe('Maximum number of dashboards to return'),
      offset: z.number().optional().describe('Number of dashboards to skip for pagination')
    })
  )
  .output(
    z.object({
      raw: z.any().optional().describe('Complete provider response'),
      dashboards: z.array(dashboardSchema).describe('List of dashboards')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listDashboards({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let dashboards = requireArray(result, 'dashboards').map((d: any) => ({
      raw: d,
      dashboardId: resource(d, ['id', 'name']).id,
      name: d.name,
      description: optionalString(d.description),
      orgId: optionalString(d.orgID),
      createdAt: optionalString(d.meta?.createdAt),
      updatedAt: optionalString(d.meta?.updatedAt),
      cells: Array.isArray(d.cells) ? d.cells : undefined,
      labels: d.labels
    }));

    return {
      output: { dashboards, raw: result },
      message: `Found **${dashboards.length}** dashboard(s).`
    };
  })
  .build();

export let createDashboard = SlateTool.create(spec, {
  name: 'Create Dashboard',
  key: 'create_dashboard',
  description: `Create a new dashboard for visualizing time-series data.`,
  instructions: [
    'Call list_organizations to discover orgId when organization scope is needed.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      orgId: orgIdInput,
      name: z.string().describe('Dashboard name'),
      description: z.string().optional().describe('Dashboard description')
    })
  )
  .output(dashboardSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let d = await client.createDashboard({
      name: ctx.input.name,
      description: ctx.input.description
    });

    return {
      output: {
        raw: d,
        dashboardId: resource(d, ['id', 'name']).id,
        name: d.name,
        description: optionalString(d.description),
        orgId: optionalString(d.orgID),
        createdAt: optionalString(d.meta?.createdAt),
        updatedAt: optionalString(d.meta?.updatedAt),
        cells: Array.isArray(d.cells) ? d.cells : undefined,
        labels: d.labels
      },
      message: `Created dashboard **${d.name}** (ID: ${d.id}).`
    };
  })
  .build();

export let updateDashboard = SlateTool.create(spec, {
  name: 'Update Dashboard',
  key: 'update_dashboard',
  description: `Update an existing dashboard's name or description.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      dashboardId: z.string().describe('ID of the dashboard to update'),
      name: z.string().optional().describe('New dashboard name'),
      description: z.string().optional().describe('New dashboard description')
    })
  )
  .output(dashboardSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let d = await client.updateDashboard(ctx.input.dashboardId, {
      name: ctx.input.name,
      description: ctx.input.description
    });

    return {
      output: {
        raw: d,
        dashboardId: resource(d, ['id', 'name']).id,
        name: d.name,
        description: optionalString(d.description),
        orgId: optionalString(d.orgID),
        createdAt: optionalString(d.meta?.createdAt),
        updatedAt: optionalString(d.meta?.updatedAt),
        cells: Array.isArray(d.cells) ? d.cells : undefined,
        labels: d.labels
      },
      message: `Updated dashboard **${d.name}** (ID: ${d.id}).`
    };
  })
  .build();

export let deleteDashboard = SlateTool.create(spec, {
  name: 'Delete Dashboard',
  key: 'delete_dashboard',
  description: `Permanently delete a dashboard and all its cells.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      dashboardId: z.string().describe('ID of the dashboard to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the dashboard was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteDashboard(ctx.input.dashboardId);

    return {
      output: { success: true },
      message: `Deleted dashboard ${ctx.input.dashboardId}.`
    };
  })
  .build();
