import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createRocketadminClient } from '../lib/client';
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
      masterPassword: z
        .string()
        .optional()
        .describe('Master password for an encrypted connection'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      connectionId: z
        .string()
        .optional()
        .describe('Connection ID for every action. Call list_connections to discover IDs.'),
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
    let client = createRocketadminClient(ctx.auth, ctx.config, ctx.input.masterPassword);

    let { action, connectionId, dashboardId, title } = ctx.input;
    if (!connectionId)
      throw createApiServiceError(
        'connectionId is required for dashboard actions. Call list_connections to discover IDs.'
      );

    if (action === 'list') {
      if (!connectionId)
        throw createApiServiceError('connectionId is required for listing dashboards');
      let dashboards = await client.listDashboards(connectionId);
      return {
        output: { dashboards, success: true },
        message: `Found **${dashboards.length}** dashboard(s).`
      };
    }

    if (action === 'get') {
      if (!dashboardId) throw createApiServiceError('dashboardId is required');
      let dashboard = await client.getDashboard(connectionId, dashboardId);
      return {
        output: { dashboard, success: true },
        message: `Retrieved dashboard **${dashboardId}**.`
      };
    }

    if (action === 'create') {
      if (!connectionId)
        throw createApiServiceError('connectionId is required for creating a dashboard');
      if (!title) throw createApiServiceError('title is required for creating a dashboard');
      let dashboard = await client.createDashboard(connectionId, title);
      return {
        output: { dashboard, success: true },
        message: `Dashboard **${title}** created successfully.`
      };
    }

    if (action === 'update') {
      if (!dashboardId) throw createApiServiceError('dashboardId is required for updating');
      if (!title) throw createApiServiceError('title is required for updating a dashboard');
      let dashboard = await client.updateDashboard(connectionId, dashboardId, title);
      return {
        output: { dashboard, success: true },
        message: `Dashboard **${dashboardId}** updated successfully.`
      };
    }

    if (action === 'delete') {
      if (!dashboardId) throw createApiServiceError('dashboardId is required for deleting');
      await client.deleteDashboard(connectionId, dashboardId);
      return {
        output: { success: true },
        message: `Dashboard **${dashboardId}** deleted successfully.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
