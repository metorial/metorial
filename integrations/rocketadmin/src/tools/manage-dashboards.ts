import { SlateTool } from 'slates';
import { z } from 'zod';
import { RocketadminClient } from '../lib/client';
import { spec } from '../spec';

export let manageDashboards = SlateTool.create(spec, {
  name: 'Manage Dashboards',
  key: 'manage_dashboards',
  description: `List, create, update, or delete dashboards for a database connection. Dashboards provide data visualization through customizable widgets.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      connectionId: z
        .string()
        .optional()
        .describe('Connection ID (required for list and create)'),
      dashboardId: z
        .string()
        .optional()
        .describe('Dashboard ID (required for get, update, delete)'),
      title: z.string().optional().describe('Dashboard title (required for create and update)')
    })
  )
  .output(
    z.object({
      dashboards: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of dashboards'),
      dashboard: z.record(z.string(), z.unknown()).optional().describe('Dashboard details'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RocketadminClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { action, connectionId, dashboardId, title } = ctx.input;

    if (action === 'list') {
      if (!connectionId) throw new Error('connectionId is required for listing dashboards');
      let dashboards = await client.listDashboards(connectionId);
      return {
        output: { dashboards, success: true },
        message: `Found **${dashboards.length}** dashboard(s).`
      };
    }

    if (action === 'get') {
      if (!dashboardId) throw new Error('dashboardId is required');
      let dashboard = await client.getDashboard(dashboardId);
      return {
        output: { dashboard, success: true },
        message: `Retrieved dashboard **${dashboardId}**.`
      };
    }

    if (action === 'create') {
      if (!connectionId) throw new Error('connectionId is required for creating a dashboard');
      if (!title) throw new Error('title is required for creating a dashboard');
      let dashboard = await client.createDashboard(connectionId, title);
      return {
        output: { dashboard, success: true },
        message: `Dashboard **${title}** created successfully.`
      };
    }

    if (action === 'update') {
      if (!dashboardId) throw new Error('dashboardId is required for updating');
      if (!title) throw new Error('title is required for updating a dashboard');
      let dashboard = await client.updateDashboard(dashboardId, title);
      return {
        output: { dashboard, success: true },
        message: `Dashboard **${dashboardId}** updated successfully.`
      };
    }

    if (action === 'delete') {
      if (!dashboardId) throw new Error('dashboardId is required for deleting');
      await client.deleteDashboard(dashboardId);
      return {
        output: { success: true },
        message: `Dashboard **${dashboardId}** deleted successfully.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
