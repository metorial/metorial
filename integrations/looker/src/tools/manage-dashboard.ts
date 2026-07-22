import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { LookerClient, type LookerDashboard, type LookerUpdateDashboard } from '../lib/client';
import { spec } from '../spec';

let dashboardOutputSchema = z.object({
  dashboardId: z.string().describe('Dashboard ID'),
  title: z.string().optional().describe('Dashboard title'),
  description: z.string().optional().describe('Dashboard description'),
  folderId: z.string().optional().describe('Folder ID'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  hidden: z.boolean().optional().describe('Whether the dashboard is hidden'),
  deleted: z.boolean().optional().describe('Whether the dashboard is deleted'),
  elements: z
    .array(
      z.object({
        elementId: z.string().optional().describe('Dashboard element ID'),
        title: z.string().optional().describe('Element title'),
        type: z.string().optional().describe('Element type'),
        lookId: z.string().optional().describe('Associated Look ID'),
        queryId: z.string().optional().describe('Associated query ID')
      })
    )
    .optional()
    .describe('Dashboard elements/tiles'),
  filters: z
    .array(
      z.object({
        filterId: z.string().optional().describe('Filter ID'),
        name: z.string().optional().describe('Filter name'),
        title: z.string().optional().describe('Filter title'),
        type: z.string().optional().describe('Filter type'),
        defaultValue: z.string().optional().describe('Default value')
      })
    )
    .optional()
    .describe('Dashboard filters')
});

export let manageDashboard = SlateTool.create(spec, {
  name: 'Manage Dashboard',
  key: 'manage_dashboard',
  description: `Get, create, update, or permanently delete a Looker dashboard. When getting a dashboard, also retrieves its elements and filters. For updates, only provide the fields you want to change. Delete is permanent and cannot be recovered.`,
  instructions: [
    'To get a dashboard with its elements: set action to "get" and provide the dashboardId.',
    'To create: set action to "create" with title and folderId.',
    'To update: set action to "update" with dashboardId and any fields to change.',
    'To delete permanently: set action to "delete" with the dashboardId. This cannot be undone.'
  ]
})
  .input(
    z.object({
      action: z.enum(['get', 'create', 'update', 'delete']).describe('Action to perform'),
      dashboardId: z
        .string()
        .optional()
        .describe('Dashboard ID (required for get, update, delete)'),
      title: z.string().optional().describe('Dashboard title'),
      description: z.string().optional().describe('Dashboard description'),
      folderId: z.string().optional().describe('Target folder ID'),
      hidden: z.boolean().optional().describe('Whether the dashboard is hidden')
    })
  )
  .output(dashboardOutputSchema)
  .handleInvocation(async ctx => {
    let client = new LookerClient({
      instanceUrl: ctx.config.instanceUrl,
      token: ctx.auth.token
    });

    let dashboard: LookerDashboard;
    let actionMessage: string;

    switch (ctx.input.action) {
      case 'get': {
        if (!ctx.input.dashboardId) {
          throw createApiServiceError('dashboardId is required for get action', {
            reason: 'looker_dashboard_id_required'
          });
        }
        dashboard = await client.getDashboard(ctx.input.dashboardId);
        actionMessage = `Retrieved dashboard **${dashboard.title}**`;
        break;
      }
      case 'create': {
        if (!ctx.input.title) {
          throw createApiServiceError('title is required for create action', {
            reason: 'looker_dashboard_title_required'
          });
        }
        if (!ctx.input.folderId) {
          throw createApiServiceError('folderId is required for create action', {
            reason: 'looker_dashboard_folder_id_required'
          });
        }
        dashboard = await client.createDashboard({
          title: ctx.input.title,
          description: ctx.input.description,
          folder_id: ctx.input.folderId,
          hidden: ctx.input.hidden
        });
        actionMessage = `Created dashboard **${dashboard.title}** (ID: ${dashboard.id})`;
        break;
      }
      case 'update': {
        if (!ctx.input.dashboardId) {
          throw createApiServiceError('dashboardId is required for update action', {
            reason: 'looker_dashboard_id_required'
          });
        }
        let updateBody: LookerUpdateDashboard = {};
        if (ctx.input.title !== undefined) updateBody.title = ctx.input.title;
        if (ctx.input.description !== undefined)
          updateBody.description = ctx.input.description;
        if (ctx.input.folderId !== undefined) updateBody.folder_id = ctx.input.folderId;
        if (ctx.input.hidden !== undefined) updateBody.hidden = ctx.input.hidden;
        if (Object.keys(updateBody).length === 0) {
          throw createApiServiceError(
            'At least one of title, description, folderId, or hidden is required for update action',
            { reason: 'looker_dashboard_update_fields_required' }
          );
        }
        dashboard = await client.updateDashboard(ctx.input.dashboardId, updateBody);
        actionMessage = `Updated dashboard **${dashboard.title}**`;
        break;
      }
      case 'delete': {
        if (!ctx.input.dashboardId) {
          throw createApiServiceError('dashboardId is required for delete action', {
            reason: 'looker_dashboard_id_required'
          });
        }
        dashboard = await client.getDashboard(ctx.input.dashboardId);
        await client.deleteDashboard(ctx.input.dashboardId);
        actionMessage = `Deleted dashboard **${dashboard.title}** (ID: ${ctx.input.dashboardId})`;
        break;
      }
    }

    if (typeof dashboard.id !== 'string' || dashboard.id.length === 0) {
      throw createApiServiceError('Looker returned a dashboard without an ID.', {
        reason: 'looker_dashboard_invalid_response'
      });
    }

    let elements =
      dashboard.dashboard_elements?.map(el => ({
        elementId: el.id !== undefined ? String(el.id) : undefined,
        title: el.title,
        type: el.type,
        lookId: el.look_id !== undefined ? String(el.look_id) : undefined,
        queryId: el.query_id !== undefined ? String(el.query_id) : undefined
      })) || undefined;

    let filters =
      dashboard.dashboard_filters?.map(f => ({
        filterId: f.id !== undefined ? String(f.id) : undefined,
        name: f.name,
        title: f.title,
        type: f.type,
        defaultValue: f.default_value
      })) || undefined;

    return {
      output: {
        dashboardId: String(dashboard.id),
        title: dashboard.title,
        description: dashboard.description,
        folderId: dashboard.folder_id !== undefined ? String(dashboard.folder_id) : undefined,
        createdAt: dashboard.created_at,
        updatedAt: dashboard.updated_at,
        hidden: dashboard.hidden,
        deleted: ctx.input.action === 'delete' ? true : dashboard.deleted,
        elements,
        filters
      },
      message: actionMessage
    };
  })
  .build();
