import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let dashboardOutput = z.object({
  dashboardId: z.string().describe('Dashboard ID'),
  name: z.string().describe('Dashboard name'),
  description: z.string().optional().describe('Dashboard description'),
  pinned: z.boolean().optional().describe('Whether the dashboard is pinned'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  createdBy: z.string().optional().describe('Creator user ID or email'),
  isShared: z.boolean().optional().describe('Whether the dashboard is shared'),
  tags: z.array(z.string()).optional().describe('Dashboard tags')
});

export let listDashboardsTool = SlateTool.create(spec, {
  name: 'List Dashboards',
  key: 'list_dashboards',
  description: `List all dashboards in the project. Supports searching by name.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      search: z.string().optional().describe('Search by dashboard name'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      dashboards: z.array(dashboardOutput),
      hasMore: z.boolean().describe('Whether there are more results')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let data = await client.listDashboards({
      search: ctx.input.search,
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let dashboards = (data.results || []).map((d: any) => ({
      dashboardId: String(d.id),
      name: d.name,
      description: d.description,
      pinned: d.pinned,
      createdAt: d.created_at,
      createdBy: d.created_by ? String(d.created_by.id || d.created_by) : undefined,
      isShared: d.is_shared,
      tags: d.tags
    }));

    return {
      output: { dashboards, hasMore: !!data.next },
      message: `Found **${dashboards.length}** dashboard(s).`
    };
  })
  .build();

export let getDashboardTool = SlateTool.create(spec, {
  name: 'Get Dashboard',
  key: 'get_dashboard',
  description: `Retrieve detailed information about a specific dashboard by its ID, including its tiles and configuration.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      dashboardId: z.string().describe('Dashboard ID')
    })
  )
  .output(dashboardOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let d = await client.getDashboard(ctx.input.dashboardId);

    return {
      output: {
        dashboardId: String(d.id),
        name: d.name,
        description: d.description,
        pinned: d.pinned,
        createdAt: d.created_at,
        createdBy: d.created_by ? String(d.created_by.id || d.created_by) : undefined,
        isShared: d.is_shared,
        tags: d.tags
      },
      message: `Retrieved dashboard **${d.name}**.`
    };
  })
  .build();

export let createDashboardTool = SlateTool.create(spec, {
  name: 'Create Dashboard',
  key: 'create_dashboard',
  description: `Create a new dashboard for organizing insights and analytics visualizations.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      name: z.string().describe('Dashboard name'),
      description: z.string().optional().describe('Dashboard description'),
      pinned: z.boolean().optional().describe('Whether to pin the dashboard'),
      tags: z.array(z.string()).optional().describe('Tags for the dashboard')
    })
  )
  .output(dashboardOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let payload: Record<string, any> = { name: ctx.input.name };
    if (ctx.input.description !== undefined) payload.description = ctx.input.description;
    if (ctx.input.pinned !== undefined) payload.pinned = ctx.input.pinned;
    if (ctx.input.tags !== undefined) payload.tags = ctx.input.tags;

    let d = await client.createDashboard(payload);

    return {
      output: {
        dashboardId: String(d.id),
        name: d.name,
        description: d.description,
        pinned: d.pinned,
        createdAt: d.created_at,
        createdBy: d.created_by ? String(d.created_by.id || d.created_by) : undefined,
        isShared: d.is_shared,
        tags: d.tags
      },
      message: `Created dashboard **${d.name}** (ID: ${d.id}).`
    };
  })
  .build();

export let updateDashboardTool = SlateTool.create(spec, {
  name: 'Update Dashboard',
  key: 'update_dashboard',
  description: `Update an existing dashboard's name, description, pinned status, or tags.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      dashboardId: z.string().describe('Dashboard ID to update'),
      name: z.string().optional().describe('New dashboard name'),
      description: z.string().optional().describe('New description'),
      pinned: z.boolean().optional().describe('Pin or unpin the dashboard'),
      tags: z.array(z.string()).optional().describe('Updated tags')
    })
  )
  .output(dashboardOutput)
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    let payload: Record<string, any> = {};
    if (ctx.input.name !== undefined) payload.name = ctx.input.name;
    if (ctx.input.description !== undefined) payload.description = ctx.input.description;
    if (ctx.input.pinned !== undefined) payload.pinned = ctx.input.pinned;
    if (ctx.input.tags !== undefined) payload.tags = ctx.input.tags;

    let d = await client.updateDashboard(ctx.input.dashboardId, payload);

    return {
      output: {
        dashboardId: String(d.id),
        name: d.name,
        description: d.description,
        pinned: d.pinned,
        createdAt: d.created_at,
        createdBy: d.created_by ? String(d.created_by.id || d.created_by) : undefined,
        isShared: d.is_shared,
        tags: d.tags
      },
      message: `Updated dashboard **${d.name}**.`
    };
  })
  .build();

export let deleteDashboardTool = SlateTool.create(spec, {
  name: 'Delete Dashboard',
  key: 'delete_dashboard',
  description: `Permanently delete a dashboard.`,
  tags: { destructive: true }
})
  .input(
    z.object({
      dashboardId: z.string().describe('Dashboard ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the dashboard was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth);
    await client.deleteDashboard(ctx.input.dashboardId);

    return {
      output: { deleted: true },
      message: `Deleted dashboard **${ctx.input.dashboardId}**.`
    };
  })
  .build();
