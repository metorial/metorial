import { SlateTool } from 'slates';
import { z } from 'zod';
import { datadogServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageDashboard = SlateTool.create(spec, {
  name: 'Manage Dashboard',
  key: 'manage_dashboard',
  description: `Create or update a Datadog dashboard. Dashboards contain widgets that visualize metrics, logs, traces, events, and other data sources.`,
  instructions: [
    'To create a new dashboard, omit dashboardId and provide title, layoutType, and widgets.',
    'To update an existing dashboard, provide dashboardId along with fields to change.',
    'Layout types: "ordered" (grid layout) or "free" (free-form positioning).',
    'Widgets are JSON objects following the Datadog widget schema.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      dashboardId: z
        .string()
        .optional()
        .describe('Dashboard ID to update. Omit to create a new dashboard.'),
      title: z.string().optional().describe('Dashboard title (required for creation)'),
      layoutType: z
        .enum(['ordered', 'free'])
        .optional()
        .describe('Layout type: "ordered" for grid, "free" for free-form'),
      widgets: z.array(z.any()).optional().describe('Array of widget definition objects'),
      description: z.string().optional().describe('Dashboard description'),
      templateVariables: z
        .array(z.any())
        .optional()
        .describe('Template variables for the dashboard'),
      isReadOnly: z.boolean().optional().describe('Whether the dashboard is read-only'),
      notifyList: z
        .array(z.string())
        .optional()
        .describe('Handles to notify when changes are made'),
      reflowType: z
        .enum(['auto', 'fixed'])
        .optional()
        .describe('Reflow type for ordered dashboards')
    })
  )
  .output(
    z.object({
      dashboardId: z.string().describe('Dashboard ID'),
      title: z.string().describe('Dashboard title'),
      layoutType: z.string().describe('Layout type'),
      description: z.string().optional().describe('Dashboard description'),
      url: z.string().optional().describe('Dashboard URL'),
      authorHandle: z.string().optional().describe('Author handle'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      modifiedAt: z.string().optional().describe('Last modification timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let { dashboardId, ...data } = ctx.input;
    let dashboard: any;
    let isCreating = !dashboardId;

    if (dashboardId) {
      dashboard = await client.updateDashboard(dashboardId, data);
    } else {
      if (!data.title || !data.layoutType || !data.widgets) {
        throw datadogServiceError(
          'title, layoutType, and widgets are required when creating a new dashboard.'
        );
      }
      dashboard = await client.createDashboard({
        title: data.title,
        layoutType: data.layoutType,
        widgets: data.widgets,
        description: data.description,
        templateVariables: data.templateVariables,
        isReadOnly: data.isReadOnly,
        notifyList: data.notifyList,
        reflowType: data.reflowType
      });
    }

    return {
      output: {
        dashboardId: dashboard.id,
        title: dashboard.title,
        layoutType: dashboard.layout_type,
        description: dashboard.description,
        url: dashboard.url,
        authorHandle: dashboard.author_handle,
        createdAt: dashboard.created_at,
        modifiedAt: dashboard.modified_at
      },
      message: isCreating
        ? `Created dashboard **${dashboard.title}** (ID: ${dashboard.id})`
        : `Updated dashboard **${dashboard.title}** (ID: ${dashboard.id})`
    };
  })
  .build();
