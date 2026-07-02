import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let getDashboard = SlateTool.create(spec, {
  name: 'Get Dashboard',
  key: 'get_dashboard',
  description: `Get full details of a specific Datadog dashboard by ID, including all widget definitions and template variables.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      dashboardId: z.string().describe('The dashboard ID to retrieve')
    })
  )
  .output(
    z.object({
      dashboardId: z.string().describe('Dashboard ID'),
      title: z.string().describe('Dashboard title'),
      layoutType: z.string().describe('Layout type'),
      description: z.string().optional(),
      widgets: z.array(z.any()).describe('Widget definitions'),
      templateVariables: z.array(z.any()).optional().describe('Template variables'),
      url: z.string().optional(),
      authorHandle: z.string().optional(),
      createdAt: z.string().optional(),
      modifiedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let dashboard = await client.getDashboard(ctx.input.dashboardId);

    return {
      output: {
        dashboardId: dashboard.id || ctx.input.dashboardId,
        title: dashboard.title,
        layoutType: dashboard.layout_type,
        description: dashboard.description,
        widgets: dashboard.widgets,
        templateVariables: dashboard.template_variables,
        url: dashboard.url,
        authorHandle: dashboard.author_handle,
        createdAt: dashboard.created_at,
        modifiedAt: dashboard.modified_at
      },
      message: `Retrieved dashboard **${dashboard.title}** (ID: ${dashboard.id})`
    };
  })
  .build();
